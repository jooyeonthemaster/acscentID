import type { ReactNode } from 'react'

// 데모 랜딩 구역 머리 — 네안데르 사이트(neander 저장소 components/services/detail/SectionHead.tsx)와 같은 짜임:
// 번호 라벨(01  AI READING) · 영어 큰 제목(줄 단위) · 한국어 제목(+ 개수) · 오른쪽 짧은 설명. 스타일은 demo-tabs.css(.dh-*)

/** 번호 붙은 작은 영어 라벨 */
export function DemoLabel({ no, children }: { no?: string; children: ReactNode }) {
  return <p className="dh-label">{no && <b>{no}</b>}<span>{children}</span></p>
}

/** 영어 큰 제목 — 읽는 사람에게는 한국어 제목이 제목이라 화면 읽기에서는 뺀다 */
export function DemoEn({ lines, size = 'h2' }: { lines: string[]; size?: 'h2' | 'giant' }) {
  return <p className={`dh-en dh-en--${size}`} aria-hidden="true">{lines.map((line) => <span key={line}>{line}</span>)}</p>
}

/** 구역 머리 한 벌 */
export function DemoHead({ no, label, en, ko, count, aside, id }: { no: string; label: string; en: string[]; ko: string; count?: number; aside?: ReactNode; id: string }) {
  return (
    <div className="dh">
      <div className="dh-main">
        <DemoLabel no={no}>{label}</DemoLabel>
        <DemoEn lines={en} />
        <h2 id={id} className="dh-ko">{ko}{count !== undefined && <small>{count}</small>}</h2>
      </div>
      {aside && <p className="dh-aside">{aside}</p>}
    </div>
  )
}

/** 두 자리 번호 */
export const no2 = (n: number) => String(n).padStart(2, '0')
