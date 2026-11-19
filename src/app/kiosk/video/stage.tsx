'use client'
/* eslint-disable @next/next/no-img-element -- 장면 그림(최적화할 원격 그림이 아니다) */

// 키오스크 영상판 재생기(2026-11-18) — 길잡이 인물 영상을 컷 · 빈 화면 없이 잇는다. SIP! 영상판(src/app/kiosk/experience/expansion/SipMotion.tsx)을
// 프로그램마다 표(KxVideoPlan)만 바꿔 쓰게 일반화한 것. 원리 · 함정은 .claude/skills/kiosk-video-flow/references/player.md
//   장면마다 조각 영상: hi-<장면>(도착 인사 4초, 한 번) · idle-<장면>-N(대기 4초, 무작위로 이어 틀기). 모든 조각의 첫 · 끝 프레임 = 그 장면 그림.
//   장면 사이: 이동 영상(첫 프레임 = 떠나는 장면 그림, 끝 = 도착 장면 그림) — `떠나는>도착` 짝으로 고른다. 짝이 없으면 도착 장면 인사로 바로(컷).
//   버튼을 누르면 지금 조각을 끝까지(남은 몫이 길면 최대 2배로 — 4초 조각이면 길어도 2초) 틀고 ended 에서 이동 영상으로 넘긴다.
//   겹 셋 [앞 · 지금 · 다음]: 다음 조각은 미리 받아 첫 프레임에 멈춰 두고, 지금 조각이 되면 첫 프레임이 그려진 뒤에야 보인다(그동안 앞 조각이 마지막 프레임을 붙든다).
//   결과 장면의 빈 면(거울 · 캔버스 · 즉석 사진)에는 손님 결과를 매 프레임 '그 면 색인 곳에만' 곱해 얹는다(SurfaceArt) — 손 · 소매가 면을 가려도 그 위로 덮지 않는다.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './stage.css'

/** 이동 영상 — out: 인물이 화면 밖으로 다 나간 초 · in: 걸어 들어오기 시작한 초 · len: 길이(초). 걷지 않고 자세만 바꾸는 이동은 out = in = len */
export interface KxMove { src: string; out: number; in: number; len: number }

export interface KxVideoPlan {
  /** 영상 · 장면 그림 폴더(public) — <장면>.webp · hi-<장면>.mp4 · idle-<장면>-N.mp4 · 이동 영상 */
  base: string
  scenes: string[]
  /** 장면마다 대기 영상 가짓수 */
  idles: number
  /** `떠나는>도착` → 이동 영상 */
  moves: Record<string, KxMove>
  /** 결과를 얹을 빈 면 — 영상(720×1280) 기준 px. 면 색(첫 프레임 가운데의 밝은 색)에 가까운 곳에만 얹는다 */
  /** quad: 면이 비스듬히 놓였을 때 네 모서리(왼위 · 오른위 · 오른아래 · 왼아래, 720×1280 기준) — 결과 그림을 원근에 맞춰 구부려 통째로(자르지 않고) 얹는다 */
  surface?: KxRect & { scene: string; quad?: [number, number][] }
  /** 길잡이 마스크를 붙인 조각(720×2560: 위 영상 · 아래 마스크, 흰색 = 길잡이) — 화면에는 위 절반만, FrontOf 가 마스크로 길잡이를 면 앞에 둔다 */
  matte?: string[]
}

/** 영상(720×1280) 위 자리 — px */
export interface KxRect { x: number; y: number; w: number; h: number }
const pct = (v: number, of: number) => `${(v / of) * 100}%`
/** 영상 위 자리를 영상 세계(.kv-world) 안의 절대 위치로 */
export const rectStyle = (r: KxRect): CSSProperties => ({ position: 'absolute', left: pct(r.x, 720), top: pct(r.y, 1280), width: pct(r.w, 720), height: pct(r.h, 1280) })

