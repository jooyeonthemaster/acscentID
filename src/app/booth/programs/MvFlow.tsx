'use client'

// 뮤직비디오 — 15초 촬영(카메라+마이크) → 미리보기·다시 촬영 → 음악·스타일 → 편집 영상 만들기(브라우저) → 재생 → QR 저장.
// AI 영상이 아니라 촬영 영상 편집이다(화면에 늘 안내). 인쇄 버튼은 없다.

import { AlertTriangle, Camera, CameraOff, Minus, Music2, Play, Plus, RefreshCw, RotateCcw, Sparkles, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultChoices, optionOf } from '@/lib/booth/programs/catalog'
import { useCamera } from './use-camera'
import type { FlowCtx } from './flow'
import { blackHan, pen } from './fonts'
import { previewMusic, type MusicId } from './music'
import { saveVideo } from './save'
import { QrCard, useSavedLink } from './SavePanel'
import { Creative, OptionGroups, PanelHead, Progress, Split, Stages, VideoPlayer, formatTime } from './ui'
import { MV_PREVIEW_FILTER, RenderCancelled, recordClip, renderMv, type MvStyle } from './video'

const CLIP_SECONDS = 15
const MIN_SECONDS = 5

type Step = 'record' | 'options' | 'render' | 'result' | 'save'
interface Clip { blob: Blob; url: string; seconds: number }

export function MvFlow({ ctx }: { ctx: FlowCtx }) {
  const { program } = ctx
  const [step, setStep] = useState<Step>('record')
  const [clip, setClip] = useState<Clip | null>(null)
  const [choices, setChoices] = useState(() => defaultChoices(program))
  const [volume, setVolume] = useState(0.8)
  const [video, setVideo] = useState<{ blob: Blob; url: string } | null>(null)
  const [replay, setReplay] = useState(0)

  const { setStep: showStep, setDirty } = ctx
  useEffect(() => { showStep(step === 'record' ? 1 : step === 'options' ? 2 : 3) }, [step, showStep])
  useEffect(() => { setDirty(!!clip) }, [clip, setDirty])
  // 영상 주소 정리
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url) }, [clip])
  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url) }, [video])

  return (
    <>
      {step === 'record' && <RecordStep ctx={ctx} clip={clip} setClip={setClip} onNext={() => setStep('options')} />}
      {step === 'options' && clip && (
        <Split className="pg-options" visual={<StylePreview clip={clip} style={choices.style as MvStyle} />}>
          <PanelHead title={program.options.title} sub={program.options.sub} eyebrow="2 / 3" />
          <OptionGroups groups={program.options.groups} choices={choices} onChange={(g, o) => setChoices((c) => ({ ...c, [g]: o }))} />
          <MusicPreview key={choices.genre} music={choices.genre as MusicId} volume={volume} />
          <div className="pg-volume" role="group" aria-label="음악 볼륨">
            <span>음악 볼륨</span>
            <button type="button" aria-label="볼륨 줄이기" onClick={() => setVolume((v) => Math.max(0.2, Math.round((v - 0.1) * 10) / 10))}><Minus size={22} /></button>
            <span className="pg-volume-bar" aria-hidden="true"><i style={{ width: `${volume * 100}%` }} /></span>
            <button type="button" aria-label="볼륨 키우기" onClick={() => setVolume((v) => Math.min(1, Math.round((v + 0.1) * 10) / 10))}><Plus size={22} /></button>
            <b>{Math.round(volume * 100)}%</b>
          </div>
          <div className="pg-actions">
            <button type="button" className="pg-btn pg-btn--line" onClick={() => setStep('record')}><RotateCcw size={20} />다시 촬영</button>
            <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={() => setStep('render')}>{program.options.cta}<span aria-hidden="true">→</span></button>
          </div>
        </Split>
      )}
      {step === 'render' && clip && (
        <RenderStep
          ctx={ctx} clip={clip} style={choices.style as MvStyle} music={choices.genre as MusicId} volume={volume}
          label={`${optionOf(program, 'genre', choices.genre)?.label ?? ''} · ${optionOf(program, 'style', choices.style)?.label ?? ''}`}
          onDone={(v) => { setVideo(v); setStep('result'); ctx.onResult() }}
          onBack={() => setStep('options')}
        />
      )}
      {step === 'result' && video && (
        <Split className="pg-result pg-result--video" visual={<VideoPlayer src={video.url} autoPlay className="pg-player--main" />}>
          <PanelHead title={program.result.title} sub={program.result.sub} />
          <p className="pg-chip-line"><Music2 size={18} />{optionOf(program, 'genre', choices.genre)?.label} · {optionOf(program, 'style', choices.style)?.label} 버전 · {formatTime(clip?.seconds ?? 0)}</p>
          <Creative text={program.creative} />
          <div className="pg-actions">
            <button type="button" className="pg-btn pg-btn--line" onClick={() => setStep('options')}><Sparkles size={20} />스타일 바꾸기</button>
            <button type="button" className="pg-btn pg-btn--line" onClick={() => { setVideo(null); setClip(null); setStep('record') }}><Camera size={20} />다시 촬영</button>
          </div>
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={() => setStep('save')}>영상 저장하기<span aria-hidden="true">→</span></button>
        </Split>
      )}
      {step === 'save' && video && (
        <VideoSave ctx={ctx} blob={video.blob} visual={<VideoPlayer src={video.url} className="pg-player--main" replayKey={replay} />} onReplay={() => setReplay((n) => n + 1)} />
      )}
    </>
  )
}

