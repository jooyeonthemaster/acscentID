// 명함 디자이너 — 명함 한 면을 캔버스에 그린다. 화면의 미리보기와 받는 파일(PNG·PDF)이 같은 함수로 그려져 늘 똑같다.
// 명함은 90×50mm(가로 9 : 세로 5). 그림 크기는 받는 쪽에서 정한다(미리보기는 작게, 파일은 1800×1000).

export type CardTemplate = 'minimal' | 'editorial' | 'block'
export type CardFont = 'sans' | 'serif'
export type CardColor = 'blue' | 'ivory' | 'black' | 'lime'
export type CardAlign = 'left' | 'center' | 'right'
export type CardSide = 'front' | 'back'

export const CARD_TEMPLATES: CardTemplate[] = ['minimal', 'editorial', 'block']
export const CARD_COLORS: CardColor[] = ['blue', 'ivory', 'black', 'lime']
export const CARD_ALIGNS: CardAlign[] = ['left', 'center', 'right']
export const CARD_RATIO = 9 / 5

/** AI 바탕 위 글자의 색 — auto 는 바탕의 밝기를 보고 정한다 */
export type CardTone = 'auto' | 'light' | 'dark'
export const CARD_TONES: CardTone[] = ['auto', 'light', 'dark']

export interface CardSpec {
  template: CardTemplate
  font: CardFont
  color: CardColor
  align: CardAlign
  name: string
  role: string
  contact: string
  /** AI 가 그린 바탕 위에 올릴 때 — 글자를 둘 쪽과 글자 색. 있으면 템플릿·색·정렬 대신 이것으로 그린다(drawCard 에 art 를 함께 넘긴다) */
  ai?: { side: 'left' | 'right'; tone: CardTone }
}

/** AI 가 그린 바탕 — luma 는 글자가 놓일 쪽(그림의 왼쪽 절반)의 밝기(0~1) */
export interface CardArt {
  image: CanvasImageSource & { width: number; height: number }
  luma: number
}

/** 바탕 그림에서 글자 자리의 밝기를 잰다 */
export function measureArt(image: CardArt['image']): CardArt {
  const canvas = document.createElement('canvas')
  canvas.width = 90
  canvas.height = 50
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const scale = Math.max(90 / image.width, 50 / image.height)
  ctx.drawImage(image, (image.width - 90 / scale) * ART_FOCUS, (image.height - 50 / scale) / 2, 90 / scale, 50 / scale, 0, 0, 90, 50)
  const px = ctx.getImageData(0, 0, 48, 50).data
  let sum = 0
  for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
  return { image, luma: sum / (px.length / 4) / 255 }
}

/** 9:5 보다 넓은 그림은 볼거리가 있는 오른쪽을 남기고 자른다(0 = 왼쪽 끝, 1 = 오른쪽 끝) */
const ART_FOCUS = 0.85

export const CARD_SWATCH: Record<CardColor, string> = { blue: '#0b3ff0', ivory: '#f6f2e6', black: '#15161a', lime: '#c8f02e' }
const PAPER = '#f8f5ea'
const INK = '#15161a'

/** 고른 색 → 짙은 면의 바탕·글자, 포인트 색, 밝은 종이 위의 강조 글자색 */
function palette(color: CardColor) {
  const main = CARD_SWATCH[color]
  const dark = color === 'blue' || color === 'black'
  return {
    main,
    onMain: dark ? '#f8f5ea' : INK,
    accent: color === 'blue' || color === 'black' ? CARD_SWATCH.lime : CARD_SWATCH.blue,
    /** 밝은 종이 위 이름 색 — 밝은 색(아이보리·라임)을 고르면 검정으로 */
    onPaper: dark ? main : INK,
  }
}

const SERIF = `Georgia, 'Noto Serif KR', 'Nanum Myeongjo', 'AppleMyungjo', 'Batang', serif`

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

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, gap: number, align: CardAlign) {
  // 자간을 넓힌 작은 영문 줄 — letterSpacing 을 모르는 브라우저에서도 같은 모양이 되게 한 글자씩 놓는다
  const widths = [...text].map((ch) => ctx.measureText(ch).width + gap)
  const total = widths.reduce((a, b) => a + b, 0) - gap
  let at = align === 'left' ? x : align === 'center' ? x - total / 2 : x - total
  const prev = ctx.textAlign
  ctx.textAlign = 'left'
  ;[...text].forEach((ch, i) => { ctx.fillText(ch, at, y); at += widths[i] })
  ctx.textAlign = prev
}

/**
 * AI 가 그린 바탕 위의 명함 — 앞면은 바탕을 그대로 깔고 글자 쪽에 옅은 막을 쳐 이름·직업·연락처를 올린다.
 * 뒷면은 같은 바탕을 흐리게 깔고 가운데에 다시 적는다(한 장만 그려 앞뒤가 한 벌이 되게).
 */
