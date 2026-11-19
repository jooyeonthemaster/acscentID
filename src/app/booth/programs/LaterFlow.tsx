'use client'

// LATER! 나중 박사의 타임캡슐(catalog 'later') — ANSAN 타임캡슐(StripFlow)을 행사 표기 없는 일반 프로그램 · 영상판으로(2026-11-18).
// 화면 뒤에는 늘 영상(video-stage.tsx LATER): 나중 박사의 창고(시작) → 손님이 캡슐에 타면 일인칭 조종석(촬영) → 레버가 덜컥 · 시간 터널(생성)
//   → 창밖 2036 · 2046 · 2056(그 해의 우리 사진을 오른쪽 패널에 크게, 손님이 다이얼 버튼으로 넘긴다) → 착륙해 문을 열면 그을린 박사(네 컷 · 프레임 · 인화) → 처음으로.
// 박사는 캡슐에서 내릴 때까지 화면에 나오지 않고 말풍선(무전) 대사로만 할 일을 알린다(사용자 지시). 목표는 10 · 20 · 30년 뒤 내 모습을 보는 것.
// 생성 · 인화물은 ANSAN 과 같다(makeFuture · strip-print.ts) — 인화물 글자만 LATER_SIGN, 프레임은 행사용(40주년)을 뺀 9종.
// 단계는 ctx.report 로 알리고(ProgramApp → 장면), 오른쪽 패널은 영상이 그 장면에 도착한 뒤 떠오른다(later.css, data-arrived).

import { AlertTriangle, ArrowRight, Camera, CameraOff, Check, Home, ImagePlus, Printer, Radio, RefreshCw, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { countFaces, preloadFaceDetect } from '@/lib/booth/face-detect'
import type { ProgramDef } from '@/lib/booth/programs/catalog'
import { STRIP_FRAMES, type StripFrameDef } from '@/lib/booth/programs/strip-frames'
import { LATER_SIGN, STRIP_MAX_PEOPLE, STRIP_NOW_YEAR, STRIP_STEPS } from '@/lib/booth/programs/timecapsule-strip'
import { useCamera } from './use-camera'
import type { FlowCtx } from './flow'
import { PhoneSheet } from './PhotoFlow'
import { savePhoto } from './save'
import { PrintCard, QrCard, usePrint, useSavedLink } from './SavePanel'
import { crop32, makeFuture, type RetakeNotice } from './StripFlow'
import { framePhotoLayer, makeStripQr, renderFrameStrip, renderStrip, stripSheet, stripThumb, type StripInput, type StripQr } from './strip-print'
import { STRIPS_PER_SHEET, readStripAuto, readStripMax, stripCountOptions, stripSheets } from './strip-count'
import { useElapsed } from './ui'
import { loadImage } from './video'
import './later.css'

type Step = 'capture' | 'generating' | 'y10' | 'y20' | 'y30' | 'result' | 'frame' | 'save'
const YEARS: { step: Step; next: Step; cta: string; say: string }[] = [
  { step: 'y10', next: 'y20', cta: '20년 뒤로', say: '창밖을 봐요! 10년 뒤의 여러분이야!' },
  { step: 'y20', next: 'y30', cta: '30년 뒤로', say: '오호, 멋지게 나이 들었군!' },
  { step: 'y30', next: 'result', cta: '집으로 돌아가기', say: '우주에서 보는 지구라니! 30년 뒤의 여러분이야!' },
]
const COUNTDOWN_S = 5
/** 행사(ANSAN 40주년)에만 맞는 프레임은 뺀다 */
const FRAMES = STRIP_FRAMES.filter((f) => f.id !== 'anniversary-party')

/** 나중 박사 말풍선(무전) — 박사는 캡슐 밖에 있어 목소리로만 */
function Say({ children }: { children: ReactNode }) {
  return (
    <p className="lt-say" aria-live="polite">
      <span className="lt-say-who"><Radio size={16} aria-hidden="true" />나중 박사</span>
      <span className="lt-say-text">{children}</span>
    </p>
  )
}

/** 오른쪽 패널 — 말풍선 · 내용 · 아래 버튼 줄 */
function Panel({ say, children, actions, className }: { say?: ReactNode; children?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`lt-layout${className ? ` ${className}` : ''}`}>
      <section className="lt-panel">
        {say && <Say>{say}</Say>}
        <div className="lt-content">{children}</div>
        {actions && <div className="lt-actions">{actions}</div>}
      </section>
    </div>
  )
}

