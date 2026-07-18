import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const researchRoot = path.resolve(__dirname, '..')
const recentBlogRoot = path.join(researchRoot, 'references', 'web', 'naver-blog-recent')
const outputRoot = path.join(researchRoot, 'references', 'analysis', 'contact-sheets')

const defaultSources = [
  'jjyoon6228-224286922464',
  'snapture-224296907305',
  'onix81212-224326064727',
  'uandisslove-224264120601',
  'syd02231-224308838635',
  'kco4053-224340723449',
  'qufqlcguswl-224304950085',
  '23jeans_-224277156574',
]

const columns = 5
const cellWidth = 240
const cellHeight = 222
const imageWidth = 216
const imageHeight = 174
const labelHeight = 34
const padding = 12

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function listImages(sourceDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && /^image-\d+\.(?:avif|gif|jpe?g|png|webp)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

async function makeCell(sourcePath, filename) {
  const image = sharp(sourcePath, { animated: false })
  const metadata = await image.metadata()
  const resized = await image
    .rotate()
    .resize(imageWidth, imageHeight, {
      fit: 'contain',
      background: '#f2f2f2',
      withoutEnlargement: true,
    })
    .flatten({ background: '#f2f2f2' })
    .jpeg({ quality: 82 })
    .toBuffer()

  const label = `${filename}  ${metadata.width ?? '?'}x${metadata.height ?? '?'}`
  const svg = Buffer.from(`
    <svg width="${cellWidth}" height="${cellHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="${padding}" y="${padding}" width="${imageWidth}" height="${imageHeight}" fill="#f2f2f2"/>
      <rect x="${padding}" y="${padding + imageHeight + 7}" width="${imageWidth}" height="${labelHeight}" fill="#111111"/>
      <text x="${padding + 8}" y="${padding + imageHeight + 29}" fill="#ffffff"
        font-family="Arial, sans-serif" font-size="13">${escapeXml(label)}</text>
    </svg>
  `)

  return sharp(svg)
    .composite([{ input: resized, left: padding, top: padding }])
    .jpeg({ quality: 88 })
    .toBuffer()
}

async function buildSheet(sourceName) {
  const sourceDir = path.join(recentBlogRoot, sourceName)
  const filenames = await listImages(sourceDir)
  if (!filenames.length) throw new Error(`No images found: ${sourceDir}`)

  const rows = Math.ceil(filenames.length / columns)
  const width = columns * cellWidth
  const height = rows * cellHeight
  const cells = []

  for (const [index, filename] of filenames.entries()) {
    cells.push({
      input: await makeCell(path.join(sourceDir, filename), filename),
      left: (index % columns) * cellWidth,
      top: Math.floor(index / columns) * cellHeight,
    })
  }

  await fs.mkdir(outputRoot, { recursive: true })
  const outputPath = path.join(outputRoot, `${sourceName}.jpg`)
  await sharp({
    create: { width, height, channels: 3, background: '#d9d9d9' },
  })
    .composite(cells)
    .jpeg({ quality: 88 })
    .toFile(outputPath)

  return { sourceName, imageCount: filenames.length, outputPath }
}

const requestedSources = process.argv.slice(2)
const sourceNames = requestedSources.length ? requestedSources : defaultSources
const results = []

for (const sourceName of sourceNames) {
  results.push(await buildSheet(sourceName))
}

console.log(JSON.stringify(results, null, 2))
