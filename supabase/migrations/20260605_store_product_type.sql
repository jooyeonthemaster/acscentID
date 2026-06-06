-- 일반 상품(store_product) 타입 도입
-- 프로그램 분석 없이 향을 직접 선택해 50ml/10ml/시향지를 구매하는 카탈로그 상품.

BEGIN;

-- 1) 상품 가격 시드
INSERT INTO admin_product_pricing (product_type, size, price, original_price, label, sort_order, is_active, updated_by)
VALUES
  ('store_product', '50ml', 48000, NULL, '50ml 향수', 0, true, 'migration:20260605'),
  ('store_product', '10ml', 24000, NULL, '10ml 향수', 1, true, 'migration:20260605'),
  ('store_product', 'scent_paper', 4000, NULL, '시향지', 2, true, 'migration:20260605')
ON CONFLICT (product_type, size) DO NOTHING;

-- 2) 장바구니/주문 product_type 화이트리스트 확장
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_type_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'image_analysis_paper', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'today_scent', 'store_product', 'etc'));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'image_analysis_paper', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'today_scent', 'store_product', 'etc'));

-- 3) 일반 상품은 분석 결과 없이 판매되므로 analysis_id / layering_session_id 없이 허용
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_ref_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_ref_check CHECK (
  product_type IN ('signature', 'payment_test', 'today_scent', 'image_analysis_paper', 'store_product')
  OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
  OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
);

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_ref_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_ref_check CHECK (
  product_type IN ('signature', 'payment_test', 'today_scent', 'image_analysis_paper', 'store_product')
  OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
  OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
) NOT VALID;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_product_ref_check;
ALTER TABLE orders ADD CONSTRAINT orders_product_ref_check CHECK (
  product_type IS NULL
  OR product_type IN ('signature', 'payment_test', 'today_scent', 'image_analysis_paper', 'store_product')
  OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
  OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
) NOT VALID;

COMMIT;
