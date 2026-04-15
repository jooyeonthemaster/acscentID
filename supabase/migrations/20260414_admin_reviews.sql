-- ============================================
-- 관리자 리뷰 관리 확장
-- admin_name: 관리자가 직접 삽입한 리뷰의 표시 이름
-- is_admin_review: 관리자 생성 리뷰 구분 플래그
-- ============================================

-- 리뷰 테이블에 관리자 관련 컬럼 추가
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_admin_review BOOLEAN DEFAULT FALSE;

-- user_id를 nullable로 변경 (관리자 리뷰는 user_id 없이도 가능)
ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL;

-- 관리자 리뷰 RLS 정책 추가
-- 관리자는 모든 리뷰를 삽입/수정/삭제 가능
CREATE POLICY "Admins can insert reviews" ON reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND email = 'nadr110619@gmail.com'
    )
  );

CREATE POLICY "Admins can update any review" ON reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND email = 'nadr110619@gmail.com'
    )
  );

CREATE POLICY "Admins can delete any review" ON reviews
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND email = 'nadr110619@gmail.com'
    )
  );

-- 관리자 리뷰 이미지 RLS
CREATE POLICY "Admins can manage all review images" ON review_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND email = 'nadr110619@gmail.com'
    )
  );

-- program_type에 graduation, le-quack, chemistry_set 추가 (이미 있으면 무시)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_program_type_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_program_type_check
  CHECK (program_type IN ('idol_image', 'personal', 'figure', 'graduation', 'le-quack', 'chemistry_set'));