/** 걷는 앞뒤 · 길 빠르기, 버튼 뒤 마저 틀기 */
const WALK_RATE = 1.5
const FAST_RATE = 3.5
const FINISH_MAX_RATE = 2
const FINISH_S = 1.2
const FADE_MS = 150
/** 넘김을 미리 — 앞 조각이 이만큼(실제 초) 남았을 때 다음 조각을 틀기 시작한다. 끝난 뒤에 틀면 시작 지연 동안 마지막 그림이 66~100ms 머물러 '뚝' 끊겨 보였다(2026-11-18 실측) */
const LEAD_S = 0.12
/** 다음 조각의 첫 그림은 앞 조각의 마지막 그림과 같다(이음매) — 같은 그림이 두 번 이어지지 않게 한 장 건너뛰고 시작한다 */
const SKIP_S = 0.04
const BEAT_S = 4
const moveMs = (m: KxMove) => Math.round(1000 * (m.out / WALK_RATE + (m.in - m.out) / FAST_RATE + (m.len - m.in) / WALK_RATE))

/** 조각 하나 — at: 이 조각이 끝나는 장면(이동 영상이면 도착 장면) · id: 틀어 온 차례(겹의 key) */
type Clip = { src: string; at: string; move?: KxMove; id: number }
const hi = (s: string, id: number): Clip => ({ src: `hi-${s}`, at: s, id })
const idle = (s: string, pick: number, id: number): Clip => ({ src: `idle-${s}-${pick + 1}`, at: s, id })

/** 다음에 탈 이동 영상 — 바로 가는 것이 없으면 한 장면을 거쳐 가는 길의 첫 구간(예: 화장대 → 팔레트 → 런웨이). 그것도 없으면 null(도착 장면 인사로 바로 — 컷) */
function hop(plan: KxVideoPlan, from: string, to: string): { at: string; m: KxMove } | null {
  const direct = plan.moves[`${from}>${to}`]
  if (direct) return { at: to, m: direct }
  for (const mid of plan.scenes) {
    const a = plan.moves[`${from}>${mid}`]
    if (a && plan.moves[`${mid}>${to}`]) return { at: mid, m: a }
  }
  return null
}

function after(plan: KxVideoPlan, cur: Clip, target: string, pick: number): Clip {
  const id = cur.id + 1
  if (cur.at !== target) {
    const h = hop(plan, cur.at, target)
    return h ? { src: h.m.src, at: h.at, move: h.m, id } : hi(target, id)
  }
  return cur.move ? hi(cur.at, id) : idle(cur.at, pick, id)
}

/** 미리 받기 — 가는 차례대로(장면마다 인사 · 대기 · 그 장면에서 떠나는 이동 영상) 두 개씩. 한꺼번에 받으면 바로 다음에 틀 조각이 뒤로 밀려
 *  그 조각이 늦게 와 장면 그림만 보이는 때가 있었다(2026-11-18, 영상 27개 23MB) */
const preloaded = new Set<string>()
export function preloadPlan(plan: KxVideoPlan) {
  if (preloaded.has(plan.base)) return
  preloaded.add(plan.base)
  for (const s of plan.scenes) { const i = new Image(); i.src = `${plan.base}/${s}.webp` }
  const moves = Object.entries(plan.moves)
  const names = [...new Set(plan.scenes.flatMap((s) => [`hi-${s}`, ...Array.from({ length: plan.idles }, (_, i) => `idle-${s}-${i + 1}`), ...moves.filter(([k]) => k.startsWith(`${s}>`)).map(([, m]) => m.src)]))]
  let next = 0
  const run = async () => { while (next < names.length) await fetch(`${plan.base}/${names[next++]}.mp4`).then((r) => r.blob()).catch(() => undefined) }
  void run(); void run()
}

/**
 * 움직이는 장면 — scene 은 가야 할 장면. 도착 장면 인사 조각이 화면에 그려지면 onSettle 로 알린다.
 * art: 결과 장면 빈 면에 얹을 그림(없으면 빈 면 그대로)
 */
