import fs from 'node:fs/promises'
import path from 'node:path'

const researchRoot = path.resolve('docs/product-image-research')
const referencesRoot = path.join(researchRoot, 'references')
const webRoot = path.join(referencesRoot, 'web')
const analysisRoot = path.join(referencesRoot, 'analysis')

function clean(value = '') {
  return String(value).replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()
}

function dateOnly(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

async function countFiles(directory, matcher = () => true) {
  let count = 0
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) count += await countFiles(target, matcher)
    else if (matcher(target)) count += 1
  }
  return count
}

const blogIndex = JSON.parse(
  await fs.readFile(path.join(webRoot, 'naver-blog-recent', 'index.json'), 'utf8'),
)
const instagramIndex = JSON.parse(
  await fs.readFile(path.join(webRoot, 'instagram-official-recent', 'index.json'), 'utf8'),
)
const mapIndex = JSON.parse(
  await fs.readFile(path.join(webRoot, 'naver-map-recent', 'index.partial.json'), 'utf8'),
)
const supplementaryIndex = JSON.parse(
  await fs.readFile(path.join(webRoot, 'supplementary-pages', 'index.json'), 'utf8'),
)

const relevantPosts = blogIndex.posts
  .filter((post) => post.relevant && post.inRange)
  .sort((a, b) => String(a.publishedAt).localeCompare(String(b.publishedAt)))
const blogLines = [
  '# 최근 1년 네이버 블로그 색인',
  '',
  `- 조사 범위: ${dateOnly(blogIndex.dateRange.from)} ~ 2026-07-18`,
  `- 검색 후보: ${blogIndex.candidateCount}건`,
  `- 관련 게시물: ${blogIndex.savedPostCount}건`,
  `- 저장 이미지: ${blogIndex.savedImageCount}장`,
  '- 원문 HTML, 추출 텍스트, 메타데이터, 이미지는 각 로컬 폴더에 함께 보관',
  '',
  '| 날짜 | 게시물 | 상품군 | 이미지 | 로컬 폴더 |',
  '| --- | --- | --- | ---: | --- |',
  ...relevantPosts.map((post) => {
    const folder = `${post.blogId}-${post.postId}`
    return `| ${dateOnly(post.publishedAt)} | [${clean(post.title)}](${post.url}) | ${post.productGroups.map(clean).join(', ')} | ${post.imageCount} | \`references/web/naver-blog-recent/${folder}/\` |`
  }),
  '',
  '상품군은 키워드 기반 1차 분류다. 최종 외형 판정은 본문과 사진을 함께 확인한 `product-facts.md`를 따른다.',
  '',
]

const instagramLines = [
  '# 공식 인스타그램 최근 게시물 색인',
  '',
  `- 계정: [@${instagramIndex.username}](${instagramIndex.profileUrl})`,
  `- 조사 범위 시작: ${dateOnly(instagramIndex.cutoff)}`,
  `- 공개 프로필 게시물: ${instagramIndex.profilePostCount}건`,
  `- 최근 1년 저장 게시물: ${instagramIndex.savedPostCount}건`,
  `- 저장 이미지: ${instagramIndex.savedImageCount}장`,
  '',
  '| 날짜 | 게시물 | 이미지 | 로컬 폴더 |',
  '| --- | --- | ---: | --- |',
  ...instagramIndex.posts.map(
    (post) => `| ${dateOnly(post.publishedAt)} | [${post.shortcode}](${post.url}) | ${post.imageCount} | \`references/web/instagram-official-recent/${post.directory}/\` |`,
  ),
  '',
]

const mapLines = [
  '# 네이버 지도 최신 사진 색인',
  '',
  `- 매장: [악센트 아이디](${mapIndex.placeUrl})`,
  `- 장소 ID: ${mapIndex.placeId}`,
  `- 저장 범위: ${dateOnly(mapIndex.oldestCollectedDate)} ~ ${dateOnly(mapIndex.newestCollectedDate)}`,
  `- 저장 사진: ${mapIndex.downloadedImageCount}장`,
  `- 리뷰 문장이 포함된 사진: ${mapIndex.photos.filter((photo) => photo.text).length}장`,
  '- 상태: 최신 사진 API 첫 페이지 보존 완료. 추가 페이지는 네이버 측 일시 제한으로 미수집.',
  '',
  '| 날짜 | 유형 | 파일 | 원본 |',
  '| --- | --- | --- | --- |',
  ...mapIndex.photos.map(
    (photo) => `| ${clean(photo.date || '날짜 없음')} | ${clean(photo.photoType)} | \`references/web/naver-map-recent/images/${photo.filename}\` | [원본](${photo.originalUrl}) |`,
  ),
  '',
  '리뷰 본문, 작성자, 키워드, 별점 등 공개 메타데이터는 `index.partial.json`과 `pages/page-001.json`에 보존했다.',
  '',
]

