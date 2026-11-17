'use client'

// 펀그라운드 별내 B안 미래 직업 탐색(NEXT!) — 1920×1080 가로 화면, 「FUN GROUND Editorial」 테마(2026-11-16 목업 next_1~3, 강조색 블루 #2E6BFF).
// 위 막대 단계: 01 첫 화면 · 02 사진 + 질문 여덟 · 03 결과.
//   첫 화면: 왼쪽 45% 꽉 찬 흑백 사진(가는 블루 선 01 · 02 · 03) · 오른쪽 라벨 띠 · NEXT! · 「나의 다음 가능성」(블루 밑줄) · 한 줄 · 탐색 시작
//   사진(질문 앞 따로 한 단계, 2026-11-14 「모든 프로그램에 사진」): 왼쪽 45% 카메라 + 블루 모서리 괄호 · 오른쪽 「02 / 촬영」 · 큰 카운트다운 · 찍기
//   질문: 위 가는 진행 막대 + 「03 / 08」 · 왼쪽 큰 질문(블루 밑줄) + 아래 사진 띠 · 오른쪽 A·B·C·D 큰 칸(가는 선 아이콘, 고른 칸 블루)
//     목업과 다른 곳 — 활동 여덟(여럿 고르기)은 4×2 칸 A~H, MBTI 는 4×4 유형 칸(글자 없이 유형만), 보기 셋인 질문은 3칸 한 줄,
//     목업에 없는 이전 · 다음 단추를 오른쪽 아래에 둔다(여럿 고르기 · MBTI 건너뛰기 · 답 고치기 때문에 자동으로 넘기지 않는다)
//   결과: 왼쪽 찍은 사진(꽉 차게) + 축 조합 라벨 · 오른쪽 「탐색해 볼 직업」 · 재미로 보는 풀이(제목 + 첫 문장) · 직업 셋(번호 · 선 아이콘 · 이름) · 작은 첫 도전 · 인쇄하기 / QR로 받기
// 키오스크 studio-career(CareerMode)를 건드리지 않으려고 화면은 따로 두고, 규칙표 · 문구는 그대로 가져다 쓴다:
//   data.ts(활동 · MBTI · 상황 질문 다섯 · 16개 직업) · text.ts(한국어 문구)
// 바뀐 점: 관상 분석 없음 — 사진은 결과 카드에 넣을 뿐 얼굴을 읽지 않는다 · 새 상황 질문 하나(src/lib/funground/career.ts) · AI 풀이 대신 축 조합 풀이(career-combos.ts).
// 사진 · 결과는 기기 안에만 있다 — 「인쇄하기 · QR로 받기」 창(FgResultButtons)을 열 때만 카드 그림을 QR 받기용으로 우리 서버에 올린다(24시간, 사용자 결정).
// 카메라를 못 켜면(권한 거절 · 카메라 없음) 「사진 없이 계속」으로 넘어간다 — 데모가 막히지 않게. 그 밖에는 외부 서비스 · AI 를 부르지 않는다.
// 체험 프로그램이라 'AI'라고 쓰지 않는다.
// 결과는 「탐색해 볼 직업」 · 「재미로 보는 풀이」 — 능력이나 적성을 판정하지 않는다.

