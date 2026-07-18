import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const researchRoot = path.resolve(__dirname, '..')
const mapRoot = path.join(researchRoot, 'references', 'web', 'naver-map-recent')
const imagesRoot = path.join(mapRoot, 'images')
const outputPath = path.join(
  researchRoot,
  'references',
  'analysis',
  'contact-sheets',
  'naver-map-recent-page-001.jpg',
)

const columns = 5
const cellWidth = 240
const cellHeight = 222
const imageWidth = 216
const imageHeight = 174
const padding = 12

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function makeCell(sourcePath, label) {
  const resized = await sharp(sourcePath, { animated: false })
    .rotate()
    .resize(imageWidth, imageHeight, {
      fit: 'contain',
      background: '#f2f2f2',
      withoutEnlargement: true,
    })
    .flatten({ background: '#f2f2f2' })
    .jpeg({ quality: 82 })
    .toBuffer()

  const svg = Buffer.from(`
    <svg width="${cellWidth}" height="${cellHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="${padding}" y="${padding}" width="${imageWidth}" height="${imageHeight}" fill="#f2f2f2"/>
      <rect x="${padding}" y="${padding + imageHeight + 7}" width="${imageWidth}" height="34" fill="#111111"/>
      <text x="${padding + 8}" y="${padding + imageHeight + 29}" fill="#ffffff"
        font-family="Arial, sans-serif" font-size="13">${escapeXml(label)}</text>
    </svg>
  `)

  return sharp(svg)
    .composite([{ input: resized, left: padding, top: padding }])
    .jpeg({ quality: 88 })
    .toBuffer()
}

const index = JSON.parse(await fs.readFile(path.join(mapRoot, 'index.partial.json'), 'utf8'))
const photos = index.photos.filter((photo) => photo.filename)
const rows = Math.ceil(photos.length / columns)
const cells = []

for (const [photoIndex, photo] of photos.entries()) {
  const sourceType = photo.photoType === 'visitor' ? 'review' : photo.photoType
  const label = `${photo.filename}  ${photo.date || 'undated'}  ${sourceType}`
  cells.push({
    input: await makeCell(path.join(imagesRoot, photo.filename), label),
    left: (photoIndex % columns) * cellWidth,
    top: Math.floor(photoIndex / columns) * cellHeight,
  })
}

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await sharp({
  create: {
    width: columns * cellWidth,
    height: rows * cellHeight,
    channels: 3,
    background: '#d9d9d9',
  },
})
  .composite(cells)
  .jpeg({ quality: 88 })
  .toFile(outputPath)

console.log(JSON.stringify({ imageCount: photos.length, outputPath }, null, 2))
