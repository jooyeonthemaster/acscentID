// SCENT! 영상판 영수증(2026-11-18 사용자 지시: SIP! 영상판 영수증처럼 — 맨 위에 찍은 사진으로 만든 도장, 맨 아래 조향사 하린의 사인).
// 기본 SCENT! 영수증(src/lib/kiosk/receipt-canvas.ts — 레시피 · 향 · 분석 · 주의사항 · 티켓, 직원이 보고 조향한다)은 그대로 두고 위아래만 덧붙인다:
//   위: 작은 SCENT! · HARIN'S PERFUME HOUSE · 날짜 → '향수 부티크에 선 나' 검정 고무도장(/api/kiosk/scent-stamp, 없으면 기본 도장) → 한 줄
//   가운데: 기본 영수증(사진 칸 없이 — 도장이 대신한다)
//   아래: 하린의 큰 사인 · Perfumer · 맺음 인사 · 사진 안내
// 감열지 한 장(폭 512점, 흰 바탕 · 검정만). 그림: public/assets/kiosk-programs/perfumer/video/receipt(원본 design-review/scent-art/receipt, R&D 키)
// 매장 · 영상판이 아닌 주소의 영수증은 바뀌지 않는다 — KioskClassic 이 영상판(design="perfumer" + &lab=video)일 때만 이 함수로 감싼다.

import type { KioskLang } from '@/lib/kiosk/i18n'

const ART = '/assets/kiosk-programs/perfumer/video/receipt'
const W = 512
const M = 30
const SERIF = "'PF Bodoni', 'Bodoni 72', 'Didot', 'Times New Roman', serif"

const COPY: Record<KioskLang, { caption: string; captionDefault: string; thanks: string; privacy: string; name: string }> = {
  ko: { caption: '향수 하우스에서, 오늘의 나', captionDefault: '향수 하우스에서, 오늘의 한 장면', thanks: '오늘 당신만의 향을 함께 만들었어요', privacy: '촬영 사진은 향 분석과 도장 그림에만 쓰고 저장하지 않아요', name: '하린' },
  en: { caption: 'Today, at the perfume house', captionDefault: 'A scene from the perfume house', thanks: 'We made your own scent together today', privacy: 'Your photo is used only for the analysis and this stamp, and is not stored', name: 'Harin' },
  ja: { caption: '香水の館で、今日のわたし', captionDefault: '香水の館の、今日のひとこま', thanks: '今日はあなただけの香りを一緒に作りました', privacy: '撮影した写真は香りの分析とスタンプ作りにだけ使い、保存しません', name: 'Harin' },
  'zh-Hans': { caption: '在香水之家，今天的我', captionDefault: '香水之家的一幕', thanks: '今天一起调制了只属于你的香气', privacy: '拍摄的照片仅用于香气分析和印章图，不会保存', name: 'Harin' },
  'zh-Hant': { caption: '在香水之家，今天的我', captionDefault: '香水之家的一幕', thanks: '今天一起調製了只屬於你的香氣', privacy: '拍攝的照片僅用於香氣分析和印章圖，不會保存', name: 'Harin' },
}

/** 하린 루트 엔딩의 손편지 한 줄 — 사인 바로 위에 찍는다(perfumer/date/HarinDate.tsx 가 엔딩에서 정하고, 새 손님이 오면 지운다) */
let letter: string | null = null
export function setScentLetter(value: string | null) { letter = value }

const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error('그림을 읽지 못했습니다')); i.src = src })

// 잉크 빠짐 — 덩어리(7%) · 잔 점(5%), 같은 그림은 같은 결(고정된 씨앗). experience/kx-stamp.ts inkStamp 와 같은 방식
const cell = (x: number, y: number) => { const n = Math.sin(Math.floor(x / 3) * 12.9898 + Math.floor(y / 3) * 78.233) * 43758.5453; return n - Math.floor(n) }
const fine = (x: number, y: number) => { const n = Math.sin(x * 91.17 + y * 47.31) * 23421.631; return n - Math.floor(n) }
const dropped = (x: number, y: number) => cell(x, y) < 0.07 || fine(x, y) < 0.05

/** 흑백 라인아트 → 고무도장(정사각 size) — 어두운 곳만 검정, 잉크가 군데군데 빠지게 */
function inkStamp(image: HTMLImageElement, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = size; c.height = size
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#fff'; g.fillRect(0, 0, size, size)
  const s = Math.min(size / image.naturalWidth, size / image.naturalHeight)
  const dw = image.naturalWidth * s, dh = image.naturalHeight * s
  g.drawImage(image, (size - dw) / 2, (size - dh) / 2, dw, dh)
  const px = g.getImageData(0, 0, size, size), d = px.data
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4
    const ink = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 150 && !dropped(x, y)
    d[i] = d[i + 1] = d[i + 2] = ink ? 0 : 255; d[i + 3] = 255
  }
  g.putImageData(px, 0, 0)
  return c
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []
  let line = ''
  // 띄어쓰기가 없는 글(일본어 · 중국어)은 글자 단위로
  const parts = /\s/.test(text) ? text.split(/(\s+)/) : [...text]
  for (const p of parts) {
    if (ctx.measureText(line + p).width <= max || !line) { line += p; continue }
    out.push(line.trim()); line = p.trimStart()
  }
  if (line.trim()) out.push(line.trim())
  return out
}

