'use client'
/* eslint-disable @next/next/no-img-element -- 장면 그림(최적화할 원격 그림이 아니다) */

// SIP! 실험판 2(/kiosk?mode=studio-sommelier-nh&lab=motion) — 그림이 '넘어가는' 대신 실제로 움직이는 장면(2026-11-17 사용자 지시: 슬라이드쇼 같지 않게, 장소 이동은 빨리감기처럼).
//   장면 = 배경판(해나를 지운 그림) + 해나(초록 배경에 따로 그려 오린 그림) 두 겹. 카메라가 손에 든 듯 흔들리고, 두 겹이 다른 깊이로 움직여(시차) 공간감이 난다.
//   해나는 숨 쉬고(위아래로 아주 조금), 몸을 천천히 흔들고, 말할 때 고개를 끄덕인다.
//   장소 이동 — 지금 장면으로 빨려 들어가고(해나는 앞서 걸어 나간다) → 다음 장소로 가는 길 그림이 끊어지는 빨리감기(하이퍼랩스)로 두 번 달려 나가며 흔들리고 속도선 · 잔상 → 빛 → 새 장면이 감속하며 멈춘다.
//   저장고(AI 가 고르는 동안)는 한 장면 — 와인 수장고의 와인 벽 앞에서 해나가 수백 병 중 한 병을 고른다(vault). 반복 영상(STILL.video)이 있으면 그걸 틀고, 없으면 그림이 움직인다(촛불 · 먼지 · 카메라).
// 영상판(2026-11-17 「완으로 모든 영상을」): 장소마다 Wan 3.0 반복 영상(STILL.video, 첫 · 끝 프레임 = 그 장소 그림)과 장소 사이 이동 영상(MOVE, 첫 프레임 = 떠나는 장소 배경판, 끝 = 도착 장소 그림).
//   이동은 지금 장면이 빨려 들어가며 이동 영상이 빨리감기(MOVE_RATE 배)로 돌고, 이동 영상의 마지막 프레임 = 도착 장소 반복 영상의 첫 프레임이라 끊김 없이 이어진다.
//   영상이 없는 장소 · 이동은 위의 그림판(두 겹 · 하이퍼랩스 그림)으로 돌아간다.
// 그림: public/assets/kiosk-expansion/nh-sip(plate-* · hana-* · go-* · vault), 화면: sip-motion.css

import { useEffect, useState } from 'react'
import './sip-motion.css'

export type Scene = 'gate' | 'vineyard' | 'harvest' | 'winery' | 'cellar' | 'tasting'
const ART = '/assets/kiosk-expansion/nh-sip'
/** 이동 연출 전체 길이 — 이 뒤에 대사 · 장소 제목이 뜬다(sip-motion.css 시간과 맞춘다) */
export const TRAVEL_MS = 1750
/** 이동 영상 — 4초 영상을 MOVE_RATE 배로(약 1.85초), 그 뒤 도착 장소 반복 영상으로 바꾼다 */
const MOVE_RATE = 2.2
const MOVE_MS = 1950

/**
 * 해나 자리 — 그림 세계(720×1290) 안의 % : x 가운데 · top 머리 위 · h 키 · ratio 그림 가로/세로 · cut 아래에서 잘라 낼 몫(%)
 * 시음실은 카운터 뒤, 와이너리는 앞쪽 오크통 뒤에 서 있어 아랫부분을 자른다
 */
const HANA: Record<Scene, { x: number; top: number; h: number; ratio: number; cut?: number }> = {
  gate: { x: 50, top: 24, h: 68, ratio: 0.3571 },
  vineyard: { x: 50, top: 13, h: 108, ratio: 0.2907 },
  harvest: { x: 50, top: 12, h: 105, ratio: 0.2421 },
  winery: { x: 45.9, top: 22, h: 78, ratio: 0.4564, cut: 22 },
  cellar: { x: 50, top: 14, h: 100, ratio: 0.3207 },
  tasting: { x: 50, top: 12, h: 100, ratio: 0.3129, cut: 32 },
}
const SCENES = Object.keys(HANA) as Scene[]
/**
 * 한 장으로 된 장면(해나가 그림 안에). video — 처음과 끝이 이어지는 반복 영상(mp4, 소리 없음). 영상을 만들면 이름만 넣는다
 * 영상 만들기: design-review/nh-sip-art/vault-frame.jpg 를 첫 장면으로 — docs/nh-awards-demo.md 「수장고 영상」
 */
const STILL: Partial<Record<Scene, { img: string; video?: string }>> = {
  gate: { img: 'gate', video: 'loop-gate' },
  vineyard: { img: 'vineyard', video: 'loop-vineyard' },
  harvest: { img: 'harvest', video: 'loop-harvest' },
  winery: { img: 'winery', video: 'loop-winery' },
  cellar: { img: 'vault', video: 'vault-loop' },
  tasting: { img: 'tasting', video: 'loop-tasting' },
}
/** 그 장소로 가는 이동 영상(mp4) */
const MOVE: Partial<Record<Scene, string>> = { vineyard: 'move-vineyard', harvest: 'move-harvest', winery: 'move-winery', cellar: 'move-cellar', tasting: 'move-tasting' }
/** 그 장소로 갈 때 이동 연출 길이 */
export const travelMs = (to: Scene) => (MOVE[to] ? MOVE_MS : TRAVEL_MS)

