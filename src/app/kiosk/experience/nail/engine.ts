// 네일 디자이너 — 사진 속 손의 뼈대(손 특징점 21개)에서 손톱 자리를 계산해 그 자리에만 색·패턴을 올린다.
// 손 모양·피부는 건드리지 않는다: 원본 픽셀 위에 손톱 모양의 색 층만 겹치고, 원본의 명암을 다시 얹어 입체가 남게 한다.
// 사진은 기기 안에서만 본다. 생성형 이미지 API 를 쓰지 않는다.

import { loadVision } from '../kx-vision'

export interface Nail {
  /** 손톱 가운데(사진 픽셀) */
  x: number
  y: number
  /** 손끝 방향(라디안) — 큐티클 → 끝 */
  angle: number
  width: number
  length: number
  /** 0 엄지 … 4 새끼 */
  finger: number
}

export interface HandShape {
  nails: Nail[]
  /** 손바닥 쪽이 보이는 것 같다 — 손등으로 다시 찍기를 권한다(막지는 않는다) */
  palm: boolean
  /** 화면에 크게 보여 줄 자리(손끝 중심, 5:4) */
  view: { x: number; y: number; w: number; h: number }
}

/** 화면·저장 그림에 쓰는 손 사진의 비율(가로/세로) */
export const NAIL_VIEW_RATIO = 5 / 4

// 손가락마다 [뿌리, 둘째 마디, 끝마디, 끝] 특징점 번호
const CHAINS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]]
// 손톱 폭 — 손 기준 길이(검지~새끼 뿌리 사이)에 대한 비율, 끝마디 길이에 대한 상한
// (2026-10-13 키움: 손톱이 넓은 손에서 4분의 3만 덮였다 — 가는 손과 넓은 손의 가운데쯤으로)
const WIDTH_BY_HAND = [0.19, 0.2, 0.21, 0.195, 0.16]
const WIDTH_BY_TIP = [0.54, 0.65, 0.6, 0.63, 0.65]
// 손가락 폭에서 손톱이 차지하는 비율(엄지는 옆으로 돌아 있어 좁게 보인다)
const NAIL_IN_FINGER = [0.6, 0.78, 0.78, 0.78, 0.78]
const LENGTH_RATIO = 1.3
/** 손끝을 못 읽었을 때 — 끝마디 특징점(손톱 가운데쯤)에서 손톱 끝까지, 폭에 대한 비율 */
const TIP_FROM_MARK = 0.61
/** 색 경계로 볼 차이 · 살색으로 볼 차이(RGB 거리) */
const EDGE = 42
const SKIN = 52
/** 손가락이 이만큼 펴져 있어야 손톱이 보인다(끝~뿌리 직선 / 마디 길이 합) */
const STRAIGHT = 0.85

/** 같은 사진을 조금씩 달리 보여 다시 찾는다 — [줄이는 비율, 돌리는 각도(도)]. 첫 시도가 대부분 통한다 */
const ATTEMPTS: [number, number][] = [[1, 0], [0.6, 0], [0.4, 0], [0.8, 14], [0.8, -14]]

/**
 * 손 특징점 21개(사진 픽셀 좌표)와 인식한 좌우.
 * 손 찾기는 같은 사진도 크기·기울기에 따라 놓치는 일이 있어(밝은 배경의 어두운 손 등), 못 찾으면 줄이거나 살짝 돌려 다시 본다.
 */
async function detectHand(photo: HTMLCanvasElement): Promise<{ marks: { x: number; y: number }[]; label: { name: string; score: number } | null } | null> {
  const engine = await loadVision('hand')
  const W = photo.width, H = photo.height
  for (const [scale, degrees] of ATTEMPTS) {
    let source = photo
    const angle = degrees * Math.PI / 180
    if (scale !== 1 || degrees) {
      source = document.createElement('canvas')
      source.width = Math.round(W * scale)
      source.height = Math.round(H * scale)
      const ctx = source.getContext('2d')!
      ctx.translate(source.width / 2, source.height / 2)
      ctx.rotate(angle)
      ctx.drawImage(photo, -source.width / 2, -source.height / 2, source.width, source.height)
    }
    const result = engine.detect(source)
    const found = result.landmarks[0]
    if (!found) continue
    const cos = Math.cos(-angle), sin = Math.sin(-angle)
    const marks = found.map((mark) => {
      // 돌려 본 좌표를 원래 사진 좌표로
      const x = (mark.x - 0.5) * W, y = (mark.y - 0.5) * H
      return { x: W / 2 + x * cos - y * sin, y: H / 2 + x * sin + y * cos }
    })
    const category = result.handedness?.[0]?.[0]
    return { marks, label: category ? { name: category.categoryName, score: category.score } : null }
  }
  return null
}

