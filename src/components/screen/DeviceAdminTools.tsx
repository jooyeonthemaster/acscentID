'use client'

// 기기 관리자 창(우측 하단 → PIN)에서 여는 관리 도구 — 기존·레트로·맥 모든 화면이 같이 쓴다.
// - 이벤트 배경: 이 매장의 진행 중·다가오는 행사 배경 확인, 지금 바로 적용/해제, 기간 중 자동 적용, 글꼴, 배경 만들기
// - 포토카드 QR(포토부스): 카드 QR 크게 보기(스캔 시험), 켜기·끄기
// 관리자 창은 좁아서 버튼 두 개만 두고, 누르면 화면 전체를 덮는 창으로 연다. 등록·삭제처럼 큰 일은 관리자 웹에서.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import type { ScreenTarget } from '@/lib/screen-backgrounds/types'
import { findScreenFont, screenFontFamily } from '@/lib/screen-fonts/catalog'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import { ScreenFontPicker } from '@/lib/screen-fonts/FontPicker'
import { cardUrl } from '@/lib/photobooth/card-code'
import { isEventLive, isForced, type ScreenEvent } from '@/lib/screen-events/types'
import './device-admin-tools.css'

type View = 'events' | 'cards'

interface DeviceCard {
  id: string
  code: string
  title: string
  image_url: string
  is_active: boolean
  source_credit: string | null
  photobooth_events: { title: string } | null
}

class ReloginError extends Error {}

