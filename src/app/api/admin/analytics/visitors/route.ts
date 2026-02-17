import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'

// 서비스 역할 클라이언트 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

// 관리자 인증 확인
async function isAdmin(): Promise<boolean> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase())
  }

  const supabase = await createServerSupabaseClientWithCookies()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    return ADMIN_EMAILS.includes(user.email.toLowerCase())
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 확인
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const period = searchParams.get('period') || '7d'
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    // 기간 계산
    const now = new Date()
    let periodStart: Date
    let periodEnd = new Date(now)

    if (startDate && endDate) {
      periodStart = new Date(startDate)
      periodEnd = new Date(endDate)
    } else {
      const days = period === '1d' ? 1 : period === '30d' ? 30 : period === '90d' ? 90 : 7
      periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    }

    switch (type) {
      case 'summary':
        return await getSummary(periodStart, periodEnd)
      case 'daily':
        return await getDailyStats(periodStart, periodEnd)
      case 'hourly':
        return await getHourlyStats(periodStart, periodEnd)
      case 'top-pages':
        return await getTopPages(periodStart, periodEnd)
      case 'referrers':
        return await getReferrers(periodStart, periodEnd)
      case 'devices':
        return await getDevices(periodStart, periodEnd)
      case 'events':
        return await getEvents(periodStart, periodEnd)
      case 'realtime':
        return await getRealtime()
      case 'user-flow':
        return await getUserFlow(periodStart, periodEnd)
      case 'calendar':
        return await getCalendarData(searchParams.get('year'), searchParams.get('month'))
      case 'duration-detail':
        return await getDurationDetail(periodStart, periodEnd)
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Visitors Analytics API Error]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 요약 통계
async function getSummary(start: Date, end: Date) {
  const startStr = start.toISOString()
  const endStr = end.toISOString()

  // 현재 기간 통계
  const { data: sessions } = await supabaseAdmin
    .from('analytics_sessions')
    .select('id, page_views_count, started_at, last_activity_at')
    .gte('started_at', startStr)
    .lte('started_at', endStr)
    .limit(50000)

  const { count: pageViews } = await supabaseAdmin
    .from('analytics_page_views')
    .select('*', { count: 'exact', head: true })
    .gte('viewed_at', startStr)
    .lte('viewed_at', endStr)

  // 이전 기간 통계 (비교용)
  const periodLength = end.getTime() - start.getTime()
  const prevStart = new Date(start.getTime() - periodLength)
  const prevEnd = new Date(start.getTime())

  const { data: prevSessions } = await supabaseAdmin
    .from('analytics_sessions')
    .select('id')
    .gte('started_at', prevStart.toISOString())
    .lte('started_at', prevEnd.toISOString())
    .limit(50000)

  const { count: prevPageViews } = await supabaseAdmin
    .from('analytics_page_views')
    .select('*', { count: 'exact', head: true })
    .gte('viewed_at', prevStart.toISOString())
    .lte('viewed_at', prevEnd.toISOString())

  const currentVisitors = sessions?.length || 0
  const previousVisitors = prevSessions?.length || 0
  const currentPV = pageViews || 0
  const previousPV = prevPageViews || 0

  // 평균 세션 시간 계산
  let avgDuration = 0
  if (sessions && sessions.length > 0) {
    const totalDuration = sessions.reduce((acc, s) => {
      const duration =
        new Date(s.last_activity_at).getTime() - new Date(s.started_at).getTime()
      return acc + duration
    }, 0)
    avgDuration = Math.round(totalDuration / sessions.length / 1000)
  }

  // 이탈률 계산
  const bouncedSessions = sessions?.filter((s) => s.page_views_count === 1).length || 0
  const bounceRate =
    currentVisitors > 0 ? Math.round((bouncedSessions / currentVisitors) * 100) : 0

  return NextResponse.json({
    summary: {
      visitors: currentVisitors,
      pageViews: currentPV,
      sessions: currentVisitors,
      avgDuration,
      bounceRate,
      avgPagesPerSession:
        currentVisitors > 0 ? Math.round((currentPV / currentVisitors) * 10) / 10 : 0,
    },
    comparison: {
      visitorsChange: calculateChange(currentVisitors, previousVisitors),
      pageViewsChange: calculateChange(currentPV, previousPV),
      sessionsChange: calculateChange(currentVisitors, previousVisitors),
    },
  })
}

