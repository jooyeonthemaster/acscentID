'use client'

// 사진 프로그램 12종 흐름 — 촬영(또는 휴대폰 사진) → 옵션 → AI 생성(/api/photobooth/program) → 결과(인화 디자인 2종) → 저장(QR·인쇄).
// 생성 실패 때는 찍은 사진·고른 옵션을 그대로 두고 다시 만들기 / 스타일 바꾸기를 준다.

import { AlertTriangle, Camera, CameraOff, Check, ImagePlus, RefreshCw, RotateCcw, Sparkles, Timer, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultChoices, optionOf } from '@/lib/booth/programs/catalog'
import { countFaces } from '@/lib/booth/face-detect'
import { useCamera } from './use-camera'
import { toRequestJpeg, useAlbum, type FlowCtx } from './flow'
import { loadCanvasFonts } from './fonts'
import { renderProgramPrint, type PrintInput } from './print-designs'
import { savePhoto } from './save'
import { PrintCard, QrCard, usePrint, useSavedLink } from './SavePanel'
import { Creative, Modal, OptionGroups, PanelHead, Progress, Split, Stages, useElapsed } from './ui'
import { loadImage } from './video'

type Step = 'capture' | 'options' | 'generating' | 'result' | 'save'
type Shot = HTMLCanvasElement | HTMLImageElement

const shotUrl = (shot: Shot) => (shot instanceof HTMLCanvasElement ? shot.toDataURL('image/jpeg', 0.85) : shot.src)