export function KxVideoStage({ plan, scene, onSettle, art, fit = 'cover', inside, front }: {
  plan: KxVideoPlan; scene: string; onSettle: (at: string) => void; art?: string | null
  /** 결과 그림을 면에 — cover: 꽉 채우고 넘치는 쪽을 자름 · contain: 비율 그대로(여럿이 찍은 가로 그림) · top: 폭에 맞춰 위쪽에(좁고 긴 거울에 비친 모습) */
  fit?: 'cover' | 'contain' | 'top'
  /** 영상 세계 안에 함께 그릴 것(rectStyle 로 자리를 잡는다 — 거울 안 카메라 등). 이동 중에도 그대로 둘지는 부르는 쪽이 정한다 */
  inside?: ReactNode
  /** inside 를 면 전체에 깔고 길잡이를 그 앞에 — 이 네모 안에서 길잡이(면 색이 아닌 것)만 매 프레임 영상에서 다시 그린다(FrontOf) */
  front?: KxRect | null
}) {
  const roll = () => Math.floor(Math.random() * plan.idles)
  const [st, setSt] = useState<{ prev: Clip | null; cur: Clip; pick: number; on: boolean }>(() => ({ prev: null, cur: hi(scene, 0), pick: 0, on: false }))  // 처음 대기 조각은 고정(서버 렌더와 같게 — 무작위면 미리 받는 겹의 src 가 달라 hydration 경고)
  const { prev, cur, on } = st
  const next = after(plan, cur, scene, st.pick)
  const [fast, setFast] = useState(false)
  const world = useRef<HTMLDivElement>(null)

  const ended = (id: number, n: Clip) => setSt((x) => (x.cur.id === id ? { prev: x.cur, cur: n, pick: roll(), on: false } : x))
  const shown = (id: number) => setSt((x) => (x.cur.id === id ? { ...x, prev: null, on: true } : x))
  const endRef = useRef(ended)
  useEffect(() => { endRef.current = ended })

  useEffect(() => { if (on && !cur.move) onSettle(cur.at) }, [on, cur, onSettle])
  // 안전장치 — 영상이 멈추거나 안 받아지면 다음 조각으로(화면 넘김은 ended 가 한다)
  useEffect(() => {
    const ms = (cur.move ? moveMs(cur.move) : BEAT_S * 1000) + 3000
    const id = window.setTimeout(() => endRef.current(cur.id, after(plan, cur, scene, 0)), ms)
    return () => window.clearTimeout(id)
  }, [cur, scene, plan])

  const sf = plan.surface
  // 결과 면 — 그 장면에 머무는 동안만(떠나는 이동 영상이 시작되면 걷는다)
  const showArt = Boolean(sf && art && !cur.move && cur.at === sf.scene)
  const key = (c: Clip) => `${c.src}#${c.id}`
  return <>
    <div ref={world} className="kv-world" data-scene={cur.at}>
      <img className="kv-plate" src={`${plan.base}/${cur.move ? prev?.at ?? cur.at : cur.at}.webp`} alt="" draggable={false} />
      {prev && <Film key={key(prev)} base={plan.base} src={prev.src} matte={plan.matte?.includes(prev.src)} play move={prev.move} />}
      <Film key={key(cur)} base={plan.base} src={cur.src} matte={plan.matte?.includes(cur.src)} play move={cur.move} finish={!cur.move && cur.at !== scene}
        onFast={setFast} onShown={() => shown(cur.id)} onEnd={() => ended(cur.id, next)} />
      <Film key={key(next)} base={plan.base} src={next.src} matte={plan.matte?.includes(next.src)} play={false} />
      {showArt && sf && art && (
        <SurfaceArt key={`${fit}${art}`} art={art} world={world} sf={sf} fit={fit} style={rectStyle(sf)} />
      )}
      {inside}
      {front && <FrontOf key={`${front.x},${front.y}`} world={world} rect={front} />}
    </div>
    {cur.move && <i key={cur.id} className="kv-lines" data-fast={fast || undefined} />}
  </>
}

