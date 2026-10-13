// 명함 디자이너 — 명함 한 면을 캔버스에 그린다. 화면의 미리보기와 받는 파일(그림·PDF)이 같은 함수로 그려져 늘 똑같다.
// 명함은 90×50mm(가로 9 : 세로 5). 그림 크기는 받는 쪽에서 정한다(미리보기는 작게, 파일은 1800×1000).
//
// 2026-10-13 다시 만듦 — 실제 명함이 생긴 대로(docs/kiosk-experiences.md '명함'):
//  · 글자는 그림 위에 얹지 않는다. 그림에서 뽑은 색으로 맞춘 깨끗한 종이 면에 이름 > 직업 > 연락처 순으로 크기 차를 크게 둔다.
//  · 그림(AI 가 그린 그래픽, 없으면 색 도형)은 배경지가 아니라 의도된 자리에 — 세로 면 · 가로 띠 · 아치 액자 · 전면 + 라벨 · 큰 글자 속.
//  · 앞면과 뒷면은 역할이 다르다 — 한쪽이 정보면 다른 쪽은 그림과 머리글자.

export type CardLayout = 'split' | 'band' | 'frame' | 'full' | 'type'
export type CardFont = 'modern' | 'classic' | 'bold' | 'hand' | 'round'
export type CardPaper = 'auto' | 'light' | 'dark'
export type CardColor = 'blue' | 'ivory' | 'black' | 'lime'
export type CardSide = 'front' | 'back'

export const CARD_LAYOUTS: CardLayout[] = ['split', 'band', 'frame', 'full', 'type']
export const CARD_FONTS: CardFont[] = ['modern', 'classic', 'bold', 'hand', 'round']
export const CARD_PAPERS: CardPaper[] = ['auto', 'light', 'dark']
export const CARD_COLORS: CardColor[] = ['blue', 'ivory', 'black', 'lime']
export const CARD_RATIO = 9 / 5

export interface CardSpec {
  name: string
  role: string
  contact: string
  /** 한 줄 소개(선택) */
  tagline: string
  layout: CardLayout
  /** 그림 자리를 반대쪽으로(왼쪽 ↔ 오른쪽, 띠는 위 ↔ 아래) */
  flip: boolean
  /** 종이 색 — auto 는 그림의 밝기를 따른다 */
  paper: CardPaper
  font: CardFont
  /** AI 그림 없이 만들 때의 색 */
  color: CardColor
}

export const CARD_BLANK: CardSpec = { name: '', role: '', contact: '', tagline: '', layout: 'split', flip: false, paper: 'auto', font: 'modern', color: 'blue' }

type RGB = [number, number, number]

/** AI 가 그린 그래픽과 거기서 뽑은 색 */
export interface CardArt {
  image: CanvasImageSource & { width: number; height: number }
  /** 가장 넓게 깔린 색 · 밝은 색 · 어두운 색 · 눈에 띄는 색 */
  base: RGB
  light: RGB
  dark: RGB
  accent: RGB
  /** 전체 밝기(0~1) */
  luma: number
  /** 한 가지 색이 넓게 깔린 그림인가 — 종이를 그 색으로 맞춘다 */
  tone: boolean
  /** 그 색이 거의 다인 그림인가(가는 선·블루프린트·블랙&골드) — 그림 면의 가장자리를 종이로 풀어 같은 종이에 인쇄된 것처럼 보이게 한다 */
  flat: boolean
  /** 가운데에 얼굴을 그린 그림인가 — 뒷면의 이름표·도장이 얼굴을 가리지 않게 아래로 내린다 */
  portrait: boolean
}

