'use client'

// 펀그라운드 별내 B안 미래 직업 탐색(NEXT!) — 1920×1080 가로 화면(FgStage · 32인치 가로 터치스크린, 2026-11-14 세로에서 바꿈).
// 가로 배치는 노트북판 /kiosk/pc/career(experience-pc.css)를 따른다 — 첫 화면: 왼쪽 그림 · 오른쪽 글과 시작 단추 /
//   사진(질문 앞 따로 한 단계, 2026-11-14 「모든 프로그램에 사진」): 왼쪽 세로 3:4 카메라 · 오른쪽 안내와 찍기(3-2-1) → 다시 찍기 / 이 사진으로 /
//   질문: 위에 질문 한 줄, 가운데 답을 가로로 넓게(활동 4열 · MBTI 8열 · 답 셋 · 넷 나란히), 맨 아래 이전 · 고른 수 · 다음 /
//   결과: 왼쪽 재미로 보는 풀이(찍은 사진), 오른쪽 직업 셋 · 첫 도전 · 처음으로 · 사진 인쇄하기(4×6 카드, career-print.ts).
// 키오스크 studio-career(CareerMode)를 건드리지 않으려고 화면은 따로 두고, 규칙표 · 문구는 그대로 가져다 쓴다:
//   data.ts(활동 · MBTI · 상황 질문 다섯 · 16개 직업) · text.ts(한국어 문구) · 축 그림(public/assets/kiosk-experiences/career-*.webp)
// 바뀐 점: 관상 분석 없음 — 사진은 결과 카드에 넣을 뿐 얼굴을 읽지 않는다 · 새 상황 질문 하나(src/lib/funground/career.ts) · AI 풀이 대신 축 조합 풀이(career-combos.ts).
// 사진 · 결과는 기기 안에만 있다 — 「사진 인쇄하기」 창(FgPrintButton)을 열 때만 카드 그림을 QR 받기용으로 우리 서버에 올린다(24시간, 사용자 결정).
// 카메라를 못 켜면(권한 거절 · 카메라 없음) 「사진 없이 계속」으로 넘어간다 — 데모가 막히지 않게. 그 밖에는 외부 서비스 · AI 를 부르지 않는다.
// 체험 프로그램이라 'AI'라고 쓰지 않는다.
// 결과는 「탐색해 볼 직업」 · 「재미로 보는 풀이」 — 능력이나 적성을 판정하지 않는다.

import {
  ArrowLeft, ArrowRight, CalendarDays, Camera, CameraOff, Check, Ear, FlaskConical, Gamepad2, Gift, GraduationCap, HandHeart, Hammer, HeartHandshake, Image as ImageIcon,
  Lightbulb, Loader2, Megaphone, MessagesSquare, Mic, Palette, Presentation, Puzzle, RefreshCw, RotateCcw, Scissors, Search, Sparkles, Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import { FgPrintButton, type FgPrintable } from '@/components/funground/FgResultSheet'
import { useCamera } from '@/app/booth/programs/use-camera'
import { CAREERS, CAREER_INTERESTS, CAREER_QUESTIONS, MBTI_TYPES, mbtiLetters, type CareerAxis, type CareerInterest, type MbtiType } from '@/app/kiosk/experience/career/data'
import { CAREER_TEXT } from '@/app/kiosk/experience/career/text'
import { FG_CAREER_EXTRA_QUESTION, FG_CAREER_QUESTION_COUNT, FG_CAREER_TOTAL, exploreFgCareers } from '@/lib/funground/career'
import { pickCareerCombo } from '@/lib/funground/career-combos'
import { drawCareerPrint } from './career-print'
import './fg-career.css'

type IconType = ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }>
const ICONS: Record<string, IconType> = {
  palette: Palette, puzzle: Puzzle, chat: MessagesSquare, search: Search, team: Users, present: Presentation, poster: ImageIcon, plan: CalendarDays,
  megaphone: Megaphone, ear: Ear, bulb: Lightbulb, gift: Gift, hammer: Hammer, heart: HeartHandshake, spark: Sparkles, flask: FlaskConical, cap: GraduationCap,
  scissors: Scissors, gamepad: Gamepad2, handheart: HandHeart, mic: Mic,
}
const axisArt = (axis: CareerAxis) => `/assets/kiosk-experiences/career-${axis}.webp`
const TONE = '#315ca8'
/** 아무도 누르지 않으면 처음으로 — 질문 중 2분 · 결과 1분 30초 */
const IDLE_ASK_MS = 120_000
const IDLE_RESULT_MS = 90_000

