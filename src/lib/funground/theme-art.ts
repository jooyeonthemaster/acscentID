// 테마 포토 「THEME!」 코드 그림 — 배경(사람 뒤)과 앞 장식(사람 앞). 1200×1800 좌표로 그린다(견본은 줄여서).
// 배경은 미리 만든 webp(scripts/funground-theme-backgrounds.ts)가 있으면 그것을 쓰고, 이 그림은 그때까지 쓰는 임시 그림이다.
// 앞 장식은 늘 이 코드 그림 — 가운데 아래(사람 자리)는 비우고 위 · 양옆 · 아래 띠에만 둔다. 실제 상표 · 로고는 넣지 않는다.
// 무작위 장식(꽃가루 · 관중 · 별)은 씨앗 고정 난수라 같은 테마는 늘 같은 그림이다.

import { roundRectPath } from '@/lib/photobooth/compose'
import type { ThemeInfo } from './theme-photo'

export interface ArtContext {
  ctx: CanvasRenderingContext2D
  W: number
  H: number
  font: string
  date: string
  theme: ThemeInfo
  /** 합성한 사람이 (x, y) 반경 r 안에 있는가 — 있으면 앞 장식이 그 자리를 비운다. 견본(사람 없음)에서는 없음 → 기본 사람 자리 */
  people?: (x: number, y: number, r: number) => boolean
}

type Stop = [number, string]

// ───────────────────────── 보조 ─────────────────────────

/** 씨앗 고정 난수(mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function linear(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: Stop[]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const [o, c] of stops) g.addColorStop(o, c)
  return g
}

/** 빛 번짐(더하기 합성) */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.restore()
}

/** 네 갈래 반짝이 */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + r * 0.14, y - r * 0.14, x + r, y)
  ctx.quadraticCurveTo(x + r * 0.14, y + r * 0.14, x, y + r)
  ctx.quadraticCurveTo(x - r * 0.14, y + r * 0.14, x - r, y)
  ctx.quadraticCurveTo(x - r * 0.14, y - r * 0.14, x, y - r)
  ctx.fillStyle = color
  ctx.fill()
}

/** 다섯 꼭지 별 */
function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot = 0) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5
    if (i === 0) ctx.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a))
    else ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a))
  }
  ctx.closePath()
}

/** 전체를 칠하고 가운데 둥근 사각 창을 뚫는 경로(evenodd 로 칠한다) — roundRectPath 는 새 경로를 열어 여기엔 못 쓴다 */
function windowFramePath(ctx: CanvasRenderingContext2D, W: number, H: number, inset: number, radius: number) {
  ctx.beginPath()
  ctx.rect(0, 0, W, H)
  if (typeof ctx.roundRect === 'function') ctx.roundRect(inset, inset, W - inset * 2, H - inset * 2, radius)
  else ctx.rect(inset, inset, W - inset * 2, H - inset * 2)
}

/** 사람 자리(가운데 아래) — 견본에서 앞 장식이 피하는 곳 */
function inPeopleZone(W: number, H: number, x: number, y: number) {
  return x > W * 0.17 && x < W * 0.83 && y > H * 0.3
}

/** 앞 장식을 (x, y) 반경 r 에 둬도 되는가 — 사람(얼굴 · 몸) 위에는 아무것도 얹지 않는다 */
function free(a: ArtContext, x: number, y: number, r: number) {
  return a.people ? !a.people(x, y, r) && !(inPeopleZone(a.W, a.H, x, y) && y > a.H * 0.55 && x > a.W * 0.3 && x < a.W * 0.7) : !inPeopleZone(a.W, a.H, x, y)
}

/** 위에 걸린 삼각 깃발 줄 */
function bunting(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, sag: number, colors: string[], size = 58) {
  const at = (t: number) => ({ x: x0 + (x1 - x0) * t, y: y + sag * 4 * t * (1 - t) })
  ctx.save()
  ctx.strokeStyle = 'rgba(40,30,30,0.7)'
  ctx.lineWidth = 4
  ctx.beginPath()
  for (let i = 0; i <= 40; i++) {
    const p = at(i / 40)
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
  const n = Math.round(Math.abs(x1 - x0) / (size * 1.25))
  for (let i = 0; i < n; i++) {
    const a = at((i + 0.15) / n)
    const b = at((i + 0.85) / n)
    const mid = at((i + 0.5) / n)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(mid.x, mid.y + size * 1.15)
    ctx.closePath()
    ctx.fillStyle = colors[i % colors.length]
    ctx.shadowColor = 'rgba(0,0,0,0.25)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 4
    ctx.fill()
  }
  ctx.restore()
}

/** 원근 바닥 줄(소실점에서 퍼지는 선 + 갈수록 넓어지는 가로선) */
function perspectiveFloor(ctx: CanvasRenderingContext2D, W: number, top: number, H: number, vy: number, color: string, rays = 14, rows = 9) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, top, W, H - top)
  ctx.clip()
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  for (let i = -rays; i <= rays; i++) {
    ctx.beginPath()
    ctx.moveTo(W / 2, vy)
    ctx.lineTo(W / 2 + i * (W / rays) * 1.6, H + 200)
    ctx.stroke()
  }
  for (let k = 1; k <= rows; k++) {
    const y = top + (H - top) * Math.pow(k / rows, 1.7)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  ctx.restore()
}

// ───────────────────────── 아래 도장(모든 테마 공통) ─────────────────────────

