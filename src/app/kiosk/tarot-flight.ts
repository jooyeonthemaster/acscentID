// 타로 카드가 날아가는 연출 — 부채꼴 ↔ 과거·현재·미래 자리 ↔ 가운데 더미.
// 움직임은 transform·opacity 만 쓰는 Web Animations 라 화면 스레드가 바빠도(키오스크는 2코어) 그래픽 스레드에서 끊기지 않고 돈다.
// 경로는 촘촘한 점으로 미리 계산해 직선으로 잇는다 — 중간 지점마다 속도가 끊기지(뚝뚝) 않게.

/** 카드 한 장의 자리(날아가는 층 기준 px) */
export interface CardSpot {
  /** 가운데 x · y */
  cx: number
  cy: number
  /** 카드 폭(기울이기 전) */
  width: number
  /** 기울기(도) */
  angle: number
  look: 'fan' | 'slot'
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (a: number, b: number, t: number) => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t
  return (x: number) => {
    let lo = 0, hi = 1, t = x
    for (let i = 0; i < 14; i++) {
      const v = curve(x1, x2, t)
      if (Math.abs(v - x) < 0.0004) break
      if (v < x) lo = t; else hi = t
      t = (lo + hi) / 2
    }
    return curve(y1, y2, t)
  }
}

/** 살짝 들었다가 길게 미끄러져 내려앉는 곡선 */
const GLIDE = cubicBezier(0.3, 0, 0.15, 1)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const STEPS = 28

/** 화면의 요소 → 날아가는 층 기준 자리. CSS zoom(--ksk-fit) 안에서도 맞도록 층의 보이는 크기 ÷ 제 크기로 나눈다 */
export function spotOf(layer: HTMLElement, el: HTMLElement, look: CardSpot['look'], angle = 0): CardSpot {
  const base = layer.getBoundingClientRect()
  const zoom = layer.offsetWidth ? base.width / layer.offsetWidth : 1
  const r = el.getBoundingClientRect()
  return {
    cx: (r.left + r.width / 2 - base.left) / zoom,
    cy: (r.top + r.height / 2 - base.top) / zoom,
    width: el.offsetWidth || r.width / zoom,
    angle,
    look,
  }
}

export interface Flight {
  /** 끝까지 날아갔으면 true, 중간에 그만뒀으면 false. 도착한 카드는 remove() 할 때까지 그 자리에 떠 있다 */
  done: Promise<boolean>
  /** 날아온 카드를 치운다 — 진짜 카드를 그린 직후에 부른다(빈 프레임이 없게) */
  remove(): void
  cancel(): void
}

/**
 * 뒷면 한 장을 from → to 로 날린다. 큰 쪽 크기로 그려 두고 줄여서 시작하므로 커지는 동안 흐려지지 않는다.
 * fade: 도착하면서 사라진다(더미로 들어갈 때).
 */
