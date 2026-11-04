// K-POP 아이돌 컨셉 사진(K-WAVE 행사 모드) 인화 디자인 — 컨셉마다 대표 디자인 4종을 손님이 편집 화면에서 고른다
// (매장 프레임 목록 대신). 같은 그리기 함수로 편집 화면 미리보기 칸도 그려서 고른 그대로 인화된다.
//
// 네 가지 틀은 모든 컨셉이 같고(무대 한 장·포토카드·비포 애프터·포스터), 컨셉마다 색·장식·이름이 다르다
// — 엔딩요정은 음악방송 LIVE 화면, 직캠은 REC 뷰파인더, 뮤비는 레터박스, 앨범은 여백 있는 컨셉 포토.
// 글씨는 '어떤 컨셉으로 찍었는지'(컨셉 이름 한·영)와 행사 이름 한 줄만 — 설명 문장은 넣지 않는다.
// main: 인화의 큰 사진(AI 사진, 못 만들었으면 찍은 원본), before: 실물(AI 사진이 있을 때만).

import { FONT_STACK, roundRectPath } from '@/lib/photobooth/compose'
import type { IdolConcept } from './idol-concepts'

export type Picture = HTMLImageElement | HTMLCanvasElement

type Kind = 'stage' | 'photocard' | 'split' | 'poster'
/** 무대 한 장(stage) 위 장식 — 컨셉마다 다르다 */
type StageDeco = 'onair' | 'studio' | 'rec' | 'cinema'

export interface IdolDesign {
  id: string
  kind: Kind
  name: { ko: string; en: string }
}

interface ConceptStyle {
  deco: StageDeco
  /** 어두운 바탕·밝은 강조색 */
  dark: string
  accent: string
  /** 포토카드 바탕 그라데이션 */
  card: [string, string]
  /** 포스터 제목 글꼴 */
  posterFont: (px: number) => string
  designs: [IdolDesign, IdolDesign, IdolDesign, IdolDesign]
}

const sans = (weight: number) => (px: number) => `${weight} ${px}px ${FONT_STACK}`
const serif = (px: number) => `600 ${px}px "Noto Serif KR", "Nanum Myeongjo", Georgia, serif`

const design = (concept: string, kind: Kind, ko: string, en: string): IdolDesign => ({ id: `${concept}:${kind}`, kind, name: { ko, en } })

const STYLES: Record<string, ConceptStyle> = {
  'ending-fairy': {
    deco: 'onair',
    dark: '#1d1640',
    accent: '#c9b8ff',
    card: ['#e9e1ff', '#ffe9f4'],
    posterFont: sans(900),
    designs: [
      design('ending-fairy', 'stage', '음방 생방송', 'On Air'),
      design('ending-fairy', 'photocard', '포토카드', 'Photocard'),
      design('ending-fairy', 'split', '비포 · 애프터', 'Before & After'),
      design('ending-fairy', 'poster', '엔딩 포스터', 'Poster'),
    ],
  },
  'album-jacket': {
    deco: 'studio',
    dark: '#3b3440',
    accent: '#f3d9cf',
    card: ['#f6efe8', '#e8eef6'],
    posterFont: serif,
    designs: [
      design('album-jacket', 'stage', '컨셉 포토', 'Concept Photo'),
      design('album-jacket', 'photocard', '포토카드', 'Photocard'),
      design('album-jacket', 'split', '비포 · 애프터', 'Before & After'),
      design('album-jacket', 'poster', '앨범 커버', 'Album Cover'),
    ],
  },
  'stage-fancam': {
    deco: 'rec',
    dark: '#1a0d10',
    accent: '#ff4d5e',
    card: ['#2a0f16', '#120a0c'],
    posterFont: sans(900),
    designs: [
      design('stage-fancam', 'stage', '직캠 화면', 'Fancam'),
      design('stage-fancam', 'photocard', '포토카드', 'Photocard'),
      design('stage-fancam', 'split', '비포 · 애프터', 'Before & After'),
      design('stage-fancam', 'poster', '콘서트 포스터', 'Concert Poster'),
    ],
  },
  'mv-still': {
    deco: 'cinema',
    dark: '#0b0f1e',
    accent: '#3ff0ff',
    card: ['#1b1140', '#0b2a3a'],
    posterFont: sans(900),
    designs: [
      design('mv-still', 'stage', '뮤비 한 장면', 'MV Scene'),
      design('mv-still', 'photocard', '포토카드', 'Photocard'),
      design('mv-still', 'split', '비포 · 애프터', 'Before & After'),
      design('mv-still', 'poster', '티저 포스터', 'Teaser Poster'),
    ],
  },
}

