'use client'

// ANSAN 타임캡슐 흐름(2026 안산사이언스밸리 과학축제 AI 포토존) — 직원 없이 손님 혼자 끝까지:
// 촬영(가로 3:2, 혼자~4명, 동의 · 5초) → 확인 → AI 미래 세 장(/api/photobooth/timecapsule) → 네 컷 보기 → 프레임·장수 고르기 → 인화(자동) · QR.
// 장면 옵션은 없다(컷마다 장면이 정해져 있다). 못 만든 칸은 한 번 저절로 다시 부탁하고, 그래도 없으면 '도착하는 중' 칸으로 인화한다.
// 화면은 축제 공식 웹사이트 디자인(WHITEPRINT — AsvParts.tsx · asv.css). 프레임은 기본 디자인 2종(ASV 화이트·블랙) + 프레임 10종(strip-frames.ts). 장수는 2장 단위, 최대·자동 인화수는 관리자 창(strip-count.ts).
// 인쇄 원판은 4×6 에 같은 사진 둘(프린터 2인치 자르기). 폰 저장은 사진 한 장(strip-print.ts).
// 인쇄본 오른쪽 아래에는 폰 저장 QR — QR 없는 사진을 먼저 올려 주소를 받고 그 QR 을 넣어 다시 그려 인쇄한다(SaveStep).