/** 영상 한 겹 — 미리 받아 첫 프레임에 멈춰 있다가 play 면 한 번 튼다. 첫 프레임이 그려진 뒤에야 보인다 */
function Film({ base, src, matte = false, play, finish = false, move, onFast, onShown, onEnd }: {
  base: string; src: string; matte?: boolean; play: boolean; finish?: boolean; move?: KxMove
  onFast?: (fast: boolean) => void; onShown?: () => void; onEnd?: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [seen, setSeen] = useState(false)
  const cb = useRef({ onFast, onShown, onEnd })
  useEffect(() => { cb.current = { onFast, onShown, onEnd } })

  useEffect(() => {
    const v = ref.current
    if (!v || !play || v.ended) return
    let off = false, timer = 0
    const painted = () => { if (off) return; setSeen(true); timer = window.setTimeout(() => cb.current.onShown?.(), FADE_MS + 40) }
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(painted)
    else (v as HTMLVideoElement).addEventListener('playing', () => requestAnimationFrame(() => requestAnimationFrame(painted)), { once: true })
    if (move) v.playbackRate = WALK_RATE
    v.play().catch(() => undefined)
    return () => { off = true; window.clearTimeout(timer) }
  }, [play, move])

  // 넘김을 미리 — 남은 몫(빠르기로 나눈 실제 초)이 LEAD_S 아래로 내려가면 한 번만 끝났다고 알린다(앞 조각은 마저 돌며 다음 조각이 그려질 때까지 화면을 잇는다)
  useEffect(() => {
    const v = ref.current
    if (!v || !play) return
    let raf = 0, told = false
    const tick = () => {
      if (!told && Number.isFinite(v.duration) && v.duration > 0 && !v.paused && (v.duration - v.currentTime) / (v.playbackRate || 1) <= LEAD_S) { told = true; cb.current.onEnd?.() }
      if (!told) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play])

  // 마저 틀기 — 누른 순간 남은 몫으로 빠르기를 한 번 정하고 끝까지
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

  // 이동 영상 빠르기 — 걷는 앞뒤 WALK_RATE, 길 FAST_RATE(속도선)
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

  return <video ref={ref} className="kv-plate kv-film" data-on={seen || undefined} data-matte={matte || undefined} src={`${base}/${src}.mp4`} muted playsInline preload="auto" disablePictureInPicture
    onLoadedData={(e) => { const v = e.currentTarget; if (!play && v.currentTime === 0) v.currentTime = SKIP_S }}
    onEnded={() => cb.current.onEnd?.()} onError={() => cb.current.onEnd?.()} />
}

const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src })

/**
 * 빈 면에 결과 얹기 — 매 프레임 맨 위에 보이는 영상에서 면 부분을 읽어, 면 색(처음 프레임 가운데의 밝은 색)에 가까운 픽셀에만
 * 결과 그림 × 면 밝기를 칠한다. 손 · 소매 · 테두리는 영상 그대로 남고, 면의 빛 · 그림자가 그림에 묻는다(스티커처럼 뜨지 않게).
 */
