-- 장바구니 및 주문 상품 테이블 생성
-- 다중 상품 장바구니 및 주문 시스템 지원
-- NOTE: user_profiles.id는 TEXT 타입 (카카오/구글 로그인 ID)

-- =====================================================
-- 1. cart_items 테이블 (장바구니)
-- =====================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- user_profiles.id와 동일한 TEXT 타입
  analysis_id UUID REFERENCES analysis_results(id) ON DELETE CASCADE,

  -- 상품 타입
  product_type VARCHAR(50) NOT NULL DEFAULT 'image_analysis'
    CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent')),

  -- 상품 정보
  perfume_name VARCHAR(255) NOT NULL,
  perfume_brand VARCHAR(255),
  twitter_name VARCHAR(255),

  -- 사이즈/가격
  size VARCHAR(20) NOT NULL, -- '10ml', '50ml', 'set'
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 10),

  -- 이미지 및 분석 데이터
  image_url TEXT,
  analysis_data JSONB,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 동일 분석 결과는 한 번만 장바구니에 담기 가능
  UNIQUE(user_id, analysis_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_type ON cart_items(product_type);
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at DESC);

-- RLS 정책 (Service Role Client 사용시 우회됨)
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Service Role에서 전체 접근 허용
CREATE POLICY "Service role has full access to cart_items"
  ON cart_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 2. order_items 테이블 (주문 상품)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analysis_results(id) ON DELETE SET NULL,

  -- 상품 타입
  product_type VARCHAR(50) NOT NULL DEFAULT 'image_analysis'
    CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent')),

  -- 상품 정보
  perfume_name VARCHAR(255) NOT NULL,
  perfume_brand VARCHAR(255),
  twitter_name VARCHAR(255),

  -- 사이즈/가격
  size VARCHAR(20) NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL,

  -- 이미지 및 분석 데이터
  image_url TEXT,
  analysis_data JSONB,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_analysis_id ON order_items(analysis_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_type ON order_items(product_type);

-- RLS 정책 (Service Role Client 사용시 우회됨)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Service Role에서 전체 접근 허용
CREATE POLICY "Service role has full access to order_items"
  ON order_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 3. orders 테이블 수정 (다중 상품 지원)
-- =====================================================
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS subtotal INTEGER;

-- =====================================================
-- 4. updated_at 자동 업데이트 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cart_items_updated_at ON cart_items;
CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();
