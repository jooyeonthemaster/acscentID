-- 사주 분석 퍼퓸 (saju_perfume) 프로그램 등록
-- 2026-07-07 라이브 DB에 Management API로 적용 완료된 내용과 동일 (라이브 제약 정의 기준으로 작성)
-- 주의: 라이브 DB는 저장소 마이그레이션 기록과 드리프트 존재 (예: 20260605의 store_product가 라이브 체크에 없음).
--       이 파일은 '라이브 현재값 + saju_perfume'만 반영하며 그 외 값은 변경하지 않는다.
-- ref check(cart_items/order_items/orders _product_ref_check)는 변경 불필요: saju_perfume은 기본 분기(analysis_id IS NOT NULL)에 자동 포함.

BEGIN;

-- [saju] product_type whitelist 확장 (+saju_perfume) — 2026-07-07 라이브 정의 기준, 그 외 값 변경 없음
ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS analysis_results_product_type_check;
ALTER TABLE analysis_results ADD CONSTRAINT analysis_results_product_type_check
  CHECK ((product_type)::text = ANY (ARRAY['image_analysis','figure_diffuser','personal_scent','graduation','signature','chemistry_set','payment_test','saju_perfume','etc']::text[]));

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_type_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_type_check
  CHECK ((product_type)::text = ANY (ARRAY['image_analysis','image_analysis_paper','figure_diffuser','personal_scent','graduation','signature','chemistry_set','payment_test','today_scent','saju_perfume','etc']::text[]));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_type_check
  CHECK ((product_type)::text = ANY (ARRAY['image_analysis','image_analysis_paper','figure_diffuser','personal_scent','graduation','signature','chemistry_set','payment_test','today_scent','saju_perfume','etc']::text[]));

ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_product_type_check;
ALTER TABLE qr_codes ADD CONSTRAINT qr_codes_product_type_check
  CHECK ((product_type)::text = ANY (ARRAY['image_analysis','figure_diffuser','personal_scent','graduation','signature','chemistry_set','payment_test','saju_perfume','etc']::text[]));

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_program_type_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_program_type_check
  CHECK (program_type = ANY (ARRAY['idol_image','personal','figure','graduation','le-quack','chemistry_set','saju_perfume']::text[]));

-- ref check(cart_items/order_items/orders)는 변경 불필요: saju_perfume은 기본 분기(analysis_id IS NOT NULL)에 포함됨

-- [saju] 다크 런칭 시드: is_active=false — 관리자에서 켜기 전까지 비노출
INSERT INTO admin_products (slug, name, is_active, display_order)
VALUES ('saju', '사주 분석 퍼퓸', false, 9)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO admin_product_pricing (product_type, size, price, original_price, label, sort_order, is_active, updated_by)
VALUES
  ('saju_perfume', '10ml', 48000, NULL, '10ml 퍼퓸', 0, true, 'migration:20260707_saju'),
  ('saju_perfume', '50ml', 48000, NULL, '50ml 퍼퓸', 1, true, 'migration:20260707_saju')
ON CONFLICT (product_type, size) DO NOTHING;

COMMIT;
