'use client'

/**
 * 포토카드 제작·관리 (관리자)
 *
 * 실제 인쇄 발주까지를 전제로 한다.
 * - 여러 장을 한 번에 올려 등록 시점에 배경 제거까지 끝낸다(부스는 이 누끼만 쓴다)
 * - 앞/뒷면 인쇄 원판을 도련 3mm 포함으로 뽑는다 (도련 없이 넘기면 재단 오차로 흰 테두리가 생긴다)
 * - 전체 카드를 zip 한 번으로 받아 인쇄소에 그대로 넘긴다
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import { cutoutPerson } from '@/lib/photobooth/segmentation'
import { cardUrl } from '@/lib/photobooth/card-code'
import {
  renderCardFront,
  renderCardBack,
  withPrintGuides,
  CARD_PRINT,
  CARD_FULL_W,
  CARD_FULL_H,
} from '@/lib/photobooth/card-print'
import {
  IdCard,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  Download,
  Package,
  Search,
  RefreshCw,
  Check,
  AlertTriangle,
} from 'lucide-react'

interface BoothCard {
  id: string
  code: string
  title: string
  event_id: string | null
  image_url: string
  cutout_url: string | null
  source_credit: string | null
  is_active: boolean
  scan_count: number
  created_at: string
  photobooth_events: { title: string } | null
}

interface EventOption {
  id: string
  title: string
}

// ======================
// 공용 헬퍼
// ======================
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 변환 실패'))), type)
  })
}

async function uploadBlob(path: string, blob: Blob, contentType: string): Promise<string> {
  const { data, error } = await supabase.storage.from('admin-content').upload(path, blob, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('admin-content').getPublicUrl(data.path)
  return urlData.publicUrl
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** 카드 한 장의 앞/뒷면 인쇄 원판 */
async function buildPrintFiles(card: BoothCard, origin: string) {
  const [frontSrc, qrDataUrl] = await Promise.all([
    loadImage(card.image_url),
    QRCode.toDataURL(cardUrl(origin, card.code), { width: 900, margin: 1 }),
  ])
  const qrImage = await loadImage(qrDataUrl)

  const front = renderCardFront(frontSrc)
  const back = renderCardBack({
    code: card.code,
    qrImage,
    cardTitle: card.title,
    eventTitle: card.photobooth_events?.title ?? null,
  })
  return { front, back }
}

