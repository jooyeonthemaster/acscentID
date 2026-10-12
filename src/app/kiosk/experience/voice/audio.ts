// 보이스 체험의 소리 처리 — 손님 본인의 녹음에 스타일(라디오·로봇·동화)을 입힌다.
// 다른 사람의 목소리를 흉내 내거나 합성하지 않는다: 녹음한 소리의 높낮이·음색·울림만 바꾼다.
// 모두 기기 안(Web Audio)에서 처리한다. 녹음은 서버로 가지 않고, 받기를 누른 결과만 올라간다.

export const VOICE_RATE = 24000
export const VOICE_MAX_SECONDS = 15
export type VoiceStyle = 'radio' | 'robot' | 'fairy'
export const VOICE_STYLES: VoiceStyle[] = ['radio', 'robot', 'fairy']

/** 녹음을 듣기 좋게 다듬은 결과 — 못 쓰는 녹음이면 이유 */
export type Decoded = { ok: true; samples: Float32Array } | { ok: false; reason: 'short' | 'quiet' }

const MIN_SECONDS = 1
/** 이보다 작으면 말소리가 없는 녹음으로 본다(최대 진폭) */
const MIN_PEAK = 0.02

/** 녹음 파일(webm/opus)을 24kHz 한 채널로 풀고, 앞뒤 빈 소리를 잘라 음량을 맞춘다 */
export async function decodeRecording(blob: Blob): Promise<Decoded> {
  const ctx = new OfflineAudioContext(1, 1, VOICE_RATE)
  const buffer = await ctx.decodeAudioData(await blob.arrayBuffer())
  const mono = new Float32Array(buffer.length)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels
  }
  let peak = 0
  for (let i = 0; i < mono.length; i++) peak = Math.max(peak, Math.abs(mono[i]))
  if (peak < MIN_PEAK) return { ok: false, reason: 'quiet' }
  // 말이 시작되는 곳·끝나는 곳(최대의 6%)에서 0.15초씩 여유를 두고 자른다
  const gate = peak * 0.06, pad = Math.round(VOICE_RATE * 0.15)
  let first = 0, last = mono.length - 1
  while (first < mono.length && Math.abs(mono[first]) < gate) first++
  while (last > first && Math.abs(mono[last]) < gate) last--
  const from = Math.max(0, first - pad), to = Math.min(mono.length, last + pad)
  if ((to - from) / VOICE_RATE < MIN_SECONDS) return { ok: false, reason: 'short' }
  const samples = mono.slice(from, Math.min(to, from + VOICE_MAX_SECONDS * VOICE_RATE))
  normalize(samples, 0.89)
  fade(samples)
  return { ok: true, samples }
}

function normalize(samples: Float32Array, target: number) {
  let peak = 0
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]))
  if (peak < 1e-5) return
  const gain = target / peak
  for (let i = 0; i < samples.length; i++) samples[i] *= gain
}

/** 처음·끝 0.02초를 부드럽게 — 뚝 끊기는 소리를 막는다 */
function fade(samples: Float32Array) {
  const n = Math.min(Math.round(VOICE_RATE * 0.02), samples.length >> 1)
  for (let i = 0; i < n; i++) { const g = i / n; samples[i] *= g; samples[samples.length - 1 - i] *= g }
}

// ───────────────────────── 높낮이 바꾸기 ─────────────────────────

/**
 * 길이만 바꾼다(높낮이는 그대로) — 겹쳐 잇기(WSOLA). 0.04초 조각을 반씩 겹치되,
 * 앞 조각에 자연스럽게 이어지는 자리를 ±8ms 안에서 찾아 붙여 떨림을 줄인다.
 */
