'use client'

// 펀그라운드 별내 B안 미래 직업 탐색(NEXT!) — 1080×1920 세로 화면(FgStage).
// 키오스크 studio-career(CareerMode)를 건드리지 않으려고 화면은 따로 두고, 규칙표 · 문구는 그대로 가져다 쓴다:
//   data.ts(활동 · MBTI · 상황 질문 다섯 · 16개 직업) · text.ts(한국어 문구) · 축 그림(public/assets/kiosk-experiences/career-*.webp)
// 바뀐 점: 관상 사진 단계 없음(카메라를 켜지 않는다) · 새 상황 질문 하나(src/lib/funground/career.ts) · AI 풀이 대신 축 조합 풀이(career-combos.ts).
// 외부 서비스 · /api 를 부르지 않는다 — 모두 기기 안에서 계산한다. 체험 프로그램이라 'AI'라고 쓰지 않는다.
// 결과는 「탐색해 볼 직업」 · 「재미로 보는 풀이」 — 능력이나 적성을 판정하지 않는다.

import {
  ArrowLeft, ArrowRight, CalendarDays, Check, Ear, FlaskConical, Gamepad2, Gift, GraduationCap, HandHeart, Hammer, HeartHandshake, Image as ImageIcon,
  Lightbulb, Megaphone, MessagesSquare, Mic, Palette, Presentation, Puzzle, Scissors, Search, Sparkles, Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import { CAREERS, CAREER_INTERESTS, CAREER_QUESTIONS, MBTI_TYPES, mbtiLetters, type CareerAxis, type CareerInterest, type MbtiType } from '@/app/kiosk/experience/career/data'
import { CAREER_TEXT } from '@/app/kiosk/experience/career/text'
import { FG_CAREER_EXTRA_QUESTION, FG_CAREER_QUESTION_COUNT, FG_CAREER_TOTAL, exploreFgCareers } from '@/lib/funground/career'
import { pickCareerCombo } from '@/lib/funground/career-combos'
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
const emptyAnswers = () => Array.from({ length: FG_CAREER_QUESTION_COUNT }, () => null as number | null)

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
  const [step, setStep] = useState<'intro' | 'ask' | 'result'>('intro')
  /** 0 = 활동 고르기(여럿) · 1 = MBTI · 2~7 = 상황 질문 여섯 */
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<CareerInterest[]>([])
  const [mbti, setMbti] = useState<MbtiType | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>(emptyAnswers)

  const reset = useCallback(() => {
    setStep('intro')
    setIndex(0)
    setPicks([])
    setMbti(null)
    setAnswers(emptyAnswers())
  }, [])
  const home = useFgHome(reset)
  useIdle(step !== 'intro', step === 'result' ? IDLE_RESULT_MS : IDLE_ASK_MS, home)

  const result = useMemo(() => (step === 'result' ? exploreFgCareers(picks, mbti, answers) : null), [step, picks, mbti, answers])
  const combo = useMemo(() => (result ? pickCareerCombo(result.axes) : null), [result])

  if (step === 'intro') {
    return (
      <FgStage className="fgc fgc--intro" tone={TONE} onHome={home}>
        <section className="fgc-intro">
          <p className="fgc-word">NEXT!</p>
          <p className="fg-kicker">미래 직업 탐색 · 체험 프로그램</p>
          <h1 className="fg-title">{'나의 다음 가능성을\n찾아 볼까요?'}</h1>
          <p className="fg-lead">{'좋아하는 활동과 질문 여덟 개로\n탐색해 볼 직업 세 가지를 찾아요'}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="fgc-hero" src="/assets/kiosk-experiences/career-hero.webp" alt="" draggable={false} />
          <ul className="fgc-facts">
            <li>질문 8개</li>
            <li>약 2분</li>
            <li>사진은 찍지 않아요</li>
          </ul>
        </section>
        <div className="fgc-bottom">
          <button type="button" className="fg-btn fg-btn--primary fgc-wide" onClick={() => { setIndex(0); setStep('ask') }}>
            탐색 시작<ArrowRight size={44} strokeWidth={2.6} aria-hidden="true" />
          </button>
          <p className="fg-note fgc-center">재미로 보는 탐색이에요 · 적성 검사가 아니에요</p>
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
    const back = () => { if (index === 0) setStep('intro'); else setIndex(index - 1) }
    return (
      <FgStage className="fgc fgc--ask" tone={TONE} onHome={home}>
        <div className="fgc-progress">
          <ol className="fg-steps" aria-hidden="true">
            {Array.from({ length: FG_CAREER_TOTAL }, (_, i) => <li key={i} data-state={i < index ? 'done' : i === index ? 'now' : undefined} />)}
          </ol>
          <p className="fgc-count"><b>{index + 1}</b> / {FG_CAREER_TOTAL}</p>
        </div>
        {/* 질문이 바뀔 때마다 새로 올라온다 */}
        <section className="fgc-q" key={index}>
          <h1 className="fg-title fg-title--md">
            {kind === 'interests' ? t.q1Title : kind === 'mbti' ? t.mbtiTitle : situation!.title.join('\n')}
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
                    <b>{option.label}</b>
                    <i className="fgc-radio" aria-hidden="true">{on && <Check size={34} strokeWidth={3.4} />}</i>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className="fgc-bottom">
          {kind === 'interests' && <p className="fgc-picked" aria-live="polite">{t.picked(picks.length)}</p>}
          <div className="fg-actions fg-actions--row">
            <button type="button" className="fg-btn fg-btn--ghost fgc-back" onClick={back}>
              <ArrowLeft size={40} strokeWidth={2.6} aria-hidden="true" />{index === 0 ? '처음 화면' : '이전'}
            </button>
            <button type="button" className="fg-btn fg-btn--primary fgc-next" disabled={!answered} onClick={next}>
              {kind === 'mbti' && !mbti ? t.mbtiSkip : last ? '결과 보기' : '다음'}<ArrowRight size={40} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </div>
        </div>
      </FgStage>
    )
  }

  if (!result || !combo) return null
  const topCareer = result.careers[0]
  return (
    <FgStage className="fgc fgc--result" tone={TONE} onHome={home}>
      <section className="fgc-result">
        <p className="fgc-done"><i aria-hidden="true"><Check size={26} strokeWidth={3.4} /></i>{t.done}</p>
        <h1 className="fg-title fg-title--md">{t.resultTitle}</h1>
        <p className="fgc-tags">
          {result.axes.slice(0, 2).map((axis) => <span key={axis}>#{t.axes[axis]}</span>)}
          {mbti && <span data-clue>{mbti}</span>}
        </p>

        <article className="fgc-combo" aria-label="재미로 보는 풀이">
          <span className="fg-fun">재미로 보는 풀이예요</span>
          <h2>{combo.title}</h2>
          <p className="fgc-combo-axes">{t.axes[combo.primary]} × {t.axes[combo.secondary]}</p>
          <p className="fgc-combo-body">{combo.body.join(' ')}</p>
        </article>

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
      </section>
      <div className="fgc-bottom">
        <button type="button" className="fg-btn fg-btn--primary fgc-wide" onClick={home}>처음으로</button>
        <p className="fg-note fgc-center">{t.resultFoot}</p>
      </div>
    </FgStage>
  )
}