/** 시작 화면 — 창고의 나중 박사(영상) 옆에 워드마크 · 제목 · 시작 버튼 */
export function LaterStart({ program, onStart }: { program: ProgramDef; onStart: () => void }) {
  return (
    <Panel
      className="lt-start"
      say="드디어 완성했어! 타임캡슐이야! 한번 타 보겠나?"
      actions={<button type="button" className="pg-btn pg-btn--accent lt-go" onClick={onStart}><span>{program.startCta}</span><ArrowRight size={22} aria-hidden="true" /></button>}
    >
      <span className="lt-wordmark">{program.wordmark}</span>
      <h1 className="lt-headline">{program.headline.split('\n').map((l, i) => <span key={i}>{l}</span>)}</h1>
      <p className="lt-years" aria-hidden="true">{[STRIP_NOW_YEAR, ...STRIP_STEPS.map((s) => s.year)].map((y, i) => <b key={y} data-now={i === 0 || undefined}>{y}</b>)}</p>
    </Panel>
  )
}

export function LaterFlow({ ctx }: { ctx: FlowCtx }) {
  const [step, setStep] = useState<Step>('capture')
  const [shot, setShot] = useState<HTMLCanvasElement | null>(null)
  const [shotUrl, setShotUrl] = useState<string | null>(null)
  const [future, setFuture] = useState<(HTMLImageElement | null)[]>([])
  const [people, setPeople] = useState(0)
  const [notice, setNotice] = useState<RetakeNotice | null>(null)
  const [choiceId, setChoiceId] = useState('')
  const [order, setOrder] = useState<LaterOrder | null>(null)
  const [countChoices, setCountChoices] = useState<number[]>([STRIPS_PER_SHEET])
  const [count, setCount] = useState(STRIPS_PER_SHEET)
  const [autoCount, setAutoCount] = useState(false)
  const rendered = useRef(new Map<string, HTMLCanvasElement>())

  const { setStep: showStep, setDirty, report } = ctx
  useEffect(() => { showStep(step === 'capture' ? 1 : step === 'generating' || step.startsWith('y') ? 2 : 3) }, [step, showStep])
  useEffect(() => { setDirty(step !== 'capture' || !!shot) }, [step, shot, setDirty])
  useEffect(() => { report?.(step, null) }, [report, step])
  useEffect(() => { preloadFaceDetect() }, [])

  const take = (pic: HTMLCanvasElement | null) => { setShot(pic); setShotUrl(pic ? pic.toDataURL('image/jpeg', 0.85) : null) }
  const input: StripInput | null = shot ? { now: shot, future, sign: LATER_SIGN } : null

  return (
    <>
      {step === 'capture' && <CaptureStep ctx={ctx} shot={shot} shotUrl={shotUrl} notice={notice} onShot={(pic) => { setNotice(null); take(pic) }} onNext={() => setStep('generating')} />}
      {step === 'generating' && shot && (
        <Generate
          ctx={ctx} shot={shot}
          onDone={(images, headcount) => {
            setFuture(images); setPeople(headcount); rendered.current.clear()
            const autoOn = readStripAuto()
            setAutoCount(autoOn)
            const options = stripCountOptions(readStripMax(), autoOn, headcount)
            setCountChoices(options.choices); setCount(options.initial)
            setStep('y10'); ctx.onResult()
          }}
          onRetake={(next) => { setNotice(next); take(null); setStep('capture') }}
        />
      )}
      {YEARS.map((y, i) => step === y.step && (
        <Panel
          key={y.step} className="lt-year"
          say={future[i] ? y.say : '이 시대는 신호가 약하군… 아직 도착하는 중이야!'}
          actions={<button type="button" className="pg-btn pg-btn--accent lt-go" onClick={() => setStep(y.next)}><span>{y.cta}</span><ArrowRight size={22} aria-hidden="true" /></button>}
        >
          <figure className="lt-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {future[i] ? <img src={future[i]!.src} alt={`${STRIP_STEPS[i].year}년의 우리`} /> : <span className="lt-photo-empty">미래가 아직 도착하는 중이에요</span>}
            <figcaption><b>{STRIP_STEPS[i].year}</b>{STRIP_STEPS[i].label} · {STRIP_STEPS[i].place}</figcaption>
          </figure>
          <ol className="lt-dial" aria-label="시간 여행">
            {STRIP_STEPS.map((s, n) => <li key={s.year} data-state={n < i ? 'done' : n === i ? 'active' : 'todo'}>{s.year}</li>)}
          </ol>
        </Panel>
      ))}
      {step === 'result' && shotUrl && (
        <Panel
          className="lt-result" say="성공이야! 미래의 우리를 찍어 왔다고!"
          actions={<button type="button" className="pg-btn pg-btn--accent lt-go" onClick={() => setStep('frame')}><span>프레임 고르기</span><ArrowRight size={22} aria-hidden="true" /></button>}
        >
          <FourCuts now={shotUrl} future={future.map((img) => img?.src ?? null)} />
        </Panel>
      )}
      {step === 'frame' && input && (
        <FrameStep
          ctx={ctx} input={input} rendered={rendered} choiceId={choiceId} onChoice={setChoiceId}
          countChoices={countChoices} count={count} onCount={setCount} people={autoCount ? people : 0}
          onBack={() => setStep('result')} onPrint={(next) => { setOrder(next); setStep('save') }}
        />
      )}
      {step === 'save' && order && <SaveStep ctx={ctx} order={order} />}
    </>
  )
}

