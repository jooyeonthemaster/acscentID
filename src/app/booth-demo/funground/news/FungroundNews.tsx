'use client'
/* eslint-disable @next/next/no-img-element -- 화면의 그림은 기기 안에서 만든 data: 그림 · public/ 의 고정 사진이라 next/image 를 거치지 않는다 */

// 펀그라운드 별내 「FUTURE NEWS! 2046 별내 신문」 — 가로 1920×1080 화면(32인치 가로 터치스크린 · 가로 카메라). 인화만 세로 4×6.
// 시작 → 사진 찍기(1~4명, 3-2-1, 다시 찍기) → 질문 셋(꿈 8 · 좋아하는 것 6 · 해 보고 싶은 일 6 — 눌러 고르기만, 글자 입력 없음)
//   → 만드는 중 → 결과(20년 뒤 신문 1면) → 인쇄하기 · QR로 받기(미리보기 + QR) · 다시 찍기 · 처음으로.
// 화면 모양: 「FUN GROUND Editorial」 테마(2026-11-16 목업 news_1~3 — FgStage program="news", 강조색 #FF2E4D).
//   위 막대 단계 — 01 시작 · 02 촬영 ~ 만드는 중 · 03 결과.
// 사람 분리는 LATER! · THEME! 과 같은 cutoutWebcamPerson(기기 안 MediaPipe + MODNet, src/lib/funground/cutout.ts) — 사진을 확인하는 순간 시작해 질문에 답하는 동안 끝낸다.
// 얼굴은 바꾸지 않고, 신문 사진 칸 위에는 아무것도 얹지 않는다(news-print.ts).
// engine=local(B안): 기사도 이 기기에서 미리 쓴 틀로(news-template.ts) — 외부 AI 서비스를 부르지 않는다.
// engine=ai(A안): 대답 셋(목록 id)만 /api/funground/news 로 보내 AI 기자가 쓴 기사를 받는다. 사진은 보내지 않는다.
//   실패 · 하루 상한(429) · 연결 끊김이면 B안 기사로 대신하고 한 줄 알린다. 같은 대답으로 다시 찍으면 기사는 다시 받지 않는다.
// 사진은 이 화면 메모리에만 있다. 예외: 브라우저 데모에서 「인쇄하기 · QR로 받기」를 누르면 그 4×6 한 장만 QR 받기용으로 우리 서버에 올린다(FgResultButtons, 24시간).
// 카메라: 데모는 웹캠, 설치 기기는 주소에 camera=dslr. 인쇄: 부스 앱(설치 기기)이면 boothShell.print, 브라우저면 FgResultButtons.