/**
 * 사진에서 손 하나의 손톱 자리를 찾는다. 손이 없으면 null.
 * 손톱의 방향·대략의 크기는 특징점으로 정하고, 배경과 구분되는 사진에서는 손가락 윤곽(폭·끝)을 읽어 다듬는다.
 * 윤곽을 못 읽으면(배경이 살색이거나 손가락이 붙어 있으면) 특징점 값 그대로 쓴다.
 */
export async function findNails(photo: HTMLCanvasElement): Promise<HandShape | null> {
  const found = await detectHand(photo)
  if (!found) return null
  const { marks, label } = found
  const W = photo.width, H = photo.height
  const px = photo.getContext('2d')!.getImageData(0, 0, W, H).data
  const mx = (i: number) => marks[i].x
  const my = (i: number) => marks[i].y
  const span = (a: number, b: number) => Math.hypot(mx(a) - mx(b), my(a) - my(b))
  const index = (x: number, y: number) => {
    const ix = Math.round(x), iy = Math.round(y)
    return ix < 0 || iy < 0 || ix >= W || iy >= H ? -1 : (iy * W + ix) * 4
  }

  const hand = Math.max(span(5, 17), 0.65 * span(0, 9))
  const palmX = (mx(0) + mx(5) + mx(17)) / 3, palmY = (my(0) + my(5) + my(17)) / 3
  const nails: Nail[] = []

  CHAINS.forEach((chain, finger) => {
    const tx = mx(chain[3]), ty = my(chain[3]), dx = mx(chain[2]), dy = my(chain[2])
    const tipLength = Math.hypot(tx - dx, ty - dy)
    if (tipLength < 6) return
    const straight = span(chain[0], chain[3]) / (span(chain[0], chain[1]) + span(chain[1], chain[2]) + tipLength)
    if (straight < STRAIGHT) return
    const ux = (tx - dx) / tipLength, uy = (ty - dy) / tipLength
    const nx = -uy, ny = ux
    const w0 = Math.min(WIDTH_BY_HAND[finger] * hand, WIDTH_BY_TIP[finger] * tipLength)

    // 살색 기준 — 끝마디 관절 둘레
    const skin = [0, 0, 0]
    let count = 0
    const r = Math.max(1, Math.round(w0 * 0.12))
    for (const ox of [-r, 0, r]) for (const oy of [-r, 0, r]) {
      const i = index(dx + ox, dy + oy)
      if (i < 0) continue
      skin[0] += px[i]; skin[1] += px[i + 1]; skin[2] += px[i + 2]; count++
    }
    if (count) { skin[0] /= count; skin[1] /= count; skin[2] /= count }

    // 바깥으로 가며 '센 경계 뒤가 살색이 아닌 곳'(손가락 윤곽)을 찾는다. 손톱 → 살 경계는 지나친다
    const boundary = (cx: number, cy: number, vx: number, vy: number, max: number): number | null => {
      let t = 2
      while (t <= max) {
        const a = index(cx + vx * (t - 2), cy + vy * (t - 2)), b = index(cx + vx * (t + 2), cy + vy * (t + 2))
        if (a < 0 || b < 0) return null
        if (Math.hypot(px[b] - px[a], px[b + 1] - px[a + 1], px[b + 2] - px[a + 2]) > EDGE) {
          const far = index(cx + vx * (t + 5), cy + vy * (t + 5))
          if (far < 0) return null
          if (Math.hypot(px[far] - skin[0], px[far + 1] - skin[1], px[far + 2] - skin[2]) > SKIN) return t
          t += 4
          continue
        }
        t += 1
      }
      return null
    }
    /** 세 줄 가운데 값 — 한 줄만 읽히면 믿지 않는다 */
    const middle = (values: (number | null)[]): number | null => {
      const found = values.filter((v): v is number => v !== null).sort((a, b) => a - b)
      return found.length >= 2 ? found[found.length >> 1] : null
    }

    const offsets = [-0.3, -0.1, 0.1]
    const left = middle(offsets.map((k) => boundary(tx + ux * k * w0, ty + uy * k * w0, -nx, -ny, w0 * 1.05)))
    const right = middle(offsets.map((k) => boundary(tx + ux * k * w0, ty + uy * k * w0, nx, ny, w0 * 1.05)))
    let width = w0, shift = 0
    if (left !== null && right !== null) {
      const measured = (left + right) * NAIL_IN_FINGER[finger]
      if (measured >= 0.75 * w0 && measured <= 1.45 * w0) {
        width = measured
        shift = Math.max(-0.3 * w0, Math.min(0.3 * w0, (right - left) / 2))
      }
    }
    if (finger === 0) {
      // 엄지는 옆으로 돌아 있다 — 손톱이 손바닥 반대쪽 가장자리에 보인다
      const outward = (palmX - tx) * nx + (palmY - ty) * ny > 0 ? -1 : 1
      shift += outward * 0.2 * (width / NAIL_IN_FINGER[0])
    }
    const cx = tx + nx * shift, cy = ty + ny * shift
    let length = LENGTH_RATIO * width
    const end = middle([-0.18, 0, 0.18].map((k) => boundary(cx + nx * k * width, cy + ny * k * width, ux, uy, width * 1.3)))
    // 손끝을 읽었으면 거기서 살짝 안쪽이 손톱 끝. 못 읽었으면 특징점에서 폭의 0.61배 앞이 끝(길이는 큐티클 쪽으로 늘린다)
    const reach = end !== null && end >= 0.25 * width ? end - 0.05 * width : TIP_FROM_MARK * width
    const tipX = cx + ux * reach, tipY = cy + uy * reach
    length = Math.min(length, 0.8 * Math.hypot(tipX - dx, tipY - dy))
    const x = tipX - ux * length / 2, y = tipY - uy * length / 2
    if (x < 0 || y < 0 || x >= W || y >= H) return
    nails.push({ x, y, angle: Math.atan2(uy, ux), width, length, finger })
  })

  return { nails, palm: palmSide(marks, label), view: viewBox(nails, palmX, palmY, W, H) }
}

