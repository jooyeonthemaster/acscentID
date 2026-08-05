-- 사주 분석 퍼퓸에 디퓨저 클리커 키링 옵션 추가 (₩12,900)
-- scent_paper 선례(20260606_scent_paper_option.sql)와 동일: 별도 product_type 없이
-- saju_perfume의 size='clicker' 옵션으로 추가해 기존 결제/주문/관리자 흐름을 그대로 재사용한다.
-- 각인 오행은 고객이 고르지 않는다 — 분석 결과의 용신(analysis_data.sajuChart.yongsin.element)으로 제작.
-- order_items/cart_items의 size는 free-form varchar라 CHECK 제약 변경 불필요 (20260707_saju_program.sql 참고).

BEGIN;

INSERT INTO admin_product_pricing
  (product_type, size, price, original_price, label, sort_order, is_active, image_url, updated_by)
VALUES
  (
    'saju_perfume',
    'clicker',
    12900,
    NULL,
    '디퓨저 클리커 키링',
    2,
    true,
    '/images/product-detail/saju-clicker-five-square.png',
    'migration:20260802_saju_clicker'
  )
ON CONFLICT (product_type, size) DO UPDATE
SET image_url = COALESCE(admin_product_pricing.image_url, EXCLUDED.image_url);

COMMIT;
