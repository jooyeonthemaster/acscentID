'use client'

// CHEESE! 스튜디오(catalog 'cheese', kind 'studio') — 일반 포토부스를 영상판으로(2026-11-25). AI 없이 찍은 네 컷을 4×6 세로 2×2 로 인화한다.
// 화면 뒤에는 늘 영상(video-stage.tsx CHEESE): 포토그래퍼 「온유」의 현대 사진 스튜디오
//   입구 라운지(시작) → 카메라 뒤(네 컷 촬영, 컷마다 카운트다운) → 모니터석(프레임 8종 고르기 · 인화 장수) → 인화 데스크(인화 · 폰 저장 QR) → 봉투를 건네고 배웅, 다시 라운지.
// 온유의 말은 화면 왼쪽 아래 자막 한 줄(존댓말). 오른쪽 패널은 영상이 그 장면에 도착한 뒤(data-arrived) 떠오른다(cheese.css).
// 인화물 · 프레임은 cheese-print.ts. 저장 · 인쇄는 LATER! 와 같은 순서(폰 저장 주소를 받으면 QR 을 넣어 다시 그려 인쇄, 15초 안에 못 받으면 QR 없이).

import { ArrowRight, Camera, CameraOff, Check, Home, ImagePlus, Printer, RefreshCw, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ProgramDef } from '@/lib/booth/programs/catalog'
import { CHEESE_FRAMES, cheeseThumb, crop34, renderCheese, type CheeseFrame } from './cheese-print'
import { loadCanvasFonts } from './fonts'
import { useCamera } from './use-camera'
import type { FlowCtx } from './flow'
import { PhoneSheet } from './PhotoFlow'
import { savePhoto } from './save'
import { PrintCard, QrCard, usePrint, useSavedLink } from './SavePanel'
import { makeStripQr, type StripQr } from './strip-print'
import './cheese.css'

type Step = 'shoot' | 'frame' | 'save'
const SHOTS = 4
/** 컷마다 카운트다운 3초(2026-11-25 사용자 지시) */
const COUNT_S = 3
/** 찍힌 컷을 잠깐 보여 주는 시간 */
const HOLD_MS = 900
const COPIES = [1, 2, 3, 4]

/** 온유의 말 — 영상 왼쪽 아래 자막 한 줄 */
function Say({ children }: { children: ReactNode }) {
  return (
    <p className="ch-say" aria-live="polite">
      <span className="ch-say-who">ONYU · 포토그래퍼</span>
      <span className="ch-say-text">{children}</span>
    </p>
  )
}

/** 오른쪽 패널 — 작은 영문 표지 · 내용 · 아래 버튼 줄. wide: 프레임 고르기(미리보기 + 타일) */
function Panel({ say, mark, children, actions, className, wide = false }: { say?: string; mark: string; children?: ReactNode; actions?: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={`ch-layout${className ? ` ${className}` : ''}`} data-wide={wide || undefined}>
      {say && <Say key={say}>{say}</Say>}
      <section className="ch-panel">
        <p className="ch-mark" aria-hidden="true">{mark}</p>
        <div className="ch-content">{children}</div>
        {actions && <div className="ch-actions">{actions}</div>}
      </section>
    </div>
  )
}

/** 시작 화면 — 라운지의 온유(영상) 옆에 워드마크 · 제목 · 시작 버튼 */
export function CheeseStart({ program, onStart }: { program: ProgramDef; onStart: () => void }) {
  return (
    <Panel
      className="ch-start" mark="PHOTO STUDIO · 4 CUTS"
      say={"안녕하세요, 치즈 스튜디오예요.\n오늘 예쁘게 찍어 드릴게요!"}
      actions={<button type="button" className="pg-btn ch-go" onClick={onStart}><span>{program.startCta}</span><ArrowRight size={22} aria-hidden="true" /></button>}
    >
      <span className="ch-wordmark">{program.wordmark}</span>
      <h1 className="ch-headline">{program.headline.split('\n').map((l, i) => <span key={i}>{l}</span>)}</h1>
      <ol className="ch-steps">{program.steps.map((s, i) => <li key={s}><b>{String(i + 1).padStart(2, '0')}</b>{s}</li>)}</ol>
    </Panel>
  )
}

