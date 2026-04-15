-- ================================================
-- 상세페이지 저장/배포 분리 마이그레이션
-- 2026-04-11
-- ================================================
-- 기존 구조: custom_html / detail_mode 만 존재 → 저장 즉시 라이브 반영
-- 변경 구조:
--   custom_html / detail_mode         = draft (관리자 작업용, "저장" 시 갱신)
--   published_html / published_detail_mode = live (고객 노출용, "배포" 시 갱신)
-- 기존 데이터는 이미 라이브 중이므로 그대로 published_* 컬럼에 복사해 현상 유지

-- 1. 컬럼 추가
ALTER TABLE admin_product_details
  ADD COLUMN IF NOT EXISTS published_html TEXT,
  ADD COLUMN IF NOT EXISTS published_detail_mode TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 2. published_detail_mode CHECK 제약
ALTER TABLE admin_product_details
  DROP CONSTRAINT IF EXISTS admin_product_details_published_detail_mode_check;

ALTER TABLE admin_product_details
  ADD CONSTRAINT admin_product_details_published_detail_mode_check
  CHECK (published_detail_mode IS NULL OR published_detail_mode IN ('default', 'custom'));

-- 3. 기존 데이터 초기 배포 상태로 이관 (이미 라이브 중인 콘텐츠 유지)
UPDATE admin_product_details
SET
  published_html = custom_html,
  published_detail_mode = detail_mode,
  published_at = COALESCE(updated_at, NOW())
WHERE published_at IS NULL;
