// 프로그램 영상 만들기(브라우저) — AI 영상이 아니라 편집 영상이다.
//   뮤직비디오: 카메라로 찍은 15초(+목소리)에 색감·빛 효과와 음악을 입힌다
//   추억 무비: 휴대폰으로 받은 사진 5~20장을 순서대로 이어 제목·음악을 붙인다
// 캔버스에 실제 시간대로 그리면서 MediaRecorder 로 녹화한다 — 진행률은 그린 시간 / 전체 길이(실제 값).
// 서버를 거치지 않는다(Vercel 요청 크기·시간 제한). 결과 파일은 저장 단계에서 저장소로 바로 올린다(save.ts).

import { playMusic, type MusicId } from './music'

export const VIDEO_W = 1280
export const VIDEO_H = 720

/** 이 브라우저가 녹화할 수 있는 형식 — 휴대폰 재생이 넓은 mp4 를 먼저 */
export function pickVideoMime(): string {
  const candidates = [
    'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  if (typeof MediaRecorder === 'undefined') return ''
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}

function recordStream(stream: MediaStream, mime: string, bits = 3_500_000) {
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bits, audioBitsPerSecond: 128_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(';')[0] }))
    recorder.onerror = () => reject(new Error('영상을 녹화하지 못했어요.'))
  })
  recorder.start(500)
  return { recorder, done }
}

export class RenderCancelled extends Error {
  constructor() { super('cancelled') }
}

// ───────────────────────── 뮤직비디오: 촬영 ─────────────────────────

/** 카메라(+마이크) 그대로 녹화 — stop() 이나 seconds 가 지나면 끝. 반환 길이는 실제 녹화 초 */
export function recordClip(stream: MediaStream, seconds: number, onTick: (elapsed: number) => void) {
  const mime = pickVideoMime()
  if (!mime) throw new Error('이 브라우저는 영상 녹화를 지원하지 않아요.')
  const { recorder, done } = recordStream(stream, mime, 5_000_000)
  const started = performance.now()
  let stopped = false
  const tick = window.setInterval(() => {
    const elapsed = (performance.now() - started) / 1000
    onTick(Math.min(seconds, elapsed))
    if (elapsed >= seconds) stop()
  }, 100)
  function stop() {
    if (stopped) return
    stopped = true
    window.clearInterval(tick)
    if (recorder.state !== 'inactive') recorder.stop()
  }
  const result = done.then((blob) => ({ blob, seconds: Math.min(seconds, (performance.now() - started) / 1000) }))
  return { stop, result, cancel: () => { stop() } }
}

// ───────────────────────── 뮤직비디오: 편집 ─────────────────────────

export type MvStyle = 'neon' | 'film' | 'dream'

/** 고르는 화면 미리보기용 CSS 필터(영상 편집 결과와 같은 방향) */
export const MV_PREVIEW_FILTER: Record<MvStyle, string> = {
  neon: 'saturate(1.6) contrast(1.15) hue-rotate(-12deg) brightness(1.02)',
  film: 'sepia(0.35) contrast(1.08) saturate(0.85) brightness(0.98)',
  dream: 'saturate(1.15) brightness(1.1) contrast(0.92)',
}

function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, mirror: boolean, zoom = 1, panX = 0, panY = 0) {
  const scale = Math.max(VIDEO_W / sw, VIDEO_H / sh) * zoom
  const w = sw * scale, h = sh * scale
  const x = (VIDEO_W - w) / 2 + panX * (w - VIDEO_W) / 2
  const y = (VIDEO_H - h) / 2 + panY * (h - VIDEO_H) / 2
  ctx.save()
  if (mirror) { ctx.translate(VIDEO_W, 0); ctx.scale(-1, 1) }
  ctx.drawImage(src, x, y, w, h)
  ctx.restore()
}

