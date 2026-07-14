-- 개인결제창(맞춤 결제 링크)
-- 일반 상품(admin_store_products)과 별개로, 관리자가 임의 금액의 결제 링크를 만들고
-- 메인/상품 카탈로그에는 노출하지 않은 채 개별 고객에게 링크를 공유해 결제받는다.
-- 결제 자체는 기존 orders + PortOne 흐름을 그대로 재사용한다.

CREATE TABLE IF NOT EXISTS admin_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL CHECK (amount >= 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  memo TEXT NOT NULL DEFAULT '',
  paid_count INTEGER NOT NULL DEFAULT 0 CHECK (paid_count >= 0),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_payment_links_active_created
  ON admin_payment_links(is_active, created_at DESC);

ALTER TABLE admin_payment_links ENABLE ROW LEVEL SECURITY;

-- 개인결제창은 "링크(token)를 아는 사람만" 접근하는 비공개 결제 수단이다.
-- 따라서 anon 대상 공개 SELECT 정책을 두지 않는다. 공개 결제 페이지는
-- service_role 키를 쓰는 서버 API에서 token으로만 단건 조회한다.
DROP POLICY IF EXISTS authenticated_manage_payment_links ON admin_payment_links;
CREATE POLICY authenticated_manage_payment_links
  ON admin_payment_links FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON admin_payment_links TO authenticated;
