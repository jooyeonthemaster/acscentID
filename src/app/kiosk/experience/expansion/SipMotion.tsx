'use client'
/* eslint-disable @next/next/no-img-element -- 장면 그림(최적화할 원격 그림이 아니다) */

// SIP! 영상판(/kiosk?mode=studio-sommelier-nh&lab=video, &lab=motion 도 같다) — 소믈리에 해나를 따라 포도밭 입구 → 시음실을 Wan 3.0 영상으로 걷는다.
//   장소마다 조각 영상 셋(2026-11-18 사용자 지시: 처음 동작 · 짧은 반복 · 마무리로 나눠 어느 때 버튼을 눌러도 2초 안에 자연스럽게 넘어가게):
//     hi-<장소>      도착 인사 동작(4초, 한 번) — 손 흔들기 · 카메라 들기 · 포도 내밀기 · 잔 가리키기 · 병 꺼내 보기 · 잔 돌리기
//     idle-<장소>-N  대기(4초 × IDLES 가지, 무작위로 이어 틀기) — 숨 · 눈 깜빡임 · 옆을 봤다 돌아보기
//     마무리         따로 없다 — 이동 영상(move-<도착 장소>) 앞부분이 해나가 돌아서 화면 밖으로 걸어 나가는 장면
//   모든 조각의 첫 · 끝 프레임 = 그 장소 그림(PIC), 이동 영상의 첫 프레임 = 떠나는 장소 그림 · 끝 프레임 = 도착 장소 그림. 그래서 어느 조각 끝에서든 다음 조각으로 이음매 없이 붙는다.
//   버튼을 누르면 지금 조각을 끝까지 튼다(남은 몫이 길면 FINISH_MAX_RATE 까지 조금 빨리 — 4초 조각이면 길어도 2초) → 이동 영상(걷는 앞뒤 WALK_RATE, 길 FAST_RATE) → 도착 장소 인사 동작.
//   이어 틀기: [앞 조각 · 지금 조각 · 미리 받아 둔 다음 조각] 세 겹. 다음 조각은 첫 프레임이 실제로 화면에 그려진 뒤에야 보이고(requestVideoFrameCallback),
//   그때까지 앞 조각이 마지막 프레임을 붙들고 있어 빈 화면 · 깜빡임이 없다. 넘기는 건 영상이 끝날 때(ended) — 타이머는 영상이 멈췄을 때만 쓰는 안전장치.
// 영상 만들기: design-review/nh-sip-art/tools/sip-wan-beats.mjs(조각) · sip-wan-moves.mjs(이동), 화면: sip-motion.css

import { useEffect, useRef, useState } from 'react'
import './sip-motion.css'

export type Scene = 'gate' | 'vineyard' | 'harvest' | 'winery' | 'cellar' | 'tasting'
const ART = '/assets/kiosk-expansion/nh-sip'
/** 가는 차례 — 이동 영상은 바로 앞 장소에서 출발한다 */
const SCENES: Scene[] = ['gate', 'vineyard', 'harvest', 'winery', 'cellar', 'tasting']
/** 장소 그림 — 그 장소 조각 영상의 첫 · 끝 프레임(영상이 안 될 때 보인다). 저장고는 와인 수장고 */
const PIC: Record<Scene, string> = { gate: 'gate', vineyard: 'vineyard', harvest: 'harvest', winery: 'winery', cellar: 'vault', tasting: 'tasting' }
/** 장소마다 대기 영상 가짓수(idle-<장소>-1 …) */
const IDLES = 2
/** 이동 영상 빠르기 — 해나가 걸어 나가고 · 걸어 들어오는 부분 / 길을 가는 부분 */
const WALK_RATE = 1.5
const FAST_RATE = 3.5
/** 버튼을 누른 뒤 지금 조각 마저 틀기 — 누른 순간 남은 몫을 FINISH_S 초 안에 끝낼 빠르기로 고정(이보다 빠르게는 틀지 않는다 — 4초 조각이면 길어도 2초) */
const FINISH_MAX_RATE = 2
const FINISH_S = 1.8
/** 다음 조각이 첫 프레임을 그린 뒤 겹쳐 오는 시간 — 앞뒤 프레임은 같은 그림이라 압축 차이만 감춘다 */
const FADE_MS = 150
/** 조각 영상 길이(초) — 안전 타이머용 */
const BEAT_S = 4