/** 네 컷 — 지금 · 10 · 20 · 30년 */
function FourCuts({ now, future }: { now: string; future: (string | null)[] }) {
  const cuts = [{ year: STRIP_NOW_YEAR, label: '지금', src: now as string | null }, ...STRIP_STEPS.map((s, i) => ({ year: s.year, label: s.label, src: future[i] ?? null }))]
  return (
    <div className="lt-four">
      {cuts.map((cut) => (
        <figure key={cut.year}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cut.src ? <img src={cut.src} alt={`${cut.year}년 ${cut.label}`} /> : <span className="lt-photo-empty">도착하는 중</span>}
          <figcaption><b>{cut.year}</b>{cut.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}

// ───────────────────────── 촬영(조종석) ─────────────────────────

function CaptureStep({ ctx, shot, shotUrl, notice, onShot, onNext }: {
  ctx: FlowCtx; shot: HTMLCanvasElement | null; shotUrl: string | null; notice: RetakeNotice | null
  onShot: (pic: HTMLCanvasElement | null) => void; onNext: () => void
}) {
  const camera = useCamera({ enabled: !shot })
  const [count, setCount] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [phone, setPhone] = useState(false)
  const [faceWarning, setFaceWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const { setBusy } = ctx
  useEffect(() => { setBusy(count !== null) }, [count, setBusy])

  /** 찍힌 얼굴 수 — 0명 · 너무 많음만 알린다(아기 · 옆얼굴은 검출기가 놓칠 수 있어 적게 잡힌 건 막지 않는다) */
  const checkFaces = async (pic: HTMLCanvasElement) => {
    const faces = await countFaces(pic)
    setFaceWarning(faces === 0 ? '얼굴이 잘 안 보이는군. 모두 가운데로 와서 다시 찍는 게 좋겠어!'
      : faces > STRIP_MAX_PEOPLE ? `얼굴이 ${faces}명 보이는군. ${STRIP_MAX_PEOPLE}명까지 탈 수 있어 — 뒤에 지나가는 분이면 그대로 가도 돼!` : null)
  }
  const shoot = useCallback(() => {
    if (count !== null || camera.state !== 'ready' || shot) return
    setError(null); setFaceWarning(null)
    setCount(COUNTDOWN_S)
    for (let i = 1; i <= COUNTDOWN_S; i++) timers.current.push(window.setTimeout(() => setCount(Math.max(0, COUNTDOWN_S - i)), i * 1000))
    timers.current.push(window.setTimeout(async () => {
      setFlash(true)
      timers.current.push(window.setTimeout(() => setFlash(false), 260))
      try {
        const pic = crop32(await camera.still())
        onShot(pic); void checkFaces(pic)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '촬영하지 못했어요.')
      } finally { setCount(null) }
    }, COUNTDOWN_S * 1000 + 50))
  }, [count, camera, shot, onShot])

  const phoneSheet = phone && (
    <PhoneSheet ctx={ctx} need={1} onClose={() => setPhone(false)} onPhotos={([pic]) => { setPhone(false); if (pic) { const c = crop32(pic); onShot(c); void checkFaces(c) } }} />
  )
  const consent = <p className="lt-consent"><b>아래 버튼을 누르면 동의한 것으로 봐요.</b> 사진 촬영 · AI 사진 만들기(만 14세 미만은 보호자 확인). 찍은 사진은 만들기에만 쓰고 완성 사진만 7일 보관해요.</p>

  if (camera.state === 'error' && !shot) {
    return (
      <Panel
        className="lt-capture" say="이런, 캡슐 카메라가 안 켜지는군!"
        actions={<>
          <button type="button" className="pg-btn pg-btn--line" onClick={() => setPhone(true)}><ImagePlus size={20} />휴대폰 사진</button>
          <button type="button" className="pg-btn pg-btn--accent lt-go" onClick={camera.retry}><RefreshCw size={20} />다시 연결하기</button>
        </>}
      >
        <div className="lt-cam lt-cam--off"><CameraOff size={72} aria-hidden="true" /><p>{camera.error ?? '카메라 연결을 확인해 주세요'}</p></div>
        {consent}
        {phoneSheet}
      </Panel>
    )
  }

  const say = shot ? '좋아! 빨간 레버를 당기면 출발이야!' : count !== null ? '자, 웃어요! 김~치!' : '잘 탔나? 출발 전에 지금 모습부터 남겨야지! 다 같이 웃어요!'
  return (
    <Panel
      className="lt-capture" say={say}
      actions={shot ? (
        <>
          <button type="button" className="pg-btn pg-btn--line" onClick={() => { setFaceWarning(null); onShot(null) }}><RotateCcw size={20} />다시 찍기</button>
          <button type="button" className="pg-btn pg-btn--accent lt-go lt-lever" onClick={onNext}><span>레버 당겨 출발!</span><ArrowRight size={22} aria-hidden="true" /></button>
        </>
      ) : (
        <>
          <button type="button" className="pg-btn pg-btn--line" onClick={() => setPhone(true)} disabled={count !== null}><ImagePlus size={20} />휴대폰 사진</button>
          <button type="button" className="pg-btn pg-btn--accent lt-go" onClick={shoot} disabled={count !== null || camera.state !== 'ready'}>
            <Camera size={24} /><span>{count !== null ? `${count || '찰칵'}…` : `동의하고 촬영 · ${COUNTDOWN_S}초`}</span>
          </button>
        </>
      )}
    >
      <div className="lt-cam" data-live={!shot || undefined}>
        {shotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shotUrl} alt="촬영한 사진" />
        ) : (
          <>
            <video ref={camera.videoRef} muted playsInline autoPlay className="pg-cam-video" hidden={camera.source === 'dslr'} />
            <canvas ref={camera.liveRef} className="pg-cam-video" hidden={camera.source !== 'dslr'} />
            <div className="pg-guide pg-guide--group" aria-hidden="true"><i /><i /></div>
            {camera.state === 'starting' && <p className="pg-cam-note">카메라를 켜는 중…</p>}
            {count !== null && count > 0 && <b className="lt-count" aria-live="assertive">{count}</b>}
          </>
        )}
        {flash && <div className="pg-flash" aria-hidden="true" />}
      </div>
      {notice && <div className="lt-warn" role="alert"><b><AlertTriangle size={18} aria-hidden="true" />{notice.title}</b>{notice.tip && <span>{notice.tip}</span>}</div>}
      {faceWarning && <p className="lt-warn" role="alert"><AlertTriangle size={18} aria-hidden="true" />{faceWarning}</p>}
      {error && <p className="lt-warn" role="alert">{error}</p>}
      {!shot && !notice && consent}
      {phoneSheet}
    </Panel>
  )
}

// ───────────────────────── 생성(시간 터널) ─────────────────────────

function Generate({ ctx, shot, onDone, onRetake }: {
  ctx: FlowCtx; shot: HTMLCanvasElement
  onDone: (images: (HTMLImageElement | null)[], people: number) => void
  onRetake: (notice: RetakeNotice | null) => void
}) {
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const elapsed = useElapsed(!error)
  const done = useRef({ onDone, onRetake })
  useEffect(() => { done.current = { onDone, onRetake } })

  useEffect(() => {
    const abort = new AbortController()
    ctx.setBusy(true)
    setError(null)
    ;(async () => {
      try {
        const { images, people } = await makeFuture(ctx, shot, abort.signal, setStage)
        if (!abort.signal.aborted) done.current.onDone(images, people)
      } catch (cause) {
        if (abort.signal.aborted) return
        const notice = (cause as { retake?: RetakeNotice }).retake
        if (notice) { done.current.onRetake(notice); return }
        setError(cause instanceof Error ? cause.message : 'AI 사진을 만들지 못했어요.')
      } finally { ctx.setBusy(false) }
    })()
    return () => { abort.abort(); ctx.setBusy(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  if (error) {
    return (
      <Panel
        className="lt-gen" say="어이쿠, 시간 터널이 흔들렸어! 다시 해 보세!"
        actions={<>
          <button type="button" className="pg-btn pg-btn--line" onClick={() => done.current.onRetake(null)}><Camera size={20} />다시 찍기</button>
          <button type="button" className="pg-btn pg-btn--accent lt-go" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={20} />다시 출발</button>
        </>}
      >
        <p className="lt-warn" role="alert">{error}</p>
      </Panel>
    )
  }
  // 연도 계기 — 30~40초 동안 2026 → 2056 으로 돈다(사진이 다 되면 다음 단계로 바로)
  const year = Math.min(STRIP_STEPS[2].year, STRIP_NOW_YEAR + Math.floor(elapsed * 0.85))
  const say = stage === 2 ? '거의 다 왔어! 착륙 준비!' : year < STRIP_STEPS[0].year ? '출발이다! 꽉 잡아요!' : year < STRIP_STEPS[1].year ? '10년 통과! 창밖에 미래가 보이나?' : year < STRIP_STEPS[2].year ? '20년 통과! 조금만 더!' : '30년! 미래의 여러분을 찍는 중이야!'
  return (
    <Panel className="lt-gen" say={say}>
      <div className="lt-meter" role="progressbar" aria-busy="true" aria-label="미래 사진 만드는 중">
        <b className="lt-meter-year">{year}</b>
        <span className="lt-meter-bar" aria-hidden="true"><i style={{ width: `${((year - STRIP_NOW_YEAR) / 30) * 100}%` }} /></span>
        <span className="lt-meter-marks" aria-hidden="true">{[STRIP_NOW_YEAR, ...STRIP_STEPS.map((s) => s.year)].map((y) => <i key={y} data-on={year >= y || undefined}>{y}</i>)}</span>
        <p><span>{String(elapsed).padStart(2, '0')}초</span> · 보통 30~40초</p>
      </div>
    </Panel>
  )
}

// ───────────────────────── 프레임 · 장수 ─────────────────────────

interface Choice { id: string; name: string; basic?: 0 | 1; frame?: StripFrameDef }
interface LaterOrder { strip: string; sheet: string; copies: number; count: number; render: (qr: StripQr) => Promise<HTMLCanvasElement> }

function FrameStep({ ctx, input, rendered, choiceId, onChoice, countChoices, count, onCount, people, onBack, onPrint }: {
  ctx: FlowCtx; input: StripInput; rendered: RefObject<Map<string, HTMLCanvasElement>>; choiceId: string; onChoice: (id: string) => void
  countChoices: number[]; count: number; onCount: (n: number) => void; people: number; onBack: () => void; onPrint: (order: LaterOrder) => void
}) {
  const { program } = ctx
  const [choices] = useState<Choice[]>(() => [
    { id: 'basic-white', name: program.designs[0], basic: 0 },
    { id: 'basic-ink', name: program.designs[1], basic: 1 },
    ...FRAMES.map((frame) => ({ id: frame.id, name: frame.name, frame })),
  ])
  const chosen = choices.find((c) => c.id === choiceId) ?? choices[0]
  const [photoLayer] = useState(() => framePhotoLayer(input))
  const [basicThumbs] = useState(() => [renderStrip(0, input), renderStrip(1, input)].map((strip, i) => {
    rendered.current.set(i === 0 ? 'basic-white' : 'basic-ink', strip)
    return stripThumb(strip)
  }))
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { for (const frame of FRAMES) new Image().src = frame.file }, [])
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let strip = rendered.current.get(chosen.id)
        if (!strip && chosen.frame) {
          strip = renderFrameStrip(chosen.frame, await loadImage(chosen.frame.file), input)
          rendered.current.set(chosen.id, strip)
        }
        if (!alive || !strip) return
        setPreview({ id: chosen.id, url: strip.toDataURL('image/jpeg', 0.93) }); setError(null)
      } catch {
        if (alive) setError('이 프레임을 불러오지 못했어요. 다른 프레임을 골라 주세요.')
      }
    })()
    return () => { alive = false }
    // input 은 이 화면이 떠 있는 동안 그대로다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen])

  const ready = preview?.id === chosen.id
  const print = () => {
    const strip = rendered.current.get(chosen.id)
    if (!ready || !preview || !strip) return
    const { frame, basic = 0 } = chosen
    const render = async (qr: StripQr) => (frame ? renderFrameStrip(frame, await loadImage(frame.file), input, qr) : renderStrip(basic, input, qr))
    onPrint({ strip: preview.url, sheet: stripSheet(strip), copies: stripSheets(count), count, render })
  }
  return (
    <Panel
      className="lt-frame" say="마음에 드는 프레임을 골라 봐요!"
      actions={<>
        <button type="button" className="pg-btn pg-btn--line" onClick={onBack}>네 컷 다시 보기</button>
        <button type="button" className="pg-btn pg-btn--accent lt-go" disabled={!ready} onClick={print}><Printer size={22} /><span>{count}장 인화하기</span></button>
      </>}
    >
      <div className="lt-frame-body">
        <div className="lt-strip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview.url} alt={`${chosen.name} 프레임 미리보기`} /> : <span className="pg-spin-box" aria-hidden="true" />}
        </div>
        <div className="lt-frame-side">
          <div className="lt-frame-grid" role="radiogroup" aria-label="프레임">
            {choices.map((choice) => (
              <button key={choice.id} type="button" role="radio" aria-checked={chosen.id === choice.id} aria-label={choice.name} onClick={() => onChoice(choice.id)}>
                {/* eslint-disable @next/next/no-img-element */}
                {choice.frame
                  ? <span className="lt-thumb" style={{ backgroundImage: `url(${photoLayer})` }}><img src={choice.frame.thumb} alt="" width={240} height={720} /></span>
                  : <span className="lt-thumb"><img src={basicThumbs[choice.basic ?? 0]} alt="" width={240} height={720} /></span>}
                {/* eslint-enable @next/next/no-img-element */}
                {chosen.id === choice.id && <i aria-hidden="true"><Check size={13} strokeWidth={3} /></i>}
              </button>
            ))}
          </div>
          {countChoices.length > 1 && (
            <div className="lt-count-pick" role="radiogroup" aria-label={people > 0 ? `인화 장수 — 찍힌 ${people}명에 맞춰` : '인화 장수'}>
              {countChoices.map((n) => <button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => onCount(n)}>{n}장</button>)}
            </div>
          )}
          {error && <p className="lt-warn" role="alert">{error}</p>}
        </div>
      </div>
    </Panel>
  )
}

// ───────────────────────── 인화 · 저장 ─────────────────────────

/** 인쇄본에 넣을 폰 저장 주소를 기다리는 최대 시간 — 넘으면 QR 없이 인쇄한다(StripFlow 와 같게) */
const PRINT_QR_WAIT_MS = 15_000

function SaveStep({ ctx, order }: { ctx: FlowCtx; order: LaterOrder }) {
  const { markShot, setDirty } = ctx
  const { strip, sheet: plainSheet, copies, count, render } = order
  const make = useCallback(async () => savePhoto(await ctx.getTicket(), strip), [ctx, strip])
  const saved = useSavedLink(make, true)
  const [printed, setPrinted] = useState<{ strip: string; sheet: string } | null>(null)
  const decided = useRef(false)
  const link = saved.link
  const failed = !!saved.error
  useEffect(() => {
    if (decided.current) return
    const plain = () => { decided.current = true; setPrinted({ strip, sheet: plainSheet }) }
    if (failed) { plain(); return }
    if (link) {
      decided.current = true
      render(makeStripQr(link.url))
        .then((canvas) => setPrinted({ strip: canvas.toDataURL('image/jpeg', 0.93), sheet: stripSheet(canvas) }))
        .catch((error) => { console.error('[later] 인화물 QR 넣기 실패:', error); setPrinted({ strip, sheet: plainSheet }) })
      return
    }
    const timer = window.setTimeout(plain, PRINT_QR_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [link, failed, render, strip, plainSheet])
  const printer = usePrint(printed?.sheet ?? null, () => markShot({ printed: true }), { cut: '2inch', copies })
  const sent = useRef(false)
  const { print } = printer
  useEffect(() => {
    if (sent.current || !printed) return
    sent.current = true
    void print()
  }, [print, printed])
  useEffect(() => { if (saved.link) { markShot({ downloaded: true }); setDirty(false) } }, [saved.link, markShot, setDirty])
  return (
    <Panel
      className="lt-save" say="하나는 손님 거, 하나는 같이 온 분 거! 또 오게, 30년 뒤에 보세!"
      actions={<button type="button" className="pg-btn pg-btn--accent lt-go" onClick={ctx.requestHome}><Home size={20} /><span>완료 · 처음으로</span></button>}
    >
      <div className="lt-save-body">
        <div className="lt-strip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={printed?.strip ?? strip} alt="인화될 사진" />
        </div>
        <div className="lt-save-cards">
          <PrintCard printer={printer} label={`사진 ${count}장 인쇄`} note="2×6 사진 · 함께 온 분과 나눠 가져요" preparing={!printed} />
          <QrCard state={saved} />
        </div>
      </div>
      <div className="pg-print-area" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={printed?.sheet ?? plainSheet} alt="" />
      </div>
    </Panel>
  )
}