export function PhotoFlow({ ctx }: { ctx: FlowCtx }) {
  const { program } = ctx
  const need = program.capture.shots
  const [step, setStep] = useState<Step>('capture')
  const [shots, setShots] = useState<(Shot | null)[]>(() => Array(need).fill(null))
  const [shotUrls, setShotUrls] = useState<(string | null)[]>(() => Array(need).fill(null))
  const [choices, setChoices] = useState(() => defaultChoices(program))
  const [result, setResult] = useState<{ image: HTMLImageElement; prints: [string, string] } | null>(null)
  const [design, setDesign] = useState<0 | 1>(0)

  // ctx 의 함수는 화면 틀의 상태 설정 함수라 바뀌지 않는다 — ctx 객체(매번 새로 만듦)가 아니라 함수에 묶는다
  const { setStep: showStep, setDirty } = ctx
  useEffect(() => { showStep(step === 'capture' ? 1 : step === 'options' ? 2 : 3) }, [step, showStep])
  useEffect(() => { setDirty(step !== 'capture' || shots.some(Boolean)) }, [step, shots, setDirty])

  const setShot = (i: number, shot: Shot | null) => {
    setShots((list) => list.map((s, j) => (j === i ? shot : s)))
    setShotUrls((list) => list.map((s, j) => (j === i ? (shot ? shotUrl(shot) : null) : s)))
  }

  const labels = useMemo(
    () => Object.fromEntries(program.options.groups.map((g) => [g.id, optionOf(program, g.id, choices[g.id])?.label ?? ''])),
    [program, choices],
  )

  return (
    <>
      {step === 'capture' && (
        <CaptureStep ctx={ctx} shots={shots} shotUrls={shotUrls} setShot={setShot} onNext={() => setStep('options')} />
      )}
      {step === 'options' && (
        <Split
          className="pg-options"
          visual={<ShotsVisual urls={shotUrls} program={program.id} />}
        >
          <PanelHead title={program.options.title} sub={program.options.sub} />
          <OptionGroups groups={program.options.groups} choices={choices} onChange={(g, o) => setChoices((c) => ({ ...c, [g]: o }))} />
          <Creative text={program.creative} />
          <div className="pg-actions">
            <button type="button" className="pg-btn pg-btn--line" onClick={() => setStep('capture')}><RotateCcw size={20} />다시 촬영</button>
            <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={() => setStep('generating')}>{program.options.cta}<span aria-hidden="true">→</span></button>
          </div>
        </Split>
      )}
      {step === 'generating' && (
        <Generate
          ctx={ctx} shots={shots as Shot[]} shotUrls={shotUrls as string[]} choices={choices} labels={labels}
          onDone={(r) => { setResult(r); setDesign(0); setStep('result'); ctx.onResult() }}
          onStyle={() => setStep('options')}
        />
      )}
      {step === 'result' && result && (
        <Split className="pg-result" visual={<PrintPreview src={result.prints[design]} />}>
          <PanelHead title={program.result.title} sub={program.result.sub} />
          <div className="pg-designs" role="radiogroup" aria-label="디자인">
            {result.prints.map((src, i) => (
              <button key={i} type="button" role="radio" aria-checked={design === i} className="pg-design" onClick={() => setDesign(i as 0 | 1)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" width={120} height={180} />
                <span>{program.designs[i]}</span>
                {design === i && <i aria-hidden="true"><Check size={16} strokeWidth={3} /></i>}
              </button>
            ))}
          </div>
          <Creative text={program.creative} />
          <div className="pg-actions">
            <button type="button" className="pg-btn pg-btn--line" onClick={() => { setResult(null); shots.forEach((_, i) => setShot(i, null)); setStep('capture') }}><Camera size={20} />다시 촬영</button>
            <button type="button" className="pg-btn pg-btn--line" onClick={() => setStep('options')}><Sparkles size={20} />스타일 변경</button>
          </div>
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={() => setStep('save')}>저장하고 인쇄하기<span aria-hidden="true">→</span></button>
        </Split>
      )}
      {step === 'save' && result && <SaveStep ctx={ctx} image={result.prints[design]} />}
    </>
  )
}

function ShotsVisual({ urls, program }: { urls: (string | null)[]; program: string }) {
  return (
    <div className={`pg-shots pg-shots--${urls.length}`} data-program={program}>
      {urls.map((url, i) => (
        <figure key={i} className="pg-photo-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url && <img src={url} alt={urls.length > 1 ? `${i + 1}번째 사람 사진` : '촬영한 사진'} />}
          {urls.length > 1 && <figcaption>{i === 0 ? '첫 번째 사람' : '두 번째 사람'}</figcaption>}
        </figure>
      ))}
    </div>
  )
}

function PrintPreview({ src }: { src: string }) {
  return (
    <div className="pg-print-preview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="인화될 사진" width={600} height={900} />
    </div>
  )
}

// ───────────────────────── 촬영 ─────────────────────────

function CaptureStep({ ctx, shots, shotUrls, setShot, onNext }: {
  ctx: FlowCtx
  shots: (Shot | null)[]
  shotUrls: (string | null)[]
  setShot: (i: number, shot: Shot | null) => void
  onNext: () => void
}) {
  const { program } = ctx
  const need = program.capture.shots
  const active = shots.findIndex((s) => !s)
  const done = active === -1
  const camera = useCamera({ enabled: !done })
  const [delay, setDelay] = useState<3 | 5>(3)
  const [count, setCount] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [consent, setConsent] = useState(false)
  const [phone, setPhone] = useState(false)
  const [faceWarning, setFaceWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const { setBusy } = ctx
  useEffect(() => { setBusy(count !== null) }, [count, setBusy])

  const shoot = useCallback(() => {
    if (count !== null || camera.state !== 'ready' || !consent || done) return
    setError(null)
    setCount(delay)
    for (let i = 1; i <= delay; i++) {
      timers.current.push(window.setTimeout(() => setCount(delay - i > 0 ? delay - i : 0), i * 1000))
    }
    timers.current.push(window.setTimeout(async () => {
      setFlash(true)
      timers.current.push(window.setTimeout(() => setFlash(false), 260))
      try {
        const still = await camera.still()
        setShot(active, still)
        // 두 사람이 한 컷에 서는 웨딩 — 얼굴이 둘 다 보이는지 확인(모델을 못 쓰면 넘어간다)
        if (program.capture.people === 2 && need === 1) {
          const faces = await countFaces(still)
          setFaceWarning(faces >= 0 && faces < 2 ? `얼굴이 ${faces}명만 보여요. 두 분 모두 화면에 들어오게 다시 찍는 걸 권해요.` : null)
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '촬영하지 못했어요.')
      } finally {
        setCount(null)
      }
    }, delay * 1000 + 50))
  }, [count, camera, consent, done, delay, active, setShot, program.capture.people, need])

  const retake = (i: number) => { setShot(i, null); setFaceWarning(null) }
  /** 휴대폰에서 받은 사진을 빈 칸부터(빈 칸이 없으면 앞에서부터) 채운다 */
  const fillShots = (pics: HTMLImageElement[]) => {
    const empty = shots.map((s, i) => (!s ? i : -1)).filter((i) => i >= 0)
    const slots = empty.length ? empty : shots.map((_, i) => i)
    slots.forEach((slot, k) => { if (pics[k]) setShot(slot, pics[k]) })
  }

  // 실시간 카메라는 한 요소로 둔다 — 두 사람 차례 촬영에서 칸마다 새 video 를 만들면 두 번째가 재생되지 않았다(2026-10-15 QA)
  const visual = (
    <div className={`pg-capture pg-capture--${need}`}>
      {Array.from({ length: need }, (_, i) => (
        <figure key={i} className="pg-cam" style={{ gridColumn: i + 1, gridRow: 1 }}>
          {shotUrls[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shotUrls[i]!} alt="촬영한 사진" />
          ) : i !== active ? (
            <p className="pg-cam-note"><UserRound size={56} aria-hidden="true" />다음 차례</p>
          ) : null}
          {need > 1 && <figcaption>{i === 0 ? '첫 번째 사람' : '두 번째 사람'}{shotUrls[i] ? ' · 완료' : i === active ? ' · 촬영 중' : ''}</figcaption>}
          {shotUrls[i] && (
            <button type="button" className="pg-btn pg-btn--chip pg-cam-retake" onClick={() => retake(i)}><RotateCcw size={18} />다시 촬영</button>
          )}
        </figure>
      ))}
      {!done && (
        <div className="pg-cam pg-cam--live" data-live style={{ gridColumn: active + 1, gridRow: 1 }}>
          <video ref={camera.videoRef} muted playsInline autoPlay className="pg-cam-video" hidden={camera.source === 'dslr'} />
          <canvas ref={camera.liveRef} className="pg-cam-video" hidden={camera.source !== 'dslr'} />
          <div className={`pg-guide pg-guide--${program.capture.people === 2 && need === 1 ? 2 : 1}`} aria-hidden="true"><i /><i /></div>
          {camera.state === 'starting' && <p className="pg-cam-note">카메라를 켜는 중…</p>}
          {camera.state === 'ready' && <p className="pg-cam-ready"><i />카메라 준비 완료</p>}
          {need > 1 && <p className="pg-cam-turn">{active === 0 ? '첫 번째 사람' : '두 번째 사람'} · 촬영 중</p>}
          {count !== null && count > 0 && <b className="pg-count" aria-live="assertive">{count}</b>}
        </div>
      )}
      {flash && <div className="pg-flash" aria-hidden="true" />}
    </div>
  )

  if (camera.state === 'error' && !done) {
    return (
      <Split className="pg-capture-step" visual={<div className="pg-cam pg-cam--off"><CameraOff size={96} aria-hidden="true" /><p>카메라가 연결되지 않았어요</p></div>}>
        <PanelHead title="카메라가 연결되지 않았어요" sub={camera.error ?? '연결을 확인한 뒤 다시 시도해 주세요'} />
        <div className="pg-stack">
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={camera.retry}><RefreshCw size={20} />다시 연결하기</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={() => setPhone(true)}><ImagePlus size={20} />휴대폰 사진 가져오기</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={ctx.home}>처음으로</button>
          <p className="pg-muted">계속 안 되면 직원에게 도움을 요청해 주세요.</p>
        </div>
        {phone && <PhoneSheet ctx={ctx} need={shots.filter((s) => !s).length || need} onClose={() => setPhone(false)} onPhotos={(pics) => { fillShots(pics); setPhone(false) }} />}
      </Split>
    )
  }

  return (
    <Split className="pg-capture-step" visual={visual}>
      <PanelHead
        title={done ? '사진을 확인해 주세요' : need > 1 ? `${active === 0 ? '첫 번째' : '두 번째'} 사람을 찍어 주세요` : program.capture.title}
        sub={done ? '마음에 들면 다음으로, 아니면 다시 찍을 수 있어요' : program.capture.hint}
        eyebrow={need > 1 ? `${shots.filter(Boolean).length} / ${need}` : undefined}
      />
      {faceWarning && <p className="pg-warn" role="alert"><AlertTriangle size={18} aria-hidden="true" />{faceWarning}</p>}
      {error && <p className="pg-error-text" role="alert">{error}</p>}
      {!done ? (
        <>
          <div className="pg-timer" role="radiogroup" aria-label="타이머">
            {([3, 5] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={delay === s} disabled={count !== null} onClick={() => setDelay(s)}><Timer size={18} />{s}초 타이머</button>
            ))}
          </div>
          <label className="pg-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={count !== null} />
            <span>사진 촬영과 AI 사진 생성에 동의해요. 찍은 사진은 생성에만 쓰고, 저장을 누른 결과만 7일 보관해요.</span>
          </label>
          <button type="button" className="pg-btn pg-btn--accent pg-btn--shoot" onClick={shoot} disabled={count !== null || camera.state !== 'ready' || !consent}>
            <Camera size={30} />{count !== null ? `${count || '찰칵'}…` : program.capture.people === 2 && need === 1 ? '함께 촬영하기' : '촬영하기'}
          </button>
          <button type="button" className="pg-btn pg-btn--line" onClick={() => setPhone(true)} disabled={count !== null || !consent}>
            <ImagePlus size={20} />{need > 1 ? '사진 두 장 가져오기' : '휴대폰 사진 가져오기'}
          </button>
          {!consent && <p className="pg-muted">촬영하려면 위 동의를 눌러 주세요.</p>}
        </>
      ) : (
        <div className="pg-actions">
          <button type="button" className="pg-btn pg-btn--line" onClick={() => shots.forEach((_, i) => retake(i))}><RotateCcw size={20} />모두 다시 촬영</button>
          <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={onNext}>이 사진으로<span aria-hidden="true">→</span></button>
        </div>
      )}
      {phone && (
        <PhoneSheet
          ctx={ctx}
          need={shots.filter((s) => !s).length || need}
          onClose={() => setPhone(false)}
          onPhotos={(pics) => { fillShots(pics); setPhone(false) }}
        />
      )}
    </Split>
  )
}

