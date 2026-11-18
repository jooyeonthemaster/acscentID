'use client'
/* eslint-disable @next/next/no-img-element -- 찍은 사진 · 합성한 data: 원판(최적화할 원격 그림이 아니다) */

// 「2027 정미년 새해 이야기」 흐름(관상 FACE! · 사주 SAJU! · 손금 PALM! — 연말 시상식, kind 'reading').
//   사주: 생년월일 → 촬영 → (생성) → 결과 → 저장
//   관상: 촬영 → 주제 하나 → (생성) → 결과 → 저장
//   손금: 촬영(얼굴 옆에 손바닥) → (생성) → 결과 → 저장
// 생성 = 기기 안에서 사진 읽기(표정 · 기울기 / 손 펼친 정도, 키오스크 read-photo 그대로) → /api/photobooth/reading 에서 글 → 기기 안에서 4×6 두 가지 합성.
// 사주(2026-11-17~): 관상처럼 촬영 직후 초상(후광 · 구름 · 한복)을 만들기 시작하고, 가로 6×4 접는 카드로 합성한다(saju-print.ts).
// 손금은 그림을 AI 로 만들지 않는다 — 대기는 AI 글 3~6초(늦으면 10초에 미리 쓴 문장). 촬영 · 저장 화면은 사진 프로그램(PhotoFlow)과 같은 부품.
// 관상(2026-11-17~): 촬영 직후 /api/photobooth/portrait 로 동양풍 초상을 만들기 시작하고(주제를 고르는 동안, 보통 10초),
//   글과 초상을 함께 받아 초상 위에 붓글씨로 얹는다(portrait-print.ts). 초상을 못 받으면 찍은 사진을 세피아로 같은 원판에.

import { AlertTriangle, Camera, Check, Clock, Delete, Home, Printer, RefreshCw, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { optionOf } from '@/lib/booth/programs/catalog'
import {
  FACE_MOOD_LABEL, faceMood, PALM_OPEN_LABEL, palmOpen, READING_NOTICE, sajuViewOf,
  type FaceTopic, type ReadingFacts, type ReadingStory, type SajuView,
} from '@/lib/booth/programs/reading'
import { FG_HOURS, type FgBirth } from '@/lib/funground/saju-reading'
import { PHOTO_PLANS, type PhotoReading } from '@/lib/kiosk/expansion/photo'
import { readPhoto } from '@/app/kiosk/experience/expansion/read-photo'
import { loadVision, photoCanvas, preloadVision } from '@/app/kiosk/experience/kx-vision'
import { toRequestJpeg, type FlowCtx } from './flow'
import { CaptureStep, SaveStep } from './PhotoFlow'
import { loadReadingPrintAssets, renderReadingPrint } from './reading-print'
import { renderPortraitPrint, type FaceBox } from './portrait-print'
import { loadSajuPrintAssets, renderSajuPrint } from './saju-print'
import { Creative, Modal, OptionGroups, PanelHead, Split, Stages, useElapsed, usePlain } from './ui'
import { loadImage } from './video'

type Step = 'birth' | 'capture' | 'topic' | 'generating' | 'result' | 'save'
type Shot = HTMLCanvasElement | HTMLImageElement
const shotUrl = (shot: Shot) => (shot instanceof HTMLCanvasElement ? shot.toDataURL('image/jpeg', 0.88) : shot.src)

/** 관상 동양풍 초상 — 실패해도 null(찍은 사진으로 원판을 만든다) */
async function requestPortrait(ctx: FlowCtx, shot: Shot, reading: Promise<Read> | null): Promise<string | null> {
  try {
    // 기기가 센 얼굴 수(여럿이면 단체 초상) — 사진 읽기는 1초 안팎
    const [ticket, read] = await Promise.all([ctx.getTicket(), reading?.catch(() => null) ?? null])
    const res = await fetch('/api/photobooth/portrait', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket, program: ctx.program.id, photo: toRequestJpeg(shot, 1024), people: read?.people }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || typeof data.image !== 'string') { console.warn('[nh-portrait]', res.status, data.error); return null }
    return data.image as string
  } catch (error) {
    console.warn('[nh-portrait]', error instanceof Error ? error.message : error)
    return null
  }
}

