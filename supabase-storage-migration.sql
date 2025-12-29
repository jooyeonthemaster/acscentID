-- ============================================
-- Supabase Storage & Schema Migration
-- AC'SCENT Identity - Analysis Results Auto-Save
--
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- ============================================
-- 1. Storage 버켓 생성
-- ============================================

-- analysis-images 버켓 생성 (공개 버켓)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'analysis-images',
  'analysis-images',
  true,  -- 공개 접근 허용 (공유 링크용)
  5242880,  -- 5MB 제한
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Storage RLS 정책
-- ============================================

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "analysis_images_select" ON storage.objects;
DROP POLICY IF EXISTS "analysis_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "analysis_images_delete" ON storage.objects;

-- 누구나 이미지 조회 가능 (공유 링크용)
CREATE POLICY "analysis_images_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'analysis-images');

-- 누구나 이미지 업로드 가능 (익명 사용자 포함)
CREATE POLICY "analysis_images_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'analysis-images');

-- 소유자만 삭제 가능 (폴더 이름이 user_id인 경우)
CREATE POLICY "analysis_images_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'analysis-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.role() = 'service_role'
  )
);

-- ============================================
-- 3. analysis_results 스키마 업데이트
-- ============================================

-- user_fingerprint 컬럼 추가 (익명 사용자 추적용)
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS user_fingerprint TEXT;

-- fingerprint 인덱스 생성 (빠른 조회용)
CREATE INDEX IF NOT EXISTS idx_analysis_results_fingerprint
ON analysis_results(user_fingerprint);

-- user_id 인덱스 확인/생성 (마이페이지 조회용)
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id
ON analysis_results(user_id);

-- ============================================
-- 4. link_fingerprint_data RPC 업데이트
-- (analysis_results도 연동하도록 확장)
-- ============================================

CREATE OR REPLACE FUNCTION link_fingerprint_data(
  p_user_id UUID,
  p_fingerprint TEXT
)
RETURNS JSON AS $$
DECLARE
  v_feedbacks_updated INTEGER;
  v_results_updated INTEGER;
BEGIN
  -- 1. perfume_feedbacks 연동 (기존)
  UPDATE perfume_feedbacks
  SET user_id = p_user_id
  WHERE user_fingerprint = p_fingerprint
    AND user_id IS NULL;

  GET DIAGNOSTICS v_feedbacks_updated = ROW_COUNT;

  -- 2. analysis_results 연동 (신규!)
  UPDATE analysis_results
  SET user_id = p_user_id
  WHERE user_fingerprint = p_fingerprint
    AND user_id IS NULL;

  GET DIAGNOSTICS v_results_updated = ROW_COUNT;

  -- 3. user_profiles에 fingerprint 저장
  UPDATE user_profiles
  SET
    fingerprint = p_fingerprint,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 4. 결과 반환
  RETURN json_build_object(
    'feedbacks_linked', v_feedbacks_updated,
    'results_linked', v_results_updated,
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. analysis_results RLS 정책 업데이트
-- ============================================

-- 기존 정책 유지하면서 user_id 기반 조회 최적화
-- (이미 있는 정책이면 무시됨)

-- 사용자 본인 결과 조회 정책
DROP POLICY IF EXISTS "Users can view own results" ON analysis_results;
CREATE POLICY "Users can view own results"
ON analysis_results FOR SELECT
USING (
  user_id = auth.uid()
  OR user_id IS NULL  -- 공개 결과 (공유 링크)
);

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '- Storage bucket: analysis-images created';
  RAISE NOTICE '- Column added: analysis_results.user_fingerprint';
  RAISE NOTICE '- RPC updated: link_fingerprint_data now links analysis_results';
  RAISE NOTICE '- Indexes created for optimized queries';
END $$;