function StylePreview({ clip, style }: { clip: Clip; style: MvStyle }) {
  return (
    <div className={`pg-mv-preview pg-mv-preview--${style}`}>
      <video src={clip.url} autoPlay loop muted playsInline style={{ filter: MV_PREVIEW_FILTER[style], transform: 'scaleX(-1)' }} />
      <i aria-hidden="true" />
      <span>미리보기 · 실제 영상에는 음악과 효과가 들어가요</span>
    </div>
  )
}

export function MusicPreview({ music, volume = 0.8 }: { music: MusicId; volume?: number }) {
  const [playing, setPlaying] = useState(false)
  const stop = useRef<(() => void) | null>(null)
  useEffect(() => () => stop.current?.(), [])
  const toggle = () => {
    if (playing) { stop.current?.(); stop.current = null; setPlaying(false); return }
    stop.current = previewMusic(music, 6, volume)
    setPlaying(true)
    window.setTimeout(() => setPlaying(false), 6000)
  }
  return (
    <button type="button" className="pg-btn pg-btn--chip" onClick={toggle} aria-pressed={playing}>
      {playing ? <Square size={18} /> : <Play size={18} />}{playing ? '미리 듣기 멈춤' : '음악 미리 듣기'}
    </button>
  )
}

// ───────────────────────── 촬영 ─────────────────────────

type RecState = 'idle' | 'countdown' | 'recording' | 'done'

