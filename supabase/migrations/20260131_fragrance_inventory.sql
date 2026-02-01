-- 향료 재고 관리 테이블
-- 온라인/오프라인 재고를 분리하여 관리

CREATE TABLE IF NOT EXISTS fragrance_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fragrance_id VARCHAR(50) NOT NULL UNIQUE,
  fragrance_name VARCHAR(100) NOT NULL,
  category VARCHAR(50),

  -- 온라인 재고 (ml)
  online_stock_ml DECIMAL(10,2) DEFAULT 0,
  -- 오프라인 재고 (ml)
  offline_stock_ml DECIMAL(10,2) DEFAULT 0,

  -- 최소 재고 경고 임계값 (ml)
  min_threshold_ml DECIMAL(10,2) DEFAULT 50,

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- 재고 변동 이력 테이블
CREATE TABLE IF NOT EXISTS fragrance_inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fragrance_id VARCHAR(50) NOT NULL,

  -- 변동 정보
  change_type VARCHAR(20) NOT NULL, -- 'add' | 'deduct' | 'adjust' | 'initial'
  source VARCHAR(20) NOT NULL, -- 'online' | 'offline'
  change_amount_ml DECIMAL(10,2) NOT NULL,

  -- 변동 후 잔량
  resulting_stock_ml DECIMAL(10,2) NOT NULL,

  -- 참조
  reference_type VARCHAR(50), -- 'order' | 'analysis' | 'manual'
  reference_id VARCHAR(100),

  -- 메타
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_inventory_fragrance ON fragrance_inventory(fragrance_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_fragrance ON fragrance_inventory_logs(fragrance_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created ON fragrance_inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_source ON fragrance_inventory_logs(source);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inventory_updated_at
  BEFORE UPDATE ON fragrance_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();