function styleOf(concept: IdolConcept): ConceptStyle {
  const known = STYLES[concept.id]
  if (known) return known
  const dark = '#1b1b3a', accent = '#c9b8ff'
  return {
    deco: 'studio', dark, accent, card: [accent, dark], posterFont: sans(900),
    designs: [
      design(concept.id, 'stage', '무대 한 장', 'On Stage'),
      design(concept.id, 'photocard', '포토카드', 'Photocard'),
      design(concept.id, 'split', '비포 · 애프터', 'Before & After'),
      design(concept.id, 'poster', '포스터', 'Poster'),
    ],
  }
}

/** AI 사진이 있어야 고를 수 있는 디자인(비포 · 애프터) — 실물과 AI 를 나란히 두는 디자인이라 */
export function designNeedsAi(design: IdolDesign): boolean {
  return design.kind === 'split'
}

/** 이 컨셉의 인화 디자인 4종 */
export function idolDesigns(concept: IdolConcept): IdolDesign[] {
  return styleOf(concept).designs
}

/** 고른 디자인(없거나 다른 컨셉 것이면 첫 번째) */
export function resolveIdolDesign(concept: IdolConcept, id: string | null | undefined): IdolDesign {
  const list = idolDesigns(concept)
  return list.find((d) => d.id === id) ?? list[0]
}

// ───────────────────────── 그리기 도우미 ─────────────────────────

const W = 1200, H = 1800

const sizeOf = (p: Picture) => (p instanceof HTMLImageElement ? { w: p.naturalWidth, h: p.naturalHeight } : { w: p.width, h: p.height })

/** 칸을 꽉 채워 그린다 — 얼굴이 위쪽이라 세로 기준점은 조금 위(focalY) */
function cover(ctx: CanvasRenderingContext2D, pic: Picture, x: number, y: number, w: number, h: number, focalY = 0.35) {
  const { w: iw, h: ih } = sizeOf(pic)
  if (!iw || !ih) return
  const k = Math.max(w / iw, h / ih)
  const sw = w / k, sh = h / k
  ctx.drawImage(pic, (iw - sw) / 2, (ih - sh) * focalY, sw, sh, x, y, w, h)
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: (px: number) => string, start: number, min: number) {
  let px = start
  ctx.font = font(px)
  while (px > min && ctx.measureText(text).width > maxWidth) ctx.font = font(--px)
  return px
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: { bg: string; fg: string; dot?: string; align?: 'left' | 'right'; size?: number }) {
  const size = opts.size ?? 28
  ctx.save()
  ctx.font = `800 ${size}px ${FONT_STACK}`
  ctx.letterSpacing = `${Math.round(size * 0.18)}px`
  const dotW = opts.dot ? size * 0.9 : 0
  const w = ctx.measureText(text).width + size * 1.6 + dotW
  const h = size * 2
  const left = opts.align === 'right' ? x - w : x
  roundRectPath(ctx, left, y, w, h, h / 2)
  ctx.fillStyle = opts.bg
  ctx.fill()
  if (opts.dot) {
    ctx.fillStyle = opts.dot
    ctx.beginPath()
    ctx.arc(left + size * 0.8 + size * 0.28, y + h / 2, size * 0.28, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = opts.fg
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, left + size * 0.8 + dotW, y + h / 2 + 1)
  ctx.restore()
}

/** 실물 BEFORE — 흰 테두리 폴라로이드(살짝 기울여) */
function polaroid(ctx: CanvasRenderingContext2D, pic: Picture, cx: number, cy: number, w: number, tilt: number) {
  const h = w * 4 / 3, border = w * 0.055, bottom = w * 0.2
  const cardW = w + border * 2, cardH = h + border + bottom
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tilt)
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 8
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH)
  ctx.shadowColor = 'transparent'
  cover(ctx, pic, -w / 2, -cardH / 2 + border, w, h, 0.4)
  ctx.fillStyle = '#1a1530'
  ctx.font = `800 ${Math.round(w * 0.09)}px ${FONT_STACK}`
  ctx.letterSpacing = `${Math.round(w * 0.015)}px`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('BEFORE', 0, cardH / 2 - bottom / 2)
  ctx.restore()
}

