'use client'

/**
 * 포토부스 관리 (관리자) — 생카(생일카페) 이벤트 특화
 * - 생카 이벤트 등록: 주인공·주최자 크레딧·해시태그·테마색·기간 → 부스 화면 자동 테마 적용
 * - 이용권 발급: 상품 구매 특전 6자리 코드 (부스 키패드 입력, 이벤트별 발급/사용 통계)
 * - 프레임/템플릿: 이벤트 귀속(행사 종료 시 자동 미노출) 또는 상시
 * - 이미지: admin-content 버킷 직접 업로드, 메타데이터: /api/admin/photobooth* (service-role)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { CardManager } from './CardManager'
import { supabase } from '@/lib/supabase/client'
import QRCode from 'qrcode'
import {
  Camera,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Loader2,
  ExternalLink,
  QrCode,
  Download,
  X,
  Cake,
  Ticket,
  Pencil,
  Ban,
  KeyRound,
} from 'lucide-react'

// ======================
// Types
// ======================
interface BoothEvent {
  id: string
  title: string
  artist: string | null
  organizer: string | null
  hashtag: string | null
  greeting: string | null
  theme_color: string | null
  cover_image_url: string | null
  starts_on: string | null
  ends_on: string | null
  is_active: boolean
  created_at: string
}

interface BoothAsset {
  id: string
  kind: 'frame' | 'template'
  title: string
  image_url: string
  is_active: boolean
  display_order: number
  event_id: string | null
  created_at: string
}

interface BoothPass {
  id: string
  code: string
  status: 'issued' | 'used' | 'void'
  created_at: string
  used_at: string | null
  note: string | null
  event_id: string | null
  photobooth_events: { title: string } | null
}

interface PassStats {
  issued_today: number
  used_today: number
  by_event: Record<string, { issued: number; used: number }>
}

const KIND_META = {
  frame: {
    label: '프레임',
    hint: '4x6 인화지 전체를 덮는 오버레이 PNG (1200x1800px, 사진이 보일 영역은 투명 — 네컷은 2x2 그리드)',
  },
  template: {
    label: '주인공 컷 (템플릿)',
    hint: '최애와 찍기용 4:3 가로 이미지 (1200x900px 권장) — 인물을 한쪽으로 몰고 반대편을 빈 배경으로 두면, 그 빈자리에 손님이 합성돼 옆에 선 한 장이 됩니다',
  },
} as const

/** 오늘(로컬=KST) 기준 이벤트 진행 여부 */
function isEventLive(event: BoothEvent): boolean {
  if (!event.is_active) return false
  const today = new Date().toISOString().slice(0, 10)
  if (event.starts_on && event.starts_on > today) return false
  if (event.ends_on && event.ends_on < today) return false
  return true
}