/** 그 장소로 가는 이동 영상 — out: 해나가 화면 밖으로 다 나간 초, in: 해나가 걸어 들어오기 시작하는 초, len: 영상 길이(초) */
type Move = { src: string; out: number; in: number; len: number }
const MOVE: Partial<Record<Scene, Move>> = {
  // 0.5초 간격 프레임으로 잰 값(2026-11-17 Wan 3.0 8초 판)
  vineyard: { src: 'move-vineyard', out: 2.8, in: 4.9, len: 8 },
  harvest: { src: 'move-harvest', out: 2.4, in: 4.8, len: 8 },
  winery: { src: 'move-winery', out: 2.4, in: 4.4, len: 8 },
  cellar: { src: 'move-cellar', out: 2.4, in: 5.2, len: 8 },
  tasting: { src: 'move-tasting', out: 2.4, in: 4.8, len: 8 },
}
const moveMs = (m: Move) => Math.round(1000 * (m.out / WALK_RATE + (m.in - m.out) / FAST_RATE + (m.len - m.in) / WALK_RATE))

/** 조각 하나 — at: 이 조각이 끝나는 장소(이동 영상이면 도착 장소) · id: 틀어 온 차례(화면 겹의 key) */
type Clip = { src: string; at: Scene; move?: Move; id: number }
const hi = (s: Scene, id: number): Clip => ({ src: `hi-${s}`, at: s, id })
const idle = (s: Scene, pick: number, id: number): Clip => ({ src: `idle-${s}-${pick + 1}`, at: s, id })
/** 지금 조각 다음에 틀 조각 — 가야 할 장소가 바뀌었으면 이동 영상(바로 다음 장소가 아니면 그 장소 인사로 바로), 막 도착했으면 인사, 아니면 대기 */
function after(cur: Clip, target: Scene, pick: number): Clip {
  const id = cur.id + 1
  if (cur.at !== target) {
    const m = MOVE[target]
    return m && SCENES.indexOf(target) === SCENES.indexOf(cur.at) + 1 ? { src: m.src, at: target, move: m, id } : hi(target, id)
  }
  return cur.move ? hi(cur.at, id) : idle(cur.at, pick, id)
}
const roll = () => Math.floor(Math.random() * IDLES)

export function preloadMotion() {
  for (const s of SCENES) { const i = new Image(); i.src = `${ART}/${PIC[s]}.webp` }
  // 영상은 가는 차례대로 미리 받아 둔다(첫 손님 이동이 끊기지 않게)
  for (const s of SCENES) for (const v of [MOVE[s]?.src, `hi-${s}`, ...Array.from({ length: IDLES }, (_, i) => `idle-${s}-${i + 1}`)]) if (v) void fetch(`${ART}/${v}.mp4`).catch(() => undefined)
}

/**
 * 움직이는 장면 — scene 은 가야 할 장소. 도착 장소 인사 영상이 화면에 그려져야 onSettle 로 알린다.
 * 이동 중에 장소가 또 바뀌면 지금 이동을 마치고(그 장소 인사 동작을 마저 틀고) 이어서 간다.
 */
export function MotionScene({ scene, onSettle }: { scene: Scene; onSettle: (at: Scene) => void }) {
  /** prev: 지금 조각이 그려질 때까지 마지막 프레임을 붙들고 있는 앞 조각 · cur: 트는 조각 · pick: 다음 대기 영상 · on: cur 가 화면에 그려졌다 */
  const [st, setSt] = useState<{ prev: Clip | null; cur: Clip; pick: number; on: boolean }>(() => ({ prev: null, cur: hi(scene, 0), pick: roll(), on: false }))
  const { prev, cur, on } = st
  const next = after(cur, scene, st.pick)
  const [fast, setFast] = useState(false)

  /** 지금 조각이 끝났다 — 미리 받아 둔 다음 조각을 튼다(이미 넘어갔으면 무시: ended · 안전 타이머가 겹쳐도 한 번만) */
  const ended = (id: number, n: Clip) => setSt((x) => (x.cur.id === id ? { prev: x.cur, cur: n, pick: roll(), on: false } : x))
  const shown = (id: number) => setSt((x) => (x.cur.id === id ? { ...x, prev: null, on: true } : x))
  const endRef = useRef(ended)
  useEffect(() => { endRef.current = ended })

  useEffect(() => { if (on && !cur.move) onSettle(cur.at) }, [on, cur, onSettle])
  // 안전장치 — 영상이 멈추거나 안 받아지면 다음 조각으로 넘긴다
  useEffect(() => {
    const ms = (cur.move ? moveMs(cur.move) : BEAT_S * 1000) + 3000
    const id = window.setTimeout(() => endRef.current(cur.id, after(cur, scene, 0)), ms)
    return () => window.clearTimeout(id)
  }, [cur, scene])

  const key = (c: Clip) => `${c.src}#${c.id}`
  return <>
    <div className="sip-world" data-scene={cur.at}>
      <img className="sip-plate" src={`${ART}/${PIC[cur.move ? prev?.at ?? cur.at : cur.at]}.webp`} alt="" draggable={false} />
      {prev && <Film key={key(prev)} src={prev.src} play move={prev.move} />}
      <Film key={key(cur)} src={cur.src} play move={cur.move} finish={!cur.move && cur.at !== scene}
        onFast={setFast} onShown={() => shown(cur.id)} onEnd={() => ended(cur.id, next)} />
      <Film key={key(next)} src={next.src} play={false} />
    </div>
    {cur.move && <i key={cur.id} className="sip-tv-lines" data-fast={fast || undefined} />}
  </>
}

