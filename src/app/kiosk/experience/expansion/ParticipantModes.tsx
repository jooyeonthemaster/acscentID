'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Flag, Heart, Lightbulb, Link2, ListChecks, Pencil, Send, Users } from 'lucide-react'
import { applyAiAnalysis } from '@/lib/kiosk/expansion/ai'
import { IMAGE_LABEL, POSTER_SCENES, type ImageParams, type PosterScene } from '@/lib/kiosk/expansion/image-prompts'
import { PHOTO_PLANS, readingLine, type PhotoReading } from '@/lib/kiosk/expansion/photo'
import { analyzeParticipants, CONVERSATIONS, duplicateNames, INTERESTS, newParticipant, optionLabel, PACES, participantComplete, PLANS, ROLES, validateParticipants, type Participant, type SocialAnalysis, type SocialId } from '@/lib/kiosk/expansion/social'
import { KX_IDLE, KxKeyboard } from '../kx'
import { useAiJob } from './ai-client'
import { AiImage, AiWait } from './AiStep'
import { PhotoFacts, PhotoNote, PhotoStep } from './PhotoStep'
import { ChoiceTile, ExpansionFrame, ExpansionStart, PrimaryButton, ResultPanel, TakeActions } from './shared'
import './camera-social.css'

type Step = 'start' | 'setup' | 'photo' | 'answer' | 'handoff' | 'review' | 'ai' | 'result' | 'detail' | 'missing'
const personName = (person: Participant, index: number) => person.name.trim() || `${index + 1}번째 참여자`
const ROLE_ICON = { idea: Lightbulb, organize: ListChecks, connect: Link2, finish: Flag } as const