/**
 * 아래 가운데 도장 — 「FUN GROUND 별내」 · 「THEME! · 테마 이름」 · 날짜.
 * dark = 어두운 판(밝은 글자), 아니면 흰 판.
 */
function stamp(a: ArtContext, { dark = true, accent }: { dark?: boolean; accent?: string } = {}) {
  const { ctx, W, H, font, date, theme } = a
  const w = 880
  const h = 88
  const x = (W - w) / 2
  const y = H - h - 30
  ctx.save()
  roundRectPath(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = dark ? 'rgba(12,14,28,0.78)' : 'rgba(255,255,255,0.94)'
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 4
  ctx.strokeStyle = accent ?? theme.color
  ctx.stroke()

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const cy = y + h / 2 + 2
  let tx = x + 42
  ctx.font = `800 38px ${font}`
  ctx.fillStyle = '#ff6b2c'
  ctx.fillText('FUN', tx, cy)
  tx += ctx.measureText('FUN ').width
  ctx.fillStyle = dark ? '#3ddc97' : '#18a874'
  ctx.fillText('GROUND', tx, cy)
  tx += ctx.measureText('GROUND').width + 14
  ctx.font = `800 24px ${font}`
  const chipW = ctx.measureText('별내').width + 24
  roundRectPath(ctx, tx, cy - 19, chipW, 38, 19)
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.16)' : 'rgba(23,33,58,0.08)'
  ctx.fill()
  ctx.fillStyle = dark ? '#ffffff' : '#17213a'
  ctx.fillText('별내', tx + 12, cy + 1)

  ctx.textAlign = 'right'
  const rx = x + w - 42
  ctx.font = `800 26px ${font}`
  ctx.fillStyle = dark ? '#ffffff' : '#17213a'
  ctx.fillText(`THEME! · ${theme.name}`, rx, cy - 14)
  ctx.font = `600 21px ${font}`
  ctx.globalAlpha = 0.72
  ctx.fillText(date, rx, cy + 17)
  ctx.restore()
}

// ───────────────────────── 1. 아이돌 무대 ─────────────────────────

function idolBg({ ctx, W, H }: ArtContext) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#14052e'], [0.45, '#3b0c63'], [0.68, '#1c0636'], [1, '#07020f']])
  ctx.fillRect(0, 0, W, H)

  // LED 벽 — 가운데서 퍼지는 고리 + 빛살 무늬
  const wx = 70, wy = 210, ww = W - 140, wh = 960, cell = 30
  ctx.fillStyle = '#08020f'
  roundRectPath(ctx, wx - 12, wy - 12, ww + 24, wh + 24, 18)
  ctx.fill()
  const ox = W / 2, oy = wy + wh * 0.5
  for (let y = wy; y < wy + wh; y += cell) {
    for (let x = wx; x < wx + ww; x += cell) {
      const dx = x + cell / 2 - ox
      const dy = y + cell / 2 - oy
      const d = Math.hypot(dx, dy)
      const ang = Math.atan2(dy, dx)
      const v = 0.5 + 0.5 * Math.sin(d * 0.03 - 1.2) * (0.6 + 0.4 * Math.cos(ang * 6))
      const hue = 285 + 45 * Math.sin(ang * 2 + d * 0.004)
      ctx.fillStyle = `hsla(${hue}, 95%, ${28 + v * 42}%, ${0.25 + v * 0.7})`
      ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6)
    }
  }
  glow(ctx, ox, oy, 520, 'rgba(255,90,200,0.55)')
  glow(ctx, ox, oy - 80, 260, 'rgba(255,255,255,0.35)')

  // 조명 빛줄기
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const beams: [number, number, string][] = [[140, 0.25, '#ff6ad5'], [380, 0.1, '#9b7bff'], [600, 0, '#ffffff'], [820, -0.1, '#5ee6ff'], [1060, -0.25, '#ff6ad5']]
  for (const [bx, tilt, color] of beams) {
    const tx = bx + tilt * 1300
    ctx.beginPath()
    ctx.moveTo(bx - 14, 80)
    ctx.lineTo(bx + 14, 80)
    ctx.lineTo(tx + 190, 1350)
    ctx.lineTo(tx - 190, 1350)
    ctx.closePath()
    const g = ctx.createLinearGradient(bx, 80, tx, 1350)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.2
    ctx.fillStyle = g
    ctx.fill()
  }
  ctx.restore()

  // 무대 바닥
  const top = 1180
  ctx.fillStyle = linear(ctx, 0, top, 0, H, [[0, '#2c0b4a'], [1, '#090214']])
  ctx.fillRect(0, top, W, H - top)
  perspectiveFloor(ctx, W, top, H, 760, 'rgba(255,120,220,0.16)')
  ctx.save()
  ctx.shadowColor = '#ff5ccf'
  ctx.shadowBlur = 30
  ctx.fillStyle = '#ff9be4'
  ctx.fillRect(0, top - 4, W, 8)
  ctx.restore()
  glow(ctx, W / 2, 1320, 700, 'rgba(255,200,255,0.18)')
}

