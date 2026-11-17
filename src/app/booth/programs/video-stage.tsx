'use client'
/* eslint-disable @next/next/no-img-element -- 손님 인화물(data: 원판) · 영상 첫 장면 */

// 부스 영상판(주소 &lab=video) — 화면 뒤에 길잡이 인물이 나오는 영상을 깐다(2026-11-18 사용자 지시: 관상 · 사주를 영상을 만들어 넣는 형식으로).
//   장면마다 반복 영상(첫 · 끝 프레임이 같은 그림), 장면 사이는 연결 영상(첫 프레임 = 떠나는 장면, 끝 = 도착 장면)으로 끊김 없이 잇는다.
//   인물은 사라지거나 나타나지 않는다 — 연결 영상 안에서 걸어 나가고 걸어 들어온다(SIP! 영상판과 같은 규칙, SipMotion.tsx).
//   결과 장면에는 손님 인화물을 영상 속 빈 족자 · 카드 자리에 얹는다(frame — 1920×1080 기준 px).
// 프로그램별 영상 계획은 VIDEO_PLANS, 화면 덧칠은 video-stage.css. 그림 · 영상은 public/assets/booth-programs/<프로그램>-video.

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
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
  /** 결과 장면에서 손님 인화물(2:3)을 얹을 자리 — 1920×1080 기준 */
  frame?: { scene: string; x: number; y: number; w: number; h: number }
}

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
  // 빈 비단(x 700~1067 · y 214~871) 안 — 화원의 손끝(x 760 까지)을 가리지 않게 오른쪽으로 비켜 2:3 으로
  frame: { scene: 'scroll', x: 782, y: 343, w: 266, h: 399 },
}

export const VIDEO_PLANS: Partial<Record<ProgramId, VideoPlan>> = { 'nh-face': FACE }

/** 주소의 &lab= 값(서버 렌더에서는 null) */
export function useLab(): string | null {
  return useSyncExternalStore(() => () => undefined, () => new URLSearchParams(window.location.search).get('lab'), () => null)
}

type State = { target: string; shown: string; move: string | null; holding: boolean; n: number }

export function VideoStage({ plan, scene, overlay }: { plan: VideoPlan; scene: string; /** 결과 장면의 손님 인화물 */ overlay: string | null }) {
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
      <video key={`l-${st.shown}`} className="vs-v" src={`${plan.base}/${plan.loops[st.shown]}.mp4`} poster={`${plan.base}/${plan.loops[st.shown]}.webp`}
        autoPlay muted loop playsInline preload="auto" disablePictureInPicture onPlaying={loopPlaying} data-cut={st.n > 0 || undefined} />
      {move && (
        <video key={`m-${st.n}`} ref={moveRef} className="vs-v vs-move" src={`${plan.base}/${move.src}.mp4`}
          autoPlay muted playsInline preload="auto" disablePictureInPicture onEnded={arrive} onError={arrive} />
      )}
      {showFrame && frame && (
        <img key={shownOverlay} className="vs-frame" src={shownOverlay!} alt="" data-leaving={leaving || undefined}
          style={{ left: pct(frame.x, 1920), top: pct(frame.y, 1080), width: pct(frame.w, 1920), height: pct(frame.h, 1080) } as CSSProperties} />
      )}
    </div>
  )
}

/** 첫 손님이 기다리지 않게 영상을 미리 받아 둔다 */
export function preloadVideoPlan(plan: VideoPlan) {
  for (const v of [...Object.values(plan.loops), ...Object.values(plan.moves).map((m) => m.src)]) void fetch(`${plan.base}/${v}.mp4`).catch(() => undefined)
}
