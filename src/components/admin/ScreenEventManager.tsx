'use client'

// 이벤트 배경 — ERP·노션에서 불러온 행사마다 포스터로 키오스크·포토부스 배경과 추천 글꼴을 만들고,
// 미리보기를 확인해 '기간 중 자동 적용'을 켜면 그 기간에만 두 기기에 적용된다(docs/screen-events.md).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarClock, Check, ImagePlus, Loader2, Plus, RefreshCw, Sparkles, EyeOff, Eye, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { ScreenBackground } from '@/lib/screen-backgrounds/types'
import { findScreenFont, screenFontFamily } from '@/lib/screen-fonts/catalog'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import { ScreenFontPicker } from '@/lib/screen-fonts/FontPicker'
import { EVENT_STORE_LABELS, EVENT_STORES, isEventLive, type EventStore, type ScreenEvent } from '@/lib/screen-events/types'

const API = '/api/admin/screen-events'
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900'

interface ListResponse {
  events: ScreenEvent[]
  today: string
  device_store: EventStore
  sources: { erp: boolean; notion: boolean; generator: boolean }
}

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method, cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error || '요청을 처리하지 못했습니다.')
  return result as T
}

async function uploadPoster(eventKey: string, file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('JPG·PNG·WebP 이미지만 올릴 수 있습니다.')
  if (file.size > 15 * 1024 * 1024) throw new Error('15MB 이하 이미지만 올릴 수 있습니다.')
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png'
  const bucket = supabase.storage.from('admin-content')
  const path = `screen-events/${eventKey}/upload-${crypto.randomUUID()}.${extension}`
  const { error } = await bucket.upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (error) throw new Error(`포스터 업로드 실패: ${error.message}`)
  return bucket.getPublicUrl(path).data.publicUrl
}

