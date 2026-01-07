-- ============================================
-- AC'SCENT IDENTITY - 전체 데이터베이스 설정
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. analysis_results 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 이미지 정보
  image_url TEXT,

  -- 분석 결과
  analysis_data JSONB NOT NULL,

  -- 추천 향수 목록
  recommended_perfumes JSONB NOT NULL DEFAULT '[]',

  -- 통계
  view_count INTEGER DEFAULT 0
);

-- 기존 테이블에 컬럼 추가 (이미 있으면 무시)
DO $$
BEGIN
  -- user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_results' AND column_name = 'user_id') THEN
    ALTER TABLE analysis_results ADD COLUMN user_id UUID;
  END IF;
  -- user_fingerprint
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_results' AND column_name = 'user_fingerprint') THEN
    ALTER TABLE analysis_results ADD COLUMN user_fingerprint TEXT;
  END IF;
  -- user_image_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_results' AND column_name = 'user_image_url') THEN
    ALTER TABLE analysis_results ADD COLUMN user_image_url TEXT;
  END IF;
  -- twitter_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_results' AND column_name = 'twitter_name') THEN
    ALTER TABLE analysis_results ADD COLUMN twitter_name TEXT;
  END IF;
  -- perfume_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_results' AND column_name = 'perfume_name') THEN
    ALTER TABLE analysis_results ADD COLUMN perfume_name TEXT;
  END IF;
  -- perfume_brand
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_results' AND column_name = 'perfume_brand') THEN
    ALTER TABLE analysis_results ADD COLUMN perfume_brand TEXT;
  END IF;
  -- matching_keywords
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_results' AND column_name = 'matching_keywords') THEN
    ALTER TABLE analysis_results ADD COLUMN matching_keywords TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_fingerprint ON analysis_results(user_fingerprint);

-- RLS 활성화
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (기존 정책 삭제 후 재생성)
DROP POLICY IF EXISTS "Allow all read on analysis_results" ON analysis_results;
DROP POLICY IF EXISTS "Allow all insert on analysis_results" ON analysis_results;
DROP POLICY IF EXISTS "Allow all update on analysis_results" ON analysis_results;

CREATE POLICY "Allow all read on analysis_results"
ON analysis_results FOR SELECT
USING (true);

CREATE POLICY "Allow all insert on analysis_results"
ON analysis_results FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all update on analysis_results"
ON analysis_results FOR UPDATE
USING (true);

-- ============================================
-- 2. perfume_feedbacks 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS perfume_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 분석 결과 연결 (선택적)
  result_id UUID,

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

  -- 사용자 추적
  user_fingerprint TEXT,

  -- 메타데이터
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 테이블에 컬럼 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfume_feedbacks' AND column_name = 'user_id') THEN
    ALTER TABLE perfume_feedbacks ADD COLUMN user_id UUID;
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_fingerprint ON perfume_feedbacks(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_feedbacks_result_id ON perfume_feedbacks(result_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON perfume_feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_perfume_id ON perfume_feedbacks(perfume_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON perfume_feedbacks(user_id);

-- RLS 활성화
ALTER TABLE perfume_feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS 정책
DROP POLICY IF EXISTS "Allow all on perfume_feedbacks" ON perfume_feedbacks;

CREATE POLICY "Allow all on perfume_feedbacks"
ON perfume_feedbacks FOR ALL
USING (true) WITH CHECK (true);

-- ============================================
-- 3. user_profiles 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 기본 정보
  email TEXT,
  name TEXT,
  avatar_url TEXT,

  -- 인증 제공자 (google, kakao)
  provider TEXT DEFAULT 'google',

  -- 카카오 전용
  kakao_id TEXT UNIQUE,

  -- Fingerprint 연동
  fingerprint TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_fingerprint ON user_profiles(fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_profiles_kakao_id ON user_profiles(kakao_id);

-- RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (Service Role로 우회하므로 관대하게 설정)
DROP POLICY IF EXISTS "Allow all on user_profiles" ON user_profiles;

CREATE POLICY "Allow all on user_profiles"
ON user_profiles FOR ALL
USING (true) WITH CHECK (true);

-- ============================================
-- 4. 헬퍼 함수들
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- user_profiles updated_at 트리거
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- perfume_feedbacks updated_at 트리거
DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON perfume_feedbacks;
CREATE TRIGGER update_feedbacks_updated_at
  BEFORE UPDATE ON perfume_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fingerprint 연동 함수
CREATE OR REPLACE FUNCTION link_fingerprint_data(
  p_user_id UUID,
  p_fingerprint TEXT
)
RETURNS VOID AS $$
BEGIN
  -- perfume_feedbacks 연동
  UPDATE perfume_feedbacks
  SET user_id = p_user_id
  WHERE user_fingerprint = p_fingerprint
    AND user_id IS NULL;

  -- analysis_results 연동
  UPDATE analysis_results
  SET user_id = p_user_id
  WHERE user_fingerprint = p_fingerprint
    AND user_id IS NULL;

  -- user_profiles에 fingerprint 저장
  UPDATE user_profiles
  SET fingerprint = p_fingerprint
  WHERE id = p_user_id
    AND fingerprint IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'AC''SCENT IDENTITY 데이터베이스 설정 완료!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - analysis_results (분석 결과)';
  RAISE NOTICE '  - perfume_feedbacks (피드백/레시피)';
  RAISE NOTICE '  - user_profiles (사용자 프로필)';
  RAISE NOTICE '';
  RAISE NOTICE '카카오 로그인이 활성화되었습니다.';
END $$;