function idolFront(a: ArtContext) {
  const { ctx, W, H } = a
  // 위 트러스 + 조명
  ctx.fillStyle = linear(ctx, 0, 0, 0, 92, [[0, '#2a2a36'], [1, '#121219']])
  ctx.fillRect(0, 0, W, 92)
  ctx.strokeStyle = 'rgba(200,200,220,0.35)'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let x = 0; x <= W; x += 46) {
    ctx.moveTo(x, 12)
    ctx.lineTo(x + 23, 80)
    ctx.lineTo(x + 46, 12)
  }
  ctx.stroke()
  for (let x = 100; x < W; x += 200) {
    ctx.fillStyle = '#1b1b24'
    roundRectPath(ctx, x - 30, 70, 60, 46, 10)
    ctx.fill()
    glow(ctx, x, 118, 90, x % 400 === 100 ? 'rgba(255,120,220,0.9)' : 'rgba(140,220,255,0.9)')
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, 112, 13, 0, Math.PI * 2)
    ctx.fill()
  }

  // 꽃가루 — 사람 자리는 비운다
  const r = rng(11)
  const colors = ['#ff4fb8', '#ffd34d', '#5ee6ff', '#ffffff', '#b07bff']
  for (let i = 0; i < 170; i++) {
    const x = r() * W
    const y = 120 + r() * (H - 340)
    if (!free(a, x, y, 34)) continue
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(r() * Math.PI)
    ctx.fillStyle = colors[i % colors.length]
    ctx.globalAlpha = 0.85
    if (i % 3 === 0) {
      ctx.beginPath()
      ctx.arc(0, 0, 6 + r() * 5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillRect(-7, -14, 12 + r() * 6, 24 + r() * 10)
    }
    ctx.restore()
  }
  for (let i = 0; i < 12; i++) {
    const x = r() * W
    const y = 140 + r() * 700
    if (free(a, x, y, 34)) sparkle(ctx, x, y, 14 + r() * 18, '#fff7c2')
  }

  // 무대 앞 띠 + 발 조명
  ctx.fillStyle = linear(ctx, 0, H - 180, 0, H, [[0, 'rgba(18,4,31,0.0)'], [0.35, 'rgba(18,4,31,0.92)'], [1, '#0b0214']])
  ctx.fillRect(0, H - 180, W, 180)
  for (let x = 40; x < W; x += 80) {
    if (free(a, x, H - 172, 46)) glow(ctx, x, H - 172, 46, x % 160 === 40 ? 'rgba(255,110,210,0.9)' : 'rgba(255,255,255,0.8)')
  }
  stamp(a, { accent: '#ff6ad5' })
}

// ───────────────────────── 2. 경기장 ─────────────────────────

