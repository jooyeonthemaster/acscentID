'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { formatPrice } from '@/types/cart'
import type { PaymentLink } from '@/lib/payment-links/payment-links'
import {
  AlertTriangle,
  Check,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'

const INITIAL_FORM = {
  title: '',
  amount: '',
  description: '',
  imageUrl: '',
  expiresAt: '',
  memo: '',
}

type FormState = typeof INITIAL_FORM

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  // yyyy-MM-ddTHH:mm (datetime-local)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function AdminPaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }, [])

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/payment-links', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '결제창 목록 조회 실패')
      setLinks((json.links ?? []) as PaymentLink[])
      setUnavailable(json.unavailable === true)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '결제창 목록을 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const openCreate = () => {
    setEditingId(null)
    setForm(INITIAL_FORM)
    setModalOpen(true)
  }

  const openEdit = (link: PaymentLink) => {
    setEditingId(link.id)
    setForm({
      title: link.title,
      amount: String(link.amount),
      description: link.description,
      imageUrl: link.imageUrl || '',
      expiresAt: toDateInputValue(link.expiresAt),
      memo: link.memo,
    })
    setModalOpen(true)
  }

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    const title = form.title.trim()
    const amount = Number(form.amount)
    if (!title) {
      showToast('제목은 필수입니다')
      return
    }
    if (!Number.isInteger(amount) || amount < 0) {
      showToast('금액은 0 이상의 정수여야 합니다')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title,
        amount,
        description: form.description.trim(),
        image_url: form.imageUrl.trim() || null,
        expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        memo: form.memo.trim(),
      }

      const res = await fetch('/api/admin/payment-links', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '저장 실패')

      setModalOpen(false)
      setForm(INITIAL_FORM)
      setEditingId(null)
      await fetchLinks()
      showToast(editingId ? '결제창이 수정되었습니다' : '결제창이 생성되었습니다')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (link: PaymentLink) => {
    setBusyId(link.id)
    try {
      const res = await fetch('/api/admin/payment-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, is_active: !link.isActive }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '상태 변경 실패')
      await fetchLinks()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '상태 변경 실패')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (link: PaymentLink) => {
    if (!window.confirm(`"${link.title}" 결제창을 삭제할까요? 공유된 링크는 즉시 사용할 수 없게 됩니다.`)) return
    setBusyId(link.id)
    try {
      const res = await fetch('/api/admin/payment-links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '삭제 실패')
      await fetchLinks()
      showToast('결제창이 삭제되었습니다')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '삭제 실패')
    } finally {
      setBusyId(null)
    }
  }

  const publicUrl = (token: string) => `${origin}/pay/${token}`

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(token))
      showToast('결제 링크가 복사되었습니다')
    } catch {
      showToast('복사에 실패했습니다')
    }
  }

  const activeCount = links.filter((link) => link.isActive).length

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="개인결제창"
        subtitle="메인/상품 목록에는 노출되지 않는 맞춤 결제 링크를 만들고 개별 고객에게 공유합니다"
        actions={
          <>
            <button
              onClick={fetchLinks}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              결제창 만들기
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">전체 결제창</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{links.length}개</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">활성</p>
            <p className="mt-2 text-2xl font-black text-emerald-600">{activeCount}개</p>
          </div>
        </div>

        {unavailable && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-black text-amber-900">개인결제창 테이블이 아직 없습니다.</p>
              <p className="mt-1 text-xs font-medium text-amber-800">
                <code className="font-mono">20260709_admin_payment_links.sql</code> 마이그레이션을 적용하면 결제창을 저장할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#F472B6]" />
          </div>
        ) : links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">아직 만든 결제창이 없습니다.</p>
            <p className="mt-1 text-xs text-slate-400">‘결제창 만들기’로 맞춤 결제 링크를 생성하세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {links.map((link) => (
              <section key={link.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-slate-900">{link.title}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        link.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {link.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                    {link.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{link.description}</p>
                    )}
                  </div>
                  <p className="shrink-0 font-mono text-lg font-black text-slate-900">₩{formatPrice(link.amount)}</p>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-500">{publicUrl(link.token)}</span>
                  <button
                    onClick={() => handleCopy(link.token)}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100"
                  >
                    <Copy className="h-3.5 w-3.5" /> 복사
                  </button>
                </div>

                {link.expiresAt && (
                  <div className="mt-2 text-[11px] text-slate-400">
                    마감 {new Date(link.expiresAt).toLocaleString('ko-KR')}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={publicUrl(link.token)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> 결제 페이지
                  </a>
                  <button
                    onClick={() => openEdit(link)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> 편집
                  </button>
                  <button
                    onClick={() => handleToggleActive(link)}
                    disabled={busyId === link.id}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Power className="h-3.5 w-3.5" /> {link.isActive ? '비활성화' : '활성화'}
                  </button>
                  <button
                    onClick={() => handleDelete(link)}
                    disabled={busyId === link.id}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 삭제
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 className="text-lg font-black text-slate-900">{editingId ? '결제창 편집' : '결제창 만들기'}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">
                닫기
              </button>
            </div>
            <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-5">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">제목 (결제 항목명)</span>
                <input value={form.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="예: 맞춤 향수 제작비" className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">결제 금액 (원)</span>
                <input value={form.amount} onChange={(e) => updateForm('amount', e.target.value)} inputMode="numeric" placeholder="예: 50000" className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">설명 (선택)</span>
                <textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} rows={3} className="w-full resize-none rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">대표 이미지 URL (선택)</span>
                <input value={form.imageUrl} onChange={(e) => updateForm('imageUrl', e.target.value)} placeholder="/images/... 또는 https://..." className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">마감 일시 (선택)</span>
                <input type="datetime-local" value={form.expiresAt} onChange={(e) => updateForm('expiresAt', e.target.value)} className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">내부 메모 (선택 · 관리자만)</span>
                <input value={form.memo} onChange={(e) => updateForm('memo', e.target.value)} className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? '수정 저장' : '결제창 생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          <Check className="h-4 w-4 text-yellow-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
