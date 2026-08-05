-- 사주 10ml/50ml 결제 옵션 카드 썸네일 등록 — 대표 스튜디오 컷(3종 합본, 밝은 배경)
-- 클리커(20260802_saju_clicker_option.sql)와 동일하게 admin_product_pricing.image_url 사용.
-- 운영 DB에는 2026-08-05 즉시 적용됨 — 이 파일은 재현용 forward migration.

BEGIN;

UPDATE admin_product_pricing
SET image_url = '/images/products/saju/saju-main-warm-studio-8089-v2.png'
WHERE product_type = 'saju_perfume' AND size IN ('10ml', '50ml') AND image_url IS DISTINCT FROM '/images/products/saju/saju-main-warm-studio-8089-v2.png';

COMMIT;
