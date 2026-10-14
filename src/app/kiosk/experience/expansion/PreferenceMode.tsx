'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Camera, Check, PencilLine, SlidersHorizontal } from 'lucide-react'
import type { PhotoReading } from '@/lib/kiosk/expansion/photo'
import { initialAnswers, PREFERENCES, recommend, summarizeAnswers, validateAnswers } from '@/lib/kiosk/expansion/preferences'
import type { Answers, PreferenceId, Question, RecommendationBundle } from '@/lib/kiosk/expansion/types'
import { PhotoFacts, PhotoNote, PhotoStep } from './PhotoStep'
import { ChoiceTile, Completion, ExpansionFrame, ExpansionSave, ExpansionStart, PrimaryButton, ResultPanel } from './shared'

const COLOR_OPTIONS: Record<string, string> = { lavender:'#BCACE5',mint:'#AEDCC7',peach:'#F3C7AC',sky:'#B5D6EA',gold:'#DCC183',rose:'#E4B7C6',citrus:'#DFC762',floral:'#D8ACB6',woody:'#907B58',musky:'#DEDBCC',fruity:'#D58879',spicy:'#AC724B' }

function QuestionInput({ question: q, value, change, error }: { question: Question; value: Answers[string]; change: (value: Answers[string]) => void; error?: string }) {
  const [limit, setLimit] = useState(false)
  const selected = Array.isArray(value) ? value : []
  const choose = (key: string) => {
    setLimit(false)
    if (q.type === 'single') { change(key); return }
    if (selected.includes(key)) change(selected.filter(v => v !== key))
    else if (selected.length < (q.max ?? Infinity)) change([...selected, key])
    else setLimit(true)
  }
  return <section className="ex-question" aria-labelledby={`q-${q.key}`} aria-describedby={error || limit ? `error-${q.key}` : undefined} data-question={q.key}>
    <h2 id={`q-${q.key}`} tabIndex={-1}>{q.title}</h2>{q.note && <p className="ex-note">{q.note}</p>}
    {q.type === 'scale' ? <div className="ex-panel"><input id={`input-${q.key}`} type="range" aria-labelledby={`q-${q.key}`} min={q.min} max={q.max} step={q.step ?? 1} value={typeof value === 'number' ? value : q.initial ?? q.min ?? 0} onChange={e => change(Number(e.target.value))} /><div className="ex-range-label"><span>{q.min}</span><output htmlFor={`input-${q.key}`}>{String(value)}{q.unit ?? ''}</output><span>{q.max}</span></div></div> : <div className="ex-grid">{q.options?.map(option => <ChoiceTile key={option.id} label={option.label} note={option.note} color={option.color ?? COLOR_OPTIONS[option.id]} selected={q.type === 'single' ? value === option.id : selected.includes(option.id)} onClick={() => choose(option.id)} />)}</div>}
    {(error || limit) && <p id={`error-${q.key}`} className="ex-alert" role="alert" style={{ marginTop:12 }}>{error ?? `${q.max}개까지 선택할 수 있어요. 선택한 카드를 다시 누르면 해제돼요.`}</p>}
  </section>
}

