'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Check, ChevronLeft, ChevronRight, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { DEFAULT_DEVICE_SETTINGS, type BackgroundSnapshot, type DeviceSettings, type ScreenBackground, type ScreenTarget } from '@/lib/screen-backgrounds/types'
import { DEFAULT_RETRO_FONT, findScreenFont, screenFontFamily } from '@/lib/screen-fonts/catalog'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import { ScreenFontPicker } from '@/lib/screen-fonts/FontPicker'
import { toBoothTheme } from '@/lib/screen-backgrounds/theme'

const API = '/api/admin/screen-backgrounds'
const PAGE_SIZE = 12
const TARGETS: Record<ScreenTarget, { label: string; size: string; width: number; height: number }> = {
  booth: { label: '포토부스', size: '1920 × 1080 · 가로 16:9', width: 1920, height: 1080 },
  kiosk: { label: '키오스크', size: '1080 × 1920 · 세로 9:16', width: 1080, height: 1920 },
}
const PALETTES: { id: ScreenBackground['palette']; label: string }[] = [
  { id: 'wanted', label: 'Wanted Sans · 또렷한 산세리프' },
  { id: 'jua', label: 'Jua · 둥글고 귀여운 제목' },
  { id: 'kirang', label: 'Kirang Haerang · 자유로운 손글씨' },
  { id: 'serif', label: 'S-Core Dream Bold · 굵은 고딕' },
  { id: 'soft', label: 'S-Core Dream · 부드러운 고딕' },
]
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
type Draft = Omit<ScreenBackground, 'id'>

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다. 다시 시도해주세요.'
}

async function request<T>(method = 'GET', body?: unknown, query = ''): Promise<T> {
  const response = await fetch(`${API}${query}`, {
    method,
    cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || (response.status === 401 || response.status === 403
      ? '관리자 로그인이 필요합니다. 다시 로그인해주세요.'
      : `요청에 실패했습니다. (${response.status})`))
  }
  if (!data) throw new Error('서버 응답을 읽지 못했습니다. 다시 시도해주세요.')
  return data as T
}

function newDraft(target: ScreenTarget, items: ScreenBackground[]): Draft {
  return {
    target, title: '', image_url: '', thumbnail_url: '', collection: 'custom', palette: 'wanted',
    tone: 'light', ink: '#173a5e', accent: '#d86570', base: '#fff8ed', is_active: true,
    display_order: Math.min(100000, Math.max(0, ...items.filter(item => item.target === target).map(item => item.display_order)) + 10),
  }
}

async function inspectFile(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('PNG, JPG, WebP 이미지만 올릴 수 있습니다.')
  if (file.size > 12 * 1024 * 1024) throw new Error('이미지는 12MB 이하로 올려주세요.')
  if (!file.size) throw new Error('빈 파일은 올릴 수 없습니다.')
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) } catch { throw new Error('이미지를 읽지 못했습니다. 다른 이미지 파일을 선택해주세요.') }
  const { width, height } = bitmap
  bitmap.close()
  if (width < 320 || height < 320) throw new Error('가로·세로가 각각 320px 이상인 이미지를 선택해주세요.')
  if (width * height > 24_000_000 || Math.max(width, height) > 8192) throw new Error('이미지가 너무 큽니다. 2400만 화소 이하, 한 변 8192px 이하로 줄여주세요.')
  return { width, height }
}