async function call<T>(path: string, method = 'GET', body?: unknown, timeoutMs = 15000): Promise<T> {
  const response = await fetch(path, {
    method, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const result = await response.json().catch(() => null)
  if (response.status === 403 && result?.relogin) throw new ReloginError('비밀번호 확인 시간(10분)이 지났습니다. 관리자 창을 닫고 다시 열어 주세요.')
  if (!response.ok) throw new Error(result?.error || '서버에 연결하지 못했습니다.')
  return result as T
}

const dateLabel = (e: ScreenEvent) => {
  const f = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`
  return e.starts_on === e.ends_on ? f(e.starts_on) : `${f(e.starts_on)}~${f(e.ends_on)}`
}

// ---------------- 이벤트 배경 ----------------
function EventsView({ target, onApplied, onZoom }: { target: ScreenTarget; onApplied: () => void; onZoom: (src: string, label: string, portrait: boolean) => void }) {
  const [events, setEvents] = useState<ScreenEvent[] | null>(null)
  const [today, setToday] = useState('')
  const [generator, setGenerator] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await call<{ events: ScreenEvent[]; today: string; generator: boolean }>('/api/screen-backgrounds/events')
      setEvents(data.events); setToday(data.today); setGenerator(data.generator); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '불러오지 못했습니다.'); setEvents(prev => prev ?? []) }
  }, [])
  useEffect(() => { void load() }, [load])

  const run = async (event: ScreenEvent, label: string, action: () => Promise<{ event: ScreenEvent }>, applied = false) => {
    setBusy(event.id); setError(''); setNotice('')
    try {
      const { event: next } = await action()
      setEvents(prev => prev?.map(e => e.id === next.id ? next : e) ?? prev)
      setNotice(label)
      if (applied) onApplied()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.') } finally { setBusy(null) }
  }
  const patch = (event: ScreenEvent, body: Record<string, unknown>, label: string, applied = false) =>
    run(event, label, () => call('/api/screen-backgrounds/events', 'PATCH', { id: event.id, ...body }), applied)

  const forcedNow = events?.find(e => isForced(e, today) && e.backgrounds[target])
  const fonts = useMemo(() => (events ?? []).flatMap(e => [e.font, ...e.font_suggestions.map(s => s.id)]), [events])

  if (!events) return <p className="dat-empty">불러오는 중…</p>
  return (
    <div className="dat-body">
      <ScreenFontFace ids={fonts} />
      <p className="dat-lead">
        이 매장의 진행 중·다가오는 행사입니다. <b>지금 바로 적용</b>은 날짜와 상관없이 바로 바뀌고(해제하거나 행사가 끝나면 평소 배경으로),
        <b> 기간 중 자동 적용</b>은 행사 기간에만 적용됩니다. 같은 종류의 기기에 모두 적용됩니다.
      </p>
      {error && <p className="dat-error" role="alert">{error}</p>}
      {notice && <p className="dat-notice" role="status">{notice}</p>}
      {!events.length && <p className="dat-empty">다가오는 행사가 없습니다. 행사는 관리자 웹에서 ERP·노션으로 불러옵니다.</p>}
      <ul className="dat-events">
        {events.map(event => {
          const bg = event.backgrounds[target]
          const live = isEventLive(event, today)
          const forced = isForced(event, today)
          const applying = forced || (event.approved && live && !forcedNow)
          const working = busy === event.id
          return (
            <li key={event.id} className="dat-event" data-applying={applying || undefined}>
              <div className="dat-thumbs">
                <button type="button" className="dat-thumb" data-portrait={target === 'kiosk' || undefined} disabled={!bg}
                  onClick={() => bg && onZoom(bg.image_url, `${event.title} · ${target === 'kiosk' ? '키오스크' : '포토부스'} 배경`, target === 'kiosk')}
                  aria-label={bg ? '배경 크게 보기' : '배경 없음'}>
                  {bg
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={bg.thumbnail_url || bg.image_url} alt="" loading="lazy" />
                    : <span>배경 없음</span>}
                </button>
                {event.poster && (
                  <button type="button" className="dat-thumb dat-thumb--poster" onClick={() => onZoom(event.poster!, `${event.title} · 포스터`, true)} aria-label="포스터 크게 보기">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.poster} alt="" loading="lazy" />
                  </button>
                )}
              </div>
              <div className="dat-info">
                {/* 부스(가로)는 제목·상태를 한 줄에, 키오스크(세로)는 위아래로 */}
                <div className="dat-event-head">
                  <p className="dat-title"><span className="dat-date">{dateLabel(event)}</span>{event.title}</p>
                  <p className="dat-status">
                    {live && <span className="dat-live">진행 중</span>}
                    {forced ? <b className="dat-pill dat-pill--on">지금 바로 적용 중</b>
                      : applying ? <b className="dat-pill dat-pill--on">기간 중 적용 중</b>
                        : event.approved ? <span className="dat-pill">기간 중 자동 적용 예약</span>
                          : bg ? <span className="dat-pill dat-pill--warn">자동 적용 꺼짐</span> : <span className="dat-pill">배경 없음</span>}
                  </p>
                </div>
                {bg && (
                  <div className="dat-fonts">
                    {event.font_suggestions.map(s => (
                      <button key={s.id} type="button" disabled={working} aria-pressed={event.font === s.id}
                        onClick={() => void patch(event, { font: s.id }, `${event.title} 글꼴을 ‘${findScreenFont(s.id)?.label}’(으)로 바꿨습니다.`, applying)}
                        style={{ fontFamily: screenFontFamily(s.id) }} title={s.reason}>{findScreenFont(s.id)?.label}</button>
                    ))}
                    <div className="dat-font-picker">
                      <ScreenFontPicker value={event.font} disabled={working} defaultLabel="기기 평소 글꼴"
                        onChange={font => void patch(event, { font }, `${event.title} 글꼴을 바꿨습니다.`, applying)} />
                    </div>
                  </div>
                )}
                <div className="dat-actions">
                  {forced
                    ? <button type="button" className="dat-btn" disabled={working} onClick={() => void patch(event, { force: false }, `${event.title} 수동 적용을 해제했습니다.`, true)}>적용 해제</button>
                    : <button type="button" className="dat-btn dat-btn--primary" disabled={working || !bg} onClick={() => void patch(event, { force: true }, `${event.title} 배경을 지금 바로 적용했습니다.`, true)}>지금 바로 적용</button>}
                  <button type="button" className={`dat-btn ${event.approved ? 'dat-btn--on' : ''}`} disabled={working || !bg} aria-pressed={event.approved}
                    onClick={() => void patch(event, { approved: !event.approved }, event.approved ? `${event.title} 기간 중 자동 적용을 껐습니다.` : `${event.title} 기간(${dateLabel(event)}) 중 자동 적용을 켰습니다.`, live)}>
                    {event.approved ? '자동 적용 켜짐' : '기간 중 자동 적용'}
                  </button>
                  {event.poster && generator && (
                    <button type="button" className="dat-btn" disabled={working}
                      onClick={() => { if (window.confirm(`${event.title} 배경을 ${bg ? '다시 ' : ''}만들까요?\n30초~1분 걸리고 약 400원이 듭니다.`)) void run(event, `${event.title} 배경을 만들었습니다. 확인하고 적용해 주세요.`, () => call(`/api/screen-backgrounds/events/generate`, 'POST', { id: event.id }, 200_000), applying) }}>
                      {working ? '처리 중…' : bg ? '배경 다시 만들기' : '배경 만들기'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------- 포토카드 QR ----------------
function CardsView({ onZoom }: { onZoom: (src: string, label: string, portrait: boolean, qr?: string) => void }) {
  const [cards, setCards] = useState<DeviceCard[] | null>(null)
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    call<{ cards: DeviceCard[] }>('/api/screen-backgrounds/cards')
      .then(data => { if (alive) setCards(data.cards) })
      .catch(cause => { if (alive) { setError(cause instanceof Error ? cause.message : '불러오지 못했습니다.'); setCards([]) } })
    return () => { alive = false }
  }, [])

  const toggle = async (card: DeviceCard) => {
    setBusy(card.id); setError('')
    try {
      await call('/api/screen-backgrounds/cards', 'PATCH', { id: card.id, is_active: !card.is_active })
      setCards(prev => prev?.map(c => c.id === card.id ? { ...c, is_active: !c.is_active } : c) ?? prev)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.') } finally { setBusy(null) }
  }
  const showQr = async (card: DeviceCard) => {
    const qr = await QRCode.toDataURL(cardUrl(window.location.origin, card.code), { width: 720, margin: 2 })
    onZoom(card.image_url, `${card.title} · ${card.code}`, true, qr)
  }

  if (!cards) return <p className="dat-empty">불러오는 중…</p>
  const shown = cards.filter(c => filter === 'all' || (filter === 'on' ? c.is_active : !c.is_active))
  return (
    <div className="dat-body">
      <p className="dat-lead">포토카드 뒷면 QR을 크게 띄워 부스 카메라로 인식되는지 시험하고, 판매가 끝난 카드는 꺼 둘 수 있습니다(꺼진 카드의 QR은 인식하지 않습니다). 카드 등록·삭제는 관리자 웹에서 합니다.</p>
      {error && <p className="dat-error" role="alert">{error}</p>}
      <div className="dat-filter" role="group" aria-label="카드 거르기">
        {([['all', `전체 ${cards.length}`], ['on', `켜짐 ${cards.filter(c => c.is_active).length}`], ['off', `꺼짐 ${cards.filter(c => !c.is_active).length}`]] as const).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {!shown.length && <p className="dat-empty">표시할 카드가 없습니다.</p>}
      <ul className="dat-cards">
        {shown.map(card => (
          <li key={card.id} className="dat-card" data-off={!card.is_active || undefined}>
            <button type="button" className="dat-card-img" onClick={() => void showQr(card)} aria-label={`${card.title} QR 크게 보기`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.image_url} alt="" loading="lazy" />
            </button>
            <p className="dat-card-title">{card.title}</p>
            <p className="dat-card-code">{card.code}{card.photobooth_events?.title ? ` · ${card.photobooth_events.title}` : ''}</p>
            <div className="dat-card-actions">
              <button type="button" className="dat-btn dat-btn--primary" onClick={() => void showQr(card)}>QR 보기</button>
              <button type="button" className={`dat-btn ${card.is_active ? 'dat-btn--on' : ''}`} disabled={busy === card.id} aria-pressed={card.is_active} onClick={() => void toggle(card)}>
                {card.is_active ? '켜짐' : '꺼짐'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------- 크게 보기 ----------------
function Zoom({ src, label, portrait, qr, onClose }: { src: string; label: string; portrait: boolean; qr?: string; onClose: () => void }) {
  return (
    <div className="dat-zoom" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className="dat-zoom-head" onClick={e => e.stopPropagation()}>
        <b>{label}</b>
        <button type="button" className="dat-btn" onClick={onClose}>닫기</button>
      </div>
      <div className="dat-zoom-body" data-qr={qr ? true : undefined} data-portrait={portrait || undefined} onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} />
        {qr && (
          <figure className="dat-zoom-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="카드 QR" />
            <figcaption>이 QR을 부스 카메라에 비춰 인식되는지 확인하세요</figcaption>
          </figure>
        )}
      </div>
    </div>
  )
}

export function DeviceAdminTools({ target, onApplied, liveTitle }: {
  target: ScreenTarget
  /** 적용이 바뀌었을 때 — 기기 배경을 바로 다시 불러오게(useScreenBackgrounds().refresh) */
  onApplied?: () => void
  /** 지금 적용 중인 이벤트 이름(useScreenBackgrounds().liveEvent) */
  liveTitle?: string | null
}) {
  const [view, setView] = useState<View | null>(null)
  const [zoom, setZoom] = useState<{ src: string; label: string; portrait: boolean; qr?: string } | null>(null)
  useEffect(() => {
    if (!view) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (zoom) setZoom(null); else setView(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, zoom])
  const applied = useCallback(() => onApplied?.(), [onApplied])

  return (
    <>
      <div className="dat-launch" data-target={target}>
        <button type="button" onClick={() => setView('events')}>
          <b>이벤트 배경</b>
          <span>{liveTitle ? `지금: ${liveTitle}` : '행사 배경 확인·적용'}</span>
        </button>
        {target === 'booth' && (
          <button type="button" onClick={() => setView('cards')}>
            <b>포토카드 QR</b>
            <span>QR 확인·켜기/끄기</span>
          </button>
        )}
      </div>
      {view && typeof document !== 'undefined' && createPortal(
        <div className="dat-overlay" data-target={target} role="dialog" aria-modal="true" aria-label={view === 'events' ? '이벤트 배경' : '포토카드 QR'}>
          <div className="dat-panel">
            <header className="dat-head">
              <div className="dat-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={view === 'events'} onClick={() => setView('events')}>이벤트 배경</button>
                {target === 'booth' && <button type="button" role="tab" aria-selected={view === 'cards'} onClick={() => setView('cards')}>포토카드 QR</button>}
              </div>
              <button type="button" className="dat-btn" onClick={() => setView(null)}>닫기</button>
            </header>
            {view === 'events'
              ? <EventsView target={target} onApplied={applied} onZoom={(src, label, portrait) => setZoom({ src, label, portrait })} />
              : <CardsView onZoom={(src, label, portrait, qr) => setZoom({ src, label, portrait, qr })} />}
          </div>
          {zoom && <Zoom {...zoom} onClose={() => setZoom(null)} />}
        </div>,
        document.body,
      )}
    </>
  )
}
