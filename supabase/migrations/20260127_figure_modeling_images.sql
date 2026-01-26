-- ============================================
-- 피규어 디퓨저 3D 모델링용 이미지 & 요청사항 저장
-- AC'SCENT Identity - Figure Diffuser Online Mode
--
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- ============================================
-- 1. analysis_results 테이블에 모델링 관련 컬럼 추가
-- ============================================

-- 3D 모델링용 이미지 URL
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS modeling_image_url TEXT;

-- 모델링 요청사항 (주관식)
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS modeling_request TEXT;

-- 모델링 요청사항 생성 시간 (추후 관리자 확인용)
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS modeling_submitted_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 2. 코멘트 추가 (컬럼 설명)
-- ============================================

COMMENT ON COLUMN analysis_results.modeling_image_url IS '피규어 3D 모델링용 참조 이미지 URL (analysis-images 버킷에 저장)';
COMMENT ON COLUMN analysis_results.modeling_request IS '피규어 모델링 시 참고할 사용자 요청사항';
COMMENT ON COLUMN analysis_results.modeling_submitted_at IS '모델링 요청 제출 시간';

-- ============================================
-- 3. 인덱스 생성 (관리자 쿼리용)
-- ============================================

-- 모델링 이미지가 있는 결과만 빠르게 조회
CREATE INDEX IF NOT EXISTS idx_analysis_results_has_modeling
ON analysis_results(modeling_image_url)
WHERE modeling_image_url IS NOT NULL;

-- ============================================
-- 4. Storage 버킷 정책 확인
-- (기존 analysis-images 버킷 사용, 정책 이미 설정됨)
-- ============================================

-- 모델링 이미지는 analysis-images/modeling/ 경로에 저장
-- 기존 RLS 정책으로 충분 (공개 읽기, 익명 업로드 허용)

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Figure Modeling Migration completed!';
  RAISE NOTICE '- Added: modeling_image_url (3D 모델링용 이미지)';
  RAISE NOTICE '- Added: modeling_request (모델링 요청사항)';
  RAISE NOTICE '- Added: modeling_submitted_at (제출 시간)';
  RAISE NOTICE '- Storage: 기존 analysis-images 버킷 사용';
END $$;