export function CheeseFlow({ ctx }: { ctx: FlowCtx }) {
  const [step, setStep] = useState<Step>('shoot')
  const [shots, setShots] = useState<HTMLCanvasElement[]>([])
  const [frameId, setFrameId] = useState(CHEESE_FRAMES[0].id)
  const [copies, setCopies] = useState(1)
  const [order, setOrder] = useState<CheeseOrder | null>(null)

  const { setStep: showStep, setDirty, report, onResult } = ctx
  useEffect(() => { showStep(step === 'shoot' ? 1 : step === 'frame' ? 2 : 3) }, [step, showStep])
  useEffect(() => { setDirty(step !== 'shoot' || shots.length > 0) }, [step, shots, setDirty])
  useEffect(() => { report?.(step, null) }, [report, step])
  useEffect(() => { void loadCanvasFonts() }, [])

  return (
    <>
      {step === 'shoot' && (
        <ShootStep ctx={ctx} shots={shots} onShots={setShots} onNext={() => { onResult(); setStep('frame') }} />
      )}
      {step === 'frame' && shots.length === SHOTS && (
        <FrameStep
          shots={shots} frameId={frameId} onFrame={setFrameId} copies={copies} onCopies={setCopies}
          onRetake={() => { setShots([]); setStep('shoot') }} onPrint={(next) => { setOrder(next); setStep('save') }}
        />
      )}
      {step === 'save' && order && <SaveStep ctx={ctx} order={order} />}
    </>
  )
}

// ───────────────────────── 네 컷 촬영(카메라 뒤) ─────────────────────────

