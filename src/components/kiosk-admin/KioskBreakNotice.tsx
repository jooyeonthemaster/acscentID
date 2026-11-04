'use client'

import { useId } from 'react'
import { Clock3, Coffee, DoorClosed, LockKeyhole } from 'lucide-react'
import { CLOSED_NOTICE, DEFAULT_BREAK_NOTICE, type KioskBreakNotice } from '@/lib/kiosk/break-notice'
import { useFocusTrap } from './admin-ui'
import './kiosk-break-notice.css'

export function BreakNoticeCard({ notice, preview = false, titleId, messageId }: {
  notice: KioskBreakNotice
  preview?: boolean
  titleId?: string
  messageId?: string
}) {
  const Title = preview ? 'h3' : 'h1'
  const closed = notice.kind === 'closed'
  const fallback = closed ? CLOSED_NOTICE : DEFAULT_BREAK_NOTICE
  const Icon = closed ? DoorClosed : Coffee
  return (
    <div className="kbreak-card" data-preview={preview || undefined}>
      <p className="kbreak-eyebrow">{closed ? '이용해 주셔서 감사합니다' : '잠시 쉬어가는 시간'}</p>
      <div className="kbreak-icon" aria-hidden="true"><Icon size={76} strokeWidth={1.3} /></div>
      <Title id={titleId} className="kbreak-title">{notice.title || fallback.title}</Title>
      <p id={messageId} className="kbreak-message">{notice.message || fallback.message}</p>
      {!closed && notice.resumeTime && (
        <p className="kbreak-resume">
          <Clock3 size={22} strokeWidth={1.7} aria-hidden="true" />
          <span><time>{notice.resumeTime}</time> 재개 예정</span>
        </p>
      )}
      <div className="kbreak-card-end" aria-hidden="true"><i /><i /><i /></div>
    </div>
  )
}

export function KioskBreakNoticeView({ notice, onAdmin }: { notice: KioskBreakNotice; onAdmin: () => void }) {
  const id = useId()
  const { ref, onKeyDown } = useFocusTrap<HTMLDivElement>(notice.active)
  if (!notice.active) return null

  return (
    <div
      ref={ref}
      className="kbreak-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      tabIndex={-1}
      onKeyDown={(event) => {
        onKeyDown(event)
        if (event.key === 'Escape') event.preventDefault()
        event.stopPropagation()
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="kbreak-screen-head">
        <span className="kbreak-screen-label">운영 안내</span>
        <button type="button" className="kbreak-admin" onClick={onAdmin}>
          <LockKeyhole size={17} strokeWidth={1.8} aria-hidden="true" />관리자
        </button>
      </header>
      <main className="kbreak-screen-body">
        <BreakNoticeCard notice={notice} titleId={`${id}-title`} messageId={`${id}-message`} />
      </main>
    </div>
  )
}
