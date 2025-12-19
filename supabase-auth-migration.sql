-- ============================================
-- AC'SCENT IDENTITY - 인증 시스템 마이그레이션
-- Supabase Dashboard의 SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. user_profiles 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 소셜 로그인 정보
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  provider TEXT, -- 'google', 'kakao'

  -- 앱 메타데이터
  fingerprint TEXT, -- 기존 fingerprint 연결용
  preferences JSONB DEFAULT '{}'
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_fingerprint ON user_profiles(fingerprint);

-- ============================================
-- 2. 기존 테이블에 user_id 컬럼 추가
-- ============================================

-- analysis_results에 user_id 추가
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);

-- perfume_feedbacks에 user_id 추가
ALTER TABLE perfume_feedbacks
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_perfume_feedbacks_user_id ON perfume_feedbacks(user_id);

-- ============================================
-- 3. RLS 정책 설정
-- ============================================

-- user_profiles RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

-- 본인 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);

-- 본인 프로필만 생성 가능
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- analysis_results RLS 업데이트
-- 기존 정책 삭제 (이미 존재하는 경우에만)
DROP POLICY IF EXISTS "Anyone can read analysis results" ON analysis_results;
DROP POLICY IF EXISTS "Anyone can insert analysis results" ON analysis_results;
DROP POLICY IF EXISTS "Anyone can update view count" ON analysis_results;
DROP POLICY IF EXISTS "Enable read access for all" ON analysis_results;
DROP POLICY IF EXISTS "Enable insert access for all" ON analysis_results;
DROP POLICY IF EXISTS "Enable update for all" ON analysis_results;

-- 공유된 결과는 누구나 읽기 가능
CREATE POLICY "Anyone can read analysis results"
ON analysis_results FOR SELECT
USING (true);

-- 로그인 유저 또는 익명 모두 생성 가능
CREATE POLICY "Anyone can insert analysis results"
ON analysis_results FOR INSERT
WITH CHECK (true);

-- 본인 결과만 수정 가능 (user_id 매칭 또는 NULL인 경우)
CREATE POLICY "Owner can update own results"
ON analysis_results FOR UPDATE
USING (user_id IS NULL OR auth.uid() = user_id);

-- perfume_feedbacks RLS 업데이트
DROP POLICY IF EXISTS "Allow all operations on feedbacks" ON perfume_feedbacks;

-- 누구나 피드백 조회 가능 (공유 기능 위해)
CREATE POLICY "Anyone can read feedbacks"
ON perfume_feedbacks FOR SELECT
USING (true);

-- 누구나 피드백 생성 가능
CREATE POLICY "Anyone can insert feedbacks"
ON perfume_feedbacks FOR INSERT
WITH CHECK (true);

-- 본인 피드백만 수정 가능
CREATE POLICY "Owner can update own feedbacks"
ON perfume_feedbacks FOR UPDATE
USING (user_id IS NULL OR auth.uid() = user_id);

-- 본인 피드백만 삭제 가능
CREATE POLICY "Owner can delete own feedbacks"
ON perfume_feedbacks FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 4. 데이터 연동 함수 (fingerprint -> user_id)
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
  -- perfume_feedbacks 연동
  UPDATE perfume_feedbacks
  SET user_id = p_user_id
  WHERE user_fingerprint = p_fingerprint
    AND user_id IS NULL;

  GET DIAGNOSTICS v_feedbacks_updated = ROW_COUNT;

  -- user_profiles에 fingerprint 저장
  UPDATE user_profiles
  SET fingerprint = p_fingerprint,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'feedbacks_linked', v_feedbacks_updated,
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 트리거: 새 유저 생성 시 프로필 자동 생성
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, name, avatar_url, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'nickname'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'profile_image'
    ),
    NEW.raw_app_meta_data->>'provider'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있으면 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 6. updated_at 자동 업데이트 (user_profiles용)
-- ============================================
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 확인용 쿼리
-- ============================================
-- SELECT * FROM user_profiles LIMIT 10;
-- SELECT * FROM perfume_feedbacks WHERE user_id IS NOT NULL LIMIT 10;
-- SELECT * FROM analysis_results WHERE user_id IS NOT NULL LIMIT 10;
