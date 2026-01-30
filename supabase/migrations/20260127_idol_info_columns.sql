-- ============================================
-- 아이돌 정보 컬럼 추가 (idol_name, idol_gender)
-- AC'SCENT Identity - 분석 결과에 최애 정보 저장
--
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- ============================================
-- 1. analysis_results 테이블에 아이돌 정보 컬럼 추가
-- ============================================

-- 최애 이름 (사용자 입력)
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS idol_name TEXT;

-- 최애 성별 (사용자 선택: Male, Female, Other)
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS idol_gender VARCHAR(20);

-- ============================================
-- 2. user_fingerprint 컬럼 추가 (없는 경우)
-- ============================================

-- 익명 사용자 식별용 fingerprint
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS user_fingerprint TEXT;

-- 인덱스 생성 (fingerprint 기반 조회용)
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_fingerprint
ON analysis_results(user_fingerprint);

-- ============================================
-- 3. 코멘트 추가 (컬럼 설명)
-- ============================================

COMMENT ON COLUMN analysis_results.idol_name IS '사용자가 입력한 최애(아이돌) 이름';
COMMENT ON COLUMN analysis_results.idol_gender IS '사용자가 선택한 최애 성별 (Male, Female, Other)';
COMMENT ON COLUMN analysis_results.user_fingerprint IS '익명 사용자 식별용 fingerprint';

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Idol Info Columns Migration completed!';
  RAISE NOTICE '- Added: idol_name (최애 이름)';
  RAISE NOTICE '- Added: idol_gender (최애 성별)';
  RAISE NOTICE '- Added: user_fingerprint (익명 사용자 식별)';
END $$;
