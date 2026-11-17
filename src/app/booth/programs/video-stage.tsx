'use client'

// 부스 영상판(주소 &lab=video) — 화면 뒤에 길잡이 인물이 나오는 영상을 깐다(2026-11-18 사용자 지시: 관상 · 사주를 영상을 만들어 넣는 형식으로).
//   장면마다 반복 영상(첫 · 끝 프레임이 같은 그림), 장면 사이는 연결 영상(첫 프레임 = 떠나는 장면, 끝 = 도착 장면)으로 끊김 없이 잇는다.
//   인물은 사라지거나 나타나지 않는다 — 연결 영상 안에서 걸어 나가고 걸어 들어온다(SIP! 영상판과 같은 규칙, SipMotion.tsx).
//   결과 장면에는 손님 초상을 영상 속 빈 족자 비단에 '그린다'(frame — 1920×1080 기준 px, SilkArt): 프레임마다 영상의 비단 부분만 골라
//   (크림색 비단 = 그림, 손가락 · 소매 = 영상 그대로) 초상에 비단의 빛 · 그림자를 곱한다 — 스티커처럼 떠 보이지 않게(2026-11-18 사용자 지시).
// 프로그램별 영상 계획은 VIDEO_PLANS, 화면 덧칠은 video-stage.css. 그림 · 영상은 public/assets/booth-programs/<프로그램>-video.

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from 'react'
import type { ProgramId } from '@/lib/booth/programs/catalog'
import './video-stage.css'

export interface VideoPlan {
  /** 그림 · 영상 폴더 */
  base: string
  /** 처음 화면 장면 · 흐름을 막 시작했을 때 장면 */
  start: string
  firstFlow: string
  /** 흐름 단계(ReadingFlow step) → 장면 */
  steps: Record<string, string>
  /** 장면 → 반복 영상 이름(첫 장면 그림 <이름>.webp 도 같이 둔다) */
  loops: Record<string, string>
  /** `떠나는>도착` → 연결 영상 · 재생 빠르기 */
  moves: Record<string, { src: string; rate: number }>
  /** 결과 장면에서 손님 초상을 그릴 빈 비단 — 1920×1080 기준(금색 테 안쪽) */
  frame?: { scene: string; x: number; y: number; w: number; h: number }
}

/** 족자에 그릴 것 — AI 초상(painted) · 없으면 인화물, 그리고 화제(붓글씨 한 줄) */
export interface StageArt { art: string; painted: boolean; title?: string }

/** FACE! 관상 — 도화서 화원 「선」: 화실 마당 → 화실(구도 재기) → 그리기 → 족자 → 건네고 다시 마당 */
const FACE: VideoPlan = {
  base: '/assets/booth-programs/nh-face-video',
  start: 'courtyard', firstFlow: 'studio',
  steps: { capture: 'studio', topic: 'painting', generating: 'painting', result: 'scroll', save: 'scroll' },
  loops: { courtyard: 'f1-courtyard', studio: 'f3-measure', painting: 'f5-painting', scroll: 'f8-scroll' },
  moves: {
    'courtyard>studio': { src: 'f2-into-studio', rate: 1.4 },
    'studio>painting': { src: 'f4-start-painting', rate: 1.1 },
    'painting>scroll': { src: 'f7-hang-scroll', rate: 1.3 },
    'scroll>courtyard': { src: 'f9-farewell', rate: 1.5 },
  },
  // 빈 비단(금색 테 안쪽 x 700~1067 · y 214~871). 화원의 손끝(x 760 까지)은 SilkArt 가 비단 색이 아닌 곳으로 알아보고 남긴다
  frame: { scene: 'scroll', x: 703, y: 218, w: 361, h: 650 },
}

export const VIDEO_PLANS: Partial<Record<ProgramId, VideoPlan>> = { 'nh-face': FACE }

/** 주소의 &lab= 값(서버 렌더에서는 null) */
export function useLab(): string | null {
  return useSyncExternalStore(() => () => undefined, () => new URLSearchParams(window.location.search).get('lab'), () => null)
}

type State = { target: string; shown: string; move: string | null; holding: boolean; n: number }

