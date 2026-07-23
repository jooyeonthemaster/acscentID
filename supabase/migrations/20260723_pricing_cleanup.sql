-- [CLEANUP] 가격 마스터 정리 — 오염 행 삭제 + 누락 상품 타입 등록
-- 근거: 배포 전 DB(admin_product_pricing) ↔ 코드 상수(PRODUCT_PRICING) 전수 대조에서 발견.
--
-- 사전 확인 (실행 시점):
--   - store_product|'1', store_product|'ㄷ' 를 참조하는 order_items/cart_items 0건 → 삭제 안전.
--     order_items.unit_price 는 주문 시점 스냅샷이라 과거 주문에도 소급 영향 없음.
--   - image_analysis_paper 는 admin_product_pricing 에 행이 0건이라 관리자에서 가격 조정이 불가능했음.
--     (지금까지는 pricing.ts rowsToMap 의 누락 타입 보완 로직이 코드 상수로 대체 중)

BEGIN;

-- 1) 오염 행 삭제 — size 가 '1' / 'ㄷ'(한글 입력 상태 오타)로 저장된 비활성 행
--    NOTE: DELETE 트리거는 없으므로 admin_product_pricing_log 에 이력이 남지 않는다.
DELETE FROM admin_product_pricing
WHERE product_type = 'store_product'
  AND size IN ('1', 'ㄷ');

-- 2) image_analysis_paper 등록 — /programs/sample 에서 getOption('image_analysis_paper','set') 로 조회하는 SKU.
--    값은 코드 상수 PRODUCT_PRICING.image_analysis_paper 와 동일하게 맞춘다 (4,000원 / 'set').
INSERT INTO admin_product_pricing (product_type, size, price, original_price, label, sort_order, is_active, updated_by)
VALUES ('image_analysis_paper', 'set', 4000, NULL, 'AI 이미지 분석 시향지', 0, true, 'migration:20260723_pricing_cleanup')
ON CONFLICT (product_type, size) DO NOTHING;

COMMIT;