/**
 * 영상 한 겹 — 미리 받아 첫 프레임에 멈춰 있다가 play 가 되면 한 번 튼다. 첫 프레임이 실제로 그려진 뒤에야 보인다(그 전엔 아래 겹이 보인다).
 * finish: 남은 몫이 길면 조금 빨리 · move: 걷는 앞뒤는 WALK_RATE, 길은 FAST_RATE
 */
function Film({ src, play, finish = false, move, onFast, onShown, onEnd }: {
  src: string; play: boolean; finish?: boolean; move?: Move
  onFast?: (fast: boolean) => void; onShown?: () => void; onEnd?: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [seen, setSeen] = useState(false)
  const cb = useRef({ onFast, onShown, onEnd })
  useEffect(() => { cb.current = { onFast, onShown, onEnd } })

  useEffect(() => {
    const v = ref.current
    // 다 튼 앞 조각은 다시 틀지 않는다(끝난 영상에 play() 를 부르면 처음부터 다시 돈다)
    if (!v || !play || v.ended) return
    let off = false, timer = 0
    const painted = () => { if (off) return; setSeen(true); timer = window.setTimeout(() => cb.current.onShown?.(), FADE_MS + 40) }
    // requestVideoFrameCallback 이 없는 브라우저는 재생이 시작된 뒤 두 화면 뒤에
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(painted)
    else (v as HTMLVideoElement).addEventListener('playing', () => requestAnimationFrame(() => requestAnimationFrame(painted)), { once: true })
    if (move) v.playbackRate = WALK_RATE
    // 재생이 막히면 아래 그림이 보이고, 다음 조각은 안전 타이머가 넘긴다
    v.play().catch(() => undefined)
    return () => { off = true; window.clearTimeout(timer) }
  }, [play, move])

  // 마저 틀기 — 누른 순간 남은 몫으로 빠르기를 정하고(끝에서 다시 느려지면 그만큼 더 기다린다), 덜컥 빨라지지 않게 0.2초쯤에 걸쳐 올린다
  useEffect(() => {
    const v = ref.current
    if (!v || !finish) return
    let raf = 0, want = 0
    const tick = () => {
      if (!want && Number.isFinite(v.duration)) want = Math.min(FINISH_MAX_RATE, Math.max(1, (v.duration - v.currentTime) / FINISH_S))
      if (want && Math.abs(want - v.playbackRate) > 0.02) v.playbackRate = Math.abs(want - v.playbackRate) < 0.1 ? want : v.playbackRate + (want - v.playbackRate) * 0.25
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [finish])

  // 이동 영상 빠르기 — 속도선은 빨리감기 동안만
  useEffect(() => {
    const v = ref.current
    if (!v || !move || !play) return
    let raf = 0, was = false
    const tick = () => {
      const fast = v.currentTime >= move.out && v.currentTime < move.in
      const rate = fast ? FAST_RATE : WALK_RATE
      if (v.playbackRate !== rate) v.playbackRate = rate
      if (fast !== was) { was = fast; cb.current.onFast?.(fast) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); if (was) cb.current.onFast?.(false) }
  }, [move, play])

  return <video ref={ref} className="sip-plate sip-film" data-on={seen || undefined} src={`${ART}/${src}.mp4`} muted playsInline preload="auto" disablePictureInPicture
    onEnded={() => cb.current.onEnd?.()} onError={() => cb.current.onEnd?.()} />
}