function mvOverlay(ctx: CanvasRenderingContext2D, style: MvStyle, t: number, grain: HTMLCanvasElement) {
  ctx.save()
  if (style === 'neon') {
    ctx.globalCompositeOperation = 'screen'
    const g = ctx.createLinearGradient(0, 0, VIDEO_W, VIDEO_H)
    const shift = (Math.sin(t * 1.4) + 1) / 2
    g.addColorStop(0, `rgba(170, 60, 255, ${0.28 + shift * 0.12})`)
    g.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
    g.addColorStop(1, `rgba(40, 200, 255, ${0.25 + (1 - shift) * 0.12})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
    // 지나가는 빛줄기
    const x = ((t * 420) % (VIDEO_W + 600)) - 300
    const beam = ctx.createLinearGradient(x - 120, 0, x + 120, 0)
    beam.addColorStop(0, 'rgba(255,80,220,0)'); beam.addColorStop(0.5, 'rgba(255,80,220,0.22)'); beam.addColorStop(1, 'rgba(255,80,220,0)')
    ctx.fillStyle = beam
    ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    for (let y = 0; y < VIDEO_H; y += 4) ctx.fillRect(0, y, VIDEO_W, 1)
  } else if (style === 'film') {
    ctx.globalAlpha = 0.16
    ctx.drawImage(grain, Math.random() * -40, Math.random() * -40, VIDEO_W + 40, VIDEO_H + 40)
    ctx.globalAlpha = 1
    const v = ctx.createRadialGradient(VIDEO_W / 2, VIDEO_H / 2, VIDEO_H * 0.35, VIDEO_W / 2, VIDEO_H / 2, VIDEO_W * 0.65)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,10,0,0.55)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
    if (Math.random() < 0.08) { ctx.fillStyle = 'rgba(255,240,210,0.06)'; ctx.fillRect(0, 0, VIDEO_W, VIDEO_H) }
    ctx.fillStyle = '#0b0906'
    ctx.fillRect(0, 0, VIDEO_W, 34); ctx.fillRect(0, VIDEO_H - 34, VIDEO_W, 34)
    ctx.fillStyle = 'rgba(240,230,210,0.85)'
    for (let x = ((t * 60) % 48) - 48; x < VIDEO_W; x += 48) { ctx.fillRect(x + 10, 10, 22, 14); ctx.fillRect(x + 10, VIDEO_H - 24, 22, 14) }
  } else {
    ctx.globalCompositeOperation = 'soft-light'
    const g = ctx.createLinearGradient(0, 0, VIDEO_W, VIDEO_H)
    g.addColorStop(0, 'rgba(255,190,230,0.55)'); g.addColorStop(1, 'rgba(170,210,255,0.55)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
    ctx.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 26; i++) {
      const px = (Math.sin(i * 12.9898 + t * 0.3) * 0.5 + 0.5) * VIDEO_W
      const py = ((i * 97 + t * 40) % (VIDEO_H + 40)) - 20
      const r = 2 + (i % 4)
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(t * 3 + i)})`
      ctx.beginPath(); ctx.arc(px, VIDEO_H - py, r, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

function grainCanvas() {
  const c = document.createElement('canvas')
  c.width = 320; c.height = 180
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(c.width, c.height)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

function titleCard(ctx: CanvasRenderingContext2D, alpha: number, lines: { text: string; font: string; color: string; y: number }[]) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const line of lines) {
    ctx.font = line.font
    ctx.fillStyle = line.color
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 18
    ctx.fillText(line.text, VIDEO_W / 2, line.y)
  }
  ctx.restore()
}

export interface RenderHandle {
  result: Promise<Blob>
  cancel: () => void
}

/** 뮤직비디오 편집 — canvas 에 실제로 그리는 모습을 그대로 화면에 보여 준다 */
export function renderMv(opts: {
  clip: Blob; seconds: number; style: MvStyle; music: MusicId; volume: number
  canvas: HTMLCanvasElement; fonts: { display: string; script: string }; label: string
  onProgress: (ratio: number) => void
}): RenderHandle {
  let cancelled = false
  let cleanup = () => {}
  const result = (async () => {
    const mime = pickVideoMime()
    if (!mime) throw new Error('이 브라우저는 영상 만들기를 지원하지 않아요.')
    const { canvas } = opts
    canvas.width = VIDEO_W; canvas.height = VIDEO_H
    const ctx = canvas.getContext('2d')!
    const url = URL.createObjectURL(opts.clip)
    const video = document.createElement('video')
    video.src = url
    video.playsInline = true
    video.preload = 'auto'
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('촬영한 영상을 열지 못했어요.'))
    })
    const audio = new AudioContext()
    const dest = audio.createMediaStreamDestination()
    const voice = audio.createGain()
    voice.gain.value = Math.max(0.15, 1 - opts.volume) // 음악을 크게 하면 목소리는 조금 줄인다
    audio.createMediaElementSource(video).connect(voice).connect(dest)
    const stream = canvas.captureStream(30)
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
    const { recorder, done } = recordStream(stream, mime)
    const startAt = audio.currentTime + 0.05
    const stopMusic = playMusic(audio, dest, opts.music, startAt, opts.seconds, opts.volume)
    const grain = grainCanvas()
    let raf = 0
    let cleaned = false
    cleanup = () => {
      if (cleaned) return
      cleaned = true
      cancelAnimationFrame(raf)
      stopMusic()
      video.pause()
      if (recorder.state !== 'inactive') recorder.stop()
      stream.getTracks().forEach((t) => t.stop())
      if (audio.state !== 'closed') void audio.close().catch(() => undefined)
      URL.revokeObjectURL(url)
    }
    await video.play()
    await new Promise<void>((resolve) => {
      const frame = () => {
        if (cancelled) return resolve()
        const t = video.currentTime
        ctx.filter = MV_PREVIEW_FILTER[opts.style] + (opts.style === 'dream' ? ' blur(0.6px)' : '')
        drawCover(ctx, video, video.videoWidth, video.videoHeight, true, 1.02 + 0.03 * Math.sin(t * 0.8))
        ctx.filter = 'none'
        mvOverlay(ctx, opts.style, t, grain)
        titleCard(ctx, 1.4 - t, [
          { text: 'MV!', font: `120px ${opts.fonts.display}`, color: '#ffffff', y: VIDEO_H / 2 - 30 },
          { text: opts.label, font: `40px ${opts.fonts.script}`, color: '#f3e8ff', y: VIDEO_H / 2 + 70 },
        ])
        titleCard(ctx, (t - (opts.seconds - 1.6)) / 0.6, [
          { text: 'MV!', font: `96px ${opts.fonts.display}`, color: '#ffffff', y: VIDEO_H / 2 - 20 },
          { text: 'Music Video Your Way', font: `40px ${opts.fonts.script}`, color: '#f3e8ff', y: VIDEO_H / 2 + 60 },
        ])
        opts.onProgress(Math.min(1, t / opts.seconds))
        if (video.ended || t >= opts.seconds) return resolve()
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    })
    cleanup()
    if (cancelled) throw new RenderCancelled()
    opts.onProgress(1)
    return done
  })()
  return { result, cancel: () => { cancelled = true; cleanup() } }
}

// ───────────────────────── 추억 무비 ─────────────────────────

function drawPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, progress: number, index: number) {
  const sw = img.naturalWidth, sh = img.naturalHeight
  // 바탕: 같은 사진을 흐리게 꽉 채움 — 세로 사진도 얼굴이 잘리지 않게 본 사진은 다 보이게(contain)
  ctx.save()
  ctx.filter = 'blur(28px) brightness(0.7) saturate(0.9)'
  drawCover(ctx, img, sw, sh, false, 1.15)
  ctx.restore()
  const zoom = 1 + 0.07 * progress
  const scale = Math.min(VIDEO_W / sw, (VIDEO_H - 60) / sh) * zoom
  const w = sw * scale, h = sh * scale
  const drift = (index % 2 ? -1 : 1) * 18 * progress
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30
  ctx.drawImage(img, (VIDEO_W - w) / 2 + drift, (VIDEO_H - h) / 2, w, h)
  ctx.restore()
}