function SurfaceArt({ art, world, sf, fit, style }: { art: string; world: React.RefObject<HTMLDivElement | null>; sf: NonNullable<KxVideoPlan['surface']>; fit: 'cover' | 'contain' | 'top'; style: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let stop = false, raf = 0
    const { w, h } = sf
    const work = document.createElement('canvas'); work.width = w; work.height = h
    const wg = work.getContext('2d', { willReadFrequently: true })!
    void loadImg(art).then((img) => {
      // 결과 그림을 면 크기로 — cover 는 넘치는 쪽을 가운데 기준으로 자르고, contain 은 남는 쪽을 비워 면이 그대로 보이게
      const pc = document.createElement('canvas'); pc.width = w; pc.height = h
      const pg = pc.getContext('2d', { willReadFrequently: true })!
      if (sf.quad) warpInto(pg, img, sf)
      else {
      const s = fit === 'top' ? w / img.naturalWidth : (fit === 'contain' ? Math.min : Math.max)(w / img.naturalWidth, h / img.naturalHeight)
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s
      pg.drawImage(img, (w - dw) / 2, fit === 'top' ? Math.max(0, (h - dh) * 0.16) : (h - dh) / 2, dw, dh)
      // 위쪽에 둔 사진은 아래 끝을 거울 빛으로 스미게
      if (fit === 'top' && dh < h) {
        const y1 = Math.max(0, (h - dh) * 0.16) + dh
        pg.globalCompositeOperation = 'destination-out'
        const g = pg.createLinearGradient(0, y1 - dh * 0.18, 0, y1)
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)')
        pg.fillStyle = g; pg.fillRect(0, y1 - dh * 0.18, w, dh * 0.18)
        pg.globalCompositeOperation = 'source-over'
      }
      }
      const p = pg.getImageData(0, 0, w, h).data
      const out = ref.current?.getContext('2d')
      if (stop || !out) return
      let ref0: [number, number, number] | null = null
      const tick = () => {
        if (stop) return
        const v = [...(world.current?.querySelectorAll<HTMLVideoElement>('video.kv-film[data-on]') ?? [])].pop()
        if (v && v.videoWidth && v.readyState >= 2) {
          const k = v.videoWidth / 720
          wg.drawImage(v, sf.x * k, sf.y * k, w * k, h * k, 0, 0, w, h)
          const px = wg.getImageData(0, 0, w, h), d = px.data
          if (!ref0) {
            let r = 0, g = 0, b = 0, n = 0
            for (let y = Math.round(h * 0.15); y < h * 0.85; y += 3) for (let x = Math.round(w * 0.15); x < w * 0.85; x += 3) {
              const i = (y * w + x) * 4
              if (d[i] + d[i + 1] + d[i + 2] < 540) continue
              r += d[i]; g += d[i + 1]; b += d[i + 2]; n++
            }
            ref0 = n ? [r / n, g / n, b / n] : [235, 232, 225]
          }
          const [R, G, B] = ref0, S = R + G + B, cr = R / S, cg = G / S
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2], sum = r + g + b + 1
            const dr = r / sum - cr, dg = g / sum - cg
            const dist = Math.sqrt(dr * dr + dg * dg)
            // 면 색에 가까울수록 1 — 피부 · 옷 · 나무 테는 0. 너무 어두운 곳(그림자 속 소매)도 0
            let m = dist < 0.012 ? 1 : dist > 0.028 ? 0 : 1 - (dist - 0.012) / 0.016
            if (sum < 330) m = 0
            m *= p[i + 3] / 255
            if (m <= 0) continue
            d[i] = r + (Math.min(255, p[i] * r / R) - r) * m
            d[i + 1] = g + (Math.min(255, p[i + 1] * g / G) - g) * m
            d[i + 2] = b + (Math.min(255, p[i + 2] * b / B) - b) * m
          }
          out.putImageData(px, 0, 0)
        }
        raf = requestAnimationFrame(tick)
      }
      tick()
    }).catch(() => undefined)
    return () => { stop = true; cancelAnimationFrame(raf) }
  }, [art, world, sf, fit])
  return <canvas ref={ref} className="kv-surface" width={sf.w} height={sf.h} style={style} />
}

/**
 * 길잡이를 면 앞에(2026-11-18 MAKEUP! 화장대 — 거울 전체에 카메라 · 비교 화면을 깔고 이안은 그 앞에 선다. 11-19 층으로 다시 짬).
 * 층: 맨 아래 영상 · 그 위 거울 속(inside: 카메라 · 비교 화면) · 맨 위 이 캔버스. 캔버스는 영상 한 장을 통째로 다시 그리고 거울 유리(rect)만 뚫는다 —
 *   유리 안에서도 길잡이(마스크 흰 곳)와 왼쪽 끝 소품(붓 통)은 남긴다. 화면 전체가 캔버스 한 장이라 이어 붙인 금(사파리는 영상과 캔버스의 색이 조금 다르다)이 없다.
 * 마스크: 조각 영상 아래 절반(plan.matte, design-review/kiosk-cast/tools/matte-clips.py 가 사람 분할로 미리 만든다). 마스크가 없는 조각이면 자리로 가른다(오른쪽에서 훑기).
 */
