'use client'

// ANSAN(2026 안산사이언스밸리 과학축제) 화면 부품 — 공식 웹사이트 디자인 'WHITEPRINT(백색 도면)'를 부스 화면에 옮긴 것.
// 흰 종이 위의 기계 도면: 1px 헤어라인 · 치수선 · 네 모서리 정합 마크 · 모노 인덱스 [01] · 각진 버튼. 채도는 볼트 파랑(#1436ff) 한 색.
// 글꼴: 영문 디스플레이 Bricolage Grotesque 800 대문자 · 한글 헤드라인 Pretendard 800 · 라벨 JetBrains Mono. 모양은 asv.css.
// 축제 사실(이름·일시·장소)은 ASV_FESTIVAL 만 쓴다 — 공식 문서의 확정 카피.

import { CircleHelp, Home } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ProgramDef } from '@/lib/booth/programs/catalog'
import { ASV_FESTIVAL, STRIP_NOW_YEAR, STRIP_STEPS } from '@/lib/booth/programs/timecapsule-strip'

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 네 모서리 크로스헤어 — 부모가 position: relative */
export function RegMarks() {
  return <span className="asv-reg" aria-hidden="true"><i /></span>
}

/** 사이트 로고 — 테두리 사각 안의 볼트 사각 + ASV 2026 */
export function AsvLogo() {
  return (
    <span className="asv-logo">
      <span className="asv-mark" aria-hidden="true"><i /></span>
      <b>{ASV_FESTIVAL.short}</b>
    </span>
  )
}

/** 섹션 머리 — [01] ──────── LABEL · 한글 제목 · 부제 */
export function AsvHead({ index, label, title, sub }: { index: number; label: string; title: string; sub?: ReactNode }) {
  return (
    <header className="asv-head">
      <div className="asv-rule"><span className="asv-index">{pad2(index)}</span><i /><span className="asv-label">{label}</span></div>
      <h2>{title.split('\n').map((line, i) => <span key={i}>{line}</span>)}</h2>
      {sub && <p>{sub}</p>}
    </header>
  )
}

/** 도면 주석 — 모노 라벨 + 한 줄 */
export function AsvNote({ label = 'NOTE', children }: { label?: string; children: ReactNode }) {
  return <p className="asv-note" role="note"><b>{label}</b><span>{children}</span></p>
}

/** 위 제목줄 — 로고 · (진행 중) 단계 / (시작) 일시·장소 · 처음으로 · 도움말 */
export function AsvTopBar({ program, flow, step, onHome, onHelp }: { program: ProgramDef; flow: boolean; step: 1 | 2 | 3; onHome: () => void; onHelp: () => void }) {
  return (
    <header className="asv-top">
      <div className="asv-top-left">
        <AsvLogo />
        <span className="asv-mono asv-top-sub">AI Photo Zone</span>
      </div>
      {flow ? (
        <ol className="asv-steps" aria-label={`${step} / 3 단계`}>
          {program.steps.map((label, i) => (
            <li key={label} data-state={i + 1 < step ? 'done' : i + 1 === step ? 'active' : 'todo'}>
              <i>{pad2(i + 1)}</i><span>{label}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="asv-mono asv-top-meta">{ASV_FESTIVAL.dates}<span> · </span>{ASV_FESTIVAL.venue}</p>
      )}
      <div className="asv-top-right">
        <button type="button" className="asv-top-btn" onClick={onHome} aria-label="처음으로"><Home size={20} /><span>처음으로</span></button>
        <button type="button" className="asv-top-btn" onClick={onHelp} aria-label="도움말"><CircleHelp size={20} /><span>도움말</span></button>
      </div>
    </header>
  )
}

/** 시작 화면 — 왼쪽: 축제 로봇 위 거대 워드마크 · 예시 사진(도면 액자) / 오른쪽: 사양서 패널 */
export function AsvStart({ program, onStart }: { program: ProgramDef; onStart: () => void }) {
  const years = [STRIP_NOW_YEAR, ...STRIP_STEPS.map((s) => s.year)]
  return (
    <div className="asv-start">
      <section className="asv-hero" aria-label={program.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="asv-hero-robot" src="/assets/booth-programs/asv/robot.webp" alt="" aria-hidden="true" />
        <div className="asv-hero-hud asv-mono" aria-hidden="true">
          <span>Time Capsule</span>
          <span className="asv-hero-years">{years.map((y, i) => <b key={y} data-now={i === 0 || undefined}>{y}</b>)}</span>
        </div>
        <span className="asv-hero-dim" aria-hidden="true"><span className="asv-dim"><i>Ansan Science Valley · 2026</i></span></span>
        <h1 className="asv-hero-mark">
          <span className="asv-disp">Later</span>
          <span className="asv-hero-ko">미래로 가는 타임캡슐</span>
        </h1>
        <figure className="asv-sample">
          <div className="asv-sample-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={program.intro} alt={`${program.name} 예시`} />
            <RegMarks />
          </div>
          <figcaption className="asv-mono"><span>Sample</span><span>2 × 6 in</span></figcaption>
        </figure>
      </section>
      <section className="asv-sheet">
        <div className="asv-rule"><span className="asv-index">01</span><i /><span className="asv-label">AI Photo Zone</span></div>
        <h2 className="asv-sheet-title">{program.headline.split('\n').map((l, i) => <span key={i}>{l}</span>)}</h2>
        <p className="asv-sheet-lead">{program.lead}</p>
        <ol className="asv-spec">
          {program.steps.map((s, i) => (
            <li key={s}>
              <i className="asv-mono">{pad2(i + 1)}</i>
              <span>{s}</span>
              <small className="asv-mono">{['5 sec', '≈ 30 sec', '2 × 6 print'][i]}</small>
            </li>
          ))}
        </ol>
        <p className="asv-sheet-people asv-mono"><b>1–4</b> Persons<span>·</span>아기는 안고 찍어도 돼요</p>
        {program.creative && <AsvNote>{program.creative}</AsvNote>}
        <button type="button" className="asv-btn asv-btn--hero" onClick={onStart}><span>{program.startCta}</span><span className="asv-btn-arrow" aria-hidden="true">→</span></button>
      </section>
    </div>
  )
}
