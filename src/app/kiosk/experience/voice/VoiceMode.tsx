'use client'

// 보이스 체험(VOICE!) — 한 문장 녹음 → 라디오·로봇·동화 스타일로 바꿔 원본과 비교 → 오디오 카드·휴대폰으로 받기. 목업 05-voice-experience.
// 손님 본인의 녹음에 스타일만 입힌다(audio.ts). 녹음은 기기 안에서만 쓰고, 받기를 누른 결과만 올라간다.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, BookOpen, Bot, Check, Mic, MicOff, Play, Radio, RefreshCw, Shuffle, Smartphone, Square } from 'lucide-react'
import { KX_IDLE, KxFoot, KxHome, KxLang, KxPage, KxSaveSheet, KxSpinner, KxStart, KxSteps, KxTop, useKx, useKxScreen, type KxShareFile } from '../kx'
import { kxText } from '../kx-i18n'
import { canvasBlob, fillLines, fontsReady, kxFontFamily, makeCanvas, roundRect, wrapLines } from '../kx-canvas'
import { applyStyle, clock, decodeRecording, encodeWav, peaks, seconds, VOICE_MAX_SECONDS, VOICE_RATE, VOICE_STYLES, type VoiceStyle } from './audio'
import { VOICE_TEXT, type VoiceText } from './text'
import './voice.css'

type Step = 'start' | 'record' | 'processing' | 'style' | 'result'
type Problem = 'short' | 'quiet' | 'failed'
const BARS = 46
const STYLE_ICON = { radio: Radio, robot: Bot, fairy: BookOpen } as const

interface Playing { id: string; startedAt: number; duration: number }

/** 재생기 — 한 번에 하나만 튼다 */
function usePlayer() {
  const audio = useRef<AudioContext | null>(null)
  const node = useRef<AudioBufferSourceNode | null>(null)
  const [playing, setPlaying] = useState<Playing | null>(null)

  const stop = useCallback(() => {
    const current = node.current
    node.current = null
    if (current) { current.onended = null; try { current.stop() } catch { /* 이미 끝났다 */ } }
    setPlaying(null)
  }, [])
  const play = useCallback((id: string, samples: Float32Array) => {
    stop()
    const ctx = (audio.current ??= new AudioContext())
    void ctx.resume()
    const buffer = ctx.createBuffer(1, samples.length, VOICE_RATE)
    buffer.getChannelData(0).set(samples)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => { if (node.current === source) { node.current = null; setPlaying(null) } }
    source.start()
    node.current = source
    setPlaying({ id, startedAt: performance.now(), duration: seconds(samples) })
  }, [stop])
  useEffect(() => () => { stop(); void audio.current?.close().catch(() => {}) }, [stop])
  return { playing, play, stop }
}

/** 마이크 켜기·끄기와 녹음. active 가 꺼지면 장치를 놓는다 */
function useRecorder(active: boolean, onDone: (blob: Blob) => void) {
  const [state, setState] = useState<'starting' | 'ready' | 'error'>('starting')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const startedAt = useRef(0)
  const discard = useRef(false)
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone }, [onDone])

  useEffect(() => {
    if (!active) return
    let alive = true
    let retry: number | undefined
    let audio: AudioContext | null = null
    discard.current = false
    const start = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
        if (!alive) { media.getTracks().forEach((track) => track.stop()); return }
        stream.current = media
        audio = new AudioContext()
        void audio.resume()
        const node = audio.createAnalyser()
        node.fftSize = 1024
        audio.createMediaStreamSource(media).connect(node)
        setAnalyser(node)
        setState('ready')
      } catch {
        if (!alive) return
        setState('error')
        // 선이 잠깐 빠졌다 돌아오는 일이 있다 — 손님이 화면에 머무는 동안 계속 다시 본다
        retry = window.setTimeout(start, 3000)
      }
    }
    void start()
    return () => {
      alive = false
      window.clearTimeout(retry)
      // 화면을 떠나며 끊긴 녹음은 버린다
      discard.current = true
      if (recorder.current?.state === 'recording') recorder.current.stop()
      recorder.current = null
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      void audio?.close().catch(() => {})
      setAnalyser(null)
      setRecording(false)
      setState('starting')
    }
  }, [active])

  const end = useCallback(() => { if (recorder.current?.state === 'recording') recorder.current.stop() }, [])
  const begin = useCallback(() => {
    if (!stream.current || recorder.current) return
    const chunks: Blob[] = []
    const type = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
    const made = new MediaRecorder(stream.current, type ? { mimeType: type } : undefined)
    made.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
    made.onstop = () => {
      recorder.current = null
      setRecording(false)
      if (!discard.current) done.current(new Blob(chunks, { type: made.mimeType }))
    }
    made.start()
    recorder.current = made
    startedAt.current = performance.now()
    setElapsed(0)
    setRecording(true)
  }, [])
  // 시간 표시와 15초 자동 정지
  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => {
      const passed = (performance.now() - startedAt.current) / 1000
      setElapsed(passed)
      if (passed >= VOICE_MAX_SECONDS) end()
    }, 200)
    return () => window.clearInterval(timer)
  }, [recording, end])

  return { state, recording, elapsed, analyser, begin, end }
}

