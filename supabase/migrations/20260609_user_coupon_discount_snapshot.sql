-- 개인 쿠폰(user_coupons)에 할인값 스냅샷 컬럼 추가.
--
-- 배경: 재구매 쿠폰 등은 결제 시 템플릿(coupons)의 할인값을 실시간으로 읽어 계산하므로,
-- 관리자가 할인율을 바꾸면 이미 발급된 미사용 쿠폰에도 즉시 소급 적용된다.
-- 관리자가 "신규 발급분부터만 적용(기존 보유분은 받을 당시 할인 유지)"을 선택할 수 있도록,
-- 쿠폰별로 할인값을 고정(스냅샷)할 수 있는 컬럼을 둔다.
--
-- 규칙:
--   - discount_type 이 NULL  → 스냅샷 없음. 템플릿(coupons)의 현재 값을 따른다(=소급 대상).
--   - discount_type 이 NOT NULL → 발급 당시(또는 잠금 시점) 값으로 고정된다.
-- 기존 행은 모두 NULL 로 시작하므로 현행 동작과 100% 동일하다.

ALTER TABLE user_coupons
  ADD COLUMN IF NOT EXISTS discount_type TEXT,
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER;

ALTER TABLE user_coupons DROP CONSTRAINT IF EXISTS user_coupons_discount_type_check;
ALTER TABLE user_coupons
  ADD CONSTRAINT user_coupons_discount_type_check
  CHECK (discount_type IS NULL OR discount_type IN ('percent', 'fixed_amount'));
