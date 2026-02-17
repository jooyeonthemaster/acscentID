'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import {
  Users,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  MousePointer,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowRight,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Timer,
} from 'lucide-react'

// 타입 정의
interface VisitorSummary {
  visitors: number
  pageViews: number
  sessions: number
  avgDuration: number
  bounceRate: number
  avgPagesPerSession: number
}

interface Comparison {
  visitorsChange: number
  pageViewsChange: number
  sessionsChange: number
}

interface DailyData {
  date: string
  visitors: number
  pageViews: number
}

interface HourlyData {
  hour: number
  visitors: number
  pageViews: number
}

interface TopPage {
  page_path: string
  views: number
  unique_visitors: number
}

interface Referrer {
  referrer_domain: string
  sessions: number
  percentage: number
}

interface DeviceData {
  devices: Record<string, number>
  browsers: Record<string, number>
  os: Record<string, number>
}

interface RealtimeData {
  activeVisitors: number
  currentPages: Array<{ page_path: string; count: number }>
  lastUpdated: string
}

interface UserFlow {
  from: string
  to: string
  count: number
}

interface CalendarDay {
  day: number
  visitors: number
  pageViews: number
  avgDuration: number
}

interface CalendarData {
  year: number
  month: number
  daysInMonth: number
  firstDayOfWeek: number
  days: CalendarDay[]
}

interface DurationDetail {
  avgDuration: number
  medianDuration: number
  maxDuration: number
  totalSessions: number
  distribution: Array<{ label: string; count: number; percentage: number }>
  byDevice: Record<string, { avg: number; count: number }>
  byPage: Array<{ page: string; avgTime: number; views: number }>
  dailyTrend: Array<{ date: string; avgDuration: number; sessions: number }>
}

// 통계 카드 컴포넌트
function StatCard({
  icon: Icon,
  label,
  value,
  change,
  subValue,
  color = 'slate',
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  change?: number
  subValue?: string
  color?: 'slate' | 'yellow' | 'emerald' | 'blue' | 'purple' | 'orange'
  onClick?: () => void
}) {
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div
      className={`bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0] ${onClick ? 'cursor-pointer hover:border-slate-300 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{change >= 0 ? '+' : ''}{change}%</span>
              <span className="text-xs text-slate-400">vs 이전 기간</span>
            </div>
          )}
          {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {onClick && (
        <p className="text-xs text-slate-400 mt-2">클릭하여 상세 보기</p>
      )}
    </div>
  )
}

// 실시간 카드 컴포넌트
function RealtimeCard({ data }: { data: RealtimeData | null }) {
  return (
    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <span className="font-medium">실시간 접속자</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-100">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs">LIVE</span>
        </div>
      </div>
      <p className="text-5xl font-bold mb-4">{data?.activeVisitors || 0}</p>
      {data?.currentPages && data.currentPages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-emerald-100">현재 보고 있는 페이지</p>
          {data.currentPages.slice(0, 3).map((page) => (
            <div key={page.page_path} className="flex items-center justify-between text-sm">
              <span className="truncate max-w-[200px]">{page.page_path}</span>
              <span className="font-medium">{page.count}명</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 기간 선택 버튼
function PeriodSelector({
  period,
  onChange,
}: {
  period: string
  onChange: (period: string) => void
}) {
  const periods = [
    { value: '1d', label: '오늘' },
    { value: '7d', label: '7일' },
    { value: '30d', label: '30일' },
    { value: '90d', label: '90일' },
  ]

  return (
    <div className="flex gap-2">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            period === p.value
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// 시간 포맷팅
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${hrs}시간 ${remainMins}분`
  }
  return secs > 0 ? `${mins}분 ${secs}초` : `${mins}분`
}

