import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('docs/product-image-research/references/web/supplementary-pages')
const targets = ['neander-experience', 'note-japan-review']
const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&#x27;', "'").replaceAll('&quot;', '"')
}

function imageUrls(html, baseUrl) {
  const urls = new Set()
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0]
    const raw = tag.match(/(?:src|data-src)=["']([^"']+)/i)?.[1]
    if (!raw || raw.startsWith('data:') || raw.endsWith('.svg')) continue
    try {
      urls.add(new URL(decodeHtml(raw), baseUrl).href)
    } catch {
      // Ignore malformed tracking images.
    }
  }
  return [...urls]
}

function extensionFor(contentType, url) {
  if (/png/i.test(contentType)) return '.png'
  if (/webp/i.test(contentType)) return '.webp'
  if (/gif/i.test(contentType)) return '.gif'
  const pathname = new URL(url).pathname.toLowerCase()
  const match = pathname.match(/\.(jpe?g|png|webp|gif)$/)
  return match ? `.${match[1].replace('jpeg', 'jpg')}` : '.jpg'
}

const results = []
for (const slug of targets) {
  const directory = path.join(root, slug)
  const metadata = JSON.parse(await fs.readFile(path.join(directory, 'source.json'), 'utf8'))
  const html = await fs.readFile(path.join(directory, 'source.html'), 'utf8')
  const imagesDirectory = path.join(directory, 'images')
  await fs.mkdir(imagesDirectory, { recursive: true })
  const downloads = []

  for (const [index, url] of imageUrls(html, metadata.finalUrl || metadata.url).entries()) {
    try {
      const response = await fetch(url, {
        headers: { referer: metadata.finalUrl || metadata.url, 'user-agent': userAgent },
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.startsWith('image/')) throw new Error(`Unexpected ${contentType}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      const filename = `image-${String(index + 1).padStart(2, '0')}${extensionFor(contentType, url)}`
      await fs.writeFile(path.join(imagesDirectory, filename), bytes)
      downloads.push({ url, filename, bytes: bytes.length, contentType })
    } catch (error) {
      downloads.push({ url, error: error.message })
    }
  }

  await fs.writeFile(
    path.join(directory, 'images.json'),
    `${JSON.stringify({ sourceUrl: metadata.url, downloads }, null, 2)}\n`,
  )
  results.push({
    slug,
    discovered: downloads.length,
    downloaded: downloads.filter((download) => download.filename).length,
    errors: downloads.filter((download) => download.error).length,
  })
}

console.log(JSON.stringify(results, null, 2))
