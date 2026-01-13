-- 쿠폰 시스템 테이블 생성
-- Supabase SQL Editor에서 실행하세요

-- 1. coupons 테이블 생성
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('birthday', 'referral', 'repurchase', 'welcome')),
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. user_coupons 테이블 생성 (사용자가 받은 쿠폰)
CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT false,
  UNIQUE(user_id, coupon_id)
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_type ON coupons(type);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

-- 4. 기본 쿠폰 데이터 삽입
INSERT INTO coupons (code, type, discount_percent, title, description, valid_until, is_active)
VALUES
  ('BIRTHDAY20', 'birthday', 20, '생일 축하', '생일 달 고객님께 드리는 특별 할인', NOW() + INTERVAL '1 year', true),
  ('FRIEND10', 'referral', 10, '친구 추천', '친구를 추천해주셔서 감사합니다', NOW() + INTERVAL '1 year', true),
  ('THANKYOU10', 'repurchase', 10, '재구매 감사', '다시 찾아주셔서 감사합니다', NOW() + INTERVAL '1 year', true)
ON CONFLICT (code) DO NOTHING;

-- 5. RLS 정책 (선택사항 - Service Role 사용 시 불필요)
-- ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Anyone can view active coupons" ON coupons
--   FOR SELECT USING (is_active = true);

-- CREATE POLICY "Users can view their own coupons" ON user_coupons
--   FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can claim coupons" ON user_coupons
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