/** 손등·손바닥 — 인식한 좌우와 손의 감긴 방향이 어긋나면 손바닥 쪽이다(거울상이어도 둘이 함께 뒤집혀 그대로 성립) */
function palmSide(marks: { x: number; y: number }[], label: { name: string; score: number } | null): boolean {
  const turn = (marks[5].x - marks[0].x) * (marks[17].y - marks[0].y) - (marks[5].y - marks[0].y) * (marks[17].x - marks[0].x)
  return !!label && label.score > 0.8 && (label.name === 'Right') !== (turn > 0)
}

// ───────────────────────── 찍기 전 안내 ─────────────────────────

/** 미리보기의 손 상태 — 없음 · 손바닥 · 굽은 손가락 · 멀다 · 잘렸다 · 좋다 */
export type HandCue = 'none' | 'palm' | 'curl' | 'far' | 'cut' | 'ok'
export interface HandCheck {
  cue: HandCue
  /** 손 길이(손목~가운뎃손가락 끝) ÷ 화면 높이 */
  size: number
  /** 손 가운데(0~1) — 멈춰 있는지 볼 때 */
  x: number
  y: number
}

/**
 * 손이 화면 높이의 이만큼은 차야 한다. 손톱 자리는 손 크기에 비례한 오차(특징점)로 정해져,
 * 손이 작게 찍히면 손톱이 20픽셀도 안 돼 조금만 어긋나도 티가 난다 — 크게 찍는 것이 가장 큰 개선이다.
 */