/**
 * 기본 영수증을 위아래로 감싼다. stamp: 도장 그림(data: 주소) — 없으면 기본 도장. when: '2026.11.18'
 * 돌려주는 모양은 renderKioskReceipt 와 같다(인쇄 · 미리보기가 그대로 쓴다)
 */
export async function wrapScentVideoReceipt(base: { dataUrl: string }, { stamp, lang, when }: { stamp: string | null; lang: KioskLang; when: string }): Promise<{ base64: string; dataUrl: string; width: number; height: number }> {
  const t = COPY[lang] ?? COPY.ko
  const family = typeof document !== 'undefined' ? getComputedStyle(document.querySelector('.pf-root') ?? document.body).fontFamily : 'sans-serif'
  try {
    await Promise.all([`800 46px ${SERIF}`, `800 20px ${family}`, `700 17px ${family}`, `500 13px ${family}`].map((f) => document.fonts.load(f, `SCENT!${t.caption}${t.thanks}`)))
  } catch { /* 기본 글꼴로 그린다 */ }
  const [body, stampImg, sign] = await Promise.all([
    loadImage(base.dataUrl),
    loadImage(stamp ?? `${ART}/stamp-default.png`).catch(() => loadImage(`${ART}/stamp-default.png`)).catch(() => null),
    loadImage(`${ART}/sign-harin.png`).catch(() => null),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = body.naturalHeight + 1400
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, canvas.height)
  ctx.fillStyle = '#000'; ctx.textBaseline = 'top'
  let y = 28
  const text = (value: string, size: number, weight: number | string, { gap = 8, font = family, spacing = 0, line = 1.38 }: { gap?: number; font?: string; spacing?: number; line?: number } = {}) => {
    ctx.font = `${weight} ${size}px ${font}`
    ctx.letterSpacing = `${spacing}px`
    ctx.textAlign = 'center'
    for (const l of wrap(ctx, value, W - M * 2)) { ctx.fillText(l, W / 2, y); y += Math.round(size * line) }
    ctx.letterSpacing = '0px'
    y += gap
  }
  const dots = (gap = 18) => { for (let x = M; x < W - M; x += 9) ctx.fillRect(x, y, 3, 3); y += 3 + gap }

  // 위 — 작은 SCENT! 와 오늘 날짜
  text('SCENT!', 46, 800, { font: SERIF, gap: 0, line: 1.05 })
  text(`HARIN'S PERFUME HOUSE  ·  ${when}`, 13, 700, { spacing: 2.4, gap: 16 })
  // 도장 — 손으로 찍은 듯 살짝 기울여
  if (stampImg) {
    const size = 420
    const st = inkStamp(stampImg, size)
    ctx.save()
    ctx.translate(W / 2, y + size / 2 + 6)
    ctx.rotate(-0.022)
    ctx.drawImage(st, -size / 2, -size / 2)
    ctx.restore()
    y += size + 14
    text(stamp ? t.caption : t.captionDefault, 17, 700, { gap: 10 })
  }
  dots(0)

  // 가운데 — 기본 영수증(레시피 · 향 · 분석 · 주의사항 · 티켓)
  ctx.drawImage(body, 0, y, W, Math.round(body.naturalHeight * W / body.naturalWidth))
  y += Math.round(body.naturalHeight * W / body.naturalWidth) + 6

  // 아래 — 하린의 사인(크게), 가는 선, Perfumer · 하린
  dots(14)
  if (letter) text(`“${letter}”`, 21, 700, { gap: 4, line: 1.5 })
  if (sign) {
    const sw = 420, sh = Math.round(sw * sign.naturalHeight / sign.naturalWidth)
    ctx.drawImage(sign, Math.round((W - sw) / 2), y, sw, sh)
    y += sh - 4
  }
  ctx.fillRect(W / 2 - 150, y, 300, 2); y += 12
  text(`Perfumer  ·  ${t.name}`, 19, 700, { gap: 4 })
  text(t.thanks, 15, 600, { gap: 14 })
  if (stamp) text(t.privacy, 13, 500, { gap: 4 })
  y += 40

  const out = document.createElement('canvas')
  out.width = W; out.height = y
  out.getContext('2d')!.drawImage(canvas, 0, 0)
  const dataUrl = out.toDataURL('image/png')
  return { base64: dataUrl.split(',')[1], dataUrl, width: W, height: y }
}

/** 도장 그림 요청 — 실패하면 null(기본 도장). 분석을 시작할 때 미리 불러 두고, 영수증을 만들 때 기다린다 */
export async function requestScentStamp(photo: string): Promise<string | null> {
  try {
    const res = await fetch('/api/kiosk/scent-stamp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo }), signal: AbortSignal.timeout(110_000) })
    const json = await res.json().catch(() => null)
    return res.ok && typeof json?.image === 'string' ? json.image : null
  } catch {
    return null
  }
}
