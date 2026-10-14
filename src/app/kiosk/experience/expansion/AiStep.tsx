'use client'

// AI 분석·이미지 합성을 기다리는 화면과 합성 결과 판.
// 분석이 실패하면 가짜 결과로 넘어가지 않는다 — 다시 시도하거나, 'AI 분석 없이 결과 보기'를 손님이 직접 고른다(결과에 AI 이야기가 없다).

import { RefreshCw, Sparkles } from 'lucide-react'
import { IMAGE_WAIT, type ImageMode } from '@/lib/kiosk/expansion/image-prompts'
import { josa } from '@/lib/kiosk/expansion/korean'
import type { ExpansionId } from '@/lib/kiosk/expansion/types'
import { KxSpinner } from '../kx'
import type { AiJobState } from './ai-client'
import { ExpansionFrame, PrimaryButton } from './shared'

export function AiWait({ id, state, onRetry, onSkip, onBack }: { id: ExpansionId; state: AiJobState; onRetry: () => void; onSkip: () => void; onBack: () => void }) {
  if (state.phase === 'error') return <ExpansionFrame title="AI 분석을 받지 못했어요" onBack={onBack} actions={<><PrimaryButton secondary onClick={onSkip}>AI 분석 없이 결과 보기</PrimaryButton><PrimaryButton onClick={onRetry}><RefreshCw size={20} />다시 시도하기</PrimaryButton></>}>
    <div className="ex-social-wait"><RefreshCw size={54} /><p className="ex-alert" role="alert">{state.busy ? '지금 요청이 많아요. 잠시 뒤 다시 시도해 주세요.' : '인터넷 연결을 확인한 뒤 다시 시도해 주세요.'} 입력한 내용은 그대로 있어요.</p><p className="ex-note">AI 분석 없이 보면 답변과 기기에서 읽은 값으로만 만든 결과가 나와요.</p></div>
  </ExpansionFrame>
  const imaging = state.phase === 'imaging'
  return <ExpansionFrame title={imaging ? IMAGE_WAIT[id as ImageMode] ?? '이미지를 만들고 있어요' : 'AI가 분석하고 있어요'} subtitle={imaging ? '10~20초쯤 걸려요' : '사진과 답변을 함께 보고 있어요'} busy screen="busy">
    <div className="ex-social-wait ex-ai-wait" role="status" aria-live="polite">
      <span className="ex-ai-orb" aria-hidden="true"><Sparkles size={46} strokeWidth={1.4} /></span>
      <KxSpinner size={40} />
      <ol className="ex-ai-steps"><li data-state={imaging ? 'done' : 'now'}>AI 분석</li>{(state.phase === 'imaging' || IMAGE_WAIT[id as ImageMode]) && <li data-state={imaging ? 'now' : 'todo'}>이미지 합성</li>}<li data-state="todo">결과 · 인쇄</li></ol>
      <p className="ex-note">사진은 분석과 합성에만 쓰고 저장하지 않아요.</p>
    </div>
  </ExpansionFrame>
}

/** 합성 이미지 — 실패하면 다시 만들기(결과·인쇄는 그림 없이도 된다) */
export function AiImage({ src, label, failed, wide, onRetry, retrying }: { src: string | null; label: string; failed: boolean; wide?: boolean; onRetry?: () => void; retrying?: boolean }) {
  if (src) return <figure className="ex-ai-image" data-wide={wide || undefined}>
    {/* AI 가 만든 data: 그림 — 최적화할 원격 그림이 아니다 */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={label} />
    <figcaption><Sparkles size={14} aria-hidden="true" />{label} · AI 합성</figcaption>
  </figure>
  if (retrying) return <div className="ex-panel ex-ai-image-missing" role="status"><KxSpinner size={30} /><p>{josa(label, '을/를')} 다시 만들고 있어요…</p></div>
  if (failed) return <div className="ex-panel ex-ai-image-missing" role="alert"><p>{josa(label, '을/를')} 만들지 못했어요. 결과와 인쇄는 그대로 할 수 있어요.</p>{onRetry && <PrimaryButton secondary onClick={onRetry}><RefreshCw size={18} />다시 만들기</PrimaryButton>}</div>
  return null
}
