// 보이스 체험의 소리 처리 — 손님 본인의 녹음에 재미있는 필터(다람쥐·거인·외계인·유령·합창단·노래방·거꾸로·무전기)를 입힌다.
// 다른 사람의 목소리를 흉내 내거나 합성하지 않는다: 녹음한 소리의 높낮이·음색·울림만 바꾼다.
// 모두 기기 안(Web Audio)에서 처리한다. 녹음은 서버로 가지 않고, 받기를 누른 결과만 올라간다.

export const VOICE_RATE = 24000
export const VOICE_MAX_SECONDS = 15
/** 목소리 필터 — 다람쥐 · 거인 · 외계인 · 유령 · 합창단 · 노래방 · 거꾸로 · 무전기 */
export type VoiceStyle = 'squirrel' | 'giant' | 'alien' | 'ghost' | 'choir' | 'karaoke' | 'reverse' | 'walkie'
export const VOICE_STYLES: VoiceStyle[] = ['squirrel', 'giant', 'alien', 'ghost', 'choir', 'karaoke', 'reverse', 'walkie']

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

const semitones = (n: number) => Math.pow(2, n / 12)
const at = (seconds: number) => Math.round(VOICE_RATE * seconds)

function reversed(samples: Float32Array): Float32Array {
  return samples.slice().reverse()
}

/** 빠르기를 바꾼다(높낮이도 따라간다) — 1.07 이면 조금 빠르고 높게 */
function resample(samples: Float32Array, ratio: number): Float32Array {
  const out = new Float32Array(Math.floor(samples.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const position = i * ratio, j = Math.floor(position), f = position - j
    out[i] = samples[j] * (1 - f) + (samples[j + 1] ?? 0) * f
  }
  return out
}

/** 여러 소리를 겹친다 — [소리, 크기, 늦게 들어오는 초] */
function mix(...layers: [Float32Array, number, number][]): Float32Array {
  const out = new Float32Array(Math.max(...layers.map(([samples, , delay]) => samples.length + at(delay))))
  for (const [samples, gain, delay] of layers) {
    const offset = at(delay)
    for (let i = 0; i < samples.length; i++) out[offset + i] += samples[i] * gain
  }
  return out
}

function compressor(ctx: BaseAudioContext, threshold: number, ratio: number): DynamicsCompressorNode {
  const node = ctx.createDynamicsCompressor()
  node.threshold.value = threshold
  node.knee.value = 10
  node.ratio.value = ratio
  node.attack.value = 0.004
  node.release.value = 0.18
  return node
}

function level(ctx: BaseAudioContext, value: number): GainNode {
  const node = ctx.createGain()
  node.gain.value = value
  return node
}

/** 울림을 보내는 길 — from → (울림) → out */
function reverb(ctx: BaseAudioContext, from: AudioNode, out: AudioNode, seconds: number, seed: number, amount: number) {
  const hall = ctx.createConvolver()
  hall.buffer = impulse(ctx, seconds, seed)
  chain(from, hall, level(ctx, amount), out)
}

/** 소리 그래프 하나를 끝까지 돌린다 — build 가 입력(input)을 출력(out)까지 잇는다. tail 은 울림이 남을 초 */
async function render(source: Float32Array, tail: number, build: (ctx: OfflineAudioContext, input: AudioBufferSourceNode, out: GainNode) => void): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, source.length + at(tail), VOICE_RATE)
  const buffer = ctx.createBuffer(1, source.length, VOICE_RATE)
  buffer.getChannelData(0).set(source)
  const input = ctx.createBufferSource()
  input.buffer = buffer
  const out = ctx.createGain()
  out.connect(ctx.destination)
  build(ctx, input, out)
  input.start()
  return (await ctx.startRendering()).getChannelData(0).slice()
}