async function uploadBoothImage(pathPrefix: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png'
  const filePath = `photobooth/${pathPrefix}/${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}.${ext}`

  const { data, error } = await supabase.storage.from('admin-content').upload(filePath, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error

  const { data: urlData } = supabase.storage.from('admin-content').getPublicUrl(data.path)
  return urlData.publicUrl
}

// ======================
// Main Page
// ======================
export default function AdminPhotoboothPage() {
  const [events, setEvents] = useState<BoothEvent[]>([])
  const [assets, setAssets] = useState<BoothAsset[]>([])
  const [passes, setPasses] = useState<BoothPass[]>([])
  const [passStats, setPassStats] = useState<PassStats | null>(null)
  const [masterCode, setMasterCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')

  const [eventModal, setEventModal] = useState<{ open: boolean; editing: BoothEvent | null }>({
    open: false,
    editing: null,
  })
  const [addingKind, setAddingKind] = useState<'frame' | 'template' | null>(null)
  const [passModalOpen, setPassModalOpen] = useState(false)
  const [issuedCodes, setIssuedCodes] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState<
    | { type: 'asset'; asset: BoothAsset }
    | { type: 'event'; event: BoothEvent }
    | null
  >(null)
  const [boothQr, setBoothQr] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2500)
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [eventsRes, assetsRes, passesRes] = await Promise.all([
        fetch('/api/admin/photobooth/events', { cache: 'no-store' }),
        fetch('/api/admin/photobooth', { cache: 'no-store' }),
        fetch('/api/admin/photobooth/passes', { cache: 'no-store' }),
      ])
      const [eventsData, assetsData, passesData] = await Promise.all([
        eventsRes.json(),
        assetsRes.json(),
        passesRes.json(),
      ])
      if (eventsRes.ok) setEvents(eventsData.events ?? [])
      if (assetsRes.ok) setAssets(assetsData.assets ?? [])
      if (passesRes.ok) {
        setPasses(passesData.passes ?? [])
        setPassStats(passesData.stats ?? null)
        setMasterCode(passesData.masterCode ?? null)
      }
    } catch (err) {
      console.error('포토부스 데이터 로드 실패:', err)
      showToast('데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // 부스 화면 QR (매장 태블릿 초기 세팅용)
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/booth`, { width: 320, margin: 1 })
      .then(setBoothQr)
      .catch(() => setBoothQr(null))
  }, [])

  // ---------- 이벤트 ----------
  const handleEventSave = async (payload: Record<string, unknown>, id?: string) => {
    const res = await fetch('/api/admin/photobooth/events', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id, ...payload } : payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '저장 실패')
    }
    showToast(id ? '이벤트가 수정되었습니다.' : '새 생카 이벤트가 등록되었습니다.')
    setEventModal({ open: false, editing: null })
    await fetchAll()
  }

  const handleEventToggle = async (event: BoothEvent) => {
    try {
      const res = await fetch('/api/admin/photobooth/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, is_active: !event.is_active }),
      })
      if (!res.ok) throw new Error()
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, is_active: !e.is_active } : e))
      )
    } catch {
      showToast('상태 변경에 실패했습니다.')
    }
  }

  // ---------- 소재 ----------
  const patchAsset = useCallback(async (id: string, payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/photobooth', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '수정 실패')
    }
  }, [])

  const handleAssetToggle = async (asset: BoothAsset) => {
    try {
      await patchAsset(asset.id, { is_active: !asset.is_active })
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, is_active: !a.is_active } : a))
      )
    } catch {
      showToast('상태 변경에 실패했습니다.')
    }
  }

  const handleAssetMove = async (asset: BoothAsset, direction: -1 | 1) => {
    const siblings = assets
      .filter((a) => a.kind === asset.kind)
      .sort((a, b) => a.display_order - b.display_order)
    const index = siblings.findIndex((a) => a.id === asset.id)
    const target = siblings[index + direction]
    if (!target) return
    try {
      await Promise.all([
        patchAsset(asset.id, { display_order: target.display_order }),
        patchAsset(target.id, { display_order: asset.display_order }),
      ])
      await fetchAll()
    } catch {
      showToast('순서 변경에 실패했습니다.')
    }
  }

  const handleAssetCreate = async (
    kind: 'frame' | 'template',
    title: string,
    file: File,
    eventId: string | null
  ) => {
    const imageUrl = await uploadBoothImage(`${kind}s`, file)
    const siblings = assets.filter((a) => a.kind === kind)
    const nextOrder =
      siblings.length > 0 ? Math.max(...siblings.map((a) => a.display_order)) + 1 : 0

    const res = await fetch('/api/admin/photobooth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        title,
        image_url: imageUrl,
        display_order: nextOrder,
        event_id: eventId,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '등록 실패')
    }
    showToast(`${KIND_META[kind].label}이(가) 등록되었습니다.`)
    setAddingKind(null)
    await fetchAll()
  }

  // ---------- 삭제 (소재/이벤트 공용) ----------
  const handleDelete = async () => {
    if (!deleting) return
    try {
      if (deleting.type === 'asset') {
        const res = await fetch(`/api/admin/photobooth?id=${deleting.asset.id}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error()
        // 스토리지 이미지 삭제 (best-effort)
        try {
          const url = new URL(deleting.asset.image_url)
          const match = url.pathname.match(/\/storage\/v1\/object\/public\/admin-content\/(.+)/)
          if (match) {
            await supabase.storage.from('admin-content').remove([decodeURIComponent(match[1])])
          }
        } catch {
          // 메타데이터 삭제가 우선 — 스토리지 잔여물은 무시
        }
      } else {
        const res = await fetch(`/api/admin/photobooth/events?id=${deleting.event.id}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error()
      }
      showToast('삭제되었습니다.')
      setDeleting(null)
      await fetchAll()
    } catch {
      showToast('삭제에 실패했습니다.')
    }
  }

  // ---------- 이용권 ----------
  const handlePassIssue = async (count: number, note: string) => {
    const res = await fetch('/api/admin/photobooth/passes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, note: note || undefined }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '발급 실패')
    setPassModalOpen(false)
    setIssuedCodes(data.codes ?? [])
    await fetchAll()
  }

  const handlePassVoid = async (pass: BoothPass) => {
    try {
      const res = await fetch('/api/admin/photobooth/passes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pass.id }),
      })
      if (!res.ok) throw new Error()
      showToast(`${pass.code} 이용권이 취소되었습니다.`)
      await fetchAll()
    } catch {
      showToast('취소에 실패했습니다.')
    }
  }

  const downloadBoothQr = () => {
    if (!boothQr) return
    const link = document.createElement('a')
    link.href = boothQr
    link.download = 'booth-qr.png'
    link.click()
  }

  const frames = assets.filter((a) => a.kind === 'frame')
  const templates = assets.filter((a) => a.kind === 'template')
  const liveEvent = events.find(isEventLive) ?? null
  const eventTitleById = new Map(events.map((e) => [e.id, e.title]))

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="포토부스 관리"
        subtitle={
          liveEvent ? `진행 중 생카: ${liveEvent.title}` : '진행 중인 생카 이벤트 없음'
        }
        actions={
          <a
            href="/booth"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl border-2 border-slate-900 transition-all hover:bg-slate-700"
          >
            <ExternalLink className="w-4 h-4" />
            부스 화면 열기
          </a>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* 부스 접속 안내 */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-900">매장 부스 화면 (악센트 와우)</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              매장 태블릿·PC 브라우저에서{' '}
              <span className="font-mono font-semibold text-slate-700">/booth</span> 를 전체
              화면으로 열어두세요. 생카 이벤트·프레임·이용권을 여기서 관리하면 부스에 바로
              반영됩니다. 인쇄는 4x6인치(여백 없음) 포토 프린터 기준입니다.
              <br />
              <span className="text-slate-400">
                카메라 뒤에 그린·블루 배경지를 걸고 부스 편집 화면에서 &lsquo;배경 지우기&rsquo;를
                켜면, 주인공 컷에 인물만 오려져 합성됩니다 (설정은 부스에 저장).
              </span>
            </p>
          </div>
          <button
            onClick={downloadBoothQr}
            disabled={!boothQr}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-slate-50 text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <QrCode className="w-4 h-4" /> 부스 QR
            <Download className="w-3.5 h-3.5" />
          </button>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* ---------- 생카 이벤트 ---------- */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">생카 이벤트</h2>
                  <p className="text-sm text-slate-500">
                    기간 중 부스가 자동으로 이벤트 테마(주인공·컬러·해시태그·주최 크레딧)로
                    전환됩니다.
                  </p>
                </div>
                <button
                  onClick={() => setEventModal({ open: true, editing: null })}
                  className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl border-2 border-slate-900 transition-all"
                >
                  <Plus className="w-4 h-4" />새 생카 등록
                </button>
              </div>

              {events.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
                  등록된 생카 이벤트가 없습니다. 주최자(총대)와 협의된 이벤트를 등록해보세요.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => {
                    const live = isEventLive(event)
                    const stat = passStats?.by_event[event.id]
                    return (
                      <div
                        key={event.id}
                        className={`bg-white rounded-xl border p-4 flex flex-wrap items-center gap-4 ${
                          live ? 'border-slate-900' : 'border-slate-200'
                        } ${event.is_active ? '' : 'opacity-50'}`}
                      >
                        <div
                          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: event.theme_color || '#f1f5f9' }}
                        >
                          <Cake className="w-5 h-5 text-white drop-shadow" />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900">{event.title}</p>
                            {live && (
                              <span className="text-[11px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                                진행중
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[
                              event.artist && `주인공 ${event.artist}`,
                              event.organizer && `주최 ${event.organizer}`,
                              event.hashtag,
                              event.starts_on &&
                                `${event.starts_on} ~ ${event.ends_on ?? ''}`,
                            ]
                              .filter(Boolean)
                              .join(' · ') || '상세 정보 없음'}
                          </p>
                          {stat && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              이용권 발급 {stat.issued} · 사용 {stat.used} (주최자 리포트용)
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEventToggle(event)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              event.is_active
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                            title={event.is_active ? '비활성화' : '활성화'}
                          >
                            {event.is_active ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setEventModal({ open: true, editing: event })}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleting({ type: 'event', event })}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ---------- 포토카드 ---------- */}
            <CardManager
              events={events.map((e) => ({ id: e.id, title: e.title }))}
              onToast={showToast}
            />

            {/* ---------- 이용권 ---------- */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">이용권 (구매 특전)</h2>
                  <p className="text-sm text-slate-500">
                    상품 결제 시 발급 → 손님이 부스 키패드에 6자리 번호 입력 → 1회 촬영·인화.
                    오늘 발급 {passStats?.issued_today ?? 0} · 사용 {passStats?.used_today ?? 0}
                  </p>
                </div>
                <button
                  onClick={() => setPassModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl border-2 border-slate-900 transition-all"
                >
                  <Ticket className="w-4 h-4" />
                  이용권 발급
                </button>
              </div>

              {masterCode && (
                <div className="mb-4 bg-white rounded-xl border border-slate-900 p-4 flex flex-wrap items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-[220px]">
                    <p className="font-bold text-slate-900">마스터 이용권</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      사용 처리 없이 항상 통과하는 직원·테스트용 번호입니다. 손님에게 노출되면
                      누구나 무료로 이용할 수 있으니 매장 내부에서만 공유하세요. 번호 변경은
                      환경변수 <span className="font-mono">PHOTOBOOTH_MASTER_CODE</span>.
                    </p>
                  </div>
                  <span className="font-mono text-3xl font-black tracking-[0.2em] text-slate-900">
                    {masterCode}
                  </span>
                </div>
              )}

              {passes.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
                  발급된 이용권이 없습니다.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                        <th className="px-4 py-3 font-semibold">번호</th>
                        <th className="px-4 py-3 font-semibold">상태</th>
                        <th className="px-4 py-3 font-semibold">이벤트</th>
                        <th className="px-4 py-3 font-semibold">메모</th>
                        <th className="px-4 py-3 font-semibold">발급</th>
                        <th className="px-4 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {passes.map((pass) => (
                        <tr key={pass.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-900 tracking-widest">
                            {pass.code}
                          </td>
                          <td className="px-4 py-2.5">
                            {pass.status === 'issued' && (
                              <span className="text-[11px] font-bold bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">
                                미사용
                              </span>
                            )}
                            {pass.status === 'used' && (
                              <span className="text-[11px] font-bold bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                                사용됨
                              </span>
                            )}
                            {pass.status === 'void' && (
                              <span className="text-[11px] font-bold bg-red-50 text-red-500 rounded-full px-2 py-0.5">
                                취소
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {pass.photobooth_events?.title ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 max-w-[160px] truncate">
                            {pass.note ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                            {new Date(pass.created_at).toLocaleString('ko-KR', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {pass.status === 'issued' && (
                              <button
                                onClick={() => handlePassVoid(pass)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                                title="이용권 취소"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ---------- 소재 (프레임/템플릿) ---------- */}
            {(['frame', 'template'] as const).map((kind) => {
              const list = (kind === 'frame' ? frames : templates).sort(
                (a, b) => a.display_order - b.display_order
              )
              return (
                <section key={kind}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {KIND_META[kind].label} 관리
                      </h2>
                      <p className="text-sm text-slate-500">{KIND_META[kind].hint}</p>
                    </div>
                    <button
                      onClick={() => setAddingKind(kind)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl border-2 border-slate-900 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      추가
                    </button>
                  </div>

                  {list.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/assets/photobooth/decor/empty-state.svg" alt="" className="mx-auto mb-3 w-32 opacity-70" />
                      <p className="font-semibold text-slate-500">등록된 {KIND_META[kind].label}이(가) 없습니다.</p>
                      <p className="mt-1 text-xs">오른쪽 위 추가 버튼으로 첫 소재를 등록하세요.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {list.map((asset, index) => (
                        <div
                          key={asset.id}
                          className={`bg-white rounded-xl border overflow-hidden ${
                            asset.is_active ? 'border-slate-200' : 'border-slate-200 opacity-50'
                          }`}
                        >
                          <div className="aspect-[2/3] bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={asset.image_url}
                              alt={asset.title}
                              className="w-full h-full object-contain"
                            />
                            <span
                              className={`absolute top-2 left-2 text-[10px] font-bold rounded-full px-2 py-0.5 ${
                                asset.event_id
                                  ? 'bg-pink-100 text-pink-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {asset.event_id
                                ? eventTitleById.get(asset.event_id) ?? '이벤트'
                                : '상시'}
                            </span>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {asset.title}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <button
                                onClick={() => handleAssetToggle(asset)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  asset.is_active
                                    ? 'text-green-600 hover:bg-green-50'
                                    : 'text-slate-400 hover:bg-slate-100'
                                }`}
                                title={asset.is_active ? '비활성화' : '활성화'}
                              >
                                {asset.is_active ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleAssetMove(asset, -1)}
                                disabled={index === 0}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30"
                                title="위로"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAssetMove(asset, 1)}
                                disabled={index === list.length - 1}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30"
                                title="아래로"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleting({ type: 'asset', asset })}
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
                </section>
              )
            })}
          </>
        )}
      </div>

      {/* 이벤트 등록/수정 모달 */}
      {eventModal.open && (
        <EventFormModal
          editing={eventModal.editing}
          onSave={handleEventSave}
          onClose={() => setEventModal({ open: false, editing: null })}
        />
      )}

      {/* 소재 추가 모달 */}
      {addingKind && (
        <AssetFormModal
          kind={addingKind}
          events={events}
          defaultEventId={liveEvent?.id ?? null}
          onSave={handleAssetCreate}
          onClose={() => setAddingKind(null)}
        />
      )}

      {/* 이용권 발급 모달 */}
      {passModalOpen && (
        <PassIssueModal onIssue={handlePassIssue} onClose={() => setPassModalOpen(false)} />
      )}

      {/* 발급 완료 — 코드 크게 표시 */}
      {issuedCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 max-w-md w-full text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-1">이용권 발급 완료</h3>
            <p className="text-sm text-slate-500 mb-5">
              손님에게 번호를 안내해주세요 (부스 키패드 입력)
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {issuedCodes.map((code) => (
                <span
                  key={code}
                  className="font-mono text-3xl font-black tracking-[0.2em] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                >
                  {code}
                </span>
              ))}
            </div>
            <button
              onClick={() => setIssuedCodes(null)}
              className="w-full py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {deleting.type === 'asset'
                ? `${KIND_META[deleting.asset.kind].label} 삭제`
                : '생카 이벤트 삭제'}
            </h3>
            <p className="text-slate-600 mb-4">
              {deleting.type === 'asset' ? (
                <>
                  <span className="font-semibold">{deleting.asset.title}</span> 을(를) 삭제할까요?
                  부스 화면에서도 더 이상 표시되지 않습니다.
                </>
              ) : (
                <>
                  <span className="font-semibold">{deleting.event.title}</span> 을(를) 삭제할까요?
                  이 이벤트에 귀속된 프레임·템플릿도 함께 삭제됩니다.
                </>
              )}
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

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  )
}

// ======================
// 이벤트 등록/수정 모달
// ======================
function EventFormModal({
  editing,
  onSave,
  onClose,
}: {
  editing: BoothEvent | null
  onSave: (payload: Record<string, unknown>, id?: string) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title: editing?.title ?? '',
    artist: editing?.artist ?? '',
    organizer: editing?.organizer ?? '',
    hashtag: editing?.hashtag ?? '',
    greeting: editing?.greeting ?? '',
    theme_color: editing?.theme_color ?? '#f5d76e',
    starts_on: editing?.starts_on ?? '',
    ends_on: editing?.ends_on ?? '',
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(
    editing?.cover_image_url ?? null
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('이벤트명을 입력해주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      let coverImageUrl = editing?.cover_image_url ?? null
      if (coverFile) {
        coverImageUrl = await uploadBoothImage('events', coverFile)
      }
      await onSave(
        { ...form, cover_image_url: coverImageUrl },
        editing?.id
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
      setSaving(false)
    }
  }

  const field = (
    label: string,
    key: keyof typeof form,
    placeholder: string,
    type = 'text'
  ) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        maxLength={200}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-base focus:outline-none focus:border-slate-900"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            {editing ? '생카 이벤트 수정' : '새 생카 이벤트 등록'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {field('이벤트명 *', 'title', '예: 〇〇 생일카페 in 악센트 와우')}
          <div className="grid grid-cols-2 gap-3">
            {field('주인공 (아티스트)', 'artist', '예: 〇〇')}
            {field('주최자 크레딧', 'organizer', '예: @handle (X)')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('인증 해시태그', 'hashtag', '예: #〇〇생카')}
            {field('부스 홈 문구', 'greeting', '예: HAPPY 〇〇 DAY')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('시작일', 'starts_on', '', 'date')}
            {field('종료일', 'ends_on', '', 'date')}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              테마 컬러
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.theme_color}
                onChange={set('theme_color')}
                className="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer"
              />
              <span className="font-mono text-sm text-slate-500">{form.theme_color}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              커버 이미지 (부스 홈 배너, 선택)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0]
                if (!selected) return
                setCoverFile(selected)
                const reader = new FileReader()
                reader.onload = (ev) => setCoverPreview(ev.target?.result as string)
                reader.readAsDataURL(selected)
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 transition-colors p-3"
            >
              {coverPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={coverPreview}
                  alt="커버 미리보기"
                  className="max-h-32 mx-auto object-contain rounded-lg"
                />
              ) : (
                <span className="text-sm text-slate-500">클릭해서 이미지 선택</span>
              )}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ======================
// 소재 추가 모달
// ======================
function AssetFormModal({
  kind,
  events,
  defaultEventId,
  onSave,
  onClose,
}: {
  kind: 'frame' | 'template'
  events: BoothEvent[]
  defaultEventId: string | null
  onSave: (
    kind: 'frame' | 'template',
    title: string,
    file: File,
    eventId: string | null
  ) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [eventId, setEventId] = useState<string>(defaultEventId ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selected: File) => {
    setFile(selected)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(selected)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    if (!file) {
      setError('이미지를 선택해주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(kind, title.trim(), file, eventId || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            새 {KIND_META[kind].label} 추가
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 mb-4 leading-relaxed">
          {KIND_META[kind].hint}
        </p>

        <label className="block text-sm font-semibold text-slate-700 mb-1.5">이름</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder={kind === 'frame' ? '예: 생일 프레임 A' : '예: 〇〇 셀카 컷'}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-base focus:outline-none focus:border-slate-900 mb-4"
        />

        <label className="block text-sm font-semibold text-slate-700 mb-1.5">소속 이벤트</label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-base focus:outline-none focus:border-slate-900 mb-1 bg-white"
        >
          <option value="">상시 (모든 기간 노출)</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mb-4">
          이벤트에 귀속하면 해당 생카 기간에만 부스에 노출됩니다.
        </p>

        <label className="block text-sm font-semibold text-slate-700 mb-1.5">이미지</label>
        <input
          ref={fileInputRef}
          type="file"
          accept={kind === 'frame' ? 'image/png' : 'image/*'}
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0]
            if (selected) handleFileSelect(selected)
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 transition-colors p-4 mb-4"
        >
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="미리보기"
              className="max-h-56 mx-auto object-contain bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]"
            />
          ) : (
            <span className="text-sm text-slate-500">
              클릭해서 이미지 선택
              {kind === 'frame' && ' (투명 배경 PNG 권장)'}
            </span>
          )}
        </button>

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
            disabled={saving}
            className="flex-1 py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            등록
          </button>
        </div>
      </div>
    </div>
  )
}

// ======================
// 이용권 발급 모달
// ======================
function PassIssueModal({
  onIssue,
  onClose,
}: {
  onIssue: (count: number, note: string) => Promise<void>
  onClose: () => void
}) {
  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      await onIssue(count, note.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : '발급에 실패했습니다.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">이용권 발급</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 mb-4 leading-relaxed">
          상품 결제 건당 1장 발급이 기본입니다. 발급된 번호는 진행 중인 생카 이벤트에 자동
          귀속되어 주최자 리포트 통계에 반영됩니다.
        </p>

        <label className="block text-sm font-semibold text-slate-700 mb-1.5">수량</label>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) =>
              setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
            }
            className="w-24 px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-base focus:outline-none focus:border-slate-900"
          />
          <span className="text-sm text-slate-400">장 (최대 20)</span>
        </div>

        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          메모 (선택)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
          placeholder="예: 시그니처 향수 구매"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-base focus:outline-none focus:border-slate-900 mb-4"
        />

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
            disabled={saving}
            className="flex-1 py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            발급
          </button>
        </div>
      </div>
    </div>
  )
}
