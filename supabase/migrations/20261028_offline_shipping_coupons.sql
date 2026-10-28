-- 택배 교환권 — 매장에서 상품과 함께 나눠 주는 1회용 QR 교환권
-- 교환권 1장 = 고유 코드 1개 = 상품 1개. QR 주소는 /ship?code=<코드>.
-- 손님이 /ship 에서 접수하면 쓴 교환권은 'used' 가 되고 접수 건(offline_shipping_requests)에 연결된다.
-- 관리자 페이지(/admin/ship-coupons)에서 상품·수량을 정해 발급하고 A4로 인쇄한다.
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS offline_shipping_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  code VARCHAR(16) UNIQUE NOT NULL,              -- 8자리(헷갈리는 I·O·0·1 제외), 화면에는 ABCD-EFGH
  product_name TEXT NOT NULL,                    -- 발급할 때 정한 상품
  batch_id UUID NOT NULL,                        -- 한 번에 발급한 묶음
  batch_name TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'used', 'void')),
  used_at TIMESTAMPTZ,
  shipping_request_id UUID REFERENCES offline_shipping_requests(id) ON DELETE SET NULL,
  issued_by_admin_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_offline_shipping_coupons_batch_id ON offline_shipping_coupons (batch_id);
CREATE INDEX IF NOT EXISTS idx_offline_shipping_coupons_created_at ON offline_shipping_coupons (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offline_shipping_coupons_request ON offline_shipping_coupons (shipping_request_id);

-- RLS 활성화 + 정책 없음 = service-role 전용 (조회·사용 모두 API 경유)
ALTER TABLE offline_shipping_coupons ENABLE ROW LEVEL SECURITY;