// 일별 통계
async function getDailyStats(start: Date, end: Date) {
  // sessions의 page_views_count를 활용하여 PV도 함께 집계 (1000행 제한 회피)
  const { data: sessions } = await supabaseAdmin
    .from('analytics_sessions')
    .select('started_at, page_views_count')
    .gte('started_at', start.toISOString())
    .lte('started_at', end.toISOString())
    .limit(50000)

  // 날짜별 집계
  const dailyMap = new Map<string, { visitors: number; pageViews: number }>()

  sessions?.forEach((s) => {
    const date = new Date(s.started_at).toISOString().split('T')[0]
    const existing = dailyMap.get(date) || { visitors: 0, pageViews: 0 }
    existing.visitors++
    existing.pageViews += s.page_views_count || 0
    dailyMap.set(date, existing)
  })

  const daily = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ daily })
}

// 인기 페이지
async function getTopPages(start: Date, end: Date) {
  const { data } = await supabaseAdmin
    .from('analytics_page_views')
    .select('page_path, session_id')
    .gte('viewed_at', start.toISOString())
    .lte('viewed_at', end.toISOString())
    .limit(50000)

  const pageMap = new Map<string, { views: number; sessions: Set<string> }>()

  data?.forEach((pv) => {
    const existing = pageMap.get(pv.page_path) || { views: 0, sessions: new Set() }
    existing.views++
    existing.sessions.add(pv.session_id)
    pageMap.set(pv.page_path, existing)
  })

  const pages = Array.from(pageMap.entries())
    .map(([page_path, stats]) => ({
      page_path,
      views: stats.views,
      unique_visitors: stats.sessions.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20)

  return NextResponse.json({ pages })
}

// 유입 경로
async function getReferrers(start: Date, end: Date) {
  const { data } = await supabaseAdmin
    .from('analytics_sessions')
    .select('referrer_domain, utm_source, utm_medium, utm_campaign')
    .gte('started_at', start.toISOString())
    .lte('started_at', end.toISOString())
    .limit(50000)

  const referrerMap = new Map<string, number>()
  let total = 0

  data?.forEach((s) => {
    const domain = s.referrer_domain || '직접 유입'
    referrerMap.set(domain, (referrerMap.get(domain) || 0) + 1)
    total++
  })

  const referrers = Array.from(referrerMap.entries())
    .map(([referrer_domain, sessions]) => ({
      referrer_domain,
      sessions,
      percentage: total > 0 ? Math.round((sessions / total) * 100) : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10)

  // UTM 캠페인별 통계
  const campaignMap = new Map<string, number>()
  data?.forEach((s) => {
    if (s.utm_campaign) {
      campaignMap.set(s.utm_campaign, (campaignMap.get(s.utm_campaign) || 0) + 1)
    }
  })

  const campaigns = Array.from(campaignMap.entries())
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ referrers, campaigns })
}

// 디바이스 통계
async function getDevices(start: Date, end: Date) {
  const { data } = await supabaseAdmin
    .from('analytics_sessions')
    .select('device_type, browser, os')
    .gte('started_at', start.toISOString())
    .lte('started_at', end.toISOString())
    .limit(50000)

  const deviceMap = new Map<string, number>()
  const browserMap = new Map<string, number>()
  const osMap = new Map<string, number>()

  data?.forEach((s) => {
    deviceMap.set(s.device_type || 'unknown', (deviceMap.get(s.device_type || 'unknown') || 0) + 1)
    if (s.browser) browserMap.set(s.browser, (browserMap.get(s.browser) || 0) + 1)
    if (s.os) osMap.set(s.os, (osMap.get(s.os) || 0) + 1)
  })

  return NextResponse.json({
    devices: Object.fromEntries(deviceMap),
    browsers: Object.fromEntries(browserMap),
    os: Object.fromEntries(osMap),
  })
}

// 이벤트 통계
async function getEvents(start: Date, end: Date) {
  const { data } = await supabaseAdmin
    .from('analytics_events')
    .select('event_name, event_category, event_data, page_path')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .limit(50000)

  const eventMap = new Map<string, number>()

  data?.forEach((e) => {
    eventMap.set(e.event_name, (eventMap.get(e.event_name) || 0) + 1)
  })

  const events = Array.from(eventMap.entries())
    .map(([event_name, count]) => ({ event_name, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ events })
}

// 실시간 통계 (최근 5분)
async function getRealtime() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: activeSessions } = await supabaseAdmin
    .from('analytics_sessions')
    .select('session_id, device_type')
    .gte('last_activity_at', fiveMinutesAgo)

  const { data: recentPageViews } = await supabaseAdmin
    .from('analytics_page_views')
    .select('page_path, session_id')
    .gte('viewed_at', fiveMinutesAgo)

  const pageMap = new Map<string, number>()
  recentPageViews?.forEach((pv) => {
    pageMap.set(pv.page_path, (pageMap.get(pv.page_path) || 0) + 1)
  })

  const currentPages = Array.from(pageMap.entries())
    .map(([page_path, count]) => ({ page_path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return NextResponse.json({
    activeVisitors: activeSessions?.length || 0,
    currentPages,
    lastUpdated: new Date().toISOString(),
  })
}

// 사용자 플로우
async function getUserFlow(start: Date, end: Date) {
  const { data } = await supabaseAdmin
    .from('analytics_page_views')
    .select('session_id, page_path, previous_page, viewed_at')
    .gte('viewed_at', start.toISOString())
    .lte('viewed_at', end.toISOString())
    .order('viewed_at', { ascending: true })
    .limit(50000)

  const flowMap = new Map<string, number>()

  data?.forEach((pv) => {
    if (pv.previous_page) {
      const key = `${pv.previous_page}|${pv.page_path}`
      flowMap.set(key, (flowMap.get(key) || 0) + 1)
    }
  })

  const flows = Array.from(flowMap.entries())
    .map(([path, count]) => {
      const [from, to] = path.split('|')
      return { from, to, count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  return NextResponse.json({ flows })
}

// 시간별 통계 (1일 뷰용)
async function getHourlyStats(start: Date, end: Date) {
  const { data: sessions } = await supabaseAdmin
    .from('analytics_sessions')
    .select('started_at, page_views_count')
    .gte('started_at', start.toISOString())
    .lte('started_at', end.toISOString())
    .limit(50000)

  // 시간별 집계 (0~23시) - sessions의 page_views_count 활용
  const hourlyMap = new Map<number, { visitors: number; pageViews: number }>()
  for (let i = 0; i < 24; i++) {
    hourlyMap.set(i, { visitors: 0, pageViews: 0 })
  }

  sessions?.forEach((s) => {
    const hour = new Date(s.started_at).getHours()
    const existing = hourlyMap.get(hour)!
    existing.visitors++
    existing.pageViews += s.page_views_count || 0
  })

  const hourly = Array.from(hourlyMap.entries())
    .map(([hour, stats]) => ({ hour, ...stats }))
    .sort((a, b) => a.hour - b.hour)

  return NextResponse.json({ hourly })
}

// 캘린더 데이터 (월별 일별 방문자 수)
async function getCalendarData(yearStr: string | null, monthStr: string | null) {
  const now = new Date()
  const year = yearStr ? parseInt(yearStr) : now.getFullYear()
  const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

  // sessions의 page_views_count를 활용하여 PV도 함께 집계 (1000행 제한 회피)
  const { data: sessions } = await supabaseAdmin
    .from('analytics_sessions')
    .select('started_at, page_views_count, last_activity_at')
    .gte('started_at', startOfMonth.toISOString())
    .lte('started_at', endOfMonth.toISOString())
    .limit(50000)

  // 일별 집계
  const dailyMap = new Map<number, { visitors: number; pageViews: number; avgDuration: number; totalDuration: number }>()

  sessions?.forEach((s) => {
    const day = new Date(s.started_at).getDate()
    const existing = dailyMap.get(day) || { visitors: 0, pageViews: 0, avgDuration: 0, totalDuration: 0 }
    existing.visitors++
    existing.pageViews += s.page_views_count || 0
    const duration = new Date(s.last_activity_at).getTime() - new Date(s.started_at).getTime()
    existing.totalDuration += duration
    dailyMap.set(day, existing)
  })

  // 평균 체류시간 계산
  dailyMap.forEach((stats) => {
    if (stats.visitors > 0) {
      stats.avgDuration = Math.round(stats.totalDuration / stats.visitors / 1000)
    }
  })

  const daysInMonth = endOfMonth.getDate()
  const calendarDays = []
  for (let d = 1; d <= daysInMonth; d++) {
    const stats = dailyMap.get(d)
    calendarDays.push({
      day: d,
      visitors: stats?.visitors || 0,
      pageViews: stats?.pageViews || 0,
      avgDuration: stats?.avgDuration || 0,
    })
  }

  return NextResponse.json({
    year,
    month,
    daysInMonth,
    firstDayOfWeek: startOfMonth.getDay(), // 0=일, 1=월, ...
    days: calendarDays,
  })
}

// 체류시간 상세 분석
async function getDurationDetail(start: Date, end: Date) {
  const { data: sessions } = await supabaseAdmin
    .from('analytics_sessions')
    .select('id, started_at, last_activity_at, page_views_count, device_type')
    .gte('started_at', start.toISOString())
    .lte('started_at', end.toISOString())
    .limit(50000)

  const { data: pageViews } = await supabaseAdmin
    .from('analytics_page_views')
    .select('page_path, time_on_page, session_id')
    .gte('viewed_at', start.toISOString())
    .lte('viewed_at', end.toISOString())
    .limit(50000)

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({
      avgDuration: 0,
      medianDuration: 0,
      distribution: [],
      byDevice: {},
      byPage: [],
      dailyTrend: [],
    })
  }

  // 세션별 체류시간 계산
  const durations = sessions.map((s) => {
    const dur = Math.round(
      (new Date(s.last_activity_at).getTime() - new Date(s.started_at).getTime()) / 1000
    )
    return { duration: Math.max(dur, 0), device: s.device_type || 'unknown', startedAt: s.started_at }
  })

  // 평균
  const totalDuration = durations.reduce((sum, d) => sum + d.duration, 0)
  const avgDuration = Math.round(totalDuration / durations.length)

  // 중앙값
  const sorted = [...durations].sort((a, b) => a.duration - b.duration)
  const medianDuration = sorted[Math.floor(sorted.length / 2)]?.duration || 0

  // 최대값
  const maxDuration = sorted[sorted.length - 1]?.duration || 0

  // 분포 (구간별)
  const buckets = [
    { label: '0~10초', min: 0, max: 10 },
    { label: '10~30초', min: 10, max: 30 },
    { label: '30초~1분', min: 30, max: 60 },
    { label: '1~3분', min: 60, max: 180 },
    { label: '3~5분', min: 180, max: 300 },
    { label: '5~10분', min: 300, max: 600 },
    { label: '10분+', min: 600, max: Infinity },
  ]

  const distribution = buckets.map((bucket) => {
    const count = durations.filter(
      (d) => d.duration >= bucket.min && d.duration < bucket.max
    ).length
    return {
      label: bucket.label,
      count,
      percentage: Math.round((count / durations.length) * 100),
    }
  })

  // 디바이스별 평균 체류시간
  const deviceDurations: Record<string, number[]> = {}
  durations.forEach((d) => {
    if (!deviceDurations[d.device]) deviceDurations[d.device] = []
    deviceDurations[d.device].push(d.duration)
  })

  const byDevice: Record<string, { avg: number; count: number }> = {}
  Object.entries(deviceDurations).forEach(([device, durs]) => {
    byDevice[device] = {
      avg: Math.round(durs.reduce((a, b) => a + b, 0) / durs.length),
      count: durs.length,
    }
  })

  // 페이지별 평균 체류시간
  const pageTimeMap = new Map<string, { totalTime: number; count: number }>()
  pageViews?.forEach((pv) => {
    if (pv.time_on_page && pv.time_on_page > 0) {
      const existing = pageTimeMap.get(pv.page_path) || { totalTime: 0, count: 0 }
      existing.totalTime += pv.time_on_page
      existing.count++
      pageTimeMap.set(pv.page_path, existing)
    }
  })

  const byPage = Array.from(pageTimeMap.entries())
    .map(([page, stats]) => ({
      page,
      avgTime: Math.round(stats.totalTime / stats.count),
      views: stats.count,
    }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 10)

  // 일별 평균 체류시간 추이
  const dailyDurationMap = new Map<string, number[]>()
  durations.forEach((d) => {
    const date = new Date(d.startedAt).toISOString().split('T')[0]
    if (!dailyDurationMap.has(date)) dailyDurationMap.set(date, [])
    dailyDurationMap.get(date)!.push(d.duration)
  })

  const dailyTrend = Array.from(dailyDurationMap.entries())
    .map(([date, durs]) => ({
      date,
      avgDuration: Math.round(durs.reduce((a, b) => a + b, 0) / durs.length),
      sessions: durs.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    avgDuration,
    medianDuration,
    maxDuration,
    totalSessions: durations.length,
    distribution,
    byDevice,
    byPage,
    dailyTrend,
  })
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}
