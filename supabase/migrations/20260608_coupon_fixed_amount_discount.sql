-- Support percentage and fixed-amount coupon discounts.

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0;

ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_discount_percent_check;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_discount_type_check;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_discount_amount_check;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_discount_value_check;

ALTER TABLE coupons
  ADD CONSTRAINT coupons_discount_percent_check
  CHECK (discount_percent >= 0 AND discount_percent <= 100),
  ADD CONSTRAINT coupons_discount_type_check
  CHECK (discount_type IN ('percent', 'fixed_amount')),
  ADD CONSTRAINT coupons_discount_amount_check
  CHECK (discount_amount >= 0),
  ADD CONSTRAINT coupons_discount_value_check
  CHECK (
    (discount_type = 'percent' AND discount_percent > 0 AND discount_amount = 0)
    OR
    (discount_type = 'fixed_amount' AND discount_percent = 0 AND discount_amount > 0)
  );
