'use client'

import { useState } from 'react'
import { Sparkles, Star, Sun, WandSparkles } from 'lucide-react'
import { applyAiAnalysis } from '@/lib/kiosk/expansion/ai'
import { IMAGE_LABEL, type ImageParams } from '@/lib/kiosk/expansion/image-prompts'
import { josa } from '@/lib/kiosk/expansion/korean'
import { handLabel, PHOTO_PLANS, readingLine, type PhotoReading } from '@/lib/kiosk/expansion/photo'
import { cameraStory, FACE_TOPICS, PALM_STORIES, palmFocus, STAR_MOODS, suggestMood } from '@/lib/kiosk/expansion/social'
import { useKx } from '../kx'
import { useAiJob } from './ai-client'
import { AiImage, AiWait } from './AiStep'
import { PhotoNote, PhotoStep } from './PhotoStep'
import { ChoiceTile, ExpansionFrame, ExpansionStart, PrimaryButton, ResultPanel, TakeActions } from './shared'
import './camera-social.css'

type CameraId = 'lookalike' | 'palm' | 'face'
type Step = 'start' | 'photo' | 'choose' | 'ai' | 'result' | 'detail' | 'compare'
const COPY = {
  lookalike: { headline: '오늘의 스타 무드를 찾아요', desc: '사진의 표정과 옷 색으로 어울리는 가상 스타 무드를 짚고, AI가 그 무드의 화보를 찍어 드려요.', guide: '실존 인물과 얼굴을 비교하지 않아요. 표정과 옷 색으로 가상 스타 세 명의 사진 연출 무드 중 하나를 먼저 짚어 드리고, 고른 무드로 내 화보를 만들어요.' },
  palm: { headline: '손 위에 펼치는 작은 이야기', desc: '손바닥을 비추면 손을 펼친 모양에서 착안한 이야기를 AI가 지어 드려요.', guide: '손을 펼친 모양에서 착안한 창작 이야기예요. 실제 손금 선을 해석하거나 미래·건강·수명을 판단하지 않아요.' },
  face: { headline: '오늘, 어떤 이야기가 필요한가요?', desc: '지금의 표정을 찍고 오늘 듣고 싶은 이야기를 고르면 AI가 이야기를 지어 드려요.', guide: '전통 관상에서 착안한 재미있는 이야기예요. 표정·옷·분위기만 보고, 외모로 성격·능력·건강·운명을 추정하지 않아요.' },
} as const
/** 스타 무드 화보는 손님 한 명에 세 번까지(그림 한 장마다 비용이 든다 — 캐리커처와 같은 원칙) */
const MAX_RUNS = 3

