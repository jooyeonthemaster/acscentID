import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const generatedRoot = path.resolve('public/images/products/generated')
const outputPath = path.resolve('docs/product-image-research/generated-contact-sheet.jpg')
const productOrder = [
  'idol-image',
  'sample',
  'figure',
  'graduation',
  'personal',
  'chemistry',
  'saju',
  'le-quack',
  'today-scent',
  'perfume-50ml',
  'perfume-10ml',
  'scent-paper',
]

const columns = 5
const cellWidth = 300
const cellHeight = 322
const imageSize = 300

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const items = []
for (const product of productOrder) {
  const directory = path.join(generatedRoot, product)
  const filenames = (await fs.readdir(directory))
    .filter((filename) => filename.endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  for (const filename of filenames) items.push({ product, filename, path: path.join(directory, filename) })
}

const composites = []
for (const [index, item] of items.entries()) {
  const image = await sharp(item.path)
    .resize(imageSize, imageSize, { fit: 'cover' })
    .jpeg({ quality: 86 })
    .toBuffer()
  const label = item.filename.replace('.png', '').replaceAll('-', ' ')
  const svg = Buffer.from(`
    <svg width="${cellWidth}" height="${cellHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111111"/>
      <text x="10" y="316" fill="#ffffff" font-family="Arial, sans-serif" font-size="13">${escapeXml(label)}</text>
    </svg>
  `)
  const cell = await sharp(svg)
    .composite([{ input: image, left: 0, top: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer()
  composites.push({
    input: cell,
    left: (index % columns) * cellWidth,
    top: Math.floor(index / columns) * cellHeight,
  })
}

const rows = Math.ceil(items.length / columns)
await sharp({
  create: {
    width: columns * cellWidth,
    height: rows * cellHeight,
    channels: 3,
    background: '#111111',
  },
})
  .composite(composites)
  .jpeg({ quality: 88 })
  .toFile(outputPath)

console.log(JSON.stringify({ imageCount: items.length, outputPath }, null, 2))
