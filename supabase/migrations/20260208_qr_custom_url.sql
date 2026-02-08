-- QR 코드에 커스텀 URL 필드 추가 + product_type에 'etc' 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. custom_url 컬럼 추가
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS custom_url TEXT;

-- 2. product_type CHECK 제약조건 업데이트 ('etc' 추가)
ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_product_type_check;
ALTER TABLE qr_codes ADD CONSTRAINT qr_codes_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'etc'));

COMMENT ON COLUMN qr_codes.custom_url IS '커스텀 리다이렉트 URL. 설정 시 기본 product_type 라우팅 대신 이 URL로 리다이렉트됨';
