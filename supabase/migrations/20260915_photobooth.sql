-- 매장 포토부스 (웹 초안)
-- /booth        : 매장 부스 화면 (촬영·합성·인쇄)
-- /booth/upload : 고객 폰 사진 업로드 (QR 경유, 세션 코드 기반)
-- /admin/photobooth : 프레임(4x6 오버레이 PNG)·템플릿 이미지 관리
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요

-- 관리자가 올리는 부스 소재 (프레임 오버레이 / 함께 찍기 템플릿)
CREATE TABLE photobooth_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  kind TEXT NOT NULL CHECK (kind IN ('frame', 'template')),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,                      -- admin-content 버킷 public URL
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_photobooth_assets_kind ON photobooth_assets (kind, is_active, display_order);

-- 고객 폰 업로드 세션 (부스가 QR 발급 → 폰이 코드로 업로드 → 부스가 폴링 수신)
CREATE TABLE photobooth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  code TEXT UNIQUE NOT NULL,                    -- PB-XXXXXX (QR URL 경로)
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'uploaded', 'expired')),
  photo_url TEXT,                               -- 고객이 올린 사진 (analysis-images/photobooth/*)
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_photobooth_sessions_code ON photobooth_sessions (code);

-- RLS 활성화 + 정책 없음 = service-role 전용 (부스/폰/관리자 모두 API 경유)
ALTER TABLE photobooth_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobooth_sessions ENABLE ROW LEVEL SECURITY;
