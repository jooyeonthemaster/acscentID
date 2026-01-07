-- ============================================
-- AC'SCENT IDENTITY - 카카오 로그인 마이그레이션
-- Supabase Dashboard의 SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. user_profiles 테이블 수정
-- kakao_id 컬럼 추가 (auth.users 없이도 사용 가능)
-- ============================================

-- kakao_id 컬럼 추가
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS kakao_id TEXT UNIQUE;

-- auth_provider 컬럼 추가 (이미 provider가 있지만 명확하게)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS auth_provider TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_profiles_kakao_id ON user_profiles(kakao_id);

-- ============================================
-- 2. user_profiles PK 제약 조건 수정
-- auth.users 참조 없이 독립적으로 사용 가능하게
-- ============================================

-- 기존 FK 제약 조건 삭제 (이미 있는 경우)
-- 주의: 이 명령은 기존 데이터에 영향을 줄 수 있으므로 백업 권장
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- id를 UUID 타입으로 유지하되, auth.users 참조 제거
-- 카카오 사용자는 gen_random_uuid()로 새 ID 생성

-- ============================================
-- 3. RLS 정책 수정
-- kakao_id 기반 조회 허용
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 새 정책: 본인 프로필 조회 (auth.uid 또는 세션 기반)
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (
  auth.uid() = id
  OR kakao_id IS NOT NULL  -- 카카오 사용자도 조회 가능 (세션 기반)
);

-- 새 정책: 프로필 수정
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (
  auth.uid() = id
  OR kakao_id IS NOT NULL
);

-- 새 정책: 프로필 생성 (누구나 - 서버사이드에서 제어)
CREATE POLICY "Anyone can insert profile"
ON user_profiles FOR INSERT
WITH CHECK (true);

-- ============================================
-- 4. 카카오 사용자 조회 함수
-- ============================================
CREATE OR REPLACE FUNCTION find_user_by_kakao_id(p_kakao_id TEXT)
RETURNS SETOF user_profiles AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM user_profiles
  WHERE kakao_id = p_kakao_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 확인용 쿼리
-- ============================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'user_profiles';