async function uploadImages(file: File, target: ScreenTarget, uploadedPaths: string[]) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = target === 'booth' ? 640 : 270
  canvas.height = target === 'booth' ? 360 : 480
  const context = canvas.getContext('2d')
  if (!context) { bitmap.close(); throw new Error('미리보기 이미지를 만들 수 없습니다.') }
  const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height)
  context.drawImage(bitmap, (canvas.width - bitmap.width * scale) / 2, (canvas.height - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale)
  bitmap.close()
  const thumbnail = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('미리보기 생성에 실패했습니다.')), 'image/webp', 0.82))
  const token = crypto.randomUUID()
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png'
  const bucket = supabase.storage.from('admin-content')
  async function upload(path: string, value: Blob) {
    const { data, error } = await bucket.upload(path, value, { contentType: value.type, cacheControl: '31536000', upsert: false })
    if (error) throw new Error(`이미지 업로드 실패: ${error.message}`)
    uploadedPaths.push(data.path)
    return bucket.getPublicUrl(data.path).data.publicUrl
  }
  const image_url = await upload(`screen-backgrounds/${target}/${token}.${extension}`, file)
  const thumbnail_url = await upload(`screen-backgrounds/${target}/${token}-thumb.webp`, thumbnail)
  return { image_url, thumbnail_url }
}

function Thumbnail({ background }: { background: ScreenBackground }) {
  const [failed, setFailed] = useState(false)
  const [src, setSrc] = useState(background.thumbnail_url || background.image_url)
  return (
    <div className="flex h-52 items-center justify-center overflow-hidden bg-slate-100 p-2" style={{ backgroundColor: background.base }}>
      {failed ? <span className="rounded bg-white px-3 py-2 text-xs text-red-700">이미지를 불러오지 못했습니다</span> : (
        // Native lazy loading avoids downloading every full-resolution background in the catalog.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={background.title} loading="lazy" decoding="async" className="h-full max-w-full rounded object-contain" onError={() => {
          if (src !== background.image_url) setSrc(background.image_url)
          else setFailed(true)
        }} />
      )}
    </div>
  )
}

