'use client'

// 기기 관리자 창(우측 하단 → PIN)에서 여는 관리 도구 — 기존·레트로·맥 모든 화면이 같이 쓴다.
// - 이벤트 배경: 이 매장의 진행 중·다가오는 행사 배경 확인, 지금 바로 적용/해제, 기간 중 자동 적용, 글꼴, 배경 만들기
// - 프레임(포토부스): 켜기·끄기, 행사에 묶기(묶인 프레임은 그 행사가 적용 중일 때만 부스에 보인다)
// - 포토카드 QR(포토부스): 카드 QR 크게 보기(스캔 시험), 켜기·끄기, 행사에 묶기
// 프레임·포토카드는 행사별로 거를 수 있고, 이벤트 배경의 행사 줄에서 그 행사의 프레임·카드로 바로 간다.
// 관리자 창은 좁아서 버튼만 두고, 누르면 화면 전체를 덮는 창으로 연다. 등록·삭제처럼 큰 일은 관리자 웹에서.

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

type View = 'events' | 'frames' | 'cards'
/** 행사 거르기 — 'all' 전체, 'none' 상시(행사 없음), 그 밖엔 행사 id */
type EventFilter = 'all' | 'none' | string

interface DeviceCard {
  id: string
  code: string
  title: string
  image_url: string
  is_active: boolean
  source_credit: string | null
  screen_event_id: string | null
  photobooth_events: { title: string } | null
}

interface DeviceFrame {
  id: string
  title: string
  thumbnail_url: string
  is_active: boolean
  category: string
  screen_event_id: string | null
}

/** 서버 event-scope.ts 의 EventOption — 이 매장의 진행 중 → 다가오는 → 지난 행사 */
interface EventOption {
  id: string
  title: string
  starts_on: string
  ends_on: string
  live: boolean
  past: boolean
}

const VIEW_LABELS: Record<View, string> = { events: '이벤트 배경', frames: '프레임', cards: '포토카드 QR' }

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

const optionDate = (o: Pick<EventOption, 'starts_on' | 'ends_on'>) => dateLabel(o as ScreenEvent)

// ---------------- 행사 거르기·고르기 (프레임·포토카드 공용) ----------------
function EventChips({ options, items, value, onChange }: {
  options: EventOption[]
  items: { screen_event_id: string | null }[]
  value: EventFilter
  onChange: (value: EventFilter) => void
}) {
  const count = (id: string | null) => items.filter(i => (i.screen_event_id ?? null) === id).length
  // 지난 행사는 묶인 게 있을 때만 — 칩이 끝없이 늘지 않게
  const shown = options.filter(o => !o.past || count(o.id) > 0 || value === o.id)
  const orphan = items.some(i => i.screen_event_id && !options.some(o => o.id === i.screen_event_id))
  return (
    <div className="dat-filter dat-filter--events" role="group" aria-label="행사로 거르기">
      <button type="button" aria-pressed={value === 'all'} onClick={() => onChange('all')}>전체 {items.length}</button>
      <button type="button" aria-pressed={value === 'none'} onClick={() => onChange('none')}>상시 {count(null)}</button>
      {shown.map(o => (
        <button key={o.id} type="button" aria-pressed={value === o.id} data-live={o.live || undefined} data-past={o.past || undefined} onClick={() => onChange(o.id)}>
          <span className="dat-chip-date">{optionDate(o)}</span>{o.title} {count(o.id)}
        </button>
      ))}
      {orphan && <button type="button" aria-pressed={value === 'orphan'} onClick={() => onChange('orphan')}>지워진 행사</button>}
    </div>
  )
}

function matchesEvent(item: { screen_event_id: string | null }, filter: EventFilter, options: EventOption[]) {
  if (filter === 'all') return true
  if (filter === 'none') return !item.screen_event_id
  if (filter === 'orphan') return !!item.screen_event_id && !options.some(o => o.id === item.screen_event_id)
  return item.screen_event_id === filter
}

function EventSelect({ value, options, disabled, onChange }: { value: string | null; options: EventOption[]; disabled?: boolean; onChange: (id: string | null) => void }) {
  const known = !value || options.some(o => o.id === value)
  return (
    <select className="dat-event-select" aria-label="행사" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value || null)}>
      <option value="">상시 (행사 없음)</option>
      {!known && <option value={value!}>지워진 행사</option>}
      {options.map(o => (
        <option key={o.id} value={o.id}>{optionDate(o)} {o.title}{o.live ? ' · 진행 중' : o.past ? ' · 지난 행사' : ''}</option>
      ))}
    </select>
  )
}

