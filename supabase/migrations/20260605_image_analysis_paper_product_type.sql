-- AI 이미지 분석 시향지(image_analysis_paper) 상품 타입 도입
-- image_analysis 퍼퓸과 가격/주문 타입을 분리하여 4,000원 시향지를 별도 상품으로 판매한다.

BEGIN;

-- 1) 시향지 가격 시드
INSERT INTO admin_product_pricing (product_type, size, price, original_price, label, sort_order, is_active, updated_by)
VALUES
  ('image_analysis_paper', 'set', 4000, NULL, 'AI 이미지 분석 시향지', 0, true, 'migration:20260605')
ON CONFLICT (product_type, size) DO NOTHING;

-- 2) 장바구니/주문 product_type 화이트리스트 확장
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_type_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'image_analysis_paper', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'today_scent', 'etc'));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'image_analysis_paper', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'today_scent', 'etc'));

-- 3) 시향지는 분석 결과 없이 판매될 수 있는 카탈로그 상품이므로 analysis_id 없이 허용
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_ref_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_ref_check CHECK (
  product_type IN ('signature', 'payment_test', 'today_scent', 'image_analysis_paper')
  OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
  OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
);

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_ref_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_ref_check CHECK (
  product_type IN ('signature', 'payment_test', 'today_scent', 'image_analysis_paper')
  OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
  OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
) NOT VALID;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_product_ref_check;
ALTER TABLE orders ADD CONSTRAINT orders_product_ref_check CHECK (
  product_type IS NULL
  OR product_type IN ('signature', 'payment_test', 'today_scent', 'image_analysis_paper')
  OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
  OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
) NOT VALID;

COMMIT;
