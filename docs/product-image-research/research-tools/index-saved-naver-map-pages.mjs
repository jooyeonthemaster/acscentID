import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const researchRoot = path.resolve(__dirname, '..')
const outputRoot = path.join(researchRoot, 'references', 'web', 'naver-map-recent')
const pagesRoot = path.join(outputRoot, 'pages')
const imagesRoot = path.join(outputRoot, 'images')

const placeId = '1274492663'
const placeUrl = `https://m.place.naver.com/place/${placeId}/photo?entry=pll`
const cutoff = new Date('2025-07-18T00:00:00+09:00')
const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

function photoTimestamp(photo) {
  const raw = photo.originalDate || photo.date
  if (!raw) return null
  const normalized = /^\d{4}\.\d{2}\.\d{2}$/.test(raw) ? raw.replaceAll('.', '-') : raw
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? timestamp : null
}

function isInRange(photo) {
  const timestamp = photoTimestamp(photo)
  return timestamp === null || timestamp >= cutoff.getTime()
}

function extensionFor(contentType, url) {
  const type = String(contentType || '').toLowerCase()
  if (type.includes('png')) return '.png'
  if (type.includes('webp')) return '.webp'
  if (type.includes('avif')) return '.avif'
  if (type.includes('gif')) return '.gif'
  if (type.includes('heic')) return '.heic'
  const pathname = new URL(url).pathname.toLowerCase()
  const match = pathname.match(/\.(jpe?g|png|webp|avif|gif|heic)$/)
  return match ? `.${match[1].replace('jpeg', 'jpg')}` : '.jpg'
}

function uniquePhotos(photos) {
  const byKey = new Map()
  for (const photo of photos) {
    const key = photo.originalUrl || photo.viewId || `${photo.photoType}:${photo.date}:${photo.title}`
    if (!byKey.has(key)) byKey.set(key, photo)
  }
  return [...byKey.values()]
}

async function downloadPhoto(photo, index) {
  const response = await fetch(photo.originalUrl, {
    headers: {
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      referer: placeUrl,
      'user-agent': userAgent,
    },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const contentType = response.headers.get('content-type') || ''
  const filename = `map-${String(index + 1).padStart(4, '0')}${extensionFor(contentType, photo.originalUrl)}`
  const bytes = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(path.join(imagesRoot, filename), bytes)
  return { filename, bytes: bytes.length, contentType }
}

await fs.mkdir(imagesRoot, { recursive: true })
const pageFiles = (await fs.readdir(pagesRoot))
  .filter((filename) => /^page-\d+\.json$/.test(filename))
  .sort()

const pages = []
for (const filename of pageFiles) {
  const payload = JSON.parse(await fs.readFile(path.join(pagesRoot, filename), 'utf8'))
  const viewer = payload?.data?.photoViewer
  if (viewer) pages.push({ filename, viewer })
}

const collectedPhotos = uniquePhotos(pages.flatMap(({ viewer }) => viewer.photos || []))
const recentPhotos = collectedPhotos.filter(isInRange)
const downloads = []

for (const [index, photo] of recentPhotos.entries()) {
  if (!photo.originalUrl) continue
  try {
    const downloaded = await downloadPhoto(photo, index)
    downloads.push({ ...photo, ...downloaded })
  } catch (error) {
    downloads.push({ ...photo, error: error.message })
  }
  if ((index + 1) % 20 === 0) {
    console.log(`Downloaded ${index + 1}/${recentPhotos.length}`)
  }
}

const datedTimestamps = collectedPhotos
  .map(photoTimestamp)
  .filter((value) => value !== null)
  .sort((a, b) => a - b)
const index = {
  generatedAt: new Date().toISOString(),
  status: 'partial-saved-pages',
  placeId,
  placeUrl,
  cutoff: cutoff.toISOString(),
  pageCount: pages.length,
  sourcePageFiles: pages.map(({ filename }) => filename),
  collectedPhotoCount: collectedPhotos.length,
  recentPhotoCount: recentPhotos.length,
  downloadedImageCount: downloads.filter((item) => item.filename).length,
  downloadErrorCount: downloads.filter((item) => item.error).length,
  oldestCollectedDate: datedTimestamps[0] ? new Date(datedTimestamps[0]).toISOString() : null,
  newestCollectedDate: datedTimestamps.at(-1) ? new Date(datedTimestamps.at(-1)).toISOString() : null,
  photos: downloads,
}

await fs.writeFile(path.join(outputRoot, 'index.partial.json'), `${JSON.stringify(index, null, 2)}\n`)
console.log(JSON.stringify({ ...index, photos: undefined }, null, 2))
