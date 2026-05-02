-- 분석 대상 타입(target_type) 추가
-- 'idol' = 최애 분석, 'self' = 나 분석
-- 인쇄 보고서 배경(1-1/1-2/2-1/2-2) 분기에 사용

-- 1. analysis_results 테이블
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS target_type VARCHAR(10) DEFAULT 'idol';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analysis_results_target_type_check'
  ) THEN
    ALTER TABLE analysis_results
    ADD CONSTRAINT analysis_results_target_type_check
    CHECK (target_type IN ('idol', 'self'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analysis_results_target_type ON analysis_results(target_type);

UPDATE analysis_results SET target_type = 'idol' WHERE target_type IS NULL;

-- 2. layering_sessions 테이블 (케미 분석)
ALTER TABLE layering_sessions
ADD COLUMN IF NOT EXISTS target_type VARCHAR(10) DEFAULT 'idol';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'layering_sessions_target_type_check'
  ) THEN
    ALTER TABLE layering_sessions
    ADD CONSTRAINT layering_sessions_target_type_check
    CHECK (target_type IN ('idol', 'self'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_layering_sessions_target_type ON layering_sessions(target_type);

UPDATE layering_sessions SET target_type = 'idol' WHERE target_type IS NULL;