/** 마이크 소리의 지금 크기(0~1) — 약 -52dB 를 0, -6dB 를 1 로 */
function readLevel(analyser: AnalyserNode, scratch: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(scratch)
  let sum = 0
  for (let i = 0; i < scratch.length; i++) sum += scratch[i] * scratch[i]
  const db = 20 * Math.log10(Math.sqrt(sum / scratch.length) + 1e-6)
  return Math.min(1, Math.max(0, (db + 52) / 46))
}

/** 녹음 화면의 살아 있는 파형과 입력 레벨 — 매 프레임 DOM 에 바로 쓴다(리액트를 다시 그리지 않는다) */
function LiveMeter({ analyser, recording, t }: { analyser: AnalyserNode | null; recording: boolean; t: VoiceText }) {
  const wave = useRef<HTMLDivElement>(null)
  const lit = useRef<HTMLElement>(null)
  const [grade, setGrade] = useState<'low' | 'good' | 'high'>('low')
  useEffect(() => {
    if (!analyser) return
    const scratch = new Float32Array(analyser.fftSize)
    const history = new Array<number>(BARS).fill(0)
    let frame = 0, lastPush = 0, lastGrade = 0, smooth = 0, peak = 0
    const tick = (now: number) => {
      const level = readLevel(analyser, scratch)
      smooth += (level - smooth) * (level > smooth ? 0.5 : 0.12)
      peak = Math.max(level, peak * 0.985)
      if (lit.current) lit.current.style.clipPath = `inset(0 ${(100 - smooth * 100).toFixed(1)}% 0 0)`
      if (now - lastPush > 66) {
        lastPush = now
        // 막대는 그 순간의 크기로(레벨 눈금은 천천히 내려오는 값)
        history.push(level)
        history.shift()
        const bars = wave.current?.children
        if (bars) for (let i = 0; i < bars.length; i++) (bars[i] as HTMLElement).style.transform = `scaleY(${Math.max(0.05, history[i] * history[i]).toFixed(3)})`
      }
      if (now - lastGrade > 350) { lastGrade = now; setGrade(peak > 0.93 ? 'high' : peak > 0.42 ? 'good' : 'low') }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [analyser])
  return (
    <>
      <div ref={wave} className="vc-live" data-on={recording || undefined} aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => <i key={i} />)}
      </div>
      <div className="vc-level">
        <em>{t.levelLabel}</em>
        <span className="vc-level-bar" aria-hidden="true"><i /><i ref={lit} data-lit /></span>
        <b data-grade={grade}>{t.levels[grade]}</b>
      </div>
    </>
  )
}

