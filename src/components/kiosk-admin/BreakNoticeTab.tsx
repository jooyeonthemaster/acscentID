'use client'

import { useId, useState } from 'react'
import { Clock3, Coffee, Play, Utensils, Wrench } from 'lucide-react'
import { breakTimeAfter, DEFAULT_BREAK_NOTICE, saveBreakNotice, type KioskBreakNotice } from '@/lib/kiosk/break-notice'
import { Notice } from './admin-ui'
import { BreakNoticeCard } from './KioskBreakNotice'
import './kiosk-break-notice.css'

const PRESETS = [
  { label: '잠깐 휴식', Icon: Coffee, title: DEFAULT_BREAK_NOTICE.title, message: DEFAULT_BREAK_NOTICE.message },
  { label: '식사 시간', Icon: Utensils, title: '식사 시간 안내', message: '잠시 식사 시간으로 체험을 쉬어갑니다.\n조금 후에 다시 만나요.' },
  { label: '기기 점검', Icon: Wrench, title: '잠시 점검 중이에요', message: '더 나은 체험을 위해 기기를 점검하고 있어요.\n조금만 기다려 주세요.' },
]

export function BreakNoticeTab({ notice, onClose, canSave }: { notice: KioskBreakNotice; onClose: () => void; canSave?: () => boolean }) {
  const id = useId()
  const [title, setTitle] = useState(notice.title || DEFAULT_BREAK_NOTICE.title)
  const [message, setMessage] = useState(notice.message || DEFAULT_BREAK_NOTICE.message)
  const [resumeTime, setResumeTime] = useState(notice.resumeTime || '')
  const [error, setError] = useState('')
  const draft: KioskBreakNotice = {
    active: notice.active,
    title: title.trim() || DEFAULT_BREAK_NOTICE.title,
    message: message.trim() || DEFAULT_BREAK_NOTICE.message,
    resumeTime,
  }

  const save = (active: boolean) => {
    if (canSave && !canSave()) return
    if (!saveBreakNotice({ ...draft, active })) {
      setError('이 기기에 공지를 저장하지 못했어요. 다시 눌러 주세요.')
      return
    }
    onClose()
  }

  return (
    <div className="kbreak-editor">
      <div className="kbreak-editor-head">
        <h2 className="kadm-h1">브레이크타임 공지</h2>
        <span className="kadm-pill" data-tone={notice.active ? 'plan' : 'off'}>{notice.active ? '공지 표시 중' : '정상 운영 중'}</span>
      </div>
      <Notice compact>이 기기에만 적용돼요. 공지를 띄우면 손님 화면을 가리고 체험을 잠시 멈춰요.</Notice>

      {error && <Notice tone="error" compact>{error}</Notice>}
      <div className="kbreak-editor-actions">
        {notice.active && (
          <button type="button" className="kadm-btn kadm-btn--wide" onClick={() => save(false)}>
            <Play size={20} strokeWidth={1.8} aria-hidden="true" />운영 재개
          </button>
        )}
        <button type="button" className="kadm-btn kadm-btn--primary kadm-btn--wide" onClick={() => save(true)}>
          <Clock3 size={21} strokeWidth={1.8} aria-hidden="true" />{notice.active ? '공지 내용 적용' : '공지 띄우기'}
        </button>
      </div>

      <section className="kbreak-editor-section" aria-label="공지 문구 설정">
        <h3 className="kadm-h2">어떤 안내를 띄울까요?</h3>
        <div className="kbreak-presets" role="group" aria-label="기본 안내 문구">
          {PRESETS.map(({ label, Icon, title: presetTitle, message: presetMessage }) => (
            <button
              key={label}
              type="button"
              className="kadm-btn kadm-btn--small"
              aria-pressed={title === presetTitle && message === presetMessage}
              onClick={() => { setTitle(presetTitle); setMessage(presetMessage); setError('') }}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <label className="kbreak-field" htmlFor={`${id}-title`}>
          <span>제목<small>{title.length}/40</small></span>
          <input id={`${id}-title`} type="text" maxLength={40} value={title} onChange={(event) => { setTitle(event.target.value); setError('') }} />
        </label>
        <label className="kbreak-field" htmlFor={`${id}-message`}>
          <span>안내 문구<small>{message.length}/240</small></span>
          <textarea id={`${id}-message`} rows={3} maxLength={240} value={message} onChange={(event) => { setMessage(event.target.value); setError('') }} />
        </label>
      </section>

      <section className="kbreak-editor-section" aria-labelledby={`${id}-time-label`}>
        <label className="kbreak-field" htmlFor={`${id}-time`}>
          <span id={`${id}-time-label`}>재개 예정 시간<small>선택 · 한국 시간</small></span>
          <input id={`${id}-time`} type="time" value={resumeTime} onChange={(event) => { setResumeTime(event.target.value); setError('') }} aria-describedby={`${id}-time-hint`} />
        </label>
        <div className="kbreak-time-buttons" role="group" aria-label="재개 시간 바로 선택">
          {[10, 20, 30].map((minutes) => (
            <button key={minutes} type="button" className="kadm-btn kadm-btn--small" onClick={() => { setResumeTime(breakTimeAfter(minutes)); setError('') }}>{minutes}분 후</button>
          ))}
          <button type="button" className="kadm-btn kadm-btn--small" aria-pressed={!resumeTime} onClick={() => { setResumeTime(''); setError('') }}>표시 안 함</button>
        </div>
        <p id={`${id}-time-hint`} className="kadm-sub">예정 시간은 안내용이에요. ‘운영 재개’를 눌러 공지를 내려 주세요.</p>
      </section>

      <section className="kbreak-editor-section" aria-label="손님 화면 미리보기">
        <h3 className="kadm-h2">손님 화면 미리보기</h3>
        <div className="kbreak-preview"><BreakNoticeCard notice={draft} preview /></div>
      </section>

    </div>
  )
}
