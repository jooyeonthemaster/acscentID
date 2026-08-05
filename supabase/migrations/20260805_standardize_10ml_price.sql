-- 모든 실판매 단품 10ml 퍼퓸 가격을 24,000원으로 통일한다.
-- 예외:
--   payment_test/10ml  — PG 심사용 1,000원 테스트 SKU
--   set_10ml           — 10ml 두 병으로 구성된 별도 세트 SKU

BEGIN;

UPDATE admin_product_pricing
SET
  price = 24000,
  updated_by = 'migration:20260805_standardize_10ml'
WHERE size = '10ml'
  AND product_type <> 'payment_test'
  AND price IS DISTINCT FROM 24000;

-- 가격 변경 전에 담긴 장바구니 스냅샷도 새 가격으로 맞춰
-- 체크아웃 서버 검증에서 price_mismatch가 발생하지 않게 한다.
UPDATE cart_items
SET
  price = 24000,
  updated_at = now()
WHERE size = '10ml'
  AND product_type <> 'payment_test'
  AND price IS DISTINCT FROM 24000;

ALTER TABLE admin_product_pricing
  DROP CONSTRAINT IF EXISTS admin_product_pricing_standard_10ml_price_check;

ALTER TABLE admin_product_pricing
  ADD CONSTRAINT admin_product_pricing_standard_10ml_price_check
  CHECK (
    size <> '10ml'
    OR product_type = 'payment_test'
    OR price = 24000
  );

COMMIT;