/** 파형 막대 — 재생 중이면 지나간 만큼 밝아진다 */
function Wave({ values, playing }: { values: number[]; playing: Playing | null }) {
  const lit = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = lit.current
    if (!el) return
    if (!playing) { el.style.clipPath = 'inset(0 100% 0 0)'; return }
    let frame = 0
    const tick = () => {
      const done = Math.min(1, (performance.now() - playing.startedAt) / 1000 / playing.duration)
      el.style.clipPath = `inset(0 ${(100 - done * 100).toFixed(2)}% 0 0)`
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [playing])
  const bars = values.map((value, i) => <i key={i} style={{ '--h': value, '--i': i } as CSSProperties} />)
  return (
    <div className="vc-wave" aria-hidden="true">
      <div>{bars}</div>
      <div ref={lit} data-lit>{bars}</div>
    </div>
  )
}

/** 저장용 오디오 카드 그림 */
async function drawVoiceCard(t: VoiceText, styleName: string, script: string, values: number[], length: number): Promise<Blob> {
  const family = kxFontFamily()
  await fontsReady(`900 60px ${family}`, `600 30px ${family}`)
  const W = 1080, H = 1350
  const [canvas, ctx] = makeCanvas(W, H)
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0a1036')
  bg.addColorStop(0.55, '#070b22')
  bg.addColorStop(1, '#1a1150')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#5ff0df'
  ctx.font = `900 150px Impact, ${family}`
  ctx.fillText('VOICE!', W / 2, 90)
  // 카드
  ctx.fillStyle = 'rgba(20, 28, 78, 0.9)'
  roundRect(ctx, 80, 300, W - 160, 800, 40)
  ctx.fill()
  ctx.strokeStyle = 'rgba(120, 140, 255, 0.6)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = '#f4f7ff'
  ctx.font = `900 84px ${family}`
  ctx.fillText('MY VOICE', W / 2, 370)
  ctx.font = `800 38px ${family}`
  const tagW = ctx.measureText(styleName).width + 72
  ctx.strokeStyle = '#5ff0df'
  roundRect(ctx, (W - tagW) / 2, 486, tagW, 66, 33)
  ctx.stroke()
  ctx.fillStyle = '#5ff0df'
  ctx.fillText(styleName, W / 2, 498)
  // 파형 — 가운데가 청록, 양 끝이 보라
  const left = 150, width = W - 300, mid = 720, step = width / values.length
  values.forEach((value, i) => {
    const edge = Math.abs(i / (values.length - 1) - 0.5) * 2
    ctx.fillStyle = edge > 0.62 ? '#8f7bff' : '#5ff0df'
    const h = Math.max(8, value * 190)
    roundRect(ctx, left + i * step + step * 0.22, mid - h / 2, step * 0.56, h, step * 0.28)
    ctx.fill()
  })
  ctx.fillStyle = '#a9b3d9'
  ctx.font = `700 34px ${family}`
  ctx.fillText(clock(length), W / 2, 850)
  ctx.fillStyle = '#f4f7ff'
  ctx.font = `600 36px ${family}`
  fillLines(ctx, wrapLines(ctx, script.replace(/\n/g, ' '), W - 280).slice(0, 3), W / 2, 930, 52)
  ctx.fillStyle = '#a9b3d9'
  ctx.font = `500 28px ${family}`
  ctx.fillText(t.foot, W / 2, 1200)
  return canvasBlob(canvas, 'image/jpeg', 0.92)
}

