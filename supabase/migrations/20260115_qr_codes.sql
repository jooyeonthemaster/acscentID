-- QR 코드 관리 테이블
-- Supabase SQL Editor에서 실행하세요

-- 1. QR 코드 테이블 생성
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent')),
  service_mode VARCHAR(20) DEFAULT 'offline' CHECK (service_mode IN ('online', 'offline')),
  name VARCHAR(100),
  location VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  scan_count INTEGER DEFAULT 0,
  analysis_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_product_type ON qr_codes(product_type);
CREATE INDEX IF NOT EXISTS idx_qr_codes_is_active ON qr_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON qr_codes(created_at DESC);

-- 3. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qr_codes_updated_at ON qr_codes;
CREATE TRIGGER trigger_qr_codes_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_qr_codes_updated_at();

-- 4. RLS 정책 (Row Level Security)
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 작업 가능 (서비스 롤 키 사용)
CREATE POLICY "Service role can do everything" ON qr_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. analysis_results와 qr_codes 연결을 위한 외래키 (선택적)
-- ALTER TABLE analysis_results
-- ADD CONSTRAINT fk_analysis_results_qr_code
-- FOREIGN KEY (qr_code_id) REFERENCES qr_codes(code)
-- ON DELETE SET NULL;
