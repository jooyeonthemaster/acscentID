'use client'

// 연말 시상식 AI 소믈리에(studio-sommelier-nh) — 기존 소믈리에(PreferenceMode)와 같은 구조를 짧게:
// 시작 → 사진(건너뛸 수 있음) → 맛 세 가지(한 화면) → 종류 → AI 가 후보 4병 중 한 병 → 결과(번호 · 이름 크게) → 인쇄하기 · 휴대폰으로 받기.
// 손님 한 명 2분 안팎이 목표라 안내 · 확인 화면을 뺐다(답은 이전 버튼으로 고친다).
// 데이터 · 규칙: src/lib/kiosk/expansion/nh-wines.ts · nh-sommelier.ts, 문서 docs/nh-awards-demo.md

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, RotateCcw, Wine } from 'lucide-react'
import { applyAiAnalysis } from '@/lib/kiosk/expansion/ai'
import { PHOTO_PLANS, readingLine, type PhotoReading } from '@/lib/kiosk/expansion/photo'
import { findNhWine, NH_DEFAULT_ANSWERS, NH_KINDS, NH_SCALES, nhCandidateSummary, recommendNhWine, type NhAnswers, type NhBundle, type PourCounts } from '@/lib/kiosk/expansion/nh-sommelier'
import { useAiJob } from './ai-client'
import { AiWait } from './AiStep'
import { PhotoNote, PhotoStep } from './PhotoStep'
import { ChoiceTile, ExpansionFrame, ExpansionStart, PrimaryButton, ResultPanel, TakeActions } from './shared'

const ID = 'sommelier-nh' as const
type Page = 'start' | 'photo' | 'taste' | 'kind' | 'ai' | 'result'

/** 오늘 이 키오스크에서 병마다 추천한 수 — 재고를 고르게 쓰는 데만 쓴다(손님 정보 없음). 저장이 막힌 브라우저면 세지 않는다 */
const countsKey = () => `nh-sommelier-pours:${new Date().toLocaleDateString('sv-SE')}`
function readCounts(): PourCounts {
  try { return JSON.parse(localStorage.getItem(countsKey()) ?? '{}') as PourCounts } catch { return {} }
}
function addCount(no: number) {
  try { const counts = readCounts(); counts[no] = (counts[no] ?? 0) + 1; localStorage.setItem(countsKey(), JSON.stringify(counts)) } catch { /* 세지 않는다 */ }
}