import { AlertTriangle, ArrowLeft, Camera, CameraOff, Check, ImagePlus, Printer, RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { countFaces, preloadFaceDetect } from '@/lib/booth/face-detect'
import { STRIP_FRAMES, type StripFrameDef } from '@/lib/booth/programs/strip-frames'
import { ASV_FESTIVAL, STRIP_MAX_PEOPLE, STRIP_NOW_YEAR, STRIP_STEPS, stripRetakeCopy, type StripResponse, type StripRetake, type StripYears } from '@/lib/booth/programs/timecapsule-strip'
import { useCamera } from './use-camera'
import { toRequestJpeg, type FlowCtx } from './flow'
import { loadCanvasFonts } from './fonts'
import { PhoneSheet } from './PhotoFlow'
import { savePhoto } from './save'
import { PrintCard, QrCard, usePrint, useSavedLink } from './SavePanel'
import { framePhotoLayer, makeStripQr, renderFrameStrip, renderStrip, stripSheet, stripThumb, type StripInput, type StripQr } from './strip-print'
import { STRIPS_PER_SHEET, readStripAuto, readStripMax, stripCountOptions, stripSheets } from './strip-count'
import { Split, useElapsed } from './ui'
import { AsvHead, AsvNote, RegMarks } from './AsvParts'
import { loadImage } from './video'

type Step = 'capture' | 'generating' | 'result' | 'frame' | 'save'
const COUNTDOWN_S = 5

/** 찍은 사진을 화면과 같은 가로 3:2 로(가운데) — 미리보기 칸이 3:2 cover 라 손님이 본 그대로 */
function crop32(src: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement {
  const w = src instanceof HTMLImageElement ? src.naturalWidth : src.width
  const h = src instanceof HTMLImageElement ? src.naturalHeight : src.height
  const cw = Math.min(w, h * 1.5), ch = cw / 1.5
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cw); canvas.height = Math.round(ch)
  canvas.getContext('2d')!.drawImage(src, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** 고를 수 있는 사진 — 기본 디자인(basic) 또는 프레임(frame) */
interface StripChoice { id: string; name: string; basic?: 0 | 1; frame?: StripFrameDef }
/** 다시 찍기 안내 — 무엇이 문제인지(title)와 어떻게 찍으면 되는지(tip) */
interface RetakeNotice { title: string; tip?: string }

/** 인화로 넘기는 것 — strip · sheet 는 QR 없는 사진(폰 저장 · QR 을 못 넣었을 때 인쇄), render 는 같은 디자인에 QR 을 넣어 다시 그린다 */
interface StripOrder { strip: string; sheet: string; copies: number; count: number; render: (qr: StripQr) => Promise<HTMLCanvasElement> }

export function StripFlow({ ctx }: { ctx: FlowCtx }) {
  const [step, setStep] = useState<Step>('capture')
  const [shot, setShot] = useState<HTMLCanvasElement | null>(null)
  const [shotUrl, setShotUrl] = useState<string | null>(null)
  const [future, setFuture] = useState<(HTMLImageElement | null)[]>([])
  const [people, setPeople] = useState(0)
  const [choiceId, setChoiceId] = useState('')
  const [order, setOrder] = useState<StripOrder | null>(null)
  const [notice, setNotice] = useState<RetakeNotice | null>(null)
  // 인화 장수 — 2장 단위, 최대·자동 인화수는 이 부스 관리자 설정(strip-count.ts). 인원수를 알고 나서 정한다
  const [countChoices, setCountChoices] = useState<number[]>([STRIPS_PER_SHEET])
  const [count, setCount] = useState(STRIPS_PER_SHEET)
  const [autoCount, setAutoCount] = useState(false)
  /** 이번 손님의 사진 캔버스 — 프레임을 다시 고를 때 또 그리지 않게 */
  const rendered = useRef(new Map<string, HTMLCanvasElement>())

  const { setStep: showStep, setDirty } = ctx
  useEffect(() => { showStep(step === 'capture' ? 1 : step === 'generating' ? 2 : 3) }, [step, showStep])
  useEffect(() => { setDirty(step !== 'capture' || !!shot) }, [step, shot, setDirty])
  useEffect(() => { preloadFaceDetect() }, [])

  const take = (pic: HTMLCanvasElement | null) => {
    setShot(pic); setShotUrl(pic ? pic.toDataURL('image/jpeg', 0.85) : null)
  }

  return (
    <>
      {step === 'capture' && (
        <CaptureStep ctx={ctx} shot={shot} shotUrl={shotUrl} notice={notice} onShot={(pic) => { setNotice(null); take(pic) }} onNext={() => setStep('generating')} />
      )}
      {step === 'generating' && shot && shotUrl && (
        <Generate
          ctx={ctx} shot={shot} shotUrl={shotUrl}
          onDone={(images, headcount) => {
            setFuture(images); setPeople(headcount); rendered.current.clear()
            const autoOn = readStripAuto()
            setAutoCount(autoOn)
            const options = stripCountOptions(readStripMax(), autoOn, headcount)
            setCountChoices(options.choices); setCount(options.initial)
            setStep('result'); ctx.onResult()
          }}
          onRetake={(next) => { setNotice(next); take(null); setStep('capture') }}
        />
      )}
      {step === 'result' && shotUrl && (
        <Split className="pg-strip-result" visual={<FourCuts now={shotUrl} future={future.map((img) => img?.src ?? null)} />}>
          <AsvHead index={3} label="Result" title={ctx.program.result.title} sub={ctx.program.result.sub} />
          <dl className="asv-readout">
            <div><dt>Persons</dt><dd>{people > 0 ? people : '–'}</dd></div>
            <div><dt>Cuts</dt><dd>{1 + future.filter(Boolean).length}<small>/4</small></dd></div>
            <div><dt>Span</dt><dd>30<small>yrs</small></dd></div>
          </dl>
          {future.some((img) => !img) && <p className="pg-warn" role="status"><AlertTriangle size={18} aria-hidden="true" />한 장면은 만들지 못해 &lsquo;도착하는 중&rsquo; 칸으로 인화돼요.</p>}
          {ctx.program.creative && <AsvNote>{ctx.program.creative}</AsvNote>}
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide pg-btn--hero" onClick={() => setStep('frame')}><span>프레임 고르기</span><span aria-hidden="true">→</span></button>
        </Split>
      )}
      {step === 'frame' && shot && (
        <FrameStep
          ctx={ctx} input={{ now: shot, future }} rendered={rendered}
          choiceId={choiceId} onChoice={setChoiceId}
          countChoices={countChoices} count={count} onCount={setCount} people={autoCount ? people : 0}
          onBack={() => setStep('result')}
          onPrint={(next) => { setOrder(next); setStep('save') }}
        />
      )}
      {step === 'save' && order && <SaveStep ctx={ctx} order={order} />}
    </>
  )
}

/** 네 컷 크게 — 지금 · 10 · 20 · 30년 후 */
function FourCuts({ now, future, pending, empty = '도착하는 중' }: { now: string; future: (string | null)[]; pending?: boolean; empty?: string }) {
  const cuts = [{ year: STRIP_NOW_YEAR, label: '지금', src: now as string | null }, ...STRIP_STEPS.map((s, i) => ({ year: s.year, label: s.label, src: future[i] ?? null }))]
  return (
    <div className="pg-four">
      {cuts.map((cut, i) => (
        <figure key={cut.year} className="pg-four-cut" data-pending={(pending && i > 0) || undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cut.src ? <img src={cut.src} alt={`${cut.year}년 ${cut.label}`} /> : (
            <span className="pg-four-empty">
              {pending ? <><span className="asv-scanline" aria-hidden="true" /><span className="asv-mono">Rendering · {cut.year}</span></> : empty}
            </span>
          )}
          <span className="asv-cut-idx asv-mono" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <figcaption><b>{cut.year}</b>{cut.label}</figcaption>
        </figure>
      ))}
      <RegMarks />
    </div>
  )
}

// ───────────────────────── 프레임 · 장수 ─────────────────────────

function FrameStep({ ctx, input, rendered, choiceId, onChoice, countChoices, count, onCount, people, onBack, onPrint }: {
  ctx: FlowCtx
  input: StripInput
  rendered: RefObject<Map<string, HTMLCanvasElement>>
  choiceId: string
  onChoice: (id: string) => void
  countChoices: number[]
  count: number
  onCount: (n: number) => void
  /** 자동 인화수가 켜져 있으면 찍힌 인원수, 아니면 0 */
  people: number
  onBack: () => void
  onPrint: (order: StripOrder) => void
}) {
  const { program } = ctx
  const [choices] = useState<StripChoice[]>(() => [
    { id: 'asv-white', name: program.designs[0], basic: 0 },
    { id: 'asv-ink', name: program.designs[1], basic: 1 },
    ...STRIP_FRAMES.map((frame) => ({ id: frame.id, name: frame.name, frame })),
  ])
  const chosen = choices.find((c) => c.id === choiceId) ?? choices[0]
  // 고르는 칸의 그림 — 프레임은 투명 작은 그림 뒤에 내 사진을 깔고, 기본 디자인은 작게 줄여 쓴다
  const [photoLayer] = useState(() => framePhotoLayer(input))
  const [basicThumbs] = useState(() => [renderStrip(0, input), renderStrip(1, input)].map((strip, i) => {
    rendered.current.set(i === 0 ? 'asv-white' : 'asv-ink', strip)
    return stripThumb(strip)
  }))
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 프레임 그림을 미리 받아 둔다 — 눌렀을 때 바로 그려지게(행사장 인터넷이 약하다)
  useEffect(() => { for (const frame of STRIP_FRAMES) new Image().src = frame.file }, [])

  // 고른 것을 그린다 — 그린 것은 이번 손님 동안 기억한다
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
        setPreview({ id: chosen.id, url: strip.toDataURL('image/jpeg', 0.93) })
        setError(null)
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
    <Split
      className="pg-strip-frame"
      visual={(
        <div className="pg-frame-layout">
          {preview ? <StripPreview src={preview.url} /> : <div className="pg-strip-preview pg-strip-preview--wait"><span className="pg-spin-box" aria-hidden="true" /></div>}
          <div className="pg-frame-grid" role="radiogroup" aria-label="프레임">
            {choices.map((choice, n) => (
              <button key={choice.id} type="button" role="radio" aria-checked={chosen.id === choice.id} aria-label={choice.name} className="pg-frame-tile" onClick={() => onChoice(choice.id)}>
                <span className="asv-tile-idx asv-mono" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
                {/* eslint-disable @next/next/no-img-element */}
                {choice.frame
                  ? <span className="pg-frame-thumb" style={{ backgroundImage: `url(${photoLayer})` }}><img src={choice.frame.thumb} alt="" width={240} height={720} /></span>
                  : <span className="pg-frame-thumb"><img src={basicThumbs[choice.basic ?? 0]} alt="" width={240} height={720} /></span>}
                {/* eslint-enable @next/next/no-img-element */}
                {chosen.id === choice.id && <i aria-hidden="true"><Check size={14} strokeWidth={3} /></i>}
              </button>
            ))}
          </div>
        </div>
      )}
    >
      <AsvHead index={3} label="Frame" title="프레임을 골라 주세요" sub={<>지금 고른 프레임 <b className="asv-chosen">{chosen.name}</b></>} />
      {error && <p className="pg-error-text" role="alert">{error}</p>}
      {countChoices.length > 1 && (
        <fieldset className="pg-strip-count">
          <legend>인화 장수{people > 0 && <small>찍힌 {people}명에 맞춰</small>}</legend>
          <div role="radiogroup" aria-label="인화 장수">
            {countChoices.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => onCount(n)}>{n}장</button>
            ))}
          </div>
        </fieldset>
      )}
      <AsvNote label="Print">인화지 한 장에서 같은 사진 2장이 나와요. 함께 온 분과 나눠 가져요.</AsvNote>
      <button type="button" className="pg-btn pg-btn--line pg-btn--wide pg-strip-back" onClick={onBack}><ArrowLeft size={20} />네 컷 다시 보기</button>
      <button type="button" className="pg-btn pg-btn--accent pg-btn--wide pg-btn--hero" disabled={!ready} onClick={print}><Printer size={26} /><span>사진 {count}장 인화하기</span><span aria-hidden="true">→</span></button>
    </Split>
  )
}

