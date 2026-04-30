-- ============================================================
-- 운송장(tracking) 시스템 도입 + 'preparing' 상태 정합성 보강
-- ============================================================
-- 변경 사항:
--   1. orders 테이블에 tracking_number / tracking_carrier / shipped_at 컬럼 추가
--   2. tracking_number 형식 검증 (CJ대한통운 10~12자리 숫자, NULL 허용)
--   3. orders.status 화이트리스트 CHECK 제약 추가
--      - 기존 데이터 보호를 위해 NOT VALID로 추가 후 VALIDATE
--      - 이미 사용 중인 모든 값 + 신규 'preparing' 포함
-- 영향:
--   - 기존 데이터 무손실 (모든 변경은 nullable 또는 기존값 화이트리스트 포함)
--   - 분리배송은 현재 비즈니스에 없으므로 order_items에는 컬럼 미추가
-- ============================================================

-- 1. 운송장 컬럼 추가 (모두 nullable, 기존 주문에 영향 없음)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_carrier TEXT DEFAULT 'cj',
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;

-- 2. 운송장 번호 형식 제약 (NULL 허용, 값이 있으면 숫자 10~12자리)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_tracking_number_format'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_tracking_number_format
      CHECK (tracking_number IS NULL OR tracking_number ~ '^[0-9]{10,12}$');
  END IF;
END $$;

-- 3. 택배사 화이트리스트 (현재 CJ 전용, 향후 확장 가능)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_tracking_carrier_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_tracking_carrier_check
      CHECK (tracking_carrier IS NULL OR tracking_carrier IN ('cj'));
  END IF;
END $$;

-- 4. 운송장 번호로 빠른 조회 (NULL은 인덱스에서 제외)
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number
  ON orders(tracking_number)
  WHERE tracking_number IS NOT NULL;

-- 5. orders.status 화이트리스트 CHECK 제약
--    - 기존 코드에서 직접 박힌 모든 값 + 신규 'preparing' 포함
--    - NOT VALID로 추가하여 기존 행 검증 미실시 (안전)
--    - 이후 VALIDATE로 검증 (기존 값이 모두 화이트리스트 안에 있으므로 통과해야 함)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_status_check
      CHECK (status IN (
        'awaiting_payment',
        'pending',
        'paid',
        'preparing',
        'shipping',
        'delivered',
        'cancel_requested',
        'cancelled'
      )) NOT VALID;

    -- 기존 데이터 검증 (예상치 못한 값 발견 시 실패하므로 안전망 역할)
    ALTER TABLE orders VALIDATE CONSTRAINT orders_status_check;
  END IF;
END $$;

-- 6. 컬럼 코멘트 (운영 가독성)
COMMENT ON COLUMN orders.tracking_number IS '택배 운송장 번호 (CJ대한통운 10~12자리 숫자, NULL 허용)';
COMMENT ON COLUMN orders.tracking_carrier IS '택배사 식별자 (현재 cj만 지원)';
COMMENT ON COLUMN orders.shipped_at IS '발송 처리(=운송장 등록) 시각';
