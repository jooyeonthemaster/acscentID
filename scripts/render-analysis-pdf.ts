/**
 * 저장된 이미지 분석 결과 → 관리자 출력물과 같은 A4 가로 결과지 PDF + 직원용 요약 엑셀
 *
 * 관리자 /admin/analysis/bulk-print 와 같은 PrintableReport 를 그대로 그린다. 로그인·배포 없이 로컬에서 PDF 를 만들 때 쓴다.
 * 결과지(842×595 = A4 pt)를 96/72 로 키워 A4 가로 한 장을 꽉 채운다.
 *
 * 실행: npx tsx scripts/render-analysis-pdf.ts <progress.json | id,id,…> <out-dir> [--name 결과지] [--roster roster.json]
 *  - progress.json: scripts/batch-analyze-roster.ts 가 남긴 진행 파일(번호 순서대로 찍는다)
 *  - 결과: <out-dir>/<name>.pdf, <out-dir>/<name>_요약.xlsx, <out-dir>/<name>.html(확인용)
 */

import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq < 0) return
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  })
}

const ROOT = path.join(__dirname, '..')
loadEnv(path.join(ROOT, '.env.local'))

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import ExcelJS from 'exceljs'
import { PrintableReport } from '../src/app/admin/analysis/components/PrintableReport'
import { createServiceRoleClient } from '../src/lib/supabase/service'
import { perfumes } from '../src/data/perfumes'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ZOOM = 96 / 72

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const [source, outDir] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const NAME = flag('name') || '결과지'
const ROSTER = flag('roster')

if (!source || !outDir) {
  console.error('사용법: npx tsx scripts/render-analysis-pdf.ts <progress.json | id,id> <out-dir> [--name 결과지] [--roster roster.json]')
  process.exit(1)
}

interface RosterInfo { no: number; name: string; alias?: string; company?: string; title?: string }

function readIds(): string[] {
  if (fs.existsSync(source)) {
    const progress = JSON.parse(fs.readFileSync(source, 'utf8')) as Record<string, { no: number; resultId: string }>
    return Object.values(progress).sort((a, b) => a.no - b.no).map((e) => e.resultId)
  }
  return source.split(',').map((s) => s.trim()).filter(Boolean)
}

async function toDataUri(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`사진 받기 실패 ${res.status}: ${url}`)
  const type = res.headers.get('content-type') || 'image/jpeg'
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
}