/** 휴대폰 사진 가져오기 — QR 로 올리면 받아서 빈 칸에 넣는다 */
function PhoneSheet({ ctx, need, onClose, onPhotos }: { ctx: FlowCtx; need: number; onClose: () => void; onPhotos: (pics: HTMLImageElement[]) => void }) {
  const album = useAlbum(ctx.getTicket, true, `n=${need}&for=photo`)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = album.photos.length >= need
  const take = async () => {
    setLoading(true); setError(null)
    try {
      const pics = await Promise.all(album.photos.slice(-need).map((p) => loadImage(p.url)))
      onPhotos(pics)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '사진을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Modal label="휴대폰 사진 가져오기" onClose={onClose}>
      <h3>휴대폰 사진 가져오기</h3>
      <p>휴대폰 카메라로 QR을 찍고 사진 {need}장을 올려 주세요.</p>
      <div className="pg-sheet-qr">
        {album.qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.qr} alt="사진 올리기 QR" width={220} height={220} />
        ) : album.status === 'error' ? <AlertTriangle size={48} /> : <span className="pg-spin-box" aria-busy="true" />}
        <div>
          <b>{album.photos.length} / {need}장 받음</b>
          {album.status === 'error' && <p className="pg-error-text">{album.error}</p>}
          {album.status === 'expired' && <button type="button" className="pg-btn pg-btn--line" onClick={album.reissue}>QR 다시 받기</button>}
          {error && <p className="pg-error-text">{error}</p>}
        </div>
      </div>
      <div className="pg-actions">
        <button type="button" className="pg-btn pg-btn--line" onClick={onClose}>닫기</button>
        <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" disabled={!ready || loading} onClick={() => void take()}>{loading ? '불러오는 중…' : '이 사진으로'}</button>
      </div>
    </Modal>
  )
}

