-- 오늘의 향(today_scent) 상품 타입 도입 + 분석-불필요 카탈로그 상품 제약 완화
-- 2026-06-04
--
-- 배경:
--   오늘의 향 / 시그니처(le-quack) / 결제 테스트 상품은 AI 분석을 거치지 않고
--   판매되는 "카탈로그" 상품이라 analysis_id 가 없다. 그런데 20260502 에서 추가한
--   orders_product_ref_check / order_items_product_ref_check / cart_items_product_ref_check
--   는 "chemistry_set 이 아니면 analysis_id 필수" 를 강제해, 이 상품들의 주문 INSERT 가
--   23514(check_violation)로 거부됐다.
--
--   해결: analysis_id 없이 판매되는 상품 타입(signature, payment_test, today_scent)을
--   제약에서 면제한다. 더불어 오늘의 향에 전용 product_type(today_scent)을 부여하고
--   가격표(admin_product_pricing)에 시드한다.

BEGIN;

-- 1) 오늘의 향 가격 시드 (image_analysis 와 동일: 10ml 24,000 / 50ml 48,000)
INSERT INTO admin_product_pricing (product_type, size, price, original_price, label, sort_order, is_active, updated_by)
VALUES
  ('today_scent', '10ml', 24000, NULL, '오늘의 향 10ml', 0, true, 'migration:20260604'),
  ('today_scent', '50ml', 48000, NULL, '오늘의 향 50ml', 1, true, 'migration:20260604')
ON CONFLICT (product_type, size) DO NOTHING;

-- 2) product_type 화이트리스트에 today_scent 추가
--    (cart_items / order_items 는 today_scent 행을 저장할 수 있으므로 갱신)
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_type_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'today_scent', 'etc'));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'today_scent', 'etc'));

-- 3) product_ref 제약 완화 — 분석 불필요 카탈로그 상품(signature, payment_test, today_scent)은
--    analysis_id / layering_session_id 없이 허용.

--   cart_items
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_ref_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_ref_check CHECK (
  product_type IN ('signature', 'payment_test', 'today_scent')
  OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
  OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
);

--   order_items (historical NULL 행 존재 가능 → NOT VALID)
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_ref_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_ref_check CHECK (
  product_type IN ('signature', 'payment_test', 'today_scent')
  OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
  OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
) NOT VALID;

--   orders (historical 데이터에 product_type/analysis_id NULL 혼재 → NOT VALID)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_product_ref_check;
ALTER TABLE orders ADD CONSTRAINT orders_product_ref_check CHECK (
  product_type IS NULL
  OR product_type IN ('signature', 'payment_test', 'today_scent')
  OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
  OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
) NOT VALID;

COMMIT;
