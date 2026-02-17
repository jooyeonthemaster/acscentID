// Analytics 시스템 타입 정의

export interface AnalyticsSession {
  id: string
  session_id: string
  user_id: string | null
  user_agent: string | null
  device_type: 'mobile' | 'tablet' | 'desktop'
  browser: string | null
  os: string | null
  country: string | null
  city: string | null
  referrer: string | null
  referrer_domain: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  landing_page: string | null
  started_at: string
  last_activity_at: string
  page_views_count: number
  events_count: number
}

export interface AnalyticsPageView {
  id: string
  session_id: string
  user_id: string | null
  page_path: string
  page_title: string | null
  page_url: string | null
  previous_page: string | null
  time_on_page: number | null
  viewed_at: string
}

export interface AnalyticsEvent {
  id: string
  session_id: string
  user_id: string | null
  event_name: string
  event_category: string | null
  event_data: Record<string, unknown>
  page_path: string | null
  created_at: string
}

export interface AnalyticsDailyStats {
  id: string
  date: string
  unique_visitors: number
  total_sessions: number
  total_page_views: number
  total_events: number
  avg_session_duration: number
  avg_pages_per_session: number
  bounce_rate: number
  mobile_sessions: number
  desktop_sessions: number
  tablet_sessions: number
  updated_at: string
}

// 대시보드용 집계 타입
export interface AnalyticsSummary {
  today: {
    visitors: number
    pageViews: number
    sessions: number
    avgDuration: number
    bounceRate: number
  }
  comparison: {
    visitorsChange: number
    pageViewsChange: number
    sessionsChange: number
  }
}

export interface TopPage {
  page_path: string
  views: number
  unique_visitors: number
}

export interface TopReferrer {
  referrer_domain: string
  sessions: number
  percentage: number
}

export interface DeviceStats {
  mobile: number
  desktop: number
  tablet: number
}

export interface HourlyStats {
  hour: number
  visitors: number
  page_views: number
}

export interface RealtimeStats {
  activeVisitors: number
  currentPages: Array<{
    page_path: string
    count: number
  }>
}
