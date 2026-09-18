-- 키오스크 배경 — 관리자가 올린 생카/행사 배경을 매장 기기에서 골라 쓴다.
-- 이미지만 올리고 색·글꼴은 내장 테마(palette)에서 상속받는다. 관리자가 색 토큰 13개를
-- 직접 정하게 하면 화면이 읽히지 않는 조합이 나오기 때문.
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요

CREATE TABLE IF NOT EXISTS kiosk_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,                       -- 키오스크 관리자 화면에 보이는 이름
  image_url TEXT NOT NULL,                   -- admin-content 버킷 공개 URL
  palette TEXT NOT NULL DEFAULT 'retro',     -- 색·글꼴을 상속할 내장 테마 id
  is_active BOOLEAN NOT NULL DEFAULT TRUE,   -- 끄면 키오스크 목록에서 사라진다
  display_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kiosk_backgrounds_active
  ON kiosk_backgrounds (is_active, display_order, created_at DESC);

-- 키오스크는 비로그인 기기라 목록을 읽어야 한다 (공개 이미지 URL 뿐이라 민감정보 없음).
-- 쓰기는 service-role(관리자 API)만.
ALTER TABLE kiosk_backgrounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kiosk_backgrounds_public_read" ON kiosk_backgrounds;
CREATE POLICY "kiosk_backgrounds_public_read"
  ON kiosk_backgrounds FOR SELECT
  USING (is_active = TRUE);