function BackgroundEditor({ background, draft: initialDraft, onClose, onSaved, onMutationStart, onMutationEnd }: {
  background: ScreenBackground | null
  draft: Draft
  onClose: () => void
  onSaved: () => Promise<void>
  onMutationStart: () => void
  onMutationEnd: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState(initialDraft)
  const [file, setFile] = useState<File | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [objectUrl, setObjectUrl] = useState('')
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selectionVersion = useRef(0)
  const busy = saving || checking
  useEffect(() => { dialog.current?.showModal() }, [])
  useEffect(() => {
    if (!file) { setObjectUrl(''); return }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(previous => ({ ...previous, [key]: value }))
  const spec = TARGETS[draft.target]
  const preview = toBoothTheme({ id: background?.id || 'preview', ...draft })
  const ratioWarning = dimensions && Math.abs(dimensions.width / dimensions.height - spec.width / spec.height) > 0.04
  const previewUrl = objectUrl || draft.image_url

  async function chooseFile(candidate: File | undefined) {
    if (!candidate) return
    const version = ++selectionVersion.current
    setChecking(true)
    setError('')
    // Do not silently retain a previously valid upload after the replacement fails validation.
    setFile(null)
    setDimensions(null)
    try {
      const size = await inspectFile(candidate)
      if (version !== selectionVersion.current) return
      setFile(candidate)
      setDimensions(size)
    } catch (err) {
      if (version === selectionVersion.current) setError(errorMessage(err))
    } finally {
      if (version === selectionVersion.current) setChecking(false)
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!draft.title.trim()) { setError('배경 이름을 입력해주세요.'); return }
    if (!file && !draft.image_url) { setError('배경 이미지를 선택해주세요.'); return }
    if (![draft.ink, draft.accent, draft.base].every(color => /^#[0-9a-f]{6}$/i.test(color))) { setError('색상은 #으로 시작하는 6자리 HEX 값으로 입력해주세요.'); return }
    if (!Number.isInteger(draft.display_order) || Math.abs(draft.display_order) > 100000) { setError('표시 순서는 -100000부터 100000 사이의 정수로 입력해주세요.'); return }
    setSaving(true)
    setError('')
    onMutationStart()
    const uploadedPaths: string[] = []
    let persisted = false
    try {
      const images = file ? await uploadImages(file, draft.target, uploadedPaths) : {}
      const payload = { ...draft, ...images, title: draft.title.trim(), collection: draft.collection.trim() || 'custom' }
      await request(background ? 'PATCH' : 'POST', background ? { ...payload, id: background.id } : payload)
      persisted = true
      await onSaved()
      onClose()
    } catch (err) {
      if (!persisted && uploadedPaths.length) {
        // Only our newly uploaded files are cleaned up; replaced/shared originals are never removed here.
        await supabase.storage.from('admin-content').remove(uploadedPaths).catch(() => undefined)
      }
      setError(errorMessage(err))
    } finally { setSaving(false); onMutationEnd() }
  }

  return (
    <dialog ref={dialog} aria-labelledby="background-editor-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }} className="m-auto max-h-[92dvh] w-[min(960px,calc(100%_-_32px))] max-w-none overflow-y-auto rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
      <form onSubmit={save}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div><h2 id="background-editor-title" className="text-lg font-bold">{background ? '배경 수정' : '새 배경 추가'}</h2><p className="mt-1 text-xs text-slate-500">배경 이미지와 함께 사용할 글꼴·색상을 설정하세요.</p></div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="닫기" className={buttonClass}><X size={18} /></button>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="relative mx-auto flex items-center justify-center overflow-hidden bg-cover bg-center p-6 text-center" style={{ width: draft.target === 'kiosk' ? 'min(100%, 236px)' : '100%', aspectRatio: `${spec.width}/${spec.height}`, backgroundColor: draft.base, backgroundImage: previewUrl ? `url(${JSON.stringify(previewUrl)})` : undefined }}>
                <div style={{ color: draft.ink, fontFamily: preview.displayFont, fontWeight: preview.displayWeight, letterSpacing: preview.displayTracking }}>
                  <p className="text-[10px] tracking-widest">AC&apos;SCENT WOW</p>
                  <p className="mt-4 text-2xl">오늘의 설렘을<br />함께 남겨요</p>
                  <span className="mt-5 inline-block rounded-full border px-4 py-2 text-xs" style={{ backgroundColor: draft.base, borderColor: draft.accent, color: draft.accent }}>글꼴·색상 예시</span>
                </div>
              </div>
              <p className="border-t border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">가독성 확인용 미리보기입니다. 실제 화면의 문구·배치는 다를 수 있어요.</p>
            </div>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-slate-500">
              <ImagePlus className="mx-auto mb-2 h-6 w-6 text-slate-500" />
              <span className="text-sm font-bold">{background ? '이미지 교체' : '이미지 선택'}</span>
              <input aria-label="배경 이미지" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="mt-3 block w-full text-xs text-slate-600" onChange={event => { void chooseFile(event.target.files?.[0]); event.target.value = '' }} />
            </label>
            <p className="text-xs leading-relaxed text-slate-500">권장 {spec.size}<br />PNG · JPG · WebP / 최대 12MB<br />이미지는 저장을 눌렀을 때 업로드됩니다.</p>
            {checking && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" />이미지 확인 중…</p>}
            {file && dimensions && <p className="break-all text-xs text-slate-600">{file.name} · {dimensions.width} × {dimensions.height}px</p>}
            {ratioWarning && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">권장 비율과 다릅니다. 화면을 채울 때 이미지 가장자리가 잘릴 수 있으니 중요한 요소는 중앙에 배치해주세요.</p>}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5 text-sm font-semibold">적용 화면<select value={draft.target} disabled={!!background || busy} onChange={event => update('target', event.target.value as ScreenTarget)} className={inputClass}>{Object.entries(TARGETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
              <label className="space-y-1.5 text-sm font-semibold">배경 톤<select value={draft.tone} disabled={busy} onChange={event => update('tone', event.target.value as Draft['tone'])} className={inputClass}><option value="light">밝은 배경</option><option value="dark">어두운 배경</option></select></label>
            </div>
            <label className="block space-y-1.5 text-sm font-semibold">배경 이름<input required maxLength={80} value={draft.title} disabled={busy} onChange={event => update('title', event.target.value)} placeholder="예: 10월 생카 · 체리 리본" className={inputClass} /></label>
            <label className="block space-y-1.5 text-sm font-semibold">컬렉션<input maxLength={80} value={draft.collection} disabled={busy} onChange={event => update('collection', event.target.value)} placeholder="custom" className={inputClass} /></label>
            <label className="block space-y-1.5 text-sm font-semibold">글꼴 조합<select value={draft.palette} disabled={busy} onChange={event => update('palette', event.target.value as Draft['palette'])} className={inputClass}>{PALETTES.map(palette => <option key={palette.id} value={palette.id}>{palette.label}</option>)}</select></label>
            <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 text-sm font-semibold">화면 색상</legend>
              {([{ key: 'ink', label: '글자색' }, { key: 'accent', label: '강조색' }, { key: 'base', label: '바탕색' }] as const).map(({ key, label }) => <label key={key} className="flex items-center gap-3 text-sm"><span className="w-14 shrink-0 text-slate-600">{label}</span><input type="color" aria-label={`${label} 선택`} value={/^#[0-9a-f]{6}$/i.test(draft[key]) ? draft[key] : '#ffffff'} onChange={event => update(key, event.target.value)} className="h-10 w-12 cursor-pointer rounded border border-slate-200 p-1" /><input aria-label={`${label} HEX`} value={draft[key]} maxLength={7} onChange={event => update(key, event.target.value)} className={`${inputClass} font-mono`} /></label>)}
            <p className="pt-1 text-xs leading-relaxed text-slate-500">기존 디자인에서는 글꼴 조합·색상이 화면 전체에 적용됩니다. 레트로 디자인에서는 창·버튼 색이 고정되고, 글자색은 바탕화면 아이콘 이름, 강조색은 창 뒤 겹친 창 같은 장식, 바탕색은 그림이 없는 빈 바탕에 쓰입니다(레트로 글꼴은 위 기기 카드의 ‘글꼴’에서 고릅니다). 기기 카드에서 글꼴을 고르면 두 디자인 모두 그 글꼴이 우선합니다.</p></fieldset>
            <label className="block space-y-1.5 text-sm font-semibold">표시 순서<input type="number" min={-100000} max={100000} step={1} required value={Number.isNaN(draft.display_order) ? '' : draft.display_order} disabled={busy} onChange={event => update('display_order', event.target.valueAsNumber)} className={inputClass} /><span className="block text-xs font-normal text-slate-500">작은 숫자부터 목록에 표시됩니다.</span></label>
            <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm"><input type="checkbox" checked={draft.is_active} disabled={busy} onChange={event => update('is_active', event.target.checked)} className="h-4 w-4 accent-slate-900" />기기 배경 선택 목록에 노출</label>
            {background && <p className="text-xs text-slate-500">현재 적용 중인 배경을 숨기면 같은 화면의 다른 노출 배경으로 전환됩니다.</p>}
          </div>
        </div>
        {error && <div role="alert" className="mx-6 mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4"><button type="button" disabled={busy} onClick={onClose} className={buttonClass}>취소</button><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />}{saving ? '저장 중…' : '저장'}</button></div>
      </form>
    </dialog>
  )
}

export function ScreenBackgroundManager({ initialTarget }: { initialTarget?: ScreenTarget }) {
  const [snapshot, setSnapshot] = useState<BackgroundSnapshot>({ backgrounds: [], selected: { booth: null, kiosk: null }, settings: { booth: DEFAULT_DEVICE_SETTINGS, kiosk: DEFAULT_DEVICE_SETTINGS } })
  const [target, setTarget] = useState<ScreenTarget | 'all'>(initialTarget || 'all')
  const [search, setSearch] = useState('')
  const [visibility, setVisibility] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncError, setSyncError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState<{ background: ScreenBackground | null; draft: Draft } | null>(null)
  const requestSequence = useRef(0)
  const mutationRevision = useRef(0)
  const mutationInFlight = useRef(false)
  const foregroundRequest = useRef<number | null>(null)
  const refresh = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    // Polling never interrupts a write or turns the editor/card controls into a loading state.
    if (quiet && (mutationInFlight.current || foregroundRequest.current !== null)) return
    const sequence = ++requestSequence.current
    const revision = mutationRevision.current
    if (!quiet) {
      foregroundRequest.current = sequence
      setLoading(true)
      setError('')
    }
    const isCurrent = () => sequence === requestSequence.current && revision === mutationRevision.current
    try {
      const data = await request<BackgroundSnapshot>()
      if (!Array.isArray(data.backgrounds) || !data.selected) throw new Error('배경 목록 응답 형식이 올바르지 않습니다.')
      if (!isCurrent()) return
      setSnapshot(data)
      setSyncError('')
    } catch (err) {
      if (isCurrent()) {
        if (quiet) setSyncError(errorMessage(err))
        else setError(errorMessage(err))
      }
    } finally {
      if (foregroundRequest.current === sequence) {
        foregroundRequest.current = null
        setLoading(false)
      }
    }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const sync = () => { void refresh({ quiet: true }) }
    const interval = window.setInterval(sync, 15_000)
    window.addEventListener('focus', sync)
    window.addEventListener('online', sync)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', sync)
      window.removeEventListener('online', sync)
      requestSequence.current += 1
    }
  }, [refresh])
  useEffect(() => { setTarget(initialTarget || 'all'); setPage(1) }, [initialTarget])
  const beginMutation = useCallback(() => {
    mutationInFlight.current = true
    mutationRevision.current += 1
    // A GET begun before this write must not restore an old selection after the write finishes.
    requestSequence.current += 1
    setBusy(true)
    setError('')
    setNotice('')
  }, [])
  const endMutation = useCallback(() => {
    mutationInFlight.current = false
    setBusy(false)
  }, [])
  const filtered = useMemo(() => snapshot.backgrounds.filter(item => {
    const query = search.trim().toLocaleLowerCase()
    return (target === 'all' || item.target === target)
      && (visibility === 'all' || item.is_active === (visibility === 'active'))
      && (!query || `${item.title} ${item.collection} ${item.id}`.toLocaleLowerCase().includes(query))
  }).sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title)), [snapshot.backgrounds, target, search, visibility])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const items = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  async function mutate(method: string, body: unknown, message: string, query = '') {
    if (mutationInFlight.current) return
    beginMutation()
    try {
      await request(method, body, query)
      setNotice(message)
      await refresh()
    } catch (err) { setError(errorMessage(err)) } finally { endMutation() }
  }

  function remove(background: ScreenBackground) {
    const selected = snapshot.selected[background.target] === background.id
    if (!window.confirm(`“${background.title}” 배경을 삭제할까요?\n목록에서 영구 제거되며 기본 제공 배경도 자동으로 복원되지 않습니다.${selected ? '\n현재 화면은 다른 노출 배경으로 전환됩니다. 남은 배경이 없으면 기본 바탕만 표시됩니다.' : ''}`)) return
    void mutate('DELETE', undefined, '배경을 삭제했습니다.', `?id=${encodeURIComponent(background.id)}`)
  }

  return (
    <section aria-label="화면 배경 관리" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-lg font-bold text-slate-900">화면 배경 라이브러리</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">배경 추가·교체, 글꼴·색상 수정, 순서 변경을 한곳에서 관리합니다. 적용한 배경은 해당 기기에 자동 반영됩니다.</p><p className="mt-1 text-xs text-slate-500">같은 종류의 기기는 선택한 배경을 공유하며, 현재 적용 상태는 15초마다 자동 갱신됩니다.</p></div>
        <div className="flex gap-2"><button onClick={() => { setNotice(''); void refresh() }} disabled={loading || busy} className={buttonClass}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />새로고침</button><button onClick={() => setEditor({ background: null, draft: newDraft(target === 'all' ? 'booth' : target, snapshot.backgrounds) })} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"><Plus size={17} />배경 추가</button></div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {(['booth', 'kiosk'] as const).map(key => {
          const selected = snapshot.backgrounds.find(item => item.id === snapshot.selected[key])
          const settings: DeviceSettings = snapshot.settings?.[key] ?? DEFAULT_DEVICE_SETTINGS
          const save = (patch: Partial<DeviceSettings>, message: string) => void mutate('PUT', { target: key, ...patch }, message)
          const previewFont = settings.font ?? (settings.ui === 'retro' ? DEFAULT_RETRO_FONT : null)
          return <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">{TARGETS[key].label} 현재 적용 · {TARGETS[key].size}</p><p className="mt-1 truncate text-sm font-bold text-slate-900">{loading && !snapshot.backgrounds.length ? '불러오는 중…' : selected?.title || '선택 가능한 배경 없음 · 기본 바탕'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
              <span className="w-16 shrink-0 text-xs font-semibold text-slate-600">화면 디자인</span>
              <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200" role="group" aria-label={`${TARGETS[key].label} 화면 디자인`}>
                {([['classic', '기존'], ['retro', '레트로']] as const).map(([ui, label]) => <button key={ui} type="button" aria-pressed={settings.ui === ui} disabled={busy || loading || settings.ui === ui} onClick={() => save({ ui }, `${TARGETS[key].label} 화면 디자인을 ‘${label}’(으)로 바꿨습니다.`)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${settings.ui === ui ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'} disabled:cursor-default`}>{label}</button>)}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="w-16 shrink-0 text-xs font-semibold text-slate-600">글꼴</span>
              <ScreenFontPicker value={settings.font} disabled={busy || loading} defaultFont={settings.ui === 'retro' ? DEFAULT_RETRO_FONT : null} defaultLabel={settings.ui === 'retro' ? '기본 (에스코어드림)' : '기본 (배경의 글꼴 조합)'} onChange={font => save({ font }, `${TARGETS[key].label} 글꼴을 ‘${findScreenFont(font)?.label ?? '기본'}’(으)로 바꿨습니다.`)} className="sfp-trigger--sm" />
            </div>
            <ScreenFontFace ids={[previewFont]} />
            <p className="mt-2 truncate rounded-md bg-white px-3 py-2 text-base text-slate-800 ring-1 ring-slate-200" style={{ fontFamily: screenFontFamily(previewFont) }}>오늘의 최애, 어떤 향으로 기억할까요? ACSCENT 123</p>
          </div>
        })}
      </div>

      {error && <div role="alert" className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} />{error}<button onClick={() => void refresh()} disabled={loading || busy} className="ml-auto font-bold underline">다시 불러오기</button></div>}
      {notice && <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><Check size={17} />{notice}</p>}
      {syncError && <p role="status" className="mt-3 text-xs text-amber-700">자동 동기화가 지연되고 있습니다. 마지막으로 불러온 목록을 표시합니다. {syncError}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" aria-label="화면 필터">
          {(['all', 'booth', 'kiosk'] as const).map(key => <button key={key} aria-pressed={target === key} onClick={() => { setTarget(key); setPage(1) }} className={`rounded-md px-3 py-2 text-sm font-semibold ${target === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{key === 'all' ? '전체' : TARGETS[key].label} <span className="ml-1 text-xs opacity-70">{snapshot.backgrounds.filter(item => key === 'all' || item.target === key).length}</span></button>)}
        </div>
        <div className="relative min-w-48 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input aria-label="배경 검색" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="이름·컬렉션 검색" className={`${inputClass} pl-9`} /></div>
        <select aria-label="노출 상태 필터" value={visibility} onChange={event => { setVisibility(event.target.value); setPage(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="all">모든 상태</option><option value="active">노출 중</option><option value="hidden">숨김</option></select>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">검색 결과 {filtered.length}개 · 노출은 기기의 선택 목록에 보이는 상태입니다. 실제 화면 변경은 ‘화면에 적용’을 눌러주세요. 기본 제공 배경도 수정·삭제할 수 있습니다.</p>

      {loading && !snapshot.backgrounds.length ? <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />배경을 불러오는 중…</div> : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-busy={loading || busy}>
          {items.map(background => {
            const selected = snapshot.selected[background.target] === background.id
            return <article key={background.id} className={`overflow-hidden rounded-xl border ${selected ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'}`}>
              <Thumbnail key={`${background.thumbnail_url}:${background.image_url}`} background={background} />
              <div className="space-y-3 p-3">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]"><span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{TARGETS[background.target].label}</span>{selected && <span className="rounded bg-emerald-50 px-2 py-1 font-bold text-emerald-700">현재 적용</span>}{!background.is_active && <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">숨김</span>}<span className="ml-auto text-slate-400">순서 {background.display_order}</span></div>
                <div><h3 title={background.title} className="truncate text-sm font-bold text-slate-900">{background.title}</h3><p title={background.collection} className="mt-1 truncate text-xs text-slate-500">{background.collection} · {PALETTES.find(item => item.id === background.palette)?.label.split(' · ')[0]}</p></div>
                <button disabled={busy || loading || selected || !background.is_active} onClick={() => void mutate('PUT', { target: background.target, id: background.id }, `${TARGETS[background.target].label} 배경을 “${background.title}”(으)로 변경했습니다.`)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">{selected && <Check size={14} />}{selected ? '현재 적용 중' : !background.is_active ? '노출 후 적용 가능' : '화면에 적용'}</button>
                <div className="flex items-center gap-1"><button onClick={() => setEditor({ background, draft: { ...background } })} disabled={busy || loading} className={`${buttonClass} flex-1 px-2 text-xs`}><Pencil size={13} />수정</button><button onClick={() => void mutate('PATCH', { id: background.id, is_active: !background.is_active }, background.is_active ? '배경을 선택 목록에서 숨겼습니다.' : '배경을 선택 목록에 표시했습니다.')} disabled={busy || loading} className={`${buttonClass} flex-1 px-2 text-xs`}>{background.is_active ? <EyeOff size={13} /> : <Eye size={13} />}{background.is_active ? '숨기기' : '노출'}</button><button onClick={() => remove(background)} disabled={busy || loading} aria-label={`${background.title} 삭제`} className={`${buttonClass} px-2 text-red-600 hover:bg-red-50`}><Trash2 size={15} /></button></div>
              </div>
            </article>
          })}
        </div>
      )}
      {!loading && !items.length && <div className="py-14 text-center text-sm text-slate-500">{snapshot.backgrounds.length ? '조건에 맞는 배경이 없습니다.' : error ? '목록을 불러오지 못했습니다. 다시 불러오기를 눌러주세요.' : '등록된 배경이 없습니다. 새 배경을 추가해주세요.'}</div>}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500"><span>{filtered.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} / ${filtered.length}개` : '0개'}</span><div className="flex items-center gap-3"><button aria-label="이전 배경 페이지" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className={buttonClass}><ChevronLeft size={16} /></button><span>{currentPage} / {pages}</span><button aria-label="다음 배경 페이지" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className={buttonClass}><ChevronRight size={16} /></button></div></div>
      {editor && <BackgroundEditor background={editor.background} draft={editor.draft} onClose={() => setEditor(null)} onMutationStart={beginMutation} onMutationEnd={endMutation} onSaved={async () => { setNotice(editor.background ? '배경을 수정했습니다.' : '새 배경을 추가했습니다. 화면에 적용을 눌러 사용할 수 있습니다.'); await refresh() }} />}
    </section>
  )
}