// ───────────────────────── 촬영 ─────────────────────────

/** 동의 안내 — 체크박스 없이 늘 보이고, 아래 버튼을 누르면 동의한 것으로 */
function ConsentNote() {
  return (
    <p className="pg-consent pg-consent--note">
      <i className="asv-mono">Consent</i>
      <span><b>아래 버튼을 누르면 동의한 것으로 봐요.</b> 사진 촬영과 AI 사진 만들기 · 만 14세 미만 어린이는 보호자가 함께 확인해 주세요. 찍은 사진은 만들기에만 쓰고, 완성된 사진만 7일 보관해요.</span>
    </p>
  )
}

function CaptureStep({ ctx, shot, shotUrl, notice, onShot, onNext }: {
  ctx: FlowCtx
  shot: HTMLCanvasElement | null
  shotUrl: string | null
  notice: RetakeNotice | null
  onShot: (pic: HTMLCanvasElement | null) => void
  onNext: () => void
}) {
  const { program } = ctx
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

  /** 찍힌 얼굴 수 확인 — 0명·너무 많음만 알려 준다(아기·옆얼굴은 검출기가 놓칠 수 있어 적게 잡힌 건 막지 않는다) */
  const checkFaces = async (pic: HTMLCanvasElement) => {
    const faces = await countFaces(pic)
    setFaceWarning(faces === 0 ? '얼굴이 잘 보이지 않아요. 모두 화면 가운데로 와서 다시 찍는 걸 권해요.'
      : faces > STRIP_MAX_PEOPLE ? `얼굴이 ${faces}명 보여요. ${STRIP_MAX_PEOPLE}명까지 함께 찍을 수 있어요 — 뒤에 지나가는 분이 찍혔다면 그대로 진행해도 돼요.`
        : null)
  }

  // 동의는 체크박스 대신 [동의하고 촬영하기] 버튼 한 번으로(2026-11-04 현장 요청 — 직원 없이 한 번에) — 문구는 버튼 바로 위에 늘 보인다
  const shoot = useCallback(() => {
    if (count !== null || camera.state !== 'ready' || shot) return
    setError(null); setFaceWarning(null)
    setCount(COUNTDOWN_S)
    for (let i = 1; i <= COUNTDOWN_S; i++) {
      timers.current.push(window.setTimeout(() => setCount(COUNTDOWN_S - i > 0 ? COUNTDOWN_S - i : 0), i * 1000))
    }
    timers.current.push(window.setTimeout(async () => {
      setFlash(true)
      timers.current.push(window.setTimeout(() => setFlash(false), 260))
      try {
        const pic = crop32(await camera.still())
        onShot(pic)
        void checkFaces(pic)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '촬영하지 못했어요.')
      } finally {
        setCount(null)
      }
    }, COUNTDOWN_S * 1000 + 50))
  }, [count, camera, shot, onShot])

  const retake = () => { setFaceWarning(null); onShot(null) }

  const phoneSheet = phone && (
    <PhoneSheet ctx={ctx} need={1} onClose={() => setPhone(false)} onPhotos={([pic]) => { setPhone(false); if (pic) { const c = crop32(pic); onShot(c); void checkFaces(c) } }} />
  )

  if (camera.state === 'error' && !shot) {
    return (
      <Split className="pg-capture-step" visual={<div className="pg-cam pg-cam--off pg-cam--wide"><CameraOff size={96} aria-hidden="true" /><p>카메라가 연결되지 않았어요</p></div>}>
        <AsvHead index={1} label="Camera" title="카메라가 연결되지 않았어요" sub={camera.error ?? '연결을 확인한 뒤 다시 시도해 주세요'} />
        <div className="pg-stack">
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={camera.retry}><RefreshCw size={20} />다시 연결하기</button>
          <ConsentNote />
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={() => setPhone(true)}><ImagePlus size={20} />동의하고 휴대폰 사진 가져오기</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={ctx.home}>처음으로</button>
        </div>
        {phoneSheet}
      </Split>
    )
  }

  const visual = (
    <div className="pg-strip-capture">
      <div className="pg-cam pg-cam--wide" data-live={!shot || undefined}>
        {shotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shotUrl} alt="촬영한 사진" />
        ) : (
          <>
            <video ref={camera.videoRef} muted playsInline autoPlay className="pg-cam-video" hidden={camera.source === 'dslr'} />
            <canvas ref={camera.liveRef} className="pg-cam-video" hidden={camera.source !== 'dslr'} />
            <div className="pg-guide pg-guide--group" aria-hidden="true"><i /><i /></div>
            <span className="asv-cross" aria-hidden="true" />
            {camera.state === 'starting' && <p className="pg-cam-note">카메라를 켜는 중…</p>}
            {camera.state === 'ready' && count === null && <p className="pg-cam-ready"><i />모두 모서리 표시 안으로 · 아기는 안고 찍어도 돼요</p>}
            {count !== null && count > 0 && <b className="pg-count" aria-live="assertive">{count}</b>}
          </>
        )}
        <span className="asv-cam-hud asv-mono" aria-hidden="true"><span>{shot ? 'Still · 3:2' : 'Cam 01 · Live'}</span><span>1–4 Persons</span></span>
        {flash && <div className="pg-flash" aria-hidden="true" />}
        <RegMarks />
      </div>
    </div>
  )

  return (
    <Split className="pg-capture-step" visual={visual}>
      <AsvHead index={1} label={shot ? 'Check' : 'Capture'} title={shot ? '사진을 확인해 주세요' : program.capture.title} sub={shot ? '모두 잘 나왔으면 미래로 떠나요' : program.capture.hint} />
      {notice && (
        <div className="pg-retake" role="alert">
          <b><AlertTriangle size={22} aria-hidden="true" />{notice.title}</b>
          {notice.tip && <p>{notice.tip}</p>}
        </div>
      )}
      {faceWarning && <p className="pg-warn" role="alert"><AlertTriangle size={18} aria-hidden="true" />{faceWarning}</p>}
      {error && <p className="pg-error-text" role="alert">{error}</p>}
      {!shot ? (
        <>
          <ConsentNote />
          <button type="button" className="pg-btn pg-btn--accent pg-btn--shoot" onClick={shoot} disabled={count !== null || camera.state !== 'ready'}>
            <Camera size={30} /><span>{count !== null ? `${count || '찰칵'}…` : `동의하고 촬영하기 · ${COUNTDOWN_S}초`}</span>
          </button>
        </>
      ) : (
        <div className="pg-actions pg-strip-confirm-actions">
          <button type="button" className="pg-btn pg-btn--line" onClick={retake}><RotateCcw size={20} />다시 찍기</button>
          <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={onNext}><Sparkles size={20} /><span>이 사진으로 미래 만들기</span></button>
        </div>
      )}
      {phoneSheet}
    </Split>
  )
}