/** 컨셉 이름 한 줄(한국어 크게 + 영어 작게) */
function conceptLine(ctx: CanvasRenderingContext2D, concept: IdolConcept, x: number, baseline: number, maxW: number, color: string, px: number, align: CanvasTextAlign = 'left') {
  ctx.save()
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  const ko = concept.name.ko, en = concept.name.en
  const koPx = fit(ctx, ko, maxW * 0.62, sans(800), px, Math.round(px * 0.6))
  const koW = ctx.measureText(ko).width
  ctx.font = sans(600)(Math.round(koPx * 0.52))
  const enW = ctx.measureText(en).width
  const total = koW + 14 + enW
  const start = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  ctx.textAlign = 'left'
  ctx.font = sans(800)(koPx)
  ctx.fillText(ko, start, baseline)
  ctx.globalAlpha = 0.8
  ctx.font = sans(600)(Math.round(koPx * 0.52))
  ctx.fillText(en, start + koW + 14, baseline)
  ctx.restore()
}

function eventText(ctx: CanvasRenderingContext2D, text: string, x: number, baseline: number, color: string, align: CanvasTextAlign, px = 22) {
  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha = 0.85
  ctx.font = sans(700)(px)
  ctx.letterSpacing = '3px'
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, baseline)
  ctx.restore()
}

function shade(ctx: CanvasRenderingContext2D, y0: number, y1: number, from: string, to: string) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  ctx.fillStyle = g
  ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0))
}

// ───────────────────────── 네 가지 틀 ─────────────────────────

/** 인화물 오른쪽 아래 폰 다운로드 QR — 이미지, 편집 미리보기용 자리 표시('placeholder'), 없음(null) */
export type PrintQr = Picture | 'placeholder' | null

interface Parts {
  concept: IdolConcept
  style: ConceptStyle
  main: Picture
  before: Picture | null
  event: string
  qr: PrintQr
}

// QR 카드 — 흰 둥근 판에 QR(168px ≈ 14mm @300dpi, 폰으로 읽히는 크기) + 'SCAN · 사진 받기'
const QR_W = 192, QR_H = 228, QR_M = 40

function qrTile(ctx: CanvasRenderingContext2D, qr: PrintQr, x: number, y: number) {
  if (!qr) return
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 4
  roundRectPath(ctx, x, y, QR_W, QR_H, 18)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.shadowColor = 'transparent'
  const q = 168, qx = x + (QR_W - q) / 2, qy = y + 12
  if (qr === 'placeholder') {
    // 완성하기를 누르면 진짜 QR 이 들어간다 — 미리보기에선 자리만
    ctx.fillStyle = '#e9e9ee'
    ctx.fillRect(qx, qy, q, q)
    ctx.fillStyle = '#9a9aa6'
    ctx.font = sans(800)(40)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('QR', qx + q / 2, qy + q / 2)
  } else {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qr, qx, qy, q, q)
    ctx.imageSmoothingEnabled = true
  }
  ctx.fillStyle = '#1b1a24'
  ctx.font = sans(800)(19)
  ctx.letterSpacing = '1px'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('SCAN · 사진 받기', x + QR_W / 2, y + QR_H - 16)
  ctx.restore()
}

/** 캔버스 오른쪽 아래 QR 자리(왼쪽 위 좌표) */
const qrCorner = () => ({ x: W - QR_M - QR_W, y: H - QR_M - QR_H })

