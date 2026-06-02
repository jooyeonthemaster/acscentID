-- 상품 상세페이지 수정본 저장소
-- 관리자에서 상세페이지를 미리보기 화면에서 직접 편집하고,
-- 저장된 수정본을 다시 불러와 배포할 수 있게 한다.

CREATE TABLE IF NOT EXISTS admin_product_detail_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug TEXT NOT NULL,
  label TEXT NOT NULL,
  html TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_product_detail_versions_slug_created
  ON admin_product_detail_versions(product_slug, created_at DESC);

ALTER TABLE admin_product_detail_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_read_product_detail_versions ON admin_product_detail_versions;
CREATE POLICY authenticated_read_product_detail_versions
  ON admin_product_detail_versions FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS authenticated_write_product_detail_versions ON admin_product_detail_versions;
CREATE POLICY authenticated_write_product_detail_versions
  ON admin_product_detail_versions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON admin_product_detail_versions TO authenticated;
