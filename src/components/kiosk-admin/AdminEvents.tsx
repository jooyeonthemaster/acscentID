'use client'

// 관리자 창 '행사 배경' — 진행 중·다가오는 행사 목록 → 행사 상세(목업 11 · 12 · 13 · 16 · 17 · 14 · 18).
// 동작은 예전 이벤트 배경 도구(DeviceAdminTools)와 같다: 지금 바로 적용/해제(force), 기간 중 자동 적용(approved), 행사 글꼴(font),
// 배경 만들기(유료 — 비용·시간을 확인한 뒤). 모두 누르는 즉시 저장된다.
// 행사 설정(적용·글꼴)은 기기별 값이 아니라 행사 공통 값이라 포토부스에도 같이 반영된다.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Coins, ImageIcon, Info, Settings, Wand2, X, ZoomIn } from 'lucide-react'
import { findScreenFont, screenFontFamily } from '@/lib/screen-fonts/catalog'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import { isEventLive, isForced, type ScreenEvent } from '@/lib/screen-events/types'
import { AdminFontPicker } from './AdminFontPicker'
import { AdminEscape, AdminModal, Notice, Spinner, adminCall, errorText, isAuthError, useAdminLayer, useFocusTrap, type NoticeTone } from './admin-ui'

const EVENTS_API = '/api/screen-backgrounds/events'
/** 배경 만들기 안내 — 예전 확인창과 같은 값(예상치이며 고정 요금이 아니다) */
const GENERATE_COST = '약 400원'
const GENERATE_TIME = '30초 ~ 1분'

