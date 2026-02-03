-- orders 테이블에 product_type, analysis_id 컬럼 추가 및 signature 타입 지원
-- 2026-02-03

-- 1. orders 테이블에 product_type 컬럼 추가 (없는 경우)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'image_analysis';

-- 2. orders 테이블에 analysis_id 컬럼 추가 (분석 결과 연결용)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES analysis_results(id) ON DELETE SET NULL;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_orders_product_type ON orders(product_type);
CREATE INDEX IF NOT EXISTS idx_orders_analysis_id ON orders(analysis_id);

-- 4. signature 상품 타입 지원을 위한 CHECK 제약 수정
-- analysis_results
ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS analysis_results_product_type_check;
ALTER TABLE analysis_results ADD CONSTRAINT analysis_results_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature'));

-- cart_items
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_type_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature'));

-- order_items
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature'));

-- qr_codes (있는 경우)
ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_product_type_check;
ALTER TABLE qr_codes ADD CONSTRAINT qr_codes_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature'));
