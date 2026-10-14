'use client'

import { useState } from 'react'
import { Sparkles, Star, Sun, WandSparkles } from 'lucide-react'
import { josa } from '@/lib/kiosk/expansion/korean'
import type { PhotoReading } from '@/lib/kiosk/expansion/photo'
import { cameraStory, FACE_TOPICS, PALM_STORIES, palmFocus, STAR_MOODS, suggestMood } from '@/lib/kiosk/expansion/social'
import { useKx } from '../kx'
import { PhotoNote, PhotoStep } from './PhotoStep'
import { ChoiceTile, Completion, ExpansionFrame, ExpansionSave, ExpansionStart, PrimaryButton, ResultPanel } from './shared'
import './camera-social.css'

type CameraId = 'lookalike' | 'palm' | 'face'
type Step = 'start' | 'photo' | 'choose' | 'result' | 'detail' | 'compare' | 'save' | 'complete'
const COPY = {
  lookalike: { headline: '오늘의 스타 무드를 찾아요', desc: '사진의 표정과 옷 색으로 어울리는 가상 스타 무드를 짚어 드려요. 고르는 건 나예요.', guide: '실존 인물과 얼굴을 비교하지 않아요. 표정과 옷 색만 읽어 가상 스타 세 명의 사진 연출 무드 중 하나를 먼저 짚어 드려요.' },
  palm: { headline: '손 위에 펼치는 작은 이야기', desc: '손바닥을 비추면 손을 펼친 모양으로 먼저 읽을 이야기를 골라요.', guide: '손가락을 펼친 정도만 읽어요. 실제 손금 선을 추출하거나 미래·건강·수명을 판단하지 않아요.' },
  face: { headline: '오늘, 어떤 이야기가 필요한가요?', desc: '지금의 표정을 찍고 오늘 듣고 싶은 이야기를 골라요.', guide: '전통 관상에서 착안한 재미있는 이야기예요. 표정과 옷 색만 읽고, 외모로 성격·능력·건강·운명을 추정하지 않아요.' },
} as const

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
  const [choice, setChoice] = useState('')
  const [selected, setSelected] = useState(0)
  const copy = COPY[id]
  const suggested = id === 'lookalike' ? suggestMood(photo) : null
  // 결과는 고른 주제·무드와 사진에서 읽은 값으로 바로 만든다(사진은 PhotoStep 을 떠나며 사라진다)
  const result = photo && (id === 'palm' || choice) ? cameraStory(id, id === 'palm' ? '' : choice, photo) : null

  const afterPhoto = () => {
    if (id === 'palm') { setSelected(palmFocus(photo)); setStep('result'); return }
    if (id === 'lookalike' && !choice && suggested) setChoice(suggested.id)
    setStep('choose')
  }
  const selectMood = (index: number) => { setSelected(index); setChoice(STAR_MOODS[index].id) }
  const finish = () => setStep('complete')

  if (step === 'start') return <ExpansionStart id={id} headline={copy.headline} description={copy.desc} onStart={() => setStep('photo')} />
  if (step === 'photo') return <PhotoStep id={id} reading={photo} onRead={(made) => { setPhoto(made); setChoice('') }} onNext={afterPhoto} onBack={() => setStep('start')} headline={copy.headline} guide={copy.guide} />
  if (step === 'save' && result) return <ExpansionSave result={result} onBack={() => setStep('result')} onComplete={finish} />
  if (step === 'complete') return <Completion title="이야기 카드를 준비했어요. 사진에서 읽은 값도 지울게요." onBack={() => setStep('result')} />
  if (step === 'choose') return <ExpansionFrame title={id === 'lookalike' ? '어떤 스타 무드가 끌리나요?' : '오늘 듣고 싶은 이야기는?'} subtitle={id === 'lookalike' ? '사진과 어울리는 무드를 먼저 골라 두었어요. 바꿔도 돼요.' : '내 선택과 오늘의 표정이 이야기에 반영돼요'} onBack={() => setStep('photo')} actions={<PrimaryButton disabled={!choice} onClick={() => { if (id === 'lookalike') setSelected(Math.max(0, STAR_MOODS.findIndex((mood) => mood.id === choice))); setStep('result') }}>선택한 이야기 만나기</PrimaryButton>}>
    <div className="ex-grid ex-social-choices">{id === 'lookalike'
      ? STAR_MOODS.map((mood) => <ChoiceTile key={mood.id} label={mood.title} note={`가상 스타 ${mood.name}`} selected={choice === mood.id} color={mood.color} onClick={() => setChoice(mood.id)}><Star size={40} strokeWidth={1.4} />{suggested?.id === mood.id && <span className="ex-mood-pick">사진과 어울려요</span>}</ChoiceTile>)
      : FACE_TOPICS.map((topic) => <ChoiceTile key={topic.id} label={topic.label} selected={choice === topic.id} onClick={() => setChoice(topic.id)}><Sparkles size={36} strokeWidth={1.3} /></ChoiceTile>)}</div>
    <div className="ex-panel"><b>{id === 'lookalike' && suggested ? `사진의 ${josa(suggested.reason, '을/를')} 보고 짚었어요` : '고른 주제로 만드는 이야기'}</b><p>{copy.guide}</p></div>
  </ExpansionFrame>
  if (!result) return <ExpansionFrame title="이야기를 다시 준비해 주세요" actions={<PrimaryButton onClick={home}>처음으로</PrimaryButton>}><p className="ex-alert">결과가 없어요. 사진을 다시 찍어 주세요.</p></ExpansionFrame>

  if (step === 'result') return <ExpansionFrame title={id === 'lookalike' ? '세 가지 스타 무드를 만났어요' : id === 'palm' ? '오늘의 손 위 이야기' : '내가 고른 오늘의 이야기'} onBack={() => setStep(id === 'palm' ? 'photo' : 'choose')} actions={<><PrimaryButton secondary onClick={() => setStep('detail')}>이야기 자세히</PrimaryButton><PrimaryButton onClick={() => setStep('save')}>영수증·휴대폰으로 받기</PrimaryButton></>}>
    {id === 'lookalike' && <div className="ex-star-grid">{STAR_MOODS.map((mood, index) => <button key={mood.id} type="button" aria-pressed={selected === index} onClick={() => selectMood(index)}><span className="ex-star-orbit" style={{ color: mood.color }}><Star size={56} fill="currentColor" strokeWidth={1} /></span><b>{mood.name}</b><small>{mood.title}</small><span>{selected === index ? '선택한 분위기 ✓' : suggested?.id === mood.id ? '사진과 어울려요' : '가상 스타'}</span></button>)}</div>}
    {id === 'palm' && <PalmDrawing selected={selected} onSelect={setSelected} />}
    <ResultPanel result={{ ...result, sections: result.sections.slice(0, 1) }} />
    <PhotoNote result={result} />
  </ExpansionFrame>
  if (step === 'detail') return <ExpansionFrame title={id === 'palm' ? PALM_STORIES[selected].label : result.title} onBack={() => setStep('result')} actions={<PrimaryButton onClick={() => setStep('compare')}>{id === 'lookalike' ? '다른 분위기 비교' : '오늘의 작은 행동'}</PrimaryButton>}>
    {id === 'palm' ? <><PalmDrawing selected={selected} onSelect={setSelected} /><article className="ex-panel"><h2>{PALM_STORIES[selected].keyword}</h2><p>{PALM_STORIES[selected].story}</p></article><PhotoNote result={result} /></> : <><div className="ex-story-emblem">{id === 'lookalike' ? <Star size={80} /> : <Sun size={80} />}</div><ResultPanel result={result} /></>}
  </ExpansionFrame>
  return <ExpansionFrame title={id === 'lookalike' ? '다른 무드도 비교해요' : '오늘 해 볼 작은 행동'} onBack={() => setStep('detail')} actions={<><PrimaryButton secondary onClick={() => setStep('result')}>결과로 돌아가기</PrimaryButton><PrimaryButton onClick={() => setStep('save')}>영수증·휴대폰으로 받기</PrimaryButton></>}>
    {id === 'lookalike' ? <div className="ex-stack">{STAR_MOODS.map((mood, index) => <ChoiceTile key={mood.id} label={`${mood.name} · ${mood.title}`} note={`${mood.light} / ${mood.styling}`} selected={selected === index} color={mood.color} onClick={() => selectMood(index)}><Star size={25} /></ChoiceTile>)}</div> : <div className="ex-stack">{(id === 'palm' ? PALM_STORIES.map((line) => ({ title: line.keyword, body: line.action })) : result.sections.filter((section) => section.title !== '사진에서 읽은 것').slice(-2)).map((section) => <article className="ex-panel" key={section.title}><WandSparkles size={30} /><h2>{section.title}</h2><p>{section.body}</p></article>)}</div>}
    <p className="ex-note">{result.footnote}</p>
  </ExpansionFrame>
}
