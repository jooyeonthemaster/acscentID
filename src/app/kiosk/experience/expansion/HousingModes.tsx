'use client'

// 주거복지대전(2026-12-16) 체험 3종 화면 — 주거복지 내비게이터 · 우리 집 성향 테스트 · 2036 우리 집의 나.
// 데이터·규칙은 lib/kiosk/expansion/housing.ts. 결과는 체험 18종과 같은 결과 카드(ExperienceResult)라
// 인쇄(영수증 + QR)·휴대폰으로 받기(TakeActions)·AI 분석(AiWait)을 그대로 쓴다.
// 내비게이터·성향 테스트는 사진을 찍지 않는다(정책 안내에 얼굴이 필요 없다).

import { useState } from 'react'
import { ArrowRight, House, Palette, RefreshCw } from 'lucide-react'
import { applyAiAnalysis, type AiAnalysis } from '@/lib/kiosk/expansion/ai'
import {
  HOME_SCENES, HOME_STYLES, homeResult, MATE_QUESTIONS, mateCandidates, mateResult, mateSummary,
  NAVI_QUESTIONS, naviCandidates, naviResult, naviSummary, type Answers, type HomeScene, type HomeStyle, type MateType,
} from '@/lib/kiosk/expansion/housing'
import { IMAGE_LABEL, type ImageParams } from '@/lib/kiosk/expansion/image-prompts'
import { PHOTO_PLANS, readingLine, type PhotoReading } from '@/lib/kiosk/expansion/photo'
import type { ExperienceResult, Question } from '@/lib/kiosk/expansion/types'
import { useAiJob } from './ai-client'
import { AiImage, AiWait } from './AiStep'
import { PhotoStep } from './PhotoStep'
import { ChoiceTile, ExpansionFrame, ExpansionStart, PrimaryButton, ResultPanel, TakeActions } from './shared'

export type HousingId = 'housing-navi' | 'housing-mate' | 'housing-home'

/** 한 화면에 한 문항 — 큰 타일로 고르고 '다음' */
function QuestionPage({ question: q, value, onChange }: { question: Question; value: Answers[string] | undefined; onChange: (value: Answers[string]) => void }) {
  const selected = Array.isArray(value) ? value : []
  const [limit, setLimit] = useState(false)
  const choose = (id: string) => {
    setLimit(false)
    if (q.type !== 'multi') { onChange(id); return }
    if (selected.includes(id)) onChange(selected.filter((v) => v !== id))
    else if (selected.length < (q.max ?? Infinity)) onChange([...selected, id])
    else setLimit(true)
  }
  return <section className="ex-question" data-question={q.key}>
    <div className="ex-grid">{q.options?.map((option) => <ChoiceTile key={option.id} label={option.label} note={option.note} selected={q.type === 'multi' ? selected.includes(option.id) : value === option.id} onClick={() => choose(option.id)} />)}</div>
    {limit && <p className="ex-alert" role="alert" style={{ marginTop: 12 }}>{q.max}개까지 고를 수 있어요. 고른 카드를 다시 누르면 해제돼요.</p>}
  </section>
}

const answered = (q: Question, value: Answers[string] | undefined) => q.type === 'multi' ? Array.isArray(value) && value.length > 0 : typeof value === 'string' && value !== ''

/** 내비게이터·성향 테스트 공통 — 시작 → 문항(한 화면에 하나) → AI 분석 → 결과 */
function QuizMode({ id, questions, start, build, request, resultTitle }: {
  id: 'housing-navi' | 'housing-mate'
  questions: Question[]
  start: { headline: string; description: string; steps: [string, string, string] }
  /** 답 + AI 분석(없으면 null) → 결과 카드 */
  build: (answers: Answers, analysis: AiAnalysis | null) => ExperienceResult
  request: (answers: Answers) => { answers: { label: string; value: string }[]; candidates: { id: string; title: string; summary: string }[]; context: string }
  resultTitle: string
}) {
  const [page, setPage] = useState<'start' | 'quiz' | 'ai' | 'result'>('start')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const ai = useAiJob()
  const q = questions[step]
  const done = ai.state.phase === 'done' ? ai.state : null

  const analyze = (final: Answers) => {
    setPage('ai')
    const made = request(final)
    void ai.run({ analysis: { id, photo: null, facts: '', ...made } }).then((finished) => { if (finished) setPage('result') })
  }

  if (page === 'start') return <ExpansionStart id={id} headline={start.headline} description={start.description} steps={start.steps} onStart={() => { setAnswers({}); setStep(0); ai.reset(); setPage('quiz') }} />
  if (page === 'ai') return <AiWait id={id} state={ai.state} onRetry={() => analyze(answers)} onSkip={() => { ai.skip(); setPage('result') }} onBack={() => { ai.reset(); setPage('quiz') }} />
  if (page === 'quiz') {
    const last = step === questions.length - 1
    return <ExpansionFrame title={q.title} subtitle={q.note ?? `${step + 1} / ${questions.length}`} onBack={() => (step ? setStep(step - 1) : setPage('start'))}
      actions={<PrimaryButton disabled={!answered(q, answers[q.key])} onClick={() => (last ? analyze(answers) : setStep(step + 1))}>{last ? `${resultTitle} 보기` : '다음'} <ArrowRight size={22} /></PrimaryButton>}>
      <div className="ex-progress" aria-label={`총 ${questions.length}문항 중 ${step + 1}번째`}>{questions.map((_, i) => <span key={i} data-done={i <= step || undefined} />)}</div>
      <QuestionPage key={q.key} question={q} value={answers[q.key]} onChange={(value) => { setAnswers((a) => ({ ...a, [q.key]: value })); ai.reset() }} />
    </ExpansionFrame>
  }
  const result = build(answers, done?.analysis ?? null)
  return <ExpansionFrame title={result.title} subtitle={done?.analysis ? '답변을 AI가 함께 보고 풀어 썼어요.' : '답변으로 골랐어요(AI 풀이 없이).'} onBack={() => setPage('quiz')} screen={120} actions={<TakeActions result={result} />}>
    <ResultPanel result={result} />
    <div className="ex-stack" style={{ marginTop: 16 }}><PrimaryButton secondary onClick={() => { setStep(0); setPage('quiz') }}><RefreshCw size={20} />답 바꿔 보기</PrimaryButton></div>
  </ExpansionFrame>
}