// ───────────────────────── 생성 ─────────────────────────

function Generate({ ctx, shots, shotUrls, choices, labels, onDone, onStyle }: {
  ctx: FlowCtx
  shots: Shot[]
  shotUrls: string[]
  choices: Record<string, string>
  labels: Record<string, string>
  onDone: (r: { image: HTMLImageElement; prints: [string, string] }) => void
  onStyle: () => void
}) {
  const { program } = ctx
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const elapsed = useElapsed(!error)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const abort = new AbortController()
    ctx.setBusy(true)
    setError(null); setStage(0)
    ;(async () => {
      try {
        const photos = shots.map((s) => toRequestJpeg(s))
        setStage(1)
        const ticket = await ctx.getTicket()
        const res = await fetch('/api/photobooth/program', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
          body: JSON.stringify({ ticket, program: program.id, choices, photos }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || typeof data.image !== 'string') throw new Error(data.error || `AI 사진을 만들지 못했어요 (${res.status}).`)
        setStage(2)
        const [image] = await Promise.all([loadImage(data.image), loadCanvasFonts()])
        const original = shots[0]
        const input: PrintInput = { result: image, original, choices, labels }
        const prints: [string, string] = [renderProgramPrint(program, 0, input), renderProgramPrint(program, 1, input)]
        if (!abort.signal.aborted) doneRef.current({ image, prints })
      } catch (cause) {
        if (abort.signal.aborted) return
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
      <Split className="pg-generating pg-generating--error" visual={<ShotsVisual urls={shotUrls} program={program.id} />}>
        <div className="pg-error-icon" aria-hidden="true"><AlertTriangle size={44} /></div>
        <PanelHead title="잠시 문제가 생겼어요" sub="촬영한 사진과 선택한 스타일은 그대로예요" />
        <p className="pg-error-text" role="alert">{error}</p>
        <div className="pg-stack">
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={20} />다시 만들기</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={onStyle}><Sparkles size={20} />스타일 바꾸기</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={ctx.home}>체험 마치기</button>
        </div>
      </Split>
    )
  }

  return (
    <Split className="pg-generating" visual={<div className="pg-scan"><ShotsVisual urls={shotUrls} program={program.id} /><i aria-hidden="true" /></div>}>
      <PanelHead title={program.generating.title} sub={program.generating.sub} />
      <Progress caption={`${elapsed}초 지남 · 보통 20~40초 걸려요`} />
      <Stages labels={program.generating.stages} active={stage} />
      <Creative text={program.creative} />
      <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={ctx.requestHome}>처음으로</button>
    </Split>
  )
}

// ───────────────────────── 저장 ─────────────────────────

function SaveStep({ ctx, image }: { ctx: FlowCtx; image: string }) {
  const { program } = ctx
  const make = useCallback(async () => savePhoto(await ctx.getTicket(), image), [ctx, image])
  const saved = useSavedLink(make, true)
  const printer = usePrint(image, () => ctx.markShot({ printed: true }))
  const { markShot, setDirty } = ctx
  useEffect(() => { if (saved.link) { markShot({ downloaded: true }); setDirty(false) } }, [saved.link, markShot, setDirty])
  return (
    <Split className="pg-save" visual={<PrintPreview src={image} />}>
      <PanelHead title={program.save.title} sub={program.save.sub} />
      <div className="pg-save-cards">
        <QrCard state={saved} />
        <PrintCard printer={printer} />
      </div>
      <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={ctx.requestHome}>완료 · 처음으로</button>
      <div className="pg-print-area" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" />
      </div>
    </Split>
  )
}

