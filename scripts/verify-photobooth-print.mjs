import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const W = 1200, H = 1800, x = 36, contentW = 1128
const togetherY = 36, togetherH = 846, soloY = 900, soloH = 646, footerY = 1564
await mkdir('artifacts', { recursive: true })

const lower = Buffer.from(`<svg width="1128" height="646" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#dcc7ef"/><stop offset="1" stop-color="#9fb9df"/></linearGradient></defs><rect width="1128" height="646" rx="24" fill="url(#g)"/><circle cx="565" cy="240" r="118" fill="#f4d6c8"/><path d="M330 646c24-210 145-278 235-278s211 68 235 278" fill="#3d315b"/><circle cx="528" cy="230" r="9"/><circle cx="602" cy="230" r="9"/><path d="M535 285q30 22 60 0" fill="none" stroke="#9d4f62" stroke-width="8" stroke-linecap="round"/></svg>`)
const footer = Buffer.from(`<svg width="1128" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="1128" height="200" rx="24" fill="#8c3155"/><path d="M44 26h1040" stroke="white" opacity=".28"/><text x="44" y="56" fill="white" opacity=".75" font-family="Arial" font-size="18" font-weight="700" letter-spacing="5">AC'SCENT WOW PHOTO</text><text x="44" y="112" fill="white" font-family="Arial" font-size="42" font-weight="700">오늘의 최애와, 한 장에</text><text x="44" y="154" fill="white" opacity=".75" font-family="Arial" font-size="24">AC'SCENT · 홍대</text><text x="1084" y="112" text-anchor="end" fill="white" font-family="Arial" font-size="28" font-weight="700">#ACSCENT_WOW</text><text x="1084" y="154" text-anchor="end" fill="white" opacity=".72" font-family="Arial" font-size="19">2026. 9. 15.</text></svg>`)

const top = await sharp('public/assets/photobooth/templates/blossom-date.png').resize(contentW, togetherH, { fit: 'fill' }).png().toBuffer()
await sharp({ create: { width: W, height: H, channels: 4, background: '#fff' } })
  .composite([
    { input: top, left: x, top: togetherY },
    { input: lower, left: x, top: soloY },
    { input: footer, left: x, top: footerY },
    { input: 'public/assets/photobooth/frames/starlight.png', left: 0, top: 0 },
  ])
  .png()
  .toFile('artifacts/photobooth-print-preview.png')

const { data, info } = await sharp('public/assets/photobooth/frames/starlight.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const alphaAt = (px, py) => data[(py * info.width + px) * 4 + 3]
const probes = { center: alphaAt(600, 700), footerCenter: alphaAt(600, 1660), edge: alphaAt(20, 700) }
if (probes.center !== 0 || probes.footerCenter !== 0 || probes.edge === 0) throw new Error(`frame alpha contract failed: ${JSON.stringify(probes)}`)
console.log(JSON.stringify({ output: 'artifacts/photobooth-print-preview.png', size: `${W}x${H}`, alphaProbes: probes }))
