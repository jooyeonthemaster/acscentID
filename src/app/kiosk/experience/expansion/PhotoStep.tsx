'use client'

// 체험 18종의 사진 단계 — 안내 → 촬영(3초) → 확인 → 읽기 → '사진에서 읽은 것'. 읽은 값만 모드로 넘기고 사진은 이 단계를 떠나면 사라진다.
// 사진 없이 할 수 있는 체험(plan.optional)은 카메라가 안 되거나 손님이 원하지 않으면 건너뛴다 — 그때 결과에는 사진 이야기가 없다.

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Camera, Hand, RefreshCw, ScanFace, ShieldCheck, Users } from 'lucide-react'
import { usesImage } from '@/lib/kiosk/expansion/image-prompts'
import { josa } from '@/lib/kiosk/expansion/korean'
import { PHOTO_PLANS, readingFacts, type PhotoReading } from '@/lib/kiosk/expansion/photo'
import type { ExpansionId, ExperienceResult } from '@/lib/kiosk/expansion/types'
import { KX_IDLE, KxCamView, KxSpinner, useKxCamera } from '../kx'
import { loadVision } from '../kx-vision'
import { PhotoReadError, readPhoto, type PhotoProblem } from './read-photo'
import { ExpansionFrame, PrimaryButton } from './shared'
import './camera-social.css'

type Stage = 'guide' | 'capture' | 'confirm' | 'reading' | 'shown' | 'error'

const HEADLINE = { face: '지금의 나를 한 장 찍어요', hand: '손바닥을 펼쳐 보여 주세요', group: '다 같이 한 장 찍어요', pair: '두 사람이 함께 한 장 찍어요' } as const
const TIPS = {
  face: ['한 사람이 정면을 보고 얼굴과 상반신이 함께 나오게 서요.', '밝은 곳에서, 얼굴을 가리지 않게 찍어요.', '찍은 뒤 확인하고 다시 찍을 수 있어요.'],
  hand: ['손바닥과 손가락 전체가 안내선 안에 들어오게 해요.', '손을 너무 가까이 대지 말고 편안하게 펴요.', '찍은 뒤 확인하고 다시 찍을 수 있어요.'],
  group: ['모두의 얼굴이 화면 안에 들어오게 모여 서요.', '뒤쪽 사람은 한 걸음 앞으로, 키가 큰 사람은 뒤로.', '찍은 뒤 확인하고 다시 찍을 수 있어요.'],
  pair: ['두 사람의 얼굴과 어깨가 함께 나오게 나란히 서요.', '편한 포즈 그대로 괜찮아요.', '찍은 뒤 확인하고 다시 찍을 수 있어요.'],
} as const
const PROBLEM: Record<PhotoProblem, string> = {
  'no-face': '얼굴을 찾지 못했어요. 정면을 보고 얼굴이 밝게 나오도록 다시 찍어 주세요.',
  'no-hand': '손을 찾지 못했어요. 손바닥을 펴고 손가락까지 안내선 안에 넣어 주세요.',
  'need-two': '두 사람 이상의 얼굴이 함께 나와야 해요. 모두 화면 안에 들어오게 다시 찍어 주세요.',
  tool: '사진을 읽는 도구를 준비하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요. 사진은 기기에만 있어요.',
}

/** 사진에서 읽은 것 — 이름과 값, 옷 색은 색 견본까지 */
export function PhotoFacts({ id, reading }: { id: ExpansionId; reading: PhotoReading }) {
  return <dl className="ex-photo-facts">{readingFacts(reading, PHOTO_PLANS[id]).map((fact) => <div key={fact.label}>
    <dt>{fact.label}</dt>
    <dd>{fact.colors && <span className="ex-photo-swatches" aria-hidden="true">{fact.colors.map((color) => <i key={color} style={{ background: color }} />)}</span>}{fact.value}</dd>
  </div>)}</dl>
}