const dateLabel = (event: ScreenEvent) => {
  const f = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`
  return event.starts_on === event.ends_on ? f(event.starts_on) : `${f(event.starts_on)}~${f(event.ends_on)}`
}

function Preview({ background, font, portrait }: { background: ScreenBackground | null; font: string | null; portrait: boolean }) {
  const box = portrait ? 'aspect-[9/16] w-28' : 'aspect-video w-52'
  if (!background) return <div className={`${box} flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[11px] text-slate-400`}>{portrait ? '키오스크' : '포토부스'}</div>
  return (
    <figure className="space-y-1">
      <div className={`${box} relative overflow-hidden rounded-lg border border-slate-200`} style={{ backgroundColor: background.base }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={background.thumbnail_url || background.image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {/* 창이 올라갈 자리 — 글꼴과 가독성을 함께 본다 */}
        <div className="absolute inset-x-[14%] top-1/2 -translate-y-1/2 rounded-md bg-white/92 px-2 py-1.5 text-center shadow" style={{ fontFamily: screenFontFamily(font) }}>
          <p className={`${portrait ? 'text-[10px]' : 'text-xs'} font-bold leading-tight whitespace-pre-line`} style={{ color: background.ink }}>{portrait ? '오늘의 최애,\n어떤 향으로?' : '어떤 사진을 찍을까요?'}</p>
        </div>
      </div>
      <figcaption className="text-[11px] text-slate-500">{portrait ? '키오스크 1080×1920' : '포토부스 1920×1080'}</figcaption>
    </figure>
  )
}

function EventCard({ event, today, generator, busy, onPatch, onGenerate }: {
  event: ScreenEvent
  today: string
  generator: boolean
  busy: 'patch' | 'generate' | null
  onPatch: (patch: Record<string, unknown>) => Promise<void>
  onGenerate: () => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const live = isEventLive(event, today)
  const ended = event.ends_on < today
  const hasScreens = !!(event.backgrounds.kiosk || event.backgrounds.booth)
  const generating = busy === 'generate'
  const disabled = !!busy || uploading
  const addPoster = async (file: File | undefined) => {
    if (!file) return
    setUploading(true); setError('')
    try { await onPatch({ add_poster: await uploadPoster(event.id, file) }) } catch (cause) { setError(cause instanceof Error ? cause.message : '업로드 실패') } finally { setUploading(false) }
  }
  const status = event.approved && hasScreens
    ? live ? { text: '지금 적용 중', cls: 'bg-emerald-600 text-white' } : ended ? { text: '적용 끝남', cls: 'bg-slate-200 text-slate-600' } : { text: '기간 중 자동 적용 예약', cls: 'bg-emerald-50 text-emerald-700' }
    : hasScreens ? { text: '미리보기 확인 필요', cls: 'bg-amber-50 text-amber-700' } : { text: '배경 없음', cls: 'bg-slate-100 text-slate-500' }
  return (
    <article className={`rounded-xl border bg-white p-4 ${live && event.approved ? 'border-emerald-400 ring-1 ring-emerald-400' : 'border-slate-200'} ${event.hidden ? 'opacity-60' : ''}`}>
      <ScreenFontFace ids={[event.font, ...event.font_suggestions.map(s => s.id)]} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-bold text-white tabular-nums">{dateLabel(event)}</span>
        <h3 className="text-base font-bold text-slate-900">{event.title}</h3>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{EVENT_STORE_LABELS[event.store]}</span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{event.source === 'erp' ? 'ERP' : event.source === 'notion' ? '노션' : '직접 추가'}{event.source === 'erp' && event.notion_block_id ? '·노션' : ''}</span>
        {live && <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">진행 중</span>}
        <span className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${status.cls}`}>{status.text}</span>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[auto_1fr]">
        {/* 포스터 */}
        <div className="space-y-2">
          <div className="flex gap-2">
            {event.posters.length ? event.posters.map(url => (
              <button key={url} type="button" disabled={disabled} onClick={() => void onPatch({ poster: url })} title="이 포스터로 만들기"
                className={`relative h-28 w-20 overflow-hidden rounded-lg border-2 ${event.poster === url ? 'border-slate-900' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="포스터" loading="lazy" className="h-full w-full object-cover" />
                {event.poster === url && <Check size={14} className="absolute right-1 top-1 rounded-full bg-slate-900 p-0.5 text-white" />}
              </button>
            )) : <div className="flex h-28 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-center text-[11px] text-slate-400">포스터<br />없음</div>}
          </div>
          <label className={`${buttonClass} w-full cursor-pointer text-xs`}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}포스터 올리기
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled} onChange={e => { void addPoster(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Preview background={event.backgrounds.kiosk} font={event.font} portrait />
            <Preview background={event.backgrounds.booth} font={event.font} portrait={false} />
            <div className="flex min-w-48 flex-1 flex-col gap-2">
              <button type="button" disabled={disabled || !event.poster || !generator} onClick={() => void onGenerate()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? '만드는 중… (1~2분)' : hasScreens ? '배경 다시 만들기' : '포스터로 배경 만들기'}
              </button>
              <p className="text-[11px] leading-relaxed text-slate-500">
                {!generator ? '이미지 AI 전용 키가 설정되면 쓸 수 있습니다.' : !event.poster ? '포스터를 먼저 올려주세요.' : '포스터 색·무늬로 사람·글자 없는 배경 2장(세로·가로)과 어울리는 글꼴 3개를 추천합니다.'}
                {event.generation_cost ? ` · 누적 비용 약 $${event.generation_cost.toFixed(3)}` : ''}
              </p>
              {event.analysis?.mood && <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">분위기: {event.analysis.mood}</p>}
            </div>
          </div>

          {hasScreens && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600">이벤트 글꼴 {event.font_suggestions.length ? '· AI 추천' : ''}</p>
              <div className="flex flex-wrap gap-2">
                {event.font_suggestions.map((s, i) => (
                  <button key={s.id} type="button" disabled={disabled} onClick={() => void onPatch({ font: s.id })} title={s.reason}
                    className={`max-w-xs rounded-lg border px-3 py-2 text-left ${event.font === s.id ? 'border-slate-900 bg-white ring-1 ring-slate-900' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
                    <span className="block text-base leading-tight" style={{ fontFamily: screenFontFamily(s.id) }}>{i + 1}. {findScreenFont(s.id)?.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{s.reason}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">다른 글꼴</span>
                <div className="flex min-w-0 flex-1"><ScreenFontPicker value={event.font} disabled={disabled} defaultLabel="기기 평소 글꼴" onChange={font => void onPatch({ font })} className="sfp-trigger--sm" /></div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={disabled || !hasScreens} onClick={() => void onPatch({ approved: !event.approved })}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${event.approved ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50'}`}>
              <CalendarClock size={16} />{event.approved ? '기간 중 자동 적용: 켜짐' : '기간 중 자동 적용 켜기'}
            </button>
            <span className="text-xs text-slate-500">{event.approved ? `${dateLabel(event)} 동안 키오스크·포토부스에 적용되고, 끝나면 평소 배경·글꼴로 돌아갑니다.` : '미리보기를 확인한 뒤 켜주세요.'}</span>
            <button type="button" disabled={disabled} onClick={() => void onPatch({ hidden: !event.hidden })} className={`${buttonClass} ml-auto text-xs`}>
              {event.hidden ? <Eye size={14} /> : <EyeOff size={14} />}{event.hidden ? '다시 보이기' : '숨기기'}
            </button>
          </div>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </article>
  )
}

function AddEventForm({ onClose, onCreate }: { onClose: () => void; onCreate: (body: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [store, setStore] = useState<EventStore>('wow')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const poster = file ? await uploadPoster(`manual-${crypto.randomUUID().slice(0, 8)}`, file) : undefined
      await onCreate({ title, store, starts_on: start, ends_on: end || start, poster })
      onClose()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '추가하지 못했습니다.') } finally { setSaving(false) }
  }
  return (
    <form onSubmit={e => void submit(e)} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <label className="space-y-1 text-xs font-semibold text-slate-600 lg:col-span-2">이벤트 이름<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 세븐틴 정한" className={inputClass} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600">매장<select value={store} onChange={e => setStore(e.target.value as EventStore)} className={inputClass}>{EVENT_STORES.map(s => <option key={s} value={s}>{EVENT_STORE_LABELS[s]}</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600">시작일<input required type="date" value={start} onChange={e => setStart(e.target.value)} className={inputClass} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600">종료일<input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} className={inputClass} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600">포스터<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs" /></label>
      <div className="flex items-center gap-2 lg:col-span-6">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />}추가</button>
        <button type="button" onClick={onClose} className={buttonClass}>취소</button>
        {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
      </div>
    </form>
  )
}

export function ScreenEventManager() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [busy, setBusy] = useState<Record<string, 'patch' | 'generate'>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [showHidden, setShowHidden] = useState(false)

  const load = useCallback(async () => {
    try { setData(await call<ListResponse>(API)); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : '불러오지 못했습니다.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const replace = (event: ScreenEvent) => setData(prev => prev ? { ...prev, events: prev.events.map(e => e.id === event.id ? event : e) } : prev)
  const withBusy = async (id: string, kind: 'patch' | 'generate', run: () => Promise<void>) => {
    setBusy(prev => ({ ...prev, [id]: kind })); setError(''); setNotice('')
    try { await run() } catch (cause) { setError(cause instanceof Error ? cause.message : '처리하지 못했습니다.') } finally { setBusy(prev => { const next = { ...prev }; delete next[id]; return next }) }
  }
  const sync = async () => {
    setSyncing(true); setError(''); setNotice('')
    try {
      const { result } = await call<{ result: { added: number; updated: number; posters: number; erp: number; notion: number; errors: string[] } }>(`${API}/sync`, 'POST', {})
      setNotice(`ERP ${result.erp}건·노션 ${result.notion}건을 확인해 새 이벤트 ${result.added}건, 바뀐 이벤트 ${result.updated}건, 포스터 ${result.posters}건을 가져왔습니다.${result.errors.length ? ` (일부 실패: ${result.errors.slice(0, 2).join(' / ')})` : ''}`)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '불러오지 못했습니다.') } finally { setSyncing(false) }
  }

  const today = data?.today ?? ''
  const events = useMemo(() => (data?.events ?? [])
    .filter(e => (showPast || e.ends_on >= today) && (showHidden || !e.hidden)), [data, showPast, showHidden, today])
  const liveNow = (data?.events ?? []).find(e => e.approved && !e.hidden && isEventLive(e, today) && (e.backgrounds.kiosk || e.backgrounds.booth))

  return (
    <section aria-label="이벤트 배경" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">이벤트 배경</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
            ACSCENT ERP의 생일 이벤트(기간)와 노션 &lsquo;이벤트 굿즈 관리&rsquo;의 포스터를 불러옵니다(매일 새벽 자동). 포스터로 배경과 글꼴을 만들고
            &lsquo;기간 중 자동 적용&rsquo;을 켜면 그 기간에만 키오스크·포토부스에 적용됩니다. {data ? `기기가 있는 ${EVENT_STORE_LABELS[data.device_store]} 매장과 공통 이벤트만 다룹니다.` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void sync()} disabled={syncing || loading} className={buttonClass}><RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />{syncing ? '불러오는 중…' : 'ERP·노션에서 불러오기'}</button>
          <button type="button" onClick={() => setAdding(v => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700">{adding ? <X size={15} /> : <Plus size={15} />}직접 추가</button>
        </div>
      </div>

      {data && (
        <div className="flex flex-wrap gap-2 text-xs">
          {([['erp', 'ACSCENT ERP'], ['notion', '노션'], ['generator', '이미지 AI 전용 키']] as const).map(([key, label]) => (
            <span key={key} className={`rounded-full px-2.5 py-1 font-semibold ${data.sources[key] ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{label} {data.sources[key] ? '연결됨' : '설정 필요'}</span>
          ))}
          {liveNow && <span className="rounded-full bg-emerald-600 px-2.5 py-1 font-bold text-white">지금 적용 중: {liveNow.title} ({dateLabel(liveNow)})</span>}
        </div>
      )}

      {adding && <AddEventForm onClose={() => setAdding(false)} onCreate={async body => { const { event } = await call<{ event: ScreenEvent }>(API, 'POST', body); setData(prev => prev ? { ...prev, events: [...prev.events, event].sort((a, b) => a.starts_on.localeCompare(b.starts_on)) } : prev); setNotice(`“${event.title}” 이벤트를 추가했습니다.`) }} />}
      {error && <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} />{error}</p>}
      {notice && <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><Check size={16} />{notice}</p>}

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} />지난 이벤트</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} />숨긴 이벤트</label>
        <span className="text-slate-400">{events.length}건</span>
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        : !events.length ? <p className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">표시할 이벤트가 없습니다. &lsquo;ERP·노션에서 불러오기&rsquo;를 눌러보세요.</p>
          : <div className="space-y-3">{events.map(event => (
            <EventCard key={event.id} event={event} today={today} generator={!!data?.sources.generator} busy={busy[event.id] ?? null}
              onPatch={patch => withBusy(event.id, 'patch', async () => { const { event: next } = await call<{ event: ScreenEvent }>(API, 'PATCH', { id: event.id, ...patch }); replace(next) })}
              onGenerate={() => withBusy(event.id, 'generate', async () => { const { event: next } = await call<{ event: ScreenEvent }>(`${API}/generate`, 'POST', { id: event.id }); replace(next); setNotice(`“${event.title}” 배경을 만들었습니다. 미리보기를 확인하고 자동 적용을 켜주세요.`) })}
            />
          ))}</div>}
    </section>
  )
}
