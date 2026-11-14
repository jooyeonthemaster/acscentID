'use client'
/* eslint-disable @next/next/no-img-element -- 화면의 그림은 모두 기기 안에서 만든 data: 그림이라 next/image 를 거치지 않는다 */

// 펀그라운드 별내 「FUTURE NEWS! 2046 별내 신문」 — 가로 1920×1080 화면(32인치 가로 터치스크린 · 가로 카메라). 인화만 세로 4×6.
// 시작 → 사진 찍기(1~4명, 3-2-1, 다시 찍기) → 질문 셋(꿈 8 · 좋아하는 것 6 · 해 보고 싶은 일 6 — 눌러 고르기만, 글자 입력 없음)
//   → 만드는 중 → 결과(20년 뒤 신문 1면) → 신문 인쇄하기(미리보기 + QR) · 다시 찍기 · 처음으로.
// 사람 분리는 LATER! · THEME! 과 같은 cutoutWebcamPerson(기기 안 MediaPipe + MODNet, src/lib/funground/cutout.ts) — 사진을 확인하는 순간 시작해 질문에 답하는 동안 끝낸다.
// 얼굴은 바꾸지 않고, 신문 사진 칸 위에는 아무것도 얹지 않는다(news-print.ts).
// engine=local(B안): 기사도 이 기기에서 미리 쓴 틀로(news-template.ts) — 외부 AI 서비스를 부르지 않는다.
// engine=ai(A안): 대답 셋(목록 id)만 /api/funground/news 로 보내 AI 기자가 쓴 기사를 받는다. 사진은 보내지 않는다.
//   실패 · 하루 상한(429) · 연결 끊김이면 B안 기사로 대신하고 한 줄 알린다. 같은 대답으로 다시 찍으면 기사는 다시 받지 않는다.
// 사진은 이 화면 메모리에만 있다. 예외: 브라우저 데모에서 「신문 인쇄하기」를 누르면 그 4×6 한 장만 QR 받기용으로 우리 서버에 올린다(FgPrintButton, 24시간).
// 카메라: 데모는 웹캠, 설치 기기는 주소에 camera=dslr. 인쇄: 부스 앱(설치 기기)이면 boothShell.print, 브라우저면 FgPrintButton.

