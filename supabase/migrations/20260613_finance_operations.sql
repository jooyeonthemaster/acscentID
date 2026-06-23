-- ============================================================
-- ACSCENT monthly finance operations
-- 온오프라인 매출/비용 원장, 월별 설정, 업로드 배치, 마감 스냅샷
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_month_settings (
  month DATE PRIMARY KEY CHECK (date_trunc('month', month)::date = month),

  fixed_rent INTEGER NOT NULL DEFAULT 5170000 CHECK (fixed_rent >= 0),
  fixed_utilities INTEGER NOT NULL DEFAULT 200000 CHECK (fixed_utilities >= 0),
  fixed_telecom INTEGER NOT NULL DEFAULT 80000 CHECK (fixed_telecom >= 0),
  fixed_insurance INTEGER NOT NULL DEFAULT 15000 CHECK (fixed_insurance >= 0),
  fixed_other INTEGER NOT NULL DEFAULT 100000 CHECK (fixed_other >= 0),

  wow_fixed_allocation_percent NUMERIC(7,3) NOT NULL DEFAULT 50,
  id_fixed_allocation_percent NUMERIC(7,3) NOT NULL DEFAULT 50,
  online_fixed_allocation_percent NUMERIC(7,3) NOT NULL DEFAULT 0,

  id_staff_labor INTEGER NOT NULL DEFAULT 2100000 CHECK (id_staff_labor >= 0),
  event_staff_labor INTEGER NOT NULL DEFAULT 0 CHECK (event_staff_labor >= 0),

  naver_fee_rate_percent NUMERIC(7,3) NOT NULL DEFAULT 1.8,
  payhere_fee_rate_percent NUMERIC(7,3) NOT NULL DEFAULT 2.2,
  online_pg_fee_rate_percent NUMERIC(7,3) NOT NULL DEFAULT 3.52,

  notes TEXT NOT NULL DEFAULT '',
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL CHECK (date_trunc('month', month)::date = month),
  source TEXT NOT NULL CHECK (
    source IN (
      'full_workbook',
      'payhere_wow',
      'payhere_id',
      'payhere_online',
      'naver_booking'
    )
  ),
  file_name TEXT,
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  gross_amount INTEGER NOT NULL DEFAULT 0,
  replaced_existing BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'completed',
  imported_by TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL CHECK (date_trunc('month', month)::date = month),
  source TEXT NOT NULL CHECK (
    source IN (
      'payhere_wow',
      'payhere_id',
      'payhere_online',
      'naver_booking'
    )
  ),
  channel TEXT NOT NULL DEFAULT 'unknown' CHECK (
    channel IN ('wow_store', 'id_store', 'online_site', 'shared', 'unknown')
  ),
  occurred_on DATE NOT NULL,
  occurred_at TIMESTAMPTZ,
  external_id TEXT,
  status TEXT,
  item_name TEXT,
  option_text TEXT,
  raw_description TEXT,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  gross_amount INTEGER NOT NULL,
  payment_method TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  import_batch_id UUID REFERENCES finance_import_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_month
  ON finance_transactions(month, source, occurred_on);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_channel
  ON finance_transactions(month, channel);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_finance_transactions_external
  ON finance_transactions(source, external_id)
  WHERE external_id IS NOT NULL AND external_id <> '';

CREATE TABLE IF NOT EXISTS finance_manual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL CHECK (date_trunc('month', month)::date = month),
  kind TEXT NOT NULL CHECK (kind IN ('revenue', 'cost')),
  channel TEXT NOT NULL DEFAULT 'shared' CHECK (
    channel IN ('wow_store', 'id_store', 'online_site', 'shared', 'unknown')
  ),
  category TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  occurred_on DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_manual_entries_month
  ON finance_manual_entries(month, kind, channel);

CREATE TABLE IF NOT EXISTS finance_monthly_snapshots (
  month DATE PRIMARY KEY CHECK (date_trunc('month', month)::date = month),
  payload JSONB NOT NULL,
  locked_by TEXT,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_finance_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_finance_month_settings_updated_at ON finance_month_settings;
CREATE TRIGGER trg_finance_month_settings_updated_at
  BEFORE UPDATE ON finance_month_settings
  FOR EACH ROW EXECUTE FUNCTION fn_finance_touch_updated_at();

DROP TRIGGER IF EXISTS trg_finance_manual_entries_updated_at ON finance_manual_entries;
CREATE TRIGGER trg_finance_manual_entries_updated_at
  BEFORE UPDATE ON finance_manual_entries
  FOR EACH ROW EXECUTE FUNCTION fn_finance_touch_updated_at();

ALTER TABLE finance_month_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_manual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_monthly_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_read_finance_month_settings ON finance_month_settings;
CREATE POLICY authenticated_read_finance_month_settings
  ON finance_month_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS authenticated_write_finance_month_settings ON finance_month_settings;
CREATE POLICY authenticated_write_finance_month_settings
  ON finance_month_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS authenticated_read_finance_import_batches ON finance_import_batches;
CREATE POLICY authenticated_read_finance_import_batches
  ON finance_import_batches FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS authenticated_write_finance_import_batches ON finance_import_batches;
CREATE POLICY authenticated_write_finance_import_batches
  ON finance_import_batches FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS authenticated_read_finance_transactions ON finance_transactions;
CREATE POLICY authenticated_read_finance_transactions
  ON finance_transactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS authenticated_write_finance_transactions ON finance_transactions;
CREATE POLICY authenticated_write_finance_transactions
  ON finance_transactions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS authenticated_read_finance_manual_entries ON finance_manual_entries;
CREATE POLICY authenticated_read_finance_manual_entries
  ON finance_manual_entries FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS authenticated_write_finance_manual_entries ON finance_manual_entries;
CREATE POLICY authenticated_write_finance_manual_entries
  ON finance_manual_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS authenticated_read_finance_monthly_snapshots ON finance_monthly_snapshots;
CREATE POLICY authenticated_read_finance_monthly_snapshots
  ON finance_monthly_snapshots FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS authenticated_write_finance_monthly_snapshots ON finance_monthly_snapshots;
CREATE POLICY authenticated_write_finance_monthly_snapshots
  ON finance_monthly_snapshots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON finance_month_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON finance_import_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON finance_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON finance_manual_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON finance_monthly_snapshots TO authenticated;

COMMENT ON TABLE finance_month_settings IS '월별 재무 계산 가정값. 고정비, 인건비, 수수료율을 월마감 기준으로 저장한다.';
COMMENT ON TABLE finance_transactions IS 'PAYHERE/네이버예약 등 외부 매출 원장. 업로드 원본은 raw_payload에 최소 정보로 보관한다.';
COMMENT ON TABLE finance_manual_entries IS '현금매출, 잡수익, 인건비, 준비물, 광고비 등 자동화 전/외 항목 수기 원장.';
COMMENT ON TABLE finance_monthly_snapshots IS '월마감 시점 계산 결과 고정 스냅샷.';
