import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve('docs/product-image-research/references/web/naver-blog-recent')
const FROM = Date.parse('2025-07-18T00:00:00+09:00')
const TO = Date.parse('2026-07-19T00:00:00+09:00')
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'

const QUERIES = [
  '악센트 아이디',
  '악센트아이디',
  "AC'SCENT ID",
  "AC'SCENT IDENTITY",
  'AC SCENT ID 향수',
  '악센트 아이디 향수',
  '악센트 아이디 레이어링',
  '악센트 아이디 최애',
  '악센트 아이디 이미지 분석',
  '악센트 아이디 퍼스널',
  '악센트 아이디 시향지',
  '악센트 아이디 뿌덕',
  '퍼퓸웨어 악센트',
  '악센트 ID 홍대 향수',
  '이미지 분석 향수 홍대',
  '최애 향수 홍대 AI',
]

const KNOWN_URLS = [
  'https://blog.naver.com/kimye1002/223927760178',
  'https://blog.naver.com/nillilishop/224300674987',
  'https://blog.naver.com/onix81212/224326064727',
  'https://blog.naver.com/snapture/224296907305',
]

function decodeHtml(value = '') {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'))
  return decodeHtml(match?.[1] || '')
}

function extractText(html) {
  const paragraphs = [...html.matchAll(/<p[^>]*class="[^"]*se-text-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => decodeHtml(match[1]))
    .filter((line) => line && line !== '\u200b')
  return paragraphs.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function extractImages(html) {
  const images = []
  const seen = new Set()
  for (const match of html.matchAll(/data-linkdata='([^']+)'/gi)) {
    try {
      const data = JSON.parse(decodeHtml(match[1]))
      if (data.linkType && data.linkType !== 'img') continue
      if (!data.src || !/^https?:\/\//.test(data.src) || seen.has(data.src)) continue
      if (/reviewnote\.cloud\/gongjeong/i.test(data.src)) continue
      seen.add(data.src)
      images.push({
        sourceUrl: data.src,
        originalWidth: Number(data.originalWidth) || null,
        originalHeight: Number(data.originalHeight) || null,
        fileSize: Number(data.fileSize) || null,
      })
    } catch {
      // Naver occasionally emits non-JSON link metadata; those entries are not post photos.
    }
  }
  return images
}

function isRelevant(title, text) {
  const body = `${title}\n${text}`.toLowerCase().replace(/\s+/g, '')
  return [
    '악센트아이디',
    '악센트아이덴티티',
    "ac'scentid",
    "ac'scentidentity",
    'acscentid',
  ].some((keyword) => body.includes(keyword))
}

function classifyProducts(title, text) {
  const body = `${title}\n${text}`.toLowerCase()
  const normalized = body.replace(/\s+/g, '')
  const groups = []
  if (/(10\s?ml|10미리)/i.test(body)) groups.push('perfume-10ml')
  if (/(50\s?ml|50미리)/i.test(body)) groups.push('perfume-50ml')
  if (/(레이어링|layering|퍼퓸\s?세트|perfume\s?set|케미|궁합|커플|상대방)/i.test(body)) groups.push('layering-perfume')
  if (/(최애|아이돌|덕질|뿌덕|ppuduck|favorite)/i.test(body)) groups.push('image-analysis-favorite')
  if (/(이미지분석|이미지\s?분석|퍼스널|나만의|내이미지|본인이미지|personal)/i.test(body)) groups.push('image-analysis-self')
  if (/(시향지|scent\s?paper|샘플향|향샘플)/i.test(body)) groups.push('scent-paper')
  if (!groups.length && normalized.includes('향수')) groups.push('unclassified-perfume')
  return [...new Set(groups)]
}

async function fetchText(url, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': USER_AGENT, referer: 'https://m.search.naver.com/' } })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return await response.text()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
  throw lastError
}

async function discoverUrls() {
  const found = new Map(KNOWN_URLS.map((url) => [url, new Set(['known'])]))
  for (const query of QUERIES) {
    for (const start of [1, 31, 61, 91, 121]) {
      const searchUrl = new URL('https://m.search.naver.com/search.naver')
      searchUrl.searchParams.set('where', 'm_view')
      searchUrl.searchParams.set('query', query)
      searchUrl.searchParams.set('nso', 'so:dd,p:from20250718to20260718')
      searchUrl.searchParams.set('start', String(start))
      const html = await fetchText(searchUrl)
      for (const match of html.matchAll(/https:\/\/m\.blog\.naver\.com\/([A-Za-z0-9_.-]+)\/(\d+)/g)) {
        const url = `https://blog.naver.com/${match[1]}/${match[2]}`
        if (!found.has(url)) found.set(url, new Set())
        found.get(url).add(query)
      }
    }
  }
  return found
}

function imageExtension(contentType, sourceUrl) {
  if (/png/i.test(contentType)) return '.png'
  if (/webp/i.test(contentType)) return '.webp'
  if (/gif/i.test(contentType)) return '.gif'
  if (/avif/i.test(contentType)) return '.avif'
  const pathname = new URL(sourceUrl).pathname.toLowerCase()
  const match = pathname.match(/\.(jpe?g|png|webp|gif|avif)$/)
  return match ? `.${match[1].replace('jpeg', 'jpg')}` : '.jpg'
}

async function downloadImage(image, destinationBase) {
  const candidates = /mblogthumb-phinf\.pstatic\.net/i.test(image.sourceUrl)
    ? [`${image.sourceUrl}?type=w966`, `${image.sourceUrl}?type=w800`]
    : [image.sourceUrl]
  let lastError
  for (const downloadUrl of candidates) {
    try {
      const response = await fetch(downloadUrl, {
        headers: { 'user-agent': USER_AGENT, referer: 'https://m.blog.naver.com/' },
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.startsWith('image/')) throw new Error(`unexpected content-type ${contentType}`)
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length < 500) throw new Error(`image response too small: ${buffer.length}`)
      const extension = imageExtension(contentType, image.sourceUrl)
      const filePath = `${destinationBase}${extension}`
      await fs.writeFile(filePath, buffer)
      return { file: path.basename(filePath), bytes: buffer.length, contentType, downloadUrl }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

async function main() {
  await fs.mkdir(ROOT, { recursive: true })
  const discovered = await discoverUrls()
  const candidates = [...discovered.entries()].sort(([a], [b]) => a.localeCompare(b))
  const results = []

  for (let index = 0; index < candidates.length; index += 1) {
    const [url, querySet] = candidates[index]
    const match = url.match(/blog\.naver\.com\/([^/]+)\/(\d+)/)
    if (!match) continue
    const [, blogId, postId] = match
    const mobileUrl = `https://m.blog.naver.com/${blogId}/${postId}`
    try {
      const html = await fetchText(mobileUrl)
      const title = metaContent(html, 'og:title')
      const description = metaContent(html, 'og:description')
      const text = extractText(html)
      const timestamp = Number(html.match(/addDate="(\d+)"/)?.[1] || 0)
      const publishedAt = timestamp ? new Date(timestamp).toISOString() : null
      const relevant = isRelevant(title, text)
      const inRange = timestamp >= FROM && timestamp < TO
      const productGroups = classifyProducts(title, text)
      const images = extractImages(html)
      const record = {
        blogId,
        postId,
        url,
        mobileUrl,
        title,
        description,
        publishedAt,
        inRange,
        relevant,
        discoveredBy: [...querySet].sort(),
        productGroups,
        textCharacters: text.length,
        imageCount: images.length,
      }

      if (relevant && inRange) {
        const directory = path.join(ROOT, `${blogId}-${postId}`)
        await fs.mkdir(directory, { recursive: true })
        await fs.writeFile(path.join(directory, 'text.txt'), `${title}\n\n${text}\n`)
        await fs.writeFile(path.join(directory, 'source.html'), html)
        const downloaded = []
        for (let imageIndex = 0; imageIndex < images.length; imageIndex += 1) {
          const image = images[imageIndex]
          const base = path.join(directory, `image-${String(imageIndex + 1).padStart(3, '0')}`)
          try {
            const saved = await downloadImage(image, base)
            downloaded.push({ ...image, ...saved })
          } catch (error) {
            downloaded.push({ ...image, error: String(error) })
          }
        }
        record.downloadedImages = downloaded
        await fs.writeFile(path.join(directory, 'source.json'), `${JSON.stringify(record, null, 2)}\n`)
      }
      results.push(record)
      process.stdout.write(`[${index + 1}/${candidates.length}] ${relevant && inRange ? 'saved' : 'skip'} ${blogId}/${postId} ${title}\n`)
    } catch (error) {
      results.push({ blogId, postId, url, error: String(error), discoveredBy: [...querySet].sort() })
      process.stdout.write(`[${index + 1}/${candidates.length}] error ${blogId}/${postId}: ${error}\n`)
    }
  }

  const saved = results.filter((record) => record.relevant && record.inRange)
  const indexData = {
    generatedAt: new Date().toISOString(),
    dateRange: { from: new Date(FROM).toISOString(), toExclusive: new Date(TO).toISOString() },
    queries: QUERIES,
    candidateCount: candidates.length,
    savedPostCount: saved.length,
    savedImageCount: saved.reduce((sum, record) => sum + (record.downloadedImages?.filter((image) => !image.error).length || 0), 0),
    posts: results,
  }
  await fs.writeFile(path.join(ROOT, 'index.json'), `${JSON.stringify(indexData, null, 2)}\n`)
  process.stdout.write(`Done: ${indexData.savedPostCount} posts, ${indexData.savedImageCount} images\n`)
}

await main()