/** 결과 화면에 붙이는 '사진에서 읽은 것' — 이 결과에 사진이 무엇을 더했는지(결과의 그 절을 그대로) */
export function PhotoNote({ result }: { result: ExperienceResult }) {
  const part = result.sections.find((section) => section.title === '사진에서 읽은 것' || section.title.startsWith('사진 속'))
  if (!part) return null
  return <section className="ex-panel ex-photo-note" aria-label={part.title}><h3><ScanFace size={20} aria-hidden="true" />{part.title}</h3><p>{part.body}</p>{part.items?.length ? <ul className="ex-detail-list">{part.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}</section>
}

export function PhotoStep({ id, reading, onRead, onNext, onBack, onSkip, headline, guide }: {
  id: ExpansionId
  reading: PhotoReading | null
  /** 읽은 값과 찍은 사진(data: 주소 — AI 분석·합성에 보낸 뒤 처음으로 돌아가면 사라진다) */
  onRead: (reading: PhotoReading, photo: string) => void
  onNext: () => void
  onBack: () => void
  /** 사진 없이 하기 — plan.optional 일 때만 보인다 */
  onSkip?: () => void
  headline?: string
  guide?: string
}) {
  const plan = PHOTO_PLANS[id]
  const [stage, setStage] = useState<Stage>(reading ? 'shown' : 'guide')
  const [photo, setPhoto] = useState<string | null>(null)
  const [problem, setProblem] = useState<PhotoProblem>('tool')
  const job = useRef(0)
  const deliver = useRef(onRead)
  useEffect(() => { deliver.current = onRead }, [onRead])
  const wide = plan.subject === 'group' || plan.subject === 'pair'
  const cam = useKxCamera(stage === 'capture', { sharp: plan.subject === 'hand', ratio: wide ? 4 / 3 : undefined })
  const skip = plan.optional ? onSkip : undefined
  const Icon = plan.subject === 'hand' ? Hand : wide ? Users : ScanFace

  // 안내를 읽는 동안 도구를 깨운다(첫 화면에서 받아 두지 못했으면 지금 받는다)
  useEffect(() => {
    if (stage !== 'guide' && stage !== 'capture') return
    void (plan.subject === 'hand' ? loadVision('hand') : loadVision('faces')).catch(() => { /* 읽을 때 다시 */ })
    if (plan.outfit) void loadVision('hair').catch(() => { /* 옷 색 없이 */ })
  }, [stage, plan])
  useEffect(() => () => { job.current += 1 }, [])

  useEffect(() => {
    if (stage !== 'reading' || !photo) return
    const run = ++job.current
    readPhoto(photo, plan)
      .then((made) => { if (run !== job.current) return; deliver.current(made, photo); setStage('shown') })
      .catch((error: unknown) => { if (run !== job.current) return; setProblem(error instanceof PhotoReadError ? error.problem : 'tool'); setStage('error') })
    return () => { job.current += 1 }
  }, [stage, photo, plan])

  const again = () => { job.current += 1; setPhoto(null); setStage('capture') }
  const skipButton = skip && <PrimaryButton secondary onClick={skip}>사진 없이 하기</PrimaryButton>

  if (stage === 'capture') return <ExpansionFrame title={plan.subject === 'hand' ? '손바닥 전체가 보이게' : wide ? '모두 화면 안으로' : '안내선 안에서 정면을 봐요'} subtitle="촬영을 누르면 3초 뒤에 찍어요" screen={cam.countdown !== null ? 'busy' : KX_IDLE.camera} onBack={() => setStage('guide')} actions={<PrimaryButton disabled={cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((next) => { setPhoto(next); setStage('confirm') })}><Camera size={22} />{cam.countdown !== null ? `${cam.countdown}초` : '촬영하기'}</PrimaryButton>}>
    <div className="ex-camera-view" data-wide={wide || undefined}><KxCamView cam={cam}><div className={plan.subject === 'hand' ? 'ex-hand-guide' : wide ? 'ex-group-guide' : 'ex-face-guide'} aria-hidden="true">{plan.subject === 'hand' && <Hand size={130} strokeWidth={1} />}</div></KxCamView></div>
    {cam.state === 'error'
      ? <div className="ex-alert" role="alert">카메라 권한과 연결을 확인해 주세요. 권한을 허용하면 자동으로 다시 연결해요.<div className="ex-stack" style={{ marginTop: 12 }}><PrimaryButton secondary onClick={() => setStage('guide')}>안내로 돌아가기</PrimaryButton>{skipButton}</div></div>
      : <p className="ex-note">{TIPS[plan.subject][0]}</p>}
  </ExpansionFrame>

  if (stage === 'confirm' && photo) return <ExpansionFrame title="이 사진으로 읽을까요?" subtitle="다시 찍으면 이전 사진은 지워져요" onBack={again} actions={<><PrimaryButton secondary onClick={again}><RefreshCw size={20} />다시 찍기</PrimaryButton><PrimaryButton onClick={() => setStage('reading')}>이 사진으로 계속</PrimaryButton></>}>
    <div className="ex-camera-view" data-wide={wide || undefined}><KxCamView cam={null} photo={photo} badge="AI 분석에만 써요" /></div>
    <p className="ex-note">{plan.uses}</p>
  </ExpansionFrame>

  if (stage === 'reading') return <ExpansionFrame title="사진을 읽고 있어요" subtitle="기기에서 먼저 표정과 색을 재요" busy screen="busy">
    <div className="ex-social-wait" role="status"><KxSpinner size={54} /><h2>{plan.reads.join(' · ')}</h2><p>처음에는 읽는 도구를 받는 데 시간이 걸릴 수 있어요.</p><PrimaryButton secondary onClick={() => { job.current += 1; setStage('confirm') }}>사진 확인으로 돌아가기</PrimaryButton></div>
  </ExpansionFrame>

  if (stage === 'error') return <ExpansionFrame title="다시 찍어 주세요" onBack={() => setStage(photo ? 'confirm' : 'guide')} actions={<><PrimaryButton secondary onClick={again}>다시 찍기</PrimaryButton>{problem === 'tool' && photo ? <PrimaryButton onClick={() => setStage('reading')}>이 사진으로 다시 읽기</PrimaryButton> : skipButton}</>}>
    <div className="ex-social-wait"><RefreshCw size={54} /><p className="ex-alert" role="alert">{PROBLEM[problem]}</p>{problem === 'tool' && skipButton}<p className="ex-note">사진을 서버에 보내지 않았어요.</p></div>
  </ExpansionFrame>

  if (stage === 'shown' && reading) return <ExpansionFrame title="사진에서 읽은 것" subtitle="사진은 체험이 끝나면 지워요" onBack={photo ? () => setStage('confirm') : onBack} screen={KX_IDLE.result} actions={<><PrimaryButton secondary onClick={again}><RefreshCw size={20} />다시 찍기</PrimaryButton><PrimaryButton onClick={onNext}>이대로 계속 <ArrowRight size={22} /></PrimaryButton></>}>
    <div className="ex-photo-read">
      {photo && <div className="ex-photo-thumb" data-wide={wide || undefined}>
        {/* 방금 찍은 data: 사진 — 최적화할 원격 그림이 아니다 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="방금 찍은 사진" />
      </div>}
      <PhotoFacts id={id} reading={reading} />
    </div>
    <div className="ex-panel"><h3>결과에 이렇게 쓰여요</h3><p>{plan.uses} 마지막에 AI가 사진과 답변을 함께 보고 결과를 풀어 줘요{usesImage(id) ? ' — 이 체험은 사진으로 새 그림도 만들어요' : ''}.</p></div>
  </ExpansionFrame>

  return <ExpansionFrame title={headline ?? HEADLINE[plan.subject]} subtitle="사진 한 장으로 결과가 달라져요" onBack={onBack} actions={<>{skipButton}<PrimaryButton onClick={() => setStage('capture')}>촬영 시작하기 <Camera size={20} /></PrimaryButton></>}>
    <div className="ex-camera-intro"><Icon size={72} strokeWidth={1.2} /><h2>{headline ?? HEADLINE[plan.subject]}</h2><p>{guide ?? plan.uses}</p></div>
    <div className="ex-photo-reads"><b>사진에서 읽는 것</b><div className="ex-tags">{plan.reads.map((read) => <span key={read}>{read}</span>)}</div></div>
    <div className="ex-panel ex-camera-privacy"><ShieldCheck size={25} /><div><b>사진은 분석에만 쓰고 저장하지 않아요</b><p>기기에서 {josa(plan.reads.join(' · '), '을/를')} 재고, AI가 사진과 답변을 함께 보고 결과를 만들어요. 사진은 서버에 저장하지 않고, 영수증과 결과 카드에도 찍은 사진은 들어가지 않아요{usesImage(id) ? '(AI가 새로 만든 그림은 들어가요)' : ''}.</p></div></div>
    <ol className="ex-camera-tips">{TIPS[plan.subject].map((tip) => <li key={tip}>{tip}</li>)}</ol>
  </ExpansionFrame>
}