export const HAND_MIN_SIZE = 0.5
const LIVE_HEIGHT = 384
/** 찍히는 사진과 같은 비율(가로/세로) — kx.tsx 의 KX_PHOTO_RATIO */
const LIVE_RATIO = 3 / 4
let live: HTMLCanvasElement | null = null

/**
 * 미리보기 한 장을 읽어 손이 찍기 좋은 상태인지 본다(찍히는 것과 같은 가운데 3:4 만). 영상이 아직 없으면 null.
 * 작은 그림으로 한 번만 본다 — 매장 PC 에서 초당 한두 번 돌 만큼 가볍게.
 */
export async function checkHand(video: HTMLVideoElement): Promise<HandCheck | null> {
  if (!video.videoWidth) return null
  const engine = await loadVision('hand')
  const sw = Math.min(video.videoWidth, video.videoHeight * LIVE_RATIO), sh = sw / LIVE_RATIO
  live ??= document.createElement('canvas')
  live.width = Math.round(LIVE_HEIGHT * LIVE_RATIO)
  live.height = LIVE_HEIGHT
  live.getContext('2d')!.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, live.width, live.height)
  const result = engine.detect(live)
  const found = result.landmarks[0]
  if (!found) return { cue: 'none', size: 0, x: 0.5, y: 0.5 }
  // 화면 높이를 1 로 둔 좌표(가로는 0~0.75)
  const marks = found.map((mark) => ({ x: mark.x * LIVE_RATIO, y: mark.y }))
  const span = (a: number, b: number) => Math.hypot(marks[a].x - marks[b].x, marks[a].y - marks[b].y)
  const category = result.handedness?.[0]?.[0]
  const straight = CHAINS.slice(1).filter((chain) => span(chain[0], chain[3]) / (span(chain[0], chain[1]) + span(chain[1], chain[2]) + span(chain[2], chain[3])) >= STRAIGHT).length
  // 가운뎃손가락이 굽어 있어도 크기를 알 수 있게 손바닥 길이로도 본다
  const size = Math.max(span(0, 12), span(0, 9) * 1.85)
  const cut = [4, 8, 12, 16, 20].some((tip) => found[tip].x < 0.03 || found[tip].x > 0.97 || found[tip].y < 0.03 || found[tip].y > 0.97)
  const cue: HandCue = palmSide(marks, category ? { name: category.categoryName, score: category.score } : null) ? 'palm'
    : straight < 4 ? 'curl'
    : cut ? 'cut'
    : size < HAND_MIN_SIZE ? 'far'
    : 'ok'
  return { cue, size, x: (marks[0].x + marks[9].x) / 2 / LIVE_RATIO, y: (marks[0].y + marks[9].y) / 2 }
}

/** 손톱이 모두 들어오고 손이 크게 보이는 5:4 자리 — 손바닥 쪽으로 조금 치우쳐 손 모양이 함께 보이게 */
function viewBox(nails: Nail[], palmX: number, palmY: number, W: number, H: number) {
  if (!nails.length) { const w = Math.min(W, H * NAIL_VIEW_RATIO); return { x: (W - w) / 2, y: (H - w / NAIL_VIEW_RATIO) / 2, w, h: w / NAIL_VIEW_RATIO } }
  const pad = 1.7 * nails.reduce((sum, nail) => sum + nail.length, 0) / nails.length
  const x0 = Math.min(...nails.map((n) => n.x)) - pad, x1 = Math.max(...nails.map((n) => n.x)) + pad
  const y0 = Math.min(...nails.map((n) => n.y)) - pad, y1 = Math.max(...nails.map((n) => n.y)) + pad
  let w = Math.max(x1 - x0, (y1 - y0) * NAIL_VIEW_RATIO)
  if (w > W) w = W
  if (w / NAIL_VIEW_RATIO > H) w = H * NAIL_VIEW_RATIO
  const h = w / NAIL_VIEW_RATIO
  // 손톱 묶음의 가운데에서, 남는 만큼만 손바닥 쪽으로
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const slackX = Math.max(0, w - (x1 - x0)) / 2, slackY = Math.max(0, h - (y1 - y0)) / 2
  const towardX = Math.max(-slackX, Math.min(slackX, palmX - cx)), towardY = Math.max(-slackY, Math.min(slackY, palmY - cy))
  const x = Math.max(0, Math.min(W - w, cx + towardX - w / 2)), y = Math.max(0, Math.min(H - h, cy + towardY - h / 2))
  return { x, y, w, h }
}