function stretch(input: Float32Array, factor: number): Float32Array {
  const N = Math.round(VOICE_RATE * 0.04) & ~1
  const hop = N >> 1
  const step = hop / factor
  const reach = Math.round(VOICE_RATE * 0.008)
  const window = new Float32Array(N)
  for (let i = 0; i < N; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)
  const length = Math.ceil(input.length * factor)
  const out = new Float32Array(length + N)
  let previous = 0
  for (let k = 0; ; k++) {
    const ideal = Math.round(k * step)
    if (ideal + N + reach >= input.length || k * hop + N > out.length) break
    let at = ideal
    const want = previous + hop
    if (k > 0 && want + N <= input.length) {
      let best = -Infinity
      for (let d = -reach; d <= reach; d += 2) {
        const start = ideal + d
        if (start < 0) continue
        // 네 칸에 하나씩만 견줘도 자리는 충분히 찾는다(매장 PC 에서 빨리 끝나게)
        let sum = 0
        for (let i = 0; i < N; i += 4) sum += input[start + i] * input[want + i]
        if (sum > best) { best = sum; at = start }
      }
    }
    const base = k * hop
    for (let i = 0; i < N; i++) out[base + i] += input[at + i] * window[i]
    previous = at
  }
  return out.subarray(0, length)
}

/** 높낮이를 ratio 배로(1.26 = 네 반음 위). 길이는 그대로 */
export function pitchShift(input: Float32Array, ratio: number): Float32Array {
  if (Math.abs(ratio - 1) < 0.005) return input.slice()
  const stretched = stretch(input, ratio)
  const out = new Float32Array(Math.floor(stretched.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const at = i * ratio, j = Math.floor(at), f = at - j
    out[i] = stretched[j] * (1 - f) + (stretched[j + 1] ?? 0) * f
  }
  return out
}

// ───────────────────────── 스타일 ─────────────────────────

/** 씨앗이 같으면 같은 잡음 — 울림(리버브)이 매번 같게 */
function noise(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1
  }
}