export function flyCardBack(layer: HTMLElement, from: CardSpot, to: CardSpot, options: { delay?: number; fade?: boolean } = {}): Flight {
  const width = Math.max(from.width, to.width)
  const height = width * 1.5
  const flyer = document.createElement('div')
  flyer.className = 'trt-flyer'
  flyer.style.cssText = `left:${to.cx - width / 2}px;top:${to.cy - height / 2}px;width:${width}px;height:${height}px`
  const face = (look: CardSpot['look']) => {
    const el = document.createElement('div')
    el.className = 'trt-card trt-card--back trt-flyer-face'
    el.dataset.look = look
    el.appendChild(Object.assign(document.createElement('i'), { className: 'trt-garden-art' }))
    return el
  }
  const under = face(from.look)
  const over = from.look === to.look ? null : face(to.look)
  flyer.appendChild(under)
  if (over) flyer.appendChild(over)

  const dx = from.cx - to.cx
  const dy = from.cy - to.cy
  const dist = Math.hypot(dx, dy)
  // 길을 살짝 위로 휘게 — 직선으로 미끄러지면 종이가 아니라 화면 조각처럼 보인다
  const bend = Math.min(26, dist * 0.1)
  const nx = dist ? -dy / dist : 0
  const ny = dist ? dx / dist : -1
  const up = ny > 0 ? -1 : 1
  const s0 = from.width / width
  const s1 = to.width / width
  const frames: Keyframe[] = []
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS
    const u = GLIDE(t)
    const arc = Math.sin(Math.PI * u)
    const x = dx * (1 - u) + nx * up * bend * arc
    const y = dy * (1 - u) + ny * up * bend * arc
    // 가운데쯤에서 손에 들린 것처럼 조금 커지고 기운다
    const scale = lerp(s0, s1, u) * (1 + 0.09 * arc)
    const angle = lerp(from.angle, to.angle, u) + (dx >= 0 ? -1 : 1) * 3.5 * arc
    frames.push({ transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)})`, ...(options.fade ? { opacity: t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28 } : {}) })
  }
  flyer.style.transform = String(frames[0].transform)
  layer.appendChild(flyer)

  const duration = Math.round(Math.min(680, Math.max(460, 400 + dist * 0.45)))
  const timing: KeyframeAnimationOptions = { duration, delay: options.delay ?? 0, fill: 'both', easing: 'linear' }
  const move = flyer.animate(frames, timing)
  // 날아가는 동안 뒷면 색이 도착할 자리의 색으로 바뀐다
  const tint = over?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 1 }], timing)

  // 화면이 가려져 애니메이션 시계가 멈춰도(끝났다는 신호가 안 와도) 조작이 막히지 않게 — 시간이 지나면 도착한 것으로 친다
  let late = 0
  const done = Promise.race([
    move.finished.then(() => true, () => false),
    new Promise<boolean>((resolve) => { late = window.setTimeout(() => resolve(true), duration + (options.delay ?? 0) + 600) }),
  ]).finally(() => window.clearTimeout(late))
  const remove = () => flyer.remove()
  return { done, remove, cancel: () => { tint?.cancel(); move.cancel(); remove() } }
}

/** 손에 들린 카드가 뒤집히는 곡선 — 천천히 들려 돌기 시작해 부드럽게 내려앉는다 */
const TURN = cubicBezier(0.45, 0, 0.2, 1)

/**
 * 카드 한 장을 뒤집는다(.trt-flip-inner — 앞·뒷면을 품은 3D 판). 가운데쯤에서 살짝 들려 커졌다가 내려앉는다.
 * 끝난 모습은 CSS(.trt-flip[data-open] .trt-flip-inner)와 같아서, 애니메이션이 없어도(다시 들어온 화면·모션 줄이기) 앞면이 보인다.
 */
export function flipOpen(inner: HTMLElement | null, delay: number): Animation | null {
  if (!inner) return null
  const frames: Keyframe[] = []
  for (let i = 0; i <= STEPS; i++) {
    const u = TURN(i / STEPS)
    const lift = Math.sin(Math.PI * u)
    frames.push({ transform: `translateY(${(-14 * lift).toFixed(2)}px) scale(${(1 + 0.07 * lift).toFixed(4)}) rotateY(${(180 * u).toFixed(2)}deg)` })
  }
  return inner.animate(frames, { duration: FLIP_MS, delay, fill: 'both', easing: 'linear' })
}
/** 한 장이 뒤집히는 시간(ms) — tarot-motion.css 의 캡션·윤기 지연과 맞춘다 */
export const FLIP_MS = 860

/**
 * 자리(레이아웃)가 바뀐 요소를 예전 자리에서 새 자리로 미끄러지게 한다(FLIP) — 너비·여백을 직접 애니메이션하면
 * 프레임마다 화면을 다시 짜서 끊긴다. first 는 바뀌기 전에 재 둔 getBoundingClientRect.
 */
export function glideFrom(el: HTMLElement, first: DOMRect, options: { duration?: number; easing?: string } = {}): Animation | null {
  const last = el.getBoundingClientRect()
  if (!last.width || !first.width) return null
  const zoom = el.offsetWidth ? last.width / el.offsetWidth : 1
  const scale = first.width / last.width
  const dx = (first.left - last.left) / zoom
  const dy = (first.top - last.top) / zoom
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(scale - 1) < 0.005) return null
  return el.animate(
    [{ transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transformOrigin: '0 0', transform: 'none' }],
    { duration: options.duration ?? 620, easing: options.easing ?? 'cubic-bezier(.3,.05,.15,1)', fill: 'backwards' },
  )
}
