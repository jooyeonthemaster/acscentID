'use client'

// 펀그라운드 별내 사주 — 1920×1080 가로 화면(FgStage · 32인치 가로 터치스크린, 노트북 창에서도 같은 배치). 주소의 engine 으로 두 안을 같은 화면에서 보여 준다.
//   engine=local(B안 SAJU! · 체험 프로그램): 만세력(src/lib/saju)과 풀이 고르기(src/lib/funground/saju-reading.ts)를 모두 이 기기에서 한다 — /api 를 부르지 않는다.
//     'AI'라고 쓰지 않는다.
//   engine=ai(A안 FORTUNE! AI 포춘): /api/funground/fortune 에 생일을 보내 AI 풀이를 받는다. 실패 · 하루 상한(429) · 연결 끊김이면 이 기기에서 미리 쓴 풀이로 대신한다.
// 흐름: 시작 → 태어난 해 → 달 · 날(양력 · 음력 · 윤달) → 태어난 시(모르면 건너뛰기) → 결과. 성별은 묻지 않는다(원국 · 풀이에 쓰이지 않는다).
// 키오스크 사주 입력(src/app/kiosk/SajuInput.tsx — 숫자 패드 · 12지시 격자)은 매장 화면 CSS 와 묶여 있어 가져오지 않고,
// 9~19세가 누르기 쉬운 연도 · 월 · 날짜 고르기로 따로 만들었다(12지시 표는 같은 대표 시각).
// 결과는 「재미로 보는 풀이」 — 외모 · 점수 · 순위 · 연애 · 돈 · 향 이야기는 없다.

import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3, Compass, Smile, Sparkles, Star, Users } from 'lucide-react'
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties, type ComponentType } from 'react'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import type { Element } from '@/lib/saju'
import {
  FG_ELEMENT_HANJA, FG_ELEMENT_WORD, FG_ELEMENTS, FG_HOURS, FG_TOPICS, FG_YEAR, FG_YEAR_GANJI,
  fgLocalSaju, fgSajuChart, type FgBirth, type FgSajuResult, type FgTopic,
} from '@/lib/funground/saju-reading'
import './fg-saju.css'

type Engine = 'local' | 'ai'
type Step = 'intro' | 'year' | 'date' | 'hour' | 'loading' | 'result'

const TONE = '#1f5a45'
/** 오행 색 — 만세력 글자 · 막대 */
const ELEMENT_COLOR: Record<Element, string> = { 목: '#2f9e5b', 화: '#e5533d', 토: '#d39a1c', 금: '#8a93a6', 수: '#2f6fd6' }
/** 아무도 누르지 않으면 처음으로 — 입력 중 2분 · 결과 1분 30초 */
const IDLE_ASK_MS = 120_000
const IDLE_RESULT_MS = 90_000
/** 계산 화면을 잠깐 보여 준다(기기 안 계산은 순식간이라 넘어간 줄 모른다) */
const LOCAL_LOADING_MS = 1_600
const AI_MIN_LOADING_MS = 1_200
const AI_TIMEOUT_MS = 55_000
/** 연도 칸 — 한 쪽에 12개, 처음엔 2006~2017(9~19세가 대부분) */
const YEAR_PAGE = 12
const YEAR_FIRST_PAGE = 2006
const YEAR_MIN = 1930

const TOPIC_ICON: Record<FgTopic, ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }>> = {
  study: BookOpen, friend: Users, career: Compass, dream: Sparkles, mind: Smile,
}

