'use client'
/* eslint-disable @next/next/no-img-element -- 장면 그림 */

// 하린 루트 재생기(2026-11-19) — 공용 KxVideoStage(../../video/stage.tsx)와 같은 [앞 · 지금 · 다음] 세 겹 재생에 '대사 조각'을 한 고리로 넣었다.
//   대사 조각 talk/<줄 id>.mp4 는 그 장면 대기 영상 위에 입 모양만 목소리에 맞춘 것(Sync.so, design-review/scent-art/tools/scent-talk-sync.py) —
//   첫 · 끝 프레임이 장소 그림이라 대기 → 대사 → 대사 → 대기가 모두 이음매 없이 붙는다.
//   그전(HeyGen 판)은 대사 영상을 대기 영상 위에 겹쳐 틀어, 대기 영상이 어느 자세에 있든 그 위로 다른 자세가 튀어 들어왔다.
//   말할 줄(say)이 생기면 지금 대기 조각을 남은 몫만 최대 2배로 마저 틀고(≤ 약 2초) 그 끝에서 대사 조각을 튼다. 대사 조각은 소리를 켠다.
//   대사 조각의 끝 몫(목소리 뒤 0.5초 · 입을 다물고 장소 자세로 돌아옴)에 들어서면 onSaid — 다음 줄이 오면 그 줄이, 없으면 대기 조각이 이어진다.

import { useEffect, useRef, useState } from 'react'
import type { KxMove, KxVideoPlan } from '../../video/stage'
import '../../video/stage.css'

const WALK_RATE = 1.5
const FAST_RATE = 3.5
const FINISH_MAX_RATE = 2
const FINISH_S = 1.2
const FADE_MS = 150
const LEAD_S = 0.12
const SKIP_S = 0.04
const BEAT_S = 4
/** 대사 조각 끝에 붙은 '목소리 뒤 쉼'(scent-talk-sync.py TAIL_S) — 이 몫에 들어서면 말은 끝난 것 */
const TALK_TAIL_S = 0.45
const moveMs = (m: KxMove) => Math.round(1000 * (m.out / WALK_RATE + (m.in - m.out) / FAST_RATE + (m.len - m.in) / WALK_RATE))

/** 말할 줄 — n: 몇 번째 말인지(같은 줄을 두 번 말해도 다르게) */
export type HarinSay = { id: string; n: number }
type Clip = { src: string; at: string; move?: KxMove; say?: number; id: number }

function after(plan: KxVideoPlan, cur: Clip, target: string, pick: number, say: HarinSay | null, said: number): Clip {
  const id = cur.id + 1
  if (cur.at !== target) {
    const m = plan.moves[`${cur.at}>${target}`]
    return m ? { src: m.src, at: target, move: m, id } : { src: `hi-${target}`, at: target, id }
  }
  if (cur.move) return { src: `hi-${cur.at}`, at: cur.at, id }
  if (say && say.n > said) return { src: `talk/${say.id}`, at: cur.at, say: say.n, id }
  return { src: `idle-${cur.at}-${pick + 1}`, at: cur.at, id }
}

/**
 * scene: 가야 할 장면 · onSettle: 도착 장면 첫 조각이 그려지면 · say: 지금 말할 줄(없으면 null) ·
 * onVoice(n): 그 줄의 대사 조각이 화면에 나왔을 때(대사창 글자를 이때 띄운다) · onSaid(n): 그 줄을 다 말했을 때
 */
export function HarinStage({ plan, scene, onSettle, say, onVoice, onSaid }: {
  plan: KxVideoPlan; scene: string; onSettle: (at: string) => void
  say: HarinSay | null; onVoice: (n: number) => void; onSaid: (n: number) => void
}) {
  const roll = () => Math.floor(Math.random() * plan.idles)
  const [st, setSt] = useState<{ prev: Clip | null; cur: Clip; pick: number; on: boolean; said: number }>(() => ({ prev: null, cur: { src: `hi-${scene}`, at: scene, id: 0 }, pick: 0, on: false, said: 0 }))
  const { prev, cur, on } = st
  // 지금 틀고 있는 말은 이미 말한 것으로 친다(같은 줄이 다음 조각으로 또 잡히지 않게)
  const said = Math.max(st.said, cur.say ?? 0)
  const next = after(plan, cur, scene, st.pick, say, said)
  const [fast, setFast] = useState(false)

  const ended = (id: number, n: Clip) => setSt((x) => (x.cur.id === id ? { prev: x.cur, cur: n, pick: roll(), on: false, said: Math.max(x.said, x.cur.say ?? 0) } : x))
  const shown = (id: number) => setSt((x) => (x.cur.id === id ? { ...x, prev: null, on: true } : x))
  const endRef = useRef(ended)
  useEffect(() => { endRef.current = ended })
  const cb = useRef({ onSettle, onVoice, onSaid })
  useEffect(() => { cb.current = { onSettle, onVoice, onSaid } })

  useEffect(() => { if (on && !cur.move) cb.current.onSettle(cur.at) }, [on, cur])
  useEffect(() => { if (on && cur.say) cb.current.onVoice(cur.say) }, [on, cur])
  // 안전장치 — 영상이 멈추거나 안 받아지면 다음 조각으로. 대사 조각은 길이가 줄마다 달라 넉넉히
  useEffect(() => {
    const ms = cur.move ? moveMs(cur.move) + 3000 : cur.say ? 16000 : BEAT_S * 1000 + 3000
    const t = window.setTimeout(() => {
      if (cur.say) cb.current.onSaid(cur.say)
      endRef.current(cur.id, after(plan, cur, scene, 0, null, cur.say ?? 0))
    }, ms)
    return () => window.clearTimeout(t)
  }, [cur, scene, plan])

  // 마저 틀기 — 떠날 때, 또는 대기 중에 말할 줄이 생겼을 때(대사 조각은 마저 틀지 않는다 — 말을 빨리 감지 않는다)
  const finish = !cur.move && !cur.say && (cur.at !== scene || Boolean(say && say.n > said))
  const key = (c: Clip) => `${c.src}#${c.id}`
  return <>
    <div className="kv-world" data-scene={cur.at}>
      <img className="kv-plate" src={`${plan.base}/${cur.move ? prev?.at ?? cur.at : cur.at}.webp`} alt="" draggable={false} />
      {prev && <Film key={key(prev)} base={plan.base} src={prev.src} play move={prev.move} />}
      <Film key={key(cur)} base={plan.base} src={cur.src} play move={cur.move} finish={finish} sound={Boolean(cur.say)}
        onFast={setFast} onShown={() => shown(cur.id)} onEnd={() => ended(cur.id, next)}
        onTail={cur.say ? () => cb.current.onSaid(cur.say!) : undefined} />
      <Film key={key(next)} base={plan.base} src={next.src} play={false} />
    </div>
    {cur.move && <i key={cur.id} className="kv-lines" data-fast={fast || undefined} />}
  </>
}

