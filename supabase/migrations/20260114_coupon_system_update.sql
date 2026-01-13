-- 쿠폰 시스템 확장 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 1. user_profiles 테이블에 추천인 관련 컬럼 추가
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES user_profiles(id);

-- 추천인 코드 인덱스
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by);

-- 2. user_coupons 테이블에 생일 쿠폰 및 사용 추적 컬럼 추가
ALTER TABLE user_coupons
ADD COLUMN IF NOT EXISTS birthday_proof_type VARCHAR(20) CHECK (birthday_proof_type IN ('self', 'idol')),
ADD COLUMN IF NOT EXISTS birthday_idol_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS used_order_id UUID;

-- 3. orders 테이블에 쿠폰 할인 및 배송비 관련 컬럼 추가
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_fee INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_coupon_id UUID REFERENCES user_coupons(id),
ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price INTEGER,
ADD COLUMN IF NOT EXISTS final_price INTEGER;

-- orders 쿠폰 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_user_coupon_id ON orders(user_coupon_id);

-- 4. referral_rewards 테이블 생성 (추천인 보상 추적)
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES user_profiles(id),
  referred_id UUID NOT NULL REFERENCES user_profiles(id),
  referrer_coupon_id UUID REFERENCES user_coupons(id),
  referred_coupon_id UUID REFERENCES user_coupons(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- referral_rewards 인덱스
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards(referred_id);

-- 5. 웰컴 쿠폰 추가 (기존 쿠폰에 없는 경우)
INSERT INTO coupons (code, type, discount_percent, title, description, valid_until, is_active)
VALUES
  ('WELCOME15', 'welcome', 15, '웰컴 쿠폰', 'AC''SCENT에 오신 것을 환영합니다!', NOW() + INTERVAL '1 year', true)
ON CONFLICT (code) DO NOTHING;

-- 6. 쿠폰 타입별 설명 업데이트
UPDATE coupons SET description = '생일 달에 사용 가능한 특별 할인 (본인 또는 최애 생일)' WHERE type = 'birthday';
UPDATE coupons SET description = '친구 초대 시 추천인과 피추천인 모두에게 제공되는 할인' WHERE type = 'referral';
UPDATE coupons SET description = '첫 구매 완료 후 재구매 시 적용 가능한 감사 할인' WHERE type = 'repurchase';
