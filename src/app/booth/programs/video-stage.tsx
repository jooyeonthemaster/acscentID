'use client'
/* eslint-disable @next/next/no-img-element -- 장면 그림(조각 영상의 첫 · 끝 프레임, 최적화할 원격 그림이 아니다) */
// 부스 영상판(주소 &lab=video) — 화면 뒤에 길잡이 인물이 나오는 영상을 깐다(2026-11-18 사용자 지시: 관상 · 사주를 영상을 만들어 넣는 형식으로).
// 짜임은 .claude/skills/kiosk-video-flow(키오스크 SIP! 영상판 SipMotion.tsx 와 같은 재생기):
//   장면마다 조각 영상 — hi-<장면>(도착 인사 4초, 한 번) · idle-<장면>-N(대기 4초 × idles 가지, 무작위로 이어 틀기).
//   장면 사이는 이동 영상(첫 프레임 = 떠나는 장면 그림, 끝 = 도착 장면 그림) — 인물은 사라지지 않고 화면 밖으로 걸어 나가고 걸어 들어온다.
//   모든 조각의 첫 · 끝 프레임이 그 장면 그림이라 어느 조각 끝에서든 다음 조각으로 이음매 없이 붙는다.
//   버튼을 누르면 지금 조각을 끝까지 튼다(남은 몫이 길면 조금 빨리 — 4초 조각이면 길어도 2초) → 이동 영상 → 도착 장면 인사.
//   [앞 · 지금 · 다음] 세 겹 — 다음 조각을 미리 받아 두고 첫 프레임이 실제로 그려진 뒤에야 보인다. 넘김은 영상이 끝날 때(ended), 타이머는 안전장치만.
//   결과 장면에는 손님 초상을 영상 속 빈 족자 비단에 '그린다'(frame — 1920×1080 기준 px, SilkArt): 프레임마다 지금 보이는 영상의 비단 부분만 골라
//   (크림색 비단 = 그림, 손가락 · 소매 = 영상 그대로) 초상에 비단의 빛 · 그림자를 곱한다 — 스티커처럼 떠 보이지 않게(2026-11-18 사용자 지시).
// 프로그램별 영상 계획은 VIDEO_PLANS, 화면 덧칠은 video-stage.css. 그림 · 영상은 public/assets/booth-programs/<프로그램>-video.

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { ProgramId } from '@/lib/booth/programs/catalog'
import './video-stage.css'

/** 이동 영상 — out: 인물이 화면 밖으로 다 나간 초, in: 들어오기 시작하는 초(둘 다 len 이면 걷는 빠르기로 내내), walk: 걷는 앞뒤 빠르기 */
export type Move = { src: string; out: number; in: number; len: number; walk?: number }

export interface VideoPlan {
  /** 그림 · 영상 폴더 */
  base: string
  /** 처음 화면 장면 · 흐름을 막 시작했을 때 장면 */
  start: string
  firstFlow: string
  /** 흐름 단계(ReadingFlow step) → 장면 */
  steps: Record<string, string>
  /** 장면 → 장면 그림(조각 영상의 첫 · 끝 프레임, 영상이 안 될 때 보인다) */
  pics: Record<string, string>
  /** 장면마다 대기 영상 가짓수(idle-<장면>-1 …) */
  idles: number
  /** `떠나는>도착` → 이동 영상. 짝이 없으면 도착 장면 인사로 바로(컷) */
  moves: Record<string, Move>
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
  pics: { courtyard: 'courtyard', studio: 'studio', painting: 'painting', scroll: 'scroll' },
  idles: 2,
  moves: {
    // 0.25초 간격 프레임으로 잰 out · in(2026-11-18)
    'courtyard>studio': { src: 'move-studio', out: 2.25, in: 4.6, len: 8 },
    'studio>painting': { src: 'move-painting', out: 5, in: 5, len: 5, walk: 1.3 },
    'painting>scroll': { src: 'move-scroll', out: 8, in: 8, len: 8, walk: 1.4 },
    'scroll>courtyard': { src: 'move-courtyard', out: 4.45, in: 5.9, len: 8 },
  },
  // 빈 비단(금색 테 안쪽 x 700~1067 · y 214~871). 화원의 손끝(x 760 까지)은 SilkArt 가 비단 색이 아닌 곳으로 알아보고 남긴다
  frame: { scene: 'scroll', x: 703, y: 218, w: 361, h: 650 },
}

export const VIDEO_PLANS: Partial<Record<ProgramId, VideoPlan>> = { 'nh-face': FACE }