const day = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`
export const eventDates = (e: Pick<ScreenEvent, 'starts_on' | 'ends_on'>) => (e.starts_on === e.ends_on ? day(e.starts_on) : `${day(e.starts_on)} – ${day(e.ends_on)}`)

interface Status { forced: boolean; live: boolean; applying: boolean; hasBackground: boolean }

function Pills({ event, status }: { event: ScreenEvent; status: Status }) {
  if (!status.hasBackground) return <span className="kadm-pill">배경 없음</span>
  return (
    <>
      {status.forced && <span className="kadm-pill" data-tone="ok">수동 적용 중</span>}
      {!status.forced && status.applying && <span className="kadm-pill" data-tone="ok">기간 중 자동 적용 중</span>}
      {event.approved
        ? (status.live ? (status.forced || !status.applying) && <span className="kadm-pill">자동 적용 켜짐</span> : <span className="kadm-pill" data-tone="plan">자동 적용 예약</span>)
        : !status.forced && <span className="kadm-pill" data-tone="off">자동 적용 꺼짐</span>}
    </>
  )
}

function Zoom({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  useAdminLayer(onClose)
  const { ref, onKeyDown } = useFocusTrap<HTMLDivElement>(true)
  return (
    <div ref={ref} className="kadm-zoom" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onKeyDown={onKeyDown} onPointerDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <header>
        <b>{label}</b>
        <button type="button" className="kadm-chip-btn" data-autofocus onClick={onClose}>닫기 <X size={18} strokeWidth={2} aria-hidden="true" /></button>
      </header>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} />
      <p><Info size={18} strokeWidth={1.8} aria-hidden="true" />닫으면 행사 상세로 돌아갑니다.</p>
    </div>
  )
}

type Generation = { phase: 'confirm' } | { phase: 'running' } | { phase: 'done'; event: ScreenEvent } | { phase: 'failed'; message: string }

export function AdminEvents({ modeName, storeEvents, detailId, onDetail, onApplied, onAuthExpired, onHome }: {
  /** 지금 운영 모드 이름(관리자용 짧은 이름) */
  modeName: string
  /** 이 운영 모드가 매장 행사 배경을 화면에 쓰는가 — 아니면 저장만 되고 매장 모드에서 보인다 */
  storeEvents: boolean
  detailId: string | null
  onDetail: (id: string | null) => void
  /** 적용이 바뀌었을 때 — 기기 배경을 바로 다시 읽는다 */
  onApplied: () => void
  onAuthExpired: () => void
  onHome: () => void
}) {
  const [events, setEvents] = useState<ScreenEvent[] | null>(null)
  const [today, setToday] = useState('')
  const [generator, setGenerator] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: NoticeTone; title: string; text?: string } | null>(null)
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null)
  const [fontOpen, setFontOpen] = useState(false)
  const [generation, setGeneration] = useState<Generation | null>(null)

  const fail = useCallback((error: unknown, fallback: string) => {
    if (isAuthError(error)) { onAuthExpired(); return null }
    return errorText(error, fallback)
  }, [onAuthExpired])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminCall<{ events: ScreenEvent[]; today: string; generator: boolean }>(EVENTS_API)
      setEvents(data.events); setToday(data.today); setGenerator(data.generator); setLoadError('')
    } catch (error) {
      const message = fail(error, '행사 목록을 불러오지 못했어요.')
      if (message) setLoadError(message)
    } finally { setLoading(false) }
  }, [fail])
  // 탭을 열 때 한 번 읽는다(서버 값이 기준이다)
  useEffect(() => { void load() }, [load])

  const forcedNow = useMemo(() => events?.find((e) => isForced(e, today) && e.backgrounds.kiosk), [events, today])
  const statusOf = useCallback((event: ScreenEvent): Status => {
    const live = isEventLive(event, today)
    const forced = isForced(event, today)
    return { live, forced, hasBackground: Boolean(event.backgrounds.kiosk), applying: forced || (event.approved && live && !forcedNow) }
  }, [today, forcedNow])
  const fonts = useMemo(() => (events ?? []).flatMap((e) => [e.font, ...e.font_suggestions.map((s) => s.id)]), [events])
  const detail = detailId ? events?.find((e) => e.id === detailId) ?? null : null
  // 목록에서 사라진 행사(끝났거나 숨김)의 상세에 머물지 않는다
  useEffect(() => { if (detailId && events && !detail) onDetail(null) }, [detailId, events, detail, onDetail])

  /** 한 가지를 바꾼다 — 누르는 즉시 저장. 같은 행사에 요청이 가 있는 동안은 다시 받지 않는다 */
  const patch = async (event: ScreenEvent, body: Record<string, unknown>, done: { tone?: NoticeTone; title: string; text?: string }, applied: boolean) => {
    if (busy) return
    setBusy(event.id); setNotice(null)
    try {
      const { event: next } = await adminCall<{ event: ScreenEvent }>(EVENTS_API, 'PATCH', { id: event.id, ...body })
      setEvents((prev) => prev?.map((e) => (e.id === next.id ? next : e)) ?? prev)
      setNotice({ tone: done.tone ?? 'ok', title: done.title, text: done.text })
      if (applied) onApplied()
    } catch (error) {
      const message = fail(error, '저장하지 못했어요.')
      if (message) setNotice({ tone: 'error', title: '저장하지 못했어요.', text: `${message} 설정은 그대로예요.` })
    } finally { setBusy(null) }
  }

  const generate = async (event: ScreenEvent, applying: boolean) => {
    setGeneration({ phase: 'running' })
    try {
      const { event: next } = await adminCall<{ event: ScreenEvent }>(`${EVENTS_API}/generate`, 'POST', { id: event.id }, 200_000)
      setEvents((prev) => prev?.map((e) => (e.id === next.id ? next : e)) ?? prev)
      setGeneration({ phase: 'done', event: next })
      // 이미 적용 중인 행사면 새 배경이 바로 화면에 나간다
      if (applying) onApplied()
    } catch (error) {
      if (isAuthError(error)) { setGeneration(null); onAuthExpired(); return }
      setGeneration({ phase: 'failed', message: errorText(error, '배경을 만들지 못했어요.') })
    }
  }

  // ── 불러오는 중 · 실패 · 없음 ──
  if (!events) {
    return (
      <div className="kadm-pane">
        <h2 className="kadm-h1">행사 배경</h2>
        {loadError
          ? <Notice tone="warn" title="행사 목록을 불러오지 못했어요." action={<button type="button" className="kadm-btn kadm-btn--small" disabled={loading} onClick={() => void load()}>다시 불러오기</button>}>{loadError}</Notice>
          : <div className="kadm-empty"><Spinner size={34} /><b>행사 목록을 불러오는 중이에요.</b></div>}
      </div>
    )
  }

  // ── 행사 상세 ──
  if (detail) {
    const status = statusOf(detail)
    const bg = detail.backgrounds.kiosk
    const working = busy === detail.id
    const dates = eventDates(detail)
    const canGenerate = Boolean(detail.poster) && generator
    return (
      <div className="kadm-pane kadm-event-detail">
        <ScreenFontFace ids={fonts} />
        {/* Escape — 상세에서는 목록으로 한 단계만 돌아간다(위에 창이 떠 있으면 그 창부터) */}
        <AdminEscape onClose={() => { setNotice(null); onDetail(null) }} />
        <button type="button" className="kadm-back" onClick={() => { setNotice(null); onDetail(null) }}><ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />행사 목록</button>
        <h2 className="kadm-h1">{detail.title}</h2>
        <p className="kadm-event-meta"><span>{dates}</span><Pills event={detail} status={status} /></p>

        <div className="kadm-event-images">
          <figure>
            <button type="button" disabled={!bg} aria-label={bg ? '키오스크 배경 크게 보기' : '배경 없음'} onClick={() => bg && setZoom({ src: bg.image_url, label: `${detail.title} · 키오스크 배경` })}>
              {bg
                // eslint-disable-next-line @next/next/no-img-element
                ? <><img src={bg.thumbnail_url || bg.image_url} alt="" loading="lazy" /><i aria-hidden="true"><ZoomIn size={20} strokeWidth={1.8} /></i></>
                : <span><ImageIcon size={30} strokeWidth={1.4} aria-hidden="true" />배경 없음</span>}
            </button>
            <figcaption>키오스크 배경</figcaption>
          </figure>
          <figure>
            <button type="button" disabled={!detail.poster} aria-label={detail.poster ? '원본 포스터 크게 보기' : '포스터 없음'} onClick={() => detail.poster && setZoom({ src: detail.poster, label: `${detail.title} · 원본 포스터` })}>
              {detail.poster
                // eslint-disable-next-line @next/next/no-img-element
                ? <><img src={detail.poster} alt="" loading="lazy" /><i aria-hidden="true"><ZoomIn size={20} strokeWidth={1.8} /></i></>
                : <span><ImageIcon size={30} strokeWidth={1.4} aria-hidden="true" />포스터 없음</span>}
            </button>
            <figcaption>원본 포스터</figcaption>
          </figure>
        </div>

        <Notice compact>이 행사의 설정은 포토부스에도 함께 적용돼요.</Notice>
        {/* 아래쪽(행사 글꼴)에서 눌러도 결과가 보이게 위에 붙여 둔다 */}
        {notice && <div className="kadm-sticky"><Notice tone={notice.tone} title={notice.title}>{notice.text}</Notice></div>}
        {!bg && (
          <Notice tone="error" title="먼저 배경을 만들어 주세요">
            {canGenerate ? '행사 배경이 없어서 적용할 수 없어요.' : '행사 배경이 없어서 적용할 수 없어요. 배경은 관리자 웹에서 만들 수 있어요.'}
          </Notice>
        )}

        <div className="kadm-rows">
          <div className="kadm-row">
            <Settings size={30} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <b>{status.forced ? '수동 적용 중' : '지금 바로 적용'}</b>
              <span>{status.forced ? '날짜와 관계없이 이 배경을 사용하고 있어요' : '날짜와 관계없이 이 배경을 사용해요'}</span>
            </div>
            {status.forced ? (
              <button type="button" className="kadm-btn" disabled={working} onClick={() => void patch(detail, { force: false },
                detail.approved && status.live
                  ? { tone: 'warn', title: '수동 적용은 해제됐어요.', text: '행사 기간이라 자동 적용은 유지돼요. 같은 배경이 계속 보일 수 있어요.' }
                  : { title: '수동 적용을 해제했어요.', text: '다른 적용 행사가 없으면 평소 배경이 보여요.' }, true)}>
                {working ? '처리 중…' : '수동 적용 해제'}
              </button>
            ) : (
              <button type="button" className="kadm-btn kadm-btn--primary" disabled={working || !bg} onClick={() => void patch(detail, { force: true }, { title: '지금 바로 적용했어요.', text: '해제하거나 행사가 끝날 때까지 이 배경을 사용해요.' }, true)}>
                {working ? '처리 중…' : '지금 바로 적용'}
              </button>
            )}
          </div>
          <div className="kadm-row">
            <CalendarDays size={30} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <b>기간 중 자동 적용</b>
              <span>{detail.approved ? `${dates}에 자동으로 사용` : '행사 기간이 되어도 자동으로 바뀌지 않아요'}</span>
            </div>
            <button type="button" role="switch" aria-checked={detail.approved} aria-label="기간 중 자동 적용" className="kadm-switch" disabled={working || !bg}
              onClick={() => void patch(detail, { approved: !detail.approved },
                detail.approved
                  ? { title: '자동 적용을 껐어요.', text: status.forced ? '수동 적용은 그대로예요. 해제하려면 수동 적용 해제를 눌러 주세요.' : undefined }
                  : { title: status.live ? '기간 중 자동 적용을 켰어요.' : '자동 적용을 예약했어요.', text: status.live ? '지금이 행사 기간이에요.' : `${dates} 동안 자동으로 바뀌어요.` },
                status.live)}>
              <em>{detail.approved ? '켜짐' : '꺼짐'}</em><i aria-hidden="true" />
            </button>
          </div>
        </div>

        {bg && (
          <section className="kadm-block">
            <h3 className="kadm-h2">행사 글꼴</h3>
            <p className="kadm-sub">행사가 적용되는 동안 평소 글꼴보다 먼저 적용돼요.</p>
            {detail.font_suggestions.length > 0 && (
              <div className="kadm-font-choices" role="group" aria-label="추천 글꼴">
                {detail.font_suggestions.map((s) => (
                  <button key={s.id} type="button" aria-pressed={detail.font === s.id} disabled={working} title={s.reason} style={{ fontFamily: screenFontFamily(s.id) }}
                    onClick={() => detail.font !== s.id && void patch(detail, { font: s.id }, { title: `행사 글꼴을 ‘${findScreenFont(s.id)?.label ?? s.id}’(으)로 바꿨어요.` }, status.applying)}>
                    {findScreenFont(s.id)?.label ?? s.id}
                    {detail.font === s.id && <CheckCircle2 size={20} strokeWidth={2} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="kadm-btn kadm-btn--wide" disabled={working} onClick={() => setFontOpen(true)}>
              전체 글꼴 보기 · 지금 {findScreenFont(detail.font)?.label ?? '기기 평소 글꼴'} <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </section>
        )}

        {canGenerate && (
          <button type="button" className="kadm-linkrow" disabled={working} onClick={() => setGeneration({ phase: 'confirm' })}>
            <Wand2 size={30} strokeWidth={1.5} aria-hidden="true" />
            <span><b>{bg ? '배경 다시 만들기' : '배경 만들기'}</b><em>원본 포스터로 새 배경 생성</em></span>
            <small>{GENERATE_COST} · {GENERATE_TIME.replace(/ /g, '')}</small>
            <ChevronRight size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        )}

        {zoom && <Zoom {...zoom} onClose={() => setZoom(null)} />}
        {fontOpen && (
          <AdminFontPicker value={detail.font} defaultLabel="기기 평소 글꼴" defaultNote="화면·글꼴에서 고른 글꼴" onClose={() => setFontOpen(false)}
            onPick={(font) => { setFontOpen(false); if (font !== detail.font) void patch(detail, { font }, { title: font ? `행사 글꼴을 ‘${findScreenFont(font)?.label ?? font}’(으)로 바꿨어요.` : '행사 글꼴을 기기 평소 글꼴로 돌렸어요.' }, status.applying) }} />
        )}
        {generation && (
          <AdminModal label="배경 만들기" onClose={generation.phase === 'running' ? null : () => setGeneration(null)} className="kadm-gen">
            {generation.phase === 'confirm' && (
              <>
                <AlertCircle className="kadm-gen-icon" data-tone="warn" size={52} strokeWidth={1.5} aria-hidden="true" />
                <h3>배경을 {bg ? '다시 ' : ''}만들까요?</h3>
                <p>아래 내용을 확인하고 진행해 주세요.</p>
                <GenerateFacts />
                {status.applying && <Notice tone="warn" compact>현재 적용 중인 행사예요. 완료되면 새 배경이 바로 화면에 나올 수 있어요.</Notice>}
                <div className="kadm-modal-actions">
                  <button type="button" className="kadm-btn" onClick={() => setGeneration(null)}>취소</button>
                  <button type="button" className="kadm-btn kadm-btn--primary" data-autofocus onClick={() => void generate(detail, status.applying)}>배경 만들기</button>
                </div>
              </>
            )}
            {generation.phase === 'running' && (
              <>
                <Spinner size={50} />
                <h3>새 배경을 만들고 있어요</h3>
                <p>완료될 때까지 잠시 기다려 주세요.</p>
                <GenerateFacts />
                <Notice compact>이 창을 닫지 말고 기다려 주세요. 다시 누르면 비용이 한 번 더 들어요.</Notice>
                <div className="kadm-modal-actions"><button type="button" className="kadm-btn kadm-btn--primary" disabled>생성 중…</button></div>
              </>
            )}
            {generation.phase === 'done' && (
              <>
                <CheckCircle2 className="kadm-gen-icon" data-tone="ok" size={52} strokeWidth={1.5} aria-hidden="true" />
                <h3>배경이 완성됐어요</h3>
                <p>{status.applying ? '적용 중인 행사라 새 배경이 바로 반영됐어요.' : '새 배경을 확인한 뒤 적용해 주세요.'}</p>
                <div className="kadm-gen-results">
                  {(['kiosk', 'booth'] as const).map((target) => {
                    const made = generation.event.backgrounds[target]
                    return made ? (
                      <figure key={target}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={made.thumbnail_url || made.image_url} alt="" />
                        <figcaption>{target === 'kiosk' ? '키오스크' : '포토부스'}</figcaption>
                      </figure>
                    ) : null
                  })}
                </div>
                <div className="kadm-modal-actions"><button type="button" className="kadm-btn kadm-btn--primary" data-autofocus onClick={() => setGeneration(null)}>행사 상세로</button></div>
              </>
            )}
            {generation.phase === 'failed' && (
              <>
                <AlertCircle className="kadm-gen-icon" data-tone="warn" size={52} strokeWidth={1.5} aria-hidden="true" />
                <h3>배경을 만들지 못했어요</h3>
                <p>{generation.message}</p>
                <Notice compact>다시 시도하면 비용과 시간을 한 번 더 안내해요.</Notice>
                <div className="kadm-modal-actions">
                  <button type="button" className="kadm-btn" onClick={() => setGeneration(null)}>행사 상세로</button>
                  <button type="button" className="kadm-btn kadm-btn--primary" data-autofocus onClick={() => setGeneration({ phase: 'confirm' })}>다시 시도</button>
                </div>
              </>
            )}
          </AdminModal>
        )}
      </div>
    )
  }

  // ── 행사 목록 ──
  const live = events.filter((e) => isEventLive(e, today))
  const upcoming = events.filter((e) => !isEventLive(e, today))
  const card = (event: ScreenEvent) => {
    const status = statusOf(event)
    const image = event.backgrounds.kiosk?.thumbnail_url || event.backgrounds.kiosk?.image_url || event.poster
    return (
      <li key={event.id}>
        <button type="button" className="kadm-event-card" onClick={() => { setNotice(null); onDetail(event.id) }}>
          <span className="kadm-event-thumb">
            {image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={image} alt="" loading="lazy" />
              : <ImageIcon size={30} strokeWidth={1.4} aria-hidden="true" />}
          </span>
          <span className="kadm-event-info">
            <b>{event.title}</b>
            <span>{eventDates(event)}</span>
            <span className="kadm-pills"><Pills event={event} status={status} /></span>
          </span>
          <ChevronRight size={24} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </li>
    )
  }

  if (!events.length) {
    return (
      <div className="kadm-pane">
        <div className="kadm-empty kadm-empty--page">
          <i><CalendarDays size={44} strokeWidth={1.5} aria-hidden="true" /></i>
          <b>예정된 행사가 없어요</b>
          <span>행사는 관리자 웹에서 등록해 주세요.</span>
          <button type="button" className="kadm-btn kadm-btn--primary" onClick={onHome}>관리자 홈으로</button>
        </div>
      </div>
    )
  }
  return (
    <div className="kadm-pane">
      <div className="kadm-pane-head">
        <div>
          <h2 className="kadm-h1">행사 배경</h2>
          <p className="kadm-sub">현재 운영 모드: {modeName}</p>
        </div>
        <button type="button" className="kadm-btn kadm-btn--small" disabled={loading} onClick={() => void load()}>{loading ? '불러오는 중…' : '새로고침'}</button>
      </div>
      <Notice compact>행사 설정은 키오스크와 포토부스에 함께 반영돼요.</Notice>
      {!storeEvents && <Notice tone="warn" compact>지금 운영 모드({modeName})에서는 매장 행사 배경을 화면에 쓰지 않아요. 여기서 바꾼 설정은 저장되고 매장 기본 모드에서 보여요.</Notice>}
      {loadError && <Notice tone="warn" title="새로 불러오지 못했어요." action={<button type="button" className="kadm-btn kadm-btn--small" disabled={loading} onClick={() => void load()}>다시 불러오기</button>}>마지막으로 받은 목록이에요.</Notice>}
      {live.length > 0 && <><h3 className="kadm-h2">진행 중</h3><ul className="kadm-events">{live.map(card)}</ul></>}
      {upcoming.length > 0 && <><h3 className="kadm-h2">다가오는 행사</h3><ul className="kadm-events">{upcoming.map(card)}</ul></>}
      <div className="kadm-legend">
        <p><Info size={22} strokeWidth={1.8} aria-hidden="true" />행사 등록과 삭제는 관리자 웹에서 해요.</p>
        <dl>
          <div><dt><span className="kadm-pill" data-tone="ok">지금 적용</span></dt><dd>날짜와 관계없이 적용</dd></div>
          <div><dt><span className="kadm-pill" data-tone="plan">기간 예약</span></dt><dd>행사 기간에만 적용</dd></div>
        </dl>
      </div>
    </div>
  )
}

function GenerateFacts() {
  return (
    <dl className="kadm-facts">
      <div><dt><Coins size={20} strokeWidth={1.7} aria-hidden="true" />예상 비용</dt><dd>{GENERATE_COST}</dd></div>
      <div><dt><Clock3 size={20} strokeWidth={1.7} aria-hidden="true" />소요 시간</dt><dd>{GENERATE_TIME}</dd></div>
      <div><dt><ImageIcon size={20} strokeWidth={1.7} aria-hidden="true" />생성 개수</dt><dd>키오스크 · 포토부스 배경 2장을 만듭니다.</dd></div>
    </dl>
  )
}