/** 무대 한 장 — 사진을 꽉 채우고 컨셉 장식(LIVE·REC·레터박스·스튜디오 여백) + 아래 한 줄 */
function drawStage(ctx: CanvasRenderingContext2D, { concept, style, main, before, event, qr }: Parts) {
  const { deco, accent } = style
  if (deco === 'cinema') {
    const bar = 170
    ctx.fillStyle = '#05060a'
    ctx.fillRect(0, 0, W, H)
    cover(ctx, main, 0, bar, W, H - bar * 2)
    ctx.fillStyle = accent
    ctx.font = sans(800)(24)
    ctx.letterSpacing = '10px'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('M / V', 60, bar / 2)
    ctx.letterSpacing = '0px'
    eventText(ctx, event, W - 60, bar / 2 + 8, '#ffffff', 'right', 20)
    if (before) polaroid(ctx, before, 60 + 110, H - bar - 60 - 160, 220, -0.06)
    conceptLine(ctx, concept, W / 2, H - bar / 2 + 16, W - 120, '#ffffff', 46, 'center')
    // 아래 검은 띠에는 이름이 있어 그 바로 위 사진 오른쪽 아래에
    qrTile(ctx, qr, W - QR_M - QR_W, H - bar - 24 - QR_H)
    return
  }
  if (deco === 'studio') {
    // 컨셉 포토 — 크림색 여백 안에 사진, 아래 여백에 이름
    const m = 56, bottom = 200
    ctx.fillStyle = '#f7f2ec'
    ctx.fillRect(0, 0, W, H)
    cover(ctx, main, m, m, W - m * 2, H - m - bottom)
    if (before) polaroid(ctx, before, m + 40 + 100, H - bottom - 40 - 150, 200, -0.05)
    conceptLine(ctx, concept, m, H - bottom / 2 + 10, W - m * 2 - 380, style.dark, 50)
    eventText(ctx, event, W - m, H - bottom / 2 + 6, style.dark, 'right', 20)
    qrTile(ctx, qr, W - m - 24 - QR_W, H - bottom - 24 - QR_H)
    return
  }
  cover(ctx, main, 0, 0, W, H)
  shade(ctx, H - 420, H, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.72)')
  if (deco === 'onair') {
    // 음악방송 생방송 화면 — 왼쪽 위 LIVE, 오른쪽 위 채널 느낌의 행사 표시, 아래 자막 띠
    pill(ctx, 'LIVE', 48, 48, { bg: '#ff2d55', fg: '#ffffff', dot: '#ffffff' })
    // ON STAGE 는 AI 사진일 때만 — 못 만들어 원본을 쓰면 붙이지 않는다
    if (before) pill(ctx, 'ON STAGE', W - 48, 48, { bg: 'rgba(10,8,30,0.62)', fg: '#ffffff', align: 'right' })
    const y = H - 190
    ctx.fillStyle = accent
    ctx.fillRect(48, y, 12, 110)
    conceptLine(ctx, concept, 84, y + 62, W - 84 - 48 - (before ? 280 : 0) - (qr ? QR_W + 24 : 0), '#ffffff', 54)
    eventText(ctx, event, 84, y + 104, '#ffffff', 'left', 20)
  } else {
    // 직캠 — 뷰파인더 모서리, REC·시간
    pill(ctx, 'REC', 48, 48, { bg: 'rgba(0,0,0,0.55)', fg: '#ffffff', dot: '#ff2d38' })
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.font = sans(700)(28)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText('00:03:17', W - 56, 62)
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 6
    const c = 90, m = 36
    // 아래 모서리는 실물 폴라로이드(오른쪽 아래) 위로 — 겹쳐서 모서리가 가려졌다(2026-10-02 점검)
    const low = before ? H - 470 : H - 240
    for (const [x, y, dx, dy] of [[m, 150, 1, 1], [W - m, 150, -1, 1], [m, low, 1, -1], [W - m, low, -1, -1]] as const) {
      ctx.beginPath()
      ctx.moveTo(x, y + dy * c)
      ctx.lineTo(x, y)
      ctx.lineTo(x + dx * c, y)
      ctx.stroke()
    }
    ctx.restore()
    conceptLine(ctx, concept, 56, H - 110, W - 112 - (before ? 280 : 0) - (qr ? QR_W + 24 : 0), '#ffffff', 52)
    eventText(ctx, event, 56, H - 64, '#ffffff', 'left', 20)
  }
  const polaroidX = qr ? W - QR_M - QR_W - 24 - 120 : W - 48 - 120
  if (before) polaroid(ctx, before, polaroidX, H - 60 - 185, 220, 0.06)
  qrTile(ctx, qr, qrCorner().x, qrCorner().y)
}

