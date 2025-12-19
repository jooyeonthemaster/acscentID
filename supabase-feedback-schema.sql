-- ============================================
-- AC'SCENT IDENTITY - 피드백 테이블 스키마
-- Supabase Dashboard의 SQL Editor에서 실행하세요
-- ============================================

-- 피드백 테이블 생성
CREATE TABLE IF NOT EXISTS perfume_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 분석 결과 연결 (선택적)
  result_id UUID REFERENCES analysis_results(id) ON DELETE SET NULL,

  -- 원본 향수 정보
  perfume_id TEXT NOT NULL,
  perfume_name TEXT NOT NULL,

  -- 피드백 데이터
  retention_percentage INTEGER NOT NULL CHECK (retention_percentage >= 0 AND retention_percentage <= 100),
  category_preferences JSONB NOT NULL DEFAULT '{}',
  specific_scents JSONB DEFAULT '[]',
  notes TEXT,

  -- 생성된 레시피
  generated_recipe JSONB,

  -- 사용자 추적 (localStorage fingerprint)
  user_fingerprint TEXT,

  -- 메타데이터
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_fingerprint ON perfume_feedbacks(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_feedbacks_result_id ON perfume_feedbacks(result_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON perfume_feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_perfume_id ON perfume_feedbacks(perfume_id);

-- Row Level Security 활성화
ALTER TABLE perfume_feedbacks ENABLE ROW LEVEL SECURITY;

-- 모든 작업 허용 정책 (프로토타입용 - 프로덕션에서는 조정 필요)
CREATE POLICY "Allow all operations on feedbacks" ON perfume_feedbacks
  FOR ALL USING (true) WITH CHECK (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON perfume_feedbacks;
CREATE TRIGGER update_feedbacks_updated_at
  BEFORE UPDATE ON perfume_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 확인용 쿼리
-- SELECT * FROM perfume_feedbacks ORDER BY created_at DESC LIMIT 10;
