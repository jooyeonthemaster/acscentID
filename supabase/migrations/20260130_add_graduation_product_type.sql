-- 졸업 퍼퓸(graduation) 상품 타입 추가
-- 기존 CHECK 제약을 제거하고 graduation을 포함한 새로운 제약 추가

-- 1. analysis_results 테이블의 product_type CHECK 제약 수정
ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS analysis_results_product_type_check;
ALTER TABLE analysis_results ADD CONSTRAINT analysis_results_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation'));

-- 2. cart_items 테이블의 product_type CHECK 제약 수정
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_type_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation'));

-- 3. order_items 테이블의 product_type CHECK 제약 수정
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation'));
