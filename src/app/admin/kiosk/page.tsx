'use client'

/**
 * 키오스크 관리 (관리자) — 매장 무인 기기(/kiosk)에서 나온 분석 기록을 본다.
 * - 기록: 손님이 결과 화면까지 도달하면 키오스크가 /api/kiosk/record로 한 건씩 남긴다
 * - 통계: 데모(mock) 결과를 뺀 실제 분석만 집계한다 (/api/admin/kiosk/stats)
 * - 데이터 원본은 kiosk_analyses 테이블 하나 (supabase/migrations/20260917_kiosk_analyses.sql)
 */

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import {
  Monitor,
  Search,
  Calendar,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Download,
  Trash2,
  Printer,
  QrCode,
  Camera,
  FlaskConical,
  X,
  RefreshCw,
  ImagePlus,
  Eye,
  EyeOff,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase/client'
import { KIOSK_PROGRAM_LABELS, type KioskProgram } from '@/lib/admin/kiosk-filters'

interface RecipeRow {
  id?: string
  name?: string
  ratio?: number
  amountMl?: number
  amountG?: number
}

interface TraitRow {
  label?: string
  value?: number
}

interface KioskRecord {
  id: string
  created_at: string
  program: KioskProgram
  customer_name: string | null
  gender: string | null
  photo_source: 'camera' | 'qr' | null
  product_type: string | null
  product_label: string | null
  perfume_id: string | null
  perfume_no: string | null
  perfume_name: string | null
  category_en: string | null
  match_score: number | null
  keywords: string[] | null
  traits: TraitRow[] | null
  personal_color: string | null
  analysis_text: string | null
  recipe: RecipeRow[] | null
  saju: Record<string, unknown> | null
  ticket: string | null
  printed: boolean
  printed_at: string | null
  mocked: boolean
  device: string | null
}

interface KioskBackground {
  id: string
  title: string
  image_url: string
  palette: string
  is_active: boolean
  display_order: number
  created_at: string
}

/** 키오스크 내장 테마 — 업로드한 배경은 이 중 하나의 색·글꼴을 물려받는다 */
const PALETTES: { id: string; label: string }[] = [
  { id: 'retro', label: '레트로 체크' },
  { id: 'gingham', label: '파스텔 깅엄' },
  { id: 'scrapbook', label: '스크랩북 티켓' },
  { id: 'airy', label: '에어리 그라데이션' },
]

interface Stats {
  truncated: boolean
  summary: {
    total: number
    today: number
    last7Days: number
    printed: number
    mocked: number
    avgScore: number | null
  }
  daily: { day: string; count: number }[]
  byProgram: { key: string; count: number }[]
  byPerfume: { key: string; count: number }[]
  byProduct: { key: string; count: number }[]
  byCategory: { key: string; count: number }[]
  byPhotoSource: { key: string; count: number }[]
}

const PROGRAM_FILTERS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'idol', label: '최애 이미지' },
  { value: 'personal', label: '내 이미지' },
  { value: 'saju', label: '사주 향' },
]

