import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const W = 1200
const H = 1800
const out = 'public/assets/photobooth/frames'
await mkdir(out, { recursive: true })

const sparkle = (x, y, s, color) => `<path d="M${x} ${y-s}C${x+s*.12} ${y-s*.18} ${x+s*.18} ${y-s*.12} ${x+s} ${y}C${x+s*.18} ${y+s*.12} ${x+s*.12} ${y+s*.18} ${x} ${y+s}C${x-s*.12} ${y+s*.18} ${x-s*.18} ${y+s*.12} ${x-s} ${y}C${x-s*.18} ${y-s*.12} ${x-s*.12} ${y-s*.18} ${x} ${y-s}Z" fill="${color}"/>`
const heart = (x, y, s, color) => `<path d="M${x} ${y+s*.85}C${x-s*1.15} ${y+s*.1} ${x-s*.85} ${y-s*.75} ${x} ${y-s*.15}C${x+s*.85} ${y-s*.75} ${x+s*1.15} ${y+s*.1} ${x} ${y+s*.85}Z" fill="${color}"/>`
const svg = (content) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${content}</svg>`

const frames = [
  ['mono-minimal', svg(`
    <rect x="18" y="18" width="1164" height="1764" rx="42" fill="none" stroke="#111111" stroke-width="20"/>
    <path d="M56 230V70H216M984 70h160v160" fill="none" stroke="#fff" stroke-width="5" opacity=".9"/>
    <circle cx="83" cy="1530" r="15" fill="#fff"/><circle cx="1120" cy="120" r="9" fill="#111"/>
  `)],
  ['birthday-party', svg(`
    <path d="M0 0h1200v72H0zM0 0h72v1800H0zM1128 0h72v1800h-72z" fill="#ff5f87"/>
    <path d="M90 0l48 72 48-72 48 72 48-72 48 72 48-72 48 72 48-72 48 72 48-72 48 72 48-72 48 72 48-72 48 72 48-72 48 72 48-72 48 72 48-72 48 72 48-72" fill="#ffd86b" opacity=".95"/>
    ${sparkle(105,170,28,'#ffd86b')}${sparkle(1090,300,34,'#fff')}${sparkle(104,770,18,'#fff')}${sparkle(1090,1190,22,'#ffd86b')}
    <circle cx="112" cy="430" r="16" fill="#7d5cff"/><circle cx="1094" cy="620" r="12" fill="#43d7c8"/><circle cx="116" cy="1320" r="11" fill="#43d7c8"/>
  `)],
  ['pastel-hearts', svg(`
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff9fbe"/><stop offset="1" stop-color="#b99cff"/></linearGradient></defs>
    <rect x="26" y="26" width="1148" height="1748" rx="48" fill="none" stroke="url(#g)" stroke-width="28"/>
    ${heart(105,150,34,'#ff9fbe')}${heart(1090,210,25,'#c4a5ff')}${heart(105,660,19,'#ffd0df')}${heart(1095,840,38,'#ff91b6')}${heart(104,1260,27,'#c9b1ff')}${heart(1090,1450,20,'#ffd0df')}
    ${sparkle(150,105,15,'#fff')}${sparkle(1050,520,18,'#fff')}
  `)],
  ['starlight', svg(`
    <rect x="18" y="18" width="1164" height="1764" rx="42" fill="none" stroke="#273469" stroke-width="24"/>
    <path d="M28 28h310L28 338zM1172 28H862l310 310z" fill="#273469" opacity=".92"/>
    ${sparkle(100,100,34,'#f7d978')}${sparkle(230,92,16,'#fff')}${sparkle(1096,105,38,'#f7d978')}${sparkle(1010,165,14,'#fff')}${sparkle(95,650,20,'#f7d978')}${sparkle(1100,900,24,'#f7d978')}${sparkle(100,1390,16,'#fff')}
  `)],
  ['velvet-ribbon', svg(`
    <defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6c1731"/><stop offset=".5" stop-color="#b33a5d"/><stop offset="1" stop-color="#541125"/></linearGradient></defs>
    <path d="M0 0h92v1800H0zM1108 0h92v1800h-92z" fill="url(#r)"/>
    <path d="M34 125C180 35 260 72 310 180 214 138 139 166 80 245zM1166 125c-146-90-226-53-276 55 96-42 171-14 230 65z" fill="url(#r)" stroke="#d88aa3" stroke-width="5"/>
    <circle cx="58" cy="410" r="8" fill="#f3d58e"/><circle cx="1142" cy="600" r="8" fill="#f3d58e"/>${sparkle(55,980,18,'#f3d58e')}${sparkle(1145,1280,18,'#f3d58e')}
  `)],
  ['four-cut-pearl', svg(`
    <rect x="20" y="20" width="1160" height="1760" rx="44" fill="none" stroke="#f1dfc4" stroke-width="26"/>
    <path d="M600 20v1526M20 900h1160" stroke="#fff" stroke-width="18" opacity=".96"/>
    <path d="M600 20v1526M20 900h1160" stroke="#d9bfa1" stroke-width="2" opacity=".75"/>
    ${sparkle(80,80,24,'#f0cf91')}${sparkle(1120,80,24,'#f0cf91')}${sparkle(80,1720,24,'#f0cf91')}${sparkle(1120,1720,24,'#f0cf91')}
  `)],
]

for (const [name, markup] of frames) {
  await sharp(Buffer.from(markup)).png().toFile(`${out}/${name}.png`)
}