// ───────────────────────── 그리기 ─────────────────────────

export type NailPattern = 'solid' | 'french' | 'ombre' | 'glitter'

export interface NailDesign {
  pattern: NailPattern
  /** #rrggbb */
  base: string
  point: string
  glossy: boolean
  /** 손톱 크기 보정(1 = 찾은 그대로) */
  scale: number
}

const GLITTER = ['#f6e3b4', '#e9c98a', '#fff6dc', '#d9b06a']

/** 손톱 모양 — 지역 좌표(가운데 원점, y+ 가 큐티클 쪽). 큐티클은 둥글게, 끝은 조금 더 길게 둥글게 */
function nailPath(w: number, L: number): Path2D {
  const a = w / 2, rc = 0.3 * L, rt = 0.36 * L
  const path = new Path2D()
  path.ellipse(0, L / 2 - rc, a, rc, 0, Math.PI, 0, true)
  path.lineTo(a * 0.96, -L / 2 + rt)
  path.ellipse(0, -L / 2 + rt, a * 0.96, rt, 0, 0, Math.PI, true)
  path.closePath()
  return path
}

/** 씨앗이 같으면 같은 순서 — 같은 손가락의 글리터는 다시 그려도 자리가 같다 */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 손톱 한 개의 무늬 — 지역 좌표에 넉넉히 칠한다(모양은 밖에서 오려 낸다) */
function paintNail(ctx: CanvasRenderingContext2D, w: number, L: number, design: NailDesign, finger: number) {
  const a = w / 2, far = Math.max(w, L)
  const fill = (style: string | CanvasGradient, alpha = 1) => { ctx.globalAlpha = alpha; ctx.fillStyle = style; ctx.fillRect(-far, -far, far * 2, far * 2); ctx.globalAlpha = 1 }
  if (design.pattern === 'solid') fill(design.base, 0.95)
  if (design.pattern === 'ombre') {
    const g = ctx.createLinearGradient(0, L / 2, 0, -L / 2)
    g.addColorStop(0, design.base)
    g.addColorStop(0.3, design.base)
    g.addColorStop(0.95, design.point)
    fill(g, 0.95)
  }
  if (design.pattern === 'french') {
    // 비치는 베이스 위에 손끝을 따라 휘는 띠
    fill(design.base, 0.58)
    const center = -L / 2 + 0.3 * L, side = -L / 2 + 0.46 * L
    ctx.fillStyle = design.point
    ctx.globalAlpha = 0.96
    ctx.beginPath()
    ctx.moveTo(-far, -far)
    ctx.lineTo(far, -far)
    ctx.lineTo(far, side)
    ctx.lineTo(a, side)
    ctx.quadraticCurveTo(0, 2 * center - side, -a, side)
    ctx.lineTo(-far, side)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (design.pattern === 'glitter') {
    fill(design.base, 0.9)
    const random = seeded(finger * 7919 + 13)
    for (let i = 0; i < 38; i++) {
      // 손끝 쪽에 더 촘촘히
      const x = (random() * 2 - 1) * a, y = -L / 2 + L * Math.pow(random(), 1.7)
      const size = w * (0.035 + 0.075 * random())
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(random() * Math.PI)
      ctx.globalAlpha = 0.7 + 0.3 * random()
      ctx.fillStyle = GLITTER[Math.floor(random() * GLITTER.length)]
      ctx.fillRect(-size / 2, -size * 0.35, size, size * 0.7)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }
  // 둥근 면 — 양옆이 살짝 어둡다
  const curve = ctx.createLinearGradient(-a, 0, a, 0)
  curve.addColorStop(0, 'rgba(40,10,20,0.26)')
  curve.addColorStop(0.24, 'rgba(40,10,20,0)')
  curve.addColorStop(0.76, 'rgba(40,10,20,0)')
  curve.addColorStop(1, 'rgba(40,10,20,0.22)')
  fill(curve)
  if (design.glossy) {
    // 광택 — 세로로 긴 빛 줄기 하나와 손끝 쪽 작은 빛
    ctx.filter = `blur(${Math.max(0.5, w * 0.045).toFixed(2)}px)`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath()
    ctx.ellipse(-a * 0.36, -L * 0.04, w * 0.075, L * 0.27, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.beginPath()
    ctx.ellipse(a * 0.3, -L * 0.26, w * 0.05, L * 0.07, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.filter = 'none'
  } else {
    fill('rgba(255,255,255,0.1)')
  }
}

let scratch: { mask: HTMLCanvasElement; paint: HTMLCanvasElement; shade: HTMLCanvasElement } | null = null

/**
 * base(원본 사진) 위에 네일을 올려 target 에 그린다. 손톱 하나씩 작은 조각 캔버스에서 만들어 붙인다(전체 화면 크기의 층을 만들지 않는다).
 */
export function renderNails(target: HTMLCanvasElement, base: HTMLCanvasElement, hand: HandShape, design: NailDesign) {
  if (target.width !== base.width) target.width = base.width
  if (target.height !== base.height) target.height = base.height
  const ctx = target.getContext('2d')!
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.filter = 'none'
  ctx.drawImage(base, 0, 0)
  if (!scratch) scratch = { mask: document.createElement('canvas'), paint: document.createElement('canvas'), shade: document.createElement('canvas') }
  const { mask, paint, shade } = scratch

  for (const nail of hand.nails) {
    const w = nail.width * design.scale, L = nail.length * design.scale
    const S = Math.ceil(Math.max(w, L) * 1.5) + 8
    const ox = Math.round(nail.x - S / 2), oy = Math.round(nail.y - S / 2)
    // 크기를 다시 정하면 비워진다
    for (const canvas of [mask, paint, shade]) { canvas.width = S; canvas.height = S }
    const maskCtx = mask.getContext('2d')!, paintCtx = paint.getContext('2d')!, shadeCtx = shade.getContext('2d')!
    const local = (c: CanvasRenderingContext2D) => { c.translate(nail.x - ox, nail.y - oy); c.rotate(nail.angle + Math.PI / 2) }
    const shape = nailPath(w, L)

    // 모양 — 가장자리를 살짝 흐려 경계가 딱딱하지 않게
    maskCtx.filter = `blur(${Math.max(0.5, w * 0.028).toFixed(2)}px)`
    local(maskCtx)
    maskCtx.fillStyle = '#fff'
    maskCtx.fill(shape)

    paintCtx.save()
    local(paintCtx)
    paintNail(paintCtx, w, L, design, nail.finger)
    paintCtx.restore()
    paintCtx.globalCompositeOperation = 'destination-in'
    paintCtx.drawImage(mask, 0, 0)

    // 원본의 명암(밝게 올리고 색을 덜어 낸 것) — 곱해서 그늘만 되살린다. 색을 조금 남겨 밝은 색이 잿빛으로 가라앉지 않게
    shadeCtx.filter = 'saturate(0.4) brightness(1.34) contrast(1.08)'
    shadeCtx.drawImage(base, ox, oy, S, S, 0, 0, S, S)
    shadeCtx.filter = 'none'
    shadeCtx.globalCompositeOperation = 'destination-in'
    shadeCtx.drawImage(mask, 0, 0)

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.drawImage(paint, ox, oy)
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = design.glossy ? 0.5 : 0.36
    ctx.drawImage(shade, ox, oy)
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/** 견본 한 개(결과 화면·저장 그림의 작은 손톱) — 세워 놓은 손톱 모양에 같은 무늬를 그린다 */
export function drawNailSample(ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, design: NailDesign, finger = 2) {
  const L = width * 1.5
  ctx.save()
  ctx.translate(cx, cy)
  ctx.clip(nailPath(width, L))
  paintNail(ctx, width, L, { ...design, scale: 1 }, finger)
  ctx.restore()
}