// ───────────────────────── 생성 ─────────────────────────

/** '로/으로' — 받침 없거나 ㄹ 받침이면 '로' */
const ro = (word: string) => { const jong = (word.charCodeAt(word.length - 1) - 0xac00) % 28; return jong === 0 || jong === 8 ? '로' : '으로' }
/** 기다리는 동안 바뀌는 한 줄 — 컷마다 가는 곳 */
const TRAVEL = STRIP_STEPS.map((s) => `${s.label} ${s.place}${ro(s.place)} 가는 중…`)

function Generate({ ctx, shot, shotUrl, onDone, onRetake }: {
  ctx: FlowCtx
  shot: HTMLCanvasElement
  shotUrl: string
  onDone: (images: (HTMLImageElement | null)[], people: number) => void
  /** 다시 촬영으로 — 안내 없이(손님이 직접 [다시 찍기])는 null */
  onRetake: (notice: RetakeNotice | null) => void
}) {
  const { program } = ctx
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const elapsed = useElapsed(!error)
  const done = useRef({ onDone, onRetake })
  done.current = { onDone, onRetake }

  useEffect(() => {
    const abort = new AbortController()
    ctx.setBusy(true)
    setError(null); setStage(0)
    const ask = async (years: StripYears[], photo: string): Promise<StripResponse> => {
      const ticket = await ctx.getTicket()
      const res = await fetch('/api/photobooth/timecapsule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
        body: JSON.stringify({ ticket, photo, years }),
      })
      const data = await res.json().catch(() => ({}))
      // 다시 촬영 — 서버가 보낸 이유로 무엇이 문제고 어떻게 찍으면 되는지(이유가 없으면 서버 문장 그대로)
      if (res.status === 422) {
        const reason = (data as { retake?: StripRetake }).retake
        const notice: RetakeNotice = reason?.reason ? stripRetakeCopy(reason) : { title: data.error || '다시 찍어 주세요.' }
        throw Object.assign(new Error(notice.title), { retake: notice })
      }
      if (!res.ok || !Array.isArray(data.images)) throw new Error(data.error || `AI 사진을 만들지 못했어요 (${res.status}).`)
      return data as StripResponse
    }
    ;(async () => {
      try {
        const photo = toRequestJpeg(shot, 2048)
        const stageTimer = window.setTimeout(() => setStage(1), 4500)
        const first = await ask(STRIP_STEPS.map((s) => s.years), photo)
        window.clearTimeout(stageTimer)
        const byYears = new Map(first.images.map((i) => [i.years, i.image]))
        // 못 만든 칸만 한 번 더(같은 표의 두 번째) — 이것도 안 되면 '도착하는 중' 칸으로
        const missing = STRIP_STEPS.map((s) => s.years).filter((y) => !byYears.get(y))
        if (missing.length) {
          setStage(1)
          const again = await ask(missing, photo).catch(() => null)
          again?.images.forEach((i) => { if (i.image) byYears.set(i.years, i.image) })
        }
        setStage(2)
        const [images] = await Promise.all([
          Promise.all(STRIP_STEPS.map((s) => { const src = byYears.get(s.years); return src ? loadImage(src) : Promise.resolve(null) })),
          loadCanvasFonts(),
        ])
        // 찍힌 인원수 — 서버 사람 읽기(아기까지 센다), 실패하면 브라우저 얼굴 검출(자동 인화수용)
        const people = first.people > 0 ? first.people : Math.max(0, Math.min(await countFaces(shot), STRIP_MAX_PEOPLE))
        if (!abort.signal.aborted) done.current.onDone(images, people)
      } catch (cause) {
        if (abort.signal.aborted) return
        const notice = (cause as { retake?: RetakeNotice }).retake
        if (notice) { done.current.onRetake(notice); return }
        setError(cause instanceof Error ? cause.message : 'AI 사진을 만들지 못했어요.')
      } finally {
        ctx.setBusy(false)
      }
    })()
    return () => { abort.abort(); ctx.setBusy(false) }
    // 다시 만들기(attempt)마다 새로
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  if (error) {
    return (
      <Split className="pg-generating pg-generating--error" visual={<FourCuts now={shotUrl} future={[]} empty="?" />}>
        <AsvHead index={2} label="Error" title="잠시 문제가 생겼어요" sub="찍은 사진은 그대로예요" />
        <p className="pg-error-text" role="alert">{error}</p>
        <div className="pg-stack">
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={20} />다시 만들기</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={() => done.current.onRetake(null)}><Camera size={20} />다시 찍기</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={ctx.home}>처음으로</button>
        </div>
      </Split>
    )
  }

  return (
    <Split className="pg-generating" visual={<FourCuts now={shotUrl} future={[]} pending />}>
      <AsvHead index={2} label="AI Render" title={program.generating.title} sub={program.generating.sub} />
      <div className="asv-meter" role="progressbar" aria-busy="true" aria-label="AI 사진 만드는 중">
        <p className="asv-mono"><span>Elapsed</span><b>{String(elapsed).padStart(3, '0')}</b><span>sec</span><em>보통 30~40초</em></p>
        <span className="asv-meter-bar" aria-hidden="true"><i /></span>
      </div>
      <ol className="asv-stages">
        {program.generating.stages.map((label, i) => (
          <li key={label} data-state={i < stage ? 'done' : i === stage ? 'active' : 'todo'}>
            <i className="asv-mono">{String(i + 1).padStart(2, '0')}</i><span>{label}</span>
            <b className="asv-mono">{i < stage ? 'Done' : i === stage ? 'Run' : 'Wait'}</b>
          </li>
        ))}
      </ol>
      <p className="pg-travel asv-mono" aria-live="polite">{stage === 2 ? '사진을 꾸미는 중…' : TRAVEL[Math.floor(elapsed / 5) % TRAVEL.length]}</p>
      {program.creative && <AsvNote>{program.creative}</AsvNote>}
    </Split>
  )
}

// ───────────────────────── 인화 · 저장 ─────────────────────────

function StripPreview({ src }: { src: string }) {
  return (
    <div className="pg-strip-preview">
      <span className="asv-strip-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="인화될 사진" width={200} height={600} />
        <span className="asv-dim-v" aria-hidden="true"><i>6 in</i></span>
      </span>
    </div>
  )
}

/** 인쇄본에 넣을 폰 저장 주소를 기다리는 최대 시간 — 넘으면 QR 없이 인쇄한다(화면 QR 은 올라가는 대로 뜬다) */
const PRINT_QR_WAIT_MS = 15_000

function SaveStep({ ctx, order }: { ctx: FlowCtx; order: StripOrder }) {
  const { program, markShot, setDirty } = ctx
  const { strip, sheet: plainSheet, copies, count, render } = order
  const make = useCallback(async () => savePhoto(await ctx.getTicket(), strip), [ctx, strip])
  const saved = useSavedLink(make, true)
  // 인쇄본 — QR 없는 사진을 올려 받은 주소로 QR 을 만들어 같은 디자인에 넣는다. 올리기가 실패하거나 늦으면 QR 없이(손님을 오래 세우지 않게).
  // 한 번 정하면 바꾸지 않는다(QR 다시 받기로 주소가 바뀌어도 이미 인쇄한 것과 같게)
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
        .catch((error) => { console.error('[timecapsule] 인화물 QR 넣기 실패:', error); setPrinted({ strip, sheet: plainSheet }) })
      return
    }
    const timer = window.setTimeout(plain, PRINT_QR_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [link, failed, render, strip, plainSheet])
  // 4×6 한 장 = 같은 사진 2장(프린터 2인치 자르기)
  const printer = usePrint(printed?.sheet ?? null, () => markShot({ printed: true }), { cut: '2inch', copies })
  // [사진 인화하기]를 눌러 왔으니 인쇄본이 준비되는 대로 바로 보낸다 — 한 번만(개발 모드의 effect 두 번 실행에도)
  const sent = useRef(false)
  const { print } = printer
  useEffect(() => {
    if (sent.current || !printed) return
    sent.current = true
    void print()
  }, [print, printed])
  useEffect(() => { if (saved.link) { markShot({ downloaded: true }); setDirty(false) } }, [saved.link, markShot, setDirty])
  return (
    <Split className="pg-save pg-strip-save" visual={<StripPreview src={printed?.strip ?? strip} />}>
      <AsvHead index={3} label="Print · Save" title={program.save.title} sub={program.save.sub} />
      <div className="pg-save-cards">
        <PrintCard printer={printer} label={`사진 ${count}장 인쇄`} note="2×6 사진 · 함께 온 분과 나눠 가져요" preparing={!printed} />
        <QrCard state={saved} />
      </div>
      <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={ctx.requestHome}><span>완료 · 처음으로</span><span aria-hidden="true">→</span></button>
      <p className="asv-sign asv-mono">{ASV_FESTIVAL.name}<span>{ASV_FESTIVAL.dates} · {ASV_FESTIVAL.venue}</span></p>
      <div className="pg-print-area" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={printed?.sheet ?? plainSheet} alt="" />
      </div>
    </Split>
  )
}
