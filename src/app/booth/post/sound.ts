'use client'

// POST! 우체통 — 목소리(미리 만든 mp3) · 효과음(Web Audio 로 합성) · 투입구 빛 세기
//
// 투입구 LED 띠: 우체통이 말하는 동안 소리 크기를 0~1 로 내보낸다(onLevel). 화면에서는 위쪽 빛 띠로 흉내 내고,
// 실물 기기에서는 이 값을 부스 앱(USB LED 컨트롤러)으로 넘기면 된다 — 아직 부스 앱에 LED 기능은 없다.

let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let player: HTMLAudioElement | null = null
let levelRaf = 0
const levelListeners = new Set<(level: number) => void>()

/** 첫 터치 뒤에 부른다(브라우저 자동 재생 제한) */
export function unlockAudio() {
  if (typeof window === 'undefined') return
  if (!ctx) {
    ctx = new AudioContext()
    player = new Audio()
    player.preload = 'auto'
    const src = ctx.createMediaElementSource(player)
    analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    src.connect(analyser)
    analyser.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

export const audioReady = () => Boolean(ctx)

export function onLevel(fn: (level: number) => void) {
  levelListeners.add(fn)
  return () => { levelListeners.delete(fn) }
}

function emitLevel(level: number) {
  for (const fn of levelListeners) fn(level)
}

function trackLevel() {
  cancelAnimationFrame(levelRaf)
  if (!analyser) return
  const buf = new Uint8Array(analyser.fftSize)
  let smooth = 0
  const tick = () => {
    analyser!.getByteTimeDomainData(buf)
    let sum = 0
    for (const v of buf) sum += ((v - 128) / 128) ** 2
    const rms = Math.sqrt(sum / buf.length)
    smooth = smooth * 0.6 + Math.min(1, rms * 4) * 0.4
    emitLevel(smooth)
    if (player && !player.paused) levelRaf = requestAnimationFrame(tick)
    else emitLevel(0)
  }
  levelRaf = requestAnimationFrame(tick)
}

let current: { id: string; done: () => void } | null = null

/** 대사 한 줄 — 끝나면 resolve. 다른 대사가 시작되거나 stopVoice 면 바로 resolve(기다리던 쪽이 멈추지 않게) */
export function say(id: string, onCaption?: (id: string) => void): Promise<void> {
  if (!ctx || !player) return Promise.resolve()
  stopVoice()
  onCaption?.(id)
  return new Promise((resolve) => {
    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      clearTimeout(safety)
      player!.onended = null
      player!.onerror = null
      if (current?.id === id) current = null
      resolve()
    }
    const safety = setTimeout(done, 15000)
    current = { id, done }
    player!.onended = done
    player!.onerror = done
    player!.src = `/assets/post/voice/${id}.mp3`
    player!.play().then(trackLevel).catch(done)
  })
}

export function stopVoice() {
  if (player) { player.pause(); player.removeAttribute('src'); player.load() }
  const c = current
  current = null
  c?.done()
  emitLevel(0)
}

// ───────────── 효과음 — 파일 없이 합성 ─────────────

function noiseBurst(duration: number, filterFreq: number, gain: number, type: BiquadFilterType = 'lowpass', at = 0) {
  if (!ctx) return
  const t = ctx.currentTime + at
  const len = Math.floor(ctx.sampleRate * duration)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = filterFreq
  const g = ctx.createGain()
  g.gain.value = gain
  src.connect(f).connect(g).connect(ctx.destination)
  src.start(t)
}

function tone(freq: number, duration: number, gain: number, at = 0, type: OscillatorType = 'sine') {
  if (!ctx) return
  const t = ctx.currentTime + at
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  o.connect(g).connect(ctx.destination)
  o.start(t)
  o.stop(t + duration + 0.05)
}

export const sfx = {
  /** 엽서가 투입구로 — 툭 */
  drop: () => { noiseBurst(0.18, 600, 0.9); tone(110, 0.2, 0.4) },
  /** 소인 — 쾅 */
  stamp: () => { noiseBurst(0.25, 900, 1.2); tone(70, 0.3, 0.7) },
  /** 셔터 — 찰칵 */
  shutter: () => { noiseBurst(0.05, 4000, 0.7, 'highpass'); noiseBurst(0.06, 3000, 0.5, 'highpass', 0.09) },
  /** 인쇄 — 드르륵 */
  print: () => { for (let i = 0; i < 14; i++) noiseBurst(0.04, 1800, 0.25, 'bandpass', i * 0.07) },
  /** 끝 인사 — 작은 종 */
  bell: () => { tone(1318, 1.2, 0.18); tone(1975, 0.9, 0.08, 0.02) },
  /** 단추 */
  tap: () => tone(660, 0.08, 0.12, 0, 'triangle'),
  /** 북극으로 — 바람 */
  wind: () => noiseBurst(1.4, 500, 0.5, 'bandpass'),
}
