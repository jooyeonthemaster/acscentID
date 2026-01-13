-- 관리자 페이지용 분석 결과 테이블 확장
-- Supabase SQL Editor에서 실행하세요

-- 1. analysis_results 테이블에 상품 타입 및 서비스 모드 컬럼 추가
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'image_analysis';

ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS service_mode VARCHAR(20) DEFAULT 'online';

ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS qr_code_id VARCHAR(50);

-- 2. 상품 타입 체크 제약조건 (기존 데이터 호환성을 위해 별도 추가)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analysis_results_product_type_check'
  ) THEN
    ALTER TABLE analysis_results
    ADD CONSTRAINT analysis_results_product_type_check
    CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent'));
  END IF;
END $$;

-- 3. 서비스 모드 체크 제약조건
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analysis_results_service_mode_check'
  ) THEN
    ALTER TABLE analysis_results
    ADD CONSTRAINT analysis_results_service_mode_check
    CHECK (service_mode IN ('online', 'offline'));
  END IF;
END $$;

-- 4. 인덱스 생성 (관리자 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_analysis_results_product_type ON analysis_results(product_type);
CREATE INDEX IF NOT EXISTS idx_analysis_results_service_mode ON analysis_results(service_mode);
CREATE INDEX IF NOT EXISTS idx_analysis_results_qr_code_id ON analysis_results(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at DESC);

-- 5. 기존 데이터 기본값 설정 (NULL인 경우)
UPDATE analysis_results SET product_type = 'image_analysis' WHERE product_type IS NULL;
UPDATE analysis_results SET service_mode = 'online' WHERE service_mode IS NULL;