function RecordStep({ ctx, clip, setClip, onNext }: { ctx: FlowCtx; clip: Clip | null; setClip: (c: Clip | null) => void; onNext: () => void }) {
  const { program } = ctx
  const camera = useCamera({ enabled: !clip, audio: true, allowDslr: false })
  const [rec, setRec] = useState<RecState>(clip ? 'done' : 'idle')
  const [count, setCount] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); stopRef.current?.() }, [])
  const { setBusy } = ctx
  useEffect(() => { setBusy(rec === 'countdown' || rec === 'recording') }, [rec, setBusy])

  const start = useCallback(() => {
    if (rec !== 'idle' || camera.state !== 'ready' || !consent || !camera.stream) return
    setError(null)
    setRec('countdown'); setCount(3)
    for (let i = 1; i <= 3; i++) timers.current.push(window.setTimeout(() => setCount(3 - i), i * 1000))
    timers.current.push(window.setTimeout(() => {
      try {
        const handle = recordClip(camera.stream!, CLIP_SECONDS, setElapsed)
        stopRef.current = handle.stop
        setElapsed(0); setRec('recording')
        handle.result.then(({ blob, seconds }) => {
          stopRef.current = null
          if (seconds < MIN_SECONDS - 0.5 || blob.size < 1024) { setError('영상이 너무 짧아요. 다시 촬영해 주세요.'); setRec('idle'); return }
          setClip({ blob, url: URL.createObjectURL(blob), seconds })
          setRec('done')
        }).catch((cause) => { setError(cause instanceof Error ? cause.message : '녹화하지 못했어요.'); setRec('idle') })
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '녹화하지 못했어요.'); setRec('idle')
      }
    }, 3000))
  }, [rec, camera, consent, setClip])

  if (camera.state === 'error' && !clip) {
    return (
      <Split className="pg-capture-step" visual={<div className="pg-cam pg-cam--off"><CameraOff size={96} aria-hidden="true" /><p>카메라가 연결되지 않았어요</p></div>}>
        <PanelHead title="카메라가 연결되지 않았어요" sub={camera.error ?? '연결을 확인한 뒤 다시 시도해 주세요'} />
        <div className="pg-stack">
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={camera.retry}><RefreshCw size={20} />다시 연결하기</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={ctx.home}>처음으로</button>
          <p className="pg-muted">뮤직비디오는 카메라와 마이크를 함께 써요. 계속 안 되면 직원에게 도움을 요청해 주세요.</p>
        </div>
      </Split>
    )
  }

  const visual = clip ? (
    <VideoPlayer src={clip.url} mirror autoPlay className="pg-player--main" />
  ) : (
    <figure className="pg-cam pg-cam--mv" data-live>
      <video ref={camera.videoRef} muted playsInline className="pg-cam-video" />
      {rec === 'recording' && (
        <p className="pg-rec" aria-live="polite"><i aria-hidden="true" />REC {formatTime(elapsed)} / {formatTime(CLIP_SECONDS)}</p>
      )}
      {rec === 'recording' && <span className="pg-rec-bar" style={{ width: `${(elapsed / CLIP_SECONDS) * 100}%` }} aria-hidden="true" />}
      {rec === 'countdown' && count > 0 && <b className="pg-count" aria-live="assertive">{count}</b>}
      {camera.state === 'starting' && <p className="pg-cam-note">카메라와 마이크를 켜는 중…</p>}
    </figure>
  )

  return (
    <Split className="pg-capture-step" visual={visual}>
      <PanelHead title={clip ? '촬영한 영상을 확인해요' : program.capture.title} sub={clip ? '마음에 들면 음악을 고르러 가요' : program.capture.hint} eyebrow="1 / 3" />
      {error && <p className="pg-error-text" role="alert">{error}</p>}
      {!clip ? (
        <>
          <ul className="pg-tips">
            <li><span aria-hidden="true">💃</span>자유롭게 춤춰요</li>
            <li><span aria-hidden="true">🎤</span>노래해도 좋아요</li>
            <li><span aria-hidden="true">✌️</span>나만의 포즈 OK!</li>
          </ul>
          <label className="pg-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={rec !== 'idle'} />
            <span>영상·소리 촬영과 영상 만들기에 동의해요. 저장을 누른 영상만 7일 보관해요.</span>
          </label>
          {rec === 'recording' ? (
            <button type="button" className="pg-btn pg-btn--accent pg-btn--shoot" onClick={() => stopRef.current?.()} disabled={elapsed < MIN_SECONDS}>
              <Square size={26} />{elapsed < MIN_SECONDS ? `녹화 중 · ${Math.ceil(MIN_SECONDS - elapsed)}초 뒤 끝낼 수 있어요` : '촬영 끝내기'}
            </button>
          ) : (
            <button type="button" className="pg-btn pg-btn--accent pg-btn--shoot" onClick={start} disabled={rec !== 'idle' || camera.state !== 'ready' || !consent}>
              <Camera size={28} />{rec === 'countdown' ? `${count}초 뒤 시작…` : '촬영 시작'}
            </button>
          )}
          {!consent && rec === 'idle' && <p className="pg-muted">촬영하려면 위 동의를 눌러 주세요.</p>}
        </>
      ) : (
        <div className="pg-actions">
          <button type="button" className="pg-btn pg-btn--line" onClick={() => { setClip(null); setRec('idle') }}><RotateCcw size={20} />다시 촬영</button>
          <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={onNext}>이 영상으로<span aria-hidden="true">→</span></button>
        </div>
      )}
    </Split>
  )
}