function drawAiCard(ctx: CanvasRenderingContext2D, W: number, H: number, spec: CardSpec, side: CardSide, sansFamily: string, art: CardArt) {
  const u = W / 900
  const family = spec.font === 'serif' ? SERIF : sansFamily
  const pad = 60 * u
  const flip = spec.ai!.side === 'right'
  const image = art.image
  const scale = Math.max(W / image.width, H / image.height)
  const sw = W / scale, sh = H / scale
  const over = side === 'back' ? 40 * u : 0
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, W, H)
  ctx.clip()
  ctx.save()
  // 글자를 오른쪽에 두면 그림을 뒤집는다 — 차분한 자리가 늘 글자 밑에 온다
  if (flip) { ctx.translate(W, 0); ctx.scale(-1, 1) }
  if (side === 'back') ctx.filter = `blur(${16 * u}px) saturate(1.15)`
  ctx.drawImage(image, (image.width - sw) * ART_FOCUS, (image.height - sh) / 2, sw, sh, -over, -over, W + over * 2, H + over * 2)
  ctx.restore()

  // 글자 색 — 어두운 바탕에는 흰 글자, 밝은 바탕에는 먹색
  const white = spec.ai!.tone === 'auto' ? art.luma < 0.58 : spec.ai!.tone === 'light'
  const ink = white ? '#ffffff' : '#15161a'
  const veil = white ? '12,14,22' : '255,255,255'
  const name = spec.name.trim(), role = spec.role.trim(), contact = spec.contact.trim()
  ctx.textBaseline = 'alphabetic'
  if (side === 'front') {
    const fade = ctx.createLinearGradient(flip ? W : 0, 0, flip ? W * 0.3 : W * 0.7, 0)
    fade.addColorStop(0, `rgba(${veil},0.56)`)
    fade.addColorStop(0.55, `rgba(${veil},0.3)`)
    fade.addColorStop(1, `rgba(${veil},0)`)
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, W, H)
    const x = flip ? W - pad : pad
    const maxWidth = W * 0.52
    ctx.textAlign = flip ? 'right' : 'left'
    ctx.fillStyle = ink
    ctx.fillRect(flip ? x - 46 * u : x, 132 * u, 46 * u, 5 * u)
    const size = name ? fitText(ctx, name, 800, 80 * u, family, maxWidth) : 80 * u
    if (name) ctx.fillText(name, x, 160 * u + size * 0.86)
    if (role) { fitText(ctx, role, 600, 32 * u, family, maxWidth); ctx.fillText(role, x, 160 * u + size * 0.86 + 54 * u) }
    if (contact) { fitText(ctx, contact, 600, 26 * u, sansFamily, maxWidth); ctx.fillText(contact, x, H - pad - 2 * u) }
  } else {
    ctx.fillStyle = `rgba(${veil},0.42)`
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = ink
    const size = name ? fitText(ctx, name, 800, 68 * u, family, W - pad * 3) : 68 * u
    if (name) ctx.fillText(name, W / 2, H / 2 - 22 * u + size * 0.3)
    ctx.fillRect(W / 2 - 23 * u, H / 2 + 26 * u, 46 * u, 4 * u)
    if (role) { fitText(ctx, role, 600, 30 * u, family, W - pad * 3); ctx.fillText(role, W / 2, H / 2 + 78 * u) }
    if (contact) { fitText(ctx, contact, 600, 24 * u, sansFamily, W - pad * 3); ctx.fillText(contact, W / 2, H - pad + 2 * u) }
  }
  ctx.restore()
}

/**
 * 명함 한 면. sansFamily = 화면이 쓰는 고딕 글꼴(kxFontFamily). art 는 AI 바탕(spec.ai 와 함께일 때만 쓴다).
 * 이름·직업·연락처가 비면 그 줄은 그리지 않는다.
 */