function PalmDrawing({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  return <div className="ex-palm-art">
    <svg viewBox="0 0 300 310" role="img" aria-label="실제 촬영 손금이 아닌 설명용 손 그림">
      <path d="M89 270C73 232 41 184 34 163C29 145 48 134 62 150L85 176L79 65C78 45 100 43 104 62L113 128L111 37C111 17 134 16 136 37L144 127L152 37C154 17 178 21 177 43L172 133L192 69C197 51 218 58 213 78L192 189C192 227 177 250 173 273Z" fill="#f7e6cc" stroke="#bc9062" strokeWidth="3" />
      {['M101 167Q139 146 178 160', 'M97 184Q132 189 170 179', 'M108 174Q139 208 109 246'].map((d, index) => <path key={d} d={d} fill="none" stroke={selected === index ? '#a75935' : '#d0aa83'} strokeWidth={selected === index ? 7 : 4} strokeLinecap="round" />)}
      <text x="150" y="302" textAnchor="middle" fill="currentColor" fontSize="14">이야기를 위한 설명 그림</text>
    </svg>
    <div className="ex-social-tabs" role="tablist" aria-label="손금 이야기 선">
      {PALM_STORIES.map((line, index) => <button key={line.id} type="button" role="tab" aria-selected={selected === index} onClick={() => onSelect(index)}>{line.label}</button>)}
    </div>
  </div>
}

export default function CameraModes({ id }: { id: CameraId }) {
  const { home } = useKx()
  const [step, setStep] = useState<Step>('start')
  const [photo, setPhoto] = useState<PhotoReading | null>(null)
  const [shot, setShot] = useState<string | null>(null)
  const [choice, setChoice] = useState('')
  /** 다른 무드 비교에서 고른 것(다시 만들기 전) */
  const [pending, setPending] = useState('')
  const [selected, setSelected] = useState(0)
  const [runs, setRuns] = useState(0)
  const [imageParams, setImageParams] = useState<ImageParams | null>(null)
  const ai = useAiJob()
  const copy = COPY[id]
  const suggested = id === 'lookalike' ? suggestMood(photo) : null
  const done = ai.state.phase === 'done' ? ai.state : null
  // 결과는 고른 주제·무드와 사진에서 읽은 값으로 만들고, AI 분석을 맨 앞에 붙인다
  const base = photo && (id === 'palm' || choice) ? cameraStory(id, id === 'palm' ? '' : choice, photo) : null
  const result = base && done?.analysis ? applyAiAnalysis(base, done.analysis) : base

  /** AI 분석(+ 스타 무드는 화보 합성) */
  const analyze = (mood = choice) => {
    if (!photo || !shot) return
    const plan = PHOTO_PLANS[id]
    const star = STAR_MOODS.find((item) => item.id === mood)
    const first = PALM_STORIES[palmFocus(photo)]
    const context = id === 'lookalike' && star ? `손님이 고른 가상 스타 무드: ${star.name} · ${star.title}(빛: ${star.light}, 스타일: ${star.styling}). 사진의 표정·옷 색으로 짚어 드린 무드: ${suggested ? STAR_MOODS.find((item) => item.id === suggested.id)!.title : '없음'}.`
      : id === 'palm' ? `손 모양(기기 측정): ${photo.hand ? handLabel(photo.hand) : '알 수 없음'}. 먼저 펼친 이야기: ${first.label}(${first.keyword}). 이야기 셋: ${PALM_STORIES.map((line) => `${line.label}(${line.keyword})`).join(', ')}.`
        : `손님이 고른 오늘의 주제: ${FACE_TOPICS.find((topic) => topic.id === mood)?.label ?? ''}.`
    const params: ImageParams | null = id === 'lookalike' && star ? { id: 'lookalike', mood: star.id } : null
    setImageParams(params)
    setRuns((n) => n + 1)
    setStep('ai')
    void ai.run({
      analysis: { id, photo: shot, facts: readingLine(photo, plan), answers: [], candidates: [], context },
      image: params ? () => ({ params, photo: shot }) : null,
    }).then((finished) => { if (finished) setStep('result') })
  }

  const afterPhoto = () => {
    if (id === 'palm') { setSelected(palmFocus(photo)); analyze(''); return }
    if (id === 'lookalike' && !choice && suggested) setChoice(suggested.id)
    setStep('choose')
  }

  if (step === 'start') return <ExpansionStart id={id} headline={copy.headline} description={copy.desc} onStart={() => setStep('photo')} />
  if (step === 'photo') return <PhotoStep id={id} reading={photo} onRead={(made, taken) => { setPhoto(made); setShot(taken); setChoice(''); ai.reset() }} onNext={afterPhoto} onBack={() => setStep('start')} headline={copy.headline} guide={copy.guide} />
  if (step === 'ai') return <AiWait id={id} state={ai.state} onRetry={() => analyze()} onSkip={() => { ai.skip(); setStep('result') }} onBack={() => { ai.reset(); setStep(id === 'palm' ? 'photo' : 'choose') }} />
  if (step === 'choose') return <ExpansionFrame title={id === 'lookalike' ? '어떤 스타 무드가 끌리나요?' : '오늘 듣고 싶은 이야기는?'} subtitle={id === 'lookalike' ? '사진과 어울리는 무드를 먼저 골라 두었어요. 바꿔도 돼요.' : '내 선택과 오늘의 표정으로 AI가 이야기를 지어요'} onBack={() => setStep('photo')} actions={<PrimaryButton disabled={!choice} onClick={() => { if (id === 'lookalike') setSelected(Math.max(0, STAR_MOODS.findIndex((mood) => mood.id === choice))); analyze() }}>{id === 'lookalike' ? '이 무드로 화보 만들기' : '이야기 만나기'}</PrimaryButton>}>
    <div className="ex-grid ex-social-choices">{id === 'lookalike'
      ? STAR_MOODS.map((mood) => <ChoiceTile key={mood.id} label={mood.title} note={`가상 스타 ${mood.name}`} selected={choice === mood.id} color={mood.color} onClick={() => setChoice(mood.id)}><Star size={40} strokeWidth={1.4} />{suggested?.id === mood.id && <span className="ex-mood-pick">사진과 어울려요</span>}</ChoiceTile>)
      : FACE_TOPICS.map((topic) => <ChoiceTile key={topic.id} label={topic.label} selected={choice === topic.id} onClick={() => setChoice(topic.id)}><Sparkles size={36} strokeWidth={1.3} /></ChoiceTile>)}</div>
    <div className="ex-panel"><b>{id === 'lookalike' && suggested ? `사진의 ${josa(suggested.reason, '을/를')} 보고 짚었어요` : '고른 주제로 만드는 이야기'}</b><p>{copy.guide}</p></div>
  </ExpansionFrame>
  if (!result) return <ExpansionFrame title="이야기를 다시 준비해 주세요" actions={<PrimaryButton onClick={home}>처음으로</PrimaryButton>}><p className="ex-alert">결과가 없어요. 사진을 다시 찍어 주세요.</p></ExpansionFrame>

  const image = done?.image ?? null
  const label = IMAGE_LABEL.lookalike
  const take = <TakeActions result={result} image={image} imageLabel={label} />
  if (step === 'result') return <ExpansionFrame title={id === 'lookalike' ? '나의 스타 무드 화보' : id === 'palm' ? '오늘의 손 위 이야기' : '내가 고른 오늘의 이야기'} onBack={() => setStep(id === 'palm' ? 'photo' : 'choose')} screen={120} actions={take}>
    {id === 'lookalike' && imageParams && shot && done && <AiImage src={image} label={label} failed={done.imageFailed} retrying={done.imageRetrying} onRetry={() => void ai.retryImage(imageParams, shot)} />}
    {id === 'lookalike' && <div className="ex-star-grid" aria-label="가상 스타 무드">{STAR_MOODS.map((mood, index) => <div key={mood.id} className="ex-star-card" data-on={selected === index || undefined}><span className="ex-star-orbit" style={{ color: mood.color }}><Star size={56} fill="currentColor" strokeWidth={1} /></span><b>{mood.name}</b><small>{mood.title}</small><span>{selected === index ? '고른 무드 ✓' : suggested?.id === mood.id ? '사진과 어울려요' : '가상 스타'}</span></div>)}</div>}
    {id === 'palm' && <PalmDrawing selected={selected} onSelect={setSelected} />}
    <ResultPanel result={{ ...result, sections: result.sections.slice(0, 1) }} />
    <PhotoNote result={result} />
    <div className="ex-stack" style={{ marginTop: 16 }}><PrimaryButton secondary onClick={() => setStep('detail')}>이야기 자세히</PrimaryButton>{id === 'lookalike' && <PrimaryButton secondary onClick={() => { setPending(choice); setStep('compare') }}>다른 무드도 보기</PrimaryButton>}</div>
  </ExpansionFrame>
  if (step === 'detail') return <ExpansionFrame title={id === 'palm' ? PALM_STORIES[selected].label : result.title} onBack={() => setStep('result')} actions={take}>
    {id === 'palm' ? <><PalmDrawing selected={selected} onSelect={setSelected} /><article className="ex-panel"><h2>{PALM_STORIES[selected].keyword}</h2><p>{PALM_STORIES[selected].story}</p></article><ResultPanel result={{ ...result, sections: result.sections.slice(0, 1) }} /><PhotoNote result={result} /></> : <><div className="ex-story-emblem">{id === 'lookalike' ? <Star size={80} /> : <Sun size={80} />}</div><ResultPanel result={result} /></>}
    {id !== 'lookalike' && <div className="ex-stack" style={{ marginTop: 16 }}>{(id === 'palm' ? PALM_STORIES.map((line) => ({ title: line.keyword, body: line.action })) : result.sections.filter((section) => section.title === '작은 행동')).map((section) => <article className="ex-panel" key={section.title}><WandSparkles size={30} /><h2>{section.title}</h2><p>{section.body}</p></article>)}</div>}
  </ExpansionFrame>
  // 스타 무드 비교 — 다른 무드를 고르면 그 무드로 화보를 다시 만든다(세 번까지)
  const left = MAX_RUNS - runs
  return <ExpansionFrame title="다른 무드도 비교해요" subtitle={left > 0 ? `다른 무드로 화보를 ${left}번 더 만들 수 있어요` : '화보는 세 번까지 만들 수 있어요'} onBack={() => setStep('result')} actions={<><PrimaryButton secondary onClick={() => setStep('result')}>결과로 돌아가기</PrimaryButton><PrimaryButton disabled={pending === choice || left <= 0} onClick={() => { setChoice(pending); setSelected(STAR_MOODS.findIndex((mood) => mood.id === pending)); analyze(pending) }}>이 무드로 다시 만들기</PrimaryButton></>}>
    <div className="ex-stack">{STAR_MOODS.map((mood) => <ChoiceTile key={mood.id} label={`${mood.name} · ${mood.title}`} note={`${mood.light} / ${mood.styling}`} selected={pending === mood.id} color={mood.color} onClick={() => setPending(mood.id)}><Star size={25} /></ChoiceTile>)}</div>
    <p className="ex-note">{result.footnote}</p>
  </ExpansionFrame>
}
