-- 일반 판매 상품 메타데이터
-- 프로그램(admin_products)과 별개로, 분석 없이 바로 구매하는 상품 자체를 관리한다.

CREATE TABLE IF NOT EXISTS admin_store_products (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  short_label TEXT NOT NULL,
  size TEXT NOT NULL UNIQUE,
  fallback_price INTEGER NOT NULL DEFAULT 0 CHECK (fallback_price >= 0),
  image_url TEXT,
  badge TEXT NOT NULL DEFAULT '상품',
  description TEXT NOT NULL DEFAULT '',
  included JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_store_products_active_order
  ON admin_store_products(is_active, display_order, slug);

ALTER TABLE admin_store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_active_store_products ON admin_store_products;
CREATE POLICY public_read_active_store_products
  ON admin_store_products FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS authenticated_manage_store_products ON admin_store_products;
CREATE POLICY authenticated_manage_store_products
  ON admin_store_products FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON admin_store_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON admin_store_products TO authenticated;

INSERT INTO admin_store_products (
  slug,
  title,
  short_label,
  size,
  fallback_price,
  image_url,
  badge,
  description,
  included,
  is_active,
  display_order
) VALUES
  (
    'perfume-50ml',
    '50ml 향수',
    '50ml',
    '50ml',
    48000,
    '/images/perfume/KakaoTalk_20260125_225218071.jpg',
    'FULL SIZE',
    '마음에 드는 AC''SCENT 향을 넉넉하게 사용하는 정규 용량 퍼퓸입니다.',
    '["선택 향 50ml 스프레이 퍼퓸", "프리미엄 패키지", "주문 후 2~3일 내 배송"]'::jsonb,
    TRUE,
    0
  ),
  (
    'perfume-10ml',
    '10ml 향수',
    '10ml',
    '10ml',
    24000,
    '/images/perfume/KakaoTalk_20260125_225218071.jpg',
    'MINI',
    '가볍게 휴대하며 쓰기 좋은 미니 사이즈 퍼퓸입니다.',
    '["선택 향 10ml 스프레이 퍼퓸", "휴대용 패키지", "주문 후 2~3일 내 배송"]'::jsonb,
    TRUE,
    1
  ),
  (
    'scent-paper',
    '시향지',
    '시향지',
    'scent_paper',
    4000,
    '/images/perfume/KakaoTalk_20260125_225218071.jpg',
    'SAMPLE',
    '향수를 구매하기 전 원하는 향을 먼저 확인할 수 있는 시향 상품입니다.',
    '["선택 향 시향지", "향 노트 카드", "주문 후 2~3일 내 배송"]'::jsonb,
    TRUE,
    2
  )
ON CONFLICT (slug) DO NOTHING;