/** AI 초상 안 모든 얼굴을 감싼 상자(0~1) — 원판에서 얼굴이 글 칸에 묻히지 않게. 못 찾으면 null(가운데 기준) */
async function faceBoxOf(image: HTMLImageElement): Promise<FaceBox | null> {
  const canvas = await photoCanvas(image.src, 960)
  try {
    const faces = (await loadVision('faces')).detect(canvas).faceLandmarks
    if (!faces.length) return null
    const pts = faces.flat()
    return { x0: Math.min(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), x1: Math.max(...pts.map((p) => p.x)), y1: Math.max(...pts.map((p) => p.y)) }
  } catch { return null } finally { canvas.width = canvas.height = 0 }
}

/** 기기에서 읽은 값 — 사진 읽기를 못 해도 흐름은 멈추지 않는다(값 없이 미리 쓴 문장 · AI 는 사진만 보고) */
interface Read { facts: ReadingFacts; focus: { x: number; y: number } | null; problem: 'no-face' | 'no-hand' | null; people?: number }

/** 손바닥 가운데(0~1) — 손금 카드 사진 자르기에만 쓴다(키오스크 손 도구 그대로, 이미 받아 둔 것) */
async function handCentre(url: string): Promise<{ x: number; y: number } | null> {
  const canvas = await photoCanvas(url, 960)
  try {
    const marks = (await loadVision('hand')).detect(canvas).landmarks[0]
    if (!marks?.length) return null
    return { x: marks.reduce((a, p) => a + p.x, 0) / marks.length, y: marks.reduce((a, p) => a + p.y, 0) / marks.length }
  } finally { canvas.width = canvas.height = 0 }
}

async function readShot(url: string, subject: 'face' | 'palm'): Promise<Read> {
  try {
    if (subject === 'palm') {
      const hand = await readPhoto(url, PHOTO_PLANS.palm)
      // 카드 사진은 얼굴과 손바닥이 함께 나오게 — 둘의 가운데를 자르는 기준으로(못 찾으면 가운데)
      const face = await readPhoto(url, { ...PHOTO_PLANS.face, outfit: false }).catch(() => null)
      const f = face?.faces[0]
      const h = await handCentre(url).catch(() => null)
      const focus = f && h ? { x: (f.x + h.x) / 2, y: Math.min(f.y, h.y) } : f ? { x: f.x, y: f.y } : h
      return { facts: { spread: hand.hand?.spread, thumb: hand.hand?.thumb }, focus, problem: null }
    }
    const made: PhotoReading = await readPhoto(url, { ...PHOTO_PLANS.face, outfit: false })
    const f = made.faces[0]
    return { facts: { smile: f?.smile, tilt: f?.tilt }, focus: f ? { x: f.x, y: f.y } : null, problem: null, people: made.faces.length || undefined }
  } catch (error) {
    const problem = error instanceof Error && (error.message === 'no-face' || error.message === 'no-hand') ? error.message : null
    return { facts: {}, focus: null, problem }
  }
}

interface Made { story: ReadingStory; engine: 'ai' | 'local'; saju?: SajuView; prints: [string, string]; /** AI 초상(받았으면) — 영상판 족자에 그린다 */ art?: string }