type Page = 'start' | 'guide' | 'photo' | 'questions' | 'review' | 'result' | 'detail' | 'alternatives' | 'compare' | 'save' | 'done'
export default function PreferenceMode({ id }: { id: PreferenceId }) {
  const definition = PREFERENCES[id]
  const [page, setPage] = useState<Page>('start')
  const [answers, setAnswers] = useState<Answers>(() => initialAnswers(id))
  const [step, setStep] = useState(0)
  const [editing, setEditing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState('')
  const [bundle, setBundle] = useState<RecommendationBundle | null>(null)
  const [selected, setSelected] = useState(0)
  const [compare, setCompare] = useState(1)
  /** 사진에서 읽은 것 — 사진 없이 하기를 고르면 null 로 남는다 */
  const [photo, setPhoto] = useState<PhotoReading | null>(null)
  /** 확인 화면에서 사진을 다시 보러 갔으면 확인 화면으로 돌아온다 */
  const [afterPhoto, setAfterPhoto] = useState<'questions' | 'review'>('questions')
  const questionRegion = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (page !== 'questions') return
    const first = definition.steps[step].questions.find(q => errors[q.key])
    if (!first) return
    // On a long touch form the invalid field can be above the visible area.
    // Keep the answer intact and bring the first actionable message into view.
    const heading = questionRegion.current?.querySelector<HTMLElement>(`#q-${first.key}`)
    // 선택지가 많으면(제외 재료 9개) 안내가 화면 아래로 밀려 잘린다 — 안내 문장이 보이게 맞춘다
    const message = questionRegion.current?.querySelector<HTMLElement>(`#error-${first.key}`)
    if (message) message.scrollIntoView({ block: 'end' })
    else heading?.scrollIntoView({ block: 'center' })
    heading?.focus({ preventScroll: true })
  }, [page, step, errors, definition])
  const candidates = bundle ? [bundle.primary, ...bundle.alternatives] : []
  const result = candidates[selected]
  const update = (key: string, value: Answers[string]) => { setAnswers(a => ({ ...a, [key]:value })); setErrors({}); setFailure(''); setBundle(null); setSelected(0) }
  const next = () => {
    const all = validateAnswers(id, answers)
    const here = Object.fromEntries(definition.steps[step].questions.filter(q => all[q.key]).map(q => [q.key, all[q.key]]))
    if (Object.keys(here).length) { setErrors(here); return }
    setErrors({})
    if (editing || step === definition.steps.length - 1) { setEditing(false); setPage('review') } else setStep(step + 1)
  }
  const calculate = () => {
    const all = validateAnswers(id, answers)
    if (Object.keys(all).length) { setErrors(all); setStep(Math.max(0, definition.steps.findIndex(s => s.questions.some(q => all[q.key])))); setPage('questions'); return }
    try { const made = recommend(id, answers, photo); setBundle(made); setSelected(0); setCompare(1); setFailure(''); setPage('result') }
    catch (error) { setFailure(error instanceof Error ? error.message : '이 조건에 맞는 결과가 없어요. 선택을 조금 바꿔 주세요.') }
  }
  if (page === 'start') return <ExpansionStart id={id} headline={definition.headline} description={definition.description} onStart={() => setPage('guide')} />
  if (page === 'guide') return <ExpansionFrame title="이렇게 체험해요" subtitle={definition.description} onBack={() => setPage('start')} actions={<PrimaryButton onClick={() => setPage('photo')}>사진 찍고 시작하기 <Camera size={22} /></PrimaryButton>}><ol className="ex-guide"><li><b>사진 한 장</b><span>표정과 옷 색을 기기에서 읽어 결과에 점수를 더해요.</span></li>{definition.guide.map((text, i) => <li key={text}><b>{['선택하기','취향 더하기','가져가기'][i]}</b><span>{text}</span></li>)}</ol><p className="ex-note" style={{ marginTop:24 }}>{definition.footnote}</p></ExpansionFrame>
  // 사진을 바꾸거나 건너뛰면 이전 결과는 버린다(다시 계산한다)
  if (page === 'photo') return <PhotoStep id={id} reading={photo} onRead={(made) => { setPhoto(made); setBundle(null); setSelected(0) }} onNext={() => setPage(afterPhoto)} onBack={() => setPage(afterPhoto === 'review' ? 'review' : 'guide')} onSkip={() => { setPhoto(null); setBundle(null); setSelected(0); setPage(afterPhoto) }} />
  if (page === 'questions') return <ExpansionFrame title={definition.steps[step].title} subtitle={definition.steps[step].note ?? `${step + 1} / ${definition.steps.length} · 답을 바꿔도 괜찮아요`} onBack={() => { setErrors({}); if (editing) { setEditing(false); setPage('review') } else if (step) setStep(step - 1); else setPage('photo') }} actions={<PrimaryButton onClick={next}>{editing ? '수정 완료' : step === definition.steps.length - 1 ? '선택 내용 확인' : '다음'} <ArrowRight size={22} /></PrimaryButton>}><div className="ex-progress" aria-label={`총 ${definition.steps.length}단계 중 ${step + 1}단계`}>{definition.steps.map((_, i) => <span key={i} data-done={i <= step || undefined} />)}</div><div ref={questionRegion}>{definition.steps[step].questions.map(q => <QuestionInput key={q.key} question={q} value={answers[q.key]} error={errors[q.key]} change={value => update(q.key, value)} />)}</div></ExpansionFrame>
  if (page === 'review') return <ExpansionFrame title="내 선택이 맞나요?" subtitle="바꾸고 싶은 항목을 누르면 바로 수정할 수 있어요." onBack={() => { setStep(definition.steps.length - 1); setPage('questions') }} actions={<PrimaryButton onClick={calculate}>내 {definition.resultLabel} 보기 <ArrowRight size={22} /></PrimaryButton>}>{photo ? <div className="ex-panel" style={{ marginBottom:14 }}><h3>사진에서 읽은 것</h3><PhotoFacts id={id} reading={photo} /><PrimaryButton secondary onClick={() => { setAfterPhoto('review'); setPage('photo') }}><Camera size={20} />사진 다시 보기·다시 찍기</PrimaryButton></div> : <div className="ex-panel" style={{ marginBottom:14 }}><p>사진 없이 답변으로만 결과를 만들어요.</p><PrimaryButton secondary onClick={() => { setAfterPhoto('review'); setPage('photo') }}><Camera size={20} />사진 찍고 더하기</PrimaryButton></div>}<div className="ex-summary">{summarizeAnswers(id, answers).map(item => <button key={item.key} type="button" onClick={() => { setStep(item.step); setEditing(true); setErrors({}); setPage('questions') }}><span><small>{item.label}</small><b>{item.value || '선택 없음'}</b></span><em><PencilLine size={17} /> 수정</em></button>)}</div>{failure && <p className="ex-alert" role="alert" style={{ marginTop:16 }}>{failure}</p>}</ExpansionFrame>
  if (!result) return <ExpansionFrame title="선택을 다시 확인해 주세요" actions={<PrimaryButton onClick={() => setPage('review')}>선택 내용 보기</PrimaryButton>}><p>답변을 수정했어요. 변경한 내용으로 다시 결과를 확인해 주세요.</p></ExpansionFrame>
  if (page === 'save') return <ExpansionSave result={result} onBack={() => setPage('result')} onComplete={() => setPage('done')} />
  if (page === 'done') return <Completion onBack={() => setPage('result')} />
  if (page === 'alternatives') return <ExpansionFrame title="다른 스타일도 만나보세요" subtitle="같은 답변으로 찾은 후보를 비교해요." onBack={() => setPage('result')} actions={<PrimaryButton onClick={() => setPage('compare')} disabled={compare === selected || !candidates[compare]}>나란히 비교하기</PrimaryButton>}><div className="ex-stack">{candidates.map((candidate, i) => <ChoiceTile key={candidate.id} label={candidate.title} note={candidate.summary} selected={compare === i} onClick={() => setCompare(i)} />)}</div></ExpansionFrame>
  if (page === 'compare') return <ExpansionFrame title="어떤 쪽이 더 끌리나요?" onBack={() => setPage('alternatives')} actions={<><PrimaryButton secondary onClick={() => setPage('result')}>현재 결과 유지</PrimaryButton><PrimaryButton onClick={() => { setSelected(compare); setPage('result') }}>이 후보로 선택</PrimaryButton></>}><div className="ex-compare"><ResultPanel result={result} /><ResultPanel result={candidates[compare] ?? result} /></div></ExpansionFrame>
  if (page === 'detail') return <ExpansionFrame title="나의 체험 가이드" subtitle="선택한 취향을 일상에서 즐기는 방법" onBack={() => setPage('result')} actions={<PrimaryButton onClick={() => setPage('save')}>이 가이드 가져가기 <Check size={22} /></PrimaryButton>}><ResultPanel result={result} /></ExpansionFrame>
  return <ExpansionFrame title={id === 'coord' ? definition.resultLabel : `나의 ${definition.resultLabel}`} subtitle="직접 고른 답변을 바탕으로 구성했어요." onBack={() => setPage('review')} screen={120} actions={<PrimaryButton onClick={() => setPage('save')}>영수증·휴대폰으로 받기 <ArrowRight size={22} /></PrimaryButton>}>
    {id === 'aura' && <div className="ex-orb" style={result.palette?.length ? { background:`radial-gradient(circle at 25% 20%,#fff9,transparent 50%),conic-gradient(${result.palette.join(',')},${result.palette[0]})` } : undefined} aria-hidden="true" />}
    <ResultPanel result={{ ...result, sections:result.sections.slice(0, 1) }} />
    <PhotoNote result={result} />
    <div className="ex-stack" style={{ marginTop:20 }}><PrimaryButton secondary onClick={() => setPage('detail')}>자세한 가이드 보기</PrimaryButton>{candidates.length > 1 && <PrimaryButton secondary onClick={() => { setCompare(selected === 0 ? 1 : 0); setPage('alternatives') }}>다른 후보와 비교</PrimaryButton>}<PrimaryButton secondary onClick={() => setPage('review')}><SlidersHorizontal size={20} />선택 수정하기</PrimaryButton></div>
  </ExpansionFrame>
}