export function preloadMotion() {
  for (const s of SCENES) for (const f of [...(STILL[s] ? [STILL[s]!.img] : [`plate-${s}`, `hana-${s}`]), ...(s === 'gate' || MOVE[s] ? [] : [`go-${s}`])]) { const i = new Image(); i.src = `${ART}/${f}.webp` }
  // 영상은 미리 받아 둔다(첫 손님 이동이 끊기지 않게)
  for (const s of SCENES) for (const v of [STILL[s]?.video, MOVE[s]]) if (v) void fetch(`${ART}/${v}.mp4`).catch(() => undefined)
}

/** 장면이 바뀌면 { from: 떠나는 장면, n } — TRAVEL_MS 뒤 from 이 비면 도착 */
export function useTravel(scene: Scene) {
  const [t, setT] = useState<{ now: Scene; from: Scene | null; n: number }>({ now: scene, from: null, n: 0 })
  // 장면이 바뀐 그 렌더에서 바로 떠나는 장면을 기억한다(React 의 '이전 값' 방식)
  if (t.now !== scene) setT({ now: scene, from: t.now, n: t.n + 1 })
  useEffect(() => {
    if (!t.from) return
    const id = window.setTimeout(() => setT((x) => (x.n === t.n ? { ...x, from: null } : x)), travelMs(t.now))
    return () => window.clearTimeout(id)
  }, [t.n, t.from, t.now])
  return t
}

function Hana({ scene, talk }: { scene: Scene; /** 말할 때마다 바뀌는 번호 — 바뀌면 끄덕임이 다시 시작된다 */ talk?: number }) {
  const p = HANA[scene]
  return <div className="sip-hana" style={{ left: `${p.x}%`, top: `${p.top}%`, height: `${p.h}%`, aspectRatio: p.ratio }}>
    <div className="sip-hana-sway"><div className="sip-hana-breathe">
      <img src={`${ART}/hana-${scene}.webp`} alt="" draggable={false}
        style={{ clipPath: p.cut ? `inset(0 0 ${p.cut}% 0)` : undefined, animationName: talk == null ? 'none' : talk % 2 ? 'sip-talk-a' : 'sip-talk-b' }} />
    </div></div>
  </div>
}

/** 움직이는 장면 — 배경판 · 해나 두 겹, 이동 중이면 빨리감기 덧그림 */
export function MotionScene({ scene, travel, talk }: { scene: Scene; travel: ReturnType<typeof useTravel>; talk: number }) {
  // 이동 영상으로 가는 동안은 도착 장면을 그리지 않는다 — 이동 영상의 끝 프레임에서 반복 영상으로 바로 이어진다(data-cut)
  const movie = travel.n > 0 && !!MOVE[scene]
  return <>
    {!(movie && travel.from) && <div key={`w${travel.n}`} className="sip-world sip-live" data-arrive={(travel.n > 0 && !movie) || undefined} data-cut={movie || undefined} data-scene={scene}>
      <div className="sip-cam">
        {STILL[scene]
          ? <div className="sip-layer sip-layer--still" data-video={!!STILL[scene]!.video || undefined}><Still scene={scene} play /></div>
          : <>
            <div className="sip-layer sip-layer--far"><img className="sip-plate" src={`${ART}/plate-${scene}.webp`} alt="" draggable={false} /></div>
            <div className="sip-layer sip-layer--near"><Hana scene={scene} talk={talk} /></div>
          </>}
      </div>
    </div>}
    {travel.from && <Travel key={travel.n} from={travel.from} to={scene} />}
  </>
}

/** 빨리감기 이동 — 떠나는 장면이 빨려 들어가고, 길 그림이 끊어지며 두 번 달려 나간다 */
function Travel({ from, to }: { from: Scene; to: Scene }) {
  return <div className="sip-travel" data-movie={!!MOVE[to] || undefined}>
    <div className="sip-world sip-tv-from" data-scene={from}>
      {STILL[from] ? <Still scene={from} /> : <><img className="sip-plate" src={`${ART}/plate-${from}.webp`} alt="" /><Hana scene={from} /></>}
    </div>
    {MOVE[to] ? <div className="sip-world sip-tv-movie">
      <video className="sip-plate" src={`${ART}/${MOVE[to]}.mp4`} muted playsInline autoPlay preload="auto" disablePictureInPicture
        ref={(v) => { if (v) { v.defaultPlaybackRate = MOVE_RATE; v.playbackRate = MOVE_RATE } }} onLoadedMetadata={(e) => { e.currentTarget.playbackRate = MOVE_RATE }} />
    </div> : to !== 'gate' && <div className="sip-world sip-tv-road">
      <div className="sip-tv-shake"><div className="sip-tv-zoom">
        {[0, 1, 2].map((g) => <img key={g} data-ghost={g || undefined} src={`${ART}/go-${to}.webp`} alt="" />)}
      </div></div>
    </div>}
    <i className="sip-tv-lines" data-movie={!!MOVE[to] || undefined} />
    {!MOVE[to] && <i className="sip-tv-flash" />}
  </div>
}

/** 한 장 장면 — 반복 영상(있으면, 첫 그림을 포스터로) 또는 그림 + 촛불 일렁임 */
function Still({ scene, play }: { scene: Scene; play?: boolean }) {
  const s = STILL[scene]!
  const poster = `${ART}/${s.img}.webp`
  return <>
    {play && s.video
      ? <video className="sip-plate" src={`${ART}/${s.video}.mp4`} poster={poster} autoPlay muted loop playsInline preload="auto" disablePictureInPicture />
      : <img className="sip-plate" src={poster} alt="" draggable={false} />}
    {!s.video && <i className="sip-flicker" />}
  </>
}
