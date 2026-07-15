'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CalendarDays,
  CalendarX2,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Settings,
} from 'lucide-react'
import type { ReservationPolicy } from '@/lib/reservation/config'
import { KNOWN_RESERVATION_PROGRAMS } from '@/lib/reservation/config'

// ======================
// Types & Labels
// ======================
interface Reservation {
  id: string
  created_at: string
  reservation_code: string
  name: string
  email: string
  phone: string | null
  party_size: number
  program: string
  slot_start: string
  slot_end: string
  notes: string | null
  locale: string
  status: 'confirmed' | 'cancelled' | 'no_show' | 'completed'
  google_event_id: string | null
}

const PROGRAM_LABELS: Record<string, string> = {
  'idol-image': 'AI 이미지 분석 퍼퓸',
  personal: '퍼스널 센트',
  chemistry: '레이어링 퍼퓸 (케미)',
}

const STATUS_META: Record<
  Reservation['status'],
  { label: string; className: string }
> = {
  confirmed: { label: '확정', className: 'bg-blue-100 text-blue-700 border-blue-300' },
  completed: { label: '방문완료', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  no_show: { label: '노쇼', className: 'bg-amber-100 text-amber-700 border-amber-300' },
  cancelled: { label: '취소', className: 'bg-red-100 text-red-600 border-red-300' },
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// ======================
// 취소 확인 모달
// ======================
function CancelConfirmModal({
  reservation,
  onConfirm,
  onClose,
}: {
  reservation: Reservation
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">예약 취소</h3>
        </div>
        <p className="text-slate-600 mb-2">다음 예약을 취소하시겠습니까?</p>
        <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200">
          <p className="font-semibold text-slate-900">
            {reservation.reservation_code} · {reservation.name}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {formatSlot(reservation.slot_start)} · {PROGRAM_LABELS[reservation.program] || reservation.program} · {reservation.party_size}명
          </p>
        </div>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          구글 캘린더 이벤트가 삭제되어 해당 슬롯이 다시 예약 가능해집니다.
          <br />
          고객에게 취소 안내 메일은 자동 발송되지 않습니다 — 필요 시 직접 연락해주세요.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            닫기
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
          >
            예약 취소
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ======================
// 예약 목록 탭
// ======================
function ReservationListTab() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [statusFilter, setStatusFilter] = useState('')
  const [q, setQ] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (statusFilter) params.set('status', statusFilter)
      if (q) params.set('q', q)
      const res = await fetch(`/api/admin/reservations?${params.toString()}`)
      const data = await res.json()
      if (res.ok) setReservations(data.reservations)
      else alert(data.error || '예약 조회에 실패했습니다')
    } catch {
      alert('예약 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [period, statusFilter, q])

  useEffect(() => {
    load()
  }, [load])

  const changeStatus = async (reservation: Reservation, status: Reservation['status']) => {
    setUpdatingId(reservation.id)
    try {
      const res = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '상태 변경에 실패했습니다')
        return
      }
      if (data.calendarSynced === false) {
        alert('상태는 변경됐지만 구글 캘린더 동기화에 실패했습니다. 캘린더를 직접 확인해주세요.')
      }
      setReservations((prev) =>
        prev.map((r) => (r.id === reservation.id ? { ...r, ...data.reservation } : r))
      )
    } catch {
      alert('상태 변경에 실패했습니다')
    } finally {
      setUpdatingId(null)
    }
  }

  const counts = reservations.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-4 flex flex-wrap items-center gap-3">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
          className="px-3 py-2 rounded-xl border-2 border-slate-300 text-sm font-semibold text-slate-700 focus:border-slate-900 focus:outline-none"
        >
          <option value="upcoming">다가오는 예약</option>
          <option value="past">지난 예약</option>
          <option value="all">전체</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border-2 border-slate-300 text-sm font-semibold text-slate-700 focus:border-slate-900 focus:outline-none"
        >
          <option value="">모든 상태</option>
          <option value="confirmed">확정</option>
          <option value="completed">방문완료</option>
          <option value="no_show">노쇼</option>
          <option value="cancelled">취소</option>
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setQ(searchInput.trim())
          }}
          className="flex items-center gap-2 flex-1 min-w-[220px]"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="이름 / 이메일 / 예약번호 / 전화"
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-300 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            검색
          </button>
        </form>
        <button
          onClick={load}
          className="p-2 rounded-xl border-2 border-slate-300 text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
          aria-label="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 상태별 요약 */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_META) as Reservation['status'][]).map((s) => (
          <span
            key={s}
            className={`px-3 py-1 rounded-full border text-xs font-bold ${STATUS_META[s].className}`}
          >
            {STATUS_META[s].label} {counts[s] || 0}
          </span>
        ))}
        <span className="px-3 py-1 rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600">
          합계 {reservations.length}
        </span>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CalendarX2 className="w-10 h-10 mb-3" />
            <p className="font-semibold">조건에 맞는 예약이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-bold whitespace-nowrap">예약일시 (KST)</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">예약번호</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">고객</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">프로그램</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">인원</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">요청사항</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">캘린더</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">상태 변경</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {formatSlot(r.slot_start)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {r.reservation_code}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 whitespace-nowrap">
                        {r.name}
                        <span className="ml-1.5 text-[10px] font-bold text-slate-400 uppercase">
                          {r.locale}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                      {r.phone && <p className="text-xs text-slate-500">{r.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {PROGRAM_LABELS[r.program] || r.program}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.party_size}명</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                      <span className="line-clamp-2">{r.notes || '-'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.google_event_id ? (
                        <span className="text-emerald-600 text-xs font-bold">📅 등록됨</span>
                      ) : (
                        <span className="text-slate-400 text-xs font-bold">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full border text-xs font-bold ${STATUS_META[r.status].className}`}
                      >
                        {STATUS_META[r.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {updatingId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <select
                          value={r.status}
                          onChange={(e) => {
                            const next = e.target.value as Reservation['status']
                            if (next === r.status) return
                            if (next === 'cancelled') setCancelTarget(r)
                            else changeStatus(r, next)
                          }}
                          className="px-2 py-1.5 rounded-lg border-2 border-slate-300 text-xs font-semibold text-slate-700 focus:border-slate-900 focus:outline-none"
                        >
                          <option value="confirmed">확정</option>
                          <option value="completed">방문완료</option>
                          <option value="no_show">노쇼</option>
                          <option value="cancelled">취소</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {cancelTarget && (
          <CancelConfirmModal
            reservation={cancelTarget}
            onClose={() => setCancelTarget(null)}
            onConfirm={() => {
              const target = cancelTarget
              setCancelTarget(null)
              if (target) changeStatus(target, 'cancelled')
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ======================
// 예약 설정 탭
// ======================
function ReservationSettingsTab() {
  const [policy, setPolicy] = useState<ReservationPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/reservations/settings')
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) setPolicy(data.policy)
        else alert(data.error || '설정 조회에 실패했습니다')
      })
      .catch(() => alert('설정 조회에 실패했습니다'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!policy) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/reservations/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '설정 저장에 실패했습니다')
        return
      }
      setPolicy(data.policy)
      alert('저장되었습니다. 예약 페이지에 즉시 반영됩니다.')
    } catch {
      alert('설정 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !policy) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const set = <K extends keyof ReservationPolicy>(key: K, value: ReservationPolicy[K]) =>
    setPolicy((prev) => (prev ? { ...prev, [key]: value } : prev))

  const numberField = (
    label: string,
    key: keyof ReservationPolicy,
    min: number,
    max: number,
    suffix: string
  ) => (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={policy[key] as number}
          onChange={(e) => set(key, Number(e.target.value) as ReservationPolicy[typeof key])}
          className="w-24 px-3 py-2 rounded-xl border-2 border-slate-300 text-sm font-semibold focus:border-slate-900 focus:outline-none"
        />
        <span className="text-sm text-slate-500 font-semibold">{suffix}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 max-w-3xl">
      {/* 접수 on/off */}
      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-5 flex items-center justify-between">
        <div>
          <p className="font-bold text-slate-900">예약 접수</p>
          <p className="text-xs text-slate-500 mt-0.5">
            끄면 예약 페이지가 &ldquo;점검 중&rdquo;으로 표시되고 신규 예약이 차단됩니다 (기존 예약 유지)
          </p>
        </div>
        <button
          onClick={() => set('accepting', !policy.accepting)}
          className={`relative w-14 h-8 rounded-full border-2 border-slate-900 transition-colors ${
            policy.accepting ? 'bg-emerald-400' : 'bg-slate-200'
          }`}
          aria-label="예약 접수 토글"
        >
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white border-2 border-slate-900 transition-all ${
              policy.accepting ? 'left-6' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* 영업시간/슬롯 */}
      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-5 space-y-4">
        <h3 className="font-bold text-slate-900">영업시간 · 슬롯</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">영업 시작</label>
            <input
              type="time"
              value={policy.openTime}
              onChange={(e) => set('openTime', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-sm font-semibold focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">영업 종료</label>
            <input
              type="time"
              value={policy.closeTime}
              onChange={(e) => set('closeTime', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-sm font-semibold focus:border-slate-900 focus:outline-none"
            />
          </div>
          {numberField('슬롯 간격', 'slotIntervalMinutes', 5, 120, '분')}
          {numberField('소요 시간', 'durationMinutes', 5, 480, '분')}
        </div>
        <p className="text-xs text-slate-400">
          마지막 예약 가능 시간 = 영업 종료 − 소요 시간. 변경 즉시 예약 페이지에 반영됩니다.
        </p>
      </div>

      {/* 예약 정책 */}
      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-5 space-y-4">
        <h3 className="font-bold text-slate-900">예약 정책</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {numberField('최소 리드타임', 'minLeadTimeHours', 0, 168, '시간 전')}
          {numberField('예약 가능 기간', 'maxAdvanceDays', 1, 90, '일 후까지')}
          {numberField('최대 인원', 'maxPartySize', 1, 10, '명')}
          {numberField('이메일당 활성 예약', 'maxActiveReservationsPerEmail', 1, 10, '건')}
        </div>
      </div>

      {/* 휴무 요일 */}
      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-5">
        <h3 className="font-bold text-slate-900 mb-3">정기 휴무 요일</h3>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, day) => {
            const closed = policy.closedWeekdays.includes(day)
            return (
              <button
                key={day}
                onClick={() =>
                  set(
                    'closedWeekdays',
                    closed
                      ? policy.closedWeekdays.filter((d) => d !== day)
                      : [...policy.closedWeekdays, day]
                  )
                }
                className={`w-11 h-11 rounded-xl border-2 font-bold text-sm transition-colors ${
                  closed
                    ? 'bg-red-500 border-slate-900 text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:border-slate-900'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2">빨간 요일은 예약이 닫힙니다.</p>
      </div>

      {/* 프로그램 */}
      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-5">
        <h3 className="font-bold text-slate-900 mb-3">예약 가능 프로그램</h3>
        <div className="flex flex-wrap gap-2">
          {KNOWN_RESERVATION_PROGRAMS.map((p) => {
            const active = policy.programs.includes(p)
            return (
              <button
                key={p}
                onClick={() =>
                  set(
                    'programs',
                    active ? policy.programs.filter((x) => x !== p) : [...policy.programs, p]
                  )
                }
                className={`px-4 py-2 rounded-xl border-2 font-semibold text-sm transition-colors ${
                  active
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-300 text-slate-500 hover:border-slate-900'
                }`}
              >
                {PROGRAM_LABELS[p] || p}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          새 프로그램 종류 추가는 5개 언어 라벨/이메일 템플릿이 필요해 코드 작업이 필요합니다.
        </p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        설정 저장
      </button>
    </div>
  )
}

// ======================
// 페이지
// ======================
export default function AdminReservationsPage() {
  const [tab, setTab] = useState<'list' | 'settings'>('list')

  return (
    <div className="space-y-6">
      <AdminHeader
        title="방문 예약"
        subtitle="오프라인 방문 예약 현황과 정책을 관리합니다"
      />

      <div className="flex gap-2">
        <button
          onClick={() => setTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-colors ${
            tab === 'list'
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-white border-slate-300 text-slate-600 hover:border-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          예약 현황
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-colors ${
            tab === 'settings'
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-white border-slate-300 text-slate-600 hover:border-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          예약 설정
        </button>
      </div>

      {tab === 'list' ? <ReservationListTab /> : <ReservationSettingsTab />}
    </div>
  )
}
