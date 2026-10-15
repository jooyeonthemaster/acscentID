// 프로그램 영상 배경 음악 — 음원 파일 없이 브라우저가 그 자리에서 연주한다(Web Audio). 저작권 걱정이 없고 길이에 딱 맞춘다.
// 뮤직비디오: 신스팝·로파이 / 추억 무비: 어쿠스틱·피아노·시네마틱. 영상에 섞을 때는 out(MediaStreamAudioDestinationNode)으로.

export type MusicId = 'synthpop' | 'lofi' | 'acoustic' | 'piano' | 'cinematic'

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

interface Style {
  bpm: number
  /** 마디마다 화음(근음 midi, 3화음 구성) */
  chords: number[][]
  pad?: OscillatorType
  bass?: OscillatorType
  arp?: OscillatorType
  drums: 'pop' | 'lofi' | 'soft' | 'boom' | 'none'
  pluck?: boolean
  bell?: boolean
}

const STYLES: Record<MusicId, Style> = {
  synthpop: { bpm: 118, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], pad: 'sawtooth', bass: 'square', arp: 'square', drums: 'pop' },
  lofi: { bpm: 78, chords: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]], pad: 'triangle', bass: 'sine', drums: 'lofi', bell: true },
  acoustic: { bpm: 96, chords: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], bass: 'triangle', drums: 'soft', pluck: true },
  piano: { bpm: 72, chords: [[53, 57, 60, 64], [48, 52, 55, 59], [50, 53, 57, 60], [55, 59, 62, 65]], drums: 'none', bell: true },
  cinematic: { bpm: 64, chords: [[45, 52, 57], [41, 48, 53], [48, 55, 60], [43, 50, 55]], pad: 'sawtooth', bass: 'sine', drums: 'boom' },
}

function noiseBuffer(ctx: BaseAudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

/**
 * start 부터 duration 초 동안 연주를 예약한다. 끝 2초는 서서히 줄인다. 반환: 멈추기
 */
export function playMusic(ctx: AudioContext, out: AudioNode, id: MusicId, start: number, duration: number, volume = 0.8): () => void {
  const style = STYLES[id]
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, start)
  master.gain.linearRampToValueAtTime(volume * 0.5, start + 0.6)
  master.gain.setValueAtTime(volume * 0.5, start + Math.max(0.7, duration - 2))
  master.gain.linearRampToValueAtTime(0, start + duration)
  const comp = ctx.createDynamicsCompressor()
  master.connect(comp).connect(out)
  const nodes: AudioScheduledSourceNode[] = []
  const noise = noiseBuffer(ctx)
  const beat = 60 / style.bpm
  const bar = beat * 4
  const end = start + duration

  const tone = (type: OscillatorType, freq: number, t: number, len: number, gain: number, attack = 0.01, filter?: number) => {
    if (t >= end) return
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    let node: AudioNode = osc
    if (filter) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'; f.frequency.value = filter
      osc.connect(f); node = f
    }
    node.connect(g).connect(master)
    osc.start(t); osc.stop(Math.min(end, t + len + 0.05))
    nodes.push(osc)
  }
  const hit = (t: number, len: number, gain: number, freq: number, type: BiquadFilterType = 'highpass') => {
    if (t >= end) return
    const src = ctx.createBufferSource()
    src.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = type; f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    src.connect(f).connect(g).connect(master)
    src.start(t); src.stop(t + len + 0.05)
    nodes.push(src)
  }
  const kick = (t: number, gain = 0.9) => {
    if (t >= end) return
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(140, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    osc.connect(g).connect(master)
    osc.start(t); osc.stop(t + 0.4)
    nodes.push(osc)
  }

  for (let b = 0, t = start; t < end; b++, t += bar) {
    const chord = style.chords[b % style.chords.length]
    if (style.pad) chord.forEach((n) => tone(style.pad!, midi(n + 12), t, bar * 0.98, 0.06, 0.25, 1800))
    if (style.bass) {
      for (let i = 0; i < 4; i++) tone(style.bass, midi(chord[0] - 12), t + i * beat, beat * 0.9, style.drums === 'pop' ? 0.16 : 0.2, 0.01, 600)
    }
    if (style.arp) {
      for (let i = 0; i < 8; i++) tone(style.arp, midi(chord[i % chord.length] + 24), t + i * beat / 2, beat * 0.4, 0.05, 0.005, 3200)
    }
    if (style.pluck) {
      const pattern = [0, 1, 2, 1, 0, 2, 1, 2]
      pattern.forEach((p, i) => tone('triangle', midi(chord[p] + 12), t + i * beat / 2, beat * 1.2, 0.14, 0.003, 2600))
    }
    if (style.bell) {
      chord.forEach((n, i) => tone('sine', midi(n + 24), t + i * beat, beat * 2.5, 0.09, 0.005))
      if (id === 'piano') chord.forEach((n) => tone('triangle', midi(n), t, bar * 0.9, 0.05, 0.02, 1200))
    }
    for (let i = 0; i < 4; i++) {
      const s = t + i * beat
      switch (style.drums) {
        case 'pop':
          kick(s)
          if (i % 2 === 1) hit(s, 0.18, 0.35, 1500, 'bandpass')
          hit(s, 0.05, 0.12, 7000); hit(s + beat / 2, 0.05, 0.1, 7000)
          break
        case 'lofi':
          if (i === 0 || i === 2) kick(s + (i === 2 ? beat * 0.12 : 0), 0.6)
          if (i % 2 === 1) hit(s, 0.2, 0.18, 1200, 'bandpass')
          hit(s + beat * 0.58, 0.04, 0.06, 6000)
          break
        case 'soft':
          if (i === 0) kick(s, 0.4)
          hit(s + beat / 2, 0.06, 0.05, 8000)
          break
        case 'boom':
          if (i === 0) kick(s, 1)
          if (i === 0) hit(s, 1.2, 0.08, 300, 'lowpass')
          break
      }
    }
  }
  return () => { nodes.forEach((n) => { try { n.stop() } catch { /* 이미 멈춤 */ } }); master.disconnect() }
}

/** 고르는 화면의 미리 듣기(스피커로) — 반환: 멈추기 */
export function previewMusic(id: MusicId, seconds = 6, volume = 0.8): () => void {
  const ctx = new AudioContext()
  const stop = playMusic(ctx, ctx.destination, id, ctx.currentTime + 0.05, seconds, volume)
  const close = () => { if (ctx.state !== 'closed') void ctx.close().catch(() => undefined) }
  const timer = window.setTimeout(close, (seconds + 0.5) * 1000)
  return () => { window.clearTimeout(timer); stop(); close() }
}