export default function VoiceMode() {
  const { lang } = useKx()
  const t = kxText(VOICE_TEXT, lang)
  const [step, setStep] = useState<Step>('start')
  const [scriptIndex, setScriptIndex] = useState(0)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [original, setOriginal] = useState<Float32Array | null>(null)
  const [styled, setStyled] = useState<Partial<Record<VoiceStyle, Float32Array>>>({})
  const [style, setStyle] = useState<VoiceStyle>('radio')
  /** 변환이 끝나면 바로 들려줄 스타일(아직 준비 중일 때 눌렀다) */
  const [wanted, setWanted] = useState<VoiceStyle | null>(null)
  const [saving, setSaving] = useState(false)
  const { playing, play, stop } = usePlayer()

  const onRecorded = useCallback(async (blob: Blob) => {
    setStep('processing')
    try {
      const decoded = await decodeRecording(blob)
      if (!decoded.ok) { setProblem(decoded.reason); setStep('record'); return }
      const first = await applyStyle(decoded.samples, 'radio')
      setOriginal(decoded.samples)
      setStyled({ radio: first })
      setStyle('radio')
      setProblem(null)
      setStep('style')
    } catch (error) {
      console.error('[kiosk] 녹음을 처리하지 못했습니다:', error)
      setProblem('failed')
      setStep('record')
    }
  }, [])
  const rec = useRecorder(step === 'record', onRecorded)

  useKxScreen(step === 'start' ? 'start' : step === 'processing' || rec.recording || playing ? 'busy' : saving ? KX_IDLE.save : step === 'record' ? KX_IDLE.camera : step === 'style' ? KX_IDLE.edit : KX_IDLE.result)

  // 스타일 만들기 — 같은 스타일을 두 번 만들지 않는다. 끝났을 때 손님이 기다리던 스타일이면 바로 들려준다
  const jobs = useRef(new Set<VoiceStyle>())
  const waiting = useRef<VoiceStyle | null>(null)
  const live = useRef<{ source: Float32Array | null; step: Step }>({ source: null, step: 'start' })
  useEffect(() => { live.current = { source: original, step } }, [original, step])
  const ensure = useCallback((id: VoiceStyle, source: Float32Array) => {
    if (jobs.current.has(id)) return
    jobs.current.add(id)
    applyStyle(source, id)
      .then((made) => {
        // 그 사이 다시 녹음했으면 버린다
        if (live.current.source !== source) return
        setStyled((prev) => ({ ...prev, [id]: made }))
        if (waiting.current !== id) return
        waiting.current = null
        setWanted(null)
        if (live.current.step === 'style') play('styled', made)
      })
      .catch((error) => console.error('[kiosk] 스타일을 입히지 못했습니다:', error))
      .finally(() => jobs.current.delete(id))
  }, [play])
  // 나머지 스타일은 고르는 동안 하나씩 미리 만들어 둔다(기다리는 스타일 먼저)
  useEffect(() => {
    if ((step !== 'style' && step !== 'result') || !original) return
    const missing = (wanted && !styled[wanted] ? wanted : null) ?? VOICE_STYLES.find((id) => !styled[id])
    if (!missing) return
    const timer = window.setTimeout(() => ensure(missing, original), 120)
    return () => window.clearTimeout(timer)
  }, [step, original, styled, wanted, ensure])
  // 화면이 바뀌면 재생을 멈춘다
  useEffect(() => stop, [step, stop])

  const current = styled[style] ?? null
  const originalBars = useMemo(() => (original ? peaks(original, BARS) : []), [original])
  const styledBars = useMemo(() => (current ? peaks(current, BARS) : []), [current])
  const script = t.scripts[scriptIndex]
  const styleName = t.styles[style]

  const pick = (id: VoiceStyle) => {
    setStyle(id)
    const made = styled[id]
    waiting.current = made ? null : id
    if (made) { setWanted(null); play('styled', made) } else { stop(); setWanted(id) }
  }
  const toggle = (id: 'original' | 'styled', samples: Float32Array | null) => {
    if (!samples) return
    if (playing?.id === id) stop(); else play(id, samples)
  }
  const reRecord = () => { stop(); waiting.current = null; jobs.current.clear(); setOriginal(null); setStyled({}); setWanted(null); setProblem(null); setStep('record') }

  const build = useCallback(async (): Promise<KxShareFile[]> => {
    if (!current) throw new Error('결과가 없습니다')
    return [
      { name: 'my-voice.wav', type: 'audio/wav', label: t.audioLabel.replace('{style}', styleName), blob: encodeWav(current) },
      { name: 'voice-card.jpg', type: 'image/jpeg', label: t.cardLabel, blob: await drawVoiceCard(t, styleName, script, styledBars, seconds(current)) },
    ]
  }, [current, t, styleName, script, styledBars])

  if (step === 'start') {
    return (
      <KxStart
        brand={t.brand}
        wordmark="VOICE!"
        headline={<>{t.headline[0]}<br />{t.headline[1]}</>}
        // eslint-disable-next-line @next/next/no-img-element
        art={<img className="kx-art-blend" src="/assets/kiosk-experiences/voice-hero.webp" alt="" draggable={false} />}
        cta={t.cta}
        onStart={() => { setProblem(null); setStep('record') }}
        foot={t.foot}
      >
        <p className="vc-sub">{t.sub}</p>
        <p className="vc-start-note">{t.note}</p>
      </KxStart>
    )
  }

  const head = (
    <>
      <KxTop left={<KxHome />} center={<span className="kx-mark">VOICE!</span>} right={<KxLang />} />
      <KxSteps labels={t.steps} current={step === 'record' || step === 'processing' ? 0 : step === 'style' ? 1 : 2} pad />
    </>
  )

  if (step === 'record' || step === 'processing') {
    const busy = step === 'processing'
    return (
      <KxPage name="voice-record">
        {head}
        <h1 className="kx-title">{t.recordTitle}</h1>
        <p className="kx-desc">{t.recordDesc}</p>
        <p className="vc-mic" data-state={rec.state} role="status">
          {rec.state === 'error' ? <MicOff size={18} strokeWidth={2} aria-hidden="true" /> : <Mic size={18} strokeWidth={2} aria-hidden="true" />}
          {rec.state === 'ready' ? t.micReady : rec.state === 'error' ? t.micOff : t.micStarting}
        </p>
        <section className="vc-card vc-script">
          <h2>{t.scriptLabel}</h2>
          <p key={scriptIndex}>{script}</p>
          <button type="button" disabled={rec.recording || busy} onClick={() => setScriptIndex((i) => (i + 1) % t.scripts.length)}><Shuffle size={17} strokeWidth={2} aria-hidden="true" />{t.otherScript}</button>
        </section>
        {rec.state === 'error'
          ? <p className="vc-alert" role="alert"><b>{t.micOff}</b>{t.micOffDesc}</p>
          : (
            <>
              <p className="vc-rec-state" data-on={rec.recording || undefined}><i aria-hidden="true" />{busy ? t.processing : rec.recording ? t.recording : t.recReady}</p>
              <p className="vc-clock"><b>{clock(rec.recording ? rec.elapsed : 0)}</b> / {clock(VOICE_MAX_SECONDS)}</p>
              <LiveMeter analyser={rec.analyser} recording={rec.recording} t={t} />
            </>
          )}
        {problem && !rec.recording && !busy && rec.state !== 'error' && <p className="vc-alert" role="alert"><b>{t.problems[problem][0]}</b>{t.problems[problem][1]}</p>}
        <div className="kx-spacer" />
        <p className="vc-hint">{t.recHint}</p>
        {busy
          ? <button type="button" className="kx-btn kx-btn--primary kx-btn--wide vc-go" disabled><KxSpinner size={28} />{t.processing}</button>
          : rec.recording
            ? <button type="button" className="kx-btn kx-btn--primary kx-btn--wide vc-go" data-rec onClick={rec.end}><Square size={24} strokeWidth={0} fill="currentColor" aria-hidden="true" />{t.recStop}</button>
            : <button type="button" className="kx-btn kx-btn--primary kx-btn--wide vc-go" disabled={rec.state !== 'ready'} onClick={() => { setProblem(null); rec.begin() }}><Mic size={28} strokeWidth={2} aria-hidden="true" />{t.recStart}</button>}
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (!original) return null
  const row = (id: 'original' | 'styled', label: string, samples: Float32Array | null, bars: number[], tag?: string) => (
    <button type="button" className="vc-row" data-id={id} data-playing={playing?.id === id || undefined} disabled={!samples} onClick={() => toggle(id, samples)} aria-label={`${label} — ${playing?.id === id ? t.stop : t.play}`}>
      <span className="vc-row-label">{label}{tag && <em>{tag}</em>}</span>
      <span className="vc-row-play" aria-hidden="true">{!samples ? <KxSpinner size={22} /> : playing?.id === id ? <Square size={16} strokeWidth={0} fill="currentColor" /> : <Play size={20} strokeWidth={0} fill="currentColor" />}</span>
      {samples ? <Wave values={bars} playing={playing?.id === id ? playing : null} /> : <span className="vc-row-wait">{t.converting}</span>}
      <span className="vc-row-time">{samples ? clock(seconds(samples)) : ''}</span>
    </button>
  )

  if (step === 'style') {
    return (
      <KxPage name="voice-style">
        {head}
        <h1 className="kx-title">{t.styleTitle}</h1>
        <p className="kx-desc">{t.styleDesc}</p>
        <section className="vc-card vc-mine">
          <h2>{t.mySentence}<span>{clock(seconds(original))}</span></h2>
          <p>{script}</p>
        </section>
        <div className="vc-styles" role="radiogroup" aria-label={t.steps[1]}>
          {VOICE_STYLES.map((id, i) => {
            const Icon = STYLE_ICON[id]
            return (
              <button key={id} type="button" role="radio" aria-checked={style === id} data-on={style === id || undefined} style={{ '--i': i } as CSSProperties} onClick={() => pick(id)}>
                {style === id && <span className="vc-check" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>}
                <Icon size={46} strokeWidth={1.5} aria-hidden="true" />
                <b>{t.styles[id]}</b>
              </button>
            )
          })}
        </div>
        <p className="vc-style-note" key={style}>{t.styleNotes[style]}</p>
        <section className="vc-card vc-compare">
          <h2>{t.compareTitle}</h2>
          {row('original', t.playOriginal, original, originalBars)}
          {row('styled', t.playStyled, current, styledBars, styleName)}
        </section>
        <div className="kx-spacer" />
        <button type="button" className="kx-btn kx-btn--wide vc-ghost" onClick={reRecord}><RefreshCw size={20} strokeWidth={2} aria-hidden="true" />{t.reRecord}</button>
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide vc-go" disabled={!current} onClick={() => setStep('result')}>{t.toResult}<ArrowRight size={26} strokeWidth={2.2} aria-hidden="true" /></button>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (!current) return null
  return (
    <KxPage name="voice-result">
      {head}
      <h1 className="kx-title">{t.resultTitle}</h1>
      <p className="kx-desc">{t.resultDesc.replace('{style}', styleName)}</p>
      <section className="vc-card vc-audio">
        <header>
          <span className="vc-audio-mic" aria-hidden="true"><Mic size={40} strokeWidth={1.5} /></span>
          <p><b>MY VOICE</b><em>{styleName}</em></p>
          <span className="vc-audio-check" aria-hidden="true"><Check size={26} strokeWidth={3} /></span>
        </header>
        <Wave values={styledBars} playing={playing?.id === 'styled' ? playing : null} />
        <p className="vc-audio-time">{clock(seconds(current))}</p>
        <p className="vc-audio-script">{script.replace(/\n/g, ' ')}</p>
      </section>
      {row('original', t.playOriginal, original, originalBars)}
      {row('styled', t.playStyled, current, styledBars)}
      <div className="kx-spacer" />
      <button type="button" className="kx-btn kx-btn--wide vc-ghost" onClick={() => setStep('style')}><RefreshCw size={20} strokeWidth={2} aria-hidden="true" />{t.otherStyle}</button>
      <button type="button" className="kx-btn kx-btn--primary kx-btn--wide vc-go" onClick={() => { stop(); setSaving(true) }}><Smartphone size={26} strokeWidth={2} aria-hidden="true" />{t.save}</button>
      <KxFoot>{t.foot}</KxFoot>
      <KxSaveSheet open={saving} cacheKey={`${lang}|${style}|${scriptIndex}|${current.length}`} build={build} onClose={() => setSaving(false)} title={t.saveTitle} />
    </KxPage>
  )
}