import {
  ArrowLeft, BookOpen, Building2, Camera, CameraOff, Check, ChefHat, FlaskConical, Gamepad2, Globe, Hammer, HeartHandshake, Home,
  Lightbulb, Loader2, Music, Newspaper, NotebookPen, Palette, PawPrint, Printer, RefreshCw, Rocket, RotateCcw, ScanFace,
  ShieldCheck, Smile, Sparkles, Star, Stethoscope, Timer, Trees, Users, Volleyball, type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { FgPrintButton, type FgPrintable } from '@/components/funground/FgResultSheet'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import { useCamera } from '@/app/booth/programs/use-camera'
import { getBoothShell } from '@/lib/photobooth/booth-shell'
import { cutoutWebcamPerson, warmupWebcamCutout } from '@/lib/funground/cutout'
import { loadArtImage } from '@/lib/funground/theme-photo'
import {
  NEWS_DISCLAIMER, NEWS_DREAMS, NEWS_DREAM_BY_ID, NEWS_LIKES, NEWS_LIKE_BY_ID, NEWS_SCENE_ART, NEWS_WISHES, NEWS_WISH_BY_ID,
  buildNewsStory, newsDateline, newsMemoRows,
  type NewsAnswers, type NewsDreamId, type NewsLikeId, type NewsSceneId, type NewsStory, type NewsWishId,
} from '@/lib/funground/news-template'
import { drawNewsPrint } from './news-print'
import './news.css'

type Engine = 'ai' | 'local'
type Step = 'intro' | 'camera' | 'review' | 'dream' | 'like' | 'wish' | 'making' | 'result'
type PrintState = 'idle' | 'sending' | 'sent' | 'failed'
type QuestionKey = 'dream' | 'like' | 'wish'

const TONE = '#c4372c'
/** 찍는 사진 비율(가로 16:9) — 미리보기에 보인 만큼만 찍는다(LATER! 과 같음) */
const SHOT_ASPECT = 16 / 9
const IDLE_SECONDS = 90
/** 인물 면적이 이보다 작으면 사람을 못 찾은 것으로 본다 */
const MIN_COVERAGE = 0.02
/** 만드는 중 화면을 최소 이만큼은 보여 준다(너무 빨리 지나가면 무엇을 했는지 모른다) */
const MIN_MAKING_MS = { local: 2600, ai: 3200 } as const
const AI_TIMEOUT_MS = 35_000
const STEP_DOTS: Step[] = ['camera', 'dream', 'like', 'wish', 'making', 'result']
const SHARED_PRIVACY = '인쇄 · QR 받기를 누를 때만 결과를 올려 24시간 보관해요'
/** 시작 화면 견본 신문의 대답 */
const SAMPLE: NewsAnswers = { dream: 'space', like: 'stars', wish: 'town' }

const DREAM_ICON: Record<NewsDreamId, LucideIcon> = {
  inventor: FlaskConical, space: Rocket, artist: Palette, musician: Music, athlete: Volleyball, healer: Stethoscope, chef: ChefHat, game: Gamepad2,
}
const LIKE_ICON: Record<NewsLikeId, LucideIcon> = { animals: PawPrint, nature: Trees, books: BookOpen, friends: Users, making: Hammer, stars: Star }
const WISH_ICON: Record<NewsWishId, LucideIcon> = { earth: Globe, help: HeartHandshake, smile: Smile, town: Building2, new: Lightbulb, together: Users }

const QUESTIONS: Record<QuestionKey, { no: number; title: string; sub: string; label: string }> = {
  dream: { no: 1, title: '내 꿈은?', sub: '20년 뒤의 나는 어떤 일을 하고 있을까요?', label: '내 꿈' },
  like: { no: 2, title: '내가 좋아하는 것은?', sub: '기사 속 어린 시절 추억이 돼요.', label: '좋아하는 것' },
  wish: { no: 3, title: '세상에 해 보고\n싶은 일은?', sub: '신문 1면 제목이 될 멋진 일이에요.', label: '해 보고 싶은 일' },
}

const noSubscribe = () => () => {}
const readEngine = (): Engine => (new URLSearchParams(window.location.search).get('engine') === 'ai' ? 'ai' : 'local')
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const answersKey = (a: NewsAnswers) => `${a.dream}/${a.like}/${a.wish}`

/** 가운데를 남기고 비율에 맞춰 자른다 */
function cropToAspect(src: HTMLCanvasElement, aspect: number): HTMLCanvasElement {
  const { width: w, height: h } = src
  let cw = w
  let ch = Math.round(w / aspect)
  if (ch > h) { ch = h; cw = Math.round(h * aspect) }
  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  out.getContext('2d')!.drawImage(src, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, cw, ch)
  return out
}

/** 사람만 오려 내기 — 못 찾으면 'no-person' 을 던진다 */
async function cutoutShot(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const { canvas: person, coverage } = await cutoutWebcamPerson(canvas)
  if (coverage < MIN_COVERAGE) throw new Error('no-person')
  return person
}

/** A안 — AI 기자에게 대답 셋만 보낸다. 무엇이 실패하든 B안 기사 + 알림 한 줄 */
async function fetchAiStory(answers: NewsAnswers): Promise<{ story: NewsStory; ai: boolean; note: string | null }> {
  const local = buildNewsStory(answers)
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
    const res = await fetch('/api/funground/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timer))
    const data = (await res.json().catch(() => null)) as { success?: boolean; fallback?: boolean; story?: NewsStory } | null
    if (res.ok && data?.success && data.story) {
      return data.fallback
        ? { story: data.story, ai: false, note: '지금은 AI 기자의 기사를 받지 못해 미리 써 둔 기사로 보여 드려요.' }
        : { story: data.story, ai: true, note: null }
    }
    return {
      story: local,
      ai: false,
      note: res.status === 429 ? '오늘 AI 기사 횟수를 다 써서 미리 써 둔 기사로 보여 드려요.' : '지금은 AI 기자의 기사를 받지 못해 미리 써 둔 기사로 보여 드려요.',
    }
  } catch {
    return { story: local, ai: false, note: '연결이 끊겨 미리 써 둔 기사로 보여 드려요.' }
  }
}

/** 취재 수첩 — 찍은 사진 · 지금까지 고른 대답 */
function Memo({ shot, values, now }: { shot: string | null; values: Record<QuestionKey, string | null>; now: QuestionKey }) {
  return (
    <div className="fnw-memo">
      <p className="fnw-memo-head"><NotebookPen size={30} aria-hidden="true" />취재 수첩</p>
      <div className="fnw-memo-body">
        {shot && <img src={shot} alt="1면에 실릴 사진" />}
        <dl>
          {(Object.keys(QUESTIONS) as QuestionKey[]).map((key) => (
            <div key={key} data-now={key === now || undefined} data-empty={!values[key] || undefined}>
              <dt>{QUESTIONS[key].label}</dt>
              <dd>{values[key] ?? (key === now ? '고르는 중' : '—')}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

/** 질문 화면 — 왼쪽 카드 / 오른쪽 질문 · 수첩 · 이전 · 다음 */
function Question<Id extends string>({ q: key, options, icons, value, onPick, onBack, onNext, dots, memo }: {
  q: QuestionKey
  options: { id: Id; label: string; line: string }[]
  icons: Record<string, LucideIcon>
  value: Id | null
  onPick: (id: Id) => void
  onBack: () => void
  onNext: () => void
  dots: ReactNode
  memo: ReactNode
}) {
  const q = QUESTIONS[key]
  return (
    <section className="fg-split fnw-ask">
      <ul className="fnw-options" data-count={options.length} aria-label={q.title.replace('\n', ' ')}>
        {options.map((o) => {
          const Icon = icons[o.id]
          const on = value === o.id
          return (
            <li key={o.id}>
              <button type="button" className="fnw-option" data-on={on} aria-pressed={on} onClick={() => onPick(o.id)}>
                {on && <Check className="fnw-check" size={40} strokeWidth={3.2} aria-hidden="true" />}
                <span className="fnw-option-icon"><Icon size={56} strokeWidth={2.2} aria-hidden="true" /></span>
                <b>{o.label}</b>
                <small>{o.line}</small>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="fg-panel fnw-panel">
        {dots}
        <p className="fnw-qno">질문 {q.no} / 3</p>
        <h2 className="fg-title fg-title--md">{q.title}</h2>
        <p className="fnw-sub">{q.sub}</p>
        {memo}
        <div className="fg-actions fg-actions--row fnw-cta">
          <button type="button" className="fg-btn fg-btn--ghost fnw-back" onClick={onBack}><ArrowLeft size={40} aria-hidden="true" />이전</button>
          <button type="button" className="fg-btn fg-btn--primary" disabled={!value} onClick={onNext}>
            {value ? (key === 'wish' ? <><Newspaper size={44} aria-hidden="true" />신문 만들기</> : '다음 질문') : '하나를 골라 주세요'}
          </button>
        </div>
      </div>
    </section>
  )
}

export function FungroundNews() {
  const engine = useSyncExternalStore(noSubscribe, readEngine, () => null)
  const [step, setStep] = useState<Step>('intro')
  const [dream, setDream] = useState<NewsDreamId | null>(null)
  const [like, setLike] = useState<NewsLikeId | null>(null)
  const [wish, setWish] = useState<NewsWishId | null>(null)
  const [shot, setShot] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null)
  const [result, setResult] = useState<{ image: string; story: NewsStory } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [sample, setSample] = useState<string | null>(null)
  /** 만드는 중 — 끝난 일(사람 오려 내기 · 기사) */
  const [progress, setProgress] = useState({ cutout: false, story: false })
  const [printState, setPrintState] = useState<PrintState>('idle')
  // 브라우저에서만 정하는 값 — 서버에서 그릴 때는 engine 이 null 이라 화면이 비어 있어 어긋나지 않는다
  const [allowDslr] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('camera') === 'dslr')
  /** 부스 앱(설치 기기)이면 프린터로 바로 — 브라우저면 미리보기 · QR 창 */
  const [hasShell] = useState(() => typeof window !== 'undefined' && getBoothShell() !== null)
  /** 오늘(화면을 연 날) */
  const [today] = useState<Date | null>(() => (typeof window === 'undefined' ? null : new Date()))
  /** 사진을 확인한 순간 시작한 사람 오려 내기 */
  const cutoutJob = useRef<{ of: HTMLCanvasElement; job: Promise<HTMLCanvasElement> } | null>(null)
  /** 대답별 기사(A안 — 다시 찍어도 다시 받지 않는다) */
  const stories = useRef(new Map<string, Promise<{ story: NewsStory; ai: boolean; note: string | null }>>())
  const backdrops = useRef(new Map<NewsSceneId, Promise<HTMLImageElement | null>>())

  const ai = engine === 'ai'
  const answers = useMemo<NewsAnswers | null>(() => (dream && like && wish ? { dream, like, wish } : null), [dream, like, wish])


  const backdrop = useCallback((scene: NewsSceneId) => {
    let job = backdrops.current.get(scene)
    if (!job) {
      job = loadArtImage(NEWS_SCENE_ART[scene])
      backdrops.current.set(scene, job)
    }
    return job
  }, [])

  // 시작 화면 견본 신문(사람 자리 표시)
  useEffect(() => {
    if (!today || !engine) return
    let alive = true
    ;(async () => {
      const scene = NEWS_DREAM_BY_ID[SAMPLE.dream].scene
      const canvas = await drawNewsPrint({
        story: buildNewsStory(SAMPLE), memo: newsMemoRows(SAMPLE), dateline: newsDateline(today), today, scene,
        backdrop: await backdrop(scene), cutout: null, byline: ai ? '글 · AI 기자(상상 기사)' : '글 · 미래 신문 편집부',
      })
      if (alive) setSample(canvas.toDataURL('image/jpeg', 0.86))
    })().catch((cause) => console.warn('[funground-news] 견본을 그리지 못했어요:', cause))
    return () => { alive = false }
  }, [today, engine, ai, backdrop])

  const printable = useMemo<FgPrintable | null>(
    () => (result ? { image: result.image, label: ai ? 'AI 미래 신문' : '2046 별내 신문', fileName: 'funground-future-news', printer: 'photo' } : null),
    [result, ai],
  )

  const { state: camState, error: camError, retry: camRetry, source: camSource, videoRef, liveRef, still: takeStill } = useCamera({ enabled: step === 'camera', allowDslr })

  const reset = useCallback(() => {
    setStep('intro'); setDream(null); setLike(null); setWish(null); setShot(null); setResult(null); setNotice(null); setError(null)
    setCount(null); setPrintState('idle'); setProgress({ cutout: false, story: false })
    cutoutJob.current = null
  }, [])
  const home = useFgHome(reset)

  // 카메라 화면부터 사람 분리 모델을 미리 올린다
  useEffect(() => {
    if (step === 'camera') warmupWebcamCutout().catch(() => undefined)
  }, [step])

  // 무입력이면 처음으로 — 찍는 중 · 만드는 중에는 세지 않는다
  useEffect(() => {
    if (step === 'intro' || step === 'making' || count !== null) return
    let timer = window.setTimeout(home, IDLE_SECONDS * 1000)
    const poke = () => { window.clearTimeout(timer); timer = window.setTimeout(home, IDLE_SECONDS * 1000) }
    window.addEventListener('pointerdown', poke)
    return () => { window.clearTimeout(timer); window.removeEventListener('pointerdown', poke) }
  }, [step, count, home])

  // 3-2-1 → 찍기
  const capture = useCallback(async () => {
    try {
      const canvas = cropToAspect(await takeStill(), SHOT_ASPECT)
      setShot({ canvas, url: canvas.toDataURL('image/jpeg', 0.9) })
      setStep('review')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '사진을 찍지 못했어요.')
    }
  }, [takeStill])
  useEffect(() => {
    if (count === null) return
    const t = window.setTimeout(() => {
      if (count > 1) { setCount(count - 1); return }
      setCount(null)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 260)
      void capture()
    }, 1000)
    return () => window.clearTimeout(t)
  }, [count, capture])

  // 고른 꿈의 사진 칸 배경을 미리 불러 둔다
  useEffect(() => {
    if (dream) void backdrop(NEWS_DREAM_BY_ID[dream].scene)
  }, [dream, backdrop])

  const storyFor = useCallback((a: NewsAnswers) => {
    if (!ai) return Promise.resolve({ story: buildNewsStory(a), ai: false, note: null })
    const key = answersKey(a)
    let job = stories.current.get(key)
    if (!job) {
      job = fetchAiStory(a)
      stories.current.set(key, job)
    }
    return job
  }, [ai])

  /** 만들기 — 사람 오려 내기(이미 시작됨) + 기사 → 신문 1면 */
  const make = useCallback(async (a: NewsAnswers) => {
    const job = cutoutJob.current
    if (!job || !today || !engine) return
    setStep('making'); setError(null); setNotice(null); setProgress({ cutout: false, story: false })
    const started = Date.now()
    const storyJob = storyFor(a).then((s) => { setProgress((p) => ({ ...p, story: true })); return s })
    try {
      const person = await job.job
      setProgress((p) => ({ ...p, cutout: true }))
      const [{ story, ai: byAi, note }, art] = await Promise.all([storyJob, backdrop(NEWS_DREAM_BY_ID[a.dream].scene)])
      const canvas = await drawNewsPrint({
        story, memo: newsMemoRows(a), dateline: newsDateline(today), today, scene: NEWS_DREAM_BY_ID[a.dream].scene,
        backdrop: art, cutout: person, byline: byAi ? '글 · AI 기자(상상 기사)' : '글 · 미래 신문 편집부',
      })
      const wait = MIN_MAKING_MS[engine] - (Date.now() - started)
      if (wait > 0) await sleep(wait)
      setResult({ image: canvas.toDataURL('image/jpeg', 0.92), story })
      setNotice(note)
      setPrintState('idle')
      setStep('result')
    } catch (cause) {
      console.warn('[funground-news] 만들기 실패:', cause)
      cutoutJob.current = null
      setShot(null)
      setError(cause instanceof Error && cause.message === 'no-person'
        ? '사람을 찾지 못했어요. 화면 가운데 점선 안에 서서 다시 찍어 주세요.'
        : '신문을 만들지 못했어요. 다시 찍어 주세요.')
      setStep('camera')
    }
  }, [today, engine, storyFor, backdrop])

  /** 사진 확인 — 사람 오려 내기를 바로 시작하고, 대답이 다 있으면(다시 찍기) 곧장 만든다 */
  const confirmPhoto = () => {
    if (!shot) return
    const job = cutoutShot(shot.canvas)
    job.catch(() => undefined)
    cutoutJob.current = { of: shot.canvas, job }
    if (answers) void make(answers)
    else setStep('dream')
  }

  const retake = () => {
    setShot(null); setResult(null); setError(null); setPrintState('idle'); setNotice(null)
    cutoutJob.current = null
    setStep('camera')
  }

  /** 설치 기기(부스 앱)만 — 브라우저는 FgPrintButton 창이 맡는다 */
  const print = async () => {
    const shell = getBoothShell()
    if (!result || !shell || printState === 'sending' || printState === 'sent') return
    setPrintState('sending')
    try {
      const res = await shell.print(result.image)
      setPrintState(res.ok ? 'sent' : 'failed')
    } catch {
      setPrintState('failed')
    }
  }

  const dots = useMemo(() => {
    const now = step === 'review' ? 'camera' : step
    const at = STEP_DOTS.indexOf(now)
    return STEP_DOTS.map((s, i) => (i < at ? 'done' : s === now ? 'now' : 'todo'))
  }, [step])

  if (!engine) return null

  const kicker = ai ? 'AI 기자가 쓰는 미래 신문' : '미래 신문 · 체험 프로그램'
  const privacy = ai ? '사진은 신문에만 쓰고 AI에 보내지 않아요' : '외부 AI 서비스로 보내지 않아요'
  const year = today ? newsDateline(today).year : new Date().getFullYear() + 20

  const memoValues: Record<QuestionKey, string | null> = {
    dream: dream ? NEWS_DREAM_BY_ID[dream].label : null,
    like: like ? NEWS_LIKE_BY_ID[like].label : null,
    wish: wish ? NEWS_WISH_BY_ID[wish].label : null,
  }

  const stepDots = (
    <ol className="fg-steps fnw-steps" aria-label="진행 단계">
      {dots.map((state, i) => <li key={i} data-state={state} />)}
    </ol>
  )

  const privacyBlock = (small = false) => (
    <div className={`fnw-privacy${small ? ' fnw-privacy--sm' : ''}`}>
      <p><ShieldCheck size={small ? 26 : 30} aria-hidden="true" />{privacy}</p>
      <p><Printer size={small ? 26 : 30} aria-hidden="true" />{SHARED_PRIVACY}</p>
    </div>
  )

  return (
    <FgStage onHome={home} tone={TONE} className="fnw">
      {step === 'intro' && (
        <section className="fg-split fnw-intro">
          <div className="fnw-papers" aria-hidden="true">
            <span className="fnw-paper fnw-paper--back" />
            <span className="fnw-paper fnw-paper--front">{sample ? <img src={sample} alt="" /> : <Loader2 className="fnw-spin" size={64} />}</span>
          </div>
          <div className="fg-panel fnw-panel fnw-intro-panel">
            <p className="fg-kicker">{kicker}</p>
            <h1 className="fnw-hero">FUTURE NEWS!<span>{year} 별내 신문</span></h1>
            <p className="fg-lead">오늘의 나를 찍고 질문 세 개에 답하면{'\n'}20년 뒤 신문 1면에 내가 실려요.</p>
            <ul className="fnw-badges">
              <li><Newspaper size={30} aria-hidden="true" />{ai ? 'AI 기자가 쓰는 기사' : '대답대로 쓰는 기사'}</li>
              <li><ScanFace size={30} aria-hidden="true" />얼굴은 그대로</li>
              <li><Printer size={30} aria-hidden="true" />4×6 인화</li>
            </ul>
            <p className="fg-fun fnw-fun">{NEWS_DISCLAIMER}</p>
            {privacyBlock()}
            <button type="button" className="fg-btn fg-btn--primary fnw-cta" onClick={() => setStep('camera')}><Camera size={44} aria-hidden="true" />시작하기</button>
          </div>
        </section>
      )}

      {step === 'camera' && (
        <section className="fg-split fnw-shot">
          <div className="fnw-left">
            <div className="fnw-view">
              {camSource === 'dslr'
                ? <canvas ref={liveRef} className="fnw-feed" />
                : <video ref={videoRef} className="fnw-feed fnw-feed--mirror" muted playsInline autoPlay />}
              {camState === 'ready' && <div className="fnw-guide" aria-hidden="true"><span>1~4명 · 얼굴이 점선 안에</span></div>}
              {camState === 'starting' && <div className="fnw-view-msg"><Loader2 className="fnw-spin" size={64} />카메라를 켜는 중…</div>}
              {camState === 'error' && (
                <div className="fnw-view-msg">
                  <CameraOff size={72} aria-hidden="true" />
                  <p>{camError}</p>
                  <button type="button" className="fg-btn fg-btn--ghost fnw-btn-light" onClick={camRetry}><RefreshCw size={36} aria-hidden="true" />다시 시도</button>
                </div>
              )}
              {count !== null && count > 0 && <div className="fnw-count" key={count}>{count}</div>}
              {flash && <div className="fnw-flash" />}
            </div>
            <ul className="fnw-tips">
              <li><Users size={30} aria-hidden="true" />1~4명 함께</li>
              <li><ScanFace size={30} aria-hidden="true" />얼굴이 가려지지 않게</li>
              <li><Timer size={30} aria-hidden="true" />3초 뒤 찰칵</li>
            </ul>
          </div>
          <div className="fg-panel fnw-panel">
            {stepDots}
            <h2 className="fg-title fg-title--md">1면에 실릴{'\n'}사진을 찍어요</h2>
            <p className="fnw-sub">사진 속 사람만 오려 {year}년의{'\n'}미래 장면에 넣어요. 얼굴은 그대로예요.</p>
            {error && <div className="fnw-error" role="alert">{error}</div>}
            {privacyBlock(true)}
            <button type="button" className="fg-btn fg-btn--primary fnw-cta" disabled={camState !== 'ready' || count !== null} onClick={() => { setError(null); setCount(3) }}>
              <Camera size={44} aria-hidden="true" />{count !== null ? '곧 찍어요!' : '찍기 · 3초 뒤'}
            </button>
          </div>
        </section>
      )}

      {step === 'review' && shot && (
        <section className="fg-split fnw-shot">
          <div className="fnw-left">
            <div className="fnw-view"><img src={shot.url} alt="방금 찍은 사진" className="fnw-feed" /></div>
          </div>
          <div className="fg-panel fnw-panel">
            {stepDots}
            <h2 className="fg-title fg-title--md">이 사진을{'\n'}1면에 실을까요?</h2>
            <p className="fnw-sub">모두의 얼굴이 잘 보이면{'\n'}「이 사진으로」를 눌러 주세요.</p>
            <div className="fg-actions fnw-cta">
              <button type="button" className="fg-btn fg-btn--primary" onClick={confirmPhoto}>
                <Check size={44} strokeWidth={3} aria-hidden="true" />{answers ? '이 사진으로 신문 만들기' : '이 사진으로 · 질문하러 가기'}
              </button>
              <button type="button" className="fg-btn fg-btn--ghost" onClick={retake}><RotateCcw size={40} aria-hidden="true" />다시 찍기</button>
            </div>
          </div>
        </section>
      )}

      {step === 'dream' && (
        <Question q="dream" options={NEWS_DREAMS} icons={DREAM_ICON} value={dream} onPick={setDream} onBack={retake} onNext={() => setStep('like')} dots={stepDots}
          memo={<Memo shot={shot?.url ?? null} values={memoValues} now="dream" />} />
      )}
      {step === 'like' && (
        <Question q="like" options={NEWS_LIKES} icons={LIKE_ICON} value={like} onPick={setLike} onBack={() => setStep('dream')} onNext={() => setStep('wish')} dots={stepDots}
          memo={<Memo shot={shot?.url ?? null} values={memoValues} now="like" />} />
      )}
      {step === 'wish' && (
        <Question q="wish" options={NEWS_WISHES} icons={WISH_ICON} value={wish} onPick={setWish} onBack={() => setStep('like')} onNext={() => { if (answers) void make(answers) }} dots={stepDots}
          memo={<Memo shot={shot?.url ?? null} values={memoValues} now="wish" />} />
      )}

      {step === 'making' && (
        <section className="fg-split fnw-shot" aria-live="polite">
          <div className="fnw-left">
            <div className="fnw-view fnw-view--busy">
              {shot && <img src={shot.url} alt="" className="fnw-feed" />}
              <div className="fnw-view-msg"><div className="fg-spin" /></div>
            </div>
          </div>
          <div className="fg-panel fnw-panel fnw-making">
            {stepDots}
            <h2 className="fg-title fg-title--md">{year}년 신문을{'\n'}찍는 중</h2>
            <ul className="fnw-jobs">
              <li data-done={progress.cutout || undefined}>
                {progress.cutout ? <Check size={40} strokeWidth={3} aria-hidden="true" /> : <Loader2 className="fnw-spin" size={40} aria-hidden="true" />}
                <span>사진에서 사람만 오려 내기<small>이 기기 안에서 · 얼굴은 그대로</small></span>
              </li>
              <li data-done={progress.story || undefined}>
                {progress.story ? <Check size={40} strokeWidth={3} aria-hidden="true" /> : <Loader2 className="fnw-spin" size={40} aria-hidden="true" />}
                <span>{ai ? 'AI 기자가 기사 쓰기' : '대답으로 기사 쓰기'}<small>{ai ? '대답 세 개만 보내요 · 사진은 보내지 않아요' : '미리 써 둔 기사 틀에서 · 이 기기 안에서'}</small></span>
              </li>
              <li>
                <Loader2 className="fnw-spin" size={40} aria-hidden="true" />
                <span>신문 1면 찍기<small>4×6 사진 크기로</small></span>
              </li>
            </ul>
            {privacyBlock(true)}
          </div>
        </section>
      )}

      {step === 'result' && result && (
        <section className="fg-split fnw-result">
          <div className="fnw-print"><img src={result.image} alt={`${year} 별내 미래 신문 — ${result.story.headline}`} /></div>
          <div className="fg-panel fnw-panel">
            {stepDots}
            <h2 className="fnw-result-title">완성! <span>{year} 별내 신문</span></h2>
            <blockquote className="fnw-headline">
              <small>{result.story.kicker}</small>
              {result.story.headline}
              <span>{result.story.subhead}</span>
            </blockquote>
            {/* 화면에는 앞 네 줄만(알림이 있으면 세 줄) — 전체 기사는 신문에 */}
            <p className="fnw-article" data-short={notice ? true : undefined}>{result.story.article.join(' ')}</p>
            {notice && <p className="fnw-notice" role="status">{notice}</p>}
            <p className="fg-fun fnw-fun"><Sparkles size={28} aria-hidden="true" />{NEWS_DISCLAIMER}</p>
            {printState === 'sent' && <p className="fnw-sub" role="status">프린터로 보냈어요. 1분쯤 뒤 출구에서 나와요.</p>}
            {printState === 'failed' && <div className="fnw-error" role="alert">지금은 인쇄할 수 없어요. 직원에게 프린터 확인을 요청해 주세요.</div>}
            <div className="fnw-result-actions fnw-cta">
              {hasShell ? (
                <button type="button" className="fg-btn fg-btn--primary" onClick={() => void print()} disabled={printState === 'sending' || printState === 'sent'}>
                  {printState === 'sending' ? <Loader2 className="fnw-spin" size={44} /> : <Printer size={44} aria-hidden="true" />}
                  {printState === 'sent' ? '인쇄 보냄' : '신문 인쇄하기'}
                </button>
              ) : (
                <FgPrintButton printable={printable} label="신문 인쇄하기" />
              )}
              <button type="button" className="fg-btn fg-btn--ghost" onClick={retake}><RotateCcw size={40} aria-hidden="true" />다시 찍기</button>
              <button type="button" className="fg-btn fg-btn--ghost" onClick={home}><Home size={40} aria-hidden="true" />처음으로</button>
            </div>
            {privacyBlock(true)}
          </div>
        </section>
      )}
    </FgStage>
  )
}