import {
  BookOpen, Building2, Camera, CameraOff, Check, Globe, Hammer, HeartHandshake,
  Lightbulb, Loader2, PawPrint, RefreshCw, RotateCcw, Smile, Star, Trees, Users, type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { FgResultButtons, type FgPrintable } from '@/components/funground/FgResultSheet'
import { FgStage, useFgHome, type FgStep } from '@/components/funground/FgStage'
import { useCamera } from '@/app/booth/programs/use-camera'
import { getBoothShell } from '@/lib/photobooth/booth-shell'
import { cutoutWebcamPerson, warmupWebcamCutout } from '@/lib/funground/cutout'
import { loadArtImage } from '@/lib/funground/theme-photo'
import {
  NEWS_DREAMS, NEWS_DREAM_BY_ID, NEWS_LIKES, NEWS_LIKE_BY_ID, NEWS_SCENE_ART, NEWS_WISHES, NEWS_WISH_BY_ID,
  buildNewsStory, newsDateline, newsMemoRows,
  type NewsAnswers, type NewsDreamId, type NewsLikeId, type NewsSceneId, type NewsStory, type NewsWishId,
} from '@/lib/funground/news-template'
import { drawNewsPrint } from './news-print'
import './news.css'

type Engine = 'ai' | 'local'
type Step = 'intro' | 'camera' | 'review' | 'dream' | 'like' | 'wish' | 'making' | 'result'
type PrintState = 'idle' | 'sending' | 'sent' | 'failed'
type QuestionKey = 'dream' | 'like' | 'wish'

/** 찍는 사진 비율(가로 16:9) — 미리보기에 보인 만큼만 찍는다(LATER! 과 같음) */
const SHOT_ASPECT = 16 / 9
const IDLE_SECONDS = 90
/** 인물 면적이 이보다 작으면 사람을 못 찾은 것으로 본다 */
const MIN_COVERAGE = 0.02
/** 만드는 중 화면을 최소 이만큼은 보여 준다(너무 빨리 지나가면 무엇을 했는지 모른다) */
const MIN_MAKING_MS = { local: 2600, ai: 3200 } as const
const AI_TIMEOUT_MS = 35_000
const SHARED_PRIVACY = '인쇄 · QR 받기를 누를 때만 결과를 올려 24시간 보관해요'
/** 시작 화면 견본 신문의 대답 */
const SAMPLE: NewsAnswers = { dream: 'space', like: 'stars', wish: 'town' }
/** 위 막대 단계 — 시작 · 하기 · 결과 */
const TOP_STEP: Record<Step, FgStep> = { intro: 1, camera: 2, review: 2, dream: 2, like: 2, wish: 2, making: 2, result: 3 }

/** 에디토리얼 사진(개발 때 한 번 만든 그림 — public/assets/booth-programs/funground-editorial) */
const ART = '/assets/booth-programs/funground-editorial'
const HERO_ART = `${ART}/news-hero.webp`
const DREAM_ART: Record<NewsDreamId, string> = {
  inventor: `${ART}/news-dream-inventor.webp`, space: `${ART}/news-dream-space.webp`, artist: `${ART}/news-dream-artist.webp`,
  musician: `${ART}/news-dream-musician.webp`, athlete: `${ART}/news-dream-athlete.webp`, healer: `${ART}/news-dream-healer.webp`,
  chef: `${ART}/news-dream-chef.webp`, game: `${ART}/news-dream-game.webp`,
}
/** 꿈은 사진 카드(꿈마다 장면이 있다) · 좋아하는 것 · 해 보고 싶은 일은 가는 선 아이콘 카드(A~F) */
const LIKE_ICON: Record<NewsLikeId, LucideIcon> = { animals: PawPrint, nature: Trees, books: BookOpen, friends: Users, making: Hammer, stars: Star }
const WISH_ICON: Record<NewsWishId, LucideIcon> = { earth: Globe, help: HeartHandshake, smile: Smile, town: Building2, new: Lightbulb, together: Users }
const KEYS = 'ABCDEFGH'

const QUESTIONS: Record<QuestionKey, { no: number; title: string; label: string }> = {
  dream: { no: 1, title: '내 꿈은?', label: '꿈' },
  like: { no: 2, title: '내가 좋아하는 것은?', label: '좋아하는 것' },
  wish: { no: 3, title: '세상에 해 보고 싶은 일은?', label: '해 보고 싶은 일' },
}

const noSubscribe = () => () => {}
const readEngine = (): Engine => (new URLSearchParams(window.location.search).get('engine') === 'ai' ? 'ai' : 'local')
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const answersKey = (a: NewsAnswers) => `${a.dream}/${a.like}/${a.wish}`

/** 단추 오른쪽 가는 화살표 */
function Arrow() {
  return (
    <svg className="fge-arrow" viewBox="0 0 96 40" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M2 20h90M74 4l18 16-18 16" />
    </svg>
  )
}

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

/**
 * 질문 화면(목업 news_2) — 위: FUTURE NEWS! 작은 제호 | 「질문 n / 3」 띠 · 큰 질문(빨간 밑줄)
 * 아래: 고르기 카드(꿈 = 사진 카드 4×2, 나머지 = A~F 가는 선 아이콘 카드 3×2) · 오른쪽 좁은 칸(1면 사진 · 고른 대답 · 이전 · 다음)
 */
function Question<Id extends string>({ q: key, options, photos, icons, value, onPick, onBack, onNext, shot, picked }: {
  q: QuestionKey
  options: { id: Id; label: string; line: string }[]
  photos?: Record<string, string>
  icons?: Record<string, LucideIcon>
  value: Id | null
  onPick: (id: Id) => void
  onBack: () => void
  onNext: () => void
  shot: string | null
  picked: Record<QuestionKey, string | null>
}) {
  const q = QUESTIONS[key]
  return (
    <section className="fnw-ask">
      <header className="fnw-askhead">
        <p className="fnw-mark" aria-hidden="true">FUTURE<br />NEWS!</p>
        <div className="fnw-askq">
          <span className="fge-steplabel">질문 {q.no} / 3</span>
          <h2 className="fge-head fnw-q" data-long={q.title.length > 10 || undefined}><u>{q.title}</u></h2>
        </div>
      </header>
      <div className="fnw-askbody">
        <ul className="fnw-cards" data-kind={photos ? 'photo' : 'icon'} aria-label={q.title}>
          {options.map((o, i) => {
            const on = value === o.id
            if (photos) {
              return (
                <li key={o.id}>
                  <button type="button" className="fge-photocard fnw-photocard" aria-pressed={on} onClick={() => onPick(o.id)}>
                    <img src={photos[o.id]} alt="" draggable={false} />
                    <b>{o.label}</b>
                  </button>
                </li>
              )
            }
            const Icon = icons![o.id]
            return (
              <li key={o.id}>
                <button type="button" className="fge-qcard fnw-qcard" aria-pressed={on} onClick={() => onPick(o.id)}>
                  <span className="fge-key" aria-hidden="true">{KEYS[i]}</span>
                  <Icon strokeWidth={1.4} aria-hidden="true" />
                  <b>{o.label}</b>
                  <small>{o.line}</small>
                </button>
              </li>
            )
          })}
        </ul>
        <aside className="fnw-side">
          {shot && <img className="fnw-side-shot" src={shot} alt="1면에 실릴 사진" />}
          <dl className="fnw-picked">
            {(Object.keys(QUESTIONS) as QuestionKey[]).map((k) => (
              <div key={k} data-now={k === key || undefined}>
                <dt>{QUESTIONS[k].label}</dt>
                <dd>{picked[k] ?? '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="fnw-side-actions">
            <button type="button" className="fge-btn fge-btn--ghost fnw-back" onClick={onBack}>이전</button>
            <button type="button" className="fge-btn fnw-next" disabled={!value} onClick={onNext}>
              {key === 'wish' ? '신문 만들기' : '다음'}<Arrow />
            </button>
          </div>
        </aside>
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

  // 시작 화면 견본 신문(사람 자리 표시) — 탁자 사진 위에 눕혀 놓는다(제호 · 제목은 코드로 그린 진짜 지면)
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
        ? '사람을 찾지 못했어요. 괄호 안에 서서 다시 찍어 주세요.'
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

  /** 설치 기기(부스 앱)만 — 브라우저는 FgResultButtons 창이 맡는다 */
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

  if (!engine) return null

  const year = today ? newsDateline(today).year : new Date().getFullYear() + 20
  // B안 표기: 「AI」는 사람 오려 내기(기기 안 AI 인물 인식)에만
  const label = ai ? `${year} 별내 신문 · AI 기자` : `${year} 별내 신문 · AI 인물 인식`
  const privacy = ai ? '사진은 AI에 보내지 않아요 · 대답 셋만 AI 기자에게' : '사진은 이 기기 안에서만 · 외부 AI로 보내지 않아요'

  const picked: Record<QuestionKey, string | null> = {
    dream: dream ? NEWS_DREAM_BY_ID[dream].label : null,
    like: like ? NEWS_LIKE_BY_ID[like].label : null,
    wish: wish ? NEWS_WISH_BY_ID[wish].label : null,
  }

  /** 촬영 · 확인 · 만드는 중 — 왼쪽 16:9 뷰파인더(찍히는 만큼만 보인다) */
  const viewfinder = (inner: ReactNode, tag: string | null) => (
    <div className="fge-cam fnw-cam">
      <div className="fnw-frame">{tag && <span className="fge-camtag">{tag}</span>}{inner}</div>
    </div>
  )

  return (
    <FgStage onHome={home} program="news" step={TOP_STEP[step]} className="fnw">
      {step === 'intro' && (
        <section className="fge-split fnw-intro">
          <div className="fge-hero fnw-table" aria-hidden="true">
            <img src={HERO_ART} alt="" draggable={false} />
            <div className="fnw-paper" data-ready={sample ? true : undefined}>{sample && <img src={sample} alt="" />}</div>
            <span className="fnw-sun" />
          </div>
          <div className="fge-panel fnw-intro-panel">
            <div className="fge-labelrow"><span className="fge-label">{label}</span></div>
            <h1 className="fge-title fnw-title">FUTURE NEWS!</h1>
            <p className="fge-head"><u>20년 뒤 신문 1면의 나</u></p>
            <p className="fge-lead">사진 한 장과 질문 세 개</p>
            <button type="button" className="fge-btn fge-btn--wide fnw-start" onClick={() => setStep('camera')}>시작하기<Arrow /></button>
            <p className="fnw-fine">{privacy}</p>
          </div>
        </section>
      )}

      {step === 'camera' && (
        <section className="fnw-shotgrid">
          {viewfinder(
            <>
              {camSource === 'dslr'
                ? <canvas ref={liveRef} className="fnw-feed" />
                : <video ref={videoRef} className="fnw-feed fnw-feed--mirror" muted playsInline autoPlay />}
              {camState === 'ready' && <div className="fge-brackets" aria-hidden="true"><span /><span /><span /><span /></div>}
              {camState === 'starting' && <div className="fnw-view-msg"><Loader2 className="fnw-spin" size={64} strokeWidth={1.5} />카메라를 켜는 중…</div>}
              {camState === 'error' && (
                <div className="fnw-view-msg">
                  <CameraOff size={72} strokeWidth={1.4} aria-hidden="true" />
                  <p>{camError}</p>
                  <button type="button" className="fge-btn fge-btn--ghost" onClick={camRetry}><RefreshCw size={40} strokeWidth={1.5} aria-hidden="true" />다시 시도</button>
                </div>
              )}
              {flash && <div className="fnw-flash" />}
            </>,
            '밝은 곳에서 정면으로',
          )}
          <div className="fge-panel fnw-panel">
            <span className="fge-steplabel">02 / 촬영</span>
            <h2 className="fge-head">1면에 실릴 <u>사진</u></h2>
            <p className="fge-lead">1~4명 · 얼굴이 괄호 안에</p>
            <p className="fge-count fnw-count" data-idle={count === null || undefined} aria-live="polite">{count ?? 3}</p>
            {error && <p className="fnw-error" role="alert">{error}</p>}
            <button type="button" className="fge-btn fge-btn--wide" disabled={camState !== 'ready' || count !== null} onClick={() => { setError(null); setCount(3) }}>
              {count !== null ? '곧 찍어요' : '찍기'}<Camera size={48} strokeWidth={1.4} aria-hidden="true" />
            </button>
            <p className="fnw-fine">{privacy}</p>
          </div>
        </section>
      )}

      {step === 'review' && shot && (
        <section className="fnw-shotgrid">
          {viewfinder(<img src={shot.url} alt="방금 찍은 사진" className="fnw-feed" />, null)}
          <div className="fge-panel fnw-panel">
            <span className="fge-steplabel">02 / 확인</span>
            <h2 className="fge-head">이 사진을 <u>1면에</u><br />실을까요?</h2>
            <p className="fge-lead">모두의 얼굴이 잘 보이나요?</p>
            <div className="fnw-stack">
              <button type="button" className="fge-btn fge-btn--wide" onClick={confirmPhoto}>{answers ? '이 사진으로 만들기' : '이 사진으로'}<Arrow /></button>
              <button type="button" className="fge-btn fge-btn--wide fge-btn--ghost" onClick={retake}>다시 찍기<RotateCcw size={44} strokeWidth={1.4} aria-hidden="true" /></button>
            </div>
          </div>
        </section>
      )}

      {step === 'dream' && (
        <Question q="dream" options={NEWS_DREAMS} photos={DREAM_ART} value={dream} onPick={setDream} onBack={retake} onNext={() => setStep('like')}
          shot={shot?.url ?? null} picked={picked} />
      )}
      {step === 'like' && (
        <Question q="like" options={NEWS_LIKES} icons={LIKE_ICON} value={like} onPick={setLike} onBack={() => setStep('dream')} onNext={() => setStep('wish')}
          shot={shot?.url ?? null} picked={picked} />
      )}
      {step === 'wish' && (
        <Question q="wish" options={NEWS_WISHES} icons={WISH_ICON} value={wish} onPick={setWish} onBack={() => setStep('like')} onNext={() => { if (answers) void make(answers) }}
          shot={shot?.url ?? null} picked={picked} />
      )}

      {step === 'making' && (
        <section className="fnw-shotgrid" aria-live="polite">
          {viewfinder(<>{shot && <img src={shot.url} alt="" className="fnw-feed fnw-feed--dim" />}</>, null)}
          <div className="fge-panel fnw-panel fnw-making">
            <span className="fge-steplabel">02 / 신문 만들기</span>
            <h2 className="fge-head">{year}년 신문을<br /><u>찍는 중</u></h2>
            <div className="fge-wait">
              <div className="fge-bar"><i /></div>
              <p className="fge-lead">{ai ? 'AI 기자가 기사를 쓰고 있어요' : '이 기기 안에서 신문을 짜고 있어요'}</p>
            </div>
            <ol className="fge-rows fnw-jobs">
              <li data-done={progress.cutout || undefined}>
                <i>{progress.cutout ? <Check size={40} strokeWidth={1.5} aria-label="끝" /> : '01'}</i><b>사람만 오려 내기</b><span>기기 안 · 얼굴 그대로</span>
              </li>
              <li data-done={progress.story || undefined}>
                <i>{progress.story ? <Check size={40} strokeWidth={1.5} aria-label="끝" /> : '02'}</i>
                <b>{ai ? 'AI 기자 기사' : '대답으로 기사'}</b><span>{ai ? '대답 셋만 · 사진은 안 보내요' : '미리 쓴 틀 · 기기 안'}</span>
              </li>
              <li><i>03</i><b>신문 1면 짜기</b><span>4×6 사진 크기</span></li>
            </ol>
          </div>
        </section>
      )}

      {step === 'result' && result && (
        <section className="fnw-result">
          <div className="fnw-desk">
            <img className="fnw-sheet" src={result.image} alt={`${year} 별내 미래 신문 — ${result.story.headline}`} />
          </div>
          <div className="fge-panel fnw-result-panel">
            <div className="fge-labelrow"><span className="fge-label">오늘의 1면</span></div>
            <h2 className="fge-head fnw-headline"><u>{result.story.headline}</u></h2>
            <p className="fnw-subhead">{result.story.subhead}</p>
            {notice && <p className="fnw-notice" role="status">{notice}</p>}
            {printState === 'sent' && <p className="fnw-notice" role="status">프린터로 보냈어요. 1분쯤 뒤 출구에서 나와요.</p>}
            {printState === 'failed' && <p className="fnw-error" role="alert">지금은 인쇄할 수 없어요. 직원에게 프린터 확인을 요청해 주세요.</p>}
            <div className="fnw-result-actions">
              {hasShell ? (
                <div className="fge-actions">
                  <button type="button" className="fge-btn" onClick={() => void print()} disabled={printState === 'sending' || printState === 'sent'}>
                    {printState === 'sending' ? <Loader2 className="fnw-spin" size={48} /> : null}{printState === 'sent' ? '인쇄 보냄' : '인쇄하기'}
                  </button>
                </div>
              ) : (
                <FgResultButtons printable={printable} />
              )}
              <button type="button" className="fnw-retake" onClick={retake}><RotateCcw size={36} strokeWidth={1.5} aria-hidden="true" />다시 찍기</button>
            </div>
            <p className="fnw-fine">{SHARED_PRIVACY}</p>
          </div>
        </section>
      )}
    </FgStage>
  )
}