function ShootStep({ ctx, shots, onShots, onNext }: { ctx: FlowCtx; shots: HTMLCanvasElement[]; onShots: (s: HTMLCanvasElement[]) => void; onNext: () => void }) {
  const done = shots.length >= SHOTS
  const camera = useCamera({ enabled: !done })
  /** 찍는 중 — 몇 번째 컷(0~3)과 남은 초. null 이면 쉬는 중 */
  const [run, setRun] = useState<{ cut: number; left: number } | null>(null)
  const [flash, setFlash] = useState(false)
  const [hold, setHold] = useState<string | null>(null)
  const [phone, setPhone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }
  useEffect(() => clear, [])
  const { setBusy } = ctx
  useEffect(() => { setBusy(run !== null) }, [run, setBusy])
  const thumbs = useThumbs(shots)

  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }
  /** 컷 하나 — 카운트다운 → 찰칵 → 잠깐 보여 주고 다음 컷 */
  const shootCut = useCallback((cut: number, taken: HTMLCanvasElement[]) => {
    const n = COUNT_S
    setRun({ cut, left: n })
    for (let i = 1; i < n; i++) later(i * 1000, () => setRun({ cut, left: n - i }))
    later(n * 1000, async () => {
      setFlash(true); later(260, () => setFlash(false))
      try {
        const pic = crop34(await camera.still())
        const next = [...taken, pic]
        onShots(next)
        setHold(pic.toDataURL('image/jpeg', 0.8))
        later(HOLD_MS, () => {
          setHold(null)
          if (next.length < SHOTS) shootCut(cut + 1, next)
          else setRun(null)
        })
      } catch (cause) {
        setRun(null)
        setError(cause instanceof Error ? cause.message : '촬영하지 못했어요.')
      }
    })
  }, [camera, onShots])
  const start = () => {
    if (run || camera.state !== 'ready') return
    setError(null); clear(); onShots([])
    shootCut(0, [])
  }

  const phoneSheet = phone && (
    <PhoneSheet ctx={ctx} need={SHOTS} onClose={() => setPhone(false)} onPhotos={(pics) => { setPhone(false); if (pics.length >= SHOTS) onShots(pics.slice(0, SHOTS).map(crop34)) }} />
  )
  const slots = (
    <ol className="ch-slots" aria-label={`네 컷 중 ${shots.length}컷`}>
      {Array.from({ length: SHOTS }, (_, i) => (
        <li key={i} data-now={run?.cut === i || undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {thumbs[i] ? <img src={thumbs[i]} alt={`${i + 1}번째 컷`} /> : <b>{i + 1}</b>}
        </li>
      ))}
    </ol>
  )
  const consent = <p className="ch-consent"><b>촬영 버튼을 누르면 동의한 것으로 봐요.</b> 사진 촬영 · 인화(만 14세 미만은 보호자 확인). 완성 사진만 휴대폰 저장용으로 7일 보관해요.</p>

  if (camera.state === 'error' && !done) {
    return (
      <Panel
        wide className="ch-shoot" mark="01 · SHOOTING" say={"어라, 카메라가 응답이 없네요.\n연결을 한 번만 확인해 주세요."}
        actions={<>
          <button type="button" className="pg-btn ch-line" onClick={() => setPhone(true)}><ImagePlus size={20} />휴대폰 사진</button>
          <button type="button" className="pg-btn ch-go" onClick={camera.retry}><RefreshCw size={20} />다시 연결하기</button>
        </>}
      >
        <div className="ch-cam ch-cam--off"><CameraOff size={64} aria-hidden="true" /><p>{camera.error ?? '카메라 연결을 확인해 주세요'}</p></div>
        {phoneSheet}
      </Panel>
    )
  }

  // 대사는 문장마다 줄을 나눈다(\n — 자막이 어절 중간에서 어색하게 끊기지 않게)
  const say = done ? '네 컷 다 찍었어요! 너무 잘 나왔는데요?\n이제 프레임 고르러 가요.'
    : run ? (run.cut === 0 ? '자, 카메라 렌즈 보시고요.\n하나, 둘…' : run.cut === SHOTS - 1 ? '마지막 컷이에요!\n제일 좋은 표정으로!' : ['', '좋아요!\n이번엔 다른 포즈로 가 볼까요?', '너무 좋아요!\n이번엔 더 크게 웃어 볼게요.'][run.cut])
      : '네 컷을 이어서 찍어요.\n컷마다 포즈를 바꿔 보세요!'
  return (
    <Panel
      wide className="ch-shoot" mark={`01 · SHOOTING · ${Math.min(shots.length + (run && !hold ? 1 : 0), SHOTS)}/${SHOTS}`} say={say}
      actions={done ? (
        <>
          <button type="button" className="pg-btn ch-line" onClick={() => onShots([])}><RotateCcw size={20} />다시 찍기</button>
          <button type="button" className="pg-btn ch-go" onClick={onNext}><span>프레임 고르기</span><ArrowRight size={22} aria-hidden="true" /></button>
        </>
      ) : (
        <>
          <button type="button" className="pg-btn ch-line" onClick={() => setPhone(true)} disabled={!!run}><ImagePlus size={20} />휴대폰 사진</button>
          <button type="button" className="pg-btn ch-go" onClick={start} disabled={!!run || camera.state !== 'ready'}>
            <Camera size={22} /><span>{run ? `${run.cut + 1}번째 컷 촬영 중` : '네 컷 촬영 시작'}</span>
          </button>
        </>
      )}
    >
      <div className="ch-shoot-body">
        <div className="ch-cam" data-live={!done || undefined}>
          {done ? (
            <div className="ch-four">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {thumbs.map((t, i) => <span key={i} className="ch-four-cell"><img src={t} alt={`${i + 1}번째 컷`} /></span>)}
            </div>
          ) : (
            <>
              <video ref={camera.videoRef} muted playsInline autoPlay className="pg-cam-video" hidden={camera.source === 'dslr'} />
              <canvas ref={camera.liveRef} className="pg-cam-video" hidden={camera.source !== 'dslr'} />
              <span className="ch-corners" aria-hidden="true" />
              {camera.state === 'starting' && <p className="ch-cam-note">카메라를 켜는 중…</p>}
              {run && !hold && <b key={`${run.cut}-${run.left}`} className="ch-count" aria-live="assertive">{run.left}</b>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {hold && <img className="ch-hold" src={hold} alt="방금 찍은 컷" />}
            </>
          )}
          {flash && <div className="pg-flash" aria-hidden="true" />}
        </div>
        <div className="ch-shoot-side">
          {slots}
          {error && <p className="ch-warn" role="alert">{error}</p>}
          {!done && !run && consent}
        </div>
      </div>
      {phoneSheet}
    </Panel>
  )
}

/** 찍은 컷 → 작은 그림 주소(컷이 바뀔 때만 다시) */
function useThumbs(shots: HTMLCanvasElement[]) {
  return useMemo(() => shots.map((s) => s.toDataURL('image/jpeg', 0.8)), [shots])
}

// ───────────────────────── 프레임 고르기(모니터석) ─────────────────────────

interface CheeseOrder { sheet: string; frame: CheeseFrame; shots: HTMLCanvasElement[]; copies: number }

function FrameStep({ shots, frameId, onFrame, copies, onCopies, onRetake, onPrint }: {
  shots: HTMLCanvasElement[]; frameId: string; onFrame: (id: string) => void; copies: number; onCopies: (n: number) => void
  onRetake: () => void; onPrint: (order: CheeseOrder) => void
}) {
  const frame = CHEESE_FRAMES.find((f) => f.id === frameId) ?? CHEESE_FRAMES[0]
  // 여덟 장을 한 번에 그려 둔다(글꼴을 받은 뒤) — 고를 때마다 다시 그리지 않게
  const [sheets, setSheets] = useState<Record<string, { full: string; thumb: string }>>({})
  useEffect(() => {
    let alive = true
    void loadCanvasFonts().then(() => {
      if (!alive) return
      const out: Record<string, { full: string; thumb: string }> = {}
      for (const f of CHEESE_FRAMES) { const c = renderCheese(f, shots); out[f.id] = { full: c.toDataURL('image/jpeg', 0.92), thumb: cheeseThumb(c) } }
      setSheets(out)
    })
    return () => { alive = false }
  }, [shots])
  const preview = sheets[frame.id]
  return (
    <ScreenApp say="사진 진짜 잘 나왔어요! 마음에 드는 프레임을 골라 주세요.">
      <div className="ch-app-body">
        <div className="ch-app-view">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img className="ch-app-sheet" src={preview.full} alt={`${frame.name} 프레임 미리보기`} /> : <span className="ch-sheet-wait" aria-hidden="true" />}
        </div>
        <section className="ch-app-sec ch-app-frames" aria-label="프레임">
          <h3>프레임 <b>{frame.name}</b></h3>
          <div className="ch-frame-grid" role="radiogroup" aria-label="프레임">
            {CHEESE_FRAMES.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={f.id === frame.id} aria-label={f.name} onClick={() => onFrame(f.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="ch-thumb">{sheets[f.id] ? <img src={sheets[f.id].thumb} alt="" width={240} height={360} /> : null}</span>
                {f.id === frame.id && <i aria-hidden="true"><Check size={13} strokeWidth={3} /></i>}
              </button>
            ))}
          </div>
        </section>
        <div className="ch-app-foot">
          <div className="ch-copies" role="radiogroup" aria-label="인화 장수">
            {COPIES.map((n) => <button key={n} type="button" role="radio" aria-checked={copies === n} onClick={() => onCopies(n)}>{n}장</button>)}
          </div>
          <button type="button" className="pg-btn ch-line" onClick={onRetake}><RotateCcw size={18} />다시 찍기</button>
          <button type="button" className="pg-btn ch-go" disabled={!preview} onClick={() => preview && onPrint({ sheet: preview.full, frame, shots, copies })}>
            <Printer size={20} /><span>{copies}장 인화</span>
          </button>
        </div>
      </div>
    </ScreenApp>
  )
}

