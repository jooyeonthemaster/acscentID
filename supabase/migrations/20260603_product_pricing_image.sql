-- ============================================================
-- 가격 옵션별 이미지 첨부
-- ============================================================
-- admin_product_pricing 의 각 옵션에 대표 이미지 URL 을 첨부할 수 있도록
-- image_url 컬럼 추가. (admin-content 스토리지에 업로드된 public URL 저장)
-- 기존 데이터 무손실 (nullable 컬럼 추가).
-- ============================================================

ALTER TABLE admin_product_pricing
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN admin_product_pricing.image_url IS '옵션 대표 이미지 URL (admin-content 스토리지, NULL 가능)';
