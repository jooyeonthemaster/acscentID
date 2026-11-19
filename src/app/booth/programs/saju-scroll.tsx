'use client'
/* eslint-disable @next/next/no-img-element -- 방금 만든 인화 원판(data: · blob:)을 그대로 보여 준다 */

// SAJU! 영상판 결과 — 받침대 종이 대신 위에서 쫙 펼쳐지는 족자 한 폭이 결과 창이 된다(2026-11-18 사용자 지시:
//   하율의 손이 결과물을 가리지 않게 · 밤하늘 디자인 하나만(밤하늘 / 한지 고르기 없앰) · 결과물을 크게 · 족자가 팝업처럼).
//   하율이 받침대를 가리키는 결과 장면에 도착하면(ProgramApp data-arrived) 위 축이 내려오고 → 비단이 위에서 아래로 펼쳐지며 아래 축이 따라 내려가고 → 글 · 카드 · 버튼이 떠오른다.
//   족자는 화면 오른쪽에 걸려 받침대를 덮는다 — 영상 위 UI 라 하율의 손이 카드 위로 오지 않는다. 모양 · 시간은 saju-scroll.css.
//   작은 설명 글(윗줄 · 창작 안내)은 영상판 규칙대로 넣지 않는다(2026-11-18 사용자 지시: 작게 쓰인 설명은 다 뺀다) — 필요하면 eyebrow · note 로.
import type { ReactNode } from 'react'
import { Home } from 'lucide-react'
import './saju-scroll.css'

export function SajuScroll({ card, eyebrow, keyword, title, note, onHome, onPrint }: {
  /** 인화될 사주 카드(밤하늘, 1800×1200) */
  card: string
  eyebrow?: ReactNode
  /** 덕담 키워드(큰 붓글씨) · 그 아래 한 줄 */
  keyword: string
  title: string
  /** 창작 안내(작은 글씨) */
  note?: string
  /** 처음 화면으로(다음 손님) — 흐름 안 「처음부터 다시」는 생년월일 단계로 돌아가 앞 손님 날짜가 남았다(2026-11-18 사용자 지적) */
  onHome: () => void
  onPrint: () => void
}) {
  return (
    <div className="ss" role="dialog" aria-label={`2027 정미년 사주 카드 — ${keyword}`}>
      <div className="ss-scroll">
        <i className="ss-rod ss-rod--top" aria-hidden="true" />
        <div className="ss-silk">
          <div className="ss-paper">
            <header className="ss-head">
              {eyebrow && <p className="ss-eyebrow">{eyebrow}</p>}
              <h2>{keyword}</h2>
              <p className="ss-title">{title}</p>
            </header>
            <div className="ss-card"><img src={card} alt="인화될 2027 정미년 사주 카드" width={1800} height={1200} /></div>
            {note && <p className="ss-note" role="note">{note}</p>}
            <div className="ss-actions">
              <button type="button" className="pg-btn pg-btn--line" onClick={onHome}><Home size={20} />처음으로</button>
              <button type="button" className="pg-btn pg-btn--accent" onClick={onPrint}>저장하고 인쇄하기<span aria-hidden="true">→</span></button>
            </div>
          </div>
        </div>
        {/* 아래 축 — 비단 높이만큼 위에서 출발해 펼쳐지는 끝을 따라 내려온다 */}
        <div className="ss-track" aria-hidden="true"><i className="ss-rod ss-rod--bottom" /></div>
      </div>
    </div>
  )
}
