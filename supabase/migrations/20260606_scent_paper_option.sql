-- 아이돌 이미지(image_analysis) / 케미(chemistry_set) 결제 단계에 시향지 옵션 추가
-- 10ml(기본) 대신 선택 가능한 4,000원 저가 옵션. 별도 product_type 가 아니라
-- 동일 상품의 size='scent_paper' 옵션으로 추가하여 기존 결제/주문/관리자 흐름을 그대로 재사용한다.
-- (order_items.unit_price 는 주문 시점 스냅샷이라 기존 주문에는 영향 없음)

BEGIN;

INSERT INTO admin_product_pricing
  (product_type, size, price, original_price, label, sort_order, is_active, updated_by)
VALUES
  ('image_analysis', 'scent_paper', 4000, NULL, '시향지',     2, true, 'migration:20260606'),
  ('chemistry_set',  'scent_paper', 4000, NULL, '시향지 2매', 2, true, 'migration:20260606')
ON CONFLICT (product_type, size) DO NOTHING;

COMMIT;