/** 잦아드는 잡음으로 만든 울림 — seconds 동안 사라진다 */
function impulse(ctx: BaseAudioContext, seconds: number, seed: number): AudioBuffer {
  const length = Math.round(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  const random = noise(seed)
  for (let i = 0; i < length; i++) data[i] = random() * Math.pow(1 - i / length, 2.6)
  return buffer
}

function shaper(ctx: BaseAudioContext, curve: (x: number) => number): WaveShaperNode {
  const node = ctx.createWaveShaper()
  const table = new Float32Array(1024)
  for (let i = 0; i < table.length; i++) table[i] = curve((i / (table.length - 1)) * 2 - 1)
  node.curve = table
  return node
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, gain = 0, q = 0.707): BiquadFilterNode {
  const node = ctx.createBiquadFilter()
  node.type = type
  node.frequency.value = frequency
  node.gain.value = gain
  node.Q.value = q
  return node
}

function chain(...nodes: AudioNode[]): AudioNode {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
  return nodes[nodes.length - 1]
}

/**
 * 스타일을 입힌 소리 — 같은 녹음이면 같은 결과가 나온다.
 * 라디오: 살짝 낮추고 저음·또렷함을 더해 눌러 담은 진행자 톤. 로봇: 낮은 사인파를 곱하고 짧은 되울림으로 금속성. 동화: 네 반음 올리고 밝은 울림.
 */
export async function applyStyle(original: Float32Array, style: VoiceStyle): Promise<Float32Array> {
  const source = style === 'radio' ? pitchShift(original, Math.pow(2, -1.8 / 12)) : style === 'fairy' ? pitchShift(original, Math.pow(2, 4 / 12)) : original
  const tail = style === 'fairy' ? 1.4 : style === 'radio' ? 0.4 : 0.25
  const ctx = new OfflineAudioContext(1, source.length + Math.round(VOICE_RATE * tail), VOICE_RATE)
  const buffer = ctx.createBuffer(1, source.length, VOICE_RATE)
  buffer.getChannelData(0).set(source)
  const input = ctx.createBufferSource()
  input.buffer = buffer
  const out = ctx.createGain()
  out.connect(ctx.destination)

  if (style === 'radio') {
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -30
    compressor.knee.value = 12
    compressor.ratio.value = 8
    compressor.attack.value = 0.003
    compressor.release.value = 0.18
    const voice = chain(input, filter(ctx, 'highpass', 85), filter(ctx, 'lowshelf', 210, 6), filter(ctx, 'peaking', 2800, 4.5, 0.9), filter(ctx, 'highshelf', 7000, -3), compressor, shaper(ctx, (x) => Math.tanh(1.7 * x) / Math.tanh(1.7)))
    voice.connect(out)
    // 방송실의 짧은 울림
    const room = ctx.createConvolver()
    room.buffer = impulse(ctx, 0.3, 7)
    const send = ctx.createGain()
    send.gain.value = 0.1
    chain(voice, room, send, out)
  }

  if (style === 'robot') {
    // 낮은 사인파를 곱한다(링 모듈레이션) — 사람 목소리의 자연스러운 울림이 기계음으로 바뀐다
    const ring = ctx.createGain()
    ring.gain.value = 0
    const wave = ctx.createOscillator()
    wave.frequency.value = 54
    wave.connect(ring.gain)
    wave.start()
    input.connect(ring)
    const mix = ctx.createGain()
    ring.connect(mix)
    const dry = ctx.createGain()
    dry.gain.value = 0.22
    chain(input, dry, mix)
    // 짧은 되울림 — 금속 통 속 같은 소리
    const delay = ctx.createDelay(0.05)
    delay.delayTime.value = 0.0095
    const feedback = ctx.createGain()
    feedback.gain.value = 0.58
    mix.connect(delay)
    delay.connect(feedback)
    feedback.connect(delay)
    const body = ctx.createGain()
    mix.connect(body)
    delay.connect(body)
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.ratio.value = 6
    // 계단처럼 깎아 디지털 느낌을 조금
    chain(body, filter(ctx, 'highpass', 190), filter(ctx, 'lowpass', 3600), shaper(ctx, (x) => Math.round(x * 14) / 14), compressor, out)
  }

  if (style === 'fairy') {
    const voice = chain(input, filter(ctx, 'highpass', 170), filter(ctx, 'peaking', 1900, 2, 1), filter(ctx, 'highshelf', 5200, 5))
    const dry = ctx.createGain()
    dry.gain.value = 0.86
    chain(voice, dry, out)
    // 메아리 한 번과 밝은 울림 — 이야기 속 같은 공간
    const echo = ctx.createDelay(0.5)
    echo.delayTime.value = 0.13
    const echoGain = ctx.createGain()
    echoGain.gain.value = 0.2
    chain(voice, echo, echoGain, out)
    const hall = ctx.createConvolver()
    hall.buffer = impulse(ctx, 1.3, 23)
    const send = ctx.createGain()
    send.gain.value = 0.16
    chain(voice, filter(ctx, 'highpass', 600), hall, send, out)
  }

  input.start()
  const rendered = (await ctx.startRendering()).getChannelData(0)
  // 꼬리의 빈 소리를 잘라 낸다
  let end = rendered.length
  while (end > source.length && Math.abs(rendered[end - 1]) < 0.002) end--
  const result = rendered.slice(0, end)
  normalize(result, 0.9)
  fade(result)
  return result
}

// ───────────────────────── 그리기 · 내보내기 ─────────────────────────

/** 파형 막대 높이(0~1) count 개 */
export function peaks(samples: Float32Array, count: number): number[] {
  const size = Math.max(1, Math.floor(samples.length / count))
  const values: number[] = []
  for (let k = 0; k < count; k++) {
    let sum = 0
    const from = k * size, to = Math.min(samples.length, from + size)
    for (let i = from; i < to; i += 3) sum += samples[i] * samples[i]
    values.push(Math.sqrt(sum / Math.max(1, (to - from) / 3)))
  }
  const top = Math.max(...values, 1e-4)
  return values.map((v) => Math.max(0.06, Math.pow(v / top, 1.15)))
}

/** 16비트 한 채널 WAV — 어느 휴대폰에서나 열린다 */
export function encodeWav(samples: Float32Array): Blob {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2))
  const text = (at: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)) }
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, VOICE_RATE, true)
  view.setUint32(28, VOICE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true)
  return new Blob([view], { type: 'audio/wav' })
}

export const seconds = (samples: Float32Array) => samples.length / VOICE_RATE
export const clock = (value: number) => `00:${String(Math.min(59, Math.max(0, Math.round(value)))).padStart(2, '0')}`
