'use client'

// 이벤트 배경 — ERP·노션에서 불러온 행사마다 포스터로 키오스크·포토부스 배경과 추천 글꼴을 만들고,
// 미리보기를 확인해 '기간 중 자동 적용'을 켜면 그 기간에만 두 기기에 적용된다(docs/screen-events.md).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CalendarClock, Check, ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Loader2, Maximize2, Plus, RefreshCw, Sparkles, EyeOff, Eye, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { ScreenBackground } from '@/lib/screen-backgrounds/types'
import { findScreenFont, screenFontFamily } from '@/lib/screen-fonts/catalog'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import { ScreenFontPicker } from '@/lib/screen-fonts/FontPicker'
import { EVENT_STORE_LABELS, EVENT_STORES, isEventLive, type EventStore, type ScreenEvent } from '@/lib/screen-events/types'

const API = '/api/admin/screen-events'
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const inputClass = 'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900'

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

/** 이미지 칸 — 포스터·키오스크·부스를 같은 높이로 맞춰 나란히(좁으면 줄바꿈) */
function Frame({ ratio, label, className = '', onOpen, children }: { ratio: string; label: string; className?: string; onOpen?: () => void; children?: React.ReactNode }) {
  const box = 'relative block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50'
  const inner = children ?? <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[11px] text-slate-400">{label}</span>
  return (
    <figure className={`flex min-w-0 flex-col gap-1 ${className}`}>
      {onOpen ? (
        <button type="button" onClick={onOpen} aria-label={`${label} 크게 보기`} style={{ aspectRatio: ratio }}
          className={`${box} group cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900`}>
          {inner}
          <span className="absolute right-1.5 top-1.5 rounded-md bg-slate-900/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
            <Maximize2 size={12} />
          </span>
        </button>
      ) : <div className={box} style={{ aspectRatio: ratio }}>{inner}</div>}
      <figcaption className="text-center text-[11px] text-slate-500">{label}</figcaption>
    </figure>
  )
}

type PreviewItem = { key: 'poster' | 'kiosk' | 'booth'; label: string; src: string; size: string; background?: ScreenBackground }