function stadiumBg({ ctx, W, H }: ArtContext) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#050f29'], [0.3, '#12306a'], [0.45, '#1d4a8a'], [1, '#0d2a52']])
  ctx.fillRect(0, 0, W, H)
  const r = rng(23)
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`
    ctx.fillRect(r() * W, r() * 420, 2, 2)
  }

  // 관중석 — 층마다 색 점(관중)
  const standTop = 540, standBottom = 1080
  ctx.fillStyle = '#0e1630'
  ctx.fillRect(0, standTop - 40, W, 40)
  ctx.fillStyle = '#18213f'
  ctx.fillRect(0, standTop, W, standBottom - standTop)
  const crowd = ['#e5484d', '#ffffff', '#ffd23f', '#3b82f6', '#f97316', '#22c55e', '#ec4899', '#2a3352', '#2a3352']
  for (let y = standTop + 8; y < standBottom - 6; y += 11) {
    const depth = (y - standTop) / (standBottom - standTop)
    const step = 8 + depth * 4
    for (let x = (y % 2) * 4; x < W; x += step) {
      ctx.fillStyle = crowd[Math.floor(r() * crowd.length)]
      ctx.globalAlpha = 0.55 + depth * 0.35
      ctx.beginPath()
      ctx.arc(x + r() * 3, y, 2.6 + depth * 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  ctx.strokeStyle = 'rgba(190,205,240,0.35)'
  ctx.lineWidth = 4
  for (const y of [680, 820, 960]) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  // 광고판 자리(글자 없음)
  ctx.fillStyle = linear(ctx, 0, 0, W, 0, [[0, '#0f7a3c'], [0.5, '#ffd23f'], [1, '#0f7a3c']])
  ctx.globalAlpha = 0.85
  ctx.fillRect(0, standBottom - 34, W, 34)
  ctx.globalAlpha = 1

  // 경기장 잔디 — 깎은 줄무늬 + 하얀 선
  const top = standBottom
  ctx.fillStyle = linear(ctx, 0, top, 0, H, [[0, '#2f9e4a'], [1, '#1b6e31']])
  ctx.fillRect(0, top, W, H - top)
  const rows = 9
  for (let k = 0; k < rows; k += 2) {
    const y0 = top + (H - top) * Math.pow(k / rows, 1.5)
    const y1 = top + (H - top) * Math.pow((k + 1) / rows, 1.5)
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.fillRect(0, y0, W, y1 - y0)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(0, 1230)
  ctx.lineTo(W, 1230)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(W / 2, 1230, 280, 80, 0, 0, Math.PI * 2)
  ctx.stroke()

  // 조명탑
  for (const x of [150, 1050]) {
    ctx.fillStyle = '#2a3554'
    ctx.fillRect(x - 10, 200, 20, 360)
    ctx.fillStyle = '#1b2440'
    roundRectPath(ctx, x - 110, 110, 220, 120, 12)
    ctx.fill()
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = '#fffbe6'
        ctx.beginPath()
        ctx.arc(x - 78 + i * 52, 145 + j * 50, 18, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    glow(ctx, x, 170, 420, 'rgba(255,250,220,0.75)')
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.09
    ctx.fillStyle = '#fffbe0'
    ctx.beginPath()
    ctx.moveTo(x - 100, 220)
    ctx.lineTo(x + 100, 220)
    ctx.lineTo(W / 2 + (x < W / 2 ? 200 : -200), 1500)
    ctx.lineTo(W / 2 + (x < W / 2 ? -500 : 500), 1500)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

function stadiumFront(a: ArtContext) {
  const { ctx, W, H } = a
  bunting(ctx, -20, W + 20, 26, 90, ['#e5484d', '#ffffff', '#2563eb', '#ffd23f'])
  // 금빛 리본 꽃가루
  const r = rng(37)
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < 60; i++) {
    const x = r() * W
    const y = 150 + r() * (H - 380)
    if (!free(a, x + 6, y + 23, 34)) continue
    ctx.strokeStyle = ['#ffd23f', '#fff1b8', '#ffffff', '#e5484d'][i % 4]
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(x + 18, y + 14, x - 18, y + 28, x + 6, y + 46)
    ctx.stroke()
  }
  ctx.restore()
  for (let i = 0; i < 10; i++) {
    const x = r() * W
    const y = 180 + r() * 600
    if (free(a, x, y, 32)) {
      ctx.save()
      starPath(ctx, x, y, 16 + r() * 14, r())
      ctx.fillStyle = '#ffd23f'
      ctx.fill()
      ctx.restore()
    }
  }
  // 아래 광고판 띠(글자 없음)
  ctx.fillStyle = linear(ctx, 0, H - 190, 0, H, [[0, 'rgba(7,18,45,0)'], [0.3, 'rgba(7,18,45,0.94)'], [1, '#06102a']])
  ctx.fillRect(0, H - 190, W, 190)
  ctx.fillStyle = linear(ctx, 0, 0, W, 0, [[0, '#22c55e'], [0.5, '#ffd23f'], [1, '#22c55e']])
  ctx.fillRect(0, H - 182, W, 8)
  stamp(a, { accent: '#ffd23f' })
}

// ───────────────────────── 3. 마법 학교 ─────────────────────────

/** 뾰족 아치 창 */
function archPath(ctx: CanvasRenderingContext2D, cx: number, w: number, top: number, bottom: number) {
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const springY = top + w * 0.75
  ctx.beginPath()
  ctx.moveTo(x0, bottom)
  ctx.lineTo(x0, springY)
  ctx.quadraticCurveTo(x0, top + w * 0.15, cx, top)
  ctx.quadraticCurveTo(x1, top + w * 0.15, x1, springY)
  ctx.lineTo(x1, bottom)
  ctx.closePath()
}

function magicBg({ ctx, W, H }: ArtContext) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#0b0a26'], [0.5, '#221840'], [1, '#3a2236']])
  ctx.fillRect(0, 0, W, H)
  // 돌벽
  const r = rng(51)
  for (let y = 0, row = 0; y < 1260; y += 64, row++) {
    for (let x = row % 2 ? -75 : 0; x < W; x += 150) {
      ctx.fillStyle = `rgba(255,240,255,${0.015 + r() * 0.035})`
      ctx.fillRect(x + 3, y + 3, 144, 58)
    }
  }
  // 창 세 개 — 달빛
  const windows: [number, number, number, number][] = [[600, 440, 200, 1160], [170, 230, 380, 1080], [1030, 230, 380, 1080]]
  for (const [cx, w, top, bottom] of windows) {
    ctx.save()
    archPath(ctx, cx, w + 40, top - 26, bottom + 20)
    ctx.fillStyle = '#17112e'
    ctx.fill()
    archPath(ctx, cx, w, top, bottom)
    ctx.fillStyle = linear(ctx, 0, top, 0, bottom, [[0, '#86a8e6'], [0.55, '#3b5aa3'], [1, '#22336b']])
    ctx.fill()
    ctx.clip()
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`
      ctx.fillRect(cx - w / 2 + r() * w, top + r() * (bottom - top) * 0.6, 3, 3)
    }
    if (cx === 600) {
      glow(ctx, 680, 430, 260, 'rgba(255,250,210,0.8)')
      ctx.fillStyle = '#fbf7dc'
      ctx.beginPath()
      ctx.arc(680, 430, 82, 0, Math.PI * 2)
      ctx.fill()
    }
    // 창살
    ctx.strokeStyle = '#1a1433'
    ctx.lineWidth = w > 300 ? 12 : 9
    ctx.beginPath()
    ctx.moveTo(cx, top)
    ctx.lineTo(cx, bottom)
    for (let y = top + w * 0.8; y < bottom; y += (bottom - top) / 5) {
      ctx.moveTo(cx - w / 2, y)
      ctx.lineTo(cx + w / 2, y)
    }
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, top + w * 0.42, w * 0.18, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  // 걸린 깃발(별 · 달 무늬, 상징 없음)
  for (const [x, color] of [[388, '#7a1f3d'], [812, '#1f4a7a']] as [number, string][]) {
    ctx.fillStyle = '#c9a24a'
    ctx.fillRect(x - 74, 236, 148, 10)
    ctx.beginPath()
    ctx.moveTo(x - 64, 246)
    ctx.lineTo(x + 64, 246)
    ctx.lineTo(x + 64, 690)
    ctx.lineTo(x, 640)
    ctx.lineTo(x - 64, 690)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#c9a24a'
    ctx.lineWidth = 5
    ctx.stroke()
    starPath(ctx, x, 420, 38)
    ctx.fillStyle = '#e8c766'
    ctx.fill()
  }
  // 바닥 — 따뜻한 빛 웅덩이
  const top = 1240
  ctx.fillStyle = linear(ctx, 0, top, 0, H, [[0, '#3a2536'], [1, '#140b16']])
  ctx.fillRect(0, top, W, H - top)
  perspectiveFloor(ctx, W, top, H, 820, 'rgba(255,210,150,0.1)', 10, 7)
  glow(ctx, W / 2, 1420, 620, 'rgba(255,170,90,0.22)')
  // 가장자리 어둡게 — 배경에만(사람 위에는 칠하지 않는다)
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.48, H * 0.75)
  v.addColorStop(0, 'rgba(8,4,24,0)')
  v.addColorStop(1, 'rgba(8,4,24,0.6)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
}