/** 주소의 &lab= 값(서버 렌더에서는 null) */
export function useLab(): string | null {
  return useSyncExternalStore(() => () => undefined, () => new URLSearchParams(window.location.search).get('lab'), () => null)
}

/** 이동 영상 빠르기 — 걷는 앞뒤 / 길 */
const WALK_RATE = 1.5
const FAST_RATE = 3.5
/** 버튼을 누른 뒤 지금 조각 마저 틀기 — 누른 순간 남은 몫을 FINISH_S 초 안에 끝낼 빠르기로 고정(FINISH_MAX_RATE 까지) */
const FINISH_MAX_RATE = 2
const FINISH_S = 1.8
/** 다음 조각이 첫 프레임을 그린 뒤 겹쳐 오는 시간 */
const FADE_MS = 150
const BEAT_S = 4
const moveMs = (m: Move) => { const w = m.walk ?? WALK_RATE; return Math.round(1000 * (m.out / w + (m.in - m.out) / FAST_RATE + (m.len - m.in) / w)) }

/** 조각 하나 — at: 이 조각이 끝나는 장면(이동 영상이면 도착) · from: 이동 영상이 떠난 장면 · id: 틀어 온 차례(겹의 key) */
type Clip = { src: string; at: string; from?: string; move?: Move; id: number }
const hi = (s: string, id: number): Clip => ({ src: `hi-${s}`, at: s, id })
const idle = (s: string, pick: number, id: number): Clip => ({ src: `idle-${s}-${pick + 1}`, at: s, id })
function after(plan: VideoPlan, cur: Clip, target: string, pick: number): Clip {
  const id = cur.id + 1
  if (cur.at !== target) {
    const m = plan.moves[`${cur.at}>${target}`]
    return m ? { src: m.src, at: target, from: cur.at, move: m, id } : hi(target, id)
  }
  return cur.move ? hi(cur.at, id) : idle(cur.at, pick, id)
}

/** 첫 손님이 기다리지 않게 그림 · 영상을 미리 받아 둔다 */
export function preloadVideoPlan(plan: VideoPlan) {
  for (const p of Object.values(plan.pics)) { const i = new Image(); i.src = `${plan.base}/${p}.webp` }
  const names = [...Object.values(plan.moves).map((m) => m.src), ...Object.keys(plan.pics).flatMap((s) => [`hi-${s}`, ...Array.from({ length: plan.idles }, (_, i) => `idle-${s}-${i + 1}`)])]
  for (const v of names) void fetch(`${plan.base}/${v}.mp4`).catch(() => undefined)
}

export function VideoStage({ plan, scene, overlay }: { plan: VideoPlan; scene: string; /** 결과 장면에 그릴 손님 초상 */ overlay: StageArt | null }) {
  /** prev: 지금 조각이 그려질 때까지 마지막 프레임을 붙드는 앞 조각 · cur: 트는 조각 · pick: 다음 대기 · on: cur 가 그려졌다 */
  const [st, setSt] = useState<{ prev: Clip | null; cur: Clip; pick: number; on: boolean }>(() => ({ prev: null, cur: hi(scene, 0), pick: 0, on: false }))
  const { prev, cur } = st
  const next = after(plan, cur, scene, st.pick)
  const ended = (id: number, n: Clip) => setSt((x) => (x.cur.id === id ? { prev: x.cur, cur: n, pick: Math.floor(Math.random() * plan.idles), on: false } : x))
  const shown = (id: number) => setSt((x) => (x.cur.id === id ? { ...x, prev: null, on: true } : x))
  const endRef = useRef(ended)
  useEffect(() => { endRef.current = ended })
  // 안전장치 — 영상이 멈추거나 안 받아지면 다음 조각으로
  useEffect(() => {
    const ms = (cur.move ? moveMs(cur.move) : BEAT_S * 1000) + 3000
    const t = window.setTimeout(() => endRef.current(cur.id, after(plan, cur, scene, 0)), ms)
    return () => window.clearTimeout(t)
  }, [cur, scene, plan])

  // 마지막으로 그린 초상 — 처음으로 가면 overlay 는 바로 비지만, 화원이 족자를 걷을 때까지는 남겨 두고 서서히 지운다
  const [last, setLast] = useState(overlay)
  if (overlay && overlay !== last) setLast(overlay)
  const frame = plan.frame
  const leaving = Boolean(frame && cur.move && cur.from === frame.scene)
  const staying = Boolean(frame && !cur.move && cur.at === frame.scene) || Boolean(frame && cur.move && cur.at === frame.scene && prev && !st.on)
  const art = overlay ?? (leaving ? last : null)
  const rootRef = useRef<HTMLDivElement>(null)
  /** 지금 화면 맨 위에 보이는 영상 — 족자 비단을 읽는 곳 */
  const topVideo = () => { const list = rootRef.current?.querySelectorAll<HTMLVideoElement>('video.vs-film[data-on]'); return list?.length ? list[list.length - 1] : null }

  const key = (c: Clip) => `${c.src}#${c.id}`
  const pct = (v: number, of: number) => `${(v / of) * 100}%`
  const plate = plan.pics[cur.move ? cur.from ?? cur.at : cur.at]
  return (
    <div className="vs" aria-hidden="true" ref={rootRef}>
      <img className="vs-v vs-plate" src={`${plan.base}/${plate}.webp`} alt="" draggable={false} />
      {prev && <Film key={key(prev)} base={plan.base} src={prev.src} play move={prev.move} />}
      <Film key={key(cur)} base={plan.base} src={cur.src} play move={cur.move} finish={!cur.move && cur.at !== scene}
        onShown={() => shown(cur.id)} onEnd={() => ended(cur.id, next)} />
      <Film key={key(next)} base={plan.base} src={next.src} play={false} />
      {frame && art && (staying || leaving) && (
        <SilkArt key={art.art} frame={frame} art={art} video={topVideo} leaving={leaving}
          style={{ left: pct(frame.x, 1920), top: pct(frame.y, 1080), width: pct(frame.w, 1920), height: pct(frame.h, 1080) } as CSSProperties} />
      )}
    </div>
  )
}

