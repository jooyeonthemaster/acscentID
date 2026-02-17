-- =====================================================
-- PPUDUCKXSPOT Analytics System
-- 방문자 추적, 페이지 뷰, 이벤트, 세션 관리
-- =====================================================

-- 1. 세션 테이블 (방문자 세션 관리)
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 방문자 정보
  user_agent TEXT,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  browser TEXT,
  os TEXT,

  -- 위치 (IP 기반, 선택적)
  country TEXT,
  city TEXT,

  -- 유입 경로
  referrer TEXT,
  referrer_domain TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- 랜딩 페이지
  landing_page TEXT,

  -- 타임스탬프
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- 세션 통계
  page_views_count INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0
);

-- 2. 페이지 뷰 테이블
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 페이지 정보
  page_path TEXT NOT NULL,
  page_title TEXT,
  page_url TEXT,

  -- 이전 페이지 (사용자 플로우 추적)
  previous_page TEXT,

  -- 체류 시간 (다음 페이지뷰 시점에 업데이트)
  time_on_page INTEGER, -- 초 단위

  -- 타임스탬프
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 이벤트 테이블 (커스텀 이벤트 추적)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 이벤트 정보
  event_name TEXT NOT NULL,
  event_category TEXT, -- 'click', 'form', 'scroll', 'purchase', etc.
  event_data JSONB DEFAULT '{}',

  -- 페이지 컨텍스트
  page_path TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 일별 통계 집계 테이블 (빠른 조회용)
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,

  -- 방문자 수
  unique_visitors INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,

  -- 페이지뷰
  total_page_views INTEGER DEFAULT 0,

  -- 이벤트
  total_events INTEGER DEFAULT 0,

  -- 평균 지표
  avg_session_duration INTEGER DEFAULT 0, -- 초
  avg_pages_per_session DECIMAL(5,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0, -- 퍼센트

  -- 디바이스 분포
  mobile_sessions INTEGER DEFAULT 0,
  desktop_sessions INTEGER DEFAULT 0,
  tablet_sessions INTEGER DEFAULT 0,

  -- 업데이트 시간
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 인덱스 생성 (쿼리 성능 최적화)
-- =====================================================

-- 세션 인덱스
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON analytics_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_referrer_domain ON analytics_sessions(referrer_domain);
CREATE INDEX IF NOT EXISTS idx_sessions_device_type ON analytics_sessions(device_type);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON analytics_sessions(user_id);

-- 페이지뷰 인덱스
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON analytics_page_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON analytics_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON analytics_page_views(session_id);

-- 이벤트 인덱스
CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON analytics_events(session_id);

-- 일별 통계 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON analytics_daily_stats(date);

-- =====================================================
-- RLS (Row Level Security) 정책
-- =====================================================

-- 테이블 RLS 활성화
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- 세션: 익명 사용자도 자신의 세션 데이터 삽입 가능
CREATE POLICY "Anyone can insert sessions" ON analytics_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update own session" ON analytics_sessions
  FOR UPDATE USING (true);

-- 페이지뷰: 익명 사용자도 삽입 가능
CREATE POLICY "Anyone can insert page views" ON analytics_page_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update page views" ON analytics_page_views
  FOR UPDATE USING (true);

-- 이벤트: 익명 사용자도 삽입 가능
CREATE POLICY "Anyone can insert events" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- 일별 통계: 읽기만 허용 (집계는 서버에서)
CREATE POLICY "Anyone can read daily stats" ON analytics_daily_stats
  FOR SELECT USING (true);

-- =====================================================
-- 자동 집계 함수 (매일 실행)
-- =====================================================

CREATE OR REPLACE FUNCTION aggregate_daily_analytics(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void AS $$
DECLARE
  stats RECORD;
BEGIN
  -- 해당 날짜의 통계 계산
  SELECT
    COUNT(DISTINCT session_id) as unique_visitors,
    COUNT(*) as total_sessions,
    (SELECT COUNT(*) FROM analytics_page_views WHERE viewed_at::DATE = target_date) as total_page_views,
    (SELECT COUNT(*) FROM analytics_events WHERE created_at::DATE = target_date) as total_events,
    COALESCE(AVG(EXTRACT(EPOCH FROM (last_activity_at - started_at))), 0)::INTEGER as avg_session_duration,
    COALESCE(AVG(page_views_count), 0)::DECIMAL(5,2) as avg_pages_per_session,
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE page_views_count = 1)::DECIMAL / COUNT(*) * 100)::DECIMAL(5,2)
      ELSE 0
    END as bounce_rate,
    COUNT(*) FILTER (WHERE device_type = 'mobile') as mobile_sessions,
    COUNT(*) FILTER (WHERE device_type = 'desktop') as desktop_sessions,
    COUNT(*) FILTER (WHERE device_type = 'tablet') as tablet_sessions
  INTO stats
  FROM analytics_sessions
  WHERE started_at::DATE = target_date;

  -- Upsert 일별 통계
  INSERT INTO analytics_daily_stats (
    date, unique_visitors, total_sessions, total_page_views, total_events,
    avg_session_duration, avg_pages_per_session, bounce_rate,
    mobile_sessions, desktop_sessions, tablet_sessions, updated_at
  ) VALUES (
    target_date, stats.unique_visitors, stats.total_sessions, stats.total_page_views, stats.total_events,
    stats.avg_session_duration, stats.avg_pages_per_session, stats.bounce_rate,
    stats.mobile_sessions, stats.desktop_sessions, stats.tablet_sessions, NOW()
  )
  ON CONFLICT (date) DO UPDATE SET
    unique_visitors = EXCLUDED.unique_visitors,
    total_sessions = EXCLUDED.total_sessions,
    total_page_views = EXCLUDED.total_page_views,
    total_events = EXCLUDED.total_events,
    avg_session_duration = EXCLUDED.avg_session_duration,
    avg_pages_per_session = EXCLUDED.avg_pages_per_session,
    bounce_rate = EXCLUDED.bounce_rate,
    mobile_sessions = EXCLUDED.mobile_sessions,
    desktop_sessions = EXCLUDED.desktop_sessions,
    tablet_sessions = EXCLUDED.tablet_sessions,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 실시간 세션 업데이트 트리거
-- =====================================================

CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'analytics_page_views' THEN
    UPDATE analytics_sessions
    SET
      page_views_count = page_views_count + 1,
      last_activity_at = NOW()
    WHERE session_id = NEW.session_id;
  ELSIF TG_TABLE_NAME = 'analytics_events' THEN
    UPDATE analytics_sessions
    SET
      events_count = events_count + 1,
      last_activity_at = NOW()
    WHERE session_id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_session_on_pageview ON analytics_page_views;
CREATE TRIGGER trigger_update_session_on_pageview
  AFTER INSERT ON analytics_page_views
  FOR EACH ROW EXECUTE FUNCTION update_session_stats();

DROP TRIGGER IF EXISTS trigger_update_session_on_event ON analytics_events;
CREATE TRIGGER trigger_update_session_on_event
  AFTER INSERT ON analytics_events
  FOR EACH ROW EXECUTE FUNCTION update_session_stats();