function magicFront(a: ArtContext) {
  const { ctx, W, H } = a
  // 떠 있는 촛불
  const r = rng(67)
  const candles: [number, number, number][] = []
  for (let i = 0; i < 40 && candles.length < 17; i++) {
    const x = 50 + r() * (W - 100)
    const y = 110 + r() * 520
    const s = 0.6 + r() * 0.55
    if (!free(a, x, y + 30, 80)) continue
    if (candles.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < 110)) continue
    candles.push([x, y, s])
  }
  candles.sort((p, q) => p[2] - q[2])
  for (const [x, y, s] of candles) {
    const w = 30 * s
    const h = 110 * s
    glow(ctx, x, y - 8 * s, 110 * s, 'rgba(255,200,110,0.55)')
    ctx.fillStyle = linear(ctx, x - w / 2, 0, x + w / 2, 0, [[0, '#e6d3a5'], [0.4, '#fff8e3'], [1, '#d2bc8a']])
    roundRectPath(ctx, x - w / 2, y, w, h, 5 * s)
    ctx.fill()
    ctx.fillStyle = '#fff8e3'
    ctx.beginPath()
    ctx.ellipse(x, y + 2, w / 2, 5 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x, y - 34 * s)
    ctx.quadraticCurveTo(x + 11 * s, y - 12 * s, x, y - 3 * s)
    ctx.quadraticCurveTo(x - 11 * s, y - 12 * s, x, y - 34 * s)
    ctx.fillStyle = '#ffd56b'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x, y - 11 * s, 3.5 * s, 7 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#fffbe8'
    ctx.fill()
  }
  // 반짝이
  for (let i = 0; i < 34; i++) {
    const x = r() * W
    const y = 80 + r() * (H - 300)
    if (!free(a, x, y, 22)) continue
    sparkle(ctx, x, y, 6 + r() * 14, i % 3 ? '#ffe7a0' : '#ffffff')
  }
  // 아래 띠 — 보랏빛 벨벳 + 금선
  ctx.fillStyle = linear(ctx, 0, H - 190, 0, H, [[0, 'rgba(36,18,70,0)'], [0.3, 'rgba(36,18,70,0.95)'], [1, '#1c0f38']])
  ctx.fillRect(0, H - 190, W, 190)
  ctx.fillStyle = '#c9a24a'
  ctx.fillRect(0, H - 180, W, 4)
  ctx.fillRect(0, H - 170, W, 2)
  stamp(a, { accent: '#e8c766' })
}

// ───────────────────────── 4. 우주 정거장 ─────────────────────────

