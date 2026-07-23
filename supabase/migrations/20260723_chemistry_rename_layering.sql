-- [FIX] 상품/프로그램명 통일: '케미 향수 세트' → '레이어링 퍼퓸 세트'
-- 근거: 공개 사이트 표기(messages products.chemistry)와 관리자 DB 명칭 불일치 해소.
--       한국어 표시명은 admin_products.name(useProductDisplayName)에서 오므로 DB 값을 갱신한다.

UPDATE admin_products
SET name = '레이어링 퍼퓸 세트'
WHERE slug = 'chemistry';

-- 가격 옵션 라벨도 동일 명칭으로 통일
UPDATE admin_product_pricing
SET label = '레이어링 퍼퓸 세트 10ml x 2'
WHERE product_type = 'chemistry_set' AND size = 'set_10ml';

UPDATE admin_product_pricing
SET label = '레이어링 퍼퓸 세트 50ml x 2'
WHERE product_type = 'chemistry_set' AND size = 'set_50ml';

-- [ADD] 단품 향수(10ml/50ml) 구성에 시향지 동봉 명시 (배송 항목 앞에 삽입)
UPDATE admin_store_products
SET included = '["선택 향 50ml 스프레이 퍼퓸", "프리미엄 패키지", "시향지 동봉", "주문 후 2~3일 내 배송"]'::jsonb
WHERE slug = 'perfume-50ml';

UPDATE admin_store_products
SET included = '["선택 향 10ml 스프레이 퍼퓸", "휴대용 패키지", "시향지 동봉", "주문 후 2~3일 내 배송"]'::jsonb
WHERE slug = 'perfume-10ml';