/**
 * 모니터 화면 속 앱 — 영상이 모니터 정면으로 다가가 화면이 거의 꽉 찬 장면(screen)에서, 그 화면 직사각형에 정확히 맞춰 얹는다(cheese.css .ch-screen).
 * 위에 얇은 앱 제목줄(사진 편집 프로그램처럼), 그 아래에 온유의 말 한 줄.
 */
function ScreenApp({ say, children }: { say: string; children: ReactNode }) {
  return (
    <div className="ch-screen">
      <div className="ch-app">
        <header className="ch-app-bar" aria-hidden="true">
          <span className="ch-app-dots"><i /><i /><i /></span>
          <b>CHEESE! Studio</b><span>사진 확인 · 프레임</span>
        </header>
        <p className="ch-app-say" key={say}><b>ONYU</b>{say}</p>
        {children}
      </div>
    </div>
  )
}

// ───────────────────────── 인화 · 저장(인화 데스크) ─────────────────────────

/** 인쇄본에 넣을 폰 저장 주소를 기다리는 최대 시간 — 넘으면 QR 없이 인쇄한다(LATER! 와 같게) */
const PRINT_QR_WAIT_MS = 15_000

function SaveStep({ ctx, order }: { ctx: FlowCtx; order: CheeseOrder }) {
  const { markShot, setDirty } = ctx
  const { sheet, frame, shots, copies } = order
  const make = useCallback(async () => savePhoto(await ctx.getTicket(), sheet), [ctx, sheet])
  const saved = useSavedLink(make, true)
  const [printed, setPrinted] = useState<string | null>(null)
  const decided = useRef(false)
  const link = saved.link
  const failed = !!saved.error
  useEffect(() => {
    if (decided.current) return
    // 정한 값은 다음 틱에 넣는다(effect 안에서 바로 setState 하지 않게)
    const decide = (url: string) => { decided.current = true; void Promise.resolve().then(() => setPrinted(url)) }
    if (failed) { decide(sheet); return }
    if (link) {
      try {
        const qr: StripQr = makeStripQr(link.url)
        decide(renderCheese(frame, shots, qr).toDataURL('image/jpeg', 0.93))
      } catch (error) {
        console.error('[cheese] 인화물 QR 넣기 실패:', error); decide(sheet)
      }
      return
    }
    const timer = window.setTimeout(() => { decided.current = true; setPrinted(sheet) }, PRINT_QR_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [link, failed, sheet, frame, shots])
  const printer = usePrint(printed, () => markShot({ printed: true }), { copies })
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
      wide className="ch-save" mark="03 · PRINT" say={"사진 나오고 있어요.\n오늘 와 주셔서 고마워요. 또 놀러 오세요!"}
      actions={<button type="button" className="pg-btn ch-go" onClick={ctx.requestHome}><Home size={20} /><span>완료 · 처음으로</span></button>}
    >
      <div className="ch-frame-body">
        <div className="ch-sheet">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={printed ?? sheet} alt="인화될 사진" />
        </div>
        <div className="ch-save-cards">
          <PrintCard printer={printer} label={`사진 ${copies}장 인쇄`} note="4×6 사진 · 네 컷" preparing={!printed} />
          <QrCard state={saved} />
        </div>
      </div>
      <div className="pg-print-area" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={printed ?? sheet} alt="" />
      </div>
    </Panel>
  )
}