// ======================
// 목록
// ======================
export function CardManager({
  events,
  onToast,
}: {
  events: EventOption[]
  onToast: (msg: string) => void
}) {
  const [cards, setCards] = useState<BoothCard[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<BoothCard | null>(null)
  const [preview, setPreview] = useState<BoothCard | null>(null)
  const [query, setQuery] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/photobooth/cards', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCards(data.cards ?? [])
    } catch (err) {
      console.error('포토카드 목록 로드 실패:', err)
      onToast('포토카드 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [onToast])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const handleToggle = async (card: BoothCard) => {
    try {
      const res = await fetch('/api/admin/photobooth/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, is_active: !card.is_active }),
      })
      if (!res.ok) throw new Error()
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, is_active: !c.is_active } : c)))
    } catch {
      onToast('상태 변경에 실패했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      const res = await fetch(`/api/admin/photobooth/cards?id=${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onToast('포토카드가 삭제되었습니다.')
      setDeleting(null)
      await fetchCards()
    } catch {
      onToast('삭제에 실패했습니다.')
    }
  }

  /** 카드 한 장의 인쇄 파일 다운로드 */
  const downloadOne = async (card: BoothCard) => {
    try {
      const { front, back } = await buildPrintFiles(card, window.location.origin)
      downloadBlob(await canvasToBlob(front), `${card.code}_front.png`)
      setTimeout(async () => {
        downloadBlob(await canvasToBlob(back), `${card.code}_back.png`)
      }, 400)
      onToast(`${card.code} 인쇄 파일을 저장했습니다.`)
    } catch (err) {
      console.error('인쇄 파일 생성 실패:', err)
      onToast('인쇄 파일 생성에 실패했습니다.')
    }
  }

  /** 필터된 카드 전체를 zip 하나로 — 인쇄소에 그대로 넘기는 용도 */
  const downloadAll = async (targets: BoothCard[]) => {
    if (targets.length === 0) return
    setBulkBusy(true)
    try {
      const zip = new JSZip()
      const origin = window.location.origin
      const readme = [
        'AC\'SCENT WOW 포토카드 인쇄 파일',
        '',
        `재단영역(실제 제작 크기): ${CARD_PRINT.trimLabel}`,
        `작업영역(파일 크기): ${CARD_PRINT.workLabel} — 사방 1mm 재단 여백 포함`,
        `해상도: 300 dpi (${CARD_FULL_W} x ${CARD_FULL_H} px)`,
        '',
        '각 카드는 <코드>_front.png(앞면) / <코드>_back.png(뒷면) 두 장입니다.',
        '(파일명이 깨지지 않도록 영문으로 지었습니다)',
        '뒷면 QR은 매장 포토부스에서 스캔됩니다. 축소하거나 덮지 마세요.',
        '',
        '수록 카드:',
        ...targets.map((c) => `  ${c.code}  ${c.title}${c.source_credit ? `  (제공 ${c.source_credit})` : ''}`),
      ].join('\n')
      zip.file('README.txt', readme)

      for (const card of targets) {
        const { front, back } = await buildPrintFiles(card, origin)
        zip.file(`${card.code}_front.png`, await canvasToBlob(front))
        zip.file(`${card.code}_back.png`, await canvasToBlob(back))
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(blob, `photocards-${new Date().toISOString().slice(0, 10)}.zip`)
      onToast(`${targets.length}장의 인쇄 파일을 저장했습니다.`)
    } catch (err) {
      console.error('일괄 인쇄 파일 생성 실패:', err)
      onToast('일괄 생성에 실패했습니다.')
    } finally {
      setBulkBusy(false)
    }
  }

  const filtered = cards.filter((c) => {
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.photobooth_events?.title ?? '').toLowerCase().includes(q) ||
      (c.source_credit ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">포토카드 제작</h2>
          <p className="text-sm text-slate-500">
            총대에게 받은 이미지로 카드를 만들고 QR을 심습니다. 등록 시 배경을 미리 제거해 두므로
            부스에서는 카드를 카메라에 비추기만 하면 바로 합성됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadAll(filtered)}
            disabled={bulkBusy || filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold bg-slate-50 text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="앞/뒷면 인쇄 원판 전체를 zip으로"
          >
            {bulkBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4" />
            )}
            인쇄 파일 전체 ({filtered.length})
          </button>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl border-2 border-slate-900 transition-all"
          >
            <Plus className="w-4 h-4" />새 포토카드
          </button>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="카드 이름 · 번호 · 이벤트 · 제공자 검색"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-slate-900"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
          {cards.length === 0 ? '등록된 포토카드가 없습니다.' : '검색 결과가 없습니다.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {filtered.map((card) => (
            <div
              key={card.id}
              className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${
                card.is_active ? '' : 'opacity-50'
              }`}
            >
              <button
                onClick={() => setPreview(card)}
                className="block w-full aspect-[52/86] bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]"
                title="인쇄 미리보기"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image_url}
                  alt={card.title}
                  className="w-full h-full object-cover"
                />
              </button>
              <div className="p-3">
                <p className="text-sm font-semibold text-slate-900 truncate">{card.title}</p>
                <p className="font-mono text-xs text-slate-500 tracking-widest mt-0.5">{card.code}</p>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {card.photobooth_events?.title ?? '상시'} · 사용 {card.scan_count}
                </p>
                {card.source_credit && (
                  <p className="text-[11px] text-slate-400 truncate">제공 {card.source_credit}</p>
                )}
                {!card.cutout_url && (
                  <p className="mt-1 text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> 누끼 없음
                  </p>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => handleToggle(card)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      card.is_active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={card.is_active ? '비활성화' : '활성화'}
                  >
                    {card.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => downloadOne(card)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                    title="앞/뒷면 인쇄 원판 받기"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(card)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors ml-auto"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <CardFormModal
          events={events}
          onClose={() => setAdding(false)}
          onSaved={async (msg) => {
            onToast(msg)
            setAdding(false)
            await fetchCards()
          }}
        />
      )}

      {preview && <PrintPreviewModal card={preview} onClose={() => setPreview(null)} />}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">포토카드 삭제</h3>
            <p className="text-slate-600 mb-4">
              <span className="font-semibold">{deleting.title}</span>({deleting.code})을(를)
              삭제할까요? 이미 배포된 카드의 QR은 더 이상 인식되지 않습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ======================
// 인쇄 미리보기 (재단선·안전영역 확인)
// ======================
function PrintPreviewModal({ card, onClose }: { card: BoothCard; onClose: () => void }) {
  const [front, setFront] = useState<string | null>(null)
  const [back, setBack] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const files = await buildPrintFiles(card, window.location.origin)
        if (cancelled) return
        setFront(withPrintGuides(files.front).toDataURL('image/png'))
        setBack(withPrintGuides(files.back).toDataURL('image/png'))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '미리보기 생성 실패')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [card])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-900">
            {card.title} <span className="font-mono text-sm text-slate-500">{card.code}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          파일 크기는 작업영역 <span className="font-semibold">{CARD_PRINT.workLabel}</span>이고,{' '}
          <span className="text-red-500 font-semibold">빨간 선</span>이 재단영역(
          {CARD_PRINT.trimLabel})입니다. 도련이 사방 1mm뿐이라 배경은 파일 끝까지 채워야 하고,
          QR·번호 같은 중요한 요소는{' '}
          <span className="text-blue-600 font-semibold">파란 선</span>(안전영역) 안쪽에 있어야
          재단 오차에도 잘리지 않습니다. 실제 내려받는 파일에는 이 선이 없습니다.
        </p>

        {error ? (
          <p className="text-sm text-red-500 py-10 text-center">{error}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '앞면', src: front },
              { label: '뒷면', src: back },
            ].map(({ label, src }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-slate-500 mb-1.5">{label}</p>
                {src ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={src} alt={label} className="w-full rounded-lg border border-slate-200" />
                ) : (
                  <div className="aspect-[54/88] flex items-center justify-center bg-slate-50 rounded-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ======================
// 등록 모달 — 여러 장 한 번에
// ======================
type QueueStatus = 'pending' | 'cutting' | 'ready' | 'failed' | 'saving' | 'saved'

interface QueueItem {
  id: string
  file: File
  title: string
  preview: string
  cutout: HTMLCanvasElement | null
  cutoutPreview: string | null
  status: QueueStatus
  error?: string
  /** 카드 비율과 많이 다른 이미지는 앞면이 크게 잘린다 */
  aspectWarning?: string
}

function CardFormModal({
  events,
  onClose,
  onSaved,
}: {
  events: EventOption[]
  onClose: () => void
  onSaved: (msg: string) => Promise<void>
}) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [eventId, setEventId] = useState('')
  const [credit, setCredit] = useState('')
  const [tighten, setTighten] = useState(0.5)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const runCutout = useCallback(async (item: QueueItem, tightenValue: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'cutting', error: undefined } : i))
    )
    try {
      const img = await loadImage(item.preview)
      const result = await cutoutPerson(img, { tighten: tightenValue })
      if (result.coverage < 0.02 || result.coverage > 0.97) {
        throw new Error('인물을 제대로 찾지 못했습니다')
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                cutout: result.canvas,
                cutoutPreview: result.canvas.toDataURL('image/png'),
                status: 'ready',
              }
            : i
        )
      )
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                cutout: null,
                cutoutPreview: null,
                status: 'failed',
                error: err instanceof Error ? err.message : '배경 제거 실패',
              }
            : i
        )
      )
    }
  }, [])

  const addFiles = async (files: FileList) => {
    setError('')
    const created: QueueItem[] = []
    for (const file of Array.from(files)) {
      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      // 카드 비율(52:86 = 0.60)과 크게 다르면 앞면 cover 시 많이 잘려나간다
      const probe = await loadImage(preview)
      const ratio = (probe.naturalWidth || probe.width) / (probe.naturalHeight || probe.height)
      const aspectWarning =
        ratio > 0.82
          ? '가로가 넓은 이미지예요. 카드 앞면에서 좌우가 크게 잘립니다'
          : ratio < 0.43
            ? '세로가 매우 긴 이미지예요. 카드 앞면에서 위아래가 잘립니다'
            : undefined

      created.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        title: file.name.replace(/\.[^.]+$/, '').slice(0, 100),
        preview,
        cutout: null,
        cutoutPreview: null,
        status: 'pending',
        aspectWarning,
      })
    }
    setItems((prev) => [...prev, ...created])
    // 한 장씩 순차 처리 (동시에 돌리면 WASM 세그멘터가 병목이 된다)
    for (const item of created) {
      await runCutout(item, tighten)
    }
  }

  const handleSubmit = async () => {
    const ready = items.filter((i) => i.status === 'ready' && i.cutout)
    if (ready.length === 0) {
      setError('배경 제거가 끝난 카드가 없습니다.')
      return
    }
    setSaving(true)
    setError('')
    const codes: string[] = []
    try {
      for (const item of ready) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'saving' } : i)))
        const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const ext = item.file.name.split('.').pop() || 'png'
        const imageUrl = await uploadBlob(
          `photobooth/cards/${stamp}.${ext}`,
          item.file,
          item.file.type
        )
        const cutoutUrl = await uploadBlob(
          `photobooth/cards/${stamp}_cutout.png`,
          await canvasToBlob(item.cutout!),
          'image/png'
        )
        const res = await fetch('/api/admin/photobooth/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title.trim() || '무제 카드',
            image_url: imageUrl,
            cutout_url: cutoutUrl,
            event_id: eventId || null,
            source_credit: credit.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '등록 실패')
        codes.push(data.card.code)
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'saved' } : i)))
      }
      await onSaved(`포토카드 ${codes.length}장 등록 완료 (${codes.join(', ')})`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.')
      setSaving(false)
    }
  }

  const readyCount = items.filter((i) => i.status === 'ready').length
  const failedCount = items.filter((i) => i.status === 'failed').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <IdCard className="w-5 h-5" /> 새 포토카드
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">소속 이벤트</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-base focus:outline-none focus:border-slate-900 bg-white"
            >
              <option value="">상시</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              이미지 제공자
            </label>
            <input
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              maxLength={200}
              placeholder="예: @handle (총대)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-base focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          이 화면에서 등록하는 카드 전체에 같은 값이 적용됩니다.
        </p>

        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-700">
            배경 제거 강도{' '}
            <span className="font-normal text-slate-400">
              (후광이 남으면 올리고, 인물이 깎이면 내리세요)
            </span>
          </label>
          <span className="font-mono text-xs text-slate-500">{tighten.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.25}
          max={0.8}
          step={0.01}
          value={tighten}
          onChange={(e) => setTighten(Number(e.target.value))}
          className="w-full accent-slate-900 mb-4"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 transition-colors p-4 mb-4 text-sm text-slate-500"
        >
          클릭해서 이미지 선택 — 여러 장 한 번에 가능 (인물이 크게 나온 사진일수록 결과가 좋습니다)
        </button>

        {items.length > 0 && (
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt="원본"
                  className="w-14 h-20 object-cover rounded-lg shrink-0"
                />
                <div className="w-14 h-20 shrink-0 rounded-lg bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#fff_0%_50%)] bg-[length:10px_10px] flex items-center justify-center">
                  {item.status === 'cutting' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : item.cutoutPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.cutoutPreview} alt="누끼" className="w-full h-full object-contain" />
                  ) : (
                    <X className="w-4 h-4 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    value={item.title}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((i) => (i.id === item.id ? { ...i, title: e.target.value } : i))
                      )
                    }
                    maxLength={100}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-slate-900"
                  />
                  <p className="mt-1 text-xs">
                    {item.status === 'ready' && (
                      <span className="text-green-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> 배경 제거 완료
                      </span>
                    )}
                    {item.status === 'cutting' && <span className="text-slate-400">처리 중...</span>}
                    {item.status === 'saving' && <span className="text-slate-400">등록 중...</span>}
                    {item.status === 'saved' && <span className="text-green-600">등록됨</span>}
                    {item.status === 'failed' && (
                      <span className="text-red-500">{item.error}</span>
                    )}
                  </p>
                  {item.aspectWarning && (
                    <p className="mt-0.5 text-[11px] text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {item.aspectWarning}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => runCutout(item, tighten)}
                    disabled={saving || item.status === 'cutting'}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-30"
                    title="현재 강도로 다시 시도"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                    disabled={saving}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30"
                    title="목록에서 빼기"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || readyCount === 0}
            className="flex-1 py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {readyCount}장 등록
            {failedCount > 0 && ` (실패 ${failedCount}장 제외)`}
          </button>
        </div>
      </div>
    </div>
  )
}
