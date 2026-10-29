'use client'

// SCENT! AI 조향사 — 분석 대기 · 분석 실패(입력·사진 유지, 다시 시도) (목업 04)
// 대기 화면은 실제로 알 수 없는 퍼센트·남은 시간을 만들어 보이지 않는다: 하는 일 목록에서 지금 문구만 짚고(셸이 2.6초마다
// 넘기는 statusIdx), 막대는 끝이 없는 흐름으로 돈다. 평소 걸리는 시간 안내(t.analyzingEta)는 기존 문구 그대로.

import { Pause } from 'lucide-react'
import { PERFUMER_ART } from '@/lib/kiosk/perfumer-art'
import { BottomBar, Btn, Lines } from './ui'
import type { PerfumerCtx } from './types'

export function AnalyzingScreen({ ctx }: { ctx: PerfumerCtx }) {
  const { p } = ctx
  const active = ctx.statusLines.length ? ctx.statusIdx % ctx.statusLines.length : -1
  return (
    <section className="pf-screen pf-analyzing" aria-busy="true">
      <p className="pf-eyebrow">AI PERFUMER</p>
      <h1 className="pf-title pf-title--center"><Lines text={p.analyzingTitle(ctx.name.trim())} /></h1>
      <div className="pf-analyzing-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PERFUMER_ART.analysis} alt="" />
      </div>
      <ul className="pf-status" aria-live="polite">
        {ctx.statusLines.map((line, i) => (
          <li key={line} data-on={i === active || undefined}>
            <i aria-hidden="true" />
            {line.replace(/\.{2,}$|…$/, '')}
          </li>
        ))}
      </ul>
      <div className="pf-flow" aria-hidden="true"><i /></div>
      <p className="pf-note">{ctx.eta}</p>
    </section>
  )
}

export function AnalyzeErrorScreen({ ctx }: { ctx: PerfumerCtx }) {
  const { p, t } = ctx
  const kind = ctx.analyzeError ?? 'server'
  const picks = [...ctx.picks.style, ...ctx.picks.personality, ...ctx.picks.charm].slice(0, 2)
  const labelOf = (value: string) => ctx.pickLabels.style[value] ?? ctx.pickLabels.personality[value] ?? ctx.pickLabels.charm[value] ?? value
  return (
    <section className="pf-screen pf-error" role="alert">
      <p className="pf-eyebrow pf-eyebrow--soft">{kind === 'network' ? 'OFFLINE' : 'AI PERFUMER'}</p>
      <h1 className="pf-title pf-title--center">{t.analyzeError[`${kind}Title`]}</h1>
      <div className="pf-error-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PERFUMER_ART.orb} alt="" />
        <span className="pf-error-pause"><Pause size={40} strokeWidth={1.6} /></span>
      </div>
      <p className="pf-kept">{p.keptInput}</p>
      <div className="pf-kept-card">
        {ctx.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ctx.photo} alt={t.selectedPhotoAlt} />
        )}
        <div>
          <b>{ctx.name.trim() || t.guest}</b>
          {picks.length > 0 && <span>{picks.map(labelOf).join(' · ')}</span>}
        </div>
      </div>
      <p className="pf-note pf-note--center">{t.analyzeError[`${kind}Desc`]}</p>
      <BottomBar>
        <Btn onClick={ctx.home}>{t.analyzeError.home}</Btn>
        <Btn variant="primary" arrow onClick={ctx.analyze}>{t.analyzeError.retry}</Btn>
      </BottomBar>
    </section>
  )
}
