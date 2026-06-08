-- Offline physical coupon codes
-- Supabase SQL Editor에서 실행하세요.

-- coupons.type에 실물 쿠폰 타입 추가
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_type_check;
ALTER TABLE coupons
  ADD CONSTRAINT coupons_type_check
  CHECK (
    type IN (
      'birthday',
      'referral',
      'repurchase',
      'welcome',
      'offline',
      'stamp_10',
      'stamp_20',
      'stamp_free'
    )
  );

-- 종이 쿠폰 1장마다 하나씩 발급되는 고유 코드.
-- QR 원본 토큰은 저장하지 않고 SHA-256 해시만 저장한다.
CREATE TABLE IF NOT EXISTS offline_coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL,
  batch_name TEXT,
  serial_number VARCHAR(32) UNIQUE NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'claimed', 'used', 'void')),
  claimed_by_user_id UUID,
  user_coupon_id UUID REFERENCES user_coupons(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  printed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  issued_by_admin_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_coupon_codes_coupon_id
  ON offline_coupon_codes(coupon_id);
CREATE INDEX IF NOT EXISTS idx_offline_coupon_codes_batch_id
  ON offline_coupon_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_offline_coupon_codes_token_hash
  ON offline_coupon_codes(token_hash);
CREATE INDEX IF NOT EXISTS idx_offline_coupon_codes_serial_number
  ON offline_coupon_codes(serial_number);
CREATE INDEX IF NOT EXISTS idx_offline_coupon_codes_status
  ON offline_coupon_codes(status);
CREATE INDEX IF NOT EXISTS idx_offline_coupon_codes_claimed_by
  ON offline_coupon_codes(claimed_by_user_id);

ALTER TABLE offline_coupon_codes ENABLE ROW LEVEL SECURITY;
