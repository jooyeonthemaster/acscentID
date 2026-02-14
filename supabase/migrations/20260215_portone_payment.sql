-- PortOne V2 결제 연동을 위한 orders 테이블 확장
-- 기존 계좌이체 주문에는 영향 없음 (모두 nullable 또는 default값)

-- 결제 방법 컬럼 (bank_transfer = 기존, card/kakao_pay/naver_pay = 포트원)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'bank_transfer';

-- 포트원 결제 관련 필드
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pg_provider VARCHAR(100);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pg_tx_id VARCHAR(255);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 환불 관련 필드
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS refund_amount INTEGER DEFAULT 0;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