export function drawCard(ctx: CanvasRenderingContext2D, W: number, H: number, spec: CardSpec, side: CardSide, sansFamily: string, art: CardArt | null = null) {
  if (spec.ai && art) { drawAiCard(ctx, W, H, spec, side, sansFamily, art); return }
  const u = W / 900 // 900×500 기준 단위
  const p = palette(spec.color)
  const family = spec.font === 'serif' ? SERIF : sansFamily
  const pad = 62 * u
  const x = spec.align === 'left' ? pad : spec.align === 'center' ? W / 2 : W - pad
  const taglineFront = ['IDEAS', 'FOR A BRIGHTER', 'TOMORROW']
  const taglineBack = ['GOOD', 'IDEAS', 'GOOD', 'PEOPLE']
  ctx.save()
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = spec.align

  const tagline = (lines: string[], color: string, tx: number, ty: number, align: CardAlign) => {
    ctx.fillStyle = color
    ctx.font = `700 ${13.5 * u}px ${sansFamily}`
    lines.forEach((line, i) => spaced(ctx, line, tx, ty + i * 21 * u, 3.4 * u, align))
  }
  const nameBlock = (nameColor: string, textColor: string, top: number, maxWidth: number) => {
    const name = spec.name.trim()
    const size = name ? fitText(ctx, name, 800, 82 * u, family, maxWidth) : 82 * u
    ctx.fillStyle = nameColor
    if (name) ctx.fillText(name, x, top + size * 0.86)
    const role = spec.role.trim()
    if (role) {
      ctx.fillStyle = textColor
      fitText(ctx, role, 600, 33 * u, family, maxWidth)
      ctx.fillText(role, x, top + size * 0.86 + 58 * u)
    }
  }
  const contactLine = (color: string, y: number, maxWidth: number) => {
    const contact = spec.contact.trim()
    if (!contact) return
    ctx.fillStyle = color
    fitText(ctx, contact, 600, 27 * u, sansFamily, maxWidth)
    ctx.fillText(contact, x, y)
  }
  /** 정렬 반대쪽 위 모서리의 작은 네모 */
  const square = (color: string) => {
    const s = 44 * u
    ctx.fillStyle = color
    ctx.fillRect(spec.align === 'right' ? pad : W - pad - s, pad - 6 * u, s, s)
  }
  const opposite: CardAlign = spec.align === 'right' ? 'left' : 'right'
  const oppositeX = spec.align === 'right' ? pad : W - pad

  if (spec.template === 'editorial') {
    if (side === 'front') {
      ctx.fillStyle = p.main
      ctx.fillRect(0, 0, W, H)
      square(p.accent)
      nameBlock(p.onMain, p.onMain, 96 * u, W - pad * 2 - 80 * u)
      tagline(taglineFront, p.onMain, x, H - pad - 44 * u, spec.align)
    } else {
      ctx.fillStyle = PAPER
      ctx.fillRect(0, 0, W, H)
      nameBlock(p.onPaper, INK, 84 * u, W - pad * 2 - 150 * u)
      contactLine(p.onPaper, H - pad - 4 * u, W - pad * 2 - 170 * u)
      if (spec.align !== 'center') {
        tagline(taglineBack, p.onPaper, oppositeX, H - pad - 84 * u, opposite)
        ctx.fillStyle = p.onPaper
        ctx.fillRect(spec.align === 'right' ? pad : W - pad - 34 * u, H - pad + 6 * u, 34 * u, 2 * u)
      }
    }
  } else if (spec.template === 'minimal') {
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, W, H)
    if (side === 'front') {
      square(spec.color === 'ivory' ? CARD_SWATCH.blue : p.main)
      nameBlock(INK, INK, 78 * u, W - pad * 2 - 80 * u)
      tagline(taglineFront, INK, x, H - pad - 44 * u, spec.align)
      if (spec.align !== 'center') {
        ctx.fillStyle = INK
        ctx.fillRect(spec.align === 'right' ? pad : W - pad - 150 * u, H - pad, 150 * u, 2 * u)
      }
    } else {
      // 뒷면은 연락처를 크게 — 가운데 가는 줄 하나
      ctx.fillStyle = spec.color === 'ivory' ? CARD_SWATCH.blue : p.main
      ctx.fillRect(pad, H / 2 - 1 * u, W - pad * 2, 2 * u)
      ctx.fillStyle = INK
      const name = spec.name.trim()
      if (name) { fitText(ctx, name, 800, 44 * u, family, W - pad * 2); ctx.fillText(name, x, H / 2 - 34 * u) }
      contactLine(INK, H / 2 + 58 * u, W - pad * 2)
      tagline(['GOOD IDEAS · GOOD PEOPLE'], INK, x, H - pad, spec.align)
    }
  } else {
    // 컬러블록 — 정렬 반대쪽 3분의 1에 비스듬한 색 면
    const blockLeft = spec.align === 'right'
    const edge = W * 0.36
    const paint = (bg: string, block: string) => {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = block
      ctx.beginPath()
      if (blockLeft) { ctx.moveTo(0, 0); ctx.lineTo(edge, 0); ctx.lineTo(edge - 90 * u, H); ctx.lineTo(0, H) }
      else { ctx.moveTo(W - edge + 90 * u, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W - edge, H) }
      ctx.closePath()
      ctx.fill()
    }
    const textWidth = spec.align === 'center' ? W - pad * 2 : W - edge - pad - 30 * u
    if (side === 'front') {
      paint(PAPER, spec.color === 'ivory' ? CARD_SWATCH.blue : p.main)
      nameBlock(INK, INK, 96 * u, textWidth)
      contactLine(INK, H - pad - 4 * u, textWidth)
      if (spec.align !== 'center') tagline(taglineBack, spec.color === 'ivory' ? '#f8f5ea' : p.onMain, blockLeft ? pad * 0.7 : W - pad * 0.7, H - pad - 84 * u, blockLeft ? 'left' : 'right')
    } else {
      const main = spec.color === 'ivory' ? CARD_SWATCH.blue : p.main
      const onMain = spec.color === 'ivory' ? '#f8f5ea' : p.onMain
      paint(main, spec.color === 'ivory' ? CARD_SWATCH.lime : p.accent)
      nameBlock(onMain, onMain, 96 * u, textWidth)
      tagline(taglineFront, onMain, x, H - pad - 44 * u, spec.align)
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
