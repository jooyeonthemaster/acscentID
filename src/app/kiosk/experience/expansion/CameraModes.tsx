'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Hand, RefreshCw, ShieldCheck, Sparkles, Star, Sun, WandSparkles } from 'lucide-react'
import { cameraStory, FACE_TOPICS, PALM_STORIES, STAR_MOODS } from '@/lib/kiosk/expansion/social'
import type { ExperienceResult } from '@/lib/kiosk/expansion/types'
import { KX_IDLE, KxCamView, KxSpinner, useKx, useKxCamera } from '../kx'
import { loadVision, photoCanvas, preloadVision } from '../kx-vision'
import { ChoiceTile, Completion, ExpansionFrame, ExpansionSave, ExpansionStart, PrimaryButton, ResultPanel } from './shared'
import './camera-social.css'

type CameraId = 'lookalike' | 'palm' | 'face'
type Step = 'start' | 'guide' | 'capture' | 'confirm' | 'choose' | 'processing' | 'result' | 'detail' | 'compare' | 'save' | 'complete' | 'error'
const COPY = {
  lookalike: { headline: '오늘의 스타 무드를 찾아요', desc: '사진을 확인하고 마음에 드는 가상 스타 분위기를 골라요.', guide: '실존 인물과 얼굴을 비교하지 않아요. 가상 스타 세 명의 사진 연출 무드를 직접 고르는 체험이에요.', icon: Star },
  palm: { headline: '손 위에 펼치는 작은 이야기', desc: '손바닥을 비추고 세 개의 선에 담긴 창작 이야기를 만나 보세요.', guide: '손의 존재만 확인해요. 실제 손금 선을 추출하거나 미래·건강·수명을 판단하지 않아요.', icon: Hand },
  face: { headline: '오늘, 어떤 이야기가 필요한가요?', desc: '내 모습을 확인하고 오늘 듣고 싶은 이야기를 직접 골라요.', guide: '전통 관상에서 착안한 재미있는 이야기예요. 외모로 성격·능력·건강·운명을 추정하지 않아요.', icon: Sparkles },
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
  const [photo, setPhoto] = useState<string | null>(null)
  const [choice, setChoice] = useState('')
  const [selected, setSelected] = useState(0)
  const [result, setResult] = useState<ExperienceResult | null>(null)
  const [error, setError] = useState('')
  const job = useRef(0)
  const cam = useKxCamera(step === 'capture', { sharp: id === 'palm' })
  const copy = COPY[id]
  const Icon = copy.icon

  useEffect(() => {
    if (step !== 'start') return
    return preloadVision(id === 'palm' ? 'hand' : 'face')
  }, [id, step])
  useEffect(() => () => { job.current += 1 }, [])

  useEffect(() => {
    if (step !== 'processing') return
    const run = ++job.current
    let active = true
    let timeout: ReturnType<typeof setTimeout> | undefined
    const validate = async () => {
      if (!photo) throw new Error('사진이 없어요. 다시 촬영해 주세요.')
      const image = await photoCanvas(photo, 1000)
      try {
        if (id === 'palm') {
          const engine = await loadVision('hand')
          if (!active || run !== job.current) return false
          if (!engine.detect(image).landmarks.length) throw new Error('손을 찾지 못했어요. 손바닥을 펴고 손가락까지 안내선 안에 넣어 주세요.')
        } else {
          const engine = await loadVision('face')
          if (!active || run !== job.current) return false
          if (!engine.detect(image).faceLandmarks.length) throw new Error('얼굴을 찾지 못했어요. 정면을 보고 얼굴이 밝게 나오도록 다시 촬영해 주세요.')
        }
        return true
      } finally { image.width = 0; image.height = 0 }
    }
    void Promise.race([
      validate(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('확인 도구를 준비하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요. 사진은 기기에만 있어요.')), 45000) }),
    ]).then((valid) => {
      if (!active || run !== job.current || !valid) return
      setResult(cameraStory(id, choice))
      setSelected(id === 'lookalike' ? Math.max(0, STAR_MOODS.findIndex((mood) => mood.id === choice)) : 0)
      setStep('result')
    }).catch((caught: unknown) => {
      if (!active || run !== job.current) return
      const message = caught instanceof Error ? caught.message : ''
      setError(/^(사진이 없어요|손을 찾지 못했어요|얼굴을 찾지 못했어요|확인 도구를 준비하지 못했어요)/.test(message) ? message : '사진 확인 도구를 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요. 촬영 사진은 기기에만 있어요.')
      setStep('error')
    }).finally(() => clearTimeout(timeout))
    return () => { active = false; job.current += 1; clearTimeout(timeout) }
  }, [step, photo, id, choice])

  const captureAgain = () => { job.current += 1; setPhoto(null); setResult(null); setError(''); setStep('capture') }
  const finish = () => { job.current += 1; setPhoto(null); setStep('complete') }
  const selectMood = (index: number) => { setSelected(index); setChoice(STAR_MOODS[index].id); setResult(cameraStory('lookalike', STAR_MOODS[index].id)) }
  const save = () => { setPhoto(null); setStep('save') }

  if (step === 'start') return <ExpansionStart id={id} headline={copy.headline} description={copy.desc} onStart={() => setStep('guide')} />
  if (step === 'save' && result) return <ExpansionSave result={result} onBack={() => setStep('result')} onComplete={finish} />
  if (step === 'complete') return <Completion title="이야기 카드를 준비했어요. 촬영 사진은 지웠어요." onBack={() => setStep('result')} />
  if (step === 'guide') return <ExpansionFrame title={id === 'palm' ? '손바닥을 보여 주세요' : '나의 모습을 확인해요'} onBack={() => setStep('start')} actions={<PrimaryButton onClick={() => setStep('capture')}>촬영 시작하기 <Camera size={20} /></PrimaryButton>}>
    <div className="ex-camera-intro"><Icon size={76} strokeWidth={1.2} /><h2>{copy.headline}</h2><p>{copy.guide}</p></div>
    <div className="ex-panel ex-camera-privacy"><ShieldCheck size={25} /><div><b>사진은 이 기기 안에서만</b><p>얼굴 또는 손의 유무만 확인하고 서버에 보내지 않아요. 받는 카드에도 촬영 사진은 포함하지 않아요.</p></div></div>
    <ol className="ex-camera-tips"><li>카메라 권한을 허용해 주세요.</li><li>{id === 'palm' ? '손바닥과 손가락 전체를 밝게 비춰 주세요.' : '한 사람이 정면을 보고 얼굴을 밝게 비춰 주세요.'}</li><li>사진을 확인한 뒤 다시 찍을 수 있어요.</li></ol>
  </ExpansionFrame>
  if (step === 'capture') return <ExpansionFrame title={id === 'palm' ? '손바닥 전체가 보이게' : '안내선 안에서 정면을 봐요'} subtitle="촬영을 누르면 3초 뒤에 찍어요" screen={cam.countdown !== null ? 'busy' : KX_IDLE.camera} onBack={() => setStep('guide')} actions={<PrimaryButton disabled={cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((next) => { setPhoto(next); setStep('confirm') })}><Camera size={22} />{cam.countdown !== null ? `${cam.countdown}초` : '촬영하기'}</PrimaryButton>}>
    <div className="ex-camera-view"><KxCamView cam={cam}><div className={id === 'palm' ? 'ex-hand-guide' : 'ex-face-guide'} aria-hidden="true">{id === 'palm' && <Hand size={130} strokeWidth={1} />}</div></KxCamView></div>
    {cam.state === 'error' ? <div className="ex-alert" role="alert">카메라 권한과 연결을 확인해 주세요. 권한을 허용하면 자동으로 다시 연결해요.<PrimaryButton secondary onClick={() => setStep('guide')}>안내로 돌아가기</PrimaryButton></div> : <p className="ex-note">{id === 'palm' ? '손을 너무 가까이 대지 말고 손가락을 편안하게 펴세요.' : '마스크나 손으로 얼굴을 가리지 않고, 밝은 곳에서 촬영해요.'}</p>}
  </ExpansionFrame>
  if (step === 'confirm') return <ExpansionFrame title="이 사진으로 진행할까요?" subtitle="사진을 바꾸면 이전 사진은 지워져요" onBack={captureAgain} actions={<><PrimaryButton secondary onClick={captureAgain}><RefreshCw size={20} />다시 찍기</PrimaryButton><PrimaryButton onClick={() => setStep(id === 'palm' ? 'processing' : 'choose')}>이 사진으로 계속</PrimaryButton></>}>
    <div className="ex-camera-view"><KxCamView cam={null} photo={photo} badge="기기에서만 확인" /></div><p className="ex-note">{copy.guide}</p>
  </ExpansionFrame>
  if (step === 'choose') return <ExpansionFrame title={id === 'lookalike' ? '어떤 스타 무드가 끌리나요?' : '오늘 듣고 싶은 이야기는?'} subtitle="내 선택이 결과에 반영돼요" onBack={() => setStep('confirm')} actions={<PrimaryButton disabled={!choice} onClick={() => setStep('processing')}>선택한 이야기 만나기</PrimaryButton>}>
    <div className="ex-grid ex-social-choices">{id === 'lookalike' ? STAR_MOODS.map((mood) => <ChoiceTile key={mood.id} label={mood.title} note={`가상 스타 ${mood.name}`} selected={choice === mood.id} color={mood.color} onClick={() => setChoice(mood.id)}><Star size={40} strokeWidth={1.4} /></ChoiceTile>) : FACE_TOPICS.map((topic) => <ChoiceTile key={topic.id} label={topic.label} selected={choice === topic.id} onClick={() => setChoice(topic.id)}><Sparkles size={36} strokeWidth={1.3} /></ChoiceTile>)}</div><div className="ex-panel"><b>고른 주제로 만드는 이야기</b><p>{copy.guide}</p></div>
  </ExpansionFrame>
  if (step === 'processing') return <ExpansionFrame title={id === 'palm' ? '손을 확인하고 있어요' : '얼굴을 확인하고 있어요'} subtitle="사진은 이 기기를 떠나지 않아요" busy screen="busy"><div className="ex-social-wait" role="status"><KxSpinner size={54} /><h2>이야기를 준비해요</h2><p>처음에는 확인 도구를 받는 데 시간이 걸릴 수 있어요.</p><PrimaryButton secondary onClick={() => setStep('confirm')}>사진 확인으로 돌아가기</PrimaryButton></div></ExpansionFrame>
  if (step === 'error') return <ExpansionFrame title="다시 확인해 주세요" onBack={() => setStep('confirm')} actions={<><PrimaryButton secondary onClick={captureAgain}>다시 촬영하기</PrimaryButton><PrimaryButton onClick={() => setStep('processing')}>이 사진으로 재시도</PrimaryButton></>}><div className="ex-social-wait"><RefreshCw size={54} /><p className="ex-alert" role="alert">{error}</p><p className="ex-note">선택한 주제는 유지돼요. 사진과 이름을 서버에 보내지 않았어요.</p></div></ExpansionFrame>
  if (!result) return <ExpansionFrame title="이야기를 다시 준비해 주세요" actions={<PrimaryButton onClick={home}>처음으로</PrimaryButton>}><p className="ex-alert">결과가 없어요.</p></ExpansionFrame>

  if (step === 'result') return <ExpansionFrame title={id === 'lookalike' ? '세 가지 스타 무드를 만났어요' : id === 'palm' ? '오늘의 손 위 이야기' : '내가 고른 오늘의 이야기'} onBack={() => { if (photo) setStep(id === 'palm' ? 'confirm' : 'choose'); else setStep('guide') }} actions={<><PrimaryButton secondary onClick={() => setStep('detail')}>이야기 자세히</PrimaryButton><PrimaryButton onClick={save}>카드 받기</PrimaryButton></>}>
    {id === 'lookalike' && <div className="ex-star-grid">{STAR_MOODS.map((mood, index) => <button key={mood.id} type="button" aria-pressed={selected === index} onClick={() => selectMood(index)}><span className="ex-star-orbit" style={{ color: mood.color }}><Star size={56} fill="currentColor" strokeWidth={1} /></span><b>{mood.name}</b><small>{mood.title}</small><span>{selected === index ? '선택한 분위기 ✓' : '가상 스타'}</span></button>)}</div>}
    {id === 'palm' && <PalmDrawing selected={selected} onSelect={setSelected} />}
    <ResultPanel result={{ ...result, sections: result.sections.slice(0, 1) }} />
  </ExpansionFrame>
  if (step === 'detail') return <ExpansionFrame title={id === 'palm' ? PALM_STORIES[selected].label : result.title} onBack={() => setStep('result')} actions={<PrimaryButton onClick={() => setStep('compare')}>{id === 'lookalike' ? '다른 분위기 비교' : '오늘의 작은 행동'}</PrimaryButton>}>
    {id === 'palm' ? <><PalmDrawing selected={selected} onSelect={setSelected} /><article className="ex-panel"><h2>{PALM_STORIES[selected].keyword}</h2><p>{PALM_STORIES[selected].story}</p></article></> : <><div className="ex-story-emblem">{id === 'lookalike' ? <Star size={80} /> : <Sun size={80} />}</div><ResultPanel result={result} /></>}
  </ExpansionFrame>
  return <ExpansionFrame title={id === 'lookalike' ? '다른 무드도 비교해요' : '오늘 해 볼 작은 행동'} onBack={() => setStep('detail')} actions={<><PrimaryButton secondary onClick={() => setStep('result')}>결과로 돌아가기</PrimaryButton><PrimaryButton onClick={save}>이 카드 받기</PrimaryButton></>}>
    {id === 'lookalike' ? <div className="ex-stack">{STAR_MOODS.map((mood, index) => <ChoiceTile key={mood.id} label={`${mood.name} · ${mood.title}`} note={`${mood.light} / ${mood.styling}`} selected={selected === index} color={mood.color} onClick={() => selectMood(index)}><Star size={25} /></ChoiceTile>)}</div> : <div className="ex-stack">{(id === 'palm' ? PALM_STORIES.map((line) => ({ title: line.keyword, body: line.action })) : result.sections.slice(-2)).map((section) => <article className="ex-panel" key={section.title}><WandSparkles size={30} /><h2>{section.title}</h2><p>{section.body}</p></article>)}</div>}
    <p className="ex-note">{result.footnote}</p>
  </ExpansionFrame>
}