// ---------------- 이벤트 배경 ----------------
function EventsView({ target, onApplied, onZoom, onOpen }: {
  target: ScreenTarget
  onApplied: () => void
  onZoom: (src: string, label: string, portrait: boolean) => void
  /** 행사 줄의 '프레임 N'·'포토카드 N' — 그 행사로 거른 탭을 연다(포토부스) */
  onOpen?: (view: 'frames' | 'cards', eventId: string) => void
}) {
  const [events, setEvents] = useState<ScreenEvent[] | null>(null)
  const [counts, setCounts] = useState<Record<string, { frames: number; cards: number }>>({})
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
  // 포토부스: 행사마다 묶인 프레임·카드 수 (못 읽으면 숫자만 안 보인다)
  useEffect(() => {
    if (target !== 'booth') return
    let alive = true
    void Promise.all([
      call<{ frames: DeviceFrame[] }>('/api/screen-backgrounds/frames').catch(() => null),
      call<{ cards: DeviceCard[] }>('/api/screen-backgrounds/cards').catch(() => null),
    ]).then(([frames, cards]) => {
      if (!alive) return
      const next: Record<string, { frames: number; cards: number }> = {}
      for (const f of frames?.frames ?? []) if (f.screen_event_id) (next[f.screen_event_id] ??= { frames: 0, cards: 0 }).frames++
      for (const c of cards?.cards ?? []) if (c.screen_event_id) (next[c.screen_event_id] ??= { frames: 0, cards: 0 }).cards++
      setCounts(next)
    })
    return () => { alive = false }
  }, [target])

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
                {event.poster ? (
                  <button type="button" className="dat-thumb dat-thumb--poster" onClick={() => onZoom(event.poster!, `${event.title} · 포스터`, true)} aria-label="포스터 크게 보기">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.poster} alt="" loading="lazy" />
                  </button>
                ) : target === 'kiosk' && (
                  // 키오스크 카드는 배경·포스터 두 칸을 늘 같은 크기로 — 포스터가 없어도 칸을 비워 둔다
                  <div className="dat-thumb dat-thumb--poster" aria-hidden="true"><span>포스터 없음</span></div>
                )}
              </div>
              <div className="dat-info">
                {/* 부스(가로)는 제목·상태를 한 줄에, 키오스크(세로)는 위아래로 */}
                <div className="dat-event-head">
                  <p className="dat-title"><span className="dat-date">{dateLabel(event)}</span>{event.title}</p>
                  <p className="dat-status">
                    {onOpen && (
                      <>
                        <button type="button" className="dat-link" onClick={() => onOpen('frames', event.id)}>프레임 {counts[event.id]?.frames ?? 0}</button>
                        <button type="button" className="dat-link" onClick={() => onOpen('cards', event.id)}>포토카드 {counts[event.id]?.cards ?? 0}</button>
                      </>
                    )}
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
                  {/* 포토부스: 포스터로 AI 프레임 1장 — 이 행사에 묶여 행사 중 부스 맨 앞에 나온다 */}
                  {onOpen && event.poster && generator && (
                    <button type="button" className="dat-btn" disabled={working}
                      onClick={() => {
                        if (!window.confirm(`${event.title} 프레임을 AI로 만들까요?\n30초~1분 걸리고 약 200원이 듭니다. 만든 프레임은 이 행사에 묶여 행사 중에만 부스에 나옵니다.`)) return
                        void run(event, `${event.title} 프레임을 만들었습니다. '프레임 N'을 눌러 확인하세요.`, async () => {
                          const result = await call<{ event: ScreenEvent }>('/api/screen-backgrounds/events/frame', 'POST', { id: event.id }, 200_000)
                          setCounts(prev => ({ ...prev, [event.id]: { frames: (prev[event.id]?.frames ?? 0) + 1, cards: prev[event.id]?.cards ?? 0 } }))
                          return result
                        })
                      }}>
                      {working ? '처리 중…' : '프레임 만들기'}
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

// ---------------- 프레임 ----------------
function FramesView({ initialEvent, onZoom }: { initialEvent: EventFilter; onZoom: (src: string, label: string, portrait: boolean) => void }) {
  const [frames, setFrames] = useState<DeviceFrame[] | null>(null)
  const [options, setOptions] = useState<EventOption[]>([])
  const [filter, setFilter] = useState<EventFilter>(initialEvent)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    call<{ frames: DeviceFrame[]; screen_events: EventOption[] }>('/api/screen-backgrounds/frames')
      .then(data => { if (alive) { setFrames(data.frames); setOptions(data.screen_events ?? []) } })
      .catch(cause => { if (alive) { setError(cause instanceof Error ? cause.message : '불러오지 못했습니다.'); setFrames([]) } })
    return () => { alive = false }
  }, [])

  const save = async (frame: DeviceFrame, patch: Partial<Pick<DeviceFrame, 'is_active' | 'screen_event_id'>>) => {
    setBusy(frame.id); setError('')
    try {
      await call('/api/screen-backgrounds/frames', 'PATCH', { id: frame.id, ...patch })
      setFrames(prev => prev?.map(f => f.id === frame.id ? { ...f, ...patch } : f) ?? prev)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.') } finally { setBusy(null) }
  }

  if (!frames) return <p className="dat-empty">불러오는 중…</p>
  const shown = frames.filter(f => matchesEvent(f, filter, options))
  return (
    <div className="dat-body">
      {error && <p className="dat-error" role="alert">{error}</p>}
      <EventChips options={options} items={frames} value={filter} onChange={setFilter} />
      {!shown.length && <p className="dat-empty">이 행사에 묶인 프레임이 없습니다. 전체에서 프레임의 행사를 골라 묶어 주세요.</p>}
      <ul className="dat-frames">
        {shown.map(frame => (
          <li key={frame.id} className="dat-frame" data-off={!frame.is_active || undefined}>
            <button type="button" className="dat-frame-img" onClick={() => onZoom(frame.thumbnail_url, frame.title, true)} aria-label={`${frame.title} 크게 보기`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frame.thumbnail_url} alt="" loading="lazy" />
            </button>
            <p className="dat-card-title">{frame.title}</p>
            <EventSelect value={frame.screen_event_id} options={options} disabled={busy === frame.id}
              onChange={id => void save(frame, { screen_event_id: id })} />
            <button type="button" className={`dat-btn ${frame.is_active ? 'dat-btn--on' : ''}`} disabled={busy === frame.id} aria-pressed={frame.is_active}
              onClick={() => void save(frame, { is_active: !frame.is_active })}>
              {frame.is_active ? '켜짐' : '꺼짐'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------- 포토카드 QR ----------------
function CardsView({ initialEvent, onZoom }: { initialEvent: EventFilter; onZoom: (src: string, label: string, portrait: boolean, qr?: string) => void }) {
  const [cards, setCards] = useState<DeviceCard[] | null>(null)
  const [options, setOptions] = useState<EventOption[]>([])
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all')
  const [eventFilter, setEventFilter] = useState<EventFilter>(initialEvent)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    call<{ cards: DeviceCard[]; screen_events: EventOption[] }>('/api/screen-backgrounds/cards')
      .then(data => { if (alive) { setCards(data.cards); setOptions(data.screen_events ?? []) } })
      .catch(cause => { if (alive) { setError(cause instanceof Error ? cause.message : '불러오지 못했습니다.'); setCards([]) } })
    return () => { alive = false }
  }, [])

  const save = async (card: DeviceCard, patch: Partial<Pick<DeviceCard, 'is_active' | 'screen_event_id'>>) => {
    setBusy(card.id); setError('')
    try {
      await call('/api/screen-backgrounds/cards', 'PATCH', { id: card.id, ...patch })
      setCards(prev => prev?.map(c => c.id === card.id ? { ...c, ...patch } : c) ?? prev)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.') } finally { setBusy(null) }
  }
  const showQr = async (card: DeviceCard) => {
    const qr = await QRCode.toDataURL(cardUrl(window.location.origin, card.code), { width: 720, margin: 2 })
    onZoom(card.image_url, `${card.title} · ${card.code}`, true, qr)
  }

  if (!cards) return <p className="dat-empty">불러오는 중…</p>
  const inEvent = cards.filter(c => matchesEvent(c, eventFilter, options))
  const shown = inEvent.filter(c => filter === 'all' || (filter === 'on' ? c.is_active : !c.is_active))
  const eventTitle = (id: string | null) => (id ? options.find(o => o.id === id)?.title ?? '지워진 행사' : null)
  return (
    <div className="dat-body">
      <p className="dat-lead">포토카드 뒷면 QR을 크게 띄워 부스 카메라로 인식되는지 시험하고, 판매가 끝난 카드는 꺼 둘 수 있습니다(꺼진 카드의 QR은 인식하지 않습니다). 카드 등록·삭제는 관리자 웹에서 합니다.</p>
      {error && <p className="dat-error" role="alert">{error}</p>}
      <EventChips options={options} items={cards} value={eventFilter} onChange={setEventFilter} />
      <div className="dat-filter" role="group" aria-label="카드 거르기">
        {([['all', `전체 ${inEvent.length}`], ['on', `켜짐 ${inEvent.filter(c => c.is_active).length}`], ['off', `꺼짐 ${inEvent.filter(c => !c.is_active).length}`]] as const).map(([key, label]) => (
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
            <p className="dat-card-code">{card.code}{(eventTitle(card.screen_event_id) ?? card.photobooth_events?.title) ? ` · ${eventTitle(card.screen_event_id) ?? card.photobooth_events?.title}` : ''}</p>
            <EventSelect value={card.screen_event_id} options={options} disabled={busy === card.id}
              onChange={id => void save(card, { screen_event_id: id })} />
            <div className="dat-card-actions">
              <button type="button" className="dat-btn dat-btn--primary" onClick={() => void showQr(card)}>QR 보기</button>
              <button type="button" className={`dat-btn ${card.is_active ? 'dat-btn--on' : ''}`} disabled={busy === card.id} aria-pressed={card.is_active} onClick={() => void save(card, { is_active: !card.is_active })}>
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
  // 이벤트 배경의 행사 줄에서 넘어올 때 그 행사로 거른 채 연다 — 탭을 바꿀 때마다 새로 그린다(key)
  const [startEvent, setStartEvent] = useState<{ filter: EventFilter; seq: number }>({ filter: 'all', seq: 0 })
  const open = useCallback((next: View, filter: EventFilter = 'all') => {
    setStartEvent(prev => ({ filter, seq: prev.seq + 1 }))
    setView(next)
  }, [])
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
        <button type="button" onClick={() => open('events')}>
          <b>이벤트 배경</b>
          <span>{liveTitle ? `지금: ${liveTitle}` : '행사 배경 확인·적용'}</span>
        </button>
        {target === 'booth' && (
          <>
            <button type="button" onClick={() => open('frames')}>
              <b>프레임</b>
              <span>행사별 켜기/끄기</span>
            </button>
            <button type="button" onClick={() => open('cards')}>
              <b>포토카드 QR</b>
              <span>QR 확인·켜기/끄기</span>
            </button>
          </>
        )}
      </div>
      {view && typeof document !== 'undefined' && createPortal(
        <div className="dat-overlay" data-target={target} role="dialog" aria-modal="true" aria-label={VIEW_LABELS[view]}>
          <div className="dat-panel">
            <header className="dat-head">
              <div className="dat-tabs" role="tablist">
                {(target === 'booth' ? (['events', 'frames', 'cards'] as const) : (['events'] as const)).map(key => (
                  <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => open(key)}>{VIEW_LABELS[key]}</button>
                ))}
              </div>
              <button type="button" className="dat-btn" onClick={() => setView(null)}>닫기</button>
            </header>
            {view === 'events' && (
              <EventsView target={target} onApplied={applied} onZoom={(src, label, portrait) => setZoom({ src, label, portrait })}
                onOpen={target === 'booth' ? (next, eventId) => open(next, eventId) : undefined} />
            )}
            {view === 'frames' && (
              <FramesView key={startEvent.seq} initialEvent={startEvent.filter} onZoom={(src, label, portrait) => setZoom({ src, label, portrait })} />
            )}
            {view === 'cards' && (
              <CardsView key={startEvent.seq} initialEvent={startEvent.filter} onZoom={(src, label, portrait, qr) => setZoom({ src, label, portrait, qr })} />
            )}
          </div>
          {zoom && <Zoom {...zoom} onClose={() => setZoom(null)} />}
        </div>,
        document.body,
      )}
    </>
  )
}