/**
 * 영상 한 겹 — 미리 받아 첫 프레임에 멈춰 있다가 play 가 되면 한 번 튼다. 첫 프레임이 실제로 그려진 뒤에야 보인다(그 전엔 아래 겹이 보인다).
 * finish: 남은 몫이 길면 조금 빨리 · move: 걷는 앞뒤는 walk, 길은 FAST_RATE
 */
function Film({ base, src, play, finish = false, move, onShown, onEnd }: {
  base: string; src: string; play: boolean; finish?: boolean; move?: Move; onShown?: () => void; onEnd?: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [seen, setSeen] = useState(false)
  const cb = useRef({ onShown, onEnd })
  useEffect(() => { cb.current = { onShown, onEnd } })

  useEffect(() => {
    const v = ref.current
    // 다 튼 앞 조각은 다시 틀지 않는다(끝난 영상에 play() 를 부르면 처음부터 다시 돈다)
    if (!v || !play || v.ended) return
    let off = false, timer = 0
    const painted = () => { if (off) return; setSeen(true); timer = window.setTimeout(() => cb.current.onShown?.(), FADE_MS + 40) }
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(painted)
    else (v as HTMLVideoElement).addEventListener('playing', () => requestAnimationFrame(() => requestAnimationFrame(painted)), { once: true })
    if (move) v.playbackRate = move.walk ?? WALK_RATE
    v.play().catch(() => undefined)
    return () => { off = true; window.clearTimeout(timer) }
  }, [play, move])

  // 마저 틀기 — 누른 순간 남은 몫으로 빠르기를 정하고 끝까지 유지, 0.2초쯤에 걸쳐 올린다
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

  // 이동 영상 빠르기 — 걷는 앞뒤 / 길
  useEffect(() => {
    const v = ref.current
    if (!v || !move || !play) return
    let raf = 0
    const tick = () => {
      const rate = v.currentTime >= move.out && v.currentTime < move.in ? FAST_RATE : move.walk ?? WALK_RATE
      if (v.playbackRate !== rate) v.playbackRate = rate
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [move, play])

  return <video ref={ref} className="vs-v vs-film" data-on={seen || undefined} src={`${base}/${src}.mp4`} muted playsInline preload="auto" disablePictureInPicture
    onEnded={() => cb.current.onEnd?.()} onError={() => cb.current.onEnd?.()} />
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
  frame: NonNullable<VideoPlan['frame']>; art: StageArt; /** 지금 화면 맨 위에 보이는 영상 */ video: () => HTMLVideoElement | null; leaving: boolean; style: CSSProperties
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
        const v = video()
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
  // video 는 렌더마다 새 함수지만 같은 일을 한다 — 다시 시작하지 않게 처음 것을 쓴다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, frame])
  return <canvas ref={ref} className="vs-frame" width={frame.w} height={frame.h} data-leaving={leaving || undefined} style={style} />
}