const css = (c: RGB, alpha = 1) => (alpha >= 1 ? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})` : `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`)
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const gap = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

function toHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255
  const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2, d = max - min
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  return [h * 60, Math.min(1, s), l]
}
function fromHsl(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/** 그림에서 색을 뽑는다 — 작게 줄여 비슷한 색끼리 모아 센다 */
export function measureArt(image: CardArt['image'], portrait = false): CardArt {
  const w = 72, h = 40
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const total = w * h
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
  let lumaSum = 0
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2]
    lumaSum += r * 0.299 + g * 0.587 + b * 0.114
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key)
    if (bucket) { bucket.r += r; bucket.g += g; bucket.b += b; bucket.n++ } else buckets.set(key, { r, g, b, n: 1 })
  }
  const colors = [...buckets.values()].map((c) => ({ rgb: [c.r / c.n, c.g / c.n, c.b / c.n] as RGB, share: c.n / total })).sort((a, b) => b.share - a.share)
  const base = colors[0].rgb
  let near = 0
  for (let i = 0; i < px.length; i += 4) if (gap([px[i], px[i + 1], px[i + 2]], base) <= 36) near++
  const major = colors.filter((c) => c.share >= 0.025)
  const byLight = [...(major.length ? major : colors)].sort((a, b) => toHsl(a.rgb)[2] - toHsl(b.rgb)[2])
  let accent: RGB | null = null, best = 0
  for (const c of colors) {
    if (c.share < 0.006 || gap(c.rgb, base) < 48) continue
    const [, s, l] = toHsl(c.rgb)
    const score = Math.pow(s, 1.1) * Math.pow(c.share, 0.3) * Math.max(0.2, 1 - Math.abs(l - 0.52) * 1.5)
    if (score > best) { best = score; accent = c.rgb }
  }
  const dark = byLight[0].rgb, light = byLight[byLight.length - 1].rgb
  return { image, base, light, dark, accent: accent ?? (toHsl(base)[2] > 0.5 ? dark : light), luma: lumaSum / total / 255, tone: near / total >= 0.3, flat: near / total >= 0.62, portrait }
}

// ───────────────────────── 색 ─────────────────────────

interface Theme {
  paper: RGB
  ink: RGB
  accent: RGB
  dark: boolean
  /** 종이가 그림의 바탕색과 같다 — 그림 위에 올리는 이름표·도장은 종이색 대신 먹색으로 뒤집는다 */
  same: boolean
  /** 거기에 그림이 거의 바탕색뿐이다 — 그림 면의 가장자리를 종이로 풀어 이음매를 없앤다 */
  merge: boolean
}

function artTheme(art: CardArt, paper: CardPaper): Theme {
  const dark = paper === 'auto' ? art.luma < 0.42 : paper === 'dark'
  const [bh, , bl] = toHsl(art.base)
  const [ah, as, al] = toHsl(art.accent)
  if (!dark) {
    const same = art.tone && bl >= 0.8
    const ll = toHsl(art.light)[2]
    const ink = fromHsl(as > 0.15 ? ah : bh, 0.26, 0.13)
    return {
      // 촘촘한 무늬는 줄이면 색이 섞여 탁해진다 — 덜 밝은 바탕색은 흰색 쪽으로 당겨 종이로 쓴다
      paper: same ? (bl >= 0.84 ? art.base : mix(art.base, [255, 255, 255], 0.5)) : ll >= 0.86 ? mix(art.light, [255, 255, 255], 0.4) : fromHsl(ah, Math.min(as, 0.5) * 0.4, 0.955),
      ink, dark, same, merge: same && art.flat && bl >= 0.84,
      // 밝은 종이 위에서 읽히게 — 옅은 색은 짙게, 색이 거의 없으면 먹색
      accent: as < 0.16 ? ink : fromHsl(ah, Math.max(as, 0.4), Math.min(al, 0.46)),
    }
  }
  const same = art.tone && bl <= 0.32
  const [dh, ds, dl] = toHsl(art.dark)
  const ink: RGB = [247, 243, 234]
  return {
    paper: same ? art.base : fromHsl(dh, Math.min(ds, 0.45), Math.max(0.07, Math.min(dl, 0.13))),
    ink, dark, same, merge: same && art.flat,
    accent: as < 0.16 ? ink : fromHsl(ah, Math.max(as, 0.35), Math.max(al, 0.66)),
  }
}

export const CARD_SWATCH: Record<CardColor, string> = { blue: '#0b3ff0', ivory: '#e9dfc9', black: '#15161a', lime: '#c8f02e' }
const PAPER: RGB = [248, 245, 234]
const INK: RGB = [21, 22, 26]
/** AI 그림 없이 — 고른 색으로 종이·글자·도형 색을 정한다 */
const BASIC: Record<CardColor, { theme: Theme; fill: RGB; shapes: [RGB, RGB] }> = {
  blue: { theme: { paper: PAPER, ink: INK, accent: [11, 63, 240], dark: false, same: false, merge: false }, fill: [11, 63, 240], shapes: [[62, 108, 255], [200, 240, 46]] },
  ivory: { theme: { paper: [250, 247, 239], ink: INK, accent: [176, 78, 46], dark: false, same: false, merge: false }, fill: [233, 223, 201], shapes: [[216, 201, 170], [176, 78, 46]] },
  black: { theme: { paper: [21, 22, 26], ink: [248, 245, 234], accent: [200, 240, 46], dark: true, same: false, merge: false }, fill: [36, 38, 46], shapes: [[58, 61, 73], [200, 240, 46]] },
  lime: { theme: { paper: PAPER, ink: INK, accent: [52, 96, 18], dark: false, same: false, merge: false }, fill: [200, 240, 46], shapes: [[170, 216, 24], [21, 22, 26]] },
}

// ───────────────────────── 글꼴 ─────────────────────────

const SERIF_FALLBACK = `'Noto Serif KR', 'Nanum Myeongjo', 'AppleMyungjo', 'Batang', Georgia, serif`
/** 큰 글자(이름·머리글자)에 쓰는 글꼴 파일 — 고를 때만 내려받는다(한 벌 80~420KB). 모던은 화면 글꼴 그대로 */
const FACE: Record<Exclude<CardFont, 'modern'>, { family: string; files: [number | string, string][]; weight: number; scale: number }> = {
  classic: { family: 'acs-card-serif', files: [['100 599', '/fonts/card/gowun-batang-400.woff2'], ['600 900', '/fonts/card/gowun-batang-700.woff2']], weight: 700, scale: 0.98 },
  bold: { family: 'acs-ui-black-han-sans', files: [['100 900', '/fonts/ui/black-han-sans/400.woff2']], weight: 400, scale: 1.04 },
  hand: { family: 'acs-ui-nanum-pen', files: [['100 900', '/fonts/ui/nanum-pen/400.woff2']], weight: 400, scale: 1.34 },
  round: { family: 'acs-ui-bm-jua', files: [['100 900', '/fonts/ui/bm-jua/400.woff2']], weight: 400, scale: 1.04 },
}
const loading = new Map<string, Promise<void>>()
function loadFace(key: Exclude<CardFont, 'modern'>): Promise<void> {
  const face = FACE[key]
  let job = loading.get(key)
  if (!job) {
    job = Promise.all(face.files.map(async ([weight, url]) => {
      const font = new FontFace(face.family, `url(${url}) format('woff2')`, { weight: String(weight) })
      document.fonts.add(await font.load())
    })).then(() => undefined, () => { loading.delete(key) /* 못 받으면 화면 글꼴로 그린다 — 다음에 다시 시도 */ })
    loading.set(key, job)
  }
  return job
}
/** 이 명함을 그리는 데 필요한 글꼴을 받아 둔다 — 끝나면 다시 그린다 */
export function loadCardFonts(spec: Pick<CardSpec, 'font' | 'layout'>): Promise<unknown> {
  const jobs: Promise<void>[] = []
  if (spec.font !== 'modern') jobs.push(loadFace(spec.font))
  // 큰 글자 레이아웃의 머리글자는 그림이 잘 보이게 늘 굵은 글꼴로
  if (spec.layout === 'type') jobs.push(loadFace('bold'))
  return Promise.all(jobs)
}

// ───────────────────────── 그리기 도구 ─────────────────────────

/** 폭을 넘으면 글자 크기를 줄여 한 줄에 넣는다 */
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, maxWidth: number, min = 0.5) {
  let px = size
  ctx.font = `${weight} ${px}px ${family}`
  while (ctx.measureText(text).width > maxWidth && px > size * min) {
    px -= Math.max(1, size * 0.04)
    ctx.font = `${weight} ${px}px ${family}`
  }
  return px
}

/** 자간을 넓힌 줄 — letterSpacing 을 모르는 브라우저에서도 같은 모양이 되게 한 글자씩 놓는다. 그린 폭을 돌려준다 */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, space: number, align: CanvasTextAlign) {
  const chars = [...text]
  const widths = chars.map((ch) => ctx.measureText(ch).width + space)
  const total = widths.reduce((a, b) => a + b, 0) - space
  let at = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  const prev = ctx.textAlign
  ctx.textAlign = 'left'
  chars.forEach((ch, i) => { ctx.fillText(ch, at, y); at += widths[i] })
  ctx.textAlign = prev
  return total
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  const [tl, tr, br, bl] = typeof r === 'number' ? [r, r, r, r] : r
  ctx.beginPath()
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.arcTo(x + w, y, x + w, y + tr, tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
  ctx.lineTo(x + bl, y + h)
  ctx.arcTo(x, y + h, x, y + h - bl, bl)
  ctx.lineTo(x, y + tl)
  ctx.arcTo(x, y, x + tl, y, tl)
  ctx.closePath()
}

/** 영문·숫자뿐인 글인가 — 작은 줄은 대문자에 자간을 넓혀 쓴다(실제 명함의 작은 글자 처리) */
const isLatin = (text: string) => /^[\x20-\x7E]+$/.test(text)
/** 머리글자 — 이름의 첫 글자 */
const initialOf = (name: string) => ([...name.trim()][0] ?? '').toUpperCase()

/** 그림 없이 만들 때 그림 자리에 까는 색 도형(바우하우스풍) — 자리의 크기에 맞춰 늘 같은 모양 */
function paintShapes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, basic: (typeof BASIC)[CardColor]) {
  const m = Math.min(w, h)
  ctx.fillStyle = css(basic.fill)
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = css(basic.shapes[0])
  ctx.beginPath(); ctx.arc(x + w * 0.78, y + h * 0.86, m * 0.62, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + w * 0.12, y + h * 0.1, m * 0.3, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = css(basic.shapes[1])
  ctx.lineWidth = Math.max(1.5, m * 0.014)
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + w * 0.78, y + h * 0.86, m * (0.2 + i * 0.1), 0, Math.PI * 2); ctx.stroke() }
  ctx.fillStyle = css(basic.shapes[1])
  ctx.beginPath(); ctx.arc(x + w * 0.3, y + h * 0.34, m * 0.07, 0, Math.PI * 2); ctx.fill()
}

/**
 * 명함 한 면. sansFamily = 화면이 쓰는 고딕 글꼴(kxFontFamily). art 가 있으면 AI 그림으로, 없으면 고른 색의 도형으로 그린다.
 * 이름·직업·연락처·소개가 비면 그 줄은 그리지 않는다. 글꼴은 loadCardFonts 로 먼저 받아 둔다(없으면 화면 글꼴로 그려진다).
 */
export function drawCard(ctx: CanvasRenderingContext2D, W: number, H: number, spec: CardSpec, side: CardSide, sansFamily: string, art: CardArt | null = null) {
  const u = W / 900 // 900×500 기준 단위
  const basic = BASIC[spec.color]
  const theme = art ? artTheme(art, spec.paper) : basic.theme
  const face = spec.font === 'modern' ? null : FACE[spec.font]
  const display = face ? `'${face.family}', ${spec.font === 'classic' ? SERIF_FALLBACK + ', ' : ''}${sansFamily}` : sansFamily
  // 직업·소개는 명조일 때만 같은 글꼴로, 그 밖에는 읽기 쉬운 고딕으로
  const textFamily = spec.font === 'classic' ? display : sansFamily
  const nameWeight = face ? face.weight : 800
  const nameScale = face ? face.scale : 1
  const name = spec.name.trim(), role = spec.role.trim(), contact = spec.contact.trim(), tagline = spec.tagline.trim()
  const paper = css(theme.paper), ink = css(theme.ink), accent = css(theme.accent)
  const soft = css(theme.ink, 0.72), faint = css(theme.ink, 0.56)
  const flip = spec.flip
  const front = side === 'front'
  const portrait = Boolean(art?.portrait)

  /** 그림을 이 자리에 꽉 차게(가운데를 남기고 자른다) */
  const paintArt = (x: number, y: number, w: number, h: number) => {
    if (!art) {
      // 도형은 자리 밖으로 삐져나가게 그린다 — 자리만큼만 보이게 자른다
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, w, h)
      ctx.clip()
      paintShapes(ctx, x, y, w, h, basic)
      ctx.restore()
      return
    }
    const image = art.image
    const scale = Math.max(w / image.width, h / image.height)
    const sw = w / scale, sh = h / scale
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h)
  }
  /** 그림 면의 안쪽 가장자리를 종이색으로 풀어 준다(종이가 그림 바탕과 같을 때) */
  const fade = (x0: number, y0: number, x1: number, y1: number, x: number, y: number, w: number, h: number) => {
    if (!theme.merge) return
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, css(theme.paper, 1))
    g.addColorStop(1, css(theme.paper, 0))
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
  }
  const text = (value: string, x: number, y: number, size: number, weight: number, family: string, color: string, maxWidth: number, align: CanvasTextAlign) => {
    if (!value) return 0
    ctx.textAlign = align
    ctx.fillStyle = color
    const px = fitText(ctx, value, weight, size, family, maxWidth)
    ctx.fillText(value, x, y)
    return px
  }
  const nameAt = (x: number, y: number, size: number, maxWidth: number, align: CanvasTextAlign, color = ink) => text(name, x, y, size * nameScale, nameWeight, display, color, maxWidth, align)
  /** 직업 줄 — 영문이면 작은 대문자에 넓은 자간 */
  const roleAt = (x: number, y: number, size: number, maxWidth: number, align: CanvasTextAlign, color = accent) => {
    if (!role) return
    ctx.fillStyle = color
    ctx.textAlign = align
    if (isLatin(role)) {
      const upper = role.toUpperCase()
      let px = size * 0.8
      ctx.font = `700 ${px}px ${sansFamily}`
      while ([...upper].reduce((sum, ch) => sum + ctx.measureText(ch).width + px * 0.16, 0) > maxWidth && px > size * 0.45) { px -= 1; ctx.font = `700 ${px}px ${sansFamily}` }
      spaced(ctx, upper, x, y, px * 0.16, align)
    } else {
      fitText(ctx, role, 600, size, textFamily, maxWidth)
      ctx.fillText(role, x, y)
    }
  }
  const small = (value: string, x: number, y: number, size: number, maxWidth: number, align: CanvasTextAlign, color: string, weight = 500, family = sansFamily) => text(value, x, y, size, weight, family, color, maxWidth, align)
  const rule = (x: number, y: number, w: number, align: CanvasTextAlign, color = accent, h = 4 * u) => {
    ctx.fillStyle = color
    ctx.fillRect(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x, y, w, h)
  }
  /** 머리글자 도장 — 둥근 면에 이름의 첫 글자 */
  const seal = (cx: number, cy: number, r: number, bg: string, fg: string) => {
    ctx.fillStyle = bg
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    const ch = initialOf(name)
    if (!ch) return
    ctx.fillStyle = fg
    ctx.textAlign = 'center'
    const px = fitText(ctx, ch, nameWeight, r * 1.08 * nameScale, display, r * 1.5)
    const box = ctx.measureText(ch)
    // 글자의 실제 높이로 가운데를 맞춘다(한글·영문·손글씨가 제각각이라)
    ctx.fillText(ch, cx, cy + ((box.actualBoundingBoxAscent || px * 0.72) - (box.actualBoundingBoxDescent || 0)) / 2)
  }
  /** 그림 위에 올리는 이름표 — 종이색 네모(종이가 그림 바탕과 같으면 먹색으로 뒤집는다) */
  const label = (cx: number, cy: number, big: boolean) => {
    const bg = theme.same ? theme.ink : theme.paper, fg = theme.same ? theme.paper : theme.ink
    const tone = theme.same ? css(theme.paper, 0.72) : accent
    const w = (big ? 400 : 330) * u, h = (role ? (big ? 150 : 128) : big ? 110 : 92) * u
    ctx.fillStyle = css(bg)
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10 * u)
    ctx.fill()
    const size = (big ? 40 : 34)
    nameAt(cx, cy + (role ? -8 : 13) * u, size * u, w - 56 * u, 'center', css(fg))
    roleAt(cx, cy + (big ? 36 : 31) * u, (big ? 21 : 19) * u, w - 56 * u, 'center', tone)
  }

  /** 얼굴이 가운데 있는 그림의 뒷면 — 이름표를 얼굴을 피해 아래 구석에 둔다 */
  const cornerLabel = () => label(flip ? W - 209 * u : 209 * u, H - 44 * u - (role ? 64 : 46) * u, false)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, W, H)
  ctx.clip()
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)

  if (spec.layout === 'split') {
    if (front) {
      // 세로 그림 면 + 정보 — 가장 흔한 명함 구성
      const pw = 356 * u, ax = flip ? W - pw : 0
      paintArt(ax, 0, pw, H)
      if (flip) fade(ax, 0, ax + 90 * u, 0, ax, 0, 90 * u, H)
      else fade(pw, 0, pw - 90 * u, 0, pw - 90 * u, 0, 90 * u, H)
      const x = flip ? 64 * u : pw + 58 * u, width = W - pw - 122 * u
      rule(x, 122 * u, 44 * u, 'left')
      const size = nameAt(x, 218 * u, 66 * u, width, 'left') || 66 * u
      roleAt(x, 218 * u + 22 * u + size * 0.36, 25 * u, width, 'left')
      small(tagline, x, 318 * u, 20 * u, width, 'left', faint)
      small(contact, x, H - 62 * u, 22 * u, width, 'left', soft, 600)
    } else {
      paintArt(0, 0, W, H)
      if (portrait) cornerLabel()
      else {
        const r = 92 * u
        // 그림이 종이와 같은 바탕이면 종이색 도장이 묻힌다 — 먹색으로 뒤집는다
        seal(W / 2, H / 2, r, theme.same ? ink : paper, theme.same ? paper : ink)
        ctx.strokeStyle = theme.same ? ink : paper
        ctx.lineWidth = 2.5 * u
        ctx.beginPath(); ctx.arc(W / 2, H / 2, r + 12 * u, 0, Math.PI * 2); ctx.stroke()
      }
    }
  } else if (spec.layout === 'band') {
    if (front) {
      // 가로 그림 띠 + 아래(위) 정보 — 이름은 왼쪽, 연락처는 오른쪽 아래
      const bh = 214 * u, by = flip ? H - bh : 0, y0 = flip ? 0 : bh
      paintArt(0, by, W, bh)
      if (flip) fade(0, by, 0, by + 70 * u, 0, by, W, 70 * u)
      else fade(0, bh, 0, bh - 70 * u, 0, bh - 70 * u, W, 70 * u)
      const x = 62 * u
      const size = nameAt(x, y0 + 116 * u, 60 * u, W - x * 2, 'left') || 60 * u
      roleAt(x, y0 + 116 * u + 20 * u + size * 0.34, 23 * u, W - x * 2, 'left')
      ctx.fillStyle = css(theme.ink, 0.14)
      ctx.fillRect(x, y0 + 196 * u, W - x * 2, 1.5 * u)
      const half = contact && tagline ? W / 2 - x - 14 * u : W - x * 2
      small(tagline, x, y0 + 240 * u, 19 * u, half, 'left', faint)
      small(contact, tagline ? W - x : x, y0 + 240 * u, 21 * u, half, tagline ? 'right' : 'left', soft, 600)
    } else {
      // 뒷면은 종이에 가운데 정렬 — 도장, 이름, 가는 그림 띠
      seal(W / 2, 148 * u, 52 * u, accent, paper)
      nameAt(W / 2, 276 * u, 42 * u, W - 240 * u, 'center')
      roleAt(W / 2, 316 * u, 21 * u, W - 240 * u, 'center')
      small(tagline, W / 2, 362 * u, 19 * u, W - 200 * u, 'center', faint)
      paintArt(0, flip ? 0 : H - 40 * u, W, 40 * u)
    }
  } else if (spec.layout === 'frame') {
    if (front) {
      // 아치 액자 속 그림 — 얼굴을 넣었을 때 가장 잘 어울린다(수집 카드처럼)
      const ww = 252 * u, wh = 376 * u, wx = flip ? W - 70 * u - ww : 70 * u, wy = 62 * u
      ctx.save()
      roundRect(ctx, wx, wy, ww, wh, [ww / 2, ww / 2, 12 * u, 12 * u])
      ctx.clip()
      paintArt(wx, wy, ww, wh)
      ctx.restore()
      ctx.strokeStyle = css(theme.ink, theme.dark ? 0.3 : 0.16)
      ctx.lineWidth = 2 * u
      roundRect(ctx, wx, wy, ww, wh, [ww / 2, ww / 2, 12 * u, 12 * u])
      ctx.stroke()
      const x = flip ? 70 * u : wx + ww + 56 * u, width = W - ww - 196 * u
      rule(x, 150 * u, 44 * u, 'left')
      const size = nameAt(x, 240 * u, 62 * u, width, 'left') || 62 * u
      roleAt(x, 240 * u + 22 * u + size * 0.34, 24 * u, width, 'left')
      small(tagline, x, 334 * u, 19 * u, width, 'left', faint)
      small(contact, x, H - 66 * u, 21 * u, width, 'left', soft, 600)
    } else {
      paintArt(0, 0, W, H)
      if (portrait) cornerLabel()
      else label(W / 2, H / 2, true)
    }
  } else if (spec.layout === 'full') {
    if (front) {
      // 그림을 가득 깔고, 글자는 종이색 이름표 안에만
      paintArt(0, 0, W, H)
      const bg = theme.same ? theme.ink : theme.paper, fg = theme.same ? theme.paper : theme.ink
      const pad = 30 * u
      const nameSize = 50 * u * nameScale
      ctx.font = `${nameWeight} ${nameSize}px ${display}`
      const nameWidth = name ? ctx.measureText(name).width : 0
      ctx.font = `600 22px ${sansFamily}`
      const lines = [contact ? 34 * u : 0, role ? 36 * u : 0]
      const bw = Math.max(250 * u, Math.min(560 * u, Math.max(nameWidth, 200 * u) + pad * 2 + 14 * u))
      const bh = pad * 2 + 46 * u + lines[0] + lines[1]
      // 그림이 왼쪽에서 보이게 이름표는 오른쪽 아래(그림 위치를 바꾸면 왼쪽 아래)
      const bx = flip ? 44 * u : W - 44 * u - bw, byy = H - 44 * u - bh
      ctx.fillStyle = css(bg)
      roundRect(ctx, bx, byy, bw, bh, 12 * u)
      ctx.fill()
      ctx.fillStyle = theme.same ? css(theme.paper, 0.8) : accent
      ctx.fillRect(bx, byy + 22 * u, 6 * u, 42 * u)
      const x = bx + pad + 6 * u, width = bw - pad * 2 - 6 * u
      nameAt(x, byy + pad + 40 * u, 50 * u, width, 'left', css(fg))
      roleAt(x, byy + pad + 40 * u + 34 * u, 21 * u, width, 'left', theme.same ? css(theme.paper, 0.72) : accent)
      small(contact, x, byy + bh - pad + 2 * u, 19 * u, width, 'left', css(fg, 0.78), 600)
    } else {
      // 뒷면은 종이 — 가장자리에 그림 띠 하나
      const sw = 48 * u
      paintArt(flip ? W - sw : 0, 0, sw, H)
      const cx = flip ? (W - sw) / 2 : sw + (W - sw) / 2, width = W - sw - 180 * u
      const size = nameAt(cx, 218 * u, 54 * u, width, 'center') || 54 * u
      rule(cx, 218 * u + 22 * u, 40 * u, 'center')
      roleAt(cx, 218 * u + 62 * u + size * 0.1, 22 * u, width, 'center')
      small(tagline, cx, 338 * u, 19 * u, width, 'center', faint)
      small(contact, cx, H - 62 * u, 21 * u, width, 'center', soft, 600)
    }
  } else {
    // 큰 글자 — 머리글자가 그래픽이 된다(글자 속에 그림). 뒷면은 반대로 그림 위에 종이색 글자
    const ch = initialOf(name) || 'A'
    const heavy = `'${FACE.bold.family}', ${sansFamily}`
    const cx = (flip ? 0.71 : 0.29) * W
    const letter = (target: CanvasRenderingContext2D, color: string, outline = 0) => {
      target.textAlign = 'center'
      target.textBaseline = 'alphabetic'
      let px = 600 * u
      target.font = `400 ${px}px ${heavy}`
      // 넓은 글자(M·W·한글)는 면의 절반을 넘지 않게
      const wide = target.measureText(ch).width
      if (wide > W * 0.54) { px *= (W * 0.54) / wide; target.font = `400 ${px}px ${heavy}` }
      const box = target.measureText(ch)
      const up = box.actualBoundingBoxAscent || px * 0.74, down = box.actualBoundingBoxDescent || 0
      const y = H / 2 + (up - down) / 2
      if (outline) {
        target.strokeStyle = color
        target.lineWidth = outline
        target.lineJoin = 'round'
        target.strokeText(ch, cx, y)
      } else {
        target.fillStyle = color
        target.fillText(ch, cx, y)
      }
    }
    if (front) {
      const layer = document.createElement('canvas')
      layer.width = W
      layer.height = H
      const lc = layer.getContext('2d')!
      letter(lc, '#000')
      lc.globalCompositeOperation = 'source-in'
      // 그림이 거의 종이색뿐이면 글자가 묻힌다 — 색은 두고 밝기만 뒤집어 채운다(크림 바탕의 먹선 → 짙은 바탕의 밝은 선)
      const inverted = theme.merge && 'filter' in lc
      if (inverted) lc.filter = 'invert(1) hue-rotate(180deg)'
      if (art) {
        const scale = Math.max(W / art.image.width, H / art.image.height)
        const sw = W / scale, sh = H / scale
        lc.drawImage(art.image, (art.image.width - sw) / 2, (art.image.height - sh) / 2, sw, sh, 0, 0, W, H)
      } else {
        // 도형은 여러 번에 나눠 그린다 — 글자 모양으로 한 번에 오려지게 따로 그려서 얹는다
        const shapes = document.createElement('canvas')
        shapes.width = W
        shapes.height = H
        paintShapes(shapes.getContext('2d')!, 0, 0, W, H, basic)
        lc.drawImage(shapes, 0, 0)
      }
      lc.filter = 'none'
      ctx.drawImage(layer, 0, 0)
      // 뒤집지 못했거나 그림에 종이와 비슷한 색이 섞여 있어도 글자 모양이 읽히게 가는 테두리
      if (!inverted) letter(ctx, css(theme.ink, 0.92), (theme.same ? 3.5 : 2.5) * u)
      const align: CanvasTextAlign = flip ? 'left' : 'right'
      const x = flip ? 64 * u : W - 64 * u, width = W * 0.4
      rule(x, 96 * u, 44 * u, align)
      const size = nameAt(x, 192 * u, 56 * u, width, align) || 56 * u
      roleAt(x, 192 * u + 20 * u + size * 0.34, 23 * u, width, align)
      small(tagline, x, 290 * u, 19 * u, width, align, faint)
      small(contact, x, H - 62 * u, 21 * u, width, align, soft, 600)
    } else {
      paintArt(0, 0, W, H)
      if (!portrait) letter(ctx, theme.same ? ink : paper)
      // 이름은 반대쪽 아래 작은 이름표로
      const tag = name || role
      if (tag) {
        ctx.font = `700 ${22 * u}px ${sansFamily}`
        const tw = Math.min(W * 0.36, ctx.measureText(tag).width) + 44 * u
        const tx = flip ? 48 * u : W - 48 * u - tw
        ctx.fillStyle = theme.same ? ink : paper
        roundRect(ctx, tx, H - 48 * u - 50 * u, tw, 50 * u, 25 * u)
        ctx.fill()
        small(tag, tx + tw / 2, H - 48 * u - 17 * u, 22 * u, tw - 40 * u, 'center', theme.same ? paper : ink, 700)
      }
    }
  }
  ctx.restore()
}

/**
 * JPEG 여러 장을 한 쪽에 한 장씩 담은 PDF — 쪽 크기는 mm 로 준다(명함 90×50).
 * 글꼴을 넣지 않고 그림만 담는 가장 작은 PDF 라 따로 도구가 필요 없다.
 */
export function imagesToPdf(pages: { jpeg: Uint8Array; width: number; height: number }[], widthMm: number, heightMm: number): Blob {
  const pt = (mm: number) => +(mm * 72 / 25.4).toFixed(2)
  const W = pt(widthMm), H = pt(heightMm)
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (data: string | Uint8Array) => { const bytes = typeof data === 'string' ? encoder.encode(data) : data; chunks.push(bytes); length += bytes.length }
  const object = (id: number, body: string, stream?: Uint8Array) => {
    offsets[id] = length
    push(`${id} 0 obj\n${body}\n`)
    if (stream) { push('stream\n'); push(stream); push('\nendstream\n') }
    push('endobj\n')
  }
  push('%PDF-1.4\n%\xff\xff\xff\xff\n')
  // 1 = 문서, 2 = 쪽 목록, 그 뒤로 쪽마다 [쪽 · 내용 · 그림]
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`)
  pages.forEach((page, i) => {
    const id = 3 + i * 3
    const content = encoder.encode(`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`)
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`)
    object(id + 1, `<< /Length ${content.length} >>`, content)
    object(id + 2, `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>`, page.jpeg)
  })
  const count = 3 + pages.length * 3
  const xref = length
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  for (let id = 1; id < count; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' })
}