/** 추억 무비 — duration 초에 사진을 고르게 나눠 이어 붙인다(앞 2초 제목, 뒤 2초 끝 장면) */
export function renderMovie(opts: {
  photos: HTMLImageElement[]; title: string; music: MusicId; duration: number
  canvas: HTMLCanvasElement; fonts: { display: string; script: string; body: string }
  onProgress: (ratio: number) => void
}): RenderHandle {
  let cancelled = false
  let cleanup = () => {}
  const result = (async () => {
    const mime = pickVideoMime()
    if (!mime) throw new Error('이 브라우저는 영상 만들기를 지원하지 않아요.')
    const { canvas, photos, duration } = opts
    canvas.width = VIDEO_W; canvas.height = VIDEO_H
    const ctx = canvas.getContext('2d')!
    const audio = new AudioContext()
    const dest = audio.createMediaStreamDestination()
    const stream = canvas.captureStream(30)
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
    const { recorder, done } = recordStream(stream, mime, 3_000_000)
    const stopMusic = playMusic(audio, dest, opts.music, audio.currentTime + 0.05, duration, 0.8)
    let raf = 0
    let cleaned = false
    cleanup = () => {
      if (cleaned) return
      cleaned = true
      cancelAnimationFrame(raf)
      stopMusic()
      if (recorder.state !== 'inactive') recorder.stop()
      stream.getTracks().forEach((t) => t.stop())
      if (audio.state !== 'closed') void audio.close().catch(() => undefined)
    }
    const intro = 2, outro = 2
    const slide = (duration - intro - outro) / photos.length
    const fade = Math.min(0.6, slide / 3)
    const started = performance.now()
    const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    await new Promise<void>((resolve) => {
      const frame = () => {
        if (cancelled) return resolve()
        const t = (performance.now() - started) / 1000
        ctx.fillStyle = '#1b130c'
        ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
        const st = t - intro
        const i = Math.max(0, Math.min(photos.length - 1, Math.floor(st / slide)))
        const local = st - i * slide
        if (t >= intro - fade && t < duration - outro + fade) {
          drawPhoto(ctx, photos[i], Math.max(0, local / slide), i)
          // 다음 사진으로 넘어가며 겹쳐 보인다
          if (local > slide - fade && i + 1 < photos.length) {
            ctx.save(); ctx.globalAlpha = (local - (slide - fade)) / fade
            drawPhoto(ctx, photos[i + 1], 0, i + 1)
            ctx.restore()
          }
          if (t < intro) { ctx.fillStyle = `rgba(27,19,12,${(intro - t) / fade})`; ctx.fillRect(0, 0, VIDEO_W, VIDEO_H) }
          // 따뜻한 색감 + 아래 자막
          ctx.save()
          ctx.globalCompositeOperation = 'soft-light'
          ctx.fillStyle = 'rgba(255,190,120,0.35)'
          ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
          ctx.restore()
          ctx.save()
          ctx.font = `italic 30px ${opts.fonts.display}`
          ctx.fillStyle = 'rgba(255,248,236,0.92)'
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10
          ctx.fillText(opts.title, 48, VIDEO_H - 44)
          ctx.textAlign = 'right'
          ctx.font = `22px ${opts.fonts.body}`
          ctx.fillText(`${i + 1} / ${photos.length}`, VIDEO_W - 48, VIDEO_H - 44)
          ctx.restore()
        }
        titleCard(ctx, t < intro ? Math.min(1, (intro - t) / 0.5) : 0, [
          { text: opts.title, font: `italic 900 76px ${opts.fonts.display}`, color: '#fff8ec', y: VIDEO_H / 2 - 20 },
          { text: date, font: `26px ${opts.fonts.body}`, color: '#e8d6bd', y: VIDEO_H / 2 + 50 },
        ])
        const outT = t - (duration - outro)
        if (outT > 0) {
          ctx.fillStyle = `rgba(27,19,12,${Math.min(1, outT / 0.5)})`
          ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
          titleCard(ctx, outT / 0.5, [
            { text: 'REPLAY!', font: `italic 900 96px ${opts.fonts.display}`, color: '#fff8ec', y: VIDEO_H / 2 - 20 },
            { text: 'Memories make a brighter you', font: `40px ${opts.fonts.script}`, color: '#e8d6bd', y: VIDEO_H / 2 + 60 },
          ])
        }
        opts.onProgress(Math.min(1, t / duration))
        if (t >= duration) return resolve()
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    })
    cleanup()
    if (cancelled) throw new RenderCancelled()
    opts.onProgress(1)
    return done
  })()
  return { result, cancel: () => { cancelled = true; cleanup() } }
}

/** 사진 주소 → 그림(저장소 주소라 crossOrigin 을 켠다) */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('사진을 불러오지 못했어요.'))
    img.src = src
  })
}