const t = CAREER_TEXT.ko
/** 상황 질문 여섯의 [제목 두 줄, 보기(아이콘 · 글)] — 앞 다섯은 기존 질문(text.ts · data.ts) 그대로 */
const SITUATIONS = [
  ...CAREER_QUESTIONS.map((q, i) => ({ title: t.questions[i].title, options: q.icons.map((icon, n) => ({ icon, label: t.questions[i].options[n] })) })),
  { title: FG_CAREER_EXTRA_QUESTION.title, options: FG_CAREER_EXTRA_QUESTION.options.map(({ icon, label }) => ({ icon, label })) },
]
/** 보기 글이 줄을 바꿀 때 「·」가 줄 맨 앞에 오지 않게 — 앞 낱말에 붙인다(글은 그대로, 앞 칸만 줄 안 바뀌는 칸으로) */
const keepDot = (label: string) => label.replace(/ · /g, '\u00a0· ')
const emptyAnswers = () => Array.from({ length: FG_CAREER_QUESTION_COUNT }, () => null as number | null)

/** 찍힌 사진 — 카메라 칸(세로 3:4, 가득 채움)에 보인 가운데만, 최대 720×960 JPEG(기기 메모리에만). still() 은 이미 거울 방향 */
function cropShot(src: HTMLCanvasElement): string {
  const ch = Math.min(src.height, Math.round((src.width * 4) / 3))
  const cw = Math.round((ch * 3) / 4)
  const outH = Math.min(960, ch)
  const outW = Math.round((outH * 3) / 4)
  const out = document.createElement('canvas')
  out.width = outW
  out.height = outH
  out.getContext('2d')!.drawImage(src, (src.width - cw) / 2, (src.height - ch) / 2, cw, ch, 0, 0, outW, outH)
  return out.toDataURL('image/jpeg', 0.9)
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

export function FungroundCareer() {
  const [step, setStep] = useState<'intro' | 'photo' | 'ask' | 'result'>('intro')
  /** 0 = 활동 고르기(여럿) · 1 = MBTI · 2~7 = 상황 질문 여섯 */
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<CareerInterest[]>([])
  const [mbti, setMbti] = useState<MbtiType | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>(emptyAnswers)
  /** 찍은 사진(data: JPEG 3:4) — 사진 없이 계속했으면 null */
  const [photo, setPhoto] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [shotError, setShotError] = useState<string | null>(null)
  /** 4×6 카드 — 결과 화면에 오면 기기 안에서 그린다 */
  const [printable, setPrintable] = useState<FgPrintable | null>(null)

  const reset = useCallback(() => {
    setStep('intro')
    setIndex(0)
    setPicks([])
    setMbti(null)
    setAnswers(emptyAnswers())
    setPhoto(null)
    setCount(null)
    setShotError(null)
    setPrintable(null)
  }, [])
  const home = useFgHome(reset)
  // 셋을 세는 동안에는 처음으로 가지 않는다
  useIdle(step !== 'intro' && count === null, step === 'result' ? IDLE_RESULT_MS : IDLE_ASK_MS, home)

  // 사진 단계에서만 카메라를 켠다(노트북 웹캠 · 설치 기기 USB 웹캠) — 다른 단계로 가면 끈다
  const { state: camState, error: camError, retry: camRetry, videoRef: camVideoRef, still: takeStill } = useCamera({ enabled: step === 'photo', allowDslr: false })
  const capture = useCallback(async () => {
    try {
      setPhoto(cropShot(await takeStill()))
    } catch (cause) {
      setShotError(cause instanceof Error ? cause.message : '사진을 찍지 못했어요.')
    }
  }, [takeStill])
  // 3-2-1 → 찰칵(1 다음 1초 뒤에 찍고 잠깐 하얗게)
  useEffect(() => {
    if (count === null) return
    const timer = window.setTimeout(() => {
      if (count > 1) { setCount(count - 1); return }
      setCount(null)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 260)
      void capture()
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [count, capture])

  const result = useMemo(() => (step === 'result' ? exploreFgCareers(picks, mbti, answers) : null), [step, picks, mbti, answers])
  const combo = useMemo(() => (result ? pickCareerCombo(result.axes) : null), [result])

  // 결과가 나오면 4×6 카드를 그려 둔다(인쇄 창을 열 때 바로 보이게) — 올리는 것은 창을 열 때만(FgResultSheet)
  useEffect(() => {
    if (!result || !combo) return
    let alive = true
    drawCareerPrint({
      photo,
      tags: result.axes.slice(0, 2).map((axis) => t.axes[axis]),
      mbti,
      combo: { title: combo.title, axes: `${t.axes[combo.primary]} × ${t.axes[combo.secondary]}`, body: combo.body },
      careers: result.careers.map((id) => ({ name: t.careers[id].name, desc: t.careers[id].desc, art: axisArt(CAREERS[id].primary) })),
      first: t.careers[result.careers[0]].first,
      tone: TONE,
      date: new Date(),
    })
      .then((image) => { if (alive) setPrintable({ image, label: '미래 직업 탐색 카드', fileName: 'funground-career', printer: 'photo' }) })
      .catch((cause) => console.warn('[funground-career] 카드를 그리지 못했어요:', cause))
    return () => { alive = false }
  }, [result, combo, mbti, photo])

  const startShot = () => { setShotError(null); setCount(3) }
  const retake = () => { setPhoto(null); setShotError(null) }
  const toQuestions = (withPhoto: boolean) => {
    if (!withPhoto) setPhoto(null)
    setCount(null)
    setIndex(0)
    setStep('ask')
  }

  if (step === 'intro') {
    return (
      <FgStage className="fgc fgc--intro" tone={TONE} onHome={home}>
        <div className="fg-split fgc-intro">
          {/* 왼쪽 — 큰 글자 · 그림 */}
          <div className="fgc-visual">
            <p className="fgc-word">NEXT!</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fgc-hero" src="/assets/kiosk-experiences/career-hero.webp" alt="" draggable={false} />
          </div>
          {/* 오른쪽 — 소개 · 시작 */}
          <section className="fg-panel fgc-panel">
            <p className="fg-kicker">미래 직업 탐색 · 체험 프로그램</p>
            <h1 className="fg-title">{'나의 다음 가능성을\n찾아 볼까요?'}</h1>
            <p className="fg-lead">{'사진 한 장을 찍고, 좋아하는 활동과 질문 여덟 개로\n탐색해 볼 직업 세 가지를 찾아 카드로 만들어요'}</p>
            <ul className="fgc-facts">
              <li>사진 1장</li>
              <li>질문 8개</li>
              <li>약 3분</li>
            </ul>
            <div className="fgc-bottom">
              <button type="button" className="fg-btn fg-btn--primary fgc-wide" onClick={() => { setPhoto(null); setShotError(null); setStep('photo') }}>
                탐색 시작<ArrowRight size={44} strokeWidth={2.6} aria-hidden="true" />
              </button>
              <p className="fg-note">재미로 보는 탐색이에요 · 적성 검사가 아니에요</p>
            </div>
          </section>
        </div>
      </FgStage>
    )
  }

  if (step === 'photo') {
    const failed = !photo && camState === 'error'
    return (
      <FgStage className="fgc fgc--photo" tone={TONE} onHome={home}>
        <div className="fg-split fgc-shoot">
          {/* 왼쪽 — 세로 3:4 카메라(찍히는 범위 그대로) · 찍은 뒤에는 사진 */}
          <div className="fgc-view">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="fgc-feed" src={photo} alt="방금 찍은 사진" />
            ) : (
              <>
                <video ref={camVideoRef} className="fgc-feed fgc-feed--mirror" muted playsInline autoPlay />
                {camState === 'ready' && <div className="fgc-guide" aria-hidden="true"><span>얼굴이 점선 안에</span></div>}
                {camState === 'starting' && <div className="fgc-view-msg"><Loader2 className="fgc-spin" size={64} aria-hidden="true" />카메라를 켜는 중…</div>}
                {camState === 'error' && <div className="fgc-view-msg"><CameraOff size={72} aria-hidden="true" /><p role="alert">{camError}</p></div>}
                {count !== null && count > 0 && <div className="fgc-countdown" key={count} aria-live="assertive">{count}</div>}
              </>
            )}
            {flash && <div className="fgc-flash" />}
          </div>
          {/* 오른쪽 — 안내 · 찍기 / 다시 찍기 · 이 사진으로 */}
          <section className="fg-panel fgc-shoot-panel">
            <p className="fg-kicker">질문 전 · 탐험가 카드 사진</p>
            <h1 className="fg-title fg-title--md">{photo ? '이 사진으로\n할까요?' : '탐험가 카드에 들어갈\n사진을 찍어요'}</h1>
            <p className="fg-lead">
              {photo ? '얼굴이 잘 보이면\n「이 사진으로」를 눌러 주세요' : failed ? '카메라를 켜지 못했어요.\n다시 시도하거나 사진 없이 계속할 수 있어요' : '얼굴이 점선 안에 오게 서 주세요\n누르면 3초 뒤에 찰칵 찍혀요'}
            </p>
            <ul className="fgc-facts">
              <li>결과 카드에만 넣어요</li>
              <li>얼굴 분석은 하지 않아요</li>
            </ul>
            {shotError && <p className="fgc-error" role="alert">{shotError}</p>}
            <div className="fgc-bottom">
              {photo ? (
                <div className="fgc-pair">
                  <button type="button" className="fg-btn fg-btn--ghost" onClick={retake}><RotateCcw size={40} aria-hidden="true" />다시 찍기</button>
                  <button type="button" className="fg-btn fg-btn--primary" onClick={() => toQuestions(true)}>이 사진으로<ArrowRight size={40} strokeWidth={2.6} aria-hidden="true" /></button>
                </div>
              ) : failed ? (
                <div className="fgc-pair">
                  <button type="button" className="fg-btn fg-btn--ghost" onClick={camRetry}><RefreshCw size={38} aria-hidden="true" />다시 시도</button>
                  <button type="button" className="fg-btn fg-btn--primary" onClick={() => toQuestions(false)}>사진 없이 계속<ArrowRight size={40} strokeWidth={2.6} aria-hidden="true" /></button>
                </div>
              ) : (
                <button type="button" className="fg-btn fg-btn--primary fgc-wide" disabled={camState !== 'ready' || count !== null} onClick={startShot}>
                  <Camera size={44} aria-hidden="true" />{count !== null ? '곧 찍어요!' : '찍기 · 3초 뒤'}
                </button>
              )}
            </div>
          </section>
        </div>
      </FgStage>
    )
  }

  if (step === 'ask') {
    const kind = index === 0 ? 'interests' : index === 1 ? 'mbti' : 'question'
    const at = index - 2
    const situation = kind === 'question' ? SITUATIONS[at] : null
    const answered = kind === 'interests' ? picks.length > 0 : kind === 'mbti' ? true : answers[at] !== null
    const last = index === FG_CAREER_TOTAL - 1
    const next = () => { if (last) setStep('result'); else setIndex(index + 1) }
    // 첫 질문에서 이전 = 사진 단계(찍은 사진이 있으면 그 사진으로 다시 고를 수 있다)
    const back = () => { if (index === 0) setStep('photo'); else setIndex(index - 1) }
    return (
      <FgStage className="fgc fgc--ask" tone={TONE} onHome={home}>
        <div className="fgc-progress">
          <ol className="fg-steps" aria-hidden="true">
            {Array.from({ length: FG_CAREER_TOTAL }, (_, i) => <li key={i} data-state={i < index ? 'done' : i === index ? 'now' : undefined} />)}
          </ol>
          <p className="fgc-count"><b>{index + 1}</b> / {FG_CAREER_TOTAL}</p>
        </div>
        {/* 질문이 바뀔 때마다 새로 올라온다 */}
        <section className="fgc-q" key={index} data-kind={kind}>
          {/* 두 줄로 나눠 쓰던 상황 질문을 한 줄로(가로가 넉넉하다) */}
          <h1 className="fg-title fg-title--md">
            {kind === 'interests' ? t.q1Title : kind === 'mbti' ? t.mbtiTitle : situation!.title.join(' ')}
          </h1>
          <p className="fg-lead">{kind === 'interests' ? t.q1Sub : kind === 'mbti' ? t.mbtiSub : t.qSub}</p>

          {kind === 'interests' && (
            <div className="fgc-tiles" role="group" aria-label={t.q1Title}>
              {CAREER_INTERESTS.map(({ id, icon }, i) => {
                const Icon = ICONS[icon]
                const on = picks.includes(id)
                return (
                  <button key={id} type="button" aria-pressed={on} className="fgc-tile" data-on={on || undefined} data-warm={i % 4 === 1 || i % 4 === 2 || undefined}
                    onClick={() => setPicks((list) => (on ? list.filter((a) => a !== id) : [...list, id]))}>
                    {on && <i className="fgc-check" aria-hidden="true"><Check size={34} strokeWidth={3.4} /></i>}
                    <span className="fgc-icon"><Icon size={60} strokeWidth={1.7} aria-hidden="true" /></span>
                    <b>{t.interests[id]}</b>
                  </button>
                )
              })}
            </div>
          )}

          {kind === 'mbti' && (
            <>
              <div className="fgc-mbti" role="radiogroup" aria-label={t.mbtiTitle}>
                {MBTI_TYPES.map((type) => (
                  <button key={type} type="button" role="radio" aria-checked={mbti === type} data-on={mbti === type || undefined} onClick={() => setMbti(mbti === type ? null : type)}>{type}</button>
                ))}
              </div>
              <p className="fgc-mbti-note" key={mbti ?? 'none'}>
                {mbti ? mbtiLetters(mbti).slice(0, 2).map((letter) => t.mbtiLetters[letter]).join(' · ') : '모르면 아래 「잘 모르겠어요」를 눌러 넘어가요'}
              </p>
            </>
          )}

          {kind === 'question' && (
            <div className="fgc-options" role="radiogroup" aria-label={situation!.title.join(' ')} data-count={situation!.options.length}>
              {situation!.options.map((option, i) => {
                const Icon = ICONS[option.icon]
                const on = answers[at] === i
                return (
                  <button key={i} type="button" role="radio" aria-checked={on} className="fgc-option" data-on={on || undefined}
                    onClick={() => setAnswers((list) => list.map((value, n) => (n === at ? i : value)))}>
                    <span className="fgc-icon"><Icon size={58} strokeWidth={1.7} aria-hidden="true" /></span>
                    <b>{keepDot(option.label)}</b>
                    <i className="fgc-radio" aria-hidden="true">{on && <Check size={34} strokeWidth={3.4} />}</i>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* 맨 아래 한 줄 — 왼쪽 이전 · 가운데 고른 수 · 오른쪽 다음 */}
        <div className="fgc-bar">
          <button type="button" className="fg-btn fg-btn--ghost fgc-back" onClick={back}>
            <ArrowLeft size={40} strokeWidth={2.6} aria-hidden="true" />{index === 0 ? '사진' : '이전'}
          </button>
          {kind === 'interests' && <p className="fgc-picked" aria-live="polite">{t.picked(picks.length)}</p>}
          <button type="button" className="fg-btn fg-btn--primary fgc-next" disabled={!answered} onClick={next}>
            {kind === 'mbti' && !mbti ? t.mbtiSkip : last ? '결과 보기' : '다음'}<ArrowRight size={40} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>
      </FgStage>
    )
  }

  if (!result || !combo) return null
  const topCareer = result.careers[0]
  return (
    <FgStage className="fgc fgc--result" tone={TONE} onHome={home}>
      <div className="fg-split fgc-result">
        {/* 왼쪽 — 완료 · 축 태그 · 재미로 보는 풀이 */}
        <section className="fg-panel fgc-read">
          <p className="fgc-head">
            <span className="fgc-done"><i aria-hidden="true"><Check size={26} strokeWidth={3.4} /></i>{t.done}</span>
            <span className="fgc-tags">
              {result.axes.slice(0, 2).map((axis) => <span key={axis}>#{t.axes[axis]}</span>)}
              {mbti && <span data-clue>{mbti}</span>}
            </span>
          </p>

          <article className="fgc-combo" aria-label="재미로 보는 풀이">
            {/* 위 — 풀이 제목(왼쪽) · 찍은 사진(오른쪽, 탐험가 카드처럼) */}
            <div className="fgc-combo-top">
              <div className="fgc-combo-head">
                <span className="fg-fun">재미로 보는 풀이예요</span>
                <h2>{combo.title}</h2>
                <p className="fgc-combo-axes">{t.axes[combo.primary]} × {t.axes[combo.secondary]}</p>
              </div>
              {photo && (
                <figure className="fgc-me">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="찍은 사진" />
                  <figcaption>탐험가</figcaption>
                </figure>
              )}
            </div>
            <p className="fgc-combo-body">{combo.body.join(' ')}</p>
          </article>
        </section>

        {/* 오른쪽 — 탐색해 볼 직업 셋 · 작은 첫 도전 · 처음으로 */}
        <section className="fg-panel fgc-picks">
          <h1 className="fg-title fg-title--md">{t.resultTitle}</h1>

          <ol className="fgc-careers">
            {result.careers.map((id, i) => {
              const career = CAREERS[id]
              return (
                <li key={id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={axisArt(career.primary)} alt="" draggable={false} />
                  <div>
                    <b><em>{String(i + 1).padStart(2, '0')}</em>{t.careers[id].name}</b>
                    <span>{t.careers[id].desc}</span>
                  </div>
                </li>
              )
            })}
          </ol>

          <section className="fgc-first">
            <Lightbulb size={52} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <em>{t.firstLabel}</em>
              <b>{t.careers[topCareer].first}</b>
            </div>
          </section>

          {/* 맨 아래 — 처음으로 · 사진 인쇄하기(4×6 카드 미리보기 · 휴대폰으로 받기 QR) */}
          <div className="fgc-bottom">
            <div className="fgc-pair">
              <button type="button" className="fg-btn fg-btn--ghost" onClick={home}>처음으로</button>
              <FgPrintButton printable={printable} className="fg-btn fg-btn--primary" label="사진 인쇄하기" />
            </div>
            <p className="fg-note fgc-center">{t.resultFoot}</p>
          </div>
        </section>
      </div>
    </FgStage>
  )
}