/** 포토카드 — 컨셉 색 바탕에 둥근 카드, 아래에 이름과 실물 */
function drawPhotocard(ctx: CanvasRenderingContext2D, { concept, style, main, before, event, qr }: Parts) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, style.card[0])
  g.addColorStop(1, style.card[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const light = style.deco === 'onair' || style.deco === 'studio'
  const ink = light ? style.dark : '#ffffff'
  const x = 90, y = 90, w = W - 180, h = 1400, r = 44
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 14
  roundRectPath(ctx, x - 14, y - 14, w + 28, h + 28, r + 12)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()
  ctx.save()
  roundRectPath(ctx, x, y, w, h, r)
  ctx.clip()
  cover(ctx, main, x, y, w, h)
  ctx.restore()
  if (before) pill(ctx, 'ON STAGE', x + w - 28, y + 28, { bg: 'rgba(10,8,30,0.55)', fg: '#ffffff', align: 'right', size: 22 })
  const baseY = y + h + 14 + 150
  // 오른쪽 아래는 QR, 실물(BEFORE)은 그 왼쪽
  const bw = 150, bh = 200, bx = (qr ? qrCorner().x - 24 : x + w) - bw, by = y + h + 44
  const textRight = before ? bx - 30 : qr ? qrCorner().x - 30 : x + w
  conceptLine(ctx, concept, x, baseY - 26, textRight - x, ink, 52)
  eventText(ctx, event, x, baseY + 22, ink, 'left', 20)
  qrTile(ctx, qr, qrCorner().x, qrCorner().y)
  if (before) {
    ctx.save()
    roundRectPath(ctx, bx - 8, by - 8, bw + 16, bh + 16, 18)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    roundRectPath(ctx, bx, by, bw, bh, 12)
    ctx.clip()
    cover(ctx, before, bx, by, bw, bh, 0.4)
    ctx.restore()
    pill(ctx, 'BEFORE', bx + 10, by + bh - 42, { bg: 'rgba(10,8,30,0.7)', fg: '#ffffff', size: 14 })
  }
}

/**
 * 비포 · 애프터 — 홍보 배너의 인화지 모양(2026-10-02): 흰 인화지 위 줄에 BEFORE(실물, 세로 사진)와 컨셉 이름·행사,
 * 아래에 ON STAGE(AI) 크게. 사진 왼쪽 위에 이름표(검정 BEFORE / 벽돌색 ON STAGE).
 * 실물이 없으면(AI 를 못 만듦) 위 줄은 글씨만.
 */
const PAPER = '#f7f4ee'
const PAPER_INK = '#1b1a24'
const BRICK = '#a8392b'

function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg: string) {
  ctx.save()
  ctx.font = sans(700)(30)
  ctx.letterSpacing = '2px'
  const w = ctx.measureText(text).width + 36
  ctx.fillStyle = bg
  ctx.fillRect(x, y, w, 54)
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, x + 18, y + 28)
  ctx.restore()
}

function photoBox(ctx: CanvasRenderingContext2D, pic: Picture, x: number, y: number, w: number, h: number, focalY: number) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  cover(ctx, pic, x, y, w, h, focalY)
  ctx.restore()
}