export default function SommelierNhMode() {
  const [page, setPage] = useState<Page>('start')
  const [answers, setAnswers] = useState<NhAnswers>(NH_DEFAULT_ANSWERS)
  const [photo, setPhoto] = useState<PhotoReading | null>(null)
  const [shot, setShot] = useState<string | null>(null)
  const [bundle, setBundle] = useState<NhBundle | null>(null)
  const [failure, setFailure] = useState('')
  const ai = useAiJob()
  const counted = useRef<string | null>(null)

  const done = ai.state.phase === 'done' ? ai.state : null
  const pick = done?.analysis?.pick ?? null
  const list = bundle ? [bundle.primary, ...bundle.alternatives] : []
  const chosen = list.find((c) => c.id === pick) ?? list[0]
  const result = chosen && done?.analysis && chosen.id === pick ? applyAiAnalysis(chosen, done.analysis) : chosen

  // 결과를 보여 준 병을 한 번 센다(다음 손님의 후보 순서에 반영)
  useEffect(() => {
    if (page !== 'result' || !result?.pour || counted.current === result.id) return
    counted.current = result.id
    addCount(result.pour.no)
  }, [page, result])

  const set = (patch: Partial<NhAnswers>) => { setAnswers((a) => ({ ...a, ...patch })); setBundle(null); ai.reset(); counted.current = null }

  const analyze = (made: NhBundle) => {
    const candidates = [made.primary, ...made.alternatives].map((r) => ({ id: r.id, title: r.title, summary: nhCandidateSummary(findNhWine(r.id)!) }))
    void ai.run({ analysis: { id: ID, photo: shot, facts: photo ? readingLine(photo, PHOTO_PLANS[ID]) : '', answers: made.answers, candidates, context: '' } })
      .then((finished) => { if (finished) setPage('result') })
  }
  const calculate = () => {
    let made: NhBundle
    try { made = recommendNhWine(answers, photo, readCounts()) } catch (error) { setFailure(error instanceof Error ? error.message : '다시 골라 주세요.'); return }
    setFailure(''); setBundle(made); counted.current = null; setPage('ai')
    analyze(made)
  }

  if (page === 'start') return <ExpansionStart id={ID} headline="오늘의 한 잔을 골라 드려요" description="사진 한 장과 맛 취향 세 가지를 고르면, AI가 오늘 준비한 와인 열 병 중 한 병을 번호로 알려 드려요." steps={['사진 한 장', '맛 고르기', '번호로 받기']} onStart={() => setPage('photo')} />
  if (page === 'photo') return <PhotoStep id={ID} reading={photo} onRead={(made, taken) => { setPhoto(made); setShot(taken); setBundle(null); ai.reset() }} onNext={() => setPage('taste')} onBack={() => setPage('start')} onSkip={() => { setPhoto(null); setShot(null); setBundle(null); ai.reset(); setPage('taste') }} />
  if (page === 'taste') return <ExpansionFrame title="어떤 맛이 좋아요?" subtitle="1 / 2 · 손끝으로 밀어 골라 주세요" onBack={() => setPage('photo')} actions={<PrimaryButton onClick={() => setPage('kind')}>다음 <ArrowRight size={22} /></PrimaryButton>}>
    <div className="ex-nh-scales">{NH_SCALES.map((q) => <section key={q.key} className="ex-question" aria-labelledby={`q-${q.key}`}>
      <h2 id={`q-${q.key}`}>{q.title}</h2><p className="ex-note">{q.note}</p>
      <div className="ex-panel"><input id={`input-${q.key}`} type="range" aria-labelledby={`q-${q.key}`} min={1} max={5} step={1} value={answers[q.key]} onChange={(e) => set({ [q.key]: Number(e.target.value) })} /><div className="ex-range-label"><span>1</span><output htmlFor={`input-${q.key}`}>{answers[q.key]}</output><span>5</span></div></div>
    </section>)}</div>
  </ExpansionFrame>
  if (page === 'kind') return <ExpansionFrame title="어떤 와인이 끌리나요?" subtitle="2 / 2 · 고른 종류 안에서 골라 드려요" onBack={() => setPage('taste')} actions={<PrimaryButton onClick={calculate}>내 와인 찾기 <Wine size={22} /></PrimaryButton>}>
    <div className="ex-grid ex-nh-kinds">{NH_KINDS.map((k) => <ChoiceTile key={k.id} label={k.label} note={k.note} selected={answers.kind === k.id} onClick={() => set({ kind: k.id })} />)}</div>
    {failure && <p className="ex-alert" role="alert" style={{ marginTop: 16 }}>{failure}</p>}
  </ExpansionFrame>
  if (page === 'ai') return <AiWait id={ID} state={ai.state} onRetry={() => bundle && analyze(bundle)} onSkip={() => { ai.skip(); setPage('result') }} onBack={() => { ai.reset(); setPage('kind') }} />
  if (!result) return <ExpansionFrame title="다시 골라 주세요" actions={<PrimaryButton onClick={() => setPage('taste')}>맛 고르기</PrimaryButton>}><p>답을 바꿨어요. 다시 골라 주세요.</p></ExpansionFrame>
  return <ExpansionFrame title="오늘의 한 잔" subtitle={done?.analysis && chosen.id === pick ? '사진과 취향을 AI가 함께 보고 골랐어요. 아래 번호를 직원에게 보여 주세요.' : '취향과 사진에서 읽은 값으로 골랐어요(AI 분석 없이). 아래 번호를 직원에게 보여 주세요.'} onBack={() => setPage('kind')} screen={120} actions={<TakeActions result={result} />}>
    <ResultPanel result={{ ...result, sections: result.sections.slice(0, 2) }} />
    <PhotoNote result={result} />
    <div className="ex-stack" style={{ marginTop: 16 }}><PrimaryButton secondary onClick={() => setPage('taste')}><RotateCcw size={20} />맛 다시 고르기</PrimaryButton></div>
  </ExpansionFrame>
}