const imageMatcher = (filename) => /\.(?:avif|gif|jpe?g|png|webp)$/i.test(filename)
const recentBlogImageFileCount = await countFiles(
  path.join(webRoot, 'naver-blog-recent'),
  imageMatcher,
)
const datasets = [
  ['최근 네이버 블로그', 'naver-blog-recent', recentBlogImageFileCount, '최근 1년 핵심 자료'],
  ['기존 네이버 블로그', 'naver-blog', await countFiles(path.join(webRoot, 'naver-blog'), imageMatcher), '과거 형태 비교, 일부 최근 자료 중복'],
  ['최신 네이버 지도', 'naver-map-recent', mapIndex.downloadedImageCount, '2026-06~07 최신 사진'],
  ['기존 네이버 지도', 'naver-map', await countFiles(path.join(webRoot, 'naver-map'), imageMatcher), '기존 공개 사진 및 변환본 포함'],
  ['공식 인스타그램', 'instagram-official-recent', instagramIndex.savedImageCount, '최근 공식 구성/옵션'],
  ['공식 사이트', 'official', await countFiles(path.join(webRoot, 'official'), imageMatcher), '공식 제품 렌더와 사진'],
  ['Tistory 후기', 'tistory', await countFiles(path.join(webRoot, 'tistory')), '방문 후기'],
  ['Fever', 'fever', await countFiles(path.join(webRoot, 'fever')), '체험 옵션/공간'],
  ['Klook', 'klook', await countFiles(path.join(webRoot, 'klook'), imageMatcher), '과거 공간/체험 비교'],
  ['보조 페이지', 'supplementary-pages', await countFiles(path.join(webRoot, 'supplementary-pages'), imageMatcher), '운영사 갤러리와 외부 장문 자료'],
]
const totalDatasetImages = datasets.reduce((sum, dataset) => sum + dataset[2], 0)
const inventoryLines = [
  '# 리서치 자료 인벤토리',
  '',
  '기준일: 2026-07-18',
  '',
  `- 실제 웹 이미지 파일 합계: ${totalDatasetImages}개`,
  `- 최근 1년 네이버 블로그: ${blogIndex.savedPostCount}건 / ${blogIndex.savedImageCount}장`,
  `- 최근 블로그 실제 파일: ${recentBlogImageFileCount}개 (대표 이미지 중복 포맷 14개 포함)`,
  `- 최근 공식 인스타그램: ${instagramIndex.savedPostCount}건 / ${instagramIndex.savedImageCount}장`,
  `- 최신 네이버 지도 1차 확보: ${mapIndex.downloadedImageCount}장`,
  `- 보조 웹 문서: ${supplementaryIndex.sourceCount}개 URL 중 ${supplementaryIndex.successfulSourceCount}개 정상 저장`,
  '',
  '| 데이터셋 | 이미지 | 용도 | 경로 |',
  '| --- | ---: | --- | --- |',
  ...datasets.map(
    ([label, folder, count, purpose]) => `| ${label} | ${count} | ${purpose} | \`references/web/${folder}/\` |`,
  ),
  '',
  '합계에는 동일 원본의 변환본, 대표 이미지 중복 포맷, 레거시/최근 데이터셋 간 중복이 포함된다. 출처별 실제 이미지 파일 수이며 고유 이미지 해시 수는 아니다.',
  '',
  '## 핵심 바로가기',
  '',
  '- `analysis/product-facts.md`: 제품별 확정 외형과 불확실성',
  '- `analysis/coverage-report.md`: 최근 1년 채널별 조사 범위와 수집 한계',
  '- `analysis/image-corrections.md`: 수정 이미지, 참고 자료, 최종 프롬프트',
  '- `analysis/recent-blog-index.md`: 최근 블로그 전체 목록',
  '- `analysis/official-instagram-index.md`: 공식 인스타그램 목록',
  '- `analysis/naver-map-recent-index.md`: 최신 지도 사진 전체 목록',
  '- `analysis/contact-sheets/`: 육안 검수용 접촉시트',
  '- `web/supplementary-pages/`: 공식/외부 페이지 HTML, 정제 텍스트, 메타데이터',
  '',
  '## 근거 사용 원칙',
  '',
  '1. 현재 공식 페이지와 최근 공식 인스타그램을 상품 구성의 1순위로 사용한다.',
  '2. 최근 택배 수령 블로그와 네이버 지도 원본으로 실제 보틀, 상자, 리포트 형태를 교차 확인한다.',
  '3. 과거 Klook/Fever/Tistory 자료는 현재 형태와 충돌할 때 우선순위를 낮춘다.',
  '4. 원본 사진은 내부 조사/검수용이다. 고객 후기처럼 공개 재사용하려면 별도 이용 허락이 필요하다.',
  '',
]

await fs.mkdir(analysisRoot, { recursive: true })
await Promise.all([
  fs.writeFile(path.join(analysisRoot, 'recent-blog-index.md'), `${blogLines.join('\n')}\n`),
  fs.writeFile(path.join(analysisRoot, 'official-instagram-index.md'), `${instagramLines.join('\n')}\n`),
  fs.writeFile(path.join(analysisRoot, 'naver-map-recent-index.md'), `${mapLines.join('\n')}\n`),
  fs.writeFile(path.join(analysisRoot, 'source-inventory.md'), `${inventoryLines.join('\n')}\n`),
])

console.log(JSON.stringify({
  blogPosts: relevantPosts.length,
  instagramPosts: instagramIndex.posts.length,
  mapPhotos: mapIndex.photos.length,
  totalDatasetImages,
}, null, 2))
