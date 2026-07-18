import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const researchRoot = path.resolve(__dirname, '..')
const outputRoot = path.join(researchRoot, 'references', 'web', 'naver-map-recent')
const pagesRoot = path.join(outputRoot, 'pages')
const imagesRoot = path.join(outputRoot, 'images')

const placeId = '1274492663'
const placeUrl = `https://m.place.naver.com/place/${placeId}/photo?entry=pll`
const cutoff = new Date('2025-07-18T00:00:00+09:00')
const maxPages = 60
const pageDelayMs = 2500
const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function stripTypename(value) {
  if (Array.isArray(value)) return value.map(stripTypename)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== '__typename')
      .map(([key, child]) => [key, stripTypename(child)]),
  )
}

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

async function importPlaywright() {
  const locator = process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core'
  try {
    return await import(locator.startsWith('/') ? pathToFileURL(locator).href : locator)
  } catch (error) {
    throw new Error(
      `Unable to import playwright-core from ${locator}. Set PLAYWRIGHT_CORE_PATH to its index.mjs. ${error.message}`,
    )
  }
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

await fs.mkdir(pagesRoot, { recursive: true })
await fs.mkdir(imagesRoot, { recursive: true })

const { chromium } = await importPlaywright()
const chromePath =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ headless: true, executablePath: chromePath })
const context = await browser.newContext({
  locale: 'ko-KR',
  userAgent,
  viewport: { width: 430, height: 932 },
})
const page = await context.newPage()
page.on('console', (message) => {
  if (message.type() === 'error') console.error(`[browser] ${message.text()}`)
})

let resolveInitial
let rejectInitial
const initialOperation = new Promise((resolve, reject) => {
  resolveInitial = resolve
  rejectInitial = reject
})
const initialTimeout = setTimeout(
  () => rejectInitial(new Error('Timed out waiting for the initial Naver Place photo query')),
  60_000,
)

page.on('response', async (response) => {
  if (!response.url().includes('/place/graphql')) return
  try {
    const requestBody = JSON.parse(response.request().postData() || '[]')
    const responseBody = JSON.parse(await response.text())
    const operations = Array.isArray(requestBody) ? requestBody : [requestBody]
    const results = Array.isArray(responseBody) ? responseBody : [responseBody]
    const index = operations.findIndex((operation) => operation.operationName === 'getPhotoViewerItems')
    if (index < 0 || !results[index]?.data?.photoViewer) return
    clearTimeout(initialTimeout)
    resolveInitial({ operation: operations[index], result: results[index] })
  } catch {
    // Non-JSON error and CAPTCHA responses are handled after navigation.
  }
})