export function ReadingFlow({ ctx }: { ctx: FlowCtx }) {
  const { program } = ctx
  const subject = program.reading?.subject ?? 'face'
  const needsBirth = Boolean(program.reading?.birth)
  const [step, setStep] = useState<Step>(needsBirth ? 'birth' : 'capture')
  const [birth, setBirth] = useState<FgBirth | null>(null)
  const [shots, setShots] = useState<(Shot | null)[]>([null])
  const [shotUrls, setShotUrls] = useState<(string | null)[]>([null])
  const [choices, setChoices] = useState<Record<string, string>>({ topic: 'work' })
  const [made, setMade] = useState<Made | null>(null)
  const [design, setDesign] = useState<0 | 1>(0)
  /** 촬영이 끝나자마자 사진을 읽기 시작한다(주제를 고르는 동안 끝난다) */
  const [reading, setReading] = useState<Promise<Read> | null>(null)
  /** 관상: 촬영이 끝나자마자 초상을 만들기 시작한다 */
  const [portrait, setPortrait] = useState<Promise<string | null> | null>(null)
  const withPortrait = program.id === 'nh-face' || program.id === 'nh-saju'
  const [readWarning, setReadWarning] = useState<string | null>(null)

  // 사진 읽는 도구를 미리 받아 둔다(첫 손님도 기다리지 않게)
  useEffect(() => {
    const stops = [preloadVision('faces'), ...(subject === 'palm' ? [preloadVision('hand')] : [])]
    void loadReadingPrintAssets(program.id)
    if (program.id === 'nh-saju') void loadSajuPrintAssets(program.id)
    return () => stops.forEach((stop) => stop())
  }, [subject, program.id])

  const { setStep: showStep, setDirty, report } = ctx
  /** 영상판 관상 — 결과는 초상 포스터 하나, 인쇄하기를 누르면 바로 인쇄 */
  const simple = Boolean(report) && program.id === 'nh-face'
  // 영상판 — 단계가 바뀌면 장면을, 결과 · 저장에서는 고른 인화물을 족자에 얹게 알린다
  // 관상은 AI 초상을 족자 비단에 그리고, 사주는 고른 사주 카드(인화물)를 받침대 종이에 얹는다
  // 그리기 전에 알린다(useLayoutEffect) — 새 단계 화면이 한 프레임이라도 장면보다 먼저 보이지 않게(영상이 넘어간 뒤에 패널이 열린다)
  useLayoutEffect(() => {
    const face = program.id === 'nh-face'
    report?.(step, (step === 'result' || step === 'save') && made ? { art: face ? made.art ?? made.prints[design] : made.prints[design], painted: face && Boolean(made.art), title: made.story.keyword } : null)
  }, [report, step, made, design, program.id])
  useEffect(() => { showStep(step === 'birth' || step === 'capture' ? 1 : step === 'topic' || step === 'generating' ? 2 : 3) }, [step, showStep])
  useEffect(() => { setDirty(step !== 'birth' && step !== 'capture' ? true : shots.some(Boolean) || Boolean(birth)) }, [step, shots, birth, setDirty])

  const setShot = (i: number, shot: Shot | null) => {
    setShots((list) => list.map((s, j) => (j === i ? shot : s)))
    const url = shot ? shotUrl(shot) : null
    setShotUrls((list) => list.map((s, j) => (j === i ? url : s)))
    const read = url ? readShot(url, subject) : null
    setReading(read)
    setPortrait(shot && withPortrait ? requestPortrait(ctx, shot, read) : null)
    setReadWarning(null)
  }
  const afterCapture = async () => {
    // 손금은 손이 보여야 이야기가 된다 — 못 찾으면 다시 찍기를 권한다(그래도 이 사진으로 갈 수 있다)
    if (subject === 'palm' && reading) {
      const read = await reading
      if (read.problem === 'no-hand' && !readWarning) { setReadWarning('손바닥을 찾지 못했어요. 손가락을 펴고 손바닥이 카메라를 보게 다시 찍어 주세요.'); return }
    }
    setStep(program.id === 'nh-face' ? 'topic' : 'generating')
  }
  const restart = () => { setMade(null); setShot(0, null); setStep(needsBirth ? 'birth' : 'capture') }

  return (
    <>
      {step === 'birth' && <BirthStep initial={birth} single={Boolean(report)} onBack={ctx.requestHome} onNext={(b) => { setBirth(b); setStep('capture') }} />}
      {step === 'capture' && (
        <>
          <CaptureStep ctx={ctx} shots={shots} shotUrls={shotUrls} setShot={setShot} onNext={() => void afterCapture()} />
          {readWarning && (
            <Modal label="손바닥을 다시 찍어 주세요" onClose={() => setReadWarning(null)}>
              <h3>손바닥이 잘 안 보여요</h3>
              <p>{readWarning}</p>
              <div className="pg-actions">
                <button type="button" className="pg-btn pg-btn--line pg-btn--grow" onClick={() => setStep('generating')}>이 사진으로 할게요</button>
                <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={() => { setShot(0, null) }}><RotateCcw size={20} />다시 찍기</button>
              </div>
            </Modal>
          )}
        </>
      )}
      {step === 'topic' && (
        <Split className="pg-options" visual={<Photo url={shotUrls[0]} />}>
          <PanelHead title={program.options.title} sub={program.options.sub} />
          <OptionGroups groups={program.options.groups} choices={choices} onChange={(g, o) => setChoices((c) => ({ ...c, [g]: o }))} art={Boolean(report)} />
          <Creative text={program.creative} />
          <div className="pg-actions">
            <button type="button" className="pg-btn pg-btn--line" onClick={() => { setShot(0, null); setStep('capture') }}><RotateCcw size={20} />다시 촬영</button>
            <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={() => setStep('generating')}>{program.options.cta}<span aria-hidden="true">→</span></button>
          </div>
        </Split>
      )}
      {step === 'generating' && shots[0] && (
        <Generate
          ctx={ctx} shot={shots[0]} shotUrl={shotUrls[0]!} subject={subject} birth={birth}
          topic={(choices.topic ?? 'work') as FaceTopic} reading={reading} portrait={withPortrait ? portrait ?? Promise.resolve(null) : null}
          onDone={(m) => { setMade(m); setDesign(0); setStep('result'); ctx.onResult() }}
          onBack={() => setStep(program.id === 'nh-face' ? 'topic' : 'capture')}
        />
      )}
      {step === 'result' && made && simple && (
        // 영상판 관상 — 초상 포스터 한 가지만(고르지 않는다), 고르기 자리에 짧은 관상 이야기, 아래 처음으로 · 인쇄하기 둘(2026-11-18 사용자 지시)
        <Split className="pg-result pg-reading-result pg-reading-simple" visual={<div className="pg-print-preview"><img src={made.prints[0]} alt="인화될 새해 초상" width={600} height={900} /></div>}>
          <PanelHead title={program.result.title} sub="오늘의 표정에서 착안한 새해 덕담이에요" eyebrow={made.engine === 'ai' ? 'AI가 쓴 새해 이야기' : '미리 써 둔 새해 이야기'} />
          <div className="pg-reading-story">
            <b>{made.story.keyword}</b>
            <span>{made.story.title}</span>
          </div>
          <div className="pg-reading-lines">
            {made.story.lines.map((line) => <p key={line}>{line}</p>)}
            <p className="pg-reading-wish">{made.story.wish}</p>
          </div>
          <Creative text={program.creative} />
          <div className="pg-actions">
            <button type="button" className="pg-btn pg-btn--line pg-btn--grow" onClick={ctx.requestHome}><Home size={20} />처음으로</button>
            <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={() => setStep('save')}><Printer size={20} />인쇄하기</button>
          </div>
        </Split>
      )}
      {step === 'result' && made && !simple && (
        <Split className="pg-result pg-reading-result" visual={<div className="pg-print-preview"><img src={made.prints[design]} alt="인화될 새해 카드" width={600} height={900} /></div>}>
          <PanelHead title={program.result.title} sub={program.result.sub} eyebrow={made.engine === 'ai' ? 'AI가 쓴 새해 이야기' : '미리 써 둔 새해 이야기'} />
          <div className="pg-reading-story">
            <b>{made.story.keyword}</b>
            <span>{made.story.title}</span>
          </div>
          <div className="pg-designs" role="radiogroup" aria-label="디자인">
            {made.prints.map((src, i) => (
              <button key={i} type="button" role="radio" aria-checked={design === i} className="pg-design" onClick={() => setDesign(i as 0 | 1)}>
                <img src={src} alt="" width={120} height={180} />
                <span>{program.designs[i]}</span>
                {design === i && <i aria-hidden="true"><Check size={16} strokeWidth={3} /></i>}
              </button>
            ))}
          </div>
          <Creative text={program.creative} />
          <div className="pg-actions">
            <button type="button" className="pg-btn pg-btn--line" onClick={restart}><Camera size={20} />처음부터 다시</button>
          </div>
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={() => setStep('save')}>저장하고 인쇄하기<span aria-hidden="true">→</span></button>
        </Split>
      )}
      {step === 'save' && made && <SaveStep ctx={ctx} image={made.prints[simple ? 0 : design]} printNow={simple} />}
    </>
  )
}

