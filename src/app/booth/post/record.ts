'use client'

// POST! 우체통 — 오른쪽 옆면 「귀」 마이크. 버튼 없이 말소리로 녹음 시작 · 끝을 정한다.
//
// 앞 글자가 잘리지 않게 「듣기」를 시작하면 바로 녹음을 켜 두고, 소리 크기로 말한 구간(시작 · 끝)을 표시한 뒤
// 끝나면 그 구간 앞뒤로 조금 넉넉히 잘라 16kHz 모노 WAV(base64)로 만든다. 같은 WAV 를 받아쓰기(AI)에도 보내고,
// 받는 사람에게 「목소리로 듣기」로도 배달한다.
//
// 귀에 입을 바짝 대고 속삭이는 걸 전제로 한다 — 첫 0.6초의 주변 소리로 바닥 소음을 재고 그보다 충분히 큰 소리만 말로 본다.
// 쇼핑몰 현장에서 숫자(START_K · MIN_START · END_SILENCE_MS)를 다시 맞춘다.

const START_K = 2.6 // 바닥 소음의 몇 배부터 말로 보나
const MIN_START = 0.07 // 아무리 조용해도 이 크기는 넘어야 말
const START_HOLD_MS = 120 // 이만큼 이어져야 말 시작
const END_SILENCE_MS = 1400 // 말한 뒤 이만큼 조용하면 끝
const MIN_SPEECH_MS = 600 // 이보다 짧으면 말로 치지 않음
const MAX_SPEECH_MS = 20000
const PRE_ROLL = 0.45 // 자를 때 앞 여유(초)
const POST_ROLL = 0.35

export interface EarResult { wav: string; seconds: number }
export interface EarEvents {
  onSpeechStart?: () => void
  onEnd: (result: EarResult | null) => void
}

export interface Ear {
  /** 마이크 소리 크기 0~1 */
  level: () => number
  /** 말 한 번 듣기 — 반환값은 그만 듣기 */
  listen: (ev: EarEvents) => () => void
  close: () => void
}

export async function openEar(): Promise<Ear> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
  const ac = new AudioContext()
  const analyser = ac.createAnalyser()
  analyser.fftSize = 512
  ac.createMediaStreamSource(stream).connect(analyser)
  const buf = new Uint8Array(analyser.fftSize)
  const level = () => {
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (const v of buf) sum += ((v - 128) / 128) ** 2
    return Math.min(1, Math.sqrt(sum / buf.length) * 5)
  }

  const listen = ({ onSpeechStart, onEnd }: EarEvents) => {
    let stopped = false
    let raf = 0
    const chunks: Blob[] = []
    const rec = new MediaRecorder(stream)
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    rec.start(200)
    const t0 = performance.now()
    const floorSamples: number[] = []
    let threshold = MIN_START
    let loudSince = 0
    let speechStart = 0
    let lastLoud = 0

    const finish = async (ok: boolean) => {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(raf)
      await new Promise<void>((r) => { rec.onstop = () => r(); try { rec.stop() } catch { r() } })
      if (!ok) { onEnd(null); return }
      try {
        const decoded = await ac.decodeAudioData(await new Blob(chunks, { type: rec.mimeType }).arrayBuffer())
        const a = Math.max(0, (speechStart - t0) / 1000 - PRE_ROLL)
        const b = Math.min(decoded.duration, (lastLoud - t0) / 1000 + POST_ROLL)
        onEnd({ wav: await toWav16k(decoded, a, b), seconds: b - a })
      } catch {
        onEnd(null)
      }
    }

    const tick = () => {
      if (stopped) return
      const now = performance.now()
      const lv = level()
      if (now - t0 < 600) {
        floorSamples.push(lv)
      } else {
        if (floorSamples.length) {
          const sorted = [...floorSamples].sort((x, y) => x - y)
          threshold = Math.max(MIN_START, sorted[Math.floor(sorted.length / 2)] * START_K)
          floorSamples.length = 0
        }
        const loud = lv > threshold
        const quiet = lv < threshold * 0.7
        if (!speechStart) {
          if (loud) { loudSince ||= now; if (now - loudSince > START_HOLD_MS) { speechStart = loudSince; lastLoud = now; onSpeechStart?.() } } else loudSince = 0
        } else {
          if (!quiet) lastLoud = now
          const spoke = lastLoud - speechStart
          if ((now - lastLoud > END_SILENCE_MS && spoke > MIN_SPEECH_MS) || now - speechStart > MAX_SPEECH_MS) { void finish(true); return }
          if (now - lastLoud > END_SILENCE_MS && spoke <= MIN_SPEECH_MS) { speechStart = 0; loudSince = 0 } // 기침 · 짧은 소리 — 다시 기다림
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { void finish(false) }
  }

  return {
    level,
    listen,
    close() {
      stream.getTracks().forEach((t) => t.stop())
      void ac.close()
    },
  }
}

async function toWav16k(input: AudioBuffer, from: number, to: number): Promise<string> {
  const rate = 16000
  const dur = Math.max(0.2, to - from)
  const off = new OfflineAudioContext(1, Math.ceil(dur * rate), rate)
  const src = off.createBufferSource()
  src.buffer = input
  src.connect(off.destination)
  src.start(0, from, dur)
  const out = (await off.startRendering()).getChannelData(0)
  const bytes = new DataView(new ArrayBuffer(44 + out.length * 2))
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) bytes.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); bytes.setUint32(4, 36 + out.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 1, true)
  bytes.setUint32(24, rate, true); bytes.setUint32(28, rate * 2, true); bytes.setUint16(32, 2, true); bytes.setUint16(34, 16, true)
  w(36, 'data'); bytes.setUint32(40, out.length * 2, true)
  for (let i = 0; i < out.length; i++) bytes.setInt16(44 + i * 2, Math.max(-1, Math.min(1, out[i])) * 0x7fff, true)
  let bin = ''
  const u8 = new Uint8Array(bytes.buffer)
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(bin)
}