// ───────────────────────── 편집 ─────────────────────────

function RenderStep({ ctx, clip, style, music, volume, label, onDone, onBack }: {
  ctx: FlowCtx; clip: Clip; style: MvStyle; music: MusicId; volume: number; label: string
  onDone: (v: { blob: Blob; url: string }) => void
  onBack: () => void
}) {
  const { program } = ctx
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const [ratio, setRatio] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (!canvas.current) return
    ctx.setBusy(true); setError(null); setRatio(0)
    const handle = renderMv({
      clip: clip.blob, seconds: clip.seconds, style, music, volume, canvas: canvas.current,
      fonts: { display: blackHan.style.fontFamily, script: pen.style.fontFamily }, label, onProgress: setRatio,
    })
    handle.result
      .then((blob) => done.current({ blob, url: URL.createObjectURL(blob) }))
      .catch((cause) => { if (!(cause instanceof RenderCancelled)) setError(cause instanceof Error ? cause.message : '영상을 만들지 못했어요.') })
      .finally(() => ctx.setBusy(false))
    return () => { handle.cancel(); ctx.setBusy(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])
  const active = ratio < 0.08 ? 0 : ratio < 0.92 ? 1 : 2
  return (
    <Split className="pg-generating" visual={<canvas ref={canvas} className="pg-render-canvas" aria-label="만들고 있는 영상" />}>
      {error ? (
        <>
          <div className="pg-error-icon" aria-hidden="true"><AlertTriangle size={44} /></div>
          <PanelHead title="잠시 문제가 생겼어요" sub="촬영한 영상과 선택한 음악은 그대로예요" />
          <p className="pg-error-text" role="alert">{error}</p>
          <div className="pg-stack">
            <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={20} />다시 만들기</button>
            <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={onBack}>스타일 바꾸기</button>
          </div>
        </>
      ) : (
        <>
          <PanelHead title={program.generating.title} sub={program.generating.sub} />
          <Progress ratio={ratio} caption="영상 길이만큼 걸려요" />
          <Stages labels={program.generating.stages} active={active} />
          <Creative text={program.creative} />
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={ctx.requestHome}>처음으로</button>
        </>
      )}
    </Split>
  )
}

// ───────────────────────── 저장(영상 공통) ─────────────────────────

export function VideoSave({ ctx, blob, visual, onReplay }: { ctx: FlowCtx; blob: Blob; visual: React.ReactNode; onReplay: () => void }) {
  const { program } = ctx
  const [progress, setProgress] = useState<number | null>(null)
  const make = useCallback(async () => {
    setProgress(0)
    ctx.setBusy(true)
    try {
      return await saveVideo(await ctx.getTicket(), blob, setProgress)
    } finally {
      ctx.setBusy(false)
    }
  }, [ctx, blob])
  const saved = useSavedLink(make, true)
  const { markShot, setDirty } = ctx
  useEffect(() => { if (saved.link) { markShot({ downloaded: true }); setDirty(false) } }, [saved.link, markShot, setDirty])
  return (
    <Split className="pg-save pg-save--video" visual={visual}>
      <PanelHead title={program.save.title} sub={program.save.sub} />
      <QrCard state={saved} label="휴대폰으로 영상 받기" progress={progress} />
      <div className="pg-actions">
        <button type="button" className="pg-btn pg-btn--line" onClick={onReplay}><RotateCcw size={20} />영상 다시 보기</button>
        <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={ctx.requestHome}>체험 마치기<span aria-hidden="true">→</span></button>
      </div>
    </Split>
  )
}