export function VideoStage({ plan, scene, overlay }: { plan: VideoPlan; scene: string; /** 결과 장면에 그릴 손님 초상 */ overlay: StageArt | null }) {
  const [st, setSt] = useState<State>({ target: scene, shown: scene, move: null, holding: false, n: 0 })
  // 마지막으로 얹은 인화물 — 처음으로 가면 overlay 는 바로 비지만, 화원이 족자를 걷을 때까지는 남겨 두고 서서히 지운다
  const [last, setLast] = useState(overlay)
  if (overlay && overlay !== last) setLast(overlay)
  // 장면이 바뀐 그 렌더에서 연결 영상을 고른다(React 의 '이전 값' 방식). 연결 영상이 없으면 바로 바꾼다
  if (st.target !== scene) {
    const key = `${st.shown}>${scene}`
    setSt(plan.moves[key] ? { target: scene, shown: st.shown, move: key, holding: false, n: st.n + 1 } : { target: scene, shown: scene, move: null, holding: false, n: st.n + 1 })
  }
  const move = st.move ? plan.moves[st.move] : null
  const moveRef = useRef<HTMLVideoElement>(null)
  const loopRef = useRef<HTMLVideoElement>(null)
  const n = st.n
  // 연결 영상이 끝나면(또는 못 틀면) 도착 장면 반복 영상으로 — 마지막 프레임을 잡아 둔 채 아래 반복 영상이 돌기 시작하면 걷는다(holding)
  const arrive = () => setSt((s) => (s.n === n && s.move && !s.holding ? { ...s, shown: s.target, holding: true } : s))
  useEffect(() => {
    if (!move) return
    const v = moveRef.current
    if (v) { v.defaultPlaybackRate = move.rate; v.playbackRate = move.rate }
    // 영상이 멈춰 버려도 화면이 갇히지 않게
    const t = window.setTimeout(() => setSt((s) => (s.n === n && s.move ? { ...s, shown: s.target, move: null, holding: false } : s)), 15000)
    return () => window.clearTimeout(t)
  }, [move, n])
  const loopPlaying = () => setSt((s) => (s.holding ? { ...s, move: null, holding: false } : s))

  const frame = plan.frame
  // 결과 장면에 머무는 동안 · 그 장면을 떠나는 연결 영상의 처음(족자를 걷기 전)까지
  const leaving = Boolean(frame && st.move && st.move.startsWith(`${frame.scene}>`))
  const shownOverlay = overlay ?? (leaving ? last : null)
  const showFrame = Boolean(frame && shownOverlay && st.shown === frame.scene && (!st.move || leaving))
  const pct = (v: number, of: number) => `${(v / of) * 100}%`
  return (
    <div className="vs" aria-hidden="true">
      <video key={`l-${st.shown}`} ref={loopRef} className="vs-v" src={`${plan.base}/${plan.loops[st.shown]}.mp4`} poster={`${plan.base}/${plan.loops[st.shown]}.webp`}
        autoPlay muted loop playsInline preload="auto" disablePictureInPicture onPlaying={loopPlaying} data-cut={st.n > 0 || undefined} />
      {move && (
        <video key={`m-${st.n}`} ref={moveRef} className="vs-v vs-move" src={`${plan.base}/${move.src}.mp4`}
          autoPlay muted playsInline preload="auto" disablePictureInPicture onEnded={arrive} onError={arrive} />
      )}
      {showFrame && frame && shownOverlay && (
        <SilkArt key={shownOverlay.art} frame={frame} art={shownOverlay} video={leaving ? moveRef : loopRef} leaving={leaving}
          style={{ left: pct(frame.x, 1920), top: pct(frame.y, 1080), width: pct(frame.w, 1920), height: pct(frame.h, 1080) } as CSSProperties} />
      )}
    </div>
  )
}

/** 첫 손님이 기다리지 않게 영상을 미리 받아 둔다 */
export function preloadVideoPlan(plan: VideoPlan) {
  for (const v of [...Object.values(plan.loops), ...Object.values(plan.moves).map((m) => m.src)]) void fetch(`${plan.base}/${v}.mp4`).catch(() => undefined)
}

const BRUSH = "'nh-brush', 'nh-myeongjo', 'Noto Serif KR', 'AppleMyungjo', serif"
const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src })