export default function ParticipantModes({ id }: { id: SocialId }) {
  const [step, setStep] = useState<Step>('start')
  const [people, setPeople] = useState<Participant[]>(() => [newParticipant(0), newParticipant(1)])
  const [active, setActive] = useState(0)
  const [editing, setEditing] = useState(false)
  const [keyboard, setKeyboard] = useState<number | null>(null)
  const keyboardHost = useRef<HTMLDivElement>(null)
  const [analysis, setAnalysis] = useState<SocialAnalysis | null>(null)
  const [notice, setNotice] = useState('')
  const [detail, setDetail] = useState(0)
  /** 함께 찍은 사진에서 읽은 것 — 사진 없이 하기를 고르면 null */
  const [photo, setPhoto] = useState<PhotoReading | null>(null)
  const [afterPhoto, setAfterPhoto] = useState<'answer' | 'review'>('answer')
  const [shot, setShot] = useState<string | null>(null)
  const [imageParams, setImageParams] = useState<ImageParams | null>(null)
  const ai = useAiJob()
  const team = id === 'team'
  const person = people[active]
  const complete = participantComplete(id, person)
  const completedCount = people.filter((item) => participantComplete(id, item)).length
  const duplicates = duplicateNames(people)
  useEffect(() => {
    if (keyboard === null) return
    // 여섯 명 이름 목록 아래에서도 모든 터치 키가 보이도록 본문만 내려 준다.
    const frame = requestAnimationFrame(() => keyboardHost.current?.scrollIntoView({ block: 'end', behavior: 'auto' }))
    return () => cancelAnimationFrame(frame)
  }, [keyboard])
  const update = (index: number, patch: Partial<Participant>) => { setPeople((current) => current.map((item, at) => at === index ? { ...item, ...patch } : item)); setAnalysis(null); setNotice('') }
  const resize = (count: number) => { setPeople((current) => Array.from({ length: count }, (_, index) => current[index] ?? newParticipant(index))); setActive(0); setKeyboard(null); setAnalysis(null) }
  const toggleInterest = (value: string) => {
    const selected = person.interests.includes(value)
    if (!selected && person.interests.length >= 2) { setNotice('관심사는 두 개까지 골라요. 선택한 것을 누르면 바꿀 수 있어요.'); return }
    update(active, { interests: selected ? person.interests.filter((item) => item !== value) : [...person.interests, value] })
  }
  const edit = (index: number) => { setActive(index); setEditing(true); setNotice(''); setStep('answer') }
  const continueAnswer = () => {
    if (!complete) { setNotice('필수 질문에 모두 답해 주세요.'); setStep('missing'); return }
    if (editing) { setEditing(false); setStep('review'); return }
    if (active < people.length - 1) { setActive(active + 1); setStep('handoff') }
    else setStep('review')
  }
  /** 답변 집계 → AI 분석(사진이 있으면 함께 찍은 사진으로 포스터까지) */
  const summarize = () => {
    const error = validateParticipants(id, people)
    if (error) { setNotice(error); setStep('missing'); return }
    let made: SocialAnalysis
    try { made = analyzeParticipants(id, people, photo) } catch (caught) { setNotice(caught instanceof Error ? caught.message : '답변을 다시 확인해 주세요.'); setStep('missing'); return }
    setAnalysis(made); setDetail(0)
    analyze(made)
  }
  const analyze = (made: SocialAnalysis) => {
    // AI 에는 이름 대신 '참여자 N' — 누가 누구인지 보내지 않는다
    const anonymous = (text: string) => people.reduce((out, item, index) => item.name.trim() ? out.split(item.name.trim()).join(`참여자 ${index + 1}`) : out, text)
    const answers = people.map((item, index) => ({ label: `참여자 ${index + 1}`, value: team ? `역할 ${optionLabel(ROLES, item.role)} · 관심사 ${item.interests.map((key) => optionLabel(INTERESTS, key)).join(', ')}` : `속도 ${optionLabel(PACES, item.pace)} · 계획 ${optionLabel(PLANS, item.planning)} · 대화 ${optionLabel(CONVERSATIONS, item.conversation)} · 관심사 ${item.interests.map((key) => optionLabel(INTERESTS, key)).join(', ')}` }))
    const context = anonymous(made.result.sections.filter((section) => !section.title.startsWith('사진 속')).map((section) => `${section.title}: ${section.body}${section.items?.length ? ` (${section.items.join(', ')})` : ''}`).join(' / '))
    const scene = made.activityKeys.find((key): key is PosterScene => key in POSTER_SCENES)
    const params: ImageParams | null = shot && photo && scene ? { id, activity: scene, count: Math.min(6, Math.max(2, photo.faces.length)) } : null
    setImageParams(params)
    setStep('ai')
    void ai.run({ analysis: { id, photo: shot, facts: photo ? readingLine(photo, PHOTO_PLANS[id]) : '', answers, candidates: [], context }, image: params && shot ? () => ({ params, photo: shot }) : null })
      .then((finished) => { if (finished) setStep('result') })
  }
  const done = ai.state.phase === 'done' ? ai.state : null
  const final = analysis ? (done?.analysis ? applyAiAnalysis(analysis.result, done.analysis) : analysis.result) : null

  const peopleStrip = <div className="ex-participant-strip" aria-label="참여 상태">{people.map((item, index) => <div key={item.id} data-active={index === active || undefined}><span className="ex-person-avatar">{index + 1}</span><b>{personName(item, index)}</b><small>{participantComplete(id, item) ? '답변 완료 ✓' : index === active ? '지금 차례' : '대기'}</small></div>)}</div>
  if (step === 'start') return <ExpansionStart id={id} headline={team ? '우리의 다름이 팀의 가능성으로' : '같아서 좋고, 달라서 새로운 우리'} description={team ? '각자 좋아하는 역할과 관심사를 고르면 함께 해 볼 활동을 찾아요.' : '두 사람의 취향과 대화 방식을 나란히 놓고 다음 데이트를 골라요.'} onStart={() => setStep('setup')} />
  if (step === 'setup') return <ExpansionFrame title={team ? '몇 명이 함께하나요?' : '두 사람의 이름을 알려 주세요'} subtitle="별명을 써도 좋아요. 각자 차례에 직접 답해요." onBack={() => setStep('start')} screen={KX_IDLE.edit} actions={keyboard === null ? <PrimaryButton disabled={people.some((item) => !item.name.trim()) || duplicates.length > 0} onClick={() => { setActive(0); setEditing(false); setAfterPhoto('answer'); setStep('photo') }}>{photo ? '사진 확인하고 시작하기' : '함께 사진 찍고 시작하기'}</PrimaryButton> : undefined}>
    {team && <div className="ex-count-picker" role="group" aria-label="팀 인원">{[2, 3, 4, 5, 6].map((count) => <button key={count} type="button" aria-pressed={people.length === count} onClick={() => resize(count)}>{count}<small>명</small></button>)}</div>}
    <div className="ex-stack">{people.map((item, index) => <label key={item.id} className="ex-participant-name"><span>{index + 1}</span><input aria-invalid={duplicates.includes(index) || undefined} aria-label={`${index + 1}번째 참여자 이름`} placeholder={`${index + 1}번째 참여자 이름 또는 별명`} value={item.name} maxLength={16} onFocus={() => setKeyboard(index)} onChange={(event) => { setKeyboard(null); update(index, { name: event.target.value }) }} /><button type="button" aria-label={`${index + 1}번째 참여자 터치 키보드 열기`} onClick={() => setKeyboard(index)}><Pencil size={21} /></button></label>)}</div>
    {duplicates.length > 0 && <p className="ex-alert" role="alert">{duplicates.map((index) => `${index + 1}번`).join(' · ')} 참여자의 이름이 같아요. 결과에서 구분할 수 있게 한 사람의 이름을 바꿔 주세요.</p>}
    <p className="ex-note">이름과 답변은 체험 동안 기기에만 있어요. 카드 받기를 누르면 결과 카드에 이름이 포함돼요.</p>
    {keyboard !== null && people[keyboard] && <div ref={keyboardHost}><KxKeyboard key={keyboard} value={people[keyboard].name} onChange={(name) => update(keyboard, { name })} onClose={() => setKeyboard(null)} maxLength={16} hint={`${keyboard + 1}번째 참여자 이름`} /></div>}
  </ExpansionFrame>
  if (step === 'photo') return <PhotoStep id={id} reading={photo} onRead={(made, taken) => { setPhoto(made); setShot(taken); setAnalysis(null); ai.reset() }} onNext={() => { setActive(afterPhoto === 'answer' ? 0 : active); setStep(afterPhoto) }} onBack={() => setStep(afterPhoto === 'review' ? 'review' : 'setup')} onSkip={() => { setPhoto(null); setShot(null); setAnalysis(null); ai.reset(); setActive(afterPhoto === 'answer' ? 0 : active); setStep(afterPhoto) }} />
  if (step === 'handoff') return <ExpansionFrame title={`${personName(person, active)}에게 넘겨 주세요`} subtitle="서로의 답을 보기 전에 각자 골라요" onBack={() => { setActive(Math.max(0, active - 1)); setStep('answer') }} actions={<><PrimaryButton secondary onClick={() => setStep('setup')}><Pencil size={19} />이름 수정</PrimaryButton><PrimaryButton onClick={() => setStep('answer')}>{personName(person, active)}, 시작하기</PrimaryButton></>}><div className="ex-handoff-hero"><Send size={82} strokeWidth={1.2} /><span>{active + 1} / {people.length}</span></div>{peopleStrip}<div className="ex-panel"><b>한 사람씩, 편안하게</b><p>다음 사람에게 화면을 넘기고 직접 답하도록 해 주세요. 모든 답변은 마지막에 확인하고 수정할 수 있어요.</p></div></ExpansionFrame>
  if (step === 'answer') return <ExpansionFrame title={`${personName(person, active)}의 차례`} subtitle={`${active + 1} / ${people.length}명 · ${team ? '역할 하나, 관심사 최대 두 개' : '취향과 대화 방식'}`} onBack={() => { setNotice(''); if (editing) setStep('review'); else if (active === 0) { setAfterPhoto('answer'); setStep('photo') } else setStep('handoff') }} screen={KX_IDLE.edit} actions={<PrimaryButton onClick={continueAnswer}>{complete ? <Check size={21} /> : null}{editing ? '수정 완료' : '답변 완료'}</PrimaryButton>}>
    <div className="ex-person-progress"><span style={{ width: `${((active + 1) / people.length) * 100}%` }} /></div>
    {team && <section className="ex-social-question"><h2>어떤 역할을 해 보고 싶나요?</h2><div className="ex-grid">{ROLES.map((role) => { const RoleIcon = ROLE_ICON[role.id as keyof typeof ROLE_ICON] ?? Lightbulb; return <ChoiceTile key={role.id} label={role.label} note={role.note} selected={person.role === role.id} onClick={() => update(active, { role: role.id })}><RoleIcon size={27} /></ChoiceTile> })}</div></section>}
    <section className="ex-social-question"><h2>{team ? '함께할 때 좋아하는 것' : '함께하고 싶은 데이트'}</h2><p className="ex-note">한 개 또는 두 개를 골라요</p><div className="ex-grid">{INTERESTS.map((option) => <ChoiceTile key={option.id} label={option.label} note={option.note} selected={person.interests.includes(option.id)} onClick={() => toggleInterest(option.id)} />)}</div></section>
    {!team && [{ key: 'pace' as const, title: '함께 보내는 속도는?', options: PACES }, { key: 'planning' as const, title: '계획은 어떻게?', options: PLANS }, { key: 'conversation' as const, title: '대화할 때 편한 방식은?', options: CONVERSATIONS }].map((question) => <section className="ex-social-question" key={question.key}><h2>{question.title}</h2><div className="ex-grid">{question.options.map((option) => <ChoiceTile key={option.id} label={option.label} note={option.note} selected={person[question.key] === option.id} onClick={() => update(active, { [question.key]: option.id })} />)}</div></section>)}
    {notice && <p role="alert" className="ex-alert">{notice}</p>}
  </ExpansionFrame>
  if (step === 'review') return <ExpansionFrame title="각자의 답변을 확인해요" subtitle={`${completedCount} / ${people.length}명 답변 완료`} onBack={() => edit(people.length - 1)} screen={KX_IDLE.edit} actions={<PrimaryButton onClick={summarize}>우리의 공통점 찾기</PrimaryButton>}>{photo ? <div className="ex-panel" style={{ marginBottom: 14 }}><h3>함께 찍은 사진에서 읽은 것</h3><PhotoFacts id={id} reading={photo} /><PrimaryButton secondary onClick={() => { setAfterPhoto('review'); setStep('photo') }}><Camera size={20} />사진 다시 보기·다시 찍기</PrimaryButton></div> : <div className="ex-panel" style={{ marginBottom: 14 }}><p>사진 없이 답변으로만 결과를 만들어요.</p><PrimaryButton secondary onClick={() => { setAfterPhoto('review'); setStep('photo') }}><Camera size={20} />함께 사진 찍고 더하기</PrimaryButton></div>}<div className="ex-stack">{people.map((item, index) => <article className="ex-panel ex-answer-summary" key={item.id}><div><span className="ex-person-avatar">{index + 1}</span><h2>{personName(item, index)}</h2><button type="button" className="ex-inline-edit" onClick={() => edit(index)}><Pencil size={18} />수정</button></div><p>{team ? `하고 싶은 역할: ${optionLabel(ROLES, item.role) || '아직 선택하지 않음'}` : `${optionLabel(PACES, item.pace) || '속도 미응답'} · ${optionLabel(PLANS, item.planning) || '계획 미응답'} · ${optionLabel(CONVERSATIONS, item.conversation) || '대화 미응답'}`}</p><div className="ex-tags">{item.interests.map((key) => <span key={key}>{optionLabel(INTERESTS, key)}</span>)}</div>{!participantComplete(id, item) && <p className="ex-alert">아직 답하지 않은 질문이 있어요.</p>}</article>)}</div><PrimaryButton secondary onClick={() => setStep('setup')}>참여자 이름{team ? '·인원' : ''} 수정</PrimaryButton></ExpansionFrame>
  if (step === 'missing') return <ExpansionFrame title="아직 답하지 않은 내용이 있어요" onBack={() => setStep('review')} actions={<PrimaryButton secondary onClick={() => setStep('review')}>전체 답변 확인</PrimaryButton>}><p role="alert" className="ex-alert">{notice || '모든 참여자가 답을 고르면 결과를 볼 수 있어요.'}</p><div className="ex-stack">{people.map((item, index) => !participantComplete(id, item) && <ChoiceTile key={item.id} label={`${personName(item, index)} · 이어서 답하기`} note={!item.name.trim() ? '먼저 이름을 입력해 주세요' : '필수 질문을 확인해 주세요'} selected={false} onClick={() => { if (!item.name.trim()) { setKeyboard(index); setStep('setup') } else edit(index) }} />)}</div></ExpansionFrame>
  if (step === 'ai') return <AiWait id={id} state={ai.state} onRetry={() => analysis && analyze(analysis)} onSkip={() => { ai.skip(); setStep('result') }} onBack={() => { ai.reset(); setStep('review') }} />
  if (!analysis || !final) return <ExpansionFrame title="답변을 먼저 확인해 주세요" actions={<PrimaryButton onClick={() => setStep('review')}>답변 확인</PrimaryButton>}><p className="ex-note">저장된 결과가 없어요.</p></ExpansionFrame>
  const label = IMAGE_LABEL[id]
  const take = <TakeActions result={final} image={done?.image ?? null} imageLabel={label} />
  const poster = imageParams && shot && done ? <AiImage src={done.image} label={label} failed={done.imageFailed} retrying={done.imageRetrying} wide onRetry={() => void ai.retryImage(imageParams, shot)} /> : null
  if (step === 'detail') {
    const sections = final.sections
    return <ExpansionFrame title={team ? '우리의 협업 가이드' : '함께 해 볼 데이트'} onBack={() => setStep('result')} screen={KX_IDLE.result} actions={take}><div className="ex-social-tabs" role="tablist" aria-label="결과 상세">{sections.map((section, index) => <button key={`${section.title}-${index}`} type="button" role="tab" aria-selected={detail === index} onClick={() => setDetail(index)}>{section.title}</button>)}</div><div className="ex-story-emblem">{team ? <Users size={72} /> : <Heart size={72} />}</div><article className="ex-panel" role="tabpanel"><h2>{sections[detail].title}</h2><p>{sections[detail].body}</p>{sections[detail].items && <ul>{sections[detail].items.map((item) => <li key={item}>{item}</li>)}</ul>}</article><p className="ex-note">{final.footnote}</p></ExpansionFrame>
  }
  return <ExpansionFrame title={team ? '우리 팀의 공통점' : '같은 점도, 다른 점도 소중해요'} onBack={() => setStep('review')} screen={KX_IDLE.result} actions={take}>{poster}{peopleStrip}<ResultPanel result={{ ...final, sections: final.sections.slice(0, 3) }} /><PhotoNote result={final} /><div className="ex-stack" style={{ marginTop: 16 }}><PrimaryButton secondary onClick={() => setStep('detail')}>{team ? '역할·활동 자세히' : '데이트·차이 자세히'}</PrimaryButton></div></ExpansionFrame>
}