/** 아무 입력이 없으면 ms 뒤 onIdle — 누를 때마다 다시 센다 */
function useIdle(active: boolean, ms: number, onIdle: () => void) {
  useEffect(() => {
    if (!active) return
    let timer = window.setTimeout(onIdle, ms)
    const poke = () => { window.clearTimeout(timer); timer = window.setTimeout(onIdle, ms) }
    window.addEventListener('pointerdown', poke)
    return () => { window.clearTimeout(timer); window.removeEventListener('pointerdown', poke) }
  }, [active, ms, onIdle])
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 주소의 engine — 서버에서 그릴 때는 null(아직 모름) */
const noSubscribe = () => () => {}
const readEngine = (): Engine => (new URLSearchParams(window.location.search).get('engine') === 'ai' ? 'ai' : 'local')

/** 그 달의 날 수 — 음력은 30일까지 두고 없는 날(29일까지인 달의 30일)은 다음 단추에서 거른다 */
const monthDays = (y: number | null, m: number | null, cal: 'solar' | 'lunar') => (!y || !m ? 31 : cal === 'lunar' ? 30 : new Date(y, m, 0).getDate())

function todayParts() {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
}

/** 단계 점 — 해 · 날 · 시 */
function Steps({ now }: { now: 0 | 1 | 2 }) {
  return (
    <ol className="fg-steps fgsj-steps" aria-label={`3단계 중 ${now + 1}단계`}>
      {[0, 1, 2].map((i) => <li key={i} data-state={i < now ? 'done' : i === now ? 'now' : undefined} />)}
    </ol>
  )
}

/** 고른 생일 한 줄 */
interface BirthRow { key: 'year' | 'date' | 'hour'; label: string; value: string | null }

/** 고른 생일 — 지금 고르는 줄(now)은 색을 넣고, 아직 안 고른 줄은 「—」 */
function BirthSummary({ rows, now }: { rows: BirthRow[]; now?: BirthRow['key'] }) {
  return (
    <div className="fg-card fgsj-sum">
      <p className="fgsj-sum-head">나의 생일</p>
      <ul>
        {rows.map((r) => (
          <li key={r.key} data-now={r.key === now || undefined} data-empty={!r.value || undefined}>
            <span>{r.label}</span>
            <b>{r.value ?? (r.key === now ? '고르는 중' : '—')}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 시작 · 계산 화면 왼쪽 그림 — 時日月年 네 기둥(busy 면 차례로 깜빡인다) */
function PillarArt({ word, busy = false }: { word: string; busy?: boolean }) {
  return (
    <div className="fgsj-art" data-busy={busy || undefined} aria-hidden="true">
      <p className="fgsj-word">{word}</p>
      <div className="fgsj-motif">
        {[['時', '시'], ['日', '날'], ['月', '달'], ['年', '해']].map(([h, k]) => (
          <span key={h}><b>{h}</b><i>{k}</i></span>
        ))}
      </div>
      <p className="fgsj-art-cap">네 기둥 · 여덟 글자</p>
    </div>
  )
}

export function FungroundSaju() {
  const engine = useSyncExternalStore(noSubscribe, readEngine, () => null)
  const [step, setStep] = useState<Step>('intro')
  const [year, setYear] = useState<number | null>(null)
  const [yearPage, setYearPage] = useState(YEAR_FIRST_PAGE)
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
  const [leap, setLeap] = useState(false)
  const [month, setMonth] = useState<number | null>(null)
  const [day, setDay] = useState<number | null>(null)
  const [hourIndex, setHourIndex] = useState<number | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [result, setResult] = useState<FgSajuResult | null>(null)
  /** AI 풀이 대신 미리 쓴 풀이를 보여 줄 때 한 줄 */
  const [notice, setNotice] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('intro')
    setYear(null)
    setYearPage(YEAR_FIRST_PAGE)
    setCalendar('solar')
    setLeap(false)
    setMonth(null)
    setDay(null)
    setHourIndex(null)
    setDateError(null)
    setResult(null)
    setNotice(null)
  }, [])
  const home = useFgHome(reset)
  useIdle(step !== 'intro' && step !== 'loading', step === 'result' ? IDLE_RESULT_MS : IDLE_ASK_MS, home)

  // 설치 기기는 며칠씩 켜 둔다 — 그릴 때마다 오늘을 다시 본다
  const today = todayParts()
  const daysInMonth = monthDays(year, month, calendar)
  /** 달 · 양음력을 바꾸면 그 달에 없는 날은 지운다 */
  const pickMonth = (m: number, cal = calendar) => {
    setMonth(m)
    if (day && day > monthDays(year, m, cal)) setDay(null)
    setDateError(null)
  }

  const isFuture = (m: number, d = 1) => calendar === 'solar' && year === today.y && (m > today.m || (m === today.m && d > today.d))

  /** 날짜 확인 — 달력에 없는 음력 날 · 윤달 · 오지 않은 날을 여기서 거른다(시간 없이 원국을 한 번 계산해 본다) */
  const checkDate = () => {
    if (!year || !month || !day) return
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
    if (!year || !month || !day || !engine) return
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
  const word = ai ? 'FORTUNE!' : 'SAJU!'
  const kicker = ai ? 'AI 포춘 · 재미로 보는 풀이' : '사주 · 체험 프로그램'

  /** 고른 생일 — 입력 단계 왼쪽 · 계산 화면에 보여 준다 */
  const birthRows: BirthRow[] = [
    { key: 'year', label: '태어난 해', value: year ? `${year}년` : null },
    { key: 'date', label: '달 · 날', value: month && day ? `${calendar === 'lunar' ? `음력 ${leap ? '윤' : ''}` : '양력 '}${month}월 ${day}일` : null },
    { key: 'hour', label: '태어난 시', value: hourIndex !== null ? `${FG_HOURS[hourIndex].label} · ${FG_HOURS[hourIndex].range}` : step === 'loading' ? '모름' : null },
  ]

  // ───────── 시작 ─────────
  if (step === 'intro') {
    return (
      <FgStage className="fgsj fgsj--intro" tone={TONE} onHome={home}>
        <div className="fg-split">
          <PillarArt word={word} />
          <section className="fg-panel fgsj-intro">
            <p className="fg-kicker">{kicker}</p>
            <h1 className="fg-title">{ai ? 'AI가 풀어 주는\n나의 사주 이야기' : '생일로 알아보는\n나의 사주'}</h1>
            <p className="fg-lead">{'태어난 해 · 달 · 날 · 시의 글자 여덟 개로\n나의 기운과 2027년 흐름을 알아봐요'}</p>
            <span className="fg-fun">재미로 보는 풀이예요</span>
            <button type="button" className="fg-btn fg-btn--primary fgsj-start" onClick={() => setStep('year')}>
              시작하기<ArrowRight size={44} strokeWidth={2.8} aria-hidden="true" />
            </button>
            <p className="fg-note fgsj-privacy">
              {ai
                ? '생일은 풀이를 쓰는 동안에만 쓰고 저장하지 않아요. 이름 · 사진은 받지 않아요.'
                : '생일은 이 기기 안에서만 계산하고 저장하지 않아요. 이름 · 사진은 받지 않아요.'}
            </p>
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 태어난 해 ─────────
  if (step === 'year') {
    const years = Array.from({ length: YEAR_PAGE }, (_, i) => yearPage + i)
    return (
      <FgStage className="fgsj" tone={TONE} onHome={home}>
        <div className="fg-split fgsj-ask">
          <section className="fg-panel fgsj-side">
            <Steps now={0} />
            <h1 className="fg-title">{'몇 년에\n태어났어요?'}</h1>
            <p className="fg-lead">{'옆 화살표로\n다른 해도 고를 수 있어요'}</p>
            <BirthSummary rows={birthRows} now="year" />
          </section>
          <section className="fg-panel fgsj-pad">
            <div className="fgsj-yearbar">
              <button type="button" className="fgsj-page" onClick={() => setYearPage((p) => Math.max(YEAR_MIN, p - YEAR_PAGE))} disabled={yearPage <= YEAR_MIN} aria-label="이전 연도">
                <ChevronLeft size={52} strokeWidth={2.6} aria-hidden="true" />
              </button>
              <b>{yearPage} ~ {yearPage + YEAR_PAGE - 1}</b>
              <button type="button" className="fgsj-page" onClick={() => setYearPage((p) => p + YEAR_PAGE)} disabled={yearPage + YEAR_PAGE > today.y} aria-label="다음 연도">
                <ChevronRight size={52} strokeWidth={2.6} aria-hidden="true" />
              </button>
            </div>
            <div className="fgsj-years">
              {years.map((y) => (
                <button key={y} type="button" className="fg-chip fgsj-year" data-on={year === y} disabled={y > today.y || y < YEAR_MIN}
                  onClick={() => { setYear(y); setDateError(null) }}>
                  {y}<small>년</small>
                </button>
              ))}
            </div>
            <div className="fg-actions fg-actions--row fgsj-nav">
              <button type="button" className="fg-btn fg-btn--ghost" onClick={() => setStep('intro')}><ArrowLeft size={40} strokeWidth={2.8} aria-hidden="true" />이전</button>
              <button type="button" className="fg-btn fg-btn--primary" disabled={!year} onClick={() => setStep('date')}>다음<ArrowRight size={40} strokeWidth={2.8} aria-hidden="true" /></button>
            </div>
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 달 · 날 ─────────
  // 왼쪽: 양력 · 음력 · 윤달과 월 / 오른쪽: 날 · 다음(31칸이 오른쪽 한 칸에 다 들어가게)
  if (step === 'date') {
    return (
      <FgStage className="fgsj" tone={TONE} onHome={home}>
        <div className="fg-split fgsj-ask">
          <section className="fg-panel fgsj-side">
            <Steps now={1} />
            <h1 className="fg-title">{`${year}년\n몇 월 며칠?`}</h1>
            <div className="fgsj-cal">
              <button type="button" className="fg-chip" data-on={calendar === 'solar'} onClick={() => { setCalendar('solar'); setLeap(false); if (month) pickMonth(month, 'solar'); setDateError(null) }}>양력</button>
              <button type="button" className="fg-chip" data-on={calendar === 'lunar'} onClick={() => { setCalendar('lunar'); if (month) pickMonth(month, 'lunar'); setDateError(null) }}>음력</button>
              {calendar === 'lunar' && (
                <button type="button" className="fg-chip fgsj-leap" data-on={leap} onClick={() => { setLeap((v) => !v); setDateError(null) }}>
                  <i aria-hidden="true">{leap ? '✓' : ''}</i>윤달
                </button>
              )}
            </div>
            <p className="fgsj-label">월</p>
            <div className="fgsj-months">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <button key={m} type="button" className="fg-chip fgsj-cell" data-on={month === m} disabled={isFuture(m)}
                  onClick={() => pickMonth(m)}>{m}</button>
              ))}
            </div>
          </section>
          <section className="fg-panel fgsj-pad">
            <p className="fgsj-label">일{calendar === 'lunar' ? ' (음력)' : ''}</p>
            <div className="fgsj-days" data-off={!month || undefined}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <button key={d} type="button" className="fg-chip fgsj-cell fgsj-day" data-on={day === d} disabled={!month || isFuture(month, d)}
                  onClick={() => { setDay(d); setDateError(null) }}>{d}</button>
              ))}
            </div>
            <p className="fgsj-error" role="alert">{dateError ?? (month ? '' : '먼저 왼쪽에서 월을 골라 주세요')}</p>
            <div className="fg-actions fg-actions--row fgsj-nav">
              <button type="button" className="fg-btn fg-btn--ghost" onClick={() => setStep('year')}><ArrowLeft size={40} strokeWidth={2.8} aria-hidden="true" />이전</button>
              <button type="button" className="fg-btn fg-btn--primary" disabled={!month || !day} onClick={checkDate}>다음<ArrowRight size={40} strokeWidth={2.8} aria-hidden="true" /></button>
            </div>
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 태어난 시 ─────────
  if (step === 'hour') {
    return (
      <FgStage className="fgsj" tone={TONE} onHome={home}>
        <div className="fg-split fgsj-ask">
          <section className="fg-panel fgsj-side">
            <Steps now={2} />
            <h1 className="fg-title">{'몇 시쯤\n태어났어요?'}</h1>
            <p className="fg-lead">모르면 건너뛰어도 괜찮아요</p>
            <button type="button" className="fg-btn fg-btn--ghost fgsj-skip" onClick={() => run(null)}>
              <Clock3 size={40} strokeWidth={2.6} aria-hidden="true" />태어난 시간을 몰라요 · 건너뛰기
            </button>
            <BirthSummary rows={birthRows} now="hour" />
          </section>
          <section className="fg-panel fgsj-pad">
            <div className="fgsj-hours">
              {FG_HOURS.map((h, i) => (
                <button key={h.hanja} type="button" className="fg-chip fgsj-hour" data-on={hourIndex === i} onClick={() => setHourIndex(i)}>
                  <span className="fgsj-hour-hanja">{h.hanja}</span>
                  <b>{h.range}</b>
                  <small>{h.label}</small>
                </button>
              ))}
            </div>
            <div className="fg-actions fg-actions--row fgsj-nav">
              <button type="button" className="fg-btn fg-btn--ghost" onClick={() => setStep('date')}><ArrowLeft size={40} strokeWidth={2.8} aria-hidden="true" />이전</button>
              <button type="button" className="fg-btn fg-btn--primary" disabled={hourIndex === null} onClick={() => run(hourIndex)}>결과 보기<ArrowRight size={40} strokeWidth={2.8} aria-hidden="true" /></button>
            </div>
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 계산 중 ─────────
  if (step === 'loading' || !result) {
    return (
      <FgStage className="fgsj" tone={TONE}>
        <div className="fg-split">
          <PillarArt word={word} busy />
          <section className="fg-panel fgsj-loading">
            <div className="fg-spin" aria-hidden="true" />
            <h1 className="fg-title fg-title--md">{ai ? 'AI가 풀이를 쓰고 있어요' : '만세력을 계산하고 있어요'}</h1>
            <p className="fg-lead">{ai ? '사주 여덟 글자를 계산하고\n청소년 이야기로 풀어 쓰는 중이에요' : '태어난 해 · 달 · 날 · 시의\n하늘 글자와 땅 글자를 찾는 중이에요'}</p>
            <BirthSummary rows={birthRows} />
          </section>
        </div>
      </FgStage>
    )
  }

  // ───────── 결과 ─────────
  // 왼쪽(넘기지 않음): 나의 일간 · 만세력 · 오행 막대 / 오른쪽: 풀이 카드 — 오른쪽 칸 안에서만 위아래로 넘긴다.
  const { chart, reading } = result
  const dmColor = ELEMENT_COLOR[reading.dayMaster.element]
  return (
    <FgStage className="fgsj fgsj--result" tone={TONE} onHome={home}>
      <div className="fg-split fgsj-rsplit">
        <div className="fgsj-rleft">
          <div className="fgsj-rtop">
            {/* 나의 일간 */}
            <section className="fgsj-hero" style={{ '--el': dmColor } as CSSProperties}>
              <p className="fgsj-hero-kicker">나의 일간</p>
              <span className="fgsj-hero-glyph" aria-hidden="true">{reading.dayMaster.hanja}</span>
              <p className="fgsj-hero-gan">{reading.dayMaster.gan}{reading.dayMaster.element}({reading.dayMaster.hanja}{FG_ELEMENT_HANJA[reading.dayMaster.element]})</p>
              <h1 className="fgsj-hero-title">{reading.dayMaster.title}</h1>
            </section>

            {/* 만세력 */}
            <section className="fg-card fgsj-card fgsj-chart">
              <h2 className="fgsj-h2">나의 만세력<small>{calendar === 'lunar' ? chart.lunarLabel : chart.solarLabel} · {chart.zodiac}띠{chart.isThreePillar ? ' · 시간 모름' : ''}</small></h2>
              <div className="fgsj-pillars">
                {chart.pillars.map(({ key, label, pillar }) => (
                  <div key={key} className="fgsj-pillar" data-me={key === 'day' || undefined}>
                    <span className="fgsj-pillar-label">{key === 'day' ? '나 · 날' : label}</span>
                    {pillar ? (
                      <>
                        <span className="fgsj-glyph" style={{ '--el': ELEMENT_COLOR[pillar.ganElement] } as CSSProperties}>
                          <b>{pillar.ganHanja}</b><i>{pillar.gan} · {pillar.ganElement}</i>
                        </span>
                        <span className="fgsj-glyph" style={{ '--el': ELEMENT_COLOR[pillar.jiElement] } as CSSProperties}>
                          <b>{pillar.jiHanja}</b><i>{pillar.ji} · {pillar.jiElement}</i>
                        </span>
                      </>
                    ) : (
                      <span className="fgsj-glyph fgsj-glyph--none">모름</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 오행 */}
          <section className="fg-card fgsj-card fgsj-five">
            <h2 className="fgsj-h2">나의 오행<small>여덟 글자에 담긴 다섯 기운</small></h2>
            <ul className="fgsj-bars">
              {FG_ELEMENTS.map((e) => (
                <li key={e} style={{ '--el': ELEMENT_COLOR[e] } as CSSProperties}>
                  <span className="fgsj-bar-name"><b>{FG_ELEMENT_HANJA[e]}</b>{e} · {FG_ELEMENT_WORD[e]}</span>
                  <span className="fgsj-bar"><i style={{ width: `${Math.max(chart.percent[e], 2)}%` }} /></span>
                  <span className="fgsj-bar-pct">{chart.percent[e]}%</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="fg-panel fgsj-rright">
          <header className="fgsj-rhead">
            <span className="fgsj-rword">{word}</span>
            <span className="fg-fun">재미로 보는 풀이예요</span>
          </header>

          <div className="fgsj-scroll">
            {/* 나의 일간 이야기 */}
            <section className="fg-card fgsj-card fgsj-me" style={{ '--el': dmColor } as CSSProperties}>
              <h2 className="fgsj-h2">나의 일간 이야기<small>{reading.dayMaster.title}</small></h2>
              <p className="fgsj-text">{reading.dayMaster.text}</p>
              {chart.isJasiBirth && <p className="fg-note fgsj-jasi">자시(밤 11시~새벽 1시)에 태어나면 보는 방법에 따라 날 기둥이 달라질 수 있어요.</p>}
            </section>

            {/* 많은 · 적은 · 힘이 되는 기운 */}
            <section className="fg-card fgsj-card">
              <h2 className="fgsj-h2">나의 기운 이야기<small>오행으로 본 나</small></h2>
              <div className="fgsj-flow">
                {[
                  { key: 'strong', tag: '많은 기운', line: reading.strong },
                  { key: 'weak', tag: '적은 기운', line: reading.weak },
                  { key: 'yong', tag: '힘이 되는 기운', line: reading.yongsin },
                ].map(({ key, tag, line }) => (
                  <div key={key} className="fgsj-flow-row" style={{ '--el': ELEMENT_COLOR[line.element] } as CSSProperties}>
                    <span className="fgsj-flow-tag">{tag}<b>{FG_ELEMENT_HANJA[line.element]}</b></span>
                    <div><h3>{line.title}</h3><p>{line.text}</p></div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2027년 */}
            <section className="fg-card fgsj-card fgsj-year27">
              <h2 className="fgsj-h2">{FG_YEAR}년 나의 흐름<small>{FG_YEAR_GANJI.label} · 붉은 양의 해</small></h2>
              <h3 className="fgsj-h3">{reading.year2027.title}</h3>
              <p className="fgsj-text">{reading.year2027.text}</p>
            </section>

            {/* 공부 · 친구 · 진로 · 꿈 · 마음 */}
            <section className="fgsj-topics">
              {FG_TOPICS.map((t) => {
                const Icon = TOPIC_ICON[t.key]
                const line = reading.topics[t.key]
                return (
                  <article key={t.key} className="fg-card fgsj-topic">
                    <span className="fgsj-topic-tag"><Icon size={36} strokeWidth={2.4} aria-hidden="true" />{t.label}</span>
                    <div><h3>{line.title}</h3><p>{line.text}</p></div>
                  </article>
                )
              })}
            </section>

            {/* 행운 */}
            <section className="fg-card fgsj-card fgsj-lucky" style={{ '--el': reading.lucky.swatch } as CSSProperties}>
              <h2 className="fgsj-h2"><Star size={40} strokeWidth={2.4} aria-hidden="true" />나의 행운<small>힘이 되는 기운 {reading.lucky.element}({FG_ELEMENT_HANJA[reading.lucky.element]})</small></h2>
              <ul className="fgsj-lucky-list">
                <li><span className="fgsj-swatch" aria-hidden="true" /><small>색</small><b>{reading.lucky.color}</b></li>
                <li><small>물건</small><b>{reading.lucky.item}</b></li>
                <li><small>습관</small><b>{reading.lucky.habit}</b></li>
              </ul>
              <p className="fgsj-text">{reading.lucky.text}</p>
            </section>

            <p className="fg-note fgsj-foot">
              {notice ?? (ai ? 'AI가 만세력을 바탕으로 쓴 풀이예요.' : '만세력은 이 기기에서 계산하고, 풀이는 미리 써 둔 문장에서 골랐어요.')}
              {' '}재미로 보는 풀이이니 가볍게 즐겨 주세요.
            </p>
          </div>

          <div className="fgsj-bottom">
            <button type="button" className="fg-btn fg-btn--primary" onClick={home}>처음으로</button>
          </div>
        </div>
      </div>
    </FgStage>
  )
}
