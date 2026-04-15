-- Deprecate the stamp milestone system in favor of an auto-issued repurchase coupon.
-- Policy: on every successful order, an unused `repurchase` coupon (code THANKYOU10)
-- is issued to the user if they don't already have one. Used coupons are replenished
-- on the next order, giving unlimited 10% off for repurchasers.

-- 1) Deactivate legacy stamp coupon templates so they can no longer be issued/queried.
UPDATE coupons
SET is_active = false
WHERE type IN ('stamp_10', 'stamp_20', 'stamp_free');

-- 2) Ensure the repurchase coupon template exists and is active.
INSERT INTO coupons (code, type, discount_percent, title, description, is_active)
VALUES (
  'THANKYOU10',
  'repurchase',
  10,
  '재구매 감사',
  '다시 찾아주셔서 감사합니다 - 10% 할인',
  true
)
ON CONFLICT (code) DO UPDATE
SET is_active = true,
    discount_percent = 10,
    type = 'repurchase';

-- 3) Drop legacy stamp tables (data no longer used by the application).
DROP TABLE IF EXISTS stamp_rewards CASCADE;
DROP TABLE IF EXISTS stamp_history CASCADE;
DROP TABLE IF EXISTS user_stamps CASCADE;
