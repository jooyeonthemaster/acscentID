// 타임캡슐 포토 「LATER!」(B안) 코드 그림 — 미래 장면 임시 배경(미리 만든 webp 가 없을 때) · 타임캡슐 틀 · 편지 카드 · 아래 도장.
// 1200×1800 좌표로 그린다(견본은 줄여서). 「우주 정거장」 임시 배경은 THEME! 코드 그림(theme-art.ts)을 그대로 쓴다.
// 앞 장식(반짝이)은 사람 자리를 비운다 — 편지 카드는 사람 자리보다 위(LATER_LAYOUT.peopleTop 위)에만 둔다. 실제 상표 · 로고는 넣지 않는다.

import { roundRectPath } from '@/lib/photobooth/compose'
import { cloud, glow, linear, rng, sparkle, starPath } from './theme-art'

/** 4×6 한 장의 자리(1200×1800) — 위 편지 카드 · 가운데 사람 · 아래 틀 몸통(도장) */
export const LATER_LAYOUT = {
  /** 타임캡슐 창(틀 안쪽) — 위 모서리는 캡슐처럼 크게 둥글게 */
  win: { x: 44, y: 44, w: 1112, h: 1452, rTop: 230, rBottom: 48 },
  /** 편지 카드 */
  card: { x: 150, y: 104, w: 900, h: 300, tail: 30 },
  /** 사람 무리 위 끝이 이보다 아래(카드 꼬리 아래) */
  peopleTop: 452,
  /** 사람 무리 아래 끝 — 틀 몸통(1496~) 밑으로 조금 들어가 잘린 몸 경계를 가린다 */
  peopleBottom: 1532,
} as const

export interface LaterArtContext {
  ctx: CanvasRenderingContext2D
  W: number
  H: number
  font: string
  /** 장면 대표색 · 사람 뒤 빛 */
  color: string
  glow: string
  /** 합성한 사람이 (x, y) 반경 r 안에 있는가 — 견본(사람 없음)에서는 없음 → 기본 사람 자리를 비운다 */
  people?: (x: number, y: number, r: number) => boolean
}

export interface LaterTexts {
  /** 「To. 2036년의 나에게」 */
  to: string
  /** 미래의 나에게 한마디 */
  message: string
  /** 「From. 2026년 11월 14일의 나」 */
  from: string
  /** 우표 안 연도(열어 볼 해) */
  openYear: number
  /** 「2036년 11월 14일에 다시 열어 보세요」 */
  openLine: string
  /** 「LATER! · 우주 정거장」 */
  tag: string
  /** 「찍은 날 2026.11.14」 */
  shotOn: string
}

// ───────────────────────── 보조 ─────────────────────────

/** 가로 maxW 안에 들어가게 글자 크기를 줄인다(min 까지) */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, min: number, maxW: number, font: string) {
  let s = size
  ctx.font = `${weight} ${s}px ${font}`
  while (s > min && ctx.measureText(text).width > maxW) {
    s -= 2
    ctx.font = `${weight} ${s}px ${font}`
  }
  return s
}

/** 위 · 아래 모서리 반지름이 다른 둥근 사각(캡슐 창) — 경로에 덧붙인다(beginPath 하지 않음) */
function capsuleRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rt: number, rb: number) {
  ctx.moveTo(x + rt, y)
  ctx.lineTo(x + w - rt, y)
  ctx.arcTo(x + w, y, x + w, y + rt, rt)
  ctx.lineTo(x + w, y + h - rb)
  ctx.arcTo(x + w, y + h, x + w - rb, y + h, rb)
  ctx.lineTo(x + rb, y + h)
  ctx.arcTo(x, y + h, x, y + h - rb, rb)
  ctx.lineTo(x, y + rt)
  ctx.arcTo(x, y, x + rt, y, rt)
  ctx.closePath()
}

/** 사람 자리(가운데 아래) — 견본에서 장식이 피하는 곳 */
function inPeopleZone(W: number, x: number, y: number) {
  return x > W * 0.14 && x < W * 0.86 && y > LATER_LAYOUT.peopleTop - 20
}

/** 장식을 (x, y) 반경 r 에 둬도 되는가 — 사람(얼굴 · 몸) · 편지 카드 위에는 아무것도 얹지 않는다 */
function free(a: LaterArtContext, x: number, y: number, r: number) {
  const c = LATER_LAYOUT.card
  if (x + r > c.x - 10 && x - r < c.x + c.w + 10 && y + r > c.y - 10 && y - r < c.y + c.h + c.tail + 10) return false
  if (a.people) return !a.people(x, y, r) && !(inPeopleZone(a.W, x, y) && x > a.W * 0.3 && x < a.W * 0.7 && y > a.H * 0.5)
  return !inPeopleZone(a.W, x, y)
}

