-- 포토부스 생카(생일카페) 이벤트 단위 운영
-- 관리자가 이벤트(주인공·기간·테마)를 등록하면 부스 화면이 기간 중 자동으로 해당 테마 적용,
-- 프레임/템플릿을 이벤트에 귀속시켜 행사 종료 시 자동 미노출 (event_id NULL = 상시 소재)
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요
-- ⚠️ 20260915_photobooth.sql 실행 후에 실행할 것

CREATE TABLE IF NOT EXISTS photobooth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,                          -- 이벤트명 (예: 〇〇 생일카페)
  artist TEXT,                                  -- 주인공 (아티스트/최애 이름)
  organizer TEXT,                               -- 주최자(총대) 크레딧 — X/트위터 핸들 등
  hashtag TEXT,                                 -- 인증 해시태그 (예: #〇〇생일카페)
  greeting TEXT,                                -- 부스 홈 문구 (예: HAPPY 〇〇 DAY)
  theme_color TEXT,                             -- 부스 포인트 컬러 (#hex)
  cover_image_url TEXT,                         -- 부스 홈 커버 이미지 (admin-content)
  starts_on DATE,                               -- 기간 (KST 기준, NULL = 제한 없음)
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 소재를 이벤트에 귀속 (이벤트 삭제 시 소재 메타도 함께 삭제)
ALTER TABLE photobooth_assets
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES photobooth_events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_photobooth_assets_event ON photobooth_assets (event_id);

-- 포토부스 이용권 (상품 구매 특전)
-- 직원이 결제 시 관리자 페이지에서 발급 → 손님이 부스 키패드에 6자리 코드 입력 → 1회 사용
CREATE TABLE IF NOT EXISTS photobooth_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  code TEXT UNIQUE NOT NULL,                    -- 6자리 숫자
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'used', 'void')),
  used_at TIMESTAMPTZ,
  event_id UUID REFERENCES photobooth_events(id) ON DELETE SET NULL, -- 발급 시점의 진행 중 생카 (통계용)
  note TEXT                                     -- 메모 (구매 상품 등)
);

CREATE INDEX IF NOT EXISTS idx_photobooth_passes_status ON photobooth_passes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photobooth_passes_event ON photobooth_passes (event_id);

-- RLS 활성화 + 정책 없음 = service-role 전용
ALTER TABLE photobooth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobooth_passes ENABLE ROW LEVEL SECURITY;