async function main() {
  const ids = readIds()
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('analysis_results').select('*').in('id', ids)
  if (error) throw error
  const byId = new Map((data || []).map((row) => [row.id as string, row]))
  const missing = ids.filter((id) => !byId.has(id))
  if (missing.length) throw new Error(`결과 없음: ${missing.join(', ')}`)
  const rows = ids.map((id) => byId.get(id)!)

  // 결과지 그리기 — 사진은 PDF 에 박아 넣는다(인쇄 중 네트워크에 기대지 않게)
  const pages: string[] = []
  for (const [index, row] of rows.entries()) {
    const analysis = { ...row, user_image_url: row.user_image_url ? await toDataUri(row.user_image_url) : null }
    const html = renderToStaticMarkup(
      createElement(PrintableReport, { analysis, rootId: `printable-report-${index + 1}`, standalonePrintStyles: false })
    )
    pages.push(`<section class="page"><div class="sheet">${html}</div></section>`)
  }

  const background = (file: string) => `data:image/svg+xml;base64,${fs.readFileSync(path.join(ROOT, 'public/background', file)).toString('base64')}`
  const body = pages.join('\n')
    .replace(/src="\/background\/(1-[12]\.svg)"/g, (_, file: string) => `src="${background(file)}"`)

  fs.mkdirSync(outDir, { recursive: true })
  const htmlPath = path.join(outDir, `${NAME}.html`)
  fs.writeFileSync(htmlPath, body) // Tailwind 가 쓰인 클래스를 찾도록 먼저 본문만 쓴다

  const css = await postcss([tailwind({ base: ROOT })]).process(
    `@import "tailwindcss" source(none);\n@source "${htmlPath}";`,
    { from: path.join(ROOT, 'src/app/__render-analysis-pdf.css') }
  )

  const doc = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${NAME}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>${css.css}</style>
<style>
  @page { size: A4 landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: "Outfit", "PingFang SC", "Hiragino Sans GB", "Apple SD Gothic Neo", sans-serif;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 297mm; height: 210mm; overflow: hidden; break-after: page; }
  .page:last-child { break-after: auto; }
  .sheet { width: 842px; height: 595px; zoom: ${ZOOM}; overflow: hidden; }
  @media screen { body { background: #e2e8f0; } .page { margin: 0 auto 16px; background: #fff; } }
</style></head><body>
${body}
</body></html>`
  fs.writeFileSync(htmlPath, doc)

  const pdfPath = path.join(outDir, `${NAME}.pdf`)
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=20000', `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`,
  ], { stdio: 'ignore' })
  console.log(`PDF ${rows.length}장: ${pdfPath}`)

  // 직원용 요약 — 향 준비·결과지 나눠 드리기 확인용
  const roster: RosterInfo[] = ROSTER ? JSON.parse(fs.readFileSync(ROSTER, 'utf8')) : []
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('요약')
  ws.columns = [
    { header: '쪽', key: 'page', width: 5 },
    { header: 'No.', key: 'no', width: 5 },
    { header: '이름', key: 'name', width: 14 },
    { header: '영문명', key: 'alias', width: 16 },
    { header: '성별', key: 'gender', width: 6 },
    { header: '결과지 언어', key: 'locale', width: 8 },
    { header: '향 번호', key: 'perfumeId', width: 14 },
    { header: '향 이름(한)', key: 'nameKo', width: 14 },
    { header: '향 이름(결과지)', key: 'nameZh', width: 14 },
    { header: 'TOP · MIDDLE · BASE (한)', key: 'notesKo', width: 34 },
    { header: 'TOP · MIDDLE · BASE (결과지)', key: 'notesZh', width: 30 },
    { header: '키워드', key: 'keywords', width: 36 },
    { header: '컬러 타입', key: 'color', width: 12 },
    { header: '추천 계절·시간', key: 'when', width: 16 },
    { header: '결과 ID', key: 'id', width: 38 },
  ]
  rows.forEach((row, i) => {
    const a = row.analysis_data
    const m = a.matchingPerfumes?.[0]
    const ko = perfumes.find((p) => p.id === m?.perfumeId)
    const info = roster.find((r) => r.name === row.idol_name)
    ws.addRow({
      page: i + 1,
      no: info?.no ?? '',
      name: row.idol_name,
      alias: info?.alias ?? '',
      gender: row.idol_gender === 'Male' ? '남' : row.idol_gender === 'Female' ? '여' : '',
      locale: ({ zh: '중국어', en: '영어', ko: '한국어' } as Record<string, string>)[row.locale] ?? row.locale,
      perfumeId: m?.perfumeId,
      nameKo: ko?.name ?? '',
      nameZh: m?.persona?.name ?? '',
      notesKo: ko ? `${ko.mainScent.name} · ${ko.subScent1.name} · ${ko.subScent2.name}` : '',
      notesZh: `${m?.persona?.mainScent?.name} · ${m?.persona?.subScent1?.name} · ${m?.persona?.subScent2?.name}`,
      keywords: (row.matching_keywords || []).join(', '),
      color: a.personalColor ? `${a.personalColor.season} ${a.personalColor.tone}` : '',
      when: `${a.scentRecommendation?.best_season ?? ''} · ${a.scentRecommendation?.best_time ?? ''}`,
      id: row.id,
    })
  })
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  const xlsxPath = path.join(outDir, `${NAME}_요약.xlsx`)
  await wb.xlsx.writeFile(xlsxPath)
  console.log(`요약: ${xlsxPath}`)
}

main().catch((error) => {
  console.error('PDF 만들기 오류:', error)
  process.exit(1)
})