// ───────────────────────── 임시 배경 1. 미래 도시 ─────────────────────────

function tower(ctx: CanvasRenderingContext2D, x: number, w: number, top: number, bottom: number, tint: string, r: () => number) {
  ctx.save()
  roundRectPath(ctx, x, top, w, bottom - top, Math.min(w / 2, 90))
  ctx.fillStyle = linear(ctx, x, 0, x + w, 0, [[0, '#ffffff'], [0.55, tint], [1, '#c9d8ec']])
  ctx.fill()
  ctx.clip()
  // 유리 띠
  ctx.fillStyle = 'rgba(120,170,220,0.32)'
  for (let y = top + 60; y < bottom; y += 46) ctx.fillRect(x + 10, y, w - 20, 18)
  // 옥상 · 벽 정원
  ctx.fillStyle = '#5cc77a'
  for (let i = 0; i < 4; i++) {
    const yy = top + 120 + r() * (bottom - top - 200)
    ctx.beginPath()
    ctx.ellipse(x + w / 2, yy, w * 0.52, 16, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = '#48b86a'
  ctx.beginPath()
  ctx.ellipse(x + w / 2, top + 18, w * 0.42, 26, 0, 0, Math.PI * 2)
  ctx.fill()
}

function cityBg({ ctx, W, H }: LaterArtContext) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#8fd0ff'], [0.32, '#cdeaff'], [0.55, '#ffe2d0'], [0.7, '#ffd0c4'], [1, '#f4efe8']])
  ctx.fillRect(0, 0, W, H)
  glow(ctx, 860, 640, 420, 'rgba(255,236,190,0.9)')
  ctx.fillStyle = '#fff6d8'
  ctx.beginPath()
  ctx.arc(860, 640, 92, 0, Math.PI * 2)
  ctx.fill()
  const r = rng(211)
  // 먼 탑(옅게)
  ctx.globalAlpha = 0.55
  for (let i = 0; i < 9; i++) {
    const w = 70 + r() * 70
    tower(ctx, i * 140 - 20 + r() * 30, w, 560 + r() * 260, 1180, '#e6eef8', r)
  }
  ctx.globalAlpha = 1
  // 투명 관 열차 길
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 34
  ctx.beginPath()
  ctx.moveTo(-40, 900)
  ctx.bezierCurveTo(300, 760, 860, 1040, 1260, 820)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(120,190,255,0.55)'
  ctx.lineWidth = 6
  ctx.stroke()
  ctx.restore()
  // 가까운 탑(양옆)
  tower(ctx, 0, 210, 470, 1300, '#dfe9f6', r)
  tower(ctx, 190, 130, 700, 1300, '#e9e1f6', r)
  tower(ctx, W - 230, 230, 420, 1300, '#e2f0f2', r)
  tower(ctx, W - 360, 140, 760, 1300, '#f6e6ea', r)
  // 날아다니는 작은 탈것
  for (const [x, y, s] of [[420, 520, 1], [760, 470, 0.7], [980, 600, 0.8], [300, 690, 0.6]] as const) {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(x, y, 46 * s, 16 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(110,180,255,0.85)'
    ctx.beginPath()
    ctx.ellipse(x, y - 10 * s, 22 * s, 14 * s, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    glow(ctx, x - 50 * s, y, 26 * s, 'rgba(120,220,255,0.8)')
  }
  // 광장 바닥
  ctx.fillStyle = linear(ctx, 0, 1240, 0, H, [[0, '#efe8e0'], [1, '#fdfaf6']])
  ctx.fillRect(0, 1240, W, H - 1240)
  ctx.save()
  ctx.strokeStyle = 'rgba(180,170,160,0.35)'
  ctx.lineWidth = 3
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath()
    ctx.moveTo(W / 2, 1240)
    ctx.lineTo(W / 2 + i * 190, H)
    ctx.stroke()
  }
  ctx.restore()
  // 양옆 꽃밭 · 나무
  for (const side of [0, 1]) {
    const bx = side ? W - 170 : 170
    ctx.fillStyle = '#3fae63'
    ctx.beginPath()
    ctx.arc(bx, 1170, 120, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6ad08a'
    ctx.beginPath()
    ctx.arc(bx + (side ? 40 : -40), 1130, 80, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = ['#ff7aa8', '#ffc83d', '#ffffff', '#ff9a5c'][i % 4]
      ctx.beginPath()
      ctx.arc(bx - 130 + r() * 260, 1260 + r() * 70, 9, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ───────────────────────── 임시 배경 2. 하늘 위 학교 ─────────────────────────

function skyBg({ ctx, W, H }: LaterArtContext) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#3fa9ff'], [0.4, '#8fd3ff'], [0.7, '#d9f1ff'], [1, '#ffffff']])
  ctx.fillRect(0, 0, W, H)
  // 무지개
  ctx.save()
  ctx.globalAlpha = 0.45
  const bands = ['#ff6b6b', '#ffb84d', '#ffe66d', '#6fdc8c', '#5cc8ff', '#8f7bff']
  bands.forEach((c, i) => {
    ctx.strokeStyle = c
    ctx.lineWidth = 22
    ctx.beginPath()
    ctx.arc(W / 2, 1100, 640 - i * 22, Math.PI * 1.08, Math.PI * 1.92)
    ctx.stroke()
  })
  ctx.restore()
  // 떠 있는 섬 + 학교
  const ix = W / 2, iy = 820
  ctx.fillStyle = '#9b6b4a'
  ctx.beginPath()
  ctx.moveTo(ix - 300, iy)
  ctx.quadraticCurveTo(ix, iy + 330, ix + 300, iy)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#5cc77a'
  ctx.beginPath()
  ctx.ellipse(ix, iy, 310, 46, 0, 0, Math.PI * 2)
  ctx.fill()
  // 학교 건물
  ctx.fillStyle = '#fffaf2'
  ctx.fillRect(ix - 210, iy - 190, 420, 170)
  ctx.fillStyle = '#ff9fb8'
  ctx.beginPath()
  ctx.moveTo(ix - 230, iy - 190)
  ctx.lineTo(ix, iy - 280)
  ctx.lineTo(ix + 230, iy - 190)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#9ad7ff'
  for (let k = 0; k < 5; k++) {
    for (let j = 0; j < 2; j++) {
      roundRectPath(ctx, ix - 180 + k * 76, iy - 160 + j * 70, 44, 44, 10)
      ctx.fill()
    }
  }
  // 둥근 탑 + 유리 지붕
  ctx.fillStyle = '#fffaf2'
  ctx.fillRect(ix + 150, iy - 330, 90, 310)
  ctx.fillStyle = 'rgba(150,220,255,0.9)'
  ctx.beginPath()
  ctx.arc(ix + 195, iy - 330, 45, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(ix + 195, iy - 270, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#7b8fb0'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(ix + 195, iy - 270)
  ctx.lineTo(ix + 195, iy - 288)
  ctx.moveTo(ix + 195, iy - 270)
  ctx.lineTo(ix + 208, iy - 264)
  ctx.stroke()
  // 나무
  for (const tx of [ix - 270, ix - 240, ix + 270]) {
    ctx.fillStyle = '#3fae63'
    ctx.beginPath()
    ctx.arc(tx, iy - 40, 42, 0, Math.PI * 2)
    ctx.fill()
  }
  // 열기구
  for (const [x, y, s, c] of [[180, 560, 1, '#ff7a3d'], [1010, 470, 0.8, '#8f7bff'], [930, 980, 0.6, '#ffc83d']] as const) {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(x, y, 60 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(x - 10 * s, y - 60 * s, 20 * s, 120 * s)
    ctx.fillStyle = '#9b6b4a'
    ctx.fillRect(x - 16 * s, y + 80 * s, 32 * s, 24 * s)
  }
  // 구름 바다 + 흰 테라스
  for (let i = 0; i < 9; i++) cloud(ctx, -60 + i * 150, 1150 + (i % 2) * 40, 1.1)
  ctx.fillStyle = linear(ctx, 0, 1250, 0, H, [[0, '#f3f6fb'], [1, '#ffffff']])
  ctx.fillRect(0, 1250, W, H - 1250)
  ctx.fillStyle = 'rgba(160,180,210,0.35)'
  ctx.fillRect(0, 1250, W, 8)
}

// ───────────────────────── 앞: 반짝이 · 틀 · 카드 · 도장 ─────────────────────────

/** 창 안 반짝이 — 사람 · 카드 자리는 비운다 */
function sparkles(a: LaterArtContext) {
  const { ctx, W } = a
  const r = rng(907)
  const { win } = LATER_LAYOUT
  let placed = 0
  for (let i = 0; i < 160 && placed < 18; i++) {
    const x = win.x + 50 + r() * (win.w - 100)
    const y = win.y + 60 + r() * (win.h - 160)
    const s = 14 + r() * 22
    if (!free(a, x, y, s + 10)) continue
    // 창 모서리 밖은 건너뛴다(위 큰 둥근 모서리)
    if (y < win.y + win.rTop && (x < win.x + win.rTop * 0.6 || x > W - win.x - win.rTop * 0.6)) continue
    placed++
    if (r() < 0.6) {
      glow(ctx, x, y, s * 1.8, 'rgba(255,255,255,0.75)')
      sparkle(ctx, x, y, s, 'rgba(255,255,255,0.95)')
    } else {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur = 6
      starPath(ctx, x, y, s * 0.8, r())
      ctx.fillStyle = ['#ffd84d', '#ff8fb8', '#9be7ff'][placed % 3]
      ctx.fill()
      ctx.restore()
    }
  }
}

/** 타임캡슐 틀 — 금속 몸통에 캡슐 창을 뚫고, 위에 「TIME CAPSULE」 꼬리표 · 옆에 볼트 */
function capsuleFrame(a: LaterArtContext) {
  const { ctx, W, H, font, color } = a
  const { win } = LATER_LAYOUT
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, W, H)
  capsuleRect(ctx, win.x, win.y, win.w, win.h, win.rTop, win.rBottom)
  ctx.fillStyle = linear(ctx, 0, 0, W, H, [[0, '#2a2f6e'], [0.4, '#3d3a8f'], [0.75, '#272b63'], [1, '#1b1f4a']])
  ctx.fill('evenodd')
  ctx.restore()
  // 금속 결(옆 빛줄)
  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(12, 200, 6, H - 500)
  ctx.fillRect(W - 18, 200, 6, H - 500)
  ctx.restore()
  // 창 테두리 — 진한 테 + 대표색 빛 테
  ctx.save()
  ctx.beginPath()
  capsuleRect(ctx, win.x, win.y, win.w, win.h, win.rTop, win.rBottom)
  ctx.lineWidth = 12
  ctx.strokeStyle = '#14173a'
  ctx.stroke()
  ctx.beginPath()
  capsuleRect(ctx, win.x + 9, win.y + 9, win.w - 18, win.h - 18, win.rTop - 9, win.rBottom - 9)
  ctx.lineWidth = 4
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 16
  ctx.stroke()
  ctx.restore()
  // 볼트
  const bolt = (x: number, y: number) => {
    ctx.fillStyle = '#151838'
    ctx.beginPath()
    ctx.arc(x, y, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c9c6ff'
    ctx.beginPath()
    ctx.arc(x - 2, y - 2, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let y = 320; y < win.y + win.h - 40; y += 200) { bolt(win.x / 2, y); bolt(W - win.x / 2, y) }
  // 위 꼬리표
  const tw = 330
  const tx = (W - tw) / 2
  ctx.save()
  roundRectPath(ctx, tx, 18, tw, 54, 27)
  ctx.fillStyle = '#14173a'
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 10
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 3
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 26px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('TIME CAPSULE', W / 2, 46)
  ctx.restore()
}

/** 위 편지 카드 — 「To.」 · 한마디 · 「From.」 · 우표(열어 볼 해) · 아래 말풍선 꼬리 */
function letterCard(a: LaterArtContext, t: LaterTexts) {
  const { ctx, font, color } = a
  const { x, y, w, h, tail } = LATER_LAYOUT.card
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.rotate(-0.012)
  ctx.translate(-w / 2, -h / 2)
  // 종이 + 꼬리
  ctx.save()
  ctx.shadowColor = 'rgba(10,12,40,0.35)'
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#fffaf0'
  roundRectPath(ctx, 0, 0, w, h, 30)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(w / 2 - 34, h - 2)
  ctx.lineTo(w / 2, h + tail)
  ctx.lineTo(w / 2 + 34, h - 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // 항공 우편 줄무늬(위 테두리)
  ctx.save()
  roundRectPath(ctx, 0, 0, w, h, 30)
  ctx.clip()
  for (let i = -2; i < w / 34 + 2; i++) {
    ctx.fillStyle = i % 2 ? color : '#ff7a59'
    ctx.beginPath()
    ctx.moveTo(i * 34, 0)
    ctx.lineTo(i * 34 + 22, 0)
    ctx.lineTo(i * 34 + 10, 16)
    ctx.lineTo(i * 34 - 12, 16)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  // 우표
  const sx = w - 136
  const sy = 34
  const sw = 96
  const sh = 112
  ctx.save()
  ctx.translate(sx + sw / 2, sy + sh / 2)
  ctx.rotate(0.06)
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 6
  ctx.fillRect(-sw / 2, -sh / 2, sw, sh)
  ctx.shadowColor = 'transparent'
  // 톱니 가장자리
  ctx.fillStyle = '#fffaf0'
  for (let i = 0; i <= 8; i++) {
    for (const [px, py] of [[-sw / 2 + (i * sw) / 8, -sh / 2], [-sw / 2 + (i * sw) / 8, sh / 2]]) { ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill() }
  }
  for (let i = 0; i <= 9; i++) {
    for (const [px, py] of [[-sw / 2, -sh / 2 + (i * sh) / 9], [sw / 2, -sh / 2 + (i * sh) / 9]]) { ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill() }
  }
  ctx.fillStyle = linear(ctx, 0, -sh / 2, 0, sh / 2, [[0, color], [1, '#2a2f6e']])
  ctx.fillRect(-sw / 2 + 9, -sh / 2 + 9, sw - 18, sh - 18)
  starPath(ctx, 0, -12, 20)
  ctx.fillStyle = '#ffd84d'
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 22px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(t.openYear), 0, 28)
  ctx.restore()
  // 글
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = color
  fitFont(ctx, t.to, 800, 34, 24, w - 220, font)
  ctx.fillText(t.to, 56, 74)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#17213a'
  const size = fitFont(ctx, `「${t.message}」`, 900, 70, 40, w - 100, font)
  ctx.fillText(`「${t.message}」`, w / 2, 168 + (70 - size) * 0.2)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#56607a'
  fitFont(ctx, t.from, 700, 28, 20, w - 120, font)
  ctx.fillText(t.from, w - 56, 252)
  ctx.restore()
}

/** 아래 몸통 도장 — 「20XX년 X월 X일에 다시 열어 보세요」 + FUN GROUND 별내 + LATER! · 장면 · 찍은 날 */
function stamp(a: LaterArtContext, t: LaterTexts) {
  const { ctx, W, font, color } = a
  // 열어 볼 날 띠
  const bx = 92
  const bw = W - bx * 2
  const by = 1528
  const bh = 104
  ctx.save()
  roundRectPath(ctx, bx, by, bw, bh, bh / 2)
  ctx.fillStyle = linear(ctx, bx, 0, bx + bw, 0, [[0, color], [1, '#8f6bff']])
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 6
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#ffd84d'
  ctx.stroke()
  // 자물쇠 시계(작은 원 + 바늘)
  const ix = bx + 70
  const iy = by + bh / 2
  ctx.fillStyle = '#ffd84d'
  ctx.beginPath()
  ctx.arc(ix, iy, 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#2a2f6e'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(ix, iy)
  ctx.lineTo(ix, iy - 17)
  ctx.moveTo(ix, iy)
  ctx.lineTo(ix + 13, iy + 6)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  fitFont(ctx, t.openLine, 900, 48, 30, bw - 190, font)
  ctx.fillText(t.openLine, bx + bw / 2 + 36, iy + 2)
  ctx.restore()

  // 아래 줄 — 왼쪽 상호(임시 글자) · 오른쪽 LATER! · 장면 · 찍은 날
  const cy = 1712
  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  let tx = 110
  ctx.font = `900 46px ${font}`
  ctx.fillStyle = '#ff6b2c'
  ctx.fillText('FUN', tx, cy)
  tx += ctx.measureText('FUN ').width
  ctx.fillStyle = '#3ddc97'
  ctx.fillText('GROUND', tx, cy)
  tx += ctx.measureText('GROUND').width + 16
  ctx.font = `800 26px ${font}`
  const chipW = ctx.measureText('별내').width + 26
  roundRectPath(ctx, tx, cy - 21, chipW, 42, 21)
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText('별내', tx + 13, cy + 1)
  ctx.textAlign = 'right'
  ctx.font = `900 32px ${font}`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(t.tag, W - 110, cy - 18)
  ctx.font = `600 24px ${font}`
  ctx.globalAlpha = 0.75
  ctx.fillText(t.shotOn, W - 110, cy + 22)
  ctx.restore()
}

// ───────────────────────── 내보내기 ─────────────────────────

export type LaterBgId = 'city' | 'sky'

const BG: Record<LaterBgId, (a: LaterArtContext) => void> = { city: cityBg, sky: skyBg }

/** 사람 뒤 — 임시 코드 그림(미리 만든 webp 가 없을 때) */
export function drawLaterBackground(a: LaterArtContext, id: LaterBgId) {
  a.ctx.save()
  BG[id](a)
  a.ctx.restore()
}

/** 사람 앞 — 반짝이 · 타임캡슐 틀 · 편지 카드 · 아래 도장 */
export function drawLaterFront(a: LaterArtContext, t: LaterTexts) {
  const { ctx } = a
  ctx.save()
  sparkles(a)
  capsuleFrame(a)
  letterCard(a, t)
  stamp(a, t)
  ctx.restore()
}