function spaceBg({ ctx, W, H }: ArtContext) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#02030c'], [0.55, '#080f2e'], [1, '#120a30']])
  ctx.fillRect(0, 0, W, H)
  glow(ctx, 300, 520, 560, 'rgba(123,63,228,0.4)')
  glow(ctx, 920, 780, 500, 'rgba(31,182,201,0.3)')
  glow(ctx, 720, 280, 380, 'rgba(224,70,154,0.25)')
  const r = rng(83)
  for (let i = 0; i < 650; i++) {
    const s = r() < 0.92 ? 1 + r() * 1.6 : 2.6 + r() * 1.6
    ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`
    ctx.beginPath()
    ctx.arc(r() * W, r() * H * 0.75, s, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 10; i++) {
    const x = r() * W
    const y = r() * H * 0.6
    glow(ctx, x, y, 34, 'rgba(200,230,255,0.9)')
    sparkle(ctx, x, y, 22, 'rgba(255,255,255,0.9)')
  }
  // 고리 행성(왼쪽 위)
  const px = 260, py = 360, pr = 112
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(-0.38)
  ctx.strokeStyle = 'rgba(240,210,160,0.75)'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.ellipse(0, 0, 220, 50, 0, Math.PI, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  const pg = ctx.createRadialGradient(px - 40, py - 40, 10, px, py, pr)
  pg.addColorStop(0, '#ffe2b0')
  pg.addColorStop(0.6, '#e09a5a')
  pg.addColorStop(1, '#7a3f2a')
  ctx.fillStyle = pg
  ctx.beginPath()
  ctx.arc(px, py, pr, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(-0.38)
  ctx.strokeStyle = 'rgba(250,225,180,0.85)'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.ellipse(0, 0, 220, 50, 0, 0, Math.PI)
  ctx.stroke()
  ctx.restore()
  // 아래 푸른 행성 지평선
  const cx = W / 2, cy = H + 980, R = 1560
  glow(ctx, cx, cy, R + 160, 'rgba(90,190,255,0.5)')
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  const eg = ctx.createRadialGradient(cx - 300, cy - R, 100, cx, cy, R)
  eg.addColorStop(0, '#7fd3ff')
  eg.addColorStop(0.12, '#2c7fd0')
  eg.addColorStop(0.35, '#164a8f')
  eg.addColorStop(1, '#071a3a')
  ctx.fillStyle = eg
  ctx.fill()
  ctx.clip()
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.2})`
    ctx.beginPath()
    ctx.ellipse(r() * W, cy - R + 40 + r() * 400, 120 + r() * 200, 16 + r() * 18, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  ctx.strokeStyle = 'rgba(150,230,255,0.85)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(cx, cy, R, Math.PI * 1.2, Math.PI * 1.8)
  ctx.stroke()
}

function spaceFront(a: ArtContext) {
  const { ctx, W, H, font } = a
  // 정거장 둥근 창틀 — 금속 판에 둥근 사각 창을 뚫는다
  const inset = 48
  const radius = 150
  ctx.save()
  windowFramePath(ctx, W, H, inset, radius)
  ctx.fillStyle = linear(ctx, 0, 0, W, H, [[0, '#dfe5ee'], [0.35, '#8e98ab'], [0.6, '#cfd6e2'], [1, '#6f7a8f']])
  ctx.fill('evenodd')
  ctx.restore()
  ctx.save()
  roundRectPath(ctx, inset, inset, W - inset * 2, H - inset * 2, radius)
  ctx.lineWidth = 12
  ctx.strokeStyle = '#2f3746'
  ctx.stroke()
  roundRectPath(ctx, inset + 9, inset + 9, W - inset * 2 - 18, H - inset * 2 - 18, radius - 9)
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(160,230,255,0.7)'
  ctx.stroke()
  ctx.restore()
  // 볼트
  const bolt = (x: number, y: number) => {
    ctx.fillStyle = '#5c6679'
    ctx.beginPath()
    ctx.arc(x, y, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#eef2f8'
    ctx.beginPath()
    ctx.arc(x - 2, y - 2, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let x = 200; x < W - 150; x += 200) { bolt(x, inset / 2); bolt(x, H - inset / 2) }
  for (let y = 220; y < H - 150; y += 220) { bolt(inset / 2, y); bolt(W - inset / 2, y) }
  // 창 안쪽 표시(HUD) — 모서리 꺾쇠 + 작은 글자
  ctx.save()
  ctx.strokeStyle = 'rgba(127,216,255,0.85)'
  ctx.lineWidth = 5
  const c = 90
  for (const [x, y, sx, sy] of [[inset + 70, inset + 70, 1, 1], [W - inset - 70, inset + 70, -1, 1]] as const) {
    ctx.beginPath()
    ctx.moveTo(x, y + sy * c)
    ctx.lineTo(x, y)
    ctx.lineTo(x + sx * c, y)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(127,216,255,0.9)'
  ctx.font = `700 24px ${font}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText('FUN GROUND STATION', inset + 90, inset + 104)
  ctx.textAlign = 'right'
  ctx.fillText('ORBIT 09–19 · O₂ OK', W - inset - 90, inset + 104)
  ctx.restore()
  // 아래 조종판
  const top = H - 160
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, top + 30)
  ctx.lineTo(160, top)
  ctx.lineTo(W - 160, top)
  ctx.lineTo(W, top + 30)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fillStyle = linear(ctx, 0, top, 0, H, [[0, '#9aa4b6'], [0.15, '#5a6478'], [1, '#2b3242']])
  ctx.fill()
  ctx.restore()
  const r = rng(97)
  const lights = ['#3ddc97', '#ff5c8a', '#ffc83d', '#7fd8ff']
  for (let x = 80; x < W - 60; x += 46) {
    if (x > 120 && x < W - 120) {
      ctx.fillStyle = lights[Math.floor(r() * lights.length)]
      ctx.globalAlpha = 0.5 + r() * 0.5
      roundRectPath(ctx, x, top + 12, 26, 10, 4)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  stamp(a, { accent: '#7fd8ff' })
}

// ───────────────────────── 5. 놀이공원 ─────────────────────────

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  for (const [dx, dy, rr] of [[0, 0, 60], [60, -24, 70], [128, 0, 56], [64, 18, 58]]) {
    ctx.beginPath()
    ctx.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2)
    ctx.fill()
  }
}

function parkBg({ ctx, W, H }: ArtContext) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#4cbcff'], [0.42, '#a6e3ff'], [0.68, '#ffe0ee'], [1, '#ffd9c0']])
  ctx.fillRect(0, 0, W, H)
  glow(ctx, 1010, 230, 300, 'rgba(255,250,200,0.9)')
  ctx.fillStyle = '#fff7c8'
  ctx.beginPath()
  ctx.arc(1010, 230, 86, 0, Math.PI * 2)
  ctx.fill()
  cloud(ctx, 120, 260, 1.1)
  cloud(ctx, 640, 170, 0.9)
  cloud(ctx, 860, 560, 0.8)

  // 대관람차
  const cx = 370, cy = 760, R = 360
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx - 250, 1280)
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + 250, 1280)
  ctx.stroke()
  ctx.lineWidth = 5
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R)
    ctx.stroke()
  }
  ctx.lineWidth = 14
  ctx.strokeStyle = '#ff7aa8'
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 6
  ctx.strokeStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, cy, R - 46, 0, Math.PI * 2)
  ctx.stroke()
  const cabins = ['#ff5c8a', '#ffc83d', '#3a9bff', '#18a874', '#a66bff', '#ff8a3d']
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2 + 0.13
    const x = cx + Math.cos(t) * R
    const y = cy + Math.sin(t) * R
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + 26)
    ctx.stroke()
    ctx.fillStyle = cabins[i % cabins.length]
    roundRectPath(ctx, x - 30, y + 22, 60, 52, 16)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillRect(x - 20, y + 32, 40, 14)
  }
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, cy, 30, 0, Math.PI * 2)
  ctx.fill()

  // 회전목마
  const mx = 935, roofY = 820
  ctx.fillStyle = '#fff3e6'
  ctx.fillRect(mx - 190, roofY + 120, 380, 260)
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#d9a95a'
    ctx.fillRect(mx - 160 + i * 80, roofY + 120, 10, 260)
  }
  const segs = 8
  for (let i = 0; i < segs; i++) {
    ctx.beginPath()
    ctx.moveTo(mx, roofY - 120)
    ctx.lineTo(mx - 230 + (460 / segs) * i, roofY + 120)
    ctx.lineTo(mx - 230 + (460 / segs) * (i + 1), roofY + 120)
    ctx.closePath()
    ctx.fillStyle = i % 2 ? '#ffffff' : '#ff4f6d'
    ctx.fill()
  }
  for (let i = 0; i < segs; i++) {
    ctx.beginPath()
    ctx.arc(mx - 230 + (460 / segs) * (i + 0.5), roofY + 120, 460 / segs / 2, 0, Math.PI)
    ctx.fillStyle = i % 2 ? '#ff4f6d' : '#ffffff'
    ctx.fill()
  }
  ctx.fillStyle = '#ffc83d'
  ctx.beginPath()
  ctx.arc(mx, roofY - 128, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f2c99a'
  ctx.beginPath()
  ctx.ellipse(mx, roofY + 382, 210, 30, 0, 0, Math.PI * 2)
  ctx.fill()

  // 나무 · 땅
  const r = rng(113)
  for (let x = -40; x < W + 40; x += 70) {
    ctx.fillStyle = r() > 0.5 ? '#3fb36b' : '#2f9e5a'
    ctx.beginPath()
    ctx.arc(x, 1240 + r() * 20, 50 + r() * 30, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = linear(ctx, 0, 1250, 0, H, [[0, '#f6dcc0'], [1, '#e5b892']])
  ctx.fillRect(0, 1250, W, H - 1250)
  perspectiveFloor(ctx, W, 1250, H, 900, 'rgba(160,100,60,0.14)', 9, 6)
}

function parkFront(a: ArtContext) {
  const { ctx, W, H } = a
  bunting(ctx, -20, W + 20, 30, 80, ['#ff5c8a', '#ffc83d', '#3a9bff', '#18a874', '#a66bff'])
  // 풍선 — 양옆에 묶음
  const r = rng(131)
  const colors = ['#ff4f6d', '#ffc83d', '#3a9bff', '#18a874', '#a66bff', '#ff8a3d', '#ff7ad9']
  for (const side of [-1, 1]) {
    const knotX = side < 0 ? 120 : W - 120
    const knotY = 1420
    const balloons: [number, number][] = []
    for (let i = 0; i < 7; i++) {
      const bx = (side < 0 ? 40 : W - 220) + r() * 180
      const by = 300 + i * 95 + r() * 60
      if (free(a, bx, by + 6, 74)) balloons.push([bx, by])
    }
    for (const [bx, by] of balloons) {
      ctx.strokeStyle = 'rgba(80,60,60,0.55)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(bx, by + 66)
      ctx.quadraticCurveTo((bx + knotX) / 2 + side * 30, (by + knotY) / 2, knotX, knotY)
      ctx.stroke()
    }
    balloons.forEach(([bx, by], i) => {
      const color = colors[(i * 3 + (side > 0 ? 2 : 0)) % colors.length]
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.18)'
      ctx.shadowBlur = 14
      ctx.shadowOffsetY = 6
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(bx, by, 54, 66, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.beginPath()
      ctx.moveTo(bx - 9, by + 72)
      ctx.lineTo(bx + 9, by + 72)
      ctx.lineTo(bx, by + 62)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.beginPath()
      ctx.ellipse(bx - 18, by - 24, 11, 20, -0.5, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  // 아래 사탕 줄무늬 띠
  const top = H - 150
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, top + 20)
  for (let x = 0; x <= W; x += 60) ctx.arc(x + 30, top + 20, 30, Math.PI, 0)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.clip()
  ctx.fillStyle = '#ff4f6d'
  for (let x = -H; x < W + 200; x += 70) {
    ctx.beginPath()
    ctx.moveTo(x, H)
    ctx.lineTo(x + 35, H)
    ctx.lineTo(x + 35 + 200, top - 20)
    ctx.lineTo(x + 200, top - 20)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  stamp(a, { accent: '#ff4f6d' })
}

// ───────────────────────── 6. 펀그라운드 기념 ─────────────────────────

function fungroundBg({ ctx, W, H, font }: ArtContext) {
  ctx.fillStyle = '#fff4e6'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(23,33,58,0.09)'
  for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) ctx.fillRect(x, y, 4, 4)
  const blobs: [number, number, number, string][] = [
    [170, 360, 270, '#ff6b2c'], [1090, 620, 300, '#18a874'], [110, 1180, 230, '#3a9bff'], [1040, 1330, 210, '#ffc83d'], [640, 140, 130, '#ff5c8a'],
  ]
  for (const [x, y, rr, c] of blobs) {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(x, y, rr, 0, Math.PI * 2)
    ctx.fill()
  }
  // 구불 선
  ctx.lineCap = 'round'
  const squiggle = (x: number, y: number, len: number, color: string, w = 16) => {
    ctx.strokeStyle = color
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let i = 1; i <= 6; i++) ctx.quadraticCurveTo(x + (len / 6) * (i - 0.5), y + (i % 2 ? -34 : 34), x + (len / 6) * i, y)
    ctx.stroke()
  }
  squiggle(420, 470, 420, '#17213a', 12)
  squiggle(60, 820, 300, '#ffffff', 18)
  squiggle(860, 1020, 300, '#ffffff', 18)
  // 큰 글자(외곽선)
  ctx.save()
  ctx.font = `800 250px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.lineWidth = 8
  ctx.strokeStyle = 'rgba(23,33,58,0.85)'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText('FUN', W / 2, 400)
  ctx.strokeText('FUN', W / 2, 400)
  ctx.font = `800 190px ${font}`
  ctx.fillText('GROUND', W / 2, 600)
  ctx.strokeText('GROUND', W / 2, 600)
  ctx.restore()
  // 바닥
  ctx.fillStyle = linear(ctx, 0, 1300, 0, H, [[0, 'rgba(255,200,61,0)'], [1, 'rgba(255,170,60,0.45)']])
  ctx.fillRect(0, 1300, W, H - 1300)
}

function fungroundFront(a: ArtContext) {
  const { ctx, W, H, font } = a
  // 굵은 흰 테두리 + 안쪽 점선
  const b = 34
  ctx.save()
  windowFramePath(ctx, W, H, b, 46)
  ctx.fillStyle = '#ffffff'
  ctx.fill('evenodd')
  roundRectPath(ctx, b + 14, b + 14, W - b * 2 - 28, H - b * 2 - 28, 36)
  ctx.setLineDash([26, 18])
  ctx.lineWidth = 6
  ctx.strokeStyle = '#ff6b2c'
  ctx.stroke()
  ctx.restore()
  // 스티커(흰 테두리)
  const sticker = (x: number, y: number, size: number, draw: () => void) => {
    if (!free(a, x, y, size)) return
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.22)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 5
    ctx.lineJoin = 'round'
    draw()
    ctx.restore()
  }
  sticker(150, 180, 90, () => {
    starPath(ctx, 150, 180, 82, -0.2)
    ctx.lineWidth = 16
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    ctx.fillStyle = '#ffc83d'
    ctx.fill()
  })
  sticker(1060, 220, 80, () => {
    ctx.translate(1060, 220)
    ctx.rotate(0.18)
    ctx.beginPath()
    ctx.moveTo(0, 54)
    ctx.bezierCurveTo(-90, -6, -54, -78, 0, -26)
    ctx.bezierCurveTo(54, -78, 90, -6, 0, 54)
    ctx.lineWidth = 16
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    ctx.fillStyle = '#ff5c8a'
    ctx.fill()
  })
  sticker(140, 1330, 84, () => {
    ctx.translate(140, 1330)
    ctx.rotate(-0.12)
    ctx.beginPath()
    ctx.arc(0, 0, 76, 0, Math.PI * 2)
    ctx.lineWidth = 14
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    ctx.fillStyle = '#18a874'
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#fff'
    ctx.font = `800 40px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('별내', 0, -12)
    ctx.font = `800 22px ${font}`
    ctx.fillText('9–19', 0, 26)
  })
  sticker(1070, 1240, 74, () => {
    ctx.translate(1070, 1240)
    ctx.rotate(0.1)
    ctx.beginPath()
    ctx.arc(0, 0, 66, 0, Math.PI * 2)
    ctx.lineWidth = 14
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    ctx.fillStyle = '#3a9bff'
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(-22, -14, 9, 0, Math.PI * 2)
    ctx.arc(22, -14, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 8
    ctx.strokeStyle = '#fff'
    ctx.beginPath()
    ctx.arc(0, 6, 30, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  })
  // 아래 큰 기념 띠
  ctx.fillStyle = linear(ctx, 0, H - 230, 0, H, [[0, 'rgba(255,244,230,0)'], [0.45, 'rgba(255,244,230,0.95)'], [1, '#fff4e6']])
  ctx.fillRect(b, H - 230, W - b * 2, 230 - b)
  stamp(a, { dark: false, accent: '#ff6b2c' })
}

// ───────────────────────── 내보내기 ─────────────────────────

const ART: Record<ThemeInfo['id'], { bg: (a: ArtContext) => void; front: (a: ArtContext) => void }> = {
  idol: { bg: idolBg, front: idolFront },
  stadium: { bg: stadiumBg, front: stadiumFront },
  magic: { bg: magicBg, front: magicFront },
  space: { bg: spaceBg, front: spaceFront },
  park: { bg: parkBg, front: parkFront },
  funground: { bg: fungroundBg, front: fungroundFront },
}

/** 사람 뒤 — 임시 코드 그림(미리 만든 webp 가 없을 때) */
export function drawThemeBackground(a: ArtContext) {
  a.ctx.save()
  ART[a.theme.id].bg(a)
  a.ctx.restore()
}

/** 사람 앞 — 장식 + 아래 도장 */
export function drawThemeFront(a: ArtContext) {
  a.ctx.save()
  ART[a.theme.id].front(a)
  a.ctx.restore()
}