/** 크게 보기 — 포스터·키오스크·부스를 오가며 본다. 기기 화면은 창이 올라갈 자리와 글꼴을 겹쳐 볼 수 있다 */
function PreviewDialog({ title, items, start, font, onClose }: { title: string; items: PreviewItem[]; start: number; font: string | null; onClose: () => void }) {
  const [index, setIndex] = useState(start)
  const [overlay, setOverlay] = useState(true)
  const item = items[index]
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setIndex(i => (i + 1) % items.length)
      if (event.key === 'ArrowLeft') setIndex(i => (i - 1 + items.length) % items.length)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [items.length, onClose])
  if (!item) return null
  const screen = item.background
  const portrait = item.key === 'kiosk'
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-950/90 text-white" role="dialog" aria-modal="true" aria-label={`${title} ${item.label} 미리보기`} onClick={onClose}>
      <header className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-3 sm:px-5" onClick={e => e.stopPropagation()}>
        <p className="mr-auto min-w-0 truncate text-sm font-bold">{title}</p>
        <div className="order-3 flex w-full gap-1 rounded-lg bg-white/10 p-1 sm:order-none sm:w-auto" role="tablist">
          {items.map((it, i) => (
            <button key={it.key} type="button" role="tab" aria-selected={i === index} onClick={() => setIndex(i)}
              className={`h-10 flex-1 rounded-md px-4 text-sm font-semibold sm:flex-none ${i === index ? 'bg-white text-slate-900' : 'text-white/80 hover:bg-white/10'}`}>{it.label}</button>
          ))}
        </div>
        <a href={item.src} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-semibold hover:bg-white/20"><ExternalLink size={15} /><span className="hidden sm:inline">원본</span></a>
        <button type="button" onClick={onClose} aria-label="닫기" className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X size={18} /></button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-2 sm:px-16">
        {items.length > 1 && (
          <>
            <button type="button" aria-label="이전" onClick={e => { e.stopPropagation(); setIndex(i => (i - 1 + items.length) % items.length) }}
              className="absolute left-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex"><ChevronLeft size={22} /></button>
            <button type="button" aria-label="다음" onClick={e => { e.stopPropagation(); setIndex(i => (i + 1) % items.length) }}
              className="absolute right-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex"><ChevronRight size={22} /></button>
          </>
        )}
        {/* 그림 비율 그대로 화면에 맞춘다 — 세로(키오스크)는 높이, 가로(부스)는 폭 기준 */}
        <div className="relative max-h-full max-w-full" onClick={e => e.stopPropagation()}
          style={{ aspectRatio: item.key === 'poster' ? undefined : portrait ? '9 / 16' : '16 / 9', height: portrait ? '100%' : undefined, width: item.key === 'booth' ? '100%' : undefined }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={item.src} src={item.src} alt={`${title} ${item.label}`} className={`block rounded-lg shadow-2xl ${item.key === 'poster' ? 'max-h-[calc(100svh-9.5rem)] max-w-full object-contain sm:max-h-[calc(100svh-7rem)]' : 'h-full w-full object-cover'}`} />
          {screen && overlay && (
            <div className="pointer-events-none absolute inset-x-[16%] top-1/2 -translate-y-1/2 rounded-xl bg-white/92 px-4 py-4 text-center shadow-lg" style={{ fontFamily: screenFontFamily(font) }}>
              <p className="whitespace-pre-line text-[clamp(14px,2.6vmin,30px)] font-bold leading-snug" style={{ color: screen.ink }}>{portrait ? '오늘의 최애,\n어떤 향으로 기억할까요?' : '어떤 사진을 찍을까요?'}</p>
              <p className="mt-1 text-[clamp(10px,1.4vmin,16px)]" style={{ color: screen.ink, opacity: 0.7 }}>{findScreenFont(font)?.label ?? '기기 평소 글꼴'}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 px-3 pb-4 text-xs text-white/70" onClick={e => e.stopPropagation()}>
        <span>{item.size}</span>
        {screen && (
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-white/10 px-3 font-semibold text-white">
            <input type="checkbox" checked={overlay} onChange={e => setOverlay(e.target.checked)} className="h-4 w-4 accent-white" />창·글꼴 겹쳐 보기
          </label>
        )}
        <span className="hidden sm:inline">← → 로 넘기기 · Esc 닫기</span>
      </footer>
    </div>,
    document.body,
  )
}

function ScreenPreview({ background, font, portrait, className, onOpen }: { background: ScreenBackground | null; font: string | null; portrait: boolean; className?: string; onOpen?: () => void }) {
  const label = portrait ? '키오스크' : '포토부스'
  return (
    <Frame ratio={portrait ? '9 / 16' : '16 / 9'} label={label} className={className} onOpen={background ? onOpen : undefined}>
      {background && (
        <div className="absolute inset-0" style={{ backgroundColor: background.base }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={background.thumbnail_url || background.image_url} alt={`${label} 배경`} loading="lazy" className="h-full w-full object-cover" />
          {/* 창이 올라갈 자리 — 글꼴과 가독성을 함께 본다 */}
          <div className="absolute inset-x-[12%] top-1/2 -translate-y-1/2 rounded bg-white/90 px-1.5 py-1 text-center shadow-sm" style={{ fontFamily: screenFontFamily(font) }}>
            <p className="whitespace-pre-line text-[10px] font-bold leading-tight" style={{ color: background.ink }}>{portrait ? '오늘의 최애,\n어떤 향으로?' : '어떤 사진을 찍을까요?'}</p>
          </div>
        </div>
      )}
    </Frame>
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
  const [viewing, setViewing] = useState<number | null>(null)
  const previewItems = useMemo(() => {
    const out: PreviewItem[] = []
    if (event.poster) out.push({ key: 'poster', label: '포스터', src: event.poster, size: '포스터 원본' })
    if (event.backgrounds.kiosk) out.push({ key: 'kiosk', label: '키오스크', src: event.backgrounds.kiosk.image_url, size: '키오스크 세로 1080×1920', background: event.backgrounds.kiosk })
    if (event.backgrounds.booth) out.push({ key: 'booth', label: '포토부스', src: event.backgrounds.booth.image_url, size: '포토부스 가로 1920×1080', background: event.backgrounds.booth })
    return out
  }, [event.poster, event.backgrounds.kiosk, event.backgrounds.booth])
  const open = (key: PreviewItem['key']) => { const i = previewItems.findIndex(it => it.key === key); if (i >= 0) setViewing(i) }
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
    ? live ? { text: '지금 적용 중', cls: 'bg-emerald-600 text-white' } : ended ? { text: '적용 끝남', cls: 'bg-slate-100 text-slate-500' } : { text: '자동 적용 예약', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' }
    : hasScreens ? { text: '미리보기 확인', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' } : { text: '배경 없음', cls: 'bg-slate-100 text-slate-500' }
  const hint = !generator ? '이미지 AI 전용 키가 설정되면 쓸 수 있습니다.' : !event.poster ? '포스터를 먼저 올려주세요.' : generating ? '포스터를 분석하고 배경 2장을 그리는 중입니다.' : hasScreens ? '마음에 들지 않으면 다시 만들 수 있습니다(약 400원).' : '사람·글자 없는 배경 2장과 어울리는 글꼴 3개를 추천합니다.'
  return (
    <article className={`flex flex-col rounded-xl border bg-white shadow-sm ${live && event.approved ? 'border-emerald-400 ring-1 ring-emerald-400' : 'border-slate-200'} ${event.hidden ? 'opacity-60' : ''}`}>
      <ScreenFontFace ids={[event.font, ...event.font_suggestions.map(s => s.id)]} />

      {/* 머리 */}
      <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold tabular-nums text-white">{dateLabel(event)}</span>
            <h3 className="line-clamp-2 break-keep text-base font-bold leading-snug text-slate-900" title={event.title}>{event.title}</h3>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <span>{EVENT_STORE_LABELS[event.store]}</span><span aria-hidden="true">·</span>
            <span>{event.source === 'erp' ? (event.notion_block_id ? 'ERP·노션' : 'ERP') : event.source === 'notion' ? '노션' : '직접 추가'}</span>
            {live && <><span aria-hidden="true">·</span><span className="font-bold text-rose-600">진행 중</span></>}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${status.cls}`}>{status.text}</span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* 포스터 · 만든 배경 — 열 비율을 각 그림 비율(2:3·9:16·16:9)에 맞춰 세 칸 높이가 같다.
            모바일은 포스터·키오스크 한 줄 + 부스 아래 전체 폭 */}
        <div className="grid max-w-[16rem] grid-cols-[0.667fr_0.5625fr] items-start gap-3 sm:max-w-2xl sm:grid-cols-[0.667fr_0.5625fr_1.778fr]">
          <Frame ratio="2 / 3" label={event.poster ? '포스터' : '포스터 없음'} onOpen={event.poster ? () => open('poster') : undefined}>
            {event.poster && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.poster} alt={`${event.title} 포스터`} loading="lazy" className="h-full w-full object-cover" />
            )}
          </Frame>
          <ScreenPreview background={event.backgrounds.kiosk} font={event.font} portrait onOpen={() => open('kiosk')} />
          <ScreenPreview background={event.backgrounds.booth} font={event.font} portrait={false} onOpen={() => open('booth')} className="col-span-2 sm:col-span-1" />
        </div>
        {viewing !== null && <PreviewDialog title={`${dateLabel(event)} ${event.title}`} items={previewItems} start={viewing} font={event.font} onClose={() => setViewing(null)} />}

        {/* 포스터 고르기·올리기 */}
        <div className="flex flex-wrap items-center gap-2">
          {event.posters.length > 1 && event.posters.map((url, index) => (
            <button key={url} type="button" disabled={disabled} onClick={() => void onPatch({ poster: url })} aria-pressed={event.poster === url} aria-label={`포스터 ${index + 1} 사용`}
              className={`h-11 w-9 overflow-hidden rounded-md border-2 ${event.poster === url ? 'border-slate-900' : 'border-slate-200 opacity-70 hover:opacity-100'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
          <label className={`${buttonClass} h-11 cursor-pointer`}>
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}포스터 올리기
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled} onChange={e => { void addPoster(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {event.analysis?.mood && <p className="min-w-0 flex-1 basis-48 text-xs leading-relaxed text-slate-500">{event.analysis.mood}</p>}
        </div>

        {/* 글꼴 */}
        {hasScreens && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">이벤트 글꼴{event.font_suggestions.length ? ' · AI 추천' : ''}</p>
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
              {event.font_suggestions.map((s, i) => (
                <button key={s.id} type="button" disabled={disabled} onClick={() => void onPatch({ font: s.id })} aria-pressed={event.font === s.id} title={s.reason}
                  className={`min-h-11 w-44 shrink-0 snap-start rounded-lg border px-3 py-2 text-left transition-colors sm:w-auto ${event.font === s.id ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400'}`}>
                  <span className="block truncate text-[15px] leading-tight text-slate-900" style={{ fontFamily: screenFontFamily(s.id) }}>{i + 1}. {findScreenFont(s.id)?.label}</span>
                  <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{s.reason}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-slate-500">다른 글꼴</span>
              <div className="flex min-w-0 flex-1"><ScreenFontPicker value={event.font} disabled={disabled} defaultLabel="기기 평소 글꼴" onChange={font => void onPatch({ font })} className="sfp-trigger--sm" /></div>
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>

      {/* 동작 */}
      <footer className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <button type="button" disabled={disabled || !event.poster || !generator} onClick={() => void onGenerate()}
            className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? '만드는 중…' : hasScreens ? '다시 만들기' : '배경 만들기'}
          </button>
          <button type="button" disabled={disabled || !hasScreens} onClick={() => void onPatch({ approved: !event.approved })} aria-pressed={event.approved}
            className={`inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${event.approved ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50'}`}>
            <CalendarClock size={16} className="shrink-0" /><span className="truncate">{event.approved ? <>적용 켜짐<span className="hidden sm:inline"> · 자동</span></> : '자동 적용'}</span>
          </button>
          <button type="button" disabled={disabled} onClick={() => void onPatch({ hidden: !event.hidden })} aria-label={event.hidden ? '다시 보이기' : '숨기기'} title={event.hidden ? '다시 보이기' : '숨기기'}
            className={`${buttonClass} h-11 w-11 px-0`}>
            {event.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          {event.approved ? `${dateLabel(event)} 동안 키오스크·포토부스에 적용되고, 끝나면 평소 배경·글꼴로 돌아갑니다.` : hint}
          {event.generation_cost ? ` 누적 비용 약 $${event.generation_cost.toFixed(2)}.` : ''}
        </p>
      </footer>
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
      <label className="space-y-1 text-xs font-semibold text-slate-600">포스터<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block h-11 w-full text-xs file:mr-2 file:h-11 file:rounded-lg file:border-0 file:bg-white file:px-3 file:text-xs file:font-semibold" /></label>
      <div className="flex items-center gap-2 lg:col-span-6">
        <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />}추가</button>
        <button type="button" onClick={onClose} className={`${buttonClass} h-11`}>취소</button>
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
    <section aria-label="이벤트 배경" className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900">이벤트 배경</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
            ACSCENT ERP의 생일 이벤트와 노션 포스터를 매일 새벽 불러옵니다. 포스터로 배경·글꼴을 만들고 &lsquo;기간 중 자동 적용&rsquo;을 켜면
            그 기간에만 키오스크·포토부스에 적용됩니다.{data ? ` ${EVENT_STORE_LABELS[data.device_store]} 매장과 공통 이벤트만 다룹니다.` : ''}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => void sync()} disabled={syncing || loading} className={`${buttonClass} h-11`}><RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />{syncing ? '불러오는 중…' : 'ERP·노션 불러오기'}</button>
          <button type="button" onClick={() => setAdding(v => !v)} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-700">{adding ? <X size={15} /> : <Plus size={15} />}직접 추가</button>
        </div>
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {([['erp', 'ACSCENT ERP'], ['notion', '노션'], ['generator', '이미지 AI']] as const).map(([key, label]) => (
            <span key={key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${data.sources[key] ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${data.sources[key] ? 'bg-emerald-500' : 'bg-amber-500'}`} />{label} {data.sources[key] ? '연결됨' : '설정 필요'}
            </span>
          ))}
          {liveNow && <span className="rounded-full bg-emerald-600 px-2.5 py-1 font-bold text-white">지금 적용 중 · {liveNow.title} ({dateLabel(liveNow)})</span>}
        </div>
      )}

      {adding && <AddEventForm onClose={() => setAdding(false)} onCreate={async body => { const { event } = await call<{ event: ScreenEvent }>(API, 'POST', body); setData(prev => prev ? { ...prev, events: [...prev.events, event].sort((a, b) => a.starts_on.localeCompare(b.starts_on)) } : prev); setNotice(`“${event.title}” 이벤트를 추가했습니다.`) }} />}
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</p>}
      {notice && <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><Check size={16} className="mt-0.5 shrink-0" />{notice}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
        {([['past', '지난 이벤트', showPast, setShowPast], ['hidden', '숨긴 이벤트', showHidden, setShowHidden]] as const).map(([key, label, value, set]) => (
          <button key={key} type="button" aria-pressed={value} onClick={() => set(!value)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {value && <Check size={13} />}{label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{events.length}건</span>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        : !events.length ? <p className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">표시할 이벤트가 없습니다. &lsquo;ERP·노션 불러오기&rsquo;를 눌러보세요.</p>
          : <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{events.map(event => (
            <EventCard key={event.id} event={event} today={today} generator={!!data?.sources.generator} busy={busy[event.id] ?? null}
              onPatch={patch => withBusy(event.id, 'patch', async () => { const { event: next } = await call<{ event: ScreenEvent }>(API, 'PATCH', { id: event.id, ...patch }); replace(next) })}
              onGenerate={() => withBusy(event.id, 'generate', async () => { const { event: next } = await call<{ event: ScreenEvent }>(`${API}/generate`, 'POST', { id: event.id }); replace(next); setNotice(`“${event.title}” 배경을 만들었습니다. 미리보기를 확인하고 자동 적용을 켜주세요.`) })}
            />
          ))}</div>}
    </section>
  )
}
