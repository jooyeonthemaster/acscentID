-- Stamp system migration
-- user_stamps: tracks total stamp count per user
CREATE TABLE IF NOT EXISTS user_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  total_stamps INTEGER DEFAULT 0 CHECK (total_stamps >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- stamp_history: audit log of every stamp change
CREATE TABLE IF NOT EXISTS stamp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  stamps_added INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('online_order', 'offline_admin', 'manual_adjustment')),
  order_id UUID,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- stamp_rewards: milestone tracking and coupon generation
CREATE TABLE IF NOT EXISTS stamp_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  milestone INTEGER NOT NULL CHECK (milestone IN (2, 4, 6)),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('stamp_10', 'stamp_20', 'stamp_free')),
  is_claimed BOOLEAN DEFAULT false,
  user_coupon_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  UNIQUE(user_id, milestone)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_stamps_user_id ON user_stamps(user_id);
CREATE INDEX IF NOT EXISTS idx_stamp_history_user_id ON stamp_history(user_id);
CREATE INDEX IF NOT EXISTS idx_stamp_history_order_id ON stamp_history(order_id);
CREATE INDEX IF NOT EXISTS idx_stamp_rewards_user_id ON stamp_rewards(user_id);

-- Insert stamp coupon definitions into coupons table
-- These are the "template" coupons that will be cloned to user_coupons when milestones are reached
INSERT INTO coupons (code, type, discount_percent, title, description, is_active)
VALUES
  ('STAMP10', 'stamp_10', 10, '스탬프 10% 할인', '2회 구매 달성 보상 - 10% 할인 쿠폰', true),
  ('STAMP20', 'stamp_20', 20, '스탬프 20% 할인', '4회 구매 달성 보상 - 20% 할인 쿠폰', true),
  ('STAMPFREE', 'stamp_free', 100, '스탬프 무료 상품', '6회 구매 달성 보상 - 상품 1개 무료', true)
ON CONFLICT (code) DO NOTHING;