const FILTERS: Record<VoiceStyle, (voice: Float32Array) => Promise<Float32Array>> = {
  // 다람쥐 — 헬륨을 마신 듯 높고 조금 빠르게(아홉 반음 위)
  squirrel: (voice) => render(resample(pitchShift(voice, semitones(9)), 1.07), 0.1, (ctx, input, out) => {
    chain(input, filter(ctx, 'highpass', 240), filter(ctx, 'peaking', 3400, 3, 1), out)
  }),

  // 거인 — 여덟 반음 아래, 땅이 울리는 저음과 동굴 같은 울림
  giant: (voice) => render(pitchShift(voice, semitones(-8)), 1.3, (ctx, input, out) => {
    // 저음만 키우면 작은 스피커에서는 웅웅거리기만 한다 — 말소리 대역(1kHz 둘레)을 함께 세운다
    const body = chain(input, filter(ctx, 'lowshelf', 180, 4), filter(ctx, 'peaking', 1100, 3, 0.8), filter(ctx, 'lowpass', 3600), compressor(ctx, -26, 5))
    body.connect(out)
    chain(body, filter(ctx, 'lowpass', 150), shaper(ctx, (x) => Math.tanh(3 * x)), level(ctx, 0.18), out)
    reverb(ctx, chain(body, filter(ctx, 'lowpass', 2200)), out, 1.2, 31, 0.2)
  }),

  // 외계인 — 음높이가 빠르게 떨리고(지연 시간을 흔든다) 금속성이 섞인 우주 교신
  alien: (voice) => render(pitchShift(voice, semitones(4)), 0.5, (ctx, input, out) => {
    const wobble = ctx.createDelay(0.05)
    wobble.delayTime.value = 0.012
    const flutter = ctx.createOscillator()
    flutter.frequency.value = 7.5
    chain(flutter, level(ctx, 0.0026)).connect(wobble.delayTime)
    flutter.start()
    input.connect(wobble)
    const ring = level(ctx, 0)
    const wave = ctx.createOscillator()
    wave.frequency.value = 150
    wave.connect(ring.gain)
    wave.start()
    wobble.connect(ring)
    const sum = ctx.createGain()
    chain(ring, level(ctx, 0.55), sum)
    chain(wobble, level(ctx, 0.6), sum)
    // 짧은 되울림 — 금속 통을 지나는 소리
    const comb = ctx.createDelay(0.05)
    comb.delayTime.value = 0.006
    chain(sum, comb, level(ctx, 0.55), comb)
    const body = ctx.createGain()
    sum.connect(body)
    comb.connect(body)
    chain(body, filter(ctx, 'highpass', 220), compressor(ctx, -22, 4), out)
  }),

  // 유령 — 말보다 울림이 먼저 밀려온다(뒤집어 울린 뒤 다시 뒤집는다). 느리게 떨리는 음량과 긴 여운
  ghost: async (voice) => {
    const low = pitchShift(voice, semitones(-2))
    const hall = 2.2, lead = 0.5
    const swell = reversed(await render(reversed(low), hall, (ctx, input, out) => {
      reverb(ctx, chain(input, filter(ctx, 'highpass', 500)), out, hall, 47, 1)
    }))
    // swell 은 앞에 울림 꼬리(hall 초)가 붙어 있다 — 그중 끝 lead 초만 남겨 말 앞에 깐다
    return render(mix([low, 0.55, lead], [swell.subarray(at(hall - lead)), 0.9, 0]), 2.4, (ctx, input, out) => {
      const tremble = level(ctx, 0.72)
      const slow = ctx.createOscillator()
      slow.frequency.value = 4.6
      chain(slow, level(ctx, 0.28)).connect(tremble.gain)
      slow.start()
      const body = chain(input, filter(ctx, 'highpass', 260), filter(ctx, 'highshelf', 4500, 4), tremble)
      chain(body, level(ctx, 0.8), out)
      reverb(ctx, body, out, 2.4, 53, 0.4)
    })
  },

  // 합창단 — 내 목소리로 화음(한 옥타브 아래 · 제 음 · 장3도 · 5도)을 쌓고 큰 홀의 울림을 더한다
  choir: (voice) => render(mix(
    [pitchShift(voice, semitones(-12)), 0.5, 0.03],
    [voice, 0.85, 0],
    [pitchShift(voice, semitones(0.18)), 0.5, 0.02],
    [pitchShift(voice, semitones(4)), 0.6, 0.045],
    [pitchShift(voice, semitones(7)), 0.55, 0.07],
  ), 2.2, (ctx, input, out) => {
    const body = chain(input, filter(ctx, 'highpass', 120), compressor(ctx, -24, 4))
    chain(body, level(ctx, 0.75), out)
    reverb(ctx, body, out, 2.2, 61, 0.32)
  }),

  // 노래방 — 에코 가득한 마이크(0.2초 메아리가 잦아들며 되돌아온다)
  karaoke: (voice) => render(voice, 2.2, (ctx, input, out) => {
    const body = chain(input, filter(ctx, 'highpass', 110), filter(ctx, 'lowshelf', 220, 2.5), filter(ctx, 'peaking', 4200, 4, 0.9), compressor(ctx, -24, 4))
    body.connect(out)
    const echo = ctx.createDelay(1)
    echo.delayTime.value = 0.2
    const tone = filter(ctx, 'lowpass', 3200)
    chain(body, echo, tone, level(ctx, 0.45), echo)
    chain(tone, level(ctx, 0.5), out)
    reverb(ctx, body, out, 1.5, 71, 0.22)
  }),

  // 거꾸로 — 끝에서부터 처음으로
  reverse: (voice) => render(reversed(voice), 0.6, (ctx, input, out) => {
    input.connect(out)
    reverb(ctx, input, out, 0.5, 83, 0.15)
  }),

  // 무전기 — 좁은 대역으로 찌그러뜨리고, 앞에 '치직', 뒤에 '삐빅'과 잡음을 붙인다
  walkie: async (voice) => {
    const speech = await render(voice, 0.05, (ctx, input, out) => {
      chain(input, filter(ctx, 'highpass', 480), filter(ctx, 'lowpass', 2500), filter(ctx, 'peaking', 1600, 5, 1), shaper(ctx, (x) => Math.max(-0.5, Math.min(0.5, x * 4)) * 2), compressor(ctx, -20, 8), out)
    })
    const squelch = at(0.14), beep = at(0.07), gap = at(0.02)
    const total = new Float32Array(squelch + speech.length + beep * 2 + gap * 2 + squelch)
    const random = noise(91)
    // 바닥에 깔리는 잡음
    for (let i = 0; i < total.length; i++) total[i] = random() * 0.035
    for (let i = 0; i < squelch; i++) total[i] += random() * 0.3 * (1 - i / squelch)
    total.set(speech.map((value, i) => value * 0.9 + total[squelch + i]), squelch)
    let cursor = squelch + speech.length + gap
    for (const tone of [1050, 1400]) {
      for (let i = 0; i < beep; i++) total[cursor + i] += Math.sin((2 * Math.PI * tone * i) / VOICE_RATE) * 0.32
      cursor += beep + (tone === 1050 ? gap : 0)
    }
    for (let i = 0; i < squelch; i++) total[cursor + i] += random() * 0.28 * (1 - i / squelch)
    return render(total, 0.02, (ctx, input, out) => { chain(input, filter(ctx, 'highpass', 400), filter(ctx, 'lowpass', 2800), out) })
  },
}

/**
 * 필터를 입힌 소리 — 같은 녹음이면 같은 결과가 나온다.
 * 높낮이·빠르기·겹치기는 숫자 배열에서 바로 하고, 음색·울림·메아리는 Web Audio 그래프로 한 번에 돌린다.
 */
export async function applyStyle(original: Float32Array, style: VoiceStyle): Promise<Float32Array> {
  const rendered = await FILTERS[style](original)
  // 꼬리의 빈 소리를 잘라 낸다(말이 끝난 뒤 울림이 사라진 곳까지)
  let end = rendered.length
  while (end > VOICE_RATE / 2 && Math.abs(rendered[end - 1]) < 0.002) end--
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
