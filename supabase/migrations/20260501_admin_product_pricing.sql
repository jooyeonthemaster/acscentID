-- ============================================================
-- 상품 가격 관리 시스템
-- ============================================================
-- 설계 원칙:
--   1. (product_type, size) 복합 PK — 기존 cart_items/order_items 키와 일치
--   2. order_items.unit_price 는 주문 시점 스냅샷 — 가격 변경이 기존 주문에 소급되지 않음
--   3. RLS: public_read (홈/체크아웃 표시용 익명 조회 허용) + authenticated_write
--   4. 변경 이력 admin_product_pricing_log 에 자동 기록 (트리거)
-- 영향: 기존 데이터 무손실 (신규 테이블만 추가)
-- ============================================================

-- 1. 가격 테이블
CREATE TABLE IF NOT EXISTS admin_product_pricing (
  product_type    VARCHAR(50)  NOT NULL,
  size            VARCHAR(20)  NOT NULL,
  price           INTEGER      NOT NULL CHECK (price >= 0),
  original_price  INTEGER               CHECK (original_price IS NULL OR original_price >= price),
  label           VARCHAR(100) NOT NULL,
  sort_order      INTEGER      NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_by      TEXT,
  PRIMARY KEY (product_type, size)
);

COMMENT ON TABLE admin_product_pricing IS '상품 가격 마스터 (관리자에서 수정). order_items 는 주문 시점 스냅샷이므로 소급 영향 없음.';
COMMENT ON COLUMN admin_product_pricing.price IS '판매 가격 (KRW)';
COMMENT ON COLUMN admin_product_pricing.original_price IS '정가 (할인 표시용, NULL 이면 할인 뱃지 비표시)';
COMMENT ON COLUMN admin_product_pricing.label IS '사이즈 라벨 (예: "10ml 퍼퓸")';
COMMENT ON COLUMN admin_product_pricing.is_active IS '판매 중지 여부 (false=숨김, 결제 거부)';

CREATE INDEX IF NOT EXISTS idx_pricing_active
  ON admin_product_pricing(product_type, size)
  WHERE is_active = true;

-- 2. 변경 이력 테이블
CREATE TABLE IF NOT EXISTS admin_product_pricing_log (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type        VARCHAR(50)  NOT NULL,
  size                VARCHAR(20)  NOT NULL,
  old_price           INTEGER,
  new_price           INTEGER,
  old_original_price  INTEGER,
  new_original_price  INTEGER,
  old_is_active       BOOLEAN,
  new_is_active       BOOLEAN,
  changed_by          TEXT,
  changed_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  reason              TEXT
);

CREATE INDEX IF NOT EXISTS idx_pricing_log_product
  ON admin_product_pricing_log(product_type, size, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_log_changed_at
  ON admin_product_pricing_log(changed_at DESC);

COMMENT ON TABLE admin_product_pricing_log IS '가격 변경 감사 로그 (트리거로 자동 기록)';

-- 3. updated_at 자동 갱신 + 변경 로그 자동 기록 트리거
CREATE OR REPLACE FUNCTION fn_admin_product_pricing_audit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();

  IF (OLD.price IS DISTINCT FROM NEW.price)
     OR (OLD.original_price IS DISTINCT FROM NEW.original_price)
     OR (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    INSERT INTO admin_product_pricing_log (
      product_type, size,
      old_price, new_price,
      old_original_price, new_original_price,
      old_is_active, new_is_active,
      changed_by
    ) VALUES (
      NEW.product_type, NEW.size,
      OLD.price, NEW.price,
      OLD.original_price, NEW.original_price,
      OLD.is_active, NEW.is_active,
      NEW.updated_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_product_pricing_audit ON admin_product_pricing;
CREATE TRIGGER trg_admin_product_pricing_audit
  BEFORE UPDATE ON admin_product_pricing
  FOR EACH ROW EXECUTE FUNCTION fn_admin_product_pricing_audit();

-- 4. INSERT 시 초기 로그
CREATE OR REPLACE FUNCTION fn_admin_product_pricing_insert_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_product_pricing_log (
    product_type, size,
    old_price, new_price,
    old_original_price, new_original_price,
    old_is_active, new_is_active,
    changed_by, reason
  ) VALUES (
    NEW.product_type, NEW.size,
    NULL, NEW.price,
    NULL, NEW.original_price,
    NULL, NEW.is_active,
    NEW.updated_by, 'initial'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_product_pricing_insert_log ON admin_product_pricing;
CREATE TRIGGER trg_admin_product_pricing_insert_log
  AFTER INSERT ON admin_product_pricing
  FOR EACH ROW EXECUTE FUNCTION fn_admin_product_pricing_insert_log();

-- 5. RLS — 기존 admin 테이블과 동일 패턴
ALTER TABLE admin_product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_product_pricing_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_pricing ON admin_product_pricing;
CREATE POLICY public_read_pricing
  ON admin_product_pricing FOR SELECT
  USING (true);

DROP POLICY IF EXISTS authenticated_write_pricing ON admin_product_pricing;
CREATE POLICY authenticated_write_pricing
  ON admin_product_pricing FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS authenticated_read_pricing_log ON admin_product_pricing_log;
CREATE POLICY authenticated_read_pricing_log
  ON admin_product_pricing_log FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS authenticated_insert_pricing_log ON admin_product_pricing_log;
CREATE POLICY authenticated_insert_pricing_log
  ON admin_product_pricing_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON admin_product_pricing TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON admin_product_pricing TO authenticated;
GRANT SELECT, INSERT ON admin_product_pricing_log TO authenticated;

-- 6. 초기 시드 (현재 PRODUCT_PRICING 값)
INSERT INTO admin_product_pricing
  (product_type, size, price, original_price, label, sort_order, is_active, updated_by)
VALUES
  ('image_analysis', '10ml',     24000, 35000, '10ml 퍼퓸',                  0, true, 'system:seed'),
  ('image_analysis', '50ml',     48000, 68000, '50ml 퍼퓸',                  1, true, 'system:seed'),
  ('figure_diffuser','set',      48000, 68000, '피규어+디퓨저 세트',         0, true, 'system:seed'),
  ('personal_scent', '10ml',     24000, 35000, '10ml 퍼퓸',                  0, true, 'system:seed'),
  ('personal_scent', '50ml',     48000, 68000, '50ml 퍼퓸',                  1, true, 'system:seed'),
  ('graduation',     '10ml',     34000, 49000, '졸업 퍼퓸 10ml',             0, true, 'system:seed'),
  ('signature',      '10ml',     34000, 45000, 'SIGNATURE 뿌덕퍼퓸 10ml',    0, true, 'system:seed'),
  ('chemistry_set',  'set_10ml', 38000, 52000, '케미 향수 세트 10ml x 2',    0, true, 'system:seed'),
  ('chemistry_set',  'set_50ml', 60000, 80000, '케미 향수 세트 50ml x 2',    1, true, 'system:seed'),
  ('payment_test',   '10ml',      1000, NULL,  '결제 테스트 상품',           0, true, 'system:seed')
ON CONFLICT (product_type, size) DO NOTHING;