try {
  console.log(`Opening ${placeUrl}`)
  await page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(7_000)
  const bodyText = await page.locator('body').innerText()
  if (bodyText.includes('서비스 이용이 제한되었습니다')) {
    throw new Error('Naver Place temporarily rate-limited this IP. Retry after the cooldown window.')
  }

  const html = await page.content()
  await fs.writeFile(path.join(outputRoot, 'source.html'), html)

  const apolloState = await page.evaluate(() => window.__APOLLO_STATE__ || null)
  if (apolloState) {
    await fs.writeFile(
      path.join(outputRoot, 'apollo-state.json'),
      `${JSON.stringify(apolloState, null, 2)}\n`,
    )
  }

  const { operation, result } = await initialOperation
  console.log(`Captured initial photo page with ${result.data.photoViewer.photos?.length || 0} items`)
  const pages = [result.data.photoViewer]
  await fs.writeFile(path.join(pagesRoot, 'page-001.json'), `${JSON.stringify(result, null, 2)}\n`)

  let cursors = pages[0].cursors || []
  let oldPageStreak = 0

  if (cursors.some((cursor) => cursor.hasNext)) {
    await page.waitForFunction(
      () => typeof window.ncaptcha?.f === 'function',
      { timeout: 30_000 },
    )
  }

  for (let pageNumber = 2; pageNumber <= maxPages; pageNumber += 1) {
    if (!cursors.some((cursor) => cursor.hasNext)) break
    await sleep(pageDelayMs)
    console.log(`Requesting Naver Map photo page ${pageNumber}`)

    const nextOperation = structuredClone(operation)
    nextOperation.variables.input.cursors = stripTypename(cursors)
    delete nextOperation.variables.input.selectedVisitorReview

    let pageResult = null
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await page.waitForFunction(
        () => typeof window.ncaptcha?.f === 'function',
        { timeout: 30_000 },
      )
      const apiResponse = await page.evaluate(async ({ nextOperation }) => {
        const token = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('nCaptcha token timeout')), 20_000)
          window.ncaptcha.f((value) => {
            clearTimeout(timeout)
            resolve(value)
          })
        })
        const response = await fetch('https://api.place.naver.com/place/graphql', {
          method: 'POST',
          credentials: 'include',
          headers: {
            accept: '*/*',
            'accept-language': 'ko',
            'content-type': 'application/json',
            'x-wtm-graphql': 'eyJhcmciOiIxMjc0NDkyNjYzIiwidHlwZSI6InBsYWNlIiwic291cmNlIjoicGxhY2UifQ',
            'x-wtm-ncaptcha-token': token,
          },
          body: JSON.stringify([nextOperation]),
        })
        return { status: response.status, text: await response.text() }
      }, { nextOperation })

      if (apiResponse.status === 200) {
        const parsed = JSON.parse(apiResponse.text)
        pageResult = (Array.isArray(parsed) ? parsed[0] : parsed)
        break
      }
      console.error(`Page ${pageNumber}, attempt ${attempt}: HTTP ${apiResponse.status}`)
      if (attempt === 3) {
        throw new Error(`Naver photo page ${pageNumber} failed with HTTP ${apiResponse.status}`)
      }
      await sleep(attempt * 15_000)
    }

    const viewer = pageResult?.data?.photoViewer
    if (!viewer) throw new Error(`Naver photo page ${pageNumber} returned no photoViewer data`)
    pages.push(viewer)
    console.log(`Saved page ${pageNumber} with ${viewer.photos?.length || 0} items`)
    await fs.writeFile(
      path.join(pagesRoot, `page-${String(pageNumber).padStart(3, '0')}.json`),
      `${JSON.stringify(pageResult, null, 2)}\n`,
    )
    cursors = viewer.cursors || []

    const datedPhotos = (viewer.photos || []).filter((photo) => photoTimestamp(photo) !== null)
    const newestTimestamp = datedPhotos.length
      ? Math.max(...datedPhotos.map(photoTimestamp))
      : Number.POSITIVE_INFINITY
    oldPageStreak = newestTimestamp < cutoff.getTime() ? oldPageStreak + 1 : 0
    if (oldPageStreak >= 2) break
  }

  const collectedPhotos = uniquePhotos(pages.flatMap((viewer) => viewer.photos || []))
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
    if ((index + 1) % 20 === 0) await sleep(1_000)
  }

  const index = {
    generatedAt: new Date().toISOString(),
    placeId,
    placeUrl,
    cutoff: cutoff.toISOString(),
    pageCount: pages.length,
    collectedPhotoCount: collectedPhotos.length,
    recentPhotoCount: recentPhotos.length,
    downloadedImageCount: downloads.filter((item) => item.filename).length,
    downloadErrorCount: downloads.filter((item) => item.error).length,
    oldestCollectedDate: collectedPhotos
      .map((photo) => photoTimestamp(photo))
      .filter((value) => value !== null)
      .sort((a, b) => a - b)
      .map((value) => new Date(value).toISOString())[0] || null,
    photos: downloads,
  }
  await fs.writeFile(path.join(outputRoot, 'index.json'), `${JSON.stringify(index, null, 2)}\n`)
  console.log(JSON.stringify({ ...index, photos: undefined }, null, 2))
} finally {
  clearTimeout(initialTimeout)
  await browser.close()
}