/** 비단에 올릴 그림 한 장(w×h) — 초상은 비단을 꽉 채우고 가장자리는 비단에 스미듯, 오른쪽 위에 세로 화제 · 붉은 낙관 */
async function paintArt(art: StageArt, w: number, h: number): Promise<ImageData> {
  const img = await loadImg(art.art)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  if (art.painted) {
    // 얼굴이 위쪽 1/3 에 오게(초상 화면 비율이 비단보다 넓으면 양옆을 자른다)
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s
    g.drawImage(img, (w - dw) / 2, (h - dh) * 0.3, dw, dh)
    // 가장자리를 비단 쪽으로 스미게 — destination-out 은 칠한 곳만 지운다(destination-in 은 칠하지 않은 안쪽까지 지워 버린다)
    g.globalCompositeOperation = 'destination-out'
    const edge = (x0: number, y0: number, x1: number, y1: number) => { const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); return lg }
    const f = Math.round(Math.min(w, h) * 0.05)
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, f, 0, 0, 0, f, h], [w, 0, w - f, 0, w - f, 0, f, h], [0, 0, 0, f, 0, 0, w, f], [0, h, 0, h - f, 0, h - f, w, f]] as const) {
      g.fillStyle = edge(x0, y0, x1, y1); g.fillRect(rx, ry, rw, rh)
    }
    g.globalCompositeOperation = 'source-over'
    // 화제 — 오른쪽 위 세로 붓글씨, 그 아래 붉은 낙관(丁未)
    const title = (art.title ?? '').replace(/\s+/g, '').slice(0, 7)
    if (title) {
      const size = Math.round(w * 0.075), x = w * 0.885
      g.font = `${size}px ${BRUSH}`; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = 'rgba(28, 20, 14, 0.86)'
      let y = h * 0.05
      for (const ch of title) { g.fillText(ch, x, y); y += size * 1.08 }
      const seal = Math.round(size * 1.15)
      g.fillStyle = 'rgba(168, 30, 24, 0.86)'; g.fillRect(x - seal / 2, y + size * 0.3, seal, seal)
      g.fillStyle = 'rgba(250, 236, 220, 0.92)'; g.font = `${Math.round(seal * 0.42)}px 'nh-hanja', 'Noto Serif KR', serif`
      g.fillText('丁', x, y + size * 0.3 + seal * 0.06); g.fillText('未', x, y + size * 0.3 + seal * 0.5)
    }
  } else {
    // AI 초상을 못 받았으면 인화물을 비단 가운데에
    const s = Math.min(w / img.naturalWidth, h / img.naturalHeight) * 0.92
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s
    g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
  }
  return g.getImageData(0, 0, w, h)
}

/**
 * 영상 속 빈 비단에 초상을 '그린다' — 프레임마다 영상의 그 자리를 읽어, 비단 색(크림)인 곳만 그림 × 비단 밝기(빛 · 그림자)로 바꾼다.
 * 비단 색이 아닌 곳(화원의 손끝 · 소매, 족자를 걷을 때 비단 밖)은 영상 그대로라 그림이 손 앞에 뜨지 않는다.
 */
function SilkArt({ frame, art, video, leaving, style }: {
  frame: NonNullable<VideoPlan['frame']>; art: StageArt; video: RefObject<HTMLVideoElement | null>; leaving: boolean; style: CSSProperties
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let stop = false, raf = 0
    const { w, h } = frame
    const work = document.createElement('canvas'); work.width = w; work.height = h
    const wg = work.getContext('2d', { willReadFrequently: true })!
    void paintArt(art, w, h).then((paint) => {
      const out = ref.current?.getContext('2d')
      if (stop || !out) return
      let ref0: [number, number, number] | null = null
      const tick = () => {
        if (stop) return
        const v = video.current
        // 프레임이 아직 없는 영상(막 시작한 연결 영상)은 읽지 않는다 — 읽으면 검은 화면이 비단 자리에 찍힌다
        if (v && v.videoWidth && v.readyState >= 2) {
          const k = v.videoWidth / 1920
          wg.drawImage(v, frame.x * k, frame.y * k, w * k, h * k, 0, 0, w, h)
          const px = wg.getImageData(0, 0, w, h), d = px.data, p = paint.data
          // 비단 기준색 — 처음 프레임 가운데 줄의 밝은 곳 평균
          if (!ref0) {
            let r = 0, gg = 0, b = 0, n = 0
            for (let y = Math.round(h * 0.2); y < h * 0.8; y += 4) for (let x = Math.round(w * 0.4); x < w * 0.95; x += 4) { const i = (y * w + x) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++ }
            ref0 = [r / n, gg / n, b / n]
          }
          const [R, G, B] = ref0, S = R + G + B, cr = R / S, cg = G / S
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2], s = r + g + b + 1
            const dr = r / s - cr, dg = g / s - cg
            const dist = Math.sqrt(dr * dr + dg * dg)
            // 비단 색에 가까울수록 1(크림 · 그늘진 크림), 손 · 소매 · 금테는 0
            let silk = dist < 0.014 ? 1 : dist > 0.03 ? 0 : 1 - (dist - 0.014) / 0.016
            if (s < 150) silk = 0
            const a = silk * (p[i + 3] / 255)
            if (a <= 0) continue
            // 그림 × 비단 밝기(기준색에 대한 비) — 빛 · 그림자 · 결이 그림에 그대로
            d[i] = r + (Math.min(255, p[i] * r / R) - r) * a
            d[i + 1] = g + (Math.min(255, p[i + 1] * g / G) - g) * a
            d[i + 2] = b + (Math.min(255, p[i + 2] * b / B) - b) * a
          }
          out.putImageData(px, 0, 0)
        }
        raf = requestAnimationFrame(tick)
      }
      tick()
    }).catch(() => undefined)
    return () => { stop = true; cancelAnimationFrame(raf) }
  }, [art, frame, video])
  return <canvas ref={ref} className="vs-frame" width={frame.w} height={frame.h} data-leaving={leaving || undefined} style={style} />
}
