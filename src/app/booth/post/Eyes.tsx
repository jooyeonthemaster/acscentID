'use client'

// POST! 우체통 「한통」의 눈 — 화면 한가운데 고정. 남색 잉크 눈매(무거운 윗눈꺼풀 · 눈가 주름) + 회색 털 눈썹.
// 표정은 숫자 값(뜬 정도 · 시선 · 눈썹 높이)을 부드럽게 옮겨 가며 바꾼다. 가끔 깜빡이고, 말할 때 눈썹이 들썩인다.
import { useEffect, useMemo, useRef, useState } from 'react'

export type Expression = 'idle' | 'look' | 'up' | 'down' | 'right' | 'glance' | 'read' | 'happy' | 'closed' | 'wink' | 'surprised' | 'listen'

interface EyeState { open: number; lx: number; ly: number; brow: number; tilt: number; smile: number; shut: number }
interface FaceState { l: EyeState; r: EyeState }

const E = (o: Partial<EyeState> = {}): EyeState => ({ open: 0.72, lx: 0, ly: 0, brow: 0, tilt: 0, smile: 0, shut: 0, ...o })
const both = (o: Partial<EyeState>): FaceState => ({ l: E(o), r: E(o) })

const PRESETS: Record<Expression, FaceState> = {
  idle: both({}),
  look: both({ open: 0.8, brow: 3 }),
  up: both({ open: 0.92, ly: -1, brow: 9 }),
  down: both({ open: 0.55, ly: 0.9, brow: -2 }),
  right: both({ open: 0.78, lx: 1 }),
  glance: both({ open: 0.7, lx: 0.75, ly: 0.45 }),
  read: both({ open: 0.5, lx: -0.25, ly: 0.85, brow: -1 }),
  happy: both({ smile: 1, brow: 5 }),
  closed: both({ shut: 1, brow: 1 }),
  wink: { l: E({ smile: 1, brow: 4 }), r: E({ open: 0.82, brow: 7, tilt: -3 }) },
  surprised: both({ open: 1.05, brow: 15 }),
  listen: { l: E({ open: 0.74, lx: 1, brow: 1 }), r: E({ open: 0.86, lx: 1, brow: 13, tilt: -5 }) },
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const mixEye = (a: EyeState, b: EyeState, t: number): EyeState => ({
  open: lerp(a.open, b.open, t), lx: lerp(a.lx, b.lx, t), ly: lerp(a.ly, b.ly, t), brow: lerp(a.brow, b.brow, t),
  tilt: lerp(a.tilt, b.tilt, t), smile: lerp(a.smile, b.smile, t), shut: lerp(a.shut, b.shut, t),
})

/** 눈썹 털 — 곡선을 따라 짧은 획을 여러 개(같은 모양이 매번 나오게 고정 난수) */
function browStrokes(flip: boolean) {
  let seed = flip ? 7 : 3
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  const out: { x1: number; y1: number; x2: number; y2: number; w: number; o: number }[] = []
  for (let i = 0; i < 110; i++) {
    const t = i / 109
    // 안쪽(코 쪽)이 두껍고 바깥으로 갈수록 가늘게, 3분의 1 지점이 가장 높은 활 모양
    const x = lerp(-88, 92, t)
    const y = -Math.sin(Math.min(1, t * 1.45) * Math.PI * 0.62) * 22 + t * 10
    const thick = lerp(15, 5, t)
    const ang = lerp(-0.95, -0.25, t) + (rnd() - 0.5) * 0.35
    const len = thick * (0.9 + rnd() * 0.7)
    const oy = (rnd() - 0.5) * thick * 0.8
    const x1 = x + (rnd() - 0.5) * 4, y1 = y + oy + thick * 0.35
    const r2 = (v: number) => Math.round(v * 100) / 100 // 서버 · 브라우저 숫자 표기가 같게(하이드레이션)
    out.push({ x1: r2(x1), y1: r2(y1), x2: r2(x1 + Math.cos(ang) * len), y2: r2(y1 + Math.sin(ang) * len), w: r2(1.8 + rnd() * 1.8), o: r2(0.6 + rnd() * 0.4) })
  }
  return out.map((s) => (flip ? { ...s, x1: -s.x1, x2: -s.x2 } : s))
}

function Eye({ s, side, season, level }: { s: EyeState; side: 'l' | 'r'; season: string; level: number }) {
  const flip = side === 'l' // 왼쪽 눈은 바깥쪽이 왼쪽
  const cx = side === 'l' ? 130 : 390 // 두 눈 사이를 넓혀 화면 가운데를 채운다(11-23)
  const cy = 136
  const w = 74
  const ho = 34 * Math.max(0.04, s.open)
  const dir = flip ? -1 : 1
  const inner = cx - w * dir, outer = cx + w * dir
  const strokes = useMemo(() => browStrokes(flip), [flip])
  const id = `eye-${side}`
  const open = s.smile < 0.5 && s.shut < 0.5
  const upper = `M ${inner} ${cy} C ${cx - w * 0.45 * dir} ${cy - ho * 1.55} ${cx + w * 0.5 * dir} ${cy - ho * 1.5} ${outer} ${cy + 5}`
  const lower = `M ${inner} ${cy} C ${cx - w * 0.35 * dir} ${cy + ho * 0.95} ${cx + w * 0.55 * dir} ${cy + ho * 0.85} ${outer} ${cy + 5}`
  const shape = `${upper} C ${cx + w * 0.55 * dir} ${cy + ho * 0.85} ${cx - w * 0.35 * dir} ${cy + ho * 0.95} ${inner} ${cy} Z`
  const ix = cx + s.lx * w * 0.42
  const iy = cy - ho * 0.15 + s.ly * Math.max(6, ho * 0.55)
  const browY = cy - 70 - s.brow - level * 5
  return (
    <g>
      {/* 눈썹 */}
      <g transform={`translate(${cx} ${browY}) rotate(${s.tilt * dir})`}>
        <path d={`M ${-86 * dir} 6 C ${-40 * dir} -26 ${30 * dir} -24 ${92 * dir} 8 C ${40 * dir} -6 ${-30 * dir} -8 ${-86 * dir} 14 Z`} fill="#efe9df" opacity={0.55} />
        {strokes.map((b, i) => <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="#f6f1e8" strokeWidth={b.w} strokeLinecap="round" opacity={b.o} />)}
        {season === 'xmas' && (
          <path d={`M ${-80 * dir} -4 C ${-60 * dir} -30 ${-20 * dir} -30 ${0} -20 C ${20 * dir} -34 ${60 * dir} -26 ${80 * dir} 0 C ${50 * dir} -10 ${-40 * dir} -14 ${-80 * dir} -4 Z`} fill="#fff" stroke="#1d254033" strokeWidth={1.5} />
        )}
      </g>
      {open ? (
        <g>
          <clipPath id={id}><path d={shape} /></clipPath>
          <path d={shape} fill="#fbf6ec" />
          <g clipPath={`url(#${id})`}>
            <circle cx={ix} cy={iy} r={23} fill="#1d2540" />
            <circle cx={ix} cy={iy} r={11} fill="#0d1226" />
            <circle cx={ix - 7} cy={iy - 8} r={5.5} fill="#fff" />
            {season === 'xmas' && (
              <>
                <path d={`M ${ix + 9} ${iy + 2} l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z`} fill="#ffcf5a" />
                <circle cx={ix + 3} cy={iy + 11} r={2.4} fill="#e2453c" />
              </>
            )}
          </g>
          {/* 윗눈꺼풀(굵게) · 쌍꺼풀 주름 · 아랫눈꺼풀 · 눈밑 · 눈가 주름 */}
          <path d={upper} fill="none" stroke="#1d2540" strokeWidth={5.5} strokeLinecap="round" />
          <path d={`M ${cx - w * 0.15 * dir} ${cy - ho * 1.2 - 15} C ${cx + w * 0.35 * dir} ${cy - ho * 1.25 - 15} ${cx + w * 0.7 * dir} ${cy - ho * 0.8 - 12} ${cx + w * 0.9 * dir} ${cy - 8}`} fill="none" stroke="#1d2540" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
          <path d={lower} fill="none" stroke="#1d2540" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
          <path d={`M ${cx - w * 0.2 * dir} ${cy + ho * 0.9 + 13} C ${cx + w * 0.15 * dir} ${cy + ho + 17} ${cx + w * 0.45 * dir} ${cy + ho + 12} ${cx + w * 0.62 * dir} ${cy + ho * 0.5 + 12}`} fill="none" stroke="#1d2540" strokeWidth={1.5} strokeLinecap="round" opacity={0.45} />
        </g>
      ) : s.smile >= 0.5 ? (
        // 웃는 눈(^ ^)
        <path d={`M ${cx - w * 0.8} ${cy + 8} Q ${cx} ${cy - 34} ${cx + w * 0.8} ${cy + 8}`} fill="none" stroke="#1d2540" strokeWidth={6} strokeLinecap="round" />
      ) : (
        // 흐뭇하게 감은 눈
        <path d={`M ${cx - w * 0.78} ${cy - 2} Q ${cx} ${cy + 20} ${cx + w * 0.78} ${cy - 2}`} fill="none" stroke="#1d2540" strokeWidth={6} strokeLinecap="round" />
      )}
      {[0, 1, 2].map((k) => (
        <line key={k} x1={outer + 6 * dir} y1={cy + 2 + (k - 1) * 9} x2={outer + 22 * dir} y2={cy + (k - 1) * 13} stroke="#1d2540" strokeWidth={1.6} strokeLinecap="round" opacity={0.6} />
      ))}
    </g>
  )
}

export function Eyes({ expression, season, level = 0 }: { expression: Expression; season: string; level?: number }) {
  const [face, setFace] = useState<FaceState>(PRESETS.idle)
  const [blink, setBlink] = useState(false)
  const from = useRef<FaceState>(PRESETS.idle)
  const faceRef = useRef(face)

  // 표정 바꾸기 — 0.35초 동안 부드럽게
  useEffect(() => {
    const target = PRESETS[expression]
    from.current = faceRef.current
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 350)
      const k = 1 - (1 - t) ** 3
      const next = { l: mixEye(from.current.l, target.l, k), r: mixEye(from.current.r, target.r, k) }
      faceRef.current = next
      setFace(next)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [expression])

  // 3~6초마다 깜빡임
  useEffect(() => {
    let t = 0
    const loop = () => {
      t = window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 130); loop() }, 3000 + Math.random() * 3000)
    }
    loop()
    return () => window.clearTimeout(t)
  }, [])

  const shown = blink ? { l: { ...face.l, open: 0.05 }, r: { ...face.r, open: 0.05 } } : face
  return (
    <svg className="po-eyes" viewBox="0 0 520 220" aria-hidden="true">
      <Eye s={shown.l} side="l" season={season} level={level} />
      <Eye s={shown.r} side="r" season={season} level={level} />
    </svg>
  )
}
