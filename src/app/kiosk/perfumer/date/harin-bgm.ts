'use client'

// 하린 루트 배경음악(2026-11-19) — ElevenLabs Music 으로 만든 두 곡(design-review/scent-art/bgm, tools/scent-bgm.mjs · scent-bgm-loop.sh).
//   main: 골목 ~ 랩 · ending: 부티크(엔딩). 둘 다 끝 3초를 처음과 겹쳐 섞은 반복 파일이라 이음매 없이 돈다(Web Audio 반복 — <audio loop> 는 돌 때 틈이 난다).
//   타이틀을 누를 때(손님의 첫 터치) 소리 장치를 깨운다 — 그 전에는 브라우저가 소리를 막는다.
//   하린이 말하는 동안은 작게(BASE → DUCK), 곡이 바뀌면 2.5초에 걸쳐 겹쳐 바꾸고, 첫 화면으로 돌아가면 1.5초에 걸쳐 끈다.

import { useEffect } from 'react'
import { HARIN_BASE } from './harin-plan'

export type HarinTrack = 'main' | 'ending'
const BASE = 0.34
const DUCK = 0.13
const SWAP_S = 2.5
const OFF_S = 1.5
const RELEASE_MS = 800

let ac: AudioContext | null = null
let master: GainNode | null = null
const buffers = new Map<HarinTrack, Promise<AudioBuffer | null>>()
let playing: { track: HarinTrack; src: AudioBufferSourceNode; gain: GainNode } | null = null
/** 마지막으로 바란 곡 — 곡을 받는 사이 바뀌었으면 받은 곡을 틀지 않는다 */
let want: HarinTrack | null = null

function load(track: HarinTrack) {
  if (!ac) return Promise.resolve(null)
  let p = buffers.get(track)
  if (!p) {
    const ctx = ac
    p = fetch(`${HARIN_BASE}/bgm/${track}.m4a`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).catch(() => null)
    buffers.set(track, p)
  }
  return p
}

/** 손님의 첫 터치에서 부른다 — 소리 장치를 만들고(또는 깨우고) 두 곡을 미리 받는다 */
export function unlockHarinBgm() {
  try {
    if (!ac) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      ac = new Ctx()
      master = ac.createGain()
      master.gain.value = BASE
      master.connect(ac.destination)
    }
    void ac.resume()
    void load('main'); void load('ending')
  } catch { /* 소리 없이도 프로그램은 돈다 */ }
}

function fadeOut(p: NonNullable<typeof playing>, secs: number) {
  if (!ac) return
  const t = ac.currentTime
  p.gain.gain.cancelScheduledValues(t)
  p.gain.gain.setValueAtTime(p.gain.gain.value, t)
  p.gain.gain.linearRampToValueAtTime(0, t + secs)
  try { p.src.stop(t + secs + 0.05) } catch { /* 이미 멈춤 */ }
}

async function play(track: HarinTrack | null) {
  want = track
  if (!ac || !master) return
  if (playing?.track === track) return
  if (playing) { fadeOut(playing, track ? SWAP_S : OFF_S); playing = null }
  if (!track) return
  const buf = await load(track)
  if (!buf || !ac || !master || playing || want !== track) return
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = true
  // AAC 앞뒤 여백(수십 ms)을 건너 돌게
  src.loopStart = Math.min(0.03, buf.duration / 4)
  src.loopEnd = buf.duration - 0.03
  const gain = ac.createGain()
  gain.gain.value = 0
  src.connect(gain).connect(master)
  const t = ac.currentTime
  src.start(t, src.loopStart)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(1, t + SWAP_S)
  playing = { track, src, gain }
}

/** 점검용(자동 플레이 · 관리자) — 지금 소리 장치 상태 · 곡 · 크기 */
export function harinBgmState() {
  return { state: ac?.state ?? 'none', track: playing?.track ?? null, master: master ? Number(master.gain.value.toFixed(2)) : null, time: ac ? Number(ac.currentTime.toFixed(1)) : 0 }
}
if (typeof window !== 'undefined') (window as unknown as { __harinBgm?: typeof harinBgmState }).__harinBgm = harinBgmState

/** 배경음악 — track 이 null 이면 끈다 · duck 이면(하린이 말하는 중) 작게 */
export function useHarinBgm(track: HarinTrack | null, duck: boolean) {
  useEffect(() => { void play(track) }, [track])
  // 줄과 줄 사이(0.5초 안팎)에 음악이 잠깐 커지지 않게, 다시 키우는 것은 0.8초 기다렸다가
  useEffect(() => {
    const set = () => {
      if (!ac || !master) return
      const t = ac.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setTargetAtTime(duck ? DUCK : BASE, t, duck ? 0.12 : 0.5)
    }
    if (duck) { set(); return }
    const id = window.setTimeout(set, RELEASE_MS)
    return () => window.clearTimeout(id)
  }, [duck])
  // 화면을 떠나면(모드 바꿈 등) 끈다
  useEffect(() => () => { void play(null) }, [])
}
