import type { CSSProperties, ReactNode } from 'react'

// 같은 프로그램의 기본판 · 영상판 묶음(2026-11-25 사용자 지시: 흰 바탕만으로는 한 묶음인지 안 보인다 — 두 버전이 있다는 것을 분명히).
// 묶음 머리줄(번호 · 프로그램 표 · 이름 · 「2 VERSIONS」) · 위에 프로그램 색 띠 · 카드마다 「기본판」/「영상판」 표. 스타일은 demo-tabs.css(.demo-set)

/** 묶음 한 칸 — 그리드의 li. 카드는 children(차례대로 기본판 · 영상판…) */
export function DemoSet({ className, no, tag, name, tone, count, soon, children }: {
  className: string
  no: string
  tag: string
  name: string
  tone: string
  count: number
  /** 영상판이 아직 준비 중이면 머리줄에 그렇게 적는다 */
  soon: boolean
  children: ReactNode
}) {
  return (
    <li className={`${className} demo-set`} style={{ '--n': count, '--set-tone': tone } as CSSProperties} aria-label={`${name} — 기본판과 영상판`}>
      <div className="demo-set-head">
        <span className="demo-set-no">{no}</span>
        <b>{tag}</b>
        <span>{name}</span>
        <em>{count} versions{soon && <i> · 영상판 준비 중</i>}</em>
      </div>
      {children}
    </li>
  )
}

/** 카드 맨 위 버전 표 — 묶음 안 카드에만 */
export function DemoVersion({ video }: { video: boolean }) {
  return video
    ? <span className="demo-ver demo-ver--video"><small>VIDEO</small>영상판</span>
    : <span className="demo-ver"><small>BASIC</small>기본판</span>
}
