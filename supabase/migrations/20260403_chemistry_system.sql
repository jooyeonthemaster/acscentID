-- ================================================
-- 케미 향수 시스템 마이그레이션
-- 2026-04-03
-- ================================================

-- 1. analysis_results 테이블: product_type CHECK 확장
ALTER TABLE analysis_results
  DROP CONSTRAINT IF EXISTS analysis_results_product_type_check;

ALTER TABLE analysis_results
  ADD CONSTRAINT analysis_results_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test'));

-- 2. cart_items 테이블: product_type CHECK 확장
ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_product_type_check;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test'));

-- 3. order_items 테이블: product_type CHECK 확장
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_type_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test'));

-- 4. qr_codes 테이블: product_type CHECK 확장
ALTER TABLE qr_codes
  DROP CONSTRAINT IF EXISTS qr_codes_product_type_check;

ALTER TABLE qr_codes
  ADD CONSTRAINT qr_codes_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test'));

-- 5. layering_sessions 테이블 생성
CREATE TABLE IF NOT EXISTS layering_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 두 개의 분석 결과 참조
  analysis_a_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  analysis_b_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,

  -- 사용자 정보
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_fingerprint TEXT,

  -- 입력 데이터
  character_a_name TEXT NOT NULL,
  character_b_name TEXT NOT NULL,
  relation_trope TEXT,
  character_a_archetype TEXT,
  character_b_archetype TEXT,
  scene TEXT,
  emotion_keywords TEXT[],
  scent_direction INTEGER DEFAULT 50,
  message TEXT,

  -- 케미 분석 결과
  chemistry_data JSONB NOT NULL DEFAULT '{}',
  chemistry_type TEXT CHECK (chemistry_type IN ('milddang', 'slowburn', 'dalddal', 'storm')),
  chemistry_title TEXT,

  -- 이미지 URL
  character_a_image_url TEXT,
  character_b_image_url TEXT,

  -- 서비스 메타
  service_mode TEXT NOT NULL DEFAULT 'online' CHECK (service_mode IN ('online', 'offline')),
  pin TEXT,
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
  locale TEXT DEFAULT 'ko',

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_layering_sessions_user_id ON layering_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_layering_sessions_analysis_a ON layering_sessions(analysis_a_id);
CREATE INDEX IF NOT EXISTS idx_layering_sessions_analysis_b ON layering_sessions(analysis_b_id);
CREATE INDEX IF NOT EXISTS idx_layering_sessions_chemistry_type ON layering_sessions(chemistry_type);
CREATE INDEX IF NOT EXISTS idx_layering_sessions_created_at ON layering_sessions(created_at DESC);

-- RLS 활성화
ALTER TABLE layering_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 자신의 세션만 조회 가능
CREATE POLICY "Users can view own layering sessions"
  ON layering_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 인증된 사용자만 생성 가능
CREATE POLICY "Authenticated users can create layering sessions"
  ON layering_sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS 정책: 서비스 역할은 모든 작업 가능
CREATE POLICY "Service role has full access to layering sessions"
  ON layering_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_layering_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_layering_sessions_updated_at
  BEFORE UPDATE ON layering_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_layering_sessions_updated_at();
