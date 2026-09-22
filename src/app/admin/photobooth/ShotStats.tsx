'use client'

/**
 * 촬영 내역 통계 (관리자)
 *
 * 사진은 저장하지 않고 메타데이터만 쌓는다 — 어떤 체험을, 어떤 생카에서,
 * 어떤 카드/프레임으로 찍었고 인쇄까지 갔는지. 카드 발주량·인력 배치·체험 개편의 근거로 쓴다.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  Loader2,
  Printer,
  Camera,
  Scissors,
  RefreshCw,
} from 'lucide-react'

interface ShotRow {
  id: string
  created_at: string
  mode: string
  cut_count: number
  card_code: string | null
  frame_title: string | null
  template_title: string | null
  cutout_used: boolean
  printed: boolean
  downloaded: boolean
  photobooth_events: { title: string } | null
}

interface ShotStatsData {
  summary: {
    total: number
    today: number
    printed: number
    print_rate: number
    cutout_used: number
    avg_cuts: number
  }
  by_mode: Record<string, number>
  by_event: Record<string, number>
  by_card: Record<string, number>
  by_frame: Record<string, number>
  daily: { date: string; count: number; printed: number }[]
  hourly: number[]
  recent: ShotRow[]
}

const MODE_LABEL: Record<string, string> = {
  card: '포토카드',
  together: '포카·직찍 합성',
  template: '최애와 찍기',
  solo: '일반 촬영',
}

const RANGES = [
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: 90, label: '90일' },
]

function Tile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/** 값 목록을 가로 막대로 — 차트 라이브러리 없이 비율만 보여준다 */
function BarList({
  data,
  labelMap,
  empty,
  limit = 6,
}: {
  data: Record<string, number>
  labelMap?: Record<string, string>
  empty: string
  limit?: number
}) {
  const entries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
  const max = entries[0]?.[1] ?? 0

  if (entries.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, count]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-slate-600 truncate">
            {labelMap?.[key] ?? key}
          </span>
          <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-slate-900 rounded"
              style={{ width: max ? `${Math.max(3, (count / max) * 100)}%` : '0%' }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-700">
            {count}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ShotStats({ onToast }: { onToast: (msg: string) => void }) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<ShotStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/photobooth/shots?days=${days}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (err) {
      console.error('촬영 통계 로드 실패:', err)
      onToast('촬영 통계를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [days, onToast])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const maxDaily = data ? Math.max(1, ...data.daily.map((d) => d.count)) : 1
  const maxHourly = data ? Math.max(1, ...data.hourly) : 1

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">촬영 내역</h2>
          <p className="text-sm text-slate-500">
            어떤 체험이 얼마나 쓰였고 인쇄까지 갔는지 누적합니다. 손님 사진은 저장하지 않고
            기록만 남깁니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  days === r.days
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchStats}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      ) : !data || data.summary.total === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
          이 기간에 촬영 기록이 없습니다.
        </div>
      ) : (
        <div className="space-y-5">
          {/* 요약 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile
              icon={<Camera className="w-4 h-4" />}
              label="총 촬영"
              value={`${data.summary.total}`}
              sub={`오늘 ${data.summary.today}건`}
            />
            <Tile
              icon={<Printer className="w-4 h-4" />}
              label="인쇄"
              value={`${data.summary.printed}`}
              sub={`완성 대비 ${data.summary.print_rate}%`}
            />
            <Tile
              icon={<Scissors className="w-4 h-4" />}
              label="배경 제거 합성"
              value={`${data.summary.cutout_used}`}
              sub={`전체의 ${
                data.summary.total
                  ? Math.round((data.summary.cutout_used / data.summary.total) * 100)
                  : 0
              }%`}
            />
            <Tile
              icon={<BarChart3 className="w-4 h-4" />}
              label="평균 컷 수"
              value={`${data.summary.avg_cuts}`}
              sub="한 번 촬영당"
            />
          </div>

          {/* 일별 추이 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">일별 추이</h3>
            <div className="flex items-stretch gap-[3px] h-28">
              {data.daily.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 flex h-full flex-col justify-end group relative"
                  title={`${d.date} · ${d.count}건 (인쇄 ${d.printed})`}
                >
                  <div
                    className="w-full bg-slate-200 rounded-t"
                    style={{ height: `${(d.count / maxDaily) * 100}%` }}
                  >
                    <div
                      className="w-full bg-slate-900 rounded-t"
                      style={{ height: d.count ? `${(d.printed / d.count) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-slate-400">
              <span>{data.daily[0]?.date}</span>
              <span>
                <span className="inline-block w-2 h-2 bg-slate-900 rounded-sm mr-1" />
                인쇄
                <span className="inline-block w-2 h-2 bg-slate-200 rounded-sm ml-3 mr-1" />
                완성
              </span>
              <span>{data.daily[data.daily.length - 1]?.date}</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* 체험별 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">체험별</h3>
              <BarList data={data.by_mode} labelMap={MODE_LABEL} empty="기록 없음" />
            </div>

            {/* 시간대 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                시간대 분포 <span className="font-normal text-slate-400">(KST)</span>
              </h3>
              <div className="flex items-end gap-[2px] h-24">
                {data.hourly.map((count, hour) => (
                  <div
                    key={hour}
                    className="flex-1 bg-slate-900 rounded-t min-h-[2px]"
                    style={{ height: `${(count / maxHourly) * 100}%` }}
                    title={`${hour}시 · ${count}건`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-slate-400">
                <span>0시</span>
                <span>12시</span>
                <span>23시</span>
              </div>
            </div>

            {/* 카드별 — 카드 추가 제작 판단 근거 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">포토카드별 사용</h3>
              <BarList data={data.by_card} empty="포토카드 사용 기록 없음" />
            </div>

            {/* 이벤트별 — 주최자 리포트용 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">생카별</h3>
              <BarList data={data.by_event} empty="이벤트 귀속 기록 없음" />
            </div>
          </div>

          {/* 최근 내역 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">시각</th>
                  <th className="px-4 py-3 font-semibold">체험</th>
                  <th className="px-4 py-3 font-semibold">카드 · 컷</th>
                  <th className="px-4 py-3 font-semibold">프레임</th>
                  <th className="px-4 py-3 font-semibold">생카</th>
                  <th className="px-4 py-3 font-semibold">결과</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString('ko-KR', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900 font-medium">
                      {MODE_LABEL[row.mode] ?? row.mode}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {row.card_code ? (
                        <span className="font-mono">{row.card_code}</span>
                      ) : (
                        row.template_title ?? '—'
                      )}
                      <span className="text-slate-300"> · {row.cut_count}컷</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-[140px] truncate">
                      {row.frame_title ?? '없음'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-[140px] truncate">
                      {row.photobooth_events?.title ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {row.printed && (
                          <span className="text-[11px] font-bold bg-slate-900 text-white rounded-full px-2 py-0.5">
                            인쇄
                          </span>
                        )}
                        {row.downloaded && (
                          <span className="text-[11px] font-bold bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">
                            저장
                          </span>
                        )}
                        {!row.printed && !row.downloaded && (
                          <span className="text-[11px] text-slate-400">완성만</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