function Photo({ url }: { url: string | null }) {
  return <figure className="pg-photo-frame">{url && <img src={url} alt="촬영한 사진" />}</figure>
}

// ───────────────────────── 생성 ─────────────────────────

function Generate({ ctx, shot, shotUrl, subject, birth, topic, reading, portrait, onDone, onBack }: {
  ctx: FlowCtx
  shot: Shot
  shotUrl: string
  subject: 'face' | 'palm'
  birth: FgBirth | null
  topic: FaceTopic
  reading: Promise<Read> | null
  /** 관상 초상(먼저 시작한 요청) — null 이면 초상 없는 프로그램 */
  portrait: Promise<string | null> | null
  onDone: (m: Made) => void
  onBack: () => void
}) {
  /** 영상판 — 기다림 안내 글 없음 */
  const plain = usePlain()
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
        const read = await (reading ?? readShot(shotUrl, subject))
        setStage(1)
        const ticket = await ctx.getTicket()
        // 사주는 사진을 보내지 않는다(생일만) — 사진은 카드에만
        const photo = program.reading?.birth ? undefined : toRequestJpeg(shot, 640)
        const res = await fetch('/api/photobooth/reading', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
          body: JSON.stringify({ ticket, program: program.id, topic: program.id === 'nh-face' ? topic : undefined, birth: birth ?? undefined, facts: read.facts, photo }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.story) throw new Error(data.error || `새해 이야기를 만들지 못했어요 (${res.status}).`)
        setStage(2)
        const [image, , painted] = await Promise.all([loadImage(shotUrl), Promise.all([loadReadingPrintAssets(program.id), program.id === 'nh-saju' ? loadSajuPrintAssets(program.id) : null]), portrait ? portrait.then((url) => url ? loadImage(url).catch(() => null) : null) : null])
        const story = data.story as ReadingStory
        const saju = data.saju as SajuView | undefined
        const tag = program.id === 'nh-face'
          ? [optionOf(program, 'topic', topic)?.label, faceMood(read.facts) ? FACE_MOOD_LABEL[faceMood(read.facts)!] : null].filter(Boolean).join(' · ')
          : program.id === 'nh-palm' ? PALM_OPEN_LABEL[palmOpen(read.facts)] : saju ? `${saju.zodiac}띠 · ${saju.dayMaster.gan}(${saju.dayMaster.hanja}) 일간` : undefined
        const input = { photo: image, focus: read.focus, story, saju, tag, wide: subject === 'palm' }
        // 사주: 가로 6×4 접는 카드(왼쪽 초상 · 오른쪽 오행 색 원국과 풀이, saju-print.ts)
        const faces = painted && program.id === 'nh-face' ? await faceBoxOf(painted) : null
        const prints: [string, string] = program.id === 'nh-saju'
          ? [0, 1].map((d) => renderSajuPrint(program, d as 0 | 1, { ...input, photo: painted ?? image, portrait: Boolean(painted) })) as [string, string]
          : portrait
          ? [0, 1].map((d) => renderPortraitPrint(program, d as 0 | 1, { ...input, photo: painted ?? image, portrait: Boolean(painted), faces })) as [string, string]
          : [renderReadingPrint(program, 0, input), renderReadingPrint(program, 1, input)]
        if (!abort.signal.aborted) doneRef.current({ story, engine: data.engine === 'ai' ? 'ai' : 'local', saju, prints, art: painted?.src })
      } catch (cause) {
        if (abort.signal.aborted) return
        setError(cause instanceof Error ? cause.message : '새해 이야기를 만들지 못했어요.')
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
      <Split className="pg-generating pg-generating--error" visual={<Photo url={shotUrl} />}>
        <div className="pg-error-icon" aria-hidden="true"><AlertTriangle size={44} /></div>
        <PanelHead title="잠시 문제가 생겼어요" sub="촬영한 사진과 고른 것은 그대로예요" />
        <p className="pg-error-text" role="alert">{error}</p>
        <div className="pg-stack">
          <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={20} />다시 만들기</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={onBack}><RotateCcw size={20} />이전으로</button>
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={ctx.home}>체험 마치기</button>
        </div>
      </Split>
    )
  }
  return (
    <Split className="pg-generating" visual={<div className="pg-scan"><Photo url={shotUrl} /><i aria-hidden="true" /></div>}>
      <PanelHead title={program.generating.title} sub={program.generating.sub} />
      {/* 모노 갤러리 대기 — 지난 초(실제 값)를 크게, 가는 선이 오간다(가짜 % 없음) */}
      <div className="pg-reading-wait" role="status" aria-live="polite">
        <p className="pg-reading-elapsed">{elapsed}<span>초</span></p>
        <i className="pg-reading-line" aria-hidden="true" />
        {!plain && <p>{portrait ? '초상까지 보통 10~20초 걸려요' : '보통 5~10초 걸려요'}</p>}
      </div>
      <Stages labels={program.generating.stages} active={stage} />
      <Creative text={READING_NOTICE} />
    </Split>
  )
}