/** AI 가 '가장 먼저 알아볼 것'으로 고른 정책을 1번으로 올린다 */
function naviWithAi(answers: Answers, analysis: AiAnalysis | null): ExperienceResult {
  const base = naviResult(answers)
  if (!analysis) return base
  const ids = naviCandidates(answers).map((c) => c.id)
  const pickIndex = analysis.pick ? ids.indexOf(analysis.pick) : -1
  let sections = base.sections
  if (pickIndex > 0) {
    const policies = sections.slice(0, ids.length)
    const rest = sections.slice(ids.length)
    const [picked] = policies.splice(pickIndex, 1)
    sections = [picked, ...policies, ...rest].map((s, i) => (i < ids.length ? { ...s, title: s.title.replace(/^\d+\./, `${i + 1}.`) } : s))
  }
  return applyAiAnalysis({ ...base, sections }, analysis)
}

export function NaviMode() {
  return <QuizMode
    id="housing-navi"
    questions={NAVI_QUESTIONS}
    resultTitle="처방전"
    start={{ headline: '나에게 맞는 주거복지, 한 번에 찾아요', description: '여섯 가지 질문에 답하면 먼저 알아볼 정책과 신청처를 처방전으로 뽑아 드려요. 사진은 찍지 않아요.', steps: ['질문 여섯 개', 'AI 맞춤 안내', '처방전 인쇄'] }}
    request={(answers) => ({ answers: naviSummary(answers), candidates: naviCandidates(answers), context: '정책 후보는 손님 답을 규칙표에 넣어 이미 골라 둔 것이다. 손님이 행사장 상담 부스에서 이어 물어볼 수 있다.' })}
    build={naviWithAi}
  />
}

export function MateMode() {
  return <QuizMode
    id="housing-mate"
    questions={MATE_QUESTIONS.map((q) => ({ key: q.key, title: q.title, type: 'single', required: true, options: q.options.map(({ id, label, note }) => ({ id, label, note })) }))}
    resultTitle="내 성향"
    start={{ headline: '나는 어떤 집, 어떤 이웃과 잘 맞을까?', description: '여덟 가지 질문으로 나의 주거 성향 캐릭터와 잘 맞는 이웃, 어울리는 주거 모델을 찾아 드려요. 사진은 찍지 않아요.', steps: ['질문 여덟 개', 'AI 성향 풀이', '결과 카드 인쇄'] }}
    request={(answers) => ({ answers: mateSummary(answers), candidates: mateCandidates(answers), context: '세대 공존 주거를 주제로 한 재미있는 성향 테스트다. 결과 카드에는 스탬프 랠리 칸이 있다.' })}
    build={(answers, analysis) => { const result = mateResult(answers, (analysis?.pick ?? undefined) as MateType | undefined); return analysis ? applyAiAnalysis(result, analysis) : result }}
  />
}

/** 같은 사진으로 그림은 두 번까지(장당 비용이 든다 — 캐리커처·스타 무드와 같은 원칙) */
const MAX_HOME_DRAWS = 2