function FrontOf({ world, rect }: { world: React.RefObject<HTMLDivElement | null>; rect: KxRect }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let stop = false, raf = 0
    const { w, h } = rect
    const work = document.createElement('canvas'); work.width = w; work.height = h
    const wg = work.getContext('2d', { willReadFrequently: true })!
    const out = ref.current?.getContext('2d', { willReadFrequently: true })
    if (!out) return
    let ref0: [number, number, number] | null = null
    const edgeR = new Float32Array(h), edgeL = new Float32Array(h), rawR = new Float32Array(h), rawL = new Float32Array(h)
    let first = true
    const RUN = 4, GAP = 24, FEATHER = 5
    const tick = () => {
      if (stop) return
      const v = [...(world.current?.querySelectorAll<HTMLVideoElement>('video.kv-film[data-on]') ?? [])].pop()
      if (v && v.videoWidth && v.readyState >= 2) {
        const k = v.videoWidth / 720, matte = v.dataset.matte !== undefined
        out.drawImage(v, 0, 0, 720 * k, 1280 * k, 0, 0, 720, 1280)
        const px = out.getImageData(rect.x, rect.y, w, h), d = px.data
        // 마스크(길잡이) — 아래 절반의 같은 자리
        let mask: Uint8ClampedArray | null = null
        if (matte) { wg.drawImage(v, rect.x * k, (1280 + rect.y) * k, w * k, h * k, 0, 0, w, h); mask = wg.getImageData(0, 0, w, h).data }
        if (!ref0) {
          // 면 색 — 왼쪽 위 넓은 곳의 밝은 점 평균(길잡이가 없는 쪽)
          let r = 0, g = 0, b = 0, n = 0
          for (let y = Math.round(h * 0.1); y < h * 0.6; y += 3) for (let x = 4; x < w * 0.45; x += 3) {
            const i = (y * w + x) * 4
            if (d[i] + d[i + 1] + d[i + 2] < 540) continue
            r += d[i]; g += d[i + 1]; b += d[i + 2]; n++
          }
          ref0 = n ? [r / n, g / n, b / n] : [252, 240, 219]
        }
        const [R, G, B] = ref0, S = R + G + B, cr = R / S, cg = G / S
        const glass = (i: number) => {
          const r = d[i], g = d[i + 1], b = d[i + 2], sum = r + g + b + 1
          if (sum < S * 0.78) return false
          const dr = r / sum - cr, dg = g / sum - cg
          return dr * dr + dg * dg < 0.022 * 0.022
        }
        for (let y = 0; y < h; y++) {
          const row = y * w * 4
          // 마스크가 없을 때만 — 오른쪽 끝에서 왼쪽으로, 면 색이 GAP 점 넘게 이어지는 곳까지를 길잡이로
          if (!mask) {
            let x = w - 1, run = 0
            for (; x >= 0; x--) { if (glass(row + x * 4)) { if (++run >= GAP) break } else run = 0 }
            rawR[y] = x < 0 ? 0 : x + run
          }
          // 왼쪽 끝에 붙은 소품(붓 통) — 면 색이 몇 점 이어지면 끝
          let l = 0, run = 0
          for (; l < w; l++) { if (glass(row + l * 4)) { if (++run >= RUN) break } else run = 0 }
          rawL[y] = Math.max(0, l - run + 1)
        }
        for (let y = 0; y < h; y++) {
          let mr = rawR[y], ml = rawL[y]
          for (let j = -2; j <= 2; j++) { const yy = y + j; if (yy >= 0 && yy < h) { mr = Math.min(mr, rawR[yy]); ml = Math.max(ml, rawL[yy]) } }
          edgeR[y] = first ? mr : edgeR[y] + (mr - edgeR[y]) * 0.5
          edgeL[y] = first ? ml : edgeL[y] + (ml - edgeL[y]) * 0.5
        }
        first = false
        for (let y = 0; y < h; y++) {
          const er = edgeR[y] - 3, el = edgeL[y] + 2
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            const front = mask ? mask[i] / 255 : x >= er ? 1 : x < er - FEATHER ? 0 : (x - (er - FEATHER)) / FEATHER
            const prop = el <= 2 ? 0 : x <= el ? 1 : x > el + FEATHER ? 0 : 1 - (x - el) / FEATHER
            d[i + 3] = Math.max(front, prop) * 255
          }
        }
        out.putImageData(px, rect.x, rect.y)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => { stop = true; cancelAnimationFrame(raf) }
  }, [world, rect])
  return <canvas ref={ref} className="kv-front" width={720} height={1280} aria-hidden="true" />
}