// 페이지 이름 포맷팅
function formatPageName(path: string): string {
  const names: Record<string, string> = {
    '/': '홈',
    '/about': '소개',
    '/input': '분석 시작',
    '/input/figure': '피규어 분석',
    '/products': '상품',
    '/cart': '장바구니',
    '/checkout': '결제',
    '/mypage': '마이페이지',
    '/result': '분석 결과',
  }

  if (names[path]) return names[path]

  for (const [key, value] of Object.entries(names)) {
    if (path.startsWith(key) && key !== '/') return value
  }

  return path
}

// Y축 눈금 계산 헬퍼
function getYAxisTicks(max: number): number[] {
  if (max <= 0) return [0]
  const step = max <= 10 ? 2 : max <= 50 ? 10 : max <= 100 ? 25 : max <= 500 ? 100 : 250
  const ticks = []
  for (let i = 0; i <= max; i += step) ticks.push(i)
  if (ticks[ticks.length - 1] < max) ticks.push(Math.ceil(max / step) * step)
  return ticks
}

// 요일 헬퍼
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay() // 0=일, 6=토
}

function getDayLabel(dateStr: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[getDayOfWeek(dateStr)]
}

// 시간별 차트 컴포넌트 (1일 뷰)
function HourlyChart({ data }: { data: HourlyData[] }) {
  const maxVisitors = Math.max(...data.map((d) => d.visitors), 1)
  const maxPV = Math.max(...data.map((d) => d.pageViews), 1)
  const yMax = Math.max(maxVisitors, maxPV)
  const ticks = getYAxisTicks(yMax)
  const chartMax = ticks[ticks.length - 1] || 1
  const peakHour = data.reduce((peak, h) => h.visitors > peak.visitors ? h : peak, data[0])

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-700">시간대별 방문자</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-400" />
            <span className="text-slate-500">방문자</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-purple-300" />
            <span className="text-slate-500">페이지뷰</span>
          </div>
          {peakHour && peakHour.visitors > 0 && (
            <span className="text-orange-500 font-medium">
              피크: {peakHour.hour}시 ({peakHour.visitors}명)
            </span>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Y축 */}
        <div className="flex flex-col justify-between h-40 pr-2 text-right">
          {[...ticks].reverse().map((tick) => (
            <span key={tick} className="text-[10px] text-slate-400 leading-none">{tick}</span>
          ))}
        </div>

        {/* 차트 영역 */}
        <div className="flex-1 relative">
          {/* 가로 그리드 */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {ticks.map((tick) => (
              <div key={tick} className="border-b border-slate-100 w-full" />
            ))}
          </div>

          <div className="flex items-end gap-[2px] h-40 relative z-10">
            {data.map((hour) => {
              const vHeight = (hour.visitors / chartMax) * 100
              const pvHeight = (hour.pageViews / chartMax) * 100
              const isPeak = hour.hour === peakHour?.hour && hour.visitors > 0
              return (
                <div
                  key={hour.hour}
                  className="flex-1 flex items-end justify-center gap-[1px] group relative"
                >
                  {/* 툴팁 */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                      <p className="font-medium mb-1">{hour.hour}:00 ~ {hour.hour}:59</p>
                      <p className="text-blue-300">방문자: {hour.visitors}명</p>
                      <p className="text-purple-300">페이지뷰: {hour.pageViews}</p>
                      {hour.visitors > 0 && (
                        <p className="text-slate-400 text-[10px] mt-1">
                          PV/방문: {(hour.pageViews / hour.visitors).toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* 방문자 바 */}
                  <div
                    className={`w-[45%] rounded-t transition-all ${
                      isPeak ? 'bg-orange-400 hover:bg-orange-500' : 'bg-blue-400 hover:bg-blue-500'
                    }`}
                    style={{ height: `${vHeight}%`, minHeight: hour.visitors > 0 ? '3px' : '0' }}
                  />
                  {/* PV 바 */}
                  <div
                    className="w-[45%] bg-purple-300 rounded-t transition-all hover:bg-purple-400"
                    style={{ height: `${pvHeight}%`, minHeight: hour.pageViews > 0 ? '3px' : '0' }}
                  />
                </div>
              )
            })}
          </div>

          {/* X축 레이블 */}
          <div className="flex mt-1">
            {data.map((hour) => (
              <div key={hour.hour} className="flex-1 text-center">
                {hour.hour % 3 === 0 && (
                  <span className="text-[10px] text-slate-400">{hour.hour}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-slate-300 pl-8">
        <span>새벽</span>
        <span>오전</span>
        <span>오후</span>
        <span>저녁</span>
      </div>
    </div>
  )
}

// 일별 추이 차트 컴포넌트
function DailyChart({ data, period }: { data: DailyData[]; period: string }) {
  const maxVisitors = Math.max(...data.map((d) => d.visitors), 1)
  const maxPV = Math.max(...data.map((d) => d.pageViews), 1)
  const yMax = Math.max(maxVisitors, maxPV)
  const ticks = getYAxisTicks(yMax)
  const chartMax = ticks[ticks.length - 1] || 1
  const peakDay = data.reduce((peak, d) => d.visitors > peak.visitors ? d : peak, data[0])
  const totalVisitors = data.reduce((sum, d) => sum + d.visitors, 0)
  const totalPV = data.reduce((sum, d) => sum + d.pageViews, 0)
  const avgVisitors = data.length > 0 ? Math.round(totalVisitors / data.length) : 0
  const isCompact = period === '90d'

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-700">일별 방문자 추이</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-400" />
            <span className="text-slate-500">방문자</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-purple-300" />
            <span className="text-slate-500">페이지뷰</span>
          </div>
        </div>
      </div>

      {/* 요약 수치 */}
      <div className="flex gap-4 mb-3 text-xs text-slate-400">
        <span>합계: <strong className="text-slate-600">{totalVisitors.toLocaleString()}명</strong></span>
        <span>일평균: <strong className="text-slate-600">{avgVisitors}명</strong></span>
        <span>총 PV: <strong className="text-slate-600">{totalPV.toLocaleString()}</strong></span>
        {peakDay && (
          <span>피크: <strong className="text-orange-500">{peakDay.date.slice(5)} ({peakDay.visitors}명)</strong></span>
        )}
      </div>

      <div className="flex">
        {/* Y축 */}
        <div className="flex flex-col justify-between h-44 pr-2 text-right">
          {[...ticks].reverse().map((tick) => (
            <span key={tick} className="text-[10px] text-slate-400 leading-none">{tick}</span>
          ))}
        </div>

        {/* 차트 영역 */}
        <div className="flex-1 relative">
          {/* 가로 그리드 */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {ticks.map((tick) => (
              <div key={tick} className="border-b border-slate-100 w-full" />
            ))}
          </div>

          {/* 평균 라인 */}
          {avgVisitors > 0 && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-orange-300 z-10 pointer-events-none"
              style={{ bottom: `${(avgVisitors / chartMax) * 100}%` }}
            >
              <span className="absolute right-0 -top-3 text-[9px] text-orange-400 bg-white px-1">
                평균 {avgVisitors}
              </span>
            </div>
          )}

          <div className="flex items-end gap-[2px] h-44 relative z-10">
            {data.map((day) => {
              const vHeight = (day.visitors / chartMax) * 100
              const pvHeight = (day.pageViews / chartMax) * 100
              const isPeak = day.date === peakDay?.date && day.visitors > 0
              const dayOfWeek = getDayOfWeek(day.date)
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

              return (
                <div
                  key={day.date}
                  className={`flex-1 flex items-end justify-center gap-[1px] group relative ${
                    isWeekend ? 'bg-red-50/50' : ''
                  }`}
                >
                  {/* 툴팁 */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                      <p className="font-medium mb-1">
                        {day.date} ({getDayLabel(day.date)})
                        {isWeekend && <span className="text-red-300 ml-1">주말</span>}
                      </p>
                      <p className="text-blue-300">방문자: {day.visitors}명</p>
                      <p className="text-purple-300">페이지뷰: {day.pageViews}</p>
                      {day.visitors > 0 && (
                        <p className="text-slate-400 text-[10px] mt-1">
                          PV/방문: {(day.pageViews / day.visitors).toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* 방문자 바 */}
                  <div
                    className={`rounded-t transition-all ${
                      isPeak
                        ? 'bg-orange-400 hover:bg-orange-500'
                        : isWeekend
                        ? 'bg-blue-300 hover:bg-blue-400'
                        : 'bg-blue-400 hover:bg-blue-500'
                    } ${isCompact ? 'w-[48%]' : 'w-[45%]'}`}
                    style={{ height: `${vHeight}%`, minHeight: day.visitors > 0 ? '3px' : '0' }}
                  />
                  {/* PV 바 */}
                  <div
                    className={`rounded-t transition-all ${
                      isWeekend
                        ? 'bg-purple-200 hover:bg-purple-300'
                        : 'bg-purple-300 hover:bg-purple-400'
                    } ${isCompact ? 'w-[48%]' : 'w-[45%]'}`}
                    style={{ height: `${pvHeight}%`, minHeight: day.pageViews > 0 ? '3px' : '0' }}
                  />
                </div>
              )
            })}
          </div>

          {/* X축 레이블 */}
          <div className="flex mt-1">
            {data.map((day, idx) => {
              const dayOfWeek = getDayOfWeek(day.date)
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
              // 30일: 5일 간격, 90일: 7일 간격, 7일: 매일
              const showLabel = period === '7d' || (period === '30d' && idx % 5 === 0) || (period === '90d' && idx % 7 === 0)
              return (
                <div key={day.date} className="flex-1 text-center">
                  {showLabel && (
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] leading-tight ${isWeekend ? 'text-red-400 font-medium' : 'text-slate-400'}`}>
                        {day.date.slice(5)}
                      </span>
                      {period === '7d' && (
                        <span className={`text-[9px] ${isWeekend ? 'text-red-300' : 'text-slate-300'}`}>
                          {getDayLabel(day.date)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// 캘린더 히트맵 컴포넌트
function CalendarHeatmap({
  calendarData,
  onMonthChange,
  onDayClick,
}: {
  calendarData: CalendarData | null
  onMonthChange: (year: number, month: number) => void
  onDayClick: (day: CalendarDay) => void
}) {
  if (!calendarData) return null

  const { year, month, daysInMonth, firstDayOfWeek, days } = calendarData
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  const maxVisitors = Math.max(...days.map((d) => d.visitors), 1)

  const getHeatColor = (visitors: number) => {
    if (visitors === 0) return 'bg-slate-50 text-slate-300'
    const intensity = visitors / maxVisitors
    if (intensity > 0.75) return 'bg-blue-500 text-white'
    if (intensity > 0.5) return 'bg-blue-400 text-white'
    if (intensity > 0.25) return 'bg-blue-200 text-blue-800'
    return 'bg-blue-100 text-blue-700'
  }

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  const handlePrevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12)
    else onMonthChange(year, month - 1)
  }

  const handleNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1)
    else onMonthChange(year, month + 1)
  }

  // 월 이동 제한 (미래 불가)
  const canGoNext = !(year === today.getFullYear() && month === today.getMonth() + 1)

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-700">일별 방문자 캘린더</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[100px] text-center">
            {year}년 {month}월
          </span>
          <button
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className={`p-1 rounded ${canGoNext ? 'hover:bg-slate-100' : 'opacity-30 cursor-not-allowed'}`}
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div key={day} className={`text-center text-xs font-medium py-1 ${day === '일' ? 'text-red-400' : day === '토' ? 'text-blue-400' : 'text-slate-400'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 빈 셀 (월 시작 전) */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* 날짜 셀 */}
        {days.map((dayData) => {
          const isToday = isCurrentMonth && today.getDate() === dayData.day
          const isFuture = isCurrentMonth && dayData.day > today.getDate()
          const dayOfWeek = (firstDayOfWeek + dayData.day - 1) % 7

          return (
            <button
              key={dayData.day}
              onClick={() => !isFuture && onDayClick(dayData)}
              disabled={isFuture}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative group ${
                isFuture
                  ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                  : getHeatColor(dayData.visitors)
              } ${isToday ? 'ring-2 ring-slate-900 ring-offset-1' : ''} ${
                !isFuture ? 'hover:ring-2 hover:ring-slate-400' : ''
              }`}
            >
              <span className={`font-medium ${dayOfWeek === 0 && !isFuture && dayData.visitors === 0 ? 'text-red-300' : ''}`}>
                {dayData.day}
              </span>
              {dayData.visitors > 0 && (
                <span className="text-[9px] leading-none opacity-80">
                  {dayData.visitors}
                </span>
              )}

              {/* 호버 툴팁 */}
              {!isFuture && (
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                  <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    <p className="font-medium">{month}/{dayData.day} ({weekDays[dayOfWeek]})</p>
                    <p>방문자: {dayData.visitors}명</p>
                    <p>페이지뷰: {dayData.pageViews}</p>
                    <p>평균 체류: {formatDuration(dayData.avgDuration)}</p>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-end gap-1 mt-3 text-xs text-slate-400">
        <span>적음</span>
        <div className="w-3 h-3 rounded bg-blue-100" />
        <div className="w-3 h-3 rounded bg-blue-200" />
        <div className="w-3 h-3 rounded bg-blue-400" />
        <div className="w-3 h-3 rounded bg-blue-500" />
        <span>많음</span>
      </div>
    </div>
  )
}

// 체류시간 상세 분석 패널
function DurationDetailPanel({
  data,
  onClose,
}: {
  data: DurationDetail | null
  onClose: () => void
}) {
  if (!data) return null

  const maxDistCount = Math.max(...data.distribution.map((d) => d.count), 1)

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-bold text-slate-900">체류시간 상세 분석</h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100"
        >
          닫기
        </button>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-xs text-orange-600 mb-1">평균</p>
          <p className="text-lg font-bold text-orange-700">{formatDuration(data.avgDuration)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-600 mb-1">중앙값</p>
          <p className="text-lg font-bold text-blue-700">{formatDuration(data.medianDuration)}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-xs text-emerald-600 mb-1">최대</p>
          <p className="text-lg font-bold text-emerald-700">{formatDuration(data.maxDuration)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-600 mb-1">총 세션</p>
          <p className="text-lg font-bold text-slate-700">{data.totalSessions.toLocaleString()}</p>
        </div>
      </div>

      {/* 체류시간 분포 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-700 mb-3">체류시간 분포</h4>
        <div className="space-y-2">
          {data.distribution.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20 text-right flex-shrink-0">{bucket.label}</span>
              <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-300 to-orange-500 rounded-full transition-all"
                  style={{ width: `${(bucket.count / maxDistCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-600 w-16 flex-shrink-0">
                {bucket.count}명 ({bucket.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 디바이스별 체류시간 */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">디바이스별 체류시간</h4>
          <div className="space-y-3">
            {Object.entries(data.byDevice).map(([device, stats]) => {
              const DeviceIcon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor
              const deviceLabel = device === 'mobile' ? '모바일' : device === 'tablet' ? '태블릿' : device === 'desktop' ? '데스크톱' : device
              return (
                <div key={device} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <DeviceIcon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{deviceLabel}</span>
                      <span className="text-sm font-medium text-slate-900">{formatDuration(stats.avg)}</span>
                    </div>
                    <p className="text-xs text-slate-400">{stats.count}세션</p>
                  </div>
                </div>
              )
            })}
            {Object.keys(data.byDevice).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-2">데이터 없음</p>
            )}
          </div>
        </div>

        {/* 페이지별 체류시간 TOP */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">페이지별 평균 체류시간</h4>
          <div className="space-y-2">
            {data.byPage.map((page, idx) => (
              <div key={page.page} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 text-xs flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm text-slate-700 truncate flex-1" title={page.page}>
                  {formatPageName(page.page)}
                </span>
                <span className="text-sm font-medium text-slate-900 flex-shrink-0">
                  {formatDuration(page.avgTime)}
                </span>
              </div>
            ))}
            {data.byPage.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-2">데이터 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* 일별 체류시간 추이 */}
      {data.dailyTrend.length > 1 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-700 mb-3">일별 평균 체류시간 추이</h4>
          <div className="flex items-end gap-1 h-24">
            {data.dailyTrend.map((day) => {
              const maxDur = Math.max(...data.dailyTrend.map((d) => d.avgDuration), 1)
              const height = (day.avgDuration / maxDur) * 100
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                  title={`${day.date}: ${formatDuration(day.avgDuration)}`}
                >
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
                      {day.date.slice(5)}: {formatDuration(day.avgDuration)} ({day.sessions}세션)
                    </div>
                  </div>
                  <div
                    className="w-full bg-orange-300 rounded-t transition-all hover:bg-orange-400"
                    style={{ height: `${height}%`, minHeight: day.avgDuration > 0 ? '3px' : '0' }}
                  />
                  {data.dailyTrend.length <= 14 && (
                    <span className="text-[9px] text-slate-400 rotate-[-45deg] origin-top-left whitespace-nowrap">
                      {day.date.slice(5)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// 선택된 날짜 상세 팝업
function DayDetailPopup({
  day,
  month,
  year,
  onClose,
}: {
  day: CalendarDay
  month: number
  year: number
  onClose: () => void
}) {
  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 p-4 shadow-[3px_3px_0px_#bfdbfe]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-900">
          {year}.{String(month).padStart(2, '0')}.{String(day.day).padStart(2, '0')} 상세
        </h4>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100">
          닫기
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-600 mb-1">방문자</p>
          <p className="text-xl font-bold text-blue-700">{day.visitors}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xs text-purple-600 mb-1">페이지뷰</p>
          <p className="text-xl font-bold text-purple-700">{day.pageViews}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-xs text-orange-600 mb-1">평균 체류</p>
          <p className="text-xl font-bold text-orange-700">{formatDuration(day.avgDuration)}</p>
        </div>
      </div>
    </div>
  )
}

export default function VisitorsPage() {
  const [period, setPeriod] = useState('7d')
  const [summary, setSummary] = useState<VisitorSummary | null>(null)
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [devices, setDevices] = useState<DeviceData | null>(null)
  const [realtime, setRealtime] = useState<RealtimeData | null>(null)
  const [userFlow, setUserFlow] = useState<UserFlow[]>([])
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
  const [durationDetail, setDurationDetail] = useState<DurationDetail | null>(null)
  const [showDurationDetail, setShowDurationDetail] = useState(false)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 데이터 페칭 함수
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const baseUrl = `/api/admin/analytics/visitors?period=${period}`

      // 1일 모드일 때 시간별 데이터도 가져오기
      const fetches: Promise<Response>[] = [
        fetch(`${baseUrl}&type=summary`),
        fetch(`${baseUrl}&type=daily`),
        fetch(`${baseUrl}&type=top-pages`),
        fetch(`${baseUrl}&type=referrers`),
        fetch(`${baseUrl}&type=devices`),
        fetch(`${baseUrl}&type=user-flow`),
      ]

      if (period === '1d') {
        fetches.push(fetch(`${baseUrl}&type=hourly`))
      }

      const responses = await Promise.all(fetches)

      if (!responses[0].ok) throw new Error('데이터를 불러오는데 실패했습니다')

      const jsons = await Promise.all(responses.map((r) => r.json()))

      setSummary(jsons[0].summary)
      setComparison(jsons[0].comparison)
      setDailyData(jsons[1].daily || [])
      setTopPages(jsons[2].pages || [])
      setReferrers(jsons[3].referrers || [])
      setDevices(jsons[4])
      setUserFlow(jsons[5].flows || [])

      if (period === '1d' && jsons[6]) {
        setHourlyData(jsons[6].hourly || [])
      } else {
        setHourlyData([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [period])

  // 캘린더 데이터 페칭
  const fetchCalendarData = useCallback(async (year: number, month: number) => {
    try {
      const res = await fetch(
        `/api/admin/analytics/visitors?type=calendar&year=${year}&month=${month}`
      )
      if (res.ok) {
        const data = await res.json()
        setCalendarData(data)
      }
    } catch (err) {
      console.error('캘린더 데이터 로드 실패:', err)
    }
  }, [])

  // 체류시간 상세 페칭
  const fetchDurationDetail = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/analytics/visitors?type=duration-detail&period=${period}`
      )
      if (res.ok) {
        const data = await res.json()
        setDurationDetail(data)
        setShowDurationDetail(true)
      }
    } catch (err) {
      console.error('체류시간 상세 로드 실패:', err)
    }
  }, [period])

  // 실시간 데이터 페칭
  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/visitors?type=realtime')
      if (res.ok) {
        const data = await res.json()
        setRealtime(data)
      }
    } catch (err) {
      console.error('실시간 데이터 로드 실패:', err)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 캘린더 데이터 로드
  useEffect(() => {
    fetchCalendarData(calendarYear, calendarMonth)
  }, [calendarYear, calendarMonth, fetchCalendarData])

  // 실시간 데이터 주기적 업데이트
  useEffect(() => {
    fetchRealtime()
    const interval = setInterval(fetchRealtime, 30000)
    return () => clearInterval(interval)
  }, [fetchRealtime])

  const handleCalendarMonthChange = (year: number, month: number) => {
    setCalendarYear(year)
    setCalendarMonth(month)
    setSelectedDay(null)
  }

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const totalDevices = devices
    ? Object.values(devices.devices).reduce((a, b) => a + b, 0)
    : 0

  return (
    <div>
      <AdminHeader title="방문자 분석" subtitle="실시간 트래픽 및 사용자 행동 분석" />

      <div className="p-6 space-y-6">
        {/* 기간 선택 & 새로고침 */}
        <div className="flex items-center justify-between">
          <PeriodSelector period={period} onChange={setPeriod} />
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>

        {/* 실시간 + 주요 지표 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <RealtimeCard data={realtime} />
          <StatCard
            icon={Users}
            label="방문자"
            value={summary?.visitors.toLocaleString() || '0'}
            change={comparison?.visitorsChange}
            color="blue"
          />
          <StatCard
            icon={Eye}
            label="페이지뷰"
            value={summary?.pageViews.toLocaleString() || '0'}
            change={comparison?.pageViewsChange}
            color="purple"
          />
          <StatCard
            icon={Clock}
            label="평균 체류시간"
            value={formatDuration(summary?.avgDuration || 0)}
            color="orange"
            onClick={fetchDurationDetail}
          />
          <StatCard
            icon={MousePointer}
            label="이탈률"
            value={`${summary?.bounceRate || 0}%`}
            subValue={`페이지/세션: ${summary?.avgPagesPerSession || 0}`}
            color="slate"
          />
        </div>

        {/* 체류시간 상세 분석 (클릭 시 표시) */}
        {showDurationDetail && (
          <DurationDetailPanel
            data={durationDetail}
            onClose={() => setShowDurationDetail(false)}
          />
        )}

        {/* 시간대별 차트 (1일 뷰) */}
        {period === '1d' && hourlyData.length > 0 && (
          <HourlyChart data={hourlyData} />
        )}

        {/* 일별 추이 차트 (7일/30일/90일 뷰) */}
        {period !== '1d' && dailyData.length > 0 && (
          <DailyChart data={dailyData} period={period} />
        )}

        {/* 캘린더 히트맵 + 선택된 날짜 상세 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarHeatmap
              calendarData={calendarData}
              onMonthChange={handleCalendarMonthChange}
              onDayClick={handleDayClick}
            />
          </div>
          <div>
            {selectedDay ? (
              <DayDetailPopup
                day={selectedDay}
                month={calendarMonth}
                year={calendarYear}
                onClose={() => setSelectedDay(null)}
              />
            ) : (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-5 flex flex-col items-center justify-center h-full min-h-[200px]">
                <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400 text-center">
                  캘린더에서 날짜를 클릭하면<br />해당 일자의 상세 정보를 볼 수 있습니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 인기 페이지 & 유입 경로 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 인기 페이지 */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-sm font-medium text-slate-700 mb-4">인기 페이지 TOP 10</h3>
            <div className="space-y-3">
              {topPages.slice(0, 10).map((page, idx) => (
                <div key={page.page_path} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 truncate" title={page.page_path}>
                      {formatPageName(page.page_path)}
                    </p>
                    <p className="text-xs text-slate-400">{page.page_path}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{page.views.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{page.unique_visitors}명</p>
                  </div>
                </div>
              ))}
              {topPages.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">데이터가 없습니다</p>
              )}
            </div>
          </div>

          {/* 유입 경로 */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-sm font-medium text-slate-700 mb-4">유입 경로</h3>
            <div className="space-y-3">
              {referrers.map((ref) => (
                <div key={ref.referrer_domain} className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-900 truncate">{ref.referrer_domain}</p>
                      <span className="text-xs text-slate-400">{ref.percentage}%</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${ref.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{ref.sessions}</span>
                </div>
              ))}
              {referrers.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">데이터가 없습니다</p>
              )}
            </div>
          </div>
        </div>

        {/* 디바이스 & 사용자 플로우 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 디바이스 분포 */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-sm font-medium text-slate-700 mb-4">디바이스 분포</h3>
            {devices && totalDevices > 0 ? (
              <div className="space-y-4">
                {/* 디바이스 타입 */}
                <div className="flex items-center gap-4">
                  {[
                    { key: 'mobile', icon: Smartphone, label: '모바일' },
                    { key: 'desktop', icon: Monitor, label: '데스크톱' },
                    { key: 'tablet', icon: Tablet, label: '태블릿' },
                  ].map(({ key, icon: Icon, label }) => {
                    const count = devices.devices[key] || 0
                    const percent = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0
                    return (
                      <div key={key} className="flex-1 text-center">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                          <Icon className="w-6 h-6 text-slate-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{percent}%</p>
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="text-xs text-slate-400">{count}명</p>
                      </div>
                    )
                  })}
                </div>

                {/* 브라우저 */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">브라우저</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(devices.browsers)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([browser, count]) => (
                        <span
                          key={browser}
                          className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600"
                        >
                          {browser}: {count}
                        </span>
                      ))}
                  </div>
                </div>

                {/* OS */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">운영체제</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(devices.os)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([os, count]) => (
                        <span
                          key={os}
                          className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600"
                        >
                          {os}: {count}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">데이터가 없습니다</p>
            )}
          </div>

          {/* 사용자 플로우 */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-sm font-medium text-slate-700 mb-4">주요 페이지 이동 경로</h3>
            <div className="space-y-3">
              {userFlow.slice(0, 8).map((flow, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded truncate max-w-[120px]">
                    {formatPageName(flow.from)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded truncate max-w-[120px]">
                    {formatPageName(flow.to)}
                  </span>
                  <span className="ml-auto text-slate-500 flex-shrink-0">{flow.count}회</span>
                </div>
              ))}
              {userFlow.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">데이터가 없습니다</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