function drawSplit(ctx: CanvasRenderingContext2D, { concept, main, before, event, qr }: Parts) {
  const m = 56, gap = 24
  const x = m, w = W - m * 2
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  // 위 줄: 왼쪽 실물(세로 사진 그대로 — 가로 띠에 넣으면 얼굴이 잘렸다), 오른쪽 컨셉 이름·행사
  const topH = 600
  let textX = x
  if (before) {
    const bw = Math.round(topH * 2 / 3)
    photoBox(ctx, before, x, m, bw, topH, 0.3)
    tag(ctx, 'BEFORE', x + 18, m + 18, PAPER_INK)
    textX = x + bw + 48
  }
  const textW = x + w - textX
  ctx.save()
  ctx.fillStyle = BRICK
  ctx.font = sans(800)(26)
  ctx.letterSpacing = '6px'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillText(`BEFORE → ${concept.tag}`, textX, m + 60, textW)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = PAPER_INK
  const koPx = fit(ctx, concept.name.ko, textW, sans(900), 96, 48)
  ctx.fillText(concept.name.ko, textX, m + 60 + 40 + koPx * 0.95)
  ctx.globalAlpha = 0.65
  ctx.font = sans(600)(Math.round(koPx * 0.42))
  ctx.fillText(concept.name.en, textX, m + 60 + 40 + koPx * 0.95 + koPx * 0.62, textW)
  ctx.globalAlpha = 1
  ctx.fillStyle = BRICK
  ctx.fillRect(textX, m + topH - 74, 64, 4)
  ctx.fillStyle = PAPER_INK
  ctx.globalAlpha = 0.8
  fit(ctx, event, textW, (px) => `700 ${px}px ${FONT_STACK}`, 24, 14)
  ctx.letterSpacing = '3px'
  ctx.fillText(event, textX, m + topH - 18, textW)
  ctx.restore()
  // 아래: AI 사진 크게
  const ay = m + topH + gap
  photoBox(ctx, main, x, ay, w, H - m - ay, 0.25)
  tag(ctx, 'ON STAGE', x + 18, ay + 18, BRICK)
  qrTile(ctx, qr, x + w - 24 - QR_W, H - m - 24 - QR_H)
}

/** 포스터 — 사진을 꽉 채우고 위에 큰 영어 제목, 아래에 한국어 이름·행사 */
function drawPoster(ctx: CanvasRenderingContext2D, { concept, style, main, before, event, qr }: Parts) {
  cover(ctx, main, 0, 0, W, H, 0.45)
  shade(ctx, 0, 520, 'rgba(0,0,0,0.62)', 'rgba(0,0,0,0)')
  shade(ctx, H - 360, H, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.7)')
  const title = concept.name.en.toUpperCase()
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  // 재단 안전 여백 — 좌우 각 캔버스 폭의 6%. 자간을 넣은 상태로 폭을 재야 한다(빼고 재서 ALBUM JACKET 이 좌우 28px 까지 붙었다)
  ctx.letterSpacing = style.posterFont === serif ? '6px' : '0px'
  const px = fit(ctx, title, W * 0.88, style.posterFont, 170, 60)
  ctx.font = style.posterFont(px)
  ctx.fillText(title, W / 2, 60 + px * 0.95)
  ctx.fillStyle = style.accent
  ctx.fillRect(W / 2 - 60, 60 + px * 0.95 + 34, 120, 6)
  ctx.restore()
  if (before) polaroid(ctx, before, 60 + 100, H - 90 - 150, 200, -0.06)
  const tx = before ? 330 : 60
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  fit(ctx, concept.name.ko, (qr ? qrCorner().x - 30 : W - 60) - tx, sans(800), 60, 34)
  ctx.fillText(concept.name.ko, tx, H - 120)
  ctx.restore()
  eventText(ctx, event, tx, H - 70, '#ffffff', 'left', 22)
  qrTile(ctx, qr, qrCorner().x, qrCorner().y)
}

/**
 * 인화 원판(1200x1800)에 디자인을 그린다. 미리보기 칸은 ctx 를 줄여(scale) 같은 함수로 그린다.
 * event: 행사 이름 한 줄(예: 2026 K-WAVE DANCE FESTIVAL)
 */
export function drawIdolDesign(
  ctx: CanvasRenderingContext2D,
  concept: IdolConcept,
  designId: string | null | undefined,
  pics: { main: Picture; before: Picture | null },
  event: string,
  /** 인화물 오른쪽 아래 폰 다운로드 QR(없으면 null) */
  qr: PrintQr = null,
) {
  const style = styleOf(concept)
  const parts: Parts = { concept, style, main: pics.main, before: pics.before, event, qr }
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  let kind = resolveIdolDesign(concept, designId).kind
  // AI 사진이 없으면(생성 전·실패) 비포·애프터는 그릴 수 없다 — 첫 디자인(무대 한 장)으로
  if (kind === 'split' && !pics.before) kind = 'stage'
  if (kind === 'photocard') drawPhotocard(ctx, parts)
  else if (kind === 'split') drawSplit(ctx, parts)
  else if (kind === 'poster') drawPoster(ctx, parts)
  else drawStage(ctx, parts)
  ctx.restore()
}
