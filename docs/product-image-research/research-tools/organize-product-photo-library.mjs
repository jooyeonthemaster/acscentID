#!/usr/bin/env node

import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(scriptDir, '../../..')
const researchRoot = path.join(workspaceRoot, 'docs/product-image-research')
const referencesRoot = path.join(researchRoot, 'references')
const webRoot = path.join(referencesRoot, 'web')
const publicImagesRoot = path.join(workspaceRoot, 'public/images')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const updateMode = args.includes('--update')
const outputArg = args.find((arg) => !arg.startsWith('--'))

if (!outputArg) {
  console.error('Usage: node organize-product-photo-library.mjs <output-directory> [--dry-run]')
  process.exit(1)
}

const outputRoot = path.resolve(outputArg)
const records = []

const imageExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.avif',
  '.svg',
])

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function relativeToWorkspace(value) {
  return toPosix(path.relative(workspaceRoot, value))
}

function sanitizeName(value, maxLength = 72) {
  return String(value || '')
    .normalize('NFC')
    .replace(/&bull;/gi, ' ')
    .replace(/[\u0000-\u001f/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .replace(/[.\s]+$/g, '')
}

function formatKoreanDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '날짜미상'
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return values.year + '-' + values.month + '-' + values.day
}

function csvCell(value) {
  const text = String(value ?? '')
  return '"' + text.replaceAll('"', '""') + '"'
}

async function pathExists(value) {
  try {
    await fs.access(value)
    return true
  } catch {
    return false
  }
}

async function ensureOutputIsEmpty() {
  if (!(await pathExists(outputRoot))) {
    if (!dryRun) await fs.mkdir(outputRoot, { recursive: true })
    return
  }

  const entries = await fs.readdir(outputRoot)
  if (entries.length > 0 && !updateMode) {
    throw new Error('Output directory must be empty: ' + outputRoot)
  }
}

async function copyTracked(source, destinationRelative, category) {
  const sourceStat = await fs.stat(source)
  if (!sourceStat.isFile()) {
    throw new Error('Expected file: ' + source)
  }

  const destination = path.join(outputRoot, destinationRelative)
  records.push({
    category,
    source: relativeToWorkspace(source),
    destination: toPosix(destinationRelative),
    bytes: sourceStat.size,
  })

  if (dryRun) return

  await fs.mkdir(path.dirname(destination), { recursive: true })
  if (updateMode && await pathExists(destination)) {
    const destinationStat = await fs.stat(destination)
    if (destinationStat.size === sourceStat.size) return
  }
  await fs.copyFile(source, destination, constants.COPYFILE_FICLONE)
  await fs.utimes(destination, sourceStat.atime, sourceStat.mtime)
}

async function writeTracked(destinationRelative, content, category, source = '(generated index)') {
  const destination = path.join(outputRoot, destinationRelative)
  const bytes = Buffer.byteLength(content)
  records.push({
    category,
    source,
    destination: toPosix(destinationRelative),
    bytes,
  })

  if (dryRun) return

  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(destination, content, 'utf8')
}

async function walkFiles(root) {
  if (!(await pathExists(root))) return []

  const output = []
  const stack = [root]

  while (stack.length > 0) {
    const current = stack.pop()
    const entries = await fs.readdir(current, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

    for (const entry of entries) {
      if (entry.name === '.DS_Store') continue
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(fullPath)
      if (entry.isFile()) output.push(fullPath)
    }
  }

  return output.sort((a, b) => a.localeCompare(b, 'ko'))
}

async function listDirectories(root) {
  if (!(await pathExists(root))) return []
  const entries = await fs.readdir(root, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .sort((a, b) => a.localeCompare(b, 'ko'))
}

async function detectedImageExtension(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  if (imageExtensions.has(extension)) return extension

  const handle = await fs.open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(32)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    const head = buffer.subarray(0, bytesRead)

    if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return '.jpg'
    if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png'
    if (head.length >= 4 && head.subarray(0, 4).toString('ascii') === 'GIF8') return '.gif'
    if (
      head.length >= 12 &&
      head.subarray(0, 4).toString('ascii') === 'RIFF' &&
      head.subarray(8, 12).toString('ascii') === 'WEBP'
    ) return '.webp'
    if (head.length >= 12 && head.subarray(4, 12).toString('ascii').includes('ftyp')) return '.avif'
  } finally {
    await handle.close()
  }

  return null
}

async function copyVisualTree(sourceRoot, destinationRoot, category) {
  const files = await walkFiles(sourceRoot)
  for (const file of files) {
    const detectedExtension = await detectedImageExtension(file)
    if (!detectedExtension) continue

    let relative = path.relative(sourceRoot, file)
    if (!path.extname(relative)) relative += detectedExtension
    await copyTracked(file, path.join(destinationRoot, relative), category)
  }
}

async function copyRawTree(sourceRoot, destinationRoot, category) {
  const files = await walkFiles(sourceRoot)
  for (const file of files) {
    if (await detectedImageExtension(file)) continue
    const relative = path.relative(sourceRoot, file)
    await copyTracked(file, path.join(destinationRoot, relative), category)
  }
}

async function copyFinalSelection() {
  const sourceRoot = path.join(researchRoot, 'detail-page-selected-images')
  const mappings = [
    ['programs/idol-image', '01_최종선정_상세페이지/01_프로그램/01_AI이미지분석퍼퓸'],
    ['programs/chemistry', '01_최종선정_상세페이지/01_프로그램/02_레이어링퍼퓸'],
    ['products/perfume-50ml', '01_최종선정_상세페이지/02_단품상품/01_50ml향수'],
    ['products/perfume-10ml', '01_최종선정_상세페이지/02_단품상품/02_10ml향수'],
    ['products/scent-paper', '01_최종선정_상세페이지/02_단품상품/03_단품시향지'],
  ]

  for (const [sourceRelative, destination] of mappings) {
    await copyVisualTree(path.join(sourceRoot, sourceRelative), destination, '최종선정')
  }
}

async function copyAllGeneratedImages() {
  const sourceRoot = path.join(publicImagesRoot, 'products/generated')
  const mappings = [
    ['idol-image', '02_생성이미지_전체/01_프로그램/01_AI이미지분석퍼퓸'],
    ['chemistry', '02_생성이미지_전체/01_프로그램/02_레이어링퍼퓸'],
    ['personal', '02_생성이미지_전체/01_프로그램/03_퍼스널센트'],
    ['sample', '02_생성이미지_전체/01_프로그램/04_AI이미지분석시향지'],
    ['today-scent', '02_생성이미지_전체/01_프로그램/05_오늘의향'],
    ['perfume-50ml', '02_생성이미지_전체/02_단품상품/01_50ml향수'],
    ['perfume-10ml', '02_생성이미지_전체/02_단품상품/02_10ml향수'],
    ['scent-paper', '02_생성이미지_전체/02_단품상품/03_단품시향지'],
    ['figure', '02_생성이미지_전체/03_기타상품/01_피규어디퓨저'],
    ['graduation', '02_생성이미지_전체/03_기타상품/02_졸업기념퍼퓸'],
    ['le-quack', '02_생성이미지_전체/03_기타상품/03_시그니처뿌덕퍼퓸'],
    ['saju', '02_생성이미지_전체/04_출시전_보류/01_사주분석퍼퓸'],
  ]

  for (const [sourceName, destination] of mappings) {
    await copyVisualTree(path.join(sourceRoot, sourceName), destination, '생성이미지')
  }
}

function officialProductCategory(fileName) {
  if (fileName.startsWith('perfume-10ml')) return '01_10ml향수'
  if (fileName.startsWith('perfume-50ml')) return '02_50ml향수'
  if (fileName.startsWith('chemistry')) return '03_레이어링퍼퓸'
  if (fileName.startsWith('idol-image')) return '04_AI이미지분석퍼퓸'
  if (fileName.startsWith('sample') || fileName.startsWith('scent-paper')) return '05_시향지'
  if (fileName.startsWith('figure')) return '06_피규어디퓨저'
  return '99_기타'
}

async function copyOfficialReferences() {
  const sourceRoot = path.join(webRoot, 'official')
  const files = await walkFiles(sourceRoot)

  for (const file of files) {
    if (!(await detectedImageExtension(file))) continue
    const category = officialProductCategory(path.basename(file))
    await copyTracked(
      file,
      path.join('03_실사레퍼런스/01_공식웹사이트', category, path.basename(file)),
      '실사레퍼런스_공식',
    )
  }
}

function translatedProductGroups(groups) {
  const translations = new Map([
    ['perfume-10ml', '10ml'],
    ['perfume-50ml', '50ml'],
    ['layering-perfume', '레이어링'],
    ['image-analysis-favorite', 'AI이미지분석'],
    ['image-analysis-self', 'AI이미지분석'],
    ['scent-paper', '시향지'],
    ['figure-diffuser', '피규어디퓨저'],
  ])
  const order = ['10ml', '50ml', '레이어링', 'AI이미지분석', '시향지', '피규어디퓨저']
  const translated = [...new Set((groups || []).map((group) => translations.get(group) || group))]
  translated.sort((a, b) => {
    const indexA = order.indexOf(a)
    const indexB = order.indexOf(b)
    if (indexA === -1 && indexB === -1) return a.localeCompare(b, 'ko')
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })
  return translated.length > 0 ? translated : ['기타']
}

async function copyInstagramReferences() {
  const sourceRoot = path.join(webRoot, 'instagram-official-recent')
  const postDirectories = await listDirectories(sourceRoot)

  for (const postDirectory of postDirectories) {
    const metadataPath = path.join(postDirectory, 'source.json')
    if (!(await pathExists(metadataPath))) continue
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
    const date = formatKoreanDate(metadata.publishedAt)
    const firstLine = String(metadata.caption || '').split(/\r?\n/).find(Boolean) || '공식게시물'
    const folderName = sanitizeName(date + '__' + metadata.shortcode + '__' + firstLine, 90)
    const destinationRoot = path.join('03_실사레퍼런스/02_공식인스타그램_최근1년', folderName)

    for (const download of metadata.downloads || []) {
      const source = path.join(postDirectory, download.file)
      await copyTracked(source, path.join(destinationRoot, '01_사진', download.file), '실사레퍼런스_인스타그램')
    }

    const info = [
      '# 공식 인스타그램 게시물',
      '',
      '- 게시일: ' + date,
      '- 계정: @' + metadata.username,
      '- 원문: ' + metadata.url,
      '- 이미지: ' + (metadata.imageCount || 0) + '장',
      '- 원본 위치: ' + relativeToWorkspace(postDirectory),
      '',
      '## 본문',
      '',
      String(metadata.caption || '').trim(),
      '',
    ].join('\n')
    await writeTracked(path.join(destinationRoot, '00_게시물정보.md'), info, '실사레퍼런스_인스타그램')
  }

  const indexPath = path.join(referencesRoot, 'analysis/official-instagram-index.md')
  if (await pathExists(indexPath)) {
    await copyTracked(
      indexPath,
      '03_실사레퍼런스/02_공식인스타그램_최근1년/00_전체목록_출처링크.md',
      '실사레퍼런스_인스타그램',
    )
  }
}

async function copyNaverMapReferences() {
  const sourceRoot = path.join(webRoot, 'naver-map-recent')
  await copyVisualTree(
    path.join(sourceRoot, 'images'),
    '03_실사레퍼런스/03_네이버지도_악센트아이디_최근/01_사진',
    '실사레퍼런스_네이버지도',
  )

  const indexPath = path.join(referencesRoot, 'analysis/naver-map-recent-index.md')
  if (await pathExists(indexPath)) {
    await copyTracked(
      indexPath,
      '03_실사레퍼런스/03_네이버지도_악센트아이디_최근/00_사진목록_출처링크.md',
      '실사레퍼런스_네이버지도',
    )
  }

  const contactSheet = path.join(referencesRoot, 'analysis/contact-sheets/naver-map-recent-page-001.jpg')
  if (await pathExists(contactSheet)) {
    await copyTracked(
      contactSheet,
      '03_실사레퍼런스/03_네이버지도_악센트아이디_최근/00_사진_한눈에보기.jpg',
      '실사레퍼런스_네이버지도',
    )
  }
}

async function copyNaverBlogReferences() {
  const sourceRoot = path.join(webRoot, 'naver-blog-recent')
  const postDirectories = await listDirectories(sourceRoot)
  const contactSheetRoot = path.join(referencesRoot, 'analysis/contact-sheets')

  for (const postDirectory of postDirectories) {
    const metadataPath = path.join(postDirectory, 'source.json')
    if (!(await pathExists(metadataPath))) continue
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
    const date = formatKoreanDate(metadata.publishedAt)
    const productLabels = translatedProductGroups(metadata.productGroups)
    const identity = metadata.blogId + '-' + metadata.postId
    const folderName = sanitizeName(date + '__' + productLabels.join('+') + '__' + identity, 110)
    const destinationRoot = path.join('03_실사레퍼런스/04_네이버블로그_최근1년', folderName)

    const downloadedFiles = [
      ...new Set(
        (metadata.downloadedImages || [])
          .map((image) => typeof image === 'string' ? image : image?.file)
          .filter(Boolean),
      ),
    ]
    for (const fileName of downloadedFiles) {
      const source = path.join(postDirectory, fileName)
      if (!(await pathExists(source))) continue
      await copyTracked(source, path.join(destinationRoot, '01_사진', fileName), '실사레퍼런스_네이버블로그')
    }

    const contactSheet = path.join(contactSheetRoot, identity + '.jpg')
    if (await pathExists(contactSheet)) {
      await copyTracked(
        contactSheet,
        path.join(destinationRoot, '00_사진_한눈에보기.jpg'),
        '실사레퍼런스_네이버블로그',
      )
    }

    const textPath = path.join(postDirectory, 'text.txt')
    if (await pathExists(textPath)) {
      await copyTracked(
        textPath,
        path.join(destinationRoot, '02_본문/본문.txt'),
        '실사레퍼런스_네이버블로그',
      )
    }

    const info = [
      '# ' + String(metadata.title || '제목 없음'),
      '',
      '- 게시일: ' + date,
      '- 관련 제품: ' + productLabels.join(', '),
      '- 작성자/게시물: ' + identity,
      '- 원문: ' + metadata.url,
      '- 저장 이미지: ' + downloadedFiles.length + '장',
      '- 원본 위치: ' + relativeToWorkspace(postDirectory),
      '',
      '## 요약',
      '',
      String(metadata.description || '').trim(),
      '',
    ].join('\n')
    await writeTracked(path.join(destinationRoot, '00_글정보.md'), info, '실사레퍼런스_네이버블로그')
  }

  const indexPath = path.join(referencesRoot, 'analysis/recent-blog-index.md')
  if (await pathExists(indexPath)) {
    await copyTracked(
      indexPath,
      '03_실사레퍼런스/04_네이버블로그_최근1년/00_전체목록_출처링크.md',
      '실사레퍼런스_네이버블로그',
    )
  }
}

async function copyOtherVisualReferences() {
  await copyVisualTree(
    path.join(webRoot, 'naver-map'),
    '03_실사레퍼런스/05_기타웹레퍼런스/01_네이버지도_이전수집',
    '실사레퍼런스_기타',
  )
  await copyVisualTree(
    path.join(webRoot, 'tistory'),
    '03_실사레퍼런스/05_기타웹레퍼런스/02_티스토리',
    '실사레퍼런스_기타',
  )
  await copyVisualTree(
    path.join(webRoot, 'fever'),
    '03_실사레퍼런스/05_기타웹레퍼런스/03_Fever',
    '실사레퍼런스_기타',
  )
  await copyVisualTree(
    path.join(webRoot, 'klook'),
    '03_실사레퍼런스/05_기타웹레퍼런스/04_Klook',
    '실사레퍼런스_기타',
  )

  const recentNames = new Set(
    (await listDirectories(path.join(webRoot, 'naver-blog-recent'))).map((directory) => path.basename(directory)),
  )
  const olderBlogDirectories = await listDirectories(path.join(webRoot, 'naver-blog'))
  for (const directory of olderBlogDirectories) {
    if (recentNames.has(path.basename(directory))) continue
    await copyVisualTree(
      directory,
      path.join('03_실사레퍼런스/05_기타웹레퍼런스/05_네이버블로그_이전수집', path.basename(directory)),
      '실사레퍼런스_기타',
    )
  }

  await copyVisualTree(
    path.join(referencesRoot, 'local'),
    '03_실사레퍼런스/06_로컬제공원본',
    '실사레퍼런스_로컬',
  )
}

async function copyProductCoreReferences() {
  const coreRoot = '03_실사레퍼런스/00_상품별_핵심레퍼런스'
  const files = [
    ['web/official/perfume-10ml-01.png', '01_10ml향수/공식__10ml_01.png'],
    ['web/official/perfume-10ml-02.png', '01_10ml향수/공식__10ml_02.png'],
    ['web/naver-map-recent/images/map-0009.jpg', '01_10ml향수/네이버지도__10ml실물.jpg'],
    ['analysis/contact-sheets/23jeans_-224277156574.jpg', '01_10ml향수/후기모음__10ml와50ml비교.jpg'],
    ['analysis/contact-sheets/jjyoon6228-224286922464.jpg', '01_10ml향수/후기모음__택배와레이어링.jpg'],
    ['analysis/contact-sheets/syd02231-224308838635.jpg', '01_10ml향수/후기모음__매장체험.jpg'],

    ['web/official/perfume-50ml-01.png', '02_50ml향수/공식__50ml_01.png'],
    ['web/official/perfume-50ml-02.png', '02_50ml향수/공식__50ml_02.png'],
    ['web/naver-map-recent/images/map-0006.jpg', '02_50ml향수/네이버지도__50ml실물.jpg'],
    ['analysis/contact-sheets/onix81212-224326064727.jpg', '02_50ml향수/후기모음__최신배송.jpg'],
    ['analysis/contact-sheets/uandisslove-224264120601.jpg', '02_50ml향수/후기모음__패키지와리포트.jpg'],
    ['analysis/contact-sheets/snapture-224296907305.jpg', '02_50ml향수/후기모음__레이어링50ml.jpg'],

    ['web/official/chemistry-01.png', '03_레이어링퍼퓸/공식__레이어링_01.png'],
    ['web/official/chemistry-02.jpg', '03_레이어링퍼퓸/공식__레이어링_02.jpg'],
    ['analysis/contact-sheets/jjyoon6228-224286922464.jpg', '03_레이어링퍼퓸/후기모음__10ml세트.jpg'],
    ['analysis/contact-sheets/qufqlcguswl-224304950085.jpg', '03_레이어링퍼퓸/후기모음__커플50ml.jpg'],
    ['analysis/contact-sheets/snapture-224296907305.jpg', '03_레이어링퍼퓸/후기모음__50ml세트.jpg'],

    ['web/official/idol-image-01-converted.jpg', '04_AI이미지분석퍼퓸/공식__이미지분석_01.jpg'],
    ['web/official/idol-image-02-converted.jpg', '04_AI이미지분석퍼퓸/공식__이미지분석_02.jpg'],
    ['analysis/contact-sheets/kco4053-224340723449.jpg', '04_AI이미지분석퍼퓸/후기모음__최신리포트.jpg'],
    ['analysis/contact-sheets/uandisslove-224264120601.jpg', '04_AI이미지분석퍼퓸/후기모음__배송리포트.jpg'],

    ['web/official/sample-01.jpeg', '05_시향지/공식__AI이미지분석시향지.jpeg'],
    ['web/official/scent-paper-01.png', '05_시향지/공식__시향지.png'],
    ['analysis/contact-sheets/naver-map-recent-page-001.jpg', '06_매장_악센트아이디/네이버지도__최근사진한눈에보기.jpg'],
  ]

  for (const [sourceRelative, destinationRelative] of files) {
    const source = path.join(referencesRoot, sourceRelative)
    if (!(await pathExists(source))) continue
    await copyTracked(source, path.join(coreRoot, destinationRelative), '실사레퍼런스_핵심')
  }

  await copyVisualTree(
    path.join(webRoot, 'instagram-official-recent/2026-05-01-DXypxvekbKF'),
    path.join(coreRoot, '03_레이어링퍼퓸/공식인스타그램__2026-05-01'),
    '실사레퍼런스_핵심',
  )
  await copyVisualTree(
    path.join(webRoot, 'instagram-official-recent/2026-04-21-DXYyW5KEfz_'),
    path.join(coreRoot, '04_AI이미지분석퍼퓸/공식인스타그램__2026-04-21'),
    '실사레퍼런스_핵심',
  )
}

async function copyCurrentSiteImages() {
  const mappings = [
    ['hero', '04_현재사이트이미지/01_홈_히어로'],
    ['chemistry', '04_현재사이트이미지/02_프로그램_레이어링'],
    ['perfume', '04_현재사이트이미지/03_향수_기존실사'],
    ['diffuser', '04_현재사이트이미지/04_디퓨저_기존실사'],
    ['jollduck', '04_현재사이트이미지/05_시그니처_뿌덕'],
    ['saju', '04_현재사이트이미지/06_사주'],
    ['collaboration', '04_현재사이트이미지/07_콜라보'],
    ['logo', '04_현재사이트이미지/08_브랜드로고'],
    ['shareback', '04_현재사이트이미지/09_공유배경'],
  ]

  for (const [sourceName, destination] of mappings) {
    await copyVisualTree(path.join(publicImagesRoot, sourceName), destination, '현재사이트이미지')
  }

  const placeholder = path.join(publicImagesRoot, 'product-placeholder.svg')
  if (await pathExists(placeholder)) {
    await copyTracked(
      placeholder,
      '04_현재사이트이미지/10_기타/product-placeholder.svg',
      '현재사이트이미지',
    )
  }
}

async function copyResearchDocuments() {
  const documents = [
    ['README.md', '05_조사문서_및_한눈에보기/01_핵심가이드/00_리서치전체안내.md'],
    ['detail-page-image-selection.md', '05_조사문서_및_한눈에보기/01_핵심가이드/01_상세페이지_23장_선정가이드.md'],
    ['references/analysis/product-facts.md', '05_조사문서_및_한눈에보기/01_핵심가이드/02_상품실물_사실표.md'],
    ['references/analysis/source-inventory.md', '05_조사문서_및_한눈에보기/01_핵심가이드/03_전체출처_목록.md'],
    ['references/analysis/coverage-report.md', '05_조사문서_및_한눈에보기/01_핵심가이드/04_조사범위_보고서.md'],
    ['references/analysis/image-corrections.md', '05_조사문서_및_한눈에보기/01_핵심가이드/05_생성이미지_수정기록.md'],
    ['references/analysis/recent-blog-index.md', '05_조사문서_및_한눈에보기/02_출처색인/01_네이버블로그_최근1년.md'],
    ['references/analysis/naver-map-recent-index.md', '05_조사문서_및_한눈에보기/02_출처색인/02_네이버지도_최근.md'],
    ['references/analysis/official-instagram-index.md', '05_조사문서_및_한눈에보기/02_출처색인/03_공식인스타그램_최근1년.md'],
    ['generated-contact-sheet.jpg', '05_조사문서_및_한눈에보기/03_접촉시트/00_생성이미지_전체.jpg'],
  ]

  for (const [sourceRelative, destination] of documents) {
    const source = path.join(researchRoot, sourceRelative)
    if (!(await pathExists(source))) continue
    await copyTracked(source, destination, '조사문서')
  }

  await copyVisualTree(
    path.join(referencesRoot, 'analysis/contact-sheets'),
    '05_조사문서_및_한눈에보기/03_접촉시트/01_웹레퍼런스',
    '조사문서',
  )
  await copyVisualTree(
    path.join(referencesRoot, 'analysis/pre-correction'),
    '05_조사문서_및_한눈에보기/04_수정전_이미지',
    '조사문서',
  )
}

async function copyRawResearchFiles() {
  await copyRawTree(
    webRoot,
    '90_원본수집자료_보존용/01_웹수집_HTML_JSON_TXT',
    '원본수집자료',
  )
  await copyRawTree(
    path.join(researchRoot, 'research-tools'),
    '90_원본수집자료_보존용/02_리서치도구',
    '원본수집자료',
  )

  const productFactsJson = path.join(referencesRoot, 'analysis/product-facts.json')
  if (await pathExists(productFactsJson)) {
    await copyTracked(
      productFactsJson,
      '90_원본수집자료_보존용/03_분석JSON/product-facts.json',
      '원본수집자료',
    )
  }
}

async function copyUnrepresentedOriginals() {
  const representedSources = new Set(
    records
      .map((record) => record.source)
      .filter((source) => source !== '(generated index)'),
  )
  const sourceGroups = [
    [researchRoot, 'docs-product-image-research'],
    [publicImagesRoot, 'public-images'],
  ]

  for (const [sourceRoot, destinationLabel] of sourceGroups) {
    const files = await walkFiles(sourceRoot)
    for (const file of files) {
      const sourceRelative = relativeToWorkspace(file)
      if (representedSources.has(sourceRelative)) continue
      const relative = path.relative(sourceRoot, file)
      await copyTracked(
        file,
        path.join(
          '90_원본수집자료_보존용/04_중복포맷_및_추가이미지',
          destinationLabel,
          relative,
        ),
        '원본수집자료_추가',
      )
      representedSources.add(sourceRelative)
    }
  }
}

function categoryCounts() {
  const counts = {}
  for (const record of records) {
    const topLevel = record.destination.split('/')[0]
    counts[topLevel] = (counts[topLevel] || 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, 'ko')))
}

async function writeInventoryFiles() {
  const inventoryRelative = '90_원본수집자료_보존용/00_파일대조표.csv'
  const rows = [
    ['구분', '정리된_경로', '원본_경로', '바이트'],
    ...records.map((record) => [
      record.category,
      record.destination,
      record.source,
      record.bytes,
    ]),
  ]
  const csv = '\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n'

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceRoots: [
      relativeToWorkspace(researchRoot),
      relativeToWorkspace(publicImagesRoot),
    ],
    outputRoot,
    totalOrganizedFilesBeforeInventory: records.length,
    categoryCounts: categoryCounts(),
  }

  if (!dryRun) {
    await fs.mkdir(path.join(outputRoot, '90_원본수집자료_보존용'), { recursive: true })
    await fs.writeFile(path.join(outputRoot, inventoryRelative), csv, 'utf8')
    await fs.writeFile(
      path.join(outputRoot, '90_원본수집자료_보존용/00_정리결과.json'),
      JSON.stringify(summary, null, 2) + '\n',
      'utf8',
    )
  }

  return summary
}

async function main() {
  await ensureOutputIsEmpty()

  await copyFinalSelection()
  await copyAllGeneratedImages()
  await copyOfficialReferences()
  await copyInstagramReferences()
  await copyNaverMapReferences()
  await copyNaverBlogReferences()
  await copyOtherVisualReferences()
  await copyProductCoreReferences()
  await copyCurrentSiteImages()
  await copyResearchDocuments()
  await copyRawResearchFiles()
  await copyUnrepresentedOriginals()

  const summary = await writeInventoryFiles()
  console.log(JSON.stringify({ dryRun, ...summary }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