const PROGRAM_COLORS: Record<KioskProgram, string> = {
  idol: 'bg-rose-100 text-rose-700',
  personal: 'bg-indigo-100 text-indigo-700',
  saju: 'bg-amber-100 text-amber-700',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatScore(score: number | null) {
  return typeof score === 'number' ? `${Math.round(score * 100)}%` : '-'
}

export default function AdminKioskPage() {
  const [records, setRecords] = useState<KioskRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 필터 (입력값) — 목록에는 '검색'을 눌러야 적용된다
  const [programFilter, setProgramFilter] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedRange, setAppliedRange] = useState({ from: '', to: '' })
  const [includeMock, setIncludeMock] = useState(false)
  const [printedFilter, setPrintedFilter] = useState<'' | 'yes' | 'no'>('')
  const [showFilters, setShowFilters] = useState(false)
  const [exporting, setExporting] = useState(false)
  // 매장 운영 중에는 화면을 띄워 두고 쌓이는 걸 본다 — 30초 폴링
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  // ── 키오스크 배경 ──────────────────────────────────────
  const [backgrounds, setBackgrounds] = useState<KioskBackground[]>([])
  const [bgTitle, setBgTitle] = useState('')
  const [bgPalette, setBgPalette] = useState('retro')
  const [bgUploading, setBgUploading] = useState(false)
  const bgFileRef = useRef<HTMLInputElement>(null)

  const fetchBackgrounds = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/kiosk/backgrounds', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setBackgrounds(data.backgrounds ?? [])
    } catch (err) {
      console.error('배경 목록 조회 실패:', err)
    }
  }, [])

  useEffect(() => {
    fetchBackgrounds()
  }, [fetchBackgrounds])

  /** 이미지는 admin-content 버킷에 직접 올리고, 메타데이터만 API로 저장한다 */
  const uploadBackground = async (file: File) => {
    if (!bgTitle.trim()) {
      alert('배경 이름을 먼저 입력해주세요')
      return
    }
    setBgUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `kiosk/backgrounds/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { data, error } = await supabase.storage
        .from('admin-content')
        .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('admin-content').getPublicUrl(data.path)

      const res = await fetch('/api/admin/kiosk/backgrounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bgTitle.trim(),
          image_url: urlData.publicUrl,
          palette: bgPalette,
          display_order: backgrounds.length,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || '등록에 실패했습니다')
      setBgTitle('')
      fetchBackgrounds()
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다')
    } finally {
      setBgUploading(false)
      if (bgFileRef.current) bgFileRef.current.value = ''
    }
  }

  const patchBackground = async (id: string, patch: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/admin/kiosk/backgrounds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      if (!res.ok) throw new Error((await res.json()).error || '수정에 실패했습니다')
      fetchBackgrounds()
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정에 실패했습니다')
    }
  }

  const deleteBackground = async (id: string, title: string) => {
    if (!confirm(`'${title}' 배경을 삭제할까요?`)) return
    try {
      const res = await fetch(`/api/admin/kiosk/backgrounds?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || '삭제에 실패했습니다')
      fetchBackgrounds()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  const buildParams = useCallback(
    (overrides: Record<string, string> = {}) => {
      const params = new URLSearchParams()
      if (programFilter) params.set('program', programFilter)
      if (appliedSearch) params.set('search', appliedSearch)
      if (appliedRange.from) params.set('date_from', appliedRange.from)
      if (appliedRange.to) params.set('date_to', appliedRange.to)
      if (!includeMock) params.set('mock', 'real')
      if (printedFilter) params.set('printed', printedFilter)
      for (const [key, value] of Object.entries(overrides)) params.set(key, value)
      return params
    },
    [programFilter, appliedSearch, appliedRange, includeMock, printedFilter]
  )

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const listParams = buildParams({ page: String(page), limit: '20' })
      // 통계는 기간·프로그램 필터를 공유하되 mock 제외는 서버가 항상 처리한다
      const statParams = buildParams()
      const [listRes, statRes] = await Promise.all([
        fetch(`/api/admin/kiosk?${listParams}`, { cache: 'no-store' }),
        fetch(`/api/admin/kiosk/stats?${statParams}`, { cache: 'no-store' }),
      ])
      const listData = await listRes.json()
      if (!listRes.ok) throw new Error(listData.error || '기록 조회에 실패했습니다')

      setRecords(listData.records ?? [])
      setTotalPages(listData.pagination?.totalPages ?? 1)
      setTotal(listData.pagination?.total ?? 0)

      // 통계는 목록보다 부수적이다 — 응답이 비거나 모양이 다르면 통계만 접고 목록은 살린다
      const statData = await statRes.json().catch(() => null)
      const usable =
        statRes.ok && statData?.summary && Array.isArray(statData.daily) && Array.isArray(statData.byPerfume)
      setStats(usable ? (statData as Stats) : null)
    } catch (err) {
      console.error('키오스크 기록 조회 실패:', err)
      setError(err instanceof Error ? err.message : '기록 조회에 실패했습니다')
      setRecords([])
      setStats(null)
    } finally {
      setLoading(false)
      setLastFetched(new Date())
    }
  }, [buildParams, page])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // 자동 새로고침 — 켠 동안만 30초마다
  useEffect(() => {
    if (!autoRefresh) return
    const timer = window.setInterval(fetchAll, 30_000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, fetchAll])

  const applySearch = () => {
    setAppliedSearch(search.trim())
    setAppliedRange({ from: dateFrom, to: dateTo })
    setPage(1)
  }

  /** 오늘(KST) 기준 n일 전 ~ 오늘 — 날짜 두 칸을 직접 채우는 수고를 없앤다 */
  const applyQuickRange = (days: number | null) => {
    if (days === null) {
      setDateFrom('')
      setDateTo('')
      setAppliedRange({ from: '', to: '' })
      setPage(1)
      return
    }
    const kstNow = new Date(Date.now() + 9 * 3600_000)
    const to = kstNow.toISOString().slice(0, 10)
    const from = new Date(kstNow.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
    setDateFrom(from)
    setDateTo(to)
    setAppliedRange({ from, to })
    setPage(1)
  }

  const activeQuickRange = (() => {
    if (!appliedRange.from && !appliedRange.to) return 'all'
    const kstNow = new Date(Date.now() + 9 * 3600_000)
    const today = kstNow.toISOString().slice(0, 10)
    if (appliedRange.to !== today) return null
    for (const days of [1, 7, 30]) {
      const from = new Date(kstNow.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
      if (appliedRange.from === from) return String(days)
    }
    return null
  })()

  const clearFilters = () => {
    setSearch('')
    setAppliedSearch('')
    setDateFrom('')
    setDateTo('')
    setAppliedRange({ from: '', to: '' })
    setProgramFilter('')
    setPrintedFilter('')
    setPage(1)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 기록을 삭제할까요? 되돌릴 수 없습니다.')) return
    try {
      const res = await fetch(`/api/admin/kiosk?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || '삭제에 실패했습니다')
      fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  /** 현재 필터 전체(최대 1000건)를 엑셀로 — 화면에 보이는 20건이 아니라 조건 전체를 받는다 */
  const downloadExcel = async () => {
    setExporting(true)
    try {
      const params = buildParams({ page: '1', limit: '100' })
      const rows: KioskRecord[] = []
      for (let p = 1; p <= 10; p++) {
        params.set('page', String(p))
        const res = await fetch(`/api/admin/kiosk?${params}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '조회에 실패했습니다')
        rows.push(...(data.records ?? []))
        if (p >= (data.pagination?.totalPages ?? 1)) break
      }

      const sheet = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          일시: formatDateTime(r.created_at),
          프로그램: KIOSK_PROGRAM_LABELS[r.program] ?? r.program,
          이름: r.customer_name ?? '',
          성별: r.gender ?? '',
          제품: r.product_label ?? '',
          향번호: r.perfume_no ?? '',
          향이름: r.perfume_name ?? '',
          카테고리: r.category_en ?? '',
          매칭도: formatScore(r.match_score),
          키워드: (r.keywords ?? []).join(', '),
          퍼스널컬러: r.personal_color ?? '',
          사진입력: r.photo_source === 'qr' ? '폰 QR' : r.photo_source === 'camera' ? '기기 카메라' : '',
          영수증: r.printed ? '출력' : '미출력',
          발권번호: r.ticket ?? '',
          데모: r.mocked ? 'Y' : '',
          레시피: (r.recipe ?? [])
            .map((row) => `${row.id ?? ''} ${row.name ?? ''} ${row.ratio ?? 0}%`)
            .join(' / '),
        }))
      )
      const book = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(book, sheet, '키오스크 분석')
      const stamp = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(book, `키오스크-분석기록-${stamp}.xlsx`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '엑셀 다운로드에 실패했습니다')
    } finally {
      setExporting(false)
    }
  }

  const printRate =
    stats && stats.summary.total > 0
      ? Math.round((stats.summary.printed / stats.summary.total) * 100)
      : null
  const dailyMax = stats ? Math.max(1, ...stats.daily.map((d) => d.count)) : 1

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader title="키오스크 관리" subtitle={`분석 기록 ${total.toLocaleString()}건`} />

      <div className="p-6 space-y-6">
        {/* 요약 */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: '오늘', value: stats?.summary.today ?? 0, suffix: '건' },
            { label: '최근 7일', value: stats?.summary.last7Days ?? 0, suffix: '건' },
            { label: '전체', value: stats?.summary.total ?? 0, suffix: '건' },
            { label: '영수증 출력률', value: printRate ?? 0, suffix: '%' },
            {
              label: '평균 매칭도',
              value: stats?.summary.avgScore ? Math.round(stats.summary.avgScore * 100) : 0,
              suffix: '%',
            },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border-2 border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {card.value.toLocaleString()}
                <span className="ml-0.5 text-sm font-bold text-slate-400">{card.suffix}</span>
              </p>
            </div>
          ))}
        </div>

        {stats && stats.summary.mocked > 0 && (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <FlaskConical className="w-4 h-4" />
            데모(mock) 결과 {stats.summary.mocked}건은 통계에서 제외했습니다.
            {!includeMock && ' 목록에서 보려면 아래 「데모 포함」을 켜세요.'}
          </p>
        )}

        {/* 일별 추이 + 분포 */}
        {stats && stats.summary.total > 0 && (
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border-2 border-slate-200 p-5">
              <p className="text-sm font-bold text-slate-900 mb-4">최근 14일 분석 수</p>
              <div className="flex items-stretch gap-1.5 h-40">
                {stats.daily.map((d) => (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${d.day} · ${d.count}건`}
                  >
                    <span className="text-[11px] font-bold text-slate-500 leading-none">{d.count || ''}</span>
                    {/* 막대가 자랄 공간을 flex-1로 확보해야 아래 height:%가 해석된다 */}
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className="w-full bg-yellow-400 rounded-t border border-slate-900"
                        style={{
                          height: `${Math.max(d.count / dailyMax, 0) * 100}%`,
                          minHeight: d.count ? 6 : 2,
                          background: d.count ? undefined : '#e2e8f0',
                          borderColor: d.count ? undefined : '#e2e8f0',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 leading-none">{d.day.slice(5).replace('-', '.')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-slate-200 p-5">
              <p className="text-sm font-bold text-slate-900 mb-4">추천된 향 TOP 10</p>
              {stats.byPerfume.length === 0 ? (
                <p className="text-sm text-slate-400">아직 기록이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {stats.byPerfume.map((row) => (
                    <div key={row.key} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-xs font-medium text-slate-700">{row.key}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded">
                        <div
                          className="h-full bg-slate-900 rounded"
                          style={{ width: `${(row.count / stats.byPerfume[0].count) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-bold text-slate-500">{row.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border-2 border-slate-200 p-5 lg:col-span-2">
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { title: '프로그램', rows: stats.byProgram.map((r) => ({ ...r, key: KIOSK_PROGRAM_LABELS[r.key as KioskProgram] ?? r.key })) },
                  { title: '제품', rows: stats.byProduct },
                  {
                    title: '사진 입력',
                    rows: stats.byPhotoSource.map((r) => ({
                      ...r,
                      key: r.key === 'qr' ? '폰 QR 업로드' : '기기 카메라',
                    })),
                  },
                ].map((block) => (
                  <div key={block.title}>
                    <p className="text-sm font-bold text-slate-900 mb-3">{block.title}</p>
                    {block.rows.length === 0 ? (
                      <p className="text-sm text-slate-400">-</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {block.rows.map((row) => (
                          <li key={row.key} className="flex justify-between text-sm">
                            <span className="text-slate-600">{row.key}</span>
                            <span className="font-bold text-slate-900">{row.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 키오스크 배경 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-900">키오스크 배경</h2>
              <p className="mt-1 text-sm text-slate-500">
                올린 배경은 키오스크 화면 <span className="font-bold">우측 하단을 길게 눌러</span> 관리자
                비밀번호를 입력하면 그 자리에서 바꿀 수 있습니다. 색과 글꼴은 고른 팔레트를 따릅니다.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">배경 이름</label>
              <input
                type="text"
                value={bgTitle}
                onChange={(e) => setBgTitle(e.target.value)}
                placeholder="예: 10월 생카 · 핑크 리본"
                maxLength={60}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">색·글꼴 팔레트</label>
              <select
                value={bgPalette}
                onChange={(e) => setBgPalette(e.target.value)}
                className="px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-yellow-400"
              >
                {PALETTES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadBackground(file)
              }}
            />
            <button
              onClick={() => bgFileRef.current?.click()}
              disabled={bgUploading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {bgUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              이미지 올리기
            </button>
            <p className="w-full text-xs text-slate-400">
              세로 화면(1080 × 1920)에 꽉 차게 잘립니다. 인물·글자가 가운데 몰리지 않은 이미지가 좋습니다.
            </p>
          </div>

          {backgrounds.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {backgrounds.map((bg) => (
                <div
                  key={bg.id}
                  className={`rounded-lg border-2 overflow-hidden ${bg.is_active ? 'border-slate-900' : 'border-slate-200 opacity-60'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bg.image_url} alt={bg.title} className="w-full aspect-[9/16] object-cover bg-slate-100" />
                  <div className="p-2">
                    <p className="text-xs font-bold text-slate-900 truncate" title={bg.title}>
                      {bg.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {PALETTES.find((p) => p.id === bg.palette)?.label ?? bg.palette}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        onClick={() => patchBackground(bg.id, { is_active: !bg.is_active })}
                        className="flex-1 flex items-center justify-center gap-1 py-1 rounded border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-slate-300"
                        title={bg.is_active ? '키오스크에서 숨기기' : '키오스크에 노출'}
                      >
                        {bg.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                        {bg.is_active ? '노출' : '숨김'}
                      </button>
                      <button
                        onClick={() => deleteBackground(bg.id, bg.title)}
                        className="p-1 rounded border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200"
                        title="삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {backgrounds.length === 0 && (
            <p className="mt-4 text-sm text-slate-400">
              아직 올린 배경이 없습니다. 키오스크는 내장 배경 5종으로 동작합니다.
            </p>
          )}
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {PROGRAM_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setProgramFilter(filter.value)
                  setPage(1)
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                  programFilter === filter.value
                    ? 'bg-yellow-400 border-slate-900 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Monitor size={14} />
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="이름, 향 이름, 발권번호 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900"
            >
              <Calendar className="w-5 h-5" />
              <span>직접 지정</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={applySearch}
              className="px-6 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900"
            >
              검색
            </button>

            <button
              onClick={downloadExcel}
              disabled={exporting || total === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg border-2 border-blue-800 disabled:opacity-50"
              title="현재 필터에 해당하는 기록을 엑셀로 (최대 1,000건)"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              엑셀 내보내기{total > 0 ? ` (${Math.min(total, 1000).toLocaleString()})` : ''}
            </button>
          </div>

          {/* 운영 중 자주 쓰는 조건 — 기간·출력여부는 누르는 즉시 적용된다 */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1">기간</span>
              {[
                { key: '1', label: '오늘', days: 1 },
                { key: '7', label: '7일', days: 7 },
                { key: '30', label: '30일', days: 30 },
                { key: 'all', label: '전체', days: null },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => applyQuickRange(r.days)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    activeQuickRange === r.key
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <span className="h-6 w-px bg-slate-200" aria-hidden />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1">영수증</span>
              {[
                { key: '' as const, label: '전체' },
                { key: 'yes' as const, label: '출력함' },
                { key: 'no' as const, label: '미출력' },
              ].map((r) => (
                <button
                  key={r.key || 'all'}
                  onClick={() => {
                    setPrintedFilter(r.key)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    printedFilter === r.key
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={includeMock}
                onChange={(e) => {
                  setIncludeMock(e.target.checked)
                  setPage(1)
                }}
                className="w-4 h-4"
              />
              데모 포함
            </label>

            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600" title="30초마다 자동으로 다시 불러옵니다">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
                자동 새로고침
              </label>
              <button
                onClick={fetchAll}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
              {lastFetched && (
                <span className="text-xs text-slate-400 tabular-nums">
                  {lastFetched.toLocaleTimeString('ko-KR', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}{' '}
                  기준
                </span>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-yellow-400"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                <X className="w-4 h-4" />
                필터 초기화
              </button>
              <p className="text-xs text-slate-500">
                직접 지정한 기간은 <span className="font-bold">검색</span>을 눌러야 적용됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-slate-600">{error}</p>
            <p className="mt-2 text-xs text-slate-400">
              테이블이 없다면 <span className="font-mono">supabase/migrations/20260917_kiosk_analyses.sql</span>을
              Supabase SQL 에디터에서 먼저 실행해야 합니다.
            </p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Monitor className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">아직 기록이 없습니다.</p>
            <p className="mt-1 text-sm text-slate-400">
              키오스크에서 분석이 끝나고 결과 화면이 뜨면 여기에 한 건씩 쌓입니다.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {/* 목록이 길어지면 어느 열이 무엇인지 놓친다 — 헤더를 붙여 둔다 */}
                <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
                  <tr className="text-left text-xs font-bold text-slate-500">
                    <th className="px-4 py-3 w-8" />
                    <th className="px-4 py-3">일시</th>
                    <th className="px-4 py-3">손님</th>
                    <th className="px-4 py-3">프로그램</th>
                    <th className="px-4 py-3">제품</th>
                    <th className="px-4 py-3">추천 향</th>
                    <th className="px-4 py-3">매칭도</th>
                    <th className="px-4 py-3">영수증</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <Fragment key={record.id}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {expanded === record.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {formatDateTime(record.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900">{record.customer_name || '게스트'}</span>
                          {record.gender && <span className="ml-1.5 text-xs text-slate-400">{record.gender}</span>}
                          {record.mocked && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                              데모
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${PROGRAM_COLORS[record.program] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {KIOSK_PROGRAM_LABELS[record.program] ?? record.program}
                          </span>
                          {record.photo_source && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-slate-400">
                              {record.photo_source === 'qr' ? <QrCode size={11} /> : <Camera size={11} />}
                              {record.photo_source === 'qr' ? '폰' : '기기'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.product_label || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">
                            {record.perfume_no ? `No.${record.perfume_no} ` : ''}
                            {record.perfume_name || '-'}
                          </span>
                          {record.category_en && (
                            <span className="ml-1.5 text-[11px] font-mono text-slate-400">{record.category_en}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">{formatScore(record.match_score)}</td>
                        <td className="px-4 py-3">
                          {record.printed ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                              <Printer size={12} />
                              {record.ticket ? `#${record.ticket}` : '출력'}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">미출력</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="text-slate-300 hover:text-red-500"
                            title="기록 삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>

                      {expanded === record.id && (
                        <tr className="bg-slate-50">
                          <td colSpan={9} className="px-6 py-5">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                {record.keywords && record.keywords.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1.5">키워드</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {record.keywords.map((keyword) => (
                                        <span
                                          key={keyword}
                                          className="px-2 py-1 rounded bg-white border border-slate-200 text-xs text-slate-700"
                                        >
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {record.personal_color && (
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1">퍼스널 컬러</p>
                                    <p className="text-sm text-slate-700">{record.personal_color}</p>
                                  </div>
                                )}
                                {record.analysis_text && (
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1">분석 요약</p>
                                    <p className="text-sm leading-relaxed text-slate-700">{record.analysis_text}</p>
                                  </div>
                                )}
                                {record.traits && record.traits.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1.5">시그널</p>
                                    <ul className="space-y-1">
                                      {record.traits.map((trait, i) => (
                                        <li key={`${trait.label}-${i}`} className="flex items-center gap-2 text-xs">
                                          <span className="w-16 text-slate-500">{trait.label}</span>
                                          <div className="flex-1 h-2 bg-slate-200 rounded">
                                            <div
                                              className="h-full bg-slate-800 rounded"
                                              style={{ width: `${((trait.value ?? 0) / 10) * 100}%` }}
                                            />
                                          </div>
                                          <span className="w-6 text-right font-bold text-slate-600">{trait.value}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                {record.recipe && record.recipe.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1.5">조향 레시피</p>
                                    <table className="w-full text-xs">
                                      <tbody className="divide-y divide-slate-200">
                                        {record.recipe.map((row, i) => (
                                          <tr key={`${row.id}-${i}`}>
                                            <td className="py-1 font-mono font-bold text-slate-700">{row.id}</td>
                                            <td className="py-1 text-slate-600">{row.name}</td>
                                            <td className="py-1 text-right font-bold text-slate-700">{row.ratio}%</td>
                                            <td className="py-1 text-right text-slate-500">
                                              {typeof row.amountMl === 'number' ? `${row.amountMl.toFixed(1)}ml` : ''}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                {record.saju && (
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1">사주 요약</p>
                                    <pre className="max-h-40 overflow-auto rounded bg-white border border-slate-200 p-2 text-[11px] text-slate-600">
                                      {JSON.stringify(record.saju, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
                                  {record.ticket && <span>발권 #{record.ticket}</span>}
                                  {record.printed_at && <span>출력 {formatDateTime(record.printed_at)}</span>}
                                  {record.device && <span>기기 {record.device}</span>}
                                  <span className="font-mono">{record.id.slice(0, 8)}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t-2 border-slate-100">
                <p className="text-xs text-slate-500">
                  {page} / {totalPages} 페이지 · 총 {total.toLocaleString()}건
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