/** 영상 한 겹 — 미리 받아 첫 프레임에 멈춰 있다가 play 면 한 번 튼다. 첫 프레임이 그려진 뒤에야 보인다(공용 Film 과 같음 + 소리 · 끝 몫 알림) */
function Film({ base, src, play, finish = false, move, sound = false, onFast, onShown, onEnd, onTail }: {
  base: string; src: string; play: boolean; finish?: boolean; move?: KxMove; sound?: boolean
  onFast?: (fast: boolean) => void; onShown?: () => void; onEnd?: () => void; onTail?: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [seen, setSeen] = useState(false)
  const cb = useRef({ onFast, onShown, onEnd, onTail })
  useEffect(() => { cb.current = { onFast, onShown, onEnd, onTail } })

  // 소리 — 지금 조각이 대사일 때만. 앞 겹으로 밀려나면(마지막 프레임을 붙드는 동안) 끈다
  useEffect(() => { const v = ref.current; if (v) v.muted = !sound }, [sound])

  useEffect(() => {
    const v = ref.current
    if (!v || !play || v.ended) return
    // 다음 겹으로 미리 받을 때 이미 못 받은 조각(파일 없음 등) — 그때는 알릴 곳이 없었으니 지금 바로 넘긴다(안전 타이머 16초를 기다리지 않게)
    if (v.error) { cb.current.onTail?.(); cb.current.onEnd?.(); return }
    let off = false, timer = 0
    const painted = () => { if (off) return; setSeen(true); timer = window.setTimeout(() => cb.current.onShown?.(), FADE_MS + 40) }
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(painted)
    else v.addEventListener('playing', () => requestAnimationFrame(() => requestAnimationFrame(painted)), { once: true })
    if (move) v.playbackRate = WALK_RATE
    // 소리를 막는 브라우저면(NotAllowedError) 소리 없이라도 입은 움직인다. 정리하며 끊긴 AbortError 는 그대로 둔다
    v.play().catch((e: unknown) => {
      if (off || !(e instanceof DOMException) || e.name !== 'NotAllowedError') return
      v.muted = true
      return v.play()
    }).catch(() => undefined)
    return () => { off = true; window.clearTimeout(timer) }
  }, [play, move])

  // 넘김을 미리(LEAD_S) · 대사 조각은 끝 몫에 들어서면 onTail 한 번
  useEffect(() => {
    const v = ref.current
    if (!v || !play) return
    let raf = 0, told = false, tail = false
    const tick = () => {
      if (Number.isFinite(v.duration) && v.duration > 0 && !v.paused) {
        const left = v.duration - v.currentTime
        if (!tail && left <= TALK_TAIL_S) { tail = true; cb.current.onTail?.() }
        if (!told && left / (v.playbackRate || 1) <= LEAD_S) { told = true; cb.current.onEnd?.() }
      }
      if (!told) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play])

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

  useEffect(() => {
    const v = ref.current
    if (!v || !move || !play) return
    let raf = 0, was = false
    const tick = () => {
      const isFast = v.currentTime >= move.out && v.currentTime < move.in
      const rate = isFast ? FAST_RATE : WALK_RATE
      if (v.playbackRate !== rate) v.playbackRate = rate
      if (isFast !== was) { was = isFast; cb.current.onFast?.(isFast) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); if (was) cb.current.onFast?.(false) }
  }, [move, play])

  return <video ref={ref} className="kv-plate kv-film" data-on={seen || undefined} src={`${base}/${src}.mp4`} muted playsInline preload="auto" disablePictureInPicture
    onLoadedData={(e) => { const v = e.currentTarget; if (!play && v.currentTime === 0) v.currentTime = SKIP_S }}
    onEnded={() => { cb.current.onTail?.(); cb.current.onEnd?.() }} onError={() => { cb.current.onTail?.(); cb.current.onEnd?.() }} />
}