import {
  ArrowLeft, Armchair, Box, CalendarDays, CameraOff, ChartColumn, ChefHat, Clapperboard, ClipboardList, CodeXml, Ear, FlaskConical, Gamepad2, Gift, GraduationCap,
  HandHeart, Hammer, HeartHandshake, Image as ImageIcon, Lightbulb, Loader2, Megaphone, MessageCircleHeart, MessagesSquare, Mic, MousePointerClick, Newspaper,
  Palette, PenTool, Presentation, Puzzle, Scissors, Search, Sparkles, Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import { FgResultButtons, type FgPrintable } from '@/components/funground/FgResultSheet'
import { useCamera } from '@/app/booth/programs/use-camera'
import { CAREER_INTERESTS, MBTI_TYPES, CAREER_QUESTIONS, mbtiLetters, type CareerId, type CareerInterest, type MbtiType } from '@/app/kiosk/experience/career/data'
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
/** 결과 직업 칸의 가는 선 아이콘(목업처럼 직업마다 하나) */
const CAREER_ICONS: Record<CareerId, IconType> = {
  'brand-designer': PenTool, 'space-designer': Armchair, 'product-designer': Box, 'food-creator': ChefHat,
  developer: CodeXml, 'data-analyst': ChartColumn, 'service-planner': ClipboardList, researcher: Newspaper,
  'social-worker': HandHeart, teacher: GraduationCap, 'service-designer': MousePointerClick, counselor: MessageCircleHeart,
  'content-planner': Clapperboard, host: Mic, marketer: Megaphone, 'community-manager': Users,
}
const ART = '/assets/booth-programs/funground-editorial'
const KEYS = 'ABCDEFGH'
/** 카메라 칸 = 화면 왼쪽 45%(864 × 984) — 찍힌 사진도 이 비율 그대로(보인 만큼 찍힌다) */
const VIEW_W = 864
const VIEW_H = 984
/** 아무도 누르지 않으면 처음으로 — 질문 중 2분 · 결과 1분 30초 */
const IDLE_ASK_MS = 120_000
const IDLE_RESULT_MS = 90_000

const t = CAREER_TEXT.ko
/** 상황 질문 여섯의 [제목 두 줄, 보기(아이콘 · 글)] — 앞 다섯은 기존 질문(text.ts · data.ts) 그대로 */
const SITUATIONS = [
  ...CAREER_QUESTIONS.map((q, i) => ({ title: t.questions[i].title, options: q.icons.map((icon, n) => ({ icon, label: t.questions[i].options[n] })) })),
  { title: FG_CAREER_EXTRA_QUESTION.title, options: FG_CAREER_EXTRA_QUESTION.options.map(({ icon, label }) => ({ icon, label })) },
]
/** 활동 · MBTI 질문 제목 — 두 줄로 나눠 둘째 줄에 블루 밑줄(문구는 text.ts 그대로) */
const INTEREST_TITLE: [string, string] = ['마음이 가는', '활동을 골라요']
const MBTI_TITLE: [string, string] = ['MBTI를', '알고 있나요?']
/** 보기 글이 줄을 바꿀 때 「·」가 줄 맨 앞에 오지 않게 — 앞 낱말에 붙인다(글은 그대로, 앞 칸만 줄 안 바뀌는 칸으로) */
const keepDot = (label: string) => label.replace(/ · /g, ' · ')
const emptyAnswers = () => Array.from({ length: FG_CAREER_QUESTION_COUNT }, () => null as number | null)
const two = (n: number) => String(n).padStart(2, '0')

/** 찍힌 사진 — 카메라 칸(864:984, 가득 채움)에 보인 가운데만, 높이 최대 960 JPEG(기기 메모리에만). still() 은 이미 거울 방향 */
function cropShot(src: HTMLCanvasElement): string {
  const ch = Math.min(src.height, Math.round((src.width * VIEW_H) / VIEW_W))
  const cw = Math.round((ch * VIEW_W) / VIEW_H)
  const outH = Math.min(960, ch)
  const outW = Math.round((outH * VIEW_W) / VIEW_H)
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

/** 단추 오른쪽 가는 화살표(목업의 긴 화살표) */
function Arrow() {
  return (
    <svg className="fge-arrow" viewBox="0 0 96 40" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square" aria-hidden="true">
      <path d="M2 20h90M74 4l18 16-18 16" />
    </svg>
  )
}

/** 첫 화면 사진 위 가는 블루 선 01 · 02 · 03(칸 864 × 984 기준 좌표 — 사진 속 머리 · 얼굴 · 가방끈을 가리킨다). 번호는 HTML 글자(SVG 글자는 글꼴이 들쭉날쭉) */
function HeroMarks() {
  return (
    <div className="fgc-marks" aria-hidden="true">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <g fill="none" stroke="var(--fg-accent)" strokeWidth={2}>
          <path d="M-40 250 A 260 260 0 0 1 170 600" />
          <path d="M600 984 A 300 300 0 0 1 864 820" />
          <path d="M70 196 H 250 L 316 262" />
          <path d="M842 500 H 620 L 494 462" />
          <path d="M60 790 H 150 L 196 836" />
        </g>
        <g fill="var(--fg-accent)">
          <rect x={308} y={254} width={16} height={16} />
          <rect x={486} y={454} width={16} height={16} />
          <rect x={188} y={828} width={16} height={16} />
        </g>
      </svg>
      <i style={{ left: 70, top: 132 }}>01</i>
      <i style={{ right: 112, top: 436 }} data-dark>02</i>
      <i style={{ left: 60, top: 726 }}>03</i>
    </div>
  )
}

/** 질문 제목 두 줄 — 둘째 줄에 블루 밑줄 */
const QTitle = ({ lines }: { lines: readonly [string, string] | readonly string[] }) => (
  // 두 줄 다 짧으면(8자 이하) 목업처럼 더 크게
  <h1 className="fge-head fgc-qtitle" data-big={lines.every((line) => line.length <= 8) || undefined}>{lines[0]}<br /><u>{lines[1]}</u></h1>
)

export function FungroundCareer() {
  const [step, setStep] = useState<'intro' | 'photo' | 'ask' | 'result'>('intro')
  /** 0 = 활동 고르기(여럿) · 1 = MBTI · 2~7 = 상황 질문 여섯 */
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<CareerInterest[]>([])
  const [mbti, setMbti] = useState<MbtiType | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>(emptyAnswers)
  /** 찍은 사진(data: JPEG 864:984) — 사진 없이 계속했으면 null */
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
      careers: result.careers.map((id) => ({ name: t.careers[id].name, desc: t.careers[id].desc })),
      first: t.careers[result.careers[0]].first,
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
      <FgStage className="fgc fgc--intro" program="next" step={1} onHome={home}>
        <div className="fge-split">
          <div className="fge-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ART}/next-hero.webp`} alt="" draggable={false} />
            <HeroMarks />
          </div>
          <section className="fge-panel fgc-intro">
            <div className="fge-labelrow"><span className="fge-label">미래 직업 탐색 · 체험 프로그램</span></div>
            <h1 className="fge-title">NEXT!</h1>
            <p className="fge-head"><u>나의 다음 가능성</u></p>
            <p className="fge-lead">질문 8개와 사진 한 장으로 찾아요</p>
            <button type="button" className="fge-btn fge-btn--wide fgc-start" onClick={() => { setPhoto(null); setShotError(null); setStep('photo') }}>
              탐색 시작<Arrow />
            </button>
          </section>
        </div>
      </FgStage>
    )
  }

  if (step === 'photo') {
    const failed = !photo && camState === 'error'
    let panel: ReactNode
    if (photo) {
      panel = (
        <>
          <h1 className="fge-head">이 사진으로<br /><u>할까요?</u></h1>
          <p className="fge-lead">얼굴이 잘 보이면 「이 사진으로」를 눌러 주세요</p>
          <div className="fgc-grow" />
          <div className="fge-actions">
            <button type="button" className="fge-btn fge-btn--ghost" onClick={retake}>다시 찍기</button>
            <button type="button" className="fge-btn" onClick={() => toQuestions(true)}>이 사진으로</button>
          </div>
        </>
      )
    } else if (failed) {
      panel = (
        <>
          <h1 className="fge-head">카메라를<br /><u>켜지 못했어요</u></h1>
          <p className="fge-lead">다시 시도하거나 사진 없이 계속할 수 있어요</p>
          <div className="fgc-grow" />
          <div className="fge-actions">
            <button type="button" className="fge-btn fge-btn--ghost" onClick={camRetry}>다시 시도</button>
            <button type="button" className="fge-btn" onClick={() => toQuestions(false)}>사진 없이 계속</button>
          </div>
        </>
      )
    } else {
      panel = (
        <>
          <h1 className="fge-head"><u>얼굴을 가운데 맞춰 주세요</u></h1>
          <p className="fge-lead fge-soft">얼굴 분석 없이 결과 카드에만 넣어요</p>
          {/* 아주 큰 카운트다운 — 누르기 전에는 옅은 3 */}
          <p className="fge-count fgc-count" data-idle={count === null || undefined} key={count ?? 'idle'} aria-live="assertive">{count ?? 3}</p>
          <button type="button" className="fge-btn fge-btn--wide fgc-shoot" disabled={camState !== 'ready' || count !== null} onClick={startShot}>
            {count !== null ? '곧 찍어요!' : '찍기'}<Arrow />
          </button>
        </>
      )
    }
    return (
      <FgStage className="fgc fgc--photo" program="next" step={2} onHome={home}>
        <div className="fge-split">
          <div className="fge-cam">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="방금 찍은 사진" />
            ) : (
              <>
                <video ref={camVideoRef} className="fgc-mirror" muted playsInline autoPlay />
                {camState === 'ready' && (
                  <>
                    <span className="fge-camtag">밝은 곳에서 정면으로</span>
                    <div className="fge-brackets" aria-hidden="true"><span /><span /><span /><span /></div>
                  </>
                )}
                {camState === 'starting' && <div className="fgc-view-msg"><Loader2 className="fgc-spin" size={64} strokeWidth={1.5} aria-hidden="true" />카메라를 켜는 중…</div>}
                {camState === 'error' && <div className="fgc-view-msg"><CameraOff size={72} strokeWidth={1.25} aria-hidden="true" /><p role="alert">{camError}</p></div>}
              </>
            )}
            {flash && <div className="fgc-flash" />}
          </div>
          <section className="fge-panel fgc-shot">
            <span className="fge-steplabel">02 / 촬영</span>
            {panel}
            {shotError && <p className="fgc-error" role="alert">{shotError}</p>}
          </section>
        </div>
      </FgStage>
    )
  }

  if (step === 'ask') {
    const kind = index === 0 ? 'interests' : index === 1 ? 'mbti' : 'question'
    const at = index - 2
    const situation = kind === 'question' ? SITUATIONS[at] : null
    const answered = kind === 'interests' ? picks.length > 0 : kind === 'mbti' ? mbti !== null : answers[at] !== null
    const canNext = kind === 'mbti' || answered
    const last = index === FG_CAREER_TOTAL - 1
    const next = () => { if (last) setStep('result'); else setIndex(index + 1) }
    // 첫 질문에서 이전 = 사진 단계(찍은 사진이 있으면 그 사진으로 다시 고를 수 있다)
    const back = () => { if (index === 0) setStep('photo'); else setIndex(index - 1) }
    const title = kind === 'interests' ? INTEREST_TITLE : kind === 'mbti' ? MBTI_TITLE : situation!.title
    const lead = kind === 'interests' ? t.q1Sub
      : kind === 'mbti' ? (mbti ? mbtiLetters(mbti).slice(0, 2).map((letter) => t.mbtiLetters[letter]).join(' · ') : t.mbtiSub)
      : t.qSub
    return (
      <FgStage className="fgc fgc--ask" program="next" step={2} onHome={home}>
        <div className="fgc-top">
          <ol className="fge-progress" aria-label={`질문 ${index + 1} / ${FG_CAREER_TOTAL}`}>
            {Array.from({ length: FG_CAREER_TOTAL }, (_, i) => <li key={i} data-on={i < index || (i === index && answered) || undefined} />)}
            <li className="fge-progress-count">{two(index + 1)} / {two(FG_CAREER_TOTAL)}</li>
          </ol>
        </div>
        <div className="fgc-ask">
          {/* 왼쪽 — 큰 질문 · 한 줄 · 아래 사진 띠 */}
          <section className="fgc-qside" key={`q${index}`}>
            <div className="fgc-qtext">
              <QTitle lines={title} />
              <p className="fge-lead fgc-qlead" key={mbti ?? 'none'}>{lead}</p>
            </div>
            <div className="fgc-strip fge-grain">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ART}/next-strip.webp`} alt="" draggable={false} />
            </div>
          </section>

          {/* 오른쪽 — 보기 칸 · 이전 / 다음 */}
          <section className="fgc-aside">
            {kind === 'interests' && (
              <div className="fge-qgrid fgc-grid" data-layout="8" role="group" aria-label={t.q1Title}>
                {CAREER_INTERESTS.map(({ id, icon }, i) => {
                  const Icon = ICONS[icon]
                  const on = picks.includes(id)
                  return (
                    <button key={id} type="button" aria-pressed={on} className="fge-qcard"
                      onClick={() => setPicks((list) => (on ? list.filter((a) => a !== id) : [...list, id]))}>
                      <span className="fge-key">{KEYS[i]}</span>
                      <Icon strokeWidth={1.4} aria-hidden="true" />
                      <b>{keepDot(t.interests[id])}</b>
                    </button>
                  )
                })}
              </div>
            )}

            {kind === 'mbti' && (
              <div className="fge-qgrid fgc-grid" data-layout="mbti" role="radiogroup" aria-label={t.mbtiTitle}>
                {MBTI_TYPES.map((type) => (
                  <button key={type} type="button" role="radio" aria-checked={mbti === type} className="fge-qcard fgc-type" onClick={() => setMbti(mbti === type ? null : type)}>{type}</button>
                ))}
              </div>
            )}

            {kind === 'question' && (
              <div className="fge-qgrid fgc-grid" data-layout={situation!.options.length} role="radiogroup" aria-label={situation!.title.join(' ')}>
                {situation!.options.map((option, i) => {
                  const Icon = ICONS[option.icon]
                  const on = answers[at] === i
                  return (
                    <button key={i} type="button" role="radio" aria-checked={on} className="fge-qcard"
                      onClick={() => setAnswers((list) => list.map((value, n) => (n === at ? i : value)))}>
                      <span className="fge-key">{KEYS[i]}</span>
                      <Icon strokeWidth={1.4} aria-hidden="true" />
                      <b>{keepDot(option.label)}</b>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="fgc-nav">
              <button type="button" className="fge-btn fge-btn--ghost fgc-back" onClick={back}>
                <ArrowLeft size={44} strokeWidth={1.5} aria-hidden="true" />{index === 0 ? '사진' : '이전'}
              </button>
              <p className="fgc-picked" aria-live="polite">{kind === 'interests' && picks.length > 0 ? t.picked(picks.length) : ''}</p>
              <button type="button" className="fge-btn fgc-next" disabled={!canNext} onClick={next}>
                {kind === 'mbti' && !mbti ? t.mbtiSkip : last ? '결과 보기' : '다음'}<Arrow />
              </button>
            </div>
          </section>
        </div>
      </FgStage>
    )
  }

  if (!result || !combo) return null
  const topCareer = result.careers[0]
  return (
    <FgStage className="fgc fgc--result" program="next" step={3} onHome={home}>
      <div className="fge-split">
        {/* 왼쪽 — 찍은 사진(꽉 차게) + 축 조합 라벨 */}
        <div className="fge-hero fgc-me">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="찍은 사진" />
          ) : (
            <p className="fgc-nophoto" aria-hidden="true">NEXT!</p>
          )}
          <span className="fge-label fgc-axes">{t.axes[combo.primary]} × {t.axes[combo.secondary]}</span>
        </div>

        {/* 오른쪽 — 탐색해 볼 직업 · 재미로 보는 풀이 · 직업 셋 · 작은 첫 도전 · 인쇄하기 / QR로 받기 */}
        <section className="fge-panel fgc-result">
          <h1 className="fge-head fgc-rtitle"><u>{t.resultTitle}</u></h1>

          <article className="fgc-combo" aria-label="재미로 보는 풀이">
            <p className="fgc-combo-head"><span>재미로 보는 풀이</span><b>{combo.title}</b>{mbti && <em>{mbti}</em>}</p>
            <p className="fgc-combo-body">{combo.body[0]}</p>
          </article>

          <ol className="fgc-careers">
            {result.careers.map((id, i) => {
              const Icon = CAREER_ICONS[id]
              return (
                <li key={id}>
                  <i>{two(i + 1)}</i>
                  <Icon strokeWidth={1.3} aria-hidden="true" />
                  <b>{keepDot(t.careers[id].name)}</b>
                </li>
              )
            })}
          </ol>

          <p className="fgc-first"><span>{t.firstLabel}</span>{t.careers[topCareer].first}</p>

          <FgResultButtons printable={printable} />
        </section>
      </div>
    </FgStage>
  )
}
