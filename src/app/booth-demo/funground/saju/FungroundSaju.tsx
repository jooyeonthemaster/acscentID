'use client'

// 펀그라운드 별내 사주 — 1920×1080 가로 화면(FgStage · 32인치 가로 터치스크린, 노트북 창에서도 같은 배치). 주소의 engine 으로 두 안을 같은 화면에서 보여 준다.
//   engine=local(B안 FORTUNE! 포춘 · 체험 프로그램): 만세력(src/lib/saju)과 풀이 고르기(src/lib/funground/saju-reading.ts)를 모두 이 기기에서 한다 — /api 를 부르지 않는다.
//     'AI'라고 쓰지 않는다.
//   engine=ai(A안 FORTUNE! AI 포춘): /api/funground/fortune 에 생일을 보내 AI 풀이를 받는다. 실패 · 하루 상한(429) · 연결 끊김이면 이 기기에서 미리 쓴 풀이로 대신한다.
// 흐름: 시작 → 사진(3-2-1 · 다시 찍기) → 생일(해 · 달 · 날 숫자 휠, 양력 · 음력 · 윤달) → 태어난 시(모르면 건너뛰기) → 결과 → 인쇄하기 · QR로 받기.
//   성별은 묻지 않는다(원국 · 풀이에 쓰이지 않는다).
// 화면 모양(2026-11-16): 「FUN GROUND Editorial」 테마(FgStage program="fortune" · 강조색 #FF7A1A) — 목업 fortune_1~3
//   위 막대 단계: 시작 = 01 · 사진 ~ 계산 = 02 · 결과 = 03. 목업처럼 해 · 달 · 날은 한 화면의 숫자 휠 셋으로 고른다(고르는 값 · 날짜 검사는 그대로).
//   사진(public/assets/booth-programs/funground-editorial/fortune-*.webp)은 개발 때 한 번 만든 그림 — 실행 중 생성하지 않는다.
// 사진(2026-11-14 사용자 결정: 모든 프로그램에 촬영): 노트북 웹캠(useCamera, DSLR 안 씀)으로 찍어 이 기기 안에서만 결과 화면 · 4×6 사주 카드에 쓴다.
//   AI 에는 보내지 않는다(engine=ai 요청은 생일만). 카메라가 안 될 때만 「사진 없이 계속」(카드는 일간 한자로 채운다).
// 인쇄: 결과가 나오면 4×6 카드(src/lib/funground/saju-card.ts)를 그려 FgResultButtons(미리보기 · QR 창)에 넘긴다.
// 결과는 「재미로 보는 풀이」 — 외모 · 점수 · 순위 · 연애 · 돈 · 향 이야기는 없다.

