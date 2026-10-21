'use client'

// 주거복지대전(2026-12-16) 체험 3종 화면 — 우리 집 향 처방 · 우리 집 성향 향수 · 2036 우리 집의 향.
// 셋 다 끝은 조향 레시피 영수증이다: 규칙이 향료 순위를 매기고(housing.ts) AI 가 그 위에서 셋을 블렌딩한다(ai.ts recipe · recipe.ts).
// 결과는 체험 18종과 같은 결과 카드(ExperienceResult + recipe)라 인쇄(영수증 + QR)·휴대폰으로 받기(TakeActions)·AI 분석(AiWait)을 그대로 쓴다.
// 향 처방·성향 향수는 사진을 찍지 않는다. AI 를 기다리지 않으면 규칙 기본 레시피(50/30/20)로 나온다.

import { useEffect, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { applyAiAnalysis, type AiAnalysis } from '@/lib/kiosk/expansion/ai'
import {
  HOME_SCENES, HOME_STYLES, homeRanked, homeResult, homeRuleRecipe, MATE_QUESTIONS, mateCandidates, mateRanked, mateResult, mateRuleRecipe, mateSummary, rankMates,
  SCENT_QUESTIONS, scentRanked, scentResult, scentRuleRecipe, scentSummary, type Answers, type HomeScene, type HomeStyle, type MateType,
} from '@/lib/kiosk/expansion/housing'
import { choiceArt, sceneArt, styleArt, WAIT_ART } from '@/lib/kiosk/expansion/housing-art'
import { PREFER_COUNT, preferIds, toRecipe } from '@/lib/kiosk/expansion/recipe'
import { IMAGE_LABEL, type ImageParams } from '@/lib/kiosk/expansion/image-prompts'
import { PHOTO_PLANS, readingLine, type PhotoReading } from '@/lib/kiosk/expansion/photo'
import type { ExperienceResult, Question } from '@/lib/kiosk/expansion/types'
import { useAiJob } from './ai-client'
import { AiImage, AiWait, type AiWaitArt } from './AiStep'
import { PhotoStep } from './PhotoStep'
import { ChoiceTile, ExpansionFrame, ExpansionStart, PrimaryButton, ResultPanel, TakeActions } from './shared'

export type HousingId = 'housing-scent' | 'housing-mate' | 'housing-home'

/** 한 화면에 한 문항 — 큰 타일로 고르고 '다음' */
function QuestionPage({ question: q, value, onChange, art }: { question: Question; value: Answers[string] | undefined; onChange: (value: Answers[string]) => void; art?: (option: string) => string }) {
  const selected = Array.isArray(value) ? value : []
  const [limit, setLimit] = useState(false)
  const choose = (id: string) => {
    setLimit(false)
    if (q.type !== 'multi') { onChange(id); return }
    // '없어요·다 괜찮아요(none)'는 혼자만 — 고르면 나머지를 비우고, 다른 것을 고르면 none 을 뺀다
    if (id === 'none') { onChange(selected.includes('none') ? [] : ['none']); return }
    if (selected.includes('none')) { onChange([id]); return }
    if (selected.includes(id)) onChange(selected.filter((v) => v !== id))
    else if (selected.length < (q.max ?? Infinity)) onChange([...selected, id])
    else setLimit(true)
  }
  return <section className="ex-question" data-question={q.key}>
    <div className="ex-grid">{q.options?.map((option) => <ChoiceTile key={option.id} label={option.label} note={option.note} image={art?.(option.id)} selected={q.type === 'multi' ? selected.includes(option.id) : value === option.id} onClick={() => choose(option.id)} />)}</div>
    {limit && <p className="ex-alert" role="alert" style={{ marginTop: 12 }}>{q.max}개까지 고를 수 있어요. 고른 카드를 다시 누르면 해제돼요.</p>}
  </section>
}

const answered = (q: Question, value: Answers[string] | undefined) => q.type === 'multi' ? Array.isArray(value) && value.length > 0 : typeof value === 'string' && value !== ''

/** 향 처방·성향 향수 공통 — 시작 → 문항(한 화면에 하나) → AI 분석·블렌딩 → 결과(조향 레시피) */
function QuizMode({ id, questions, start, build, request, resultTitle, art, wait }: {
  id: 'housing-scent' | 'housing-mate'
  /** 선택지 그림 — 문항 key · 선택지 id → 그림 주소 */
  art: (question: string, option: string) => string
  /** AI 를 기다리는 동안의 그림 화면 */
  wait: AiWaitArt
  questions: Question[]
  start: { headline: string; description: string; steps: [string, string, string] }
  /** 답 + AI 분석(없으면 null) → 결과 카드 */
  build: (answers: Answers, analysis: AiAnalysis | null) => ExperienceResult
  request: (answers: Answers) => { answers: { label: string; value: string }[]; candidates: { id: string; title: string; summary: string }[]; context: string; recipe: { prefer: string[] } }
  resultTitle: string
}) {
  const [page, setPage] = useState<'start' | 'quiz' | 'ai' | 'result'>('start')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const ai = useAiJob()
  const q = questions[step]
  // 문항을 넘길 때 그림이 늦게 뜨지 않게 — 시작하면 모든 선택지 그림과 대기 그림을 미리 받아 둔다
  useEffect(() => {
    if (page !== 'quiz') return
    for (const src of [...questions.flatMap((question) => (question.options ?? []).map((option) => art(question.key, option.id))), wait.src]) { const img = new Image(); img.src = src }
    // art·questions 는 모드마다 고정이라 화면이 바뀔 때만 다시 받는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])
  const done = ai.state.phase === 'done' ? ai.state : null

  const analyze = (final: Answers) => {
    setPage('ai')
    const made = request(final)
    void ai.run({ analysis: { id, photo: null, facts: '', ...made } }).then((finished) => { if (finished) setPage('result') })
  }

  if (page === 'start') return <ExpansionStart id={id} headline={start.headline} description={start.description} steps={start.steps} onStart={() => { setAnswers({}); setStep(0); ai.reset(); setPage('quiz') }} />
  if (page === 'ai') return <AiWait id={id} art={wait} state={ai.state} onRetry={() => analyze(answers)} onSkip={() => { ai.skip(); setPage('result') }} onBack={() => { ai.reset(); setPage('quiz') }} />
  if (page === 'quiz') {
    const last = step === questions.length - 1
    return <ExpansionFrame title={q.title} subtitle={q.note ?? `${step + 1} / ${questions.length}`} onBack={() => (step ? setStep(step - 1) : setPage('start'))}
      actions={<PrimaryButton disabled={!answered(q, answers[q.key])} onClick={() => (last ? analyze(answers) : setStep(step + 1))}>{last ? `${resultTitle} 보기` : '다음'} <ArrowRight size={22} /></PrimaryButton>}>
      <div className="ex-progress" aria-label={`총 ${questions.length}문항 중 ${step + 1}번째`}>{questions.map((_, i) => <span key={i} data-done={i <= step || undefined} />)}</div>
      <QuestionPage key={q.key} question={q} art={(option) => art(q.key, option)} value={answers[q.key]} onChange={(value) => { setAnswers((a) => ({ ...a, [q.key]: value })); ai.reset() }} />
    </ExpansionFrame>
  }
  const result = build(answers, done?.analysis ?? null)
  return <ExpansionFrame title={result.title} subtitle={done?.analysis ? '답변을 AI가 함께 보고 풀어 썼어요.' : '답변으로 골랐어요(AI 풀이 없이).'} onBack={() => setPage('quiz')} screen={120} actions={<TakeActions result={result} />}>
    <ResultPanel result={result} />
    <div className="ex-stack" style={{ marginTop: 16 }}><PrimaryButton secondary onClick={() => { setStep(0); setPage('quiz') }}><RefreshCw size={20} />답 바꿔 보기</PrimaryButton></div>
  </ExpansionFrame>
}

export function ScentMode() {
  return <QuizMode
    id="housing-scent"
    questions={SCENT_QUESTIONS.map((q) => ({ key: q.key, title: q.title, note: q.note, type: q.multi ? 'multi' : 'single', max: q.multi, required: true, options: q.options.map(({ id, label, note }) => ({ id, label, note })) }))}
    resultTitle="우리 집 향"
    art={(question, option) => choiceArt('scent', question, option)}
    wait={{ src: WAIT_ART.scent, title: '우리 집에 맞는 향을 블렌딩하고 있어요', sub: '향료 30종 중 셋을 골라 비율을 맞추는 중 · 보통 5~10초', skip: '기다리지 않고 기본 레시피 보기' }}
    start={{ headline: '우리 집에 꼭 맞는 향을 처방해 드려요', description: '사는 집과 햇빛, 작은 고민, 원하는 분위기를 알려 주시면 AI가 향료 30종 중 셋을 골라 우리 집 조향 레시피를 짜 드려요. 사진은 찍지 않아요.', steps: ['질문 일곱 개', 'AI 블렌딩', '레시피 인쇄'] }}
    request={(answers) => ({ answers: scentSummary(answers), candidates: [], context: '손님의 주거 환경에 맞춘 홈 프래그런스 블렌드를 짠다. 결과는 조향 레시피 영수증으로 인쇄된다.', recipe: { prefer: preferIds(scentRanked(answers)) } })}
    build={(answers, analysis) => {
      const recipe = analysis?.recipe ? toRecipe(analysis.recipe, true) : scentRuleRecipe(answers)
      const result = scentResult(answers, recipe)
      return analysis ? applyAiAnalysis(result, analysis) : result
    }}
  />
}

/** 성향 후보 위 둘의 시그니처 향료를 섞어 주향 후보로(AI 가 성향과 레시피를 함께 고른다) */
function matePrefer(answers: Answers) {
  const [first, second] = rankMates(answers)
  return [...new Set([...preferIds(mateRanked(first)).slice(0, 5), ...preferIds(mateRanked(second)).slice(0, 5)])].slice(0, PREFER_COUNT)
}

export function MateMode() {
  return <QuizMode
    id="housing-mate"
    questions={MATE_QUESTIONS.map((q) => ({ key: q.key, title: q.title, type: 'single', required: true, options: q.options.map(({ id, label, note }) => ({ id, label, note })) }))}
    resultTitle="내 성향 향수"
    art={(question, option) => choiceArt('mate', question, option)}
    wait={{ src: WAIT_ART.mate, title: '나의 주거 성향을 블렌딩하고 있어요', sub: '성향 캐릭터와 시그니처 향을 함께 고르는 중', skip: '기다리지 않고 기본 레시피 보기' }}
    start={{ headline: '나의 주거 성향, 어떤 향일까?', description: '여덟 가지 질문으로 나의 주거 성향 캐릭터와 잘 맞는 이웃을 찾고, 그 성향을 담은 시그니처 조향 레시피를 뽑아 드려요. 사진은 찍지 않아요.', steps: ['질문 여덟 개', 'AI 성향 블렌딩', '레시피 인쇄'] }}
    request={(answers) => ({ answers: mateSummary(answers), candidates: mateCandidates(answers), context: '세대 공존 주거를 주제로 한 재미있는 성향 테스트다. 고른 성향(pick)의 분위기를 담은 시그니처 블렌드를 짠다. 결과 영수증에는 조향 레시피와 스탬프 랠리 칸이 있다.', recipe: { prefer: matePrefer(answers) } })}
    build={(answers, analysis) => {
      const type = ((analysis?.pick ?? undefined) as MateType | undefined) ?? rankMates(answers)[0]
      const recipe = analysis?.recipe ? toRecipe(analysis.recipe, true) : mateRuleRecipe(type)
      const result = mateResult(answers, type, recipe)
      return analysis ? applyAiAnalysis(result, analysis) : result
    }}
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
      analysis: { id: 'housing-home', photo: shot, facts: photo ? readingLine(photo, PHOTO_PLANS['housing-home']) : '', answers: [{ label: '미래의 집', value: HOME_SCENES[scene].label }, { label: '화풍', value: HOME_STYLES[style].label }], candidates: [], context: `손님이 고른 10년 뒤(2036년) 집 장면: ${HOME_SCENES[scene].story}. 이 집에서 보낼 하루를 그리고, 그 집과 사진 속 분위기에 어울리는 블렌드를 짠다.`, recipe: { prefer: preferIds(homeRanked(scene)) } },
      image: () => ({ params: next, photo: shot }),
    }).then((finished) => { if (finished) setStep('result') })
  }

  if (step === 'start') return <ExpansionStart id="housing-home" headline="10년 뒤 우리 집, 그곳의 향을 만들어요" description="사진 한 장을 찍고 미래의 집 장면을 고르면 AI가 그 집에서 지내는 나를 캐리커처로 그리고, 그 집에 어울리는 조향 레시피를 짜 드려요." steps={['사진 한 장', 'AI 캐리커처 · 블렌딩', '레시피 인쇄']} onStart={() => { setPhoto(null); setShot(null); setDrawn(0); ai.reset(); setStep('photo') }} />
  if (step === 'photo') return <PhotoStep id="housing-home" reading={photo} onRead={(made, taken) => { setPhoto(made); setShot(taken); setDrawn(0); ai.reset() }} onNext={() => setStep('choose')} onBack={() => setStep('start')} headline="그림의 주인공을 찍어요" guide="얼굴과 머리 모양, 옷 색이 잘 보이게 정면을 봐 주세요. 사진은 그림을 만드는 데만 쓰고 저장하지 않아요." />
  if (step === 'ai') return <AiWait id="housing-home" art={{ src: WAIT_ART.home, title: '10년 뒤 우리 집에 나를 그리고 있어요', sub: '그림은 10~20초, 레시피도 함께 만들어요', skip: '그림 없이 기본 레시피 보기', steps: '그림 그리기 → 향 블렌딩' }} state={ai.state} onRetry={draw} onSkip={() => { ai.skip(); setStep('result') }} onBack={() => { ai.reset(); setStep('choose') }} />
  if (step === 'choose') {
    const left = MAX_HOME_DRAWS - drawn
    return <ExpansionFrame title="10년 뒤, 어떤 집에 살고 있을까요?" subtitle={left > 0 ? '장면과 화풍을 고르면 AI가 그 집에 나를 그려요' : '이 사진으로는 두 번까지 그릴 수 있어요'} onBack={() => setStep('photo')}
      actions={<PrimaryButton disabled={left <= 0} onClick={draw}>이 집으로 그리기 <ArrowRight size={22} /></PrimaryButton>}>
      <div className="ex-grid">{(Object.keys(HOME_SCENES) as HomeScene[]).map((id) => <ChoiceTile key={id} label={HOME_SCENES[id].label} note={HOME_SCENES[id].note} image={sceneArt(id)} selected={scene === id} onClick={() => setScene(id)} />)}</div>
      <p className="ex-eyebrow" style={{ margin: "22px 0 10px" }}>화풍</p>
      <div className="ex-grid">{(Object.keys(HOME_STYLES) as HomeStyle[]).map((id) => <ChoiceTile key={id} label={HOME_STYLES[id].label} note={HOME_STYLES[id].note} image={styleArt(id)} selected={style === id} onClick={() => setStyle(id)} />)}</div>
    </ExpansionFrame>
  }
  const drawnScene = params?.id === 'housing-home' ? params.scene : scene
  const recipe = done?.analysis?.recipe ? toRecipe(done.analysis.recipe, true) : homeRuleRecipe(drawnScene)
  const base = homeResult(drawnScene, params?.id === 'housing-home' ? params.style : style, recipe)
  const result = done?.analysis ? applyAiAnalysis(base, done.analysis) : base
  const image = done?.image ?? null
  return <ExpansionFrame title={result.title} subtitle={result.subtitle} onBack={() => setStep('choose')} screen={120} actions={<TakeActions result={result} image={image} imageLabel={label} />}>
    {params && shot && done && <AiImage src={image} label={label} failed={done.imageFailed} retrying={done.imageRetrying} onRetry={() => void ai.retryImage(params, shot)} />}
    <ResultPanel result={result} />
    {drawn < MAX_HOME_DRAWS && <div className="ex-stack" style={{ marginTop: 16 }}><PrimaryButton secondary onClick={() => setStep('choose')}><RefreshCw size={20} />다른 집으로 한 번 더 그리기</PrimaryButton></div>}
  </ExpansionFrame>
}

export default function HousingModes({ id }: { id: HousingId }) {
  return id === 'housing-scent' ? <ScentMode /> : id === 'housing-mate' ? <MateMode /> : <HomeMode />
}