export function HomeMode() {
  const [step, setStep] = useState<'start' | 'photo' | 'choose' | 'ai' | 'result'>('start')
  const [photo, setPhoto] = useState<PhotoReading | null>(null)
  const [shot, setShot] = useState<string | null>(null)
  const [scene, setScene] = useState<HomeScene>('smart')
  const [style, setStyle] = useState<HomeStyle>('line')
  const [drawn, setDrawn] = useState(0)
  const [params, setParams] = useState<ImageParams | null>(null)
  const ai = useAiJob()
  const done = ai.state.phase === 'done' ? ai.state : null
  const label = IMAGE_LABEL['housing-home']

  const draw = () => {
    if (!shot || drawn >= MAX_HOME_DRAWS) return
    const next: ImageParams = { id: 'housing-home', scene, style }
    setParams(next)
    setDrawn((n) => n + 1)
    setStep('ai')
    void ai.run({
      analysis: { id: 'housing-home', photo: shot, facts: photo ? readingLine(photo, PHOTO_PLANS['housing-home']) : '', answers: [{ label: '미래의 집', value: HOME_SCENES[scene].label }, { label: '화풍', value: HOME_STYLES[style].label }], candidates: [], context: `손님이 고른 10년 뒤(2036년) 집 장면: ${HOME_SCENES[scene].story}. 이 집에서 보낼 하루를 그려 준다.` },
      image: () => ({ params: next, photo: shot }),
    }).then((finished) => { if (finished) setStep('result') })
  }

  if (step === 'start') return <ExpansionStart id="housing-home" headline="10년 뒤 우리 집, 그곳의 나를 그려 드려요" description="사진 한 장을 찍고 미래의 집 장면을 고르면 AI가 그 집에서 지내는 나를 캐리커처로 그려 드려요. 선화는 영수증에 또렷하게 나와요." steps={['사진 한 장', 'AI 캐리커처', '바로 인쇄']} onStart={() => { setPhoto(null); setShot(null); setDrawn(0); ai.reset(); setStep('photo') }} />
  if (step === 'photo') return <PhotoStep id="housing-home" reading={photo} onRead={(made, taken) => { setPhoto(made); setShot(taken); setDrawn(0); ai.reset() }} onNext={() => setStep('choose')} onBack={() => setStep('start')} headline="그림의 주인공을 찍어요" guide="얼굴과 머리 모양, 옷 색이 잘 보이게 정면을 봐 주세요. 사진은 그림을 만드는 데만 쓰고 저장하지 않아요." />
  if (step === 'ai') return <AiWait id="housing-home" state={ai.state} onRetry={draw} onSkip={() => { ai.skip(); setStep('result') }} onBack={() => { ai.reset(); setStep('choose') }} />
  if (step === 'choose') {
    const left = MAX_HOME_DRAWS - drawn
    return <ExpansionFrame title="10년 뒤, 어떤 집에 살고 있을까요?" subtitle={left > 0 ? '장면과 화풍을 고르면 AI가 그 집에 나를 그려요' : '이 사진으로는 두 번까지 그릴 수 있어요'} onBack={() => setStep('photo')}
      actions={<PrimaryButton disabled={left <= 0} onClick={draw}>이 집으로 그리기 <ArrowRight size={22} /></PrimaryButton>}>
      <div className="ex-grid">{(Object.keys(HOME_SCENES) as HomeScene[]).map((id) => <ChoiceTile key={id} label={HOME_SCENES[id].label} note={HOME_SCENES[id].note} selected={scene === id} onClick={() => setScene(id)}><House size={34} strokeWidth={1.4} /></ChoiceTile>)}</div>
      <p className="ex-eyebrow" style={{ margin: "22px 0 10px" }}>화풍</p>
      <div className="ex-grid">{(Object.keys(HOME_STYLES) as HomeStyle[]).map((id) => <ChoiceTile key={id} label={HOME_STYLES[id].label} note={HOME_STYLES[id].note} selected={style === id} onClick={() => setStyle(id)}><Palette size={30} strokeWidth={1.4} /></ChoiceTile>)}</div>
    </ExpansionFrame>
  }
  const base = homeResult(params?.id === 'housing-home' ? params.scene : scene, params?.id === 'housing-home' ? params.style : style)
  const result = done?.analysis ? applyAiAnalysis(base, done.analysis) : base
  const image = done?.image ?? null
  return <ExpansionFrame title={result.title} subtitle={result.subtitle} onBack={() => setStep('choose')} screen={120} actions={<TakeActions result={result} image={image} imageLabel={label} />}>
    {params && shot && done && <AiImage src={image} label={label} failed={done.imageFailed} retrying={done.imageRetrying} onRetry={() => void ai.retryImage(params, shot)} />}
    <ResultPanel result={result} />
    {drawn < MAX_HOME_DRAWS && <div className="ex-stack" style={{ marginTop: 16 }}><PrimaryButton secondary onClick={() => setStep('choose')}><RefreshCw size={20} />다른 집으로 한 번 더 그리기</PrimaryButton></div>}
  </ExpansionFrame>
}

export default function HousingModes({ id }: { id: HousingId }) {
  return id === 'housing-navi' ? <NaviMode /> : id === 'housing-mate' ? <MateMode /> : <HomeMode />
}