import { Camera, CameraOff, Check, ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { useCamera } from '@/app/booth/programs/use-camera'
import { FgResultButtons, type FgPrintable } from '@/components/funground/FgResultSheet'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import {
  FG_ELEMENT_HANJA, FG_ELEMENT_WORD, FG_ELEMENTS, FG_HOURS, FG_TOPICS, FG_YEAR, FG_YEAR_GANJI,
  fgLocalSaju, fgSajuChart, type FgBirth, type FgSajuResult,
} from '@/lib/funground/saju-reading'
import { SAJU_PHOTO_ASPECT, renderSajuCard } from '@/lib/funground/saju-card'
import './fg-saju.css'

type Engine = 'local' | 'ai'
type Step = 'intro' | 'photo' | 'date' | 'hour' | 'loading' | 'result'

/** 아무도 누르지 않으면 처음으로 — 입력 중 2분 · 결과 1분 30초 */
const IDLE_ASK_MS = 120_000
const IDLE_RESULT_MS = 90_000
/** 계산 화면을 잠깐 보여 준다(기기 안 계산은 순식간이라 넘어간 줄 모른다) */
const LOCAL_LOADING_MS = 1_600
const AI_MIN_LOADING_MS = 1_200
const AI_TIMEOUT_MS = 55_000
/** 연도 휠 — 1930년부터 올해까지, 처음엔 14살 해(9~19세가 대부분) */
const YEAR_MIN = 1930
const YEAR_START_AGE = 14
/** 찍은 사진 크기(가로 4 : 세로 5 — 카드 사진 칸과 같다) */
const PHOTO_W = 800
const PHOTO_H = Math.round(PHOTO_W / SAJU_PHOTO_ASPECT)
/** 숫자 휠 한 줄 높이(1920×1080 기준) — 보이는 줄은 셋, 가운데가 고른 값 */
const WHEEL_ROW = 160
const HERO = '/assets/booth-programs/funground-editorial/fortune-hero.webp'
const SKY = '/assets/booth-programs/funground-editorial/fortune-sky.webp'
const PILLAR_WORDS = ['時', '日', '月', '年'] as const

/** 아무 입력이 없으면 ms 뒤 onIdle — 누를 때마다 다시 센다 */
function useIdle(active: boolean, ms: number, onIdle: () => void) {
  useEffect(() => {
    if (!active) return
    let timer = window.setTimeout(onIdle, ms)
    const poke = () => { window.clearTimeout(timer); timer = window.setTimeout(onIdle, ms) }
    window.addEventListener('pointerdown', poke)
    window.addEventListener('wheel', poke, { passive: true })
    return () => { window.clearTimeout(timer); window.removeEventListener('pointerdown', poke); window.removeEventListener('wheel', poke) }
  }, [active, ms, onIdle])
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 주소의 engine — 서버에서 그릴 때는 null(아직 모름) */
const noSubscribe = () => () => {}
const readEngine = (): Engine => (new URLSearchParams(window.location.search).get('engine') === 'ai' ? 'ai' : 'local')

/** 그 달의 날 수 — 음력은 30일까지 두고 없는 날(29일까지인 달의 30일)은 다음 단추에서 거른다 */
const monthDays = (y: number, m: number, cal: 'solar' | 'lunar') => (cal === 'lunar' ? 30 : new Date(y, m, 0).getDate())

function todayParts() {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
}

/** 거울 방향 카메라 장면 → 가운데 4:5 사진(미리보기 칸도 4:5 · object-fit: cover 라 같은 범위) */
function cropPortrait(still: HTMLCanvasElement): string {
  const sw = still.width
  const sh = still.height
  const cw = Math.min(sw, sh * SAJU_PHOTO_ASPECT)
  const ch = cw / SAJU_PHOTO_ASPECT
  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_W
  canvas.height = PHOTO_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('사진을 만들지 못했어요.')
  ctx.drawImage(still, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, PHOTO_W, PHOTO_H)
  return canvas.toDataURL('image/jpeg', 0.9)
}

/** 단추 오른쪽 가는 화살표 */
function Arrow() {
  return (
    <svg className="fge-arrow" viewBox="0 0 96 40" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <path d="M2 20h90M72 4l20 16-20 16" />
    </svg>
  )
}

/** 시작 · 계산 화면 왼쪽 — 흑백 하늘 사진 위 時 日 月 年 네 칸(日 = 나, 강조색). busy 면 차례로 깜빡인다 */
function PillarHero({ busy = false }: { busy?: boolean }) {
  return (
    <div className="fge-hero fgsj-hero" data-busy={busy || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO} alt="" />
      <div className="fgsj-tiles" aria-hidden="true">
        {PILLAR_WORDS.map((h) => <span key={h} data-me={h === '日' || undefined}>{h}</span>)}
      </div>
    </div>
  )
}

/** 입력 화면 왼쪽 — 「02 / 생일」 · 큰 머리말 · 한 줄 · 아래 하늘 사진 */
function AskSide({ tag, head, lead }: { tag: string; head: string; lead: string }) {
  return (
    <section className="fgsj-askside">
      <p className="fge-steplabel">{tag}</p>
      <h1 className="fge-head fge-head--xl fgsj-askhead">{head}</h1>
      <p className="fge-lead">{lead}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="fgsj-sky" src={SKY} alt="" />
    </section>
  )
}

interface WheelItem { value: number; text: string; unit: string }

/**
 * 숫자 휠 — 손가락(또는 마우스 휠)으로 넘기면 가운데 줄에 멈추고 그 값을 고른다. 위 · 아래 줄을 누르면 그 값으로 굴러간다.
 * 한 줄 160px(누르는 곳 96px 이상). 고른 줄은 강조색 띠.
 */
function Wheel({ label, items, value, onChange }: { label: string; items: WheelItem[]; value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const latest = useRef({ items, value, onChange })
  useEffect(() => { latest.current = { items, value, onChange } })
  const index = Math.max(0, items.findIndex((it) => it.value === value))
  const first = useRef(true)

  // 값이 바뀌면(처음 · 줄 누르기 · 범위가 줄어 값이 바뀜) 그 줄을 가운데로
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const top = index * WHEEL_ROW
    if (Math.abs(el.scrollTop - top) > 2) el.scrollTo({ top, behavior: first.current ? 'auto' : 'smooth' })
    first.current = false
  }, [index, items.length])

  // 넘기다 멈추면 가운데 줄을 고른다
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer = 0
    const settle = () => {
      const { items: list, value: now, onChange: pick } = latest.current
      const i = Math.min(list.length - 1, Math.max(0, Math.round(el.scrollTop / WHEEL_ROW)))
      if (list[i] && list[i].value !== now) pick(list[i].value)
    }
    const onScroll = () => { window.clearTimeout(timer); timer = window.setTimeout(settle, 120) }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); window.clearTimeout(timer) }
  }, [])

  return (
    <div className="fgsj-wheel">
      <span className="fgsj-wheel-band" aria-hidden="true" />
      <div ref={ref} className="fgsj-wheel-scroll" role="listbox" aria-label={label}>
        {items.map((it) => (
          <button key={it.value} type="button" role="option" aria-selected={it.value === value} className="fgsj-wheel-row"
            onClick={() => onChange(it.value)}>
            <b>{it.text}</b><small>{it.unit}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

export function FungroundSaju() {
  const engine = useSyncExternalStore(noSubscribe, readEngine, () => null)
  const [step, setStep] = useState<Step>('intro')
  const [year, setYear] = useState(() => todayParts().y - YEAR_START_AGE)
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
  const [leap, setLeap] = useState(false)
  const [pickedMonth, setMonth] = useState(1)
  const [pickedDay, setDay] = useState(1)
  const [hourIndex, setHourIndex] = useState<number | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [result, setResult] = useState<FgSajuResult | null>(null)
  /** AI 풀이 대신 미리 쓴 풀이를 보여 줄 때 한 줄 */
  const [notice, setNotice] = useState<string | null>(null)
  /** 이 기기에서 찍은 사진(4:5 data URL) — AI 에 보내지 않는다. null 이면 아직 · 사진 없이 */
  const [photo, setPhoto] = useState<string | null>(null)
  /** 사진 단계에서 방금 찍어 확인 중인 사진 */
  const [shot, setShot] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [shotError, setShotError] = useState<string | null>(null)
  /** 결과마다 그린 4×6 카드 — 다른 결과의 카드는 쓰지 않는다 */
  const [card, setCard] = useState<{ of: FgSajuResult; image: string } | null>(null)

  const reset = useCallback(() => {
    setStep('intro')
    setYear(todayParts().y - YEAR_START_AGE)
    setCalendar('solar')
    setLeap(false)
    setMonth(1)
    setDay(1)
    setHourIndex(null)
    setDateError(null)
    setResult(null)
    setNotice(null)
    setPhoto(null)
    setShot(null)
    setCount(null)
    setShotError(null)
    setCard(null)
  }, [])
  const home = useFgHome(reset)
  useIdle(step !== 'intro' && step !== 'loading' && count === null, step === 'result' ? IDLE_RESULT_MS : IDLE_ASK_MS, home)

  // 사진 — 사진 단계에서만 카메라를 켠다(넘어가면 끈다). 노트북 웹캠 · DSLR 은 찾지 않는다
  const { state: camState, error: camError, retry: camRetry, videoRef: camVideoRef, still: takeStill } = useCamera({ enabled: step === 'photo', allowDslr: false })
  const capture = useCallback(async () => {
    try {
      setShot(cropPortrait(await takeStill()))
    } catch (cause) {
      setShotError(cause instanceof Error ? cause.message : '사진을 찍지 못했어요.')
    }
  }, [takeStill])
  // 3-2-1 → 찰칵(1초마다 한 칸, 1 다음에 찍는다)
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

  // 결과가 나오면 4×6 사주 카드를 그려 둔다(인쇄하기 단추는 그동안 잠깐 꺼져 있다)
  useEffect(() => {
    if (!result) return
    let alive = true
    renderSajuCard({ result, photo, calendar })
      .then((image) => { if (alive) setCard({ of: result, image }) })
      .catch((cause) => console.warn('[funground-saju] 카드를 그리지 못했어요:', cause))
    return () => { alive = false }
  }, [result, photo, calendar])
  const printable = useMemo<FgPrintable | null>(() => (card && card.of === result
    ? { image: card.image, label: engine === 'ai' ? 'AI 포춘 카드' : '포춘 카드', fileName: engine === 'ai' ? 'funground-fortune' : 'funground-saju', printer: 'photo' }
    : null), [card, result, engine])

  // 설치 기기는 며칠씩 켜 둔다 — 그릴 때마다 오늘을 다시 본다
  const today = todayParts()
  // 휠에 보이는 값 — 오지 않은 해 · 달 · 날은 양력일 때 빼 둔다(음력 · 윤달은 다음 단추에서 날짜를 바꿔 본 뒤 거른다)
  // 해 · 달 · 양음력을 바꿔 고른 달 · 날이 범위 밖이 되면 끝 값으로 당겨 쓴다(state 는 그대로 두고 쓰는 값만 — 휠도 이 값을 가운데에 둔다)
  const lastMonth = calendar === 'solar' && year === today.y ? today.m : 12
  const month = Math.min(pickedMonth, lastMonth)
  const lastDay = Math.min(monthDays(year, month, calendar), calendar === 'solar' && year === today.y && month === today.m ? today.d : 31)
  const day = Math.min(pickedDay, lastDay)
  const yearItems = useMemo<WheelItem[]>(() => Array.from({ length: today.y - YEAR_MIN + 1 }, (_, i) => ({ value: YEAR_MIN + i, text: String(YEAR_MIN + i), unit: '년' })), [today.y])
  const monthItems = useMemo<WheelItem[]>(() => Array.from({ length: lastMonth }, (_, i) => ({ value: i + 1, text: String(i + 1), unit: '월' })), [lastMonth])
  const dayItems = useMemo<WheelItem[]>(() => Array.from({ length: lastDay }, (_, i) => ({ value: i + 1, text: String(i + 1), unit: '일' })), [lastDay])

  /** 날짜 확인 — 달력에 없는 음력 날 · 윤달 · 오지 않은 날을 여기서 거른다(시간 없이 원국을 한 번 계산해 본다) */
  const checkDate = () => {
    try {
      const chart = fgSajuChart({ year, month, day, calendar, isLeapMonth: leap, hourIndex: null })
      const s = chart.solarDate
      if (s.year * 10000 + s.month * 100 + s.day > today.y * 10000 + today.m * 100 + today.d) {
        setDateError('아직 오지 않은 날이에요. 날짜를 다시 골라 주세요.')
        return
      }
      setDateError(null)
      setStep('hour')
    } catch {
      setDateError(calendar === 'lunar' && leap ? `${year}년 음력 ${month}월에는 윤달이 없어요.` : '달력에 없는 날이에요. 날짜를 다시 골라 주세요.')
    }
  }

  const run = async (hour: number | null) => {
    if (!engine) return
    const birth: FgBirth = { year, month, day, calendar, isLeapMonth: calendar === 'lunar' && leap, hourIndex: hour }
    setHourIndex(hour)
    setStep('loading')
    if (engine === 'local') {
      await sleep(LOCAL_LOADING_MS)
      setResult(fgLocalSaju(birth))
      setNotice(null)
      setStep('result')
      return
    }
    const started = Date.now()
    let next: FgSajuResult
    let note: string | null = null
    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
      const res = await fetch('/api/funground/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birth }),
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timer))
      const data = (await res.json().catch(() => null)) as (FgSajuResult & { success?: boolean }) | null
      if (res.ok && data?.success && data.reading && data.chart) {
        next = { engine: 'ai', fallback: data.fallback === true, chart: data.chart, reading: data.reading }
        if (next.fallback) note = '지금은 AI 풀이를 받지 못해 미리 써 둔 풀이로 보여 드려요.'
      } else {
        next = { ...fgLocalSaju(birth), engine: 'ai', fallback: true }
        note = res.status === 429 ? '오늘 AI 풀이 횟수를 다 써서 미리 써 둔 풀이로 보여 드려요.' : '지금은 AI 풀이를 받지 못해 미리 써 둔 풀이로 보여 드려요.'
      }
    } catch {
      next = { ...fgLocalSaju(birth), engine: 'ai', fallback: true }
      note = '연결이 끊겨 미리 써 둔 풀이로 보여 드려요.'
    }
    const wait = AI_MIN_LOADING_MS - (Date.now() - started)
    if (wait > 0) await sleep(wait)
    setResult(next)
    setNotice(note)
    setStep('result')
  }

  if (!engine) return null
  const ai = engine === 'ai'
  const kicker = ai ? 'AI 포춘 · 재미로 보는 풀이' : '포춘 · 체험 프로그램'
  const dateLine = `${calendar === 'lunar' ? `음력 ${leap ? '윤' : ''}` : '양력 '}${month}월 ${day}일`

  // ───────── 시작(01) ─────────
  if (step === 'intro') {
    return (
      <FgStage className="fgsj" program="fortune" step={1} onHome={home}>
        <div className="fge-split">
          <PillarHero />
          <section className="fge-panel fgsj-intro">
            <div className="fge-labelrow"><span className="fge-label">{kicker}</span></div>
            <h1 className="fge-title">FORTUNE!</h1>
            <h2 className="fge-head"><u>{ai ? 'AI가 풀어 주는 나의 사주' : '생일로 보는 나의 사주'}</u></h2>
            <p className="fge-lead">공부 · 친구 · 진로 · 꿈 이야기로 풀어 줘요</p>
            <button type="button" className="fge-btn fge-btn--wide" onClick={() => setStep('photo')}>시작하기<Arrow /></button>
            <p className="fgsj-fine">
              {ai ? '생일은 저장하지 않고, 사진은 AI에 보내지 않아요.' : '재미로 보는 풀이예요 · 생일과 사진은 이 기기에서만 써요.'}
            </p>
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 사진(02) ─────────
  // 왼쪽: 4:5 카메라(카드 사진 칸과 같은 범위) + 강조색 모서리 괄호 / 오른쪽: 「02 / 촬영」 · 아주 큰 카운트다운 · 찍기
  if (step === 'photo') {
    const counting = count !== null
    return (
      <FgStage className="fgsj" program="fortune" step={2} onHome={home}>
        <div className="fge-split fgsj-shot">
          <div className="fge-cam">
            {shot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shot} alt="방금 찍은 사진" />
            ) : (
              <video ref={camVideoRef} className="fgsj-mirror" muted playsInline autoPlay />
            )}
            {!shot && camState === 'ready' && (
              <>
                <span className="fge-camtag">밝은 곳에서 정면으로</span>
                <div className="fge-brackets fgsj-brackets" aria-hidden="true"><span /><span /><span /><span /></div>
              </>
            )}
            {!shot && camState === 'starting' && <div className="fgsj-cam-msg"><Loader2 className="fgsj-spin" size={64} strokeWidth={1.5} aria-hidden="true" />카메라를 켜는 중…</div>}
            {!shot && camState === 'error' && (
              <div className="fgsj-cam-msg">
                <CameraOff size={80} strokeWidth={1.25} aria-hidden="true" />
                <p>{camError}</p>
                <button type="button" className="fge-btn fge-btn--ghost" onClick={camRetry}><RefreshCw size={44} strokeWidth={1.5} aria-hidden="true" />다시 시도</button>
              </div>
            )}
            {flash && <div className="fgsj-flash" />}
          </div>
          <section className="fge-panel fgsj-shot-side">
            <p className="fge-steplabel">02 / 촬영</p>
            <h1 className="fge-head"><u>{shot ? '이 사진으로 할까요?' : '오늘의 나를 찍어요'}</u></h1>
            <p className="fge-lead">{shot ? '얼굴이 잘 보이면 「이 사진으로」를 눌러요' : '포춘 카드에 들어갈 사진이에요'}</p>
            {shot ? (
              <div className="fgsj-shot-done"><Check size={200} strokeWidth={1.25} aria-hidden="true" /></div>
            ) : camState === 'error' ? (
              <div className="fgsj-shot-done" aria-hidden="true" />
            ) : (
              <p className="fge-count fgsj-count" data-idle={!counting || undefined} aria-live="polite">{count ?? 3}</p>
            )}
            {shotError && <p className="fgsj-error" role="alert">{shotError}</p>}
            <p className="fgsj-fine">{ai ? '사진은 AI에 보내지 않고 이 기기에서 카드에만 써요.' : '사진은 이 기기에서 결과 화면과 카드에만 써요.'}</p>
            {shot ? (
              <div className="fgsj-nav">
                <button type="button" className="fge-btn fge-btn--ghost" onClick={() => { setShot(null); setShotError(null) }}>다시 찍기</button>
                <button type="button" className="fge-btn" onClick={() => { setPhoto(shot); setShot(null); setStep('date') }}>이 사진으로<Arrow /></button>
              </div>
            ) : camState === 'error' ? (
              <div className="fgsj-nav">
                <button type="button" className="fge-btn fge-btn--ghost" onClick={() => setStep('intro')}>이전</button>
                <button type="button" className="fge-btn" onClick={() => { setPhoto(null); setStep('date') }}>사진 없이 계속<Arrow /></button>
              </div>
            ) : (
              <div className="fgsj-nav">
                <button type="button" className="fge-btn fge-btn--ghost" disabled={counting} onClick={() => setStep('intro')}>이전</button>
                <button type="button" className="fge-btn" disabled={camState !== 'ready' || counting} onClick={() => { setShotError(null); setCount(3) }}>
                  <Camera size={48} strokeWidth={1.5} aria-hidden="true" />{counting ? '곧 찍어요' : '찍기'}
                </button>
              </div>
            )}
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 생일(02) — 해 · 달 · 날 숫자 휠 + 양력 · 음력 · 윤달 ─────────
  if (step === 'date') {
    return (
      <FgStage className="fgsj" program="fortune" step={2} onHome={home}>
        <div className="fge-split fgsj-ask">
          <AskSide tag="02 / 생일" head={'생일을\n알려 주세요'} lead="태어난 시간은 몰라도 괜찮아요" />
          <section className="fge-panel fgsj-pad">
            <div className="fgsj-seg" role="group" aria-label="달력">
              <button type="button" aria-pressed={calendar === 'solar'} onClick={() => { setCalendar('solar'); setLeap(false); setDateError(null) }}>양력</button>
              <button type="button" aria-pressed={calendar === 'lunar'} onClick={() => { setCalendar('lunar'); setDateError(null) }}>음력</button>
              <button type="button" className="fgsj-leap" aria-pressed={calendar === 'lunar' && leap} disabled={calendar !== 'lunar'} onClick={() => { setLeap((v) => !v); setDateError(null) }}>
                <i aria-hidden="true">{calendar === 'lunar' && leap && <Check size={34} strokeWidth={2} />}</i>윤달
              </button>
            </div>
            <div className="fgsj-wheels">
              <Wheel label="태어난 해" items={yearItems} value={year} onChange={(v) => { setYear(v); setDateError(null) }} />
              <Wheel label="태어난 달" items={monthItems} value={month} onChange={(v) => { setMonth(v); setDateError(null) }} />
              <Wheel label="태어난 날" items={dayItems} value={day} onChange={(v) => { setDay(v); setDateError(null) }} />
            </div>
            <p className="fgsj-error" role="alert">{dateError ?? ''}</p>
            <div className="fgsj-nav">
              <button type="button" className="fge-btn fge-btn--ghost" onClick={() => { setShot(photo); setStep('photo') }}>이전</button>
              <button type="button" className="fge-btn" onClick={checkDate}>다음<Arrow /></button>
            </div>
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 태어난 시(02) ─────────
  if (step === 'hour') {
    return (
      <FgStage className="fgsj" program="fortune" step={2} onHome={home}>
        <div className="fge-split fgsj-ask">
          <AskSide tag="02 / 태어난 시" head={'몇 시쯤\n태어났어요?'} lead="모르면 건너뛰어도 괜찮아요" />
          <section className="fge-panel fgsj-pad">
            <div className="fgsj-hours" role="group" aria-label="태어난 시">
              {FG_HOURS.map((h, i) => (
                <button key={h.hanja} type="button" className="fgsj-hour" aria-pressed={hourIndex === i} onClick={() => setHourIndex(i)}>
                  <span className="fgsj-hanja">{h.hanja}</span>
                  <b>{h.range}</b>
                  <small>{h.label}</small>
                </button>
              ))}
            </div>
            <button type="button" className="fge-btn fge-btn--ghost fgsj-skip" onClick={() => run(null)}>태어난 시간을 몰라요 · 건너뛰기</button>
            <div className="fgsj-nav">
              <button type="button" className="fge-btn fge-btn--ghost" onClick={() => setStep('date')}>이전</button>
              <button type="button" className="fge-btn" disabled={hourIndex === null} onClick={() => run(hourIndex)}>결과 보기<Arrow /></button>
            </div>
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 계산 중(02) ─────────
  if (step === 'loading' || !result) {
    return (
      <FgStage className="fgsj" program="fortune" step={2}>
        <div className="fge-split">
          <PillarHero busy />
          <section className="fge-panel fgsj-wait">
            <div className="fge-labelrow"><span className="fge-label">{kicker}</span></div>
            <h1 className="fge-head"><u>{ai ? 'AI가 풀이를 쓰고 있어요' : '만세력을 계산하고 있어요'}</u></h1>
            <div className="fge-wait">
              <div className="fge-bar" aria-hidden="true"><i /></div>
              <p className="fge-lead">{ai ? '여덟 글자를 공부 · 친구 · 진로 · 꿈 이야기로 쓰는 중이에요' : '이 기기에서 하늘 글자와 땅 글자를 찾는 중이에요'}</p>
            </div>
            <ol className="fge-rows fgsj-birthrows">
              <li><i>01</i><b>태어난 해</b><span>{year}년</span></li>
              <li><i>02</i><b>달 · 날</b><span>{dateLine}</span></li>
              <li><i>03</i><b>태어난 시</b><span>{hourIndex !== null ? `${FG_HOURS[hourIndex].label} · ${FG_HOURS[hourIndex].range}` : '모름'}</span></li>
            </ol>
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 결과(03) ─────────
  // 왼쪽: 찍은 사진(4:5) + 강조색 오행 라벨 / 오른쪽: 라벨 띠 · 큰 일간 제목 · 01~06 번호 줄(여기까지 한눈에) — 아래로 넘기면 만세력 · 오행 · 이야기 · 행운.
  // 맨 아래 늘 같은 자리: 인쇄하기 · QR로 받기
  const { chart, reading } = result
  const dm = reading.dayMaster
  const titleSize = Math.max(88, Math.min(176, Math.floor(1150 / Math.max(dm.title.length, 1))))
  const rows = [
    { key: 'y27', label: `${FG_YEAR}년`, title: reading.year2027.title },
    ...FG_TOPICS.map((t) => ({ key: t.key, label: t.label, title: reading.topics[t.key].title })),
  ]
  return (
    <FgStage className="fgsj fgsj--result" program="fortune" step={3} onHome={home}>
      <div className="fgsj-result">
        <figure className="fgsj-rphoto">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="오늘 찍은 나" />
          ) : (
            <span className="fgsj-rglyph" aria-hidden="true">{dm.hanja}</span>
          )}
          <figcaption className="fge-label fgsj-rtag">{FG_ELEMENT_WORD[dm.element]}의 기운</figcaption>
        </figure>

        <section className="fgsj-rmain">
          <div className="fgsj-rlabel">
            <span className="fge-label">나의 일간 · {dm.gan}{dm.element}({dm.hanja}{FG_ELEMENT_HANJA[dm.element]})</span>
            <i aria-hidden="true" />
            <span className="fgsj-fun">재미로 보는 풀이예요</span>
          </div>
          <h1 className="fgsj-rtitle" style={{ fontSize: titleSize }}><u>{dm.title}</u></h1>

          <div className="fgsj-scroll">
            <ol className="fge-rows fgsj-rows">
              {rows.map((r, i) => (
                <li key={r.key}><i>{String(i + 1).padStart(2, '0')}</i><b>{r.label}</b><span>{r.title}</span></li>
              ))}
            </ol>
            <p className="fgsj-more"><ChevronDown size={36} strokeWidth={1.5} aria-hidden="true" />아래로 넘기면 만세력 · 오행 · 행운</p>

            {/* 만세력 · 오행 */}
            <div className="fgsj-chartrow">
              <section className="fgsj-block">
                <h2 className="fgsj-h2">나의 만세력<small>{calendar === 'lunar' ? chart.lunarLabel : chart.solarLabel} · {chart.zodiac}띠{chart.isThreePillar ? ' · 시간 모름' : ''}</small></h2>
                <div className="fgsj-pillars">
                  {chart.pillars.map(({ key, label, pillar }) => (
                    <div key={key} className="fgsj-pillar" data-me={key === 'day' || undefined}>
                      <span className="fgsj-pillar-label">{key === 'day' ? '나 · 날' : label.replace('태어난 ', '')}</span>
                      {pillar ? (
                        <>
                          <span className="fgsj-glyph"><b>{pillar.ganHanja}</b><i>{pillar.gan} · {pillar.ganElement}</i></span>
                          <span className="fgsj-glyph"><b>{pillar.jiHanja}</b><i>{pillar.ji} · {pillar.jiElement}</i></span>
                        </>
                      ) : (
                        <span className="fgsj-glyph fgsj-glyph--none">모름</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
              <section className="fgsj-block">
                <h2 className="fgsj-h2">나의 오행<small>여덟 글자의 다섯 기운</small></h2>
                <ul className="fgsj-bars">
                  {FG_ELEMENTS.map((e) => (
                    <li key={e} data-me={e === dm.element || undefined}>
                      <span className="fgsj-bar-name"><b>{FG_ELEMENT_HANJA[e]}</b>{FG_ELEMENT_WORD[e]}</span>
                      <span className="fgsj-bar"><i style={{ width: `${Math.max(chart.percent[e], 2)}%` }} /></span>
                      <span className="fgsj-bar-pct">{chart.percent[e]}%</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* 나의 일간 이야기 */}
            <section className="fgsj-block">
              <h2 className="fgsj-h2">나의 일간 이야기<small>{dm.title}</small></h2>
              <p className="fgsj-text">{dm.text}</p>
              {chart.isJasiBirth && <p className="fgsj-fine">자시(밤 11시~새벽 1시)에 태어나면 보는 방법에 따라 날 기둥이 달라질 수 있어요.</p>}
            </section>

            {/* 많은 · 적은 · 힘이 되는 기운 */}
            <section className="fgsj-block">
              <h2 className="fgsj-h2">나의 기운 이야기<small>오행으로 본 나</small></h2>
              <ul className="fgsj-detail">
                {[
                  { key: 'strong', tag: '많은 기운', line: reading.strong },
                  { key: 'weak', tag: '적은 기운', line: reading.weak },
                  { key: 'yong', tag: '힘이 되는 기운', line: reading.yongsin },
                ].map(({ key, tag, line }) => (
                  <li key={key}>
                    <span className="fgsj-detail-tag"><b>{FG_ELEMENT_HANJA[line.element]}</b>{tag}</span>
                    <div><h3>{line.title}</h3><p>{line.text}</p></div>
                  </li>
                ))}
              </ul>
            </section>

            {/* 2027년 · 공부 · 친구 · 진로 · 꿈 · 마음 — 위 번호 줄의 자세한 이야기 */}
            <section className="fgsj-block">
              <h2 className="fgsj-h2">자세히 보기<small>{FG_YEAR}년 {FG_YEAR_GANJI.label} · 붉은 양의 해</small></h2>
              <ul className="fgsj-detail">
                {rows.map((r, i) => (
                  <li key={r.key}>
                    <span className="fgsj-detail-tag"><b>{String(i + 1).padStart(2, '0')}</b>{r.label}</span>
                    <div><h3>{r.title}</h3><p>{r.key === 'y27' ? reading.year2027.text : reading.topics[r.key as keyof typeof reading.topics].text}</p></div>
                  </li>
                ))}
              </ul>
            </section>

            {/* 행운 */}
            <section className="fgsj-block">
              <h2 className="fgsj-h2">나의 행운<small>힘이 되는 기운 {reading.lucky.element}({FG_ELEMENT_HANJA[reading.lucky.element]})</small></h2>
              <ul className="fgsj-lucky">
                <li><small>색</small><b><span className="fgsj-swatch" style={{ '--sw': reading.lucky.swatch } as CSSProperties} aria-hidden="true" />{reading.lucky.color}</b></li>
                <li><small>물건</small><b>{reading.lucky.item}</b></li>
                <li><small>습관</small><b>{reading.lucky.habit}</b></li>
              </ul>
              <p className="fgsj-text">{reading.lucky.text}</p>
            </section>

            <p className="fgsj-fine fgsj-foot">
              {notice ?? (ai ? 'AI가 만세력을 바탕으로 쓴 풀이예요.' : '만세력은 이 기기에서 계산하고, 풀이는 미리 써 둔 문장에서 골랐어요.')}
              {' '}재미로 보는 풀이이니 가볍게 즐겨 주세요.
            </p>
          </div>
        </section>

        <div className="fgsj-ractions">
          <FgResultButtons printable={printable} />
        </div>
      </div>
    </FgStage>
  )
}