/** 네 점 사각형 → 단위 정사각형(u, v ∈ 0~1) 사영 변환. 모서리 순서: 왼위 · 오른위 · 오른아래 · 왼아래 */
function quadToUnit(q: [number, number][]) {
  // 단위 정사각형 → 사각형(Heckbert) 을 구한 뒤 뒤집는다
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / den, hh = (dx1 * sy - sx * dy1) / den
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0
  // 역행렬(수반 행렬)
  const A = e - f * hh, B = c * hh - b, C = b * f - c * e
  const D = f * g - d, E = a - c * g, F = c * d - a * f
  const G = d * hh - e * g, H = b * g - a * hh, I = a * e - b * d
  return (x: number, y: number): [number, number] => { const z = G * x + H * y + I; return [(A * x + B * y + C) / z, (D * x + E * y + F) / z] }
}

/**
 * 비스듬한 면(DRAW! 이젤 캔버스)에 그림을 원근대로 — 그림 비율 그대로 면 안에 다 들어가게(가장자리 여백 5%), 자르지 않는다(구도 유지, 2026-11-18 사용자 지시).
 * 면 네모(sf) 크기의 캔버스에 그린다. 면 밖 · 여백은 투명(면이 그대로 보인다)
 */
function warpInto(pg: CanvasRenderingContext2D, img: HTMLImageElement, sf: KxRect & { quad?: [number, number][] }) {
  const q = sf.quad!.map(([x, y]) => [x - sf.x, y - sf.y] as [number, number])
  const toUnit = quadToUnit(q)
  const len = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1])
  // 면의 실제 비율(가로 ÷ 세로) — 마주 보는 변의 평균
  const faceW = (len(q[0], q[1]) + len(q[3], q[2])) / 2, faceH = (len(q[0], q[3]) + len(q[1], q[2])) / 2
  const M = 0.05
  const artA = img.naturalWidth / img.naturalHeight, boxA = (faceW * (1 - 2 * M)) / (faceH * (1 - 2 * M))
  // 그림이 차지할 u · v 범위(가운데)
  const uw = artA > boxA ? 1 - 2 * M : (1 - 2 * M) * artA / boxA
  const vh = artA > boxA ? (1 - 2 * M) * boxA / artA : 1 - 2 * M
  const u0 = (1 - uw) / 2, v0 = (1 - vh) / 2
  // 그림 픽셀 — 면 크기의 두 배 해상도로 한 번 읽어 두고 이중 선형으로 뽑는다
  const SW = Math.round(faceW * 2), SH = Math.round(SW / artA)
  const src = document.createElement('canvas'); src.width = SW; src.height = SH
  const sg = src.getContext('2d', { willReadFrequently: true })!
  sg.drawImage(img, 0, 0, SW, SH)
  const s = sg.getImageData(0, 0, SW, SH).data
  const { width: w, height: h } = pg.canvas
  const out = pg.createImageData(w, h), o = out.data
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [u, v] = toUnit(x + 0.5, y + 0.5)
    const fu = (u - u0) / uw, fv = (v - v0) / vh
    if (fu < 0 || fu > 1 || fv < 0 || fv > 1) continue
    const sx = fu * (SW - 1), sy = fv * (SH - 1)
    const ix = Math.min(SW - 2, Math.floor(sx)), iy = Math.min(SH - 2, Math.floor(sy)), ax = sx - ix, ay = sy - iy
    const i00 = (iy * SW + ix) * 4, i10 = i00 + 4, i01 = i00 + SW * 4, i11 = i01 + 4
    const k = (y * w + x) * 4
    for (let c = 0; c < 4; c++) o[k + c] = (s[i00 + c] * (1 - ax) + s[i10 + c] * ax) * (1 - ay) + (s[i01 + c] * (1 - ax) + s[i11 + c] * ax) * ay
  }
  pg.putImageData(out, 0, 0)
}