// ───────────────────────── 생년월일(사주) ─────────────────────────

/** 숫자 여덟 자리(YYYYMMDD)를 누르는 키패드 + 양력 · 음력 + 태어난 시간(모름이 기본) — 중장년 손님도 한 번에 */
function BirthStep({ initial, onBack, onNext, single = false }: { initial: FgBirth | null; onBack: () => void; onNext: (birth: FgBirth) => void; /** 영상판 — 날짜 · 양음력 · 시간까지 키패드 패널 하나에(2026-11-18 사용자 지시: 팝업창 두 개 말고 하나로) */ single?: boolean }) {
  const [digits, setDigits] = useState(() => initial ? `${initial.year}${String(initial.month).padStart(2, '0')}${String(initial.day).padStart(2, '0')}` : '')
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>(initial?.calendar ?? 'solar')
  const [leap, setLeap] = useState(Boolean(initial?.isLeapMonth))
  const [hourIndex, setHourIndex] = useState<number | null>(initial?.hourIndex ?? null)
  const [hourOpen, setHourOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const press = (key: string) => { setError(null); setDigits((d) => key === 'back' ? d.slice(0, -1) : (d + key).slice(0, 8)) }
  const birth = useMemo<FgBirth | null>(() => digits.length === 8 ? { year: Number(digits.slice(0, 4)), month: Number(digits.slice(4, 6)), day: Number(digits.slice(6, 8)), calendar, isLeapMonth: calendar === 'lunar' && leap, hourIndex } : null, [digits, calendar, leap, hourIndex])
  const go = useCallback(() => {
    if (!birth) return
    const now = new Date()
    if (birth.year < 1930 || birth.year > now.getFullYear()) { setError('태어난 해를 다시 확인해 주세요(1930년부터).'); return }
    try { sajuViewOf(birth) } catch (cause) { setError(cause instanceof Error ? cause.message : '날짜를 다시 확인해 주세요.'); return }
    onNext(birth)
  }, [birth, onNext])
  const slot = (from: number, to: number, holder: string) => {
    const part = digits.slice(from, to)
    return <span className="pg-birth-part" data-empty={!part || undefined} data-active={digits.length >= from && digits.length < to || undefined}>{part.padEnd(to - from, '·') || holder}</span>
  }
  const display = <div className="pg-birth-display" aria-live="polite">{slot(0, 4, 'YYYY')}<i>.</i>{slot(4, 6, 'MM')}<i>.</i>{slot(6, 8, 'DD')}</div>
  const cal = (
    <div className="pg-birth-cal" role="radiogroup" aria-label="양력 · 음력">
      {(['solar', 'lunar'] as const).map((c) => <button key={c} type="button" role="radio" aria-checked={calendar === c} onClick={() => { setCalendar(c); setError(null) }}>{c === 'solar' ? '양력' : '음력'}</button>)}
      {calendar === 'lunar' && <button type="button" role="checkbox" aria-checked={leap} onClick={() => setLeap((v) => !v)}>윤달</button>}
    </div>
  )
  // 영상판(한 패널)은 줄여서 — 「시간 · 모름」 / 「시간 · 자시」
  const hour = single
    ? <button type="button" className="pg-birth-hour" onClick={() => setHourOpen(true)} aria-label={`태어난 시간 · ${hourIndex == null ? '모름' : FG_HOURS[hourIndex].label}`}><Clock size={18} />시간 · <b>{hourIndex == null ? '모름' : FG_HOURS[hourIndex].label}</b></button>
    : <button type="button" className="pg-birth-hour" onClick={() => setHourOpen(true)}><Clock size={22} />태어난 시간 · <b>{hourIndex == null ? '모름' : `${FG_HOURS[hourIndex].label} (${FG_HOURS[hourIndex].range})`}</b></button>
  return (
    <Split className={`pg-birth${single ? ' pg-birth--single' : ''}`} visual={single ? <div /> :
      <div className="pg-birth-visual">
        <p className="pg-birth-label">생년월일 8자리</p>
        {display}
        {cal}
        {hour}
        <p className="pg-muted">예) 1975년 3월 8일 → 1 9 7 5 0 3 0 8 · 생년월일은 이야기를 만드는 데만 쓰고 저장하지 않아요</p>
      </div>
    }>
      {single ? <>
        <PanelHead title="생년월일을 눌러 주세요" />
        {display}
        <div className="pg-birth-opts">{cal}{hour}</div>
      </> : <PanelHead title={'생년월일을\n눌러 주세요'} sub="숫자 여덟 자리면 바로 다음으로 갈 수 있어요" />}
      <div className="pg-keypad pg-birth-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0'].map((k) => (
          <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'back' ? '지우기' : k}>{k === 'back' ? <Delete size={26} /> : k}</button>
        ))}
        <button type="button" onClick={() => { setDigits(''); setError(null) }} aria-label="모두 지우기">지움</button>
      </div>
      {error && <p className="pg-error-text" role="alert">{error}</p>}
      {!single && <p className="pg-muted pg-birth-note">예) 1975년 3월 8일 → 19750308 · 생년월일은 이야기를 만드는 데만 쓰고 저장하지 않아요</p>}
      <div className="pg-actions">
        <button type="button" className="pg-btn pg-btn--line" onClick={onBack}>처음으로</button>
        <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" disabled={!birth} onClick={go}>다음 · 사진 찍기<span aria-hidden="true">→</span></button>
      </div>
      {hourOpen && (
        <Modal label="태어난 시간" onClose={() => setHourOpen(false)}>
          <h3>태어난 시간</h3>
          <p>모르시면 「모름」으로 두셔도 돼요. 세 기둥으로 이야기를 만들어요.</p>
          <div className="pg-birth-hours">
            <button type="button" aria-pressed={hourIndex == null} onClick={() => { setHourIndex(null); setHourOpen(false) }}>모름</button>
            {FG_HOURS.map((h, i) => <button key={h.label} type="button" aria-pressed={hourIndex === i} onClick={() => { setHourIndex(i); setHourOpen(false) }}><b>{h.label}</b><small>{h.range}</small></button>)}
          </div>
        </Modal>
      )}
    </Split>
  )
}
