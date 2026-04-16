-- ============================================
-- 환불 감사 로그 시스템 + orders 스키마 강화
-- 2026-04-16
--
-- 목적:
--  1. 관리자가 DB status만 cancelled로 바꾼 뒤 실제 환불은 안 되어
--     불일치가 발생하는 사고를 방지 (감사 추적 + idempotency)
--  2. 부분환불·재시도·실패 이력 추적
--  3. 고객에게 환불 진행 상태를 명확히 보여주기 위한 컬럼 확보
-- ============================================

-- 1) orders 테이블에 감사 컬럼 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancellation_id varchar(255),
  ADD COLUMN IF NOT EXISTS refunded_by varchar(255);

-- 2) refund_logs 테이블 생성 (환불 이력 원장)
CREATE TABLE IF NOT EXISTS refund_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- 처리자 (관리자 이메일 혹은 'system'/'webhook')
  admin_email text NOT NULL,

  -- 환불 트리거 출처
  trigger_type varchar(32) NOT NULL DEFAULT 'admin_manual'
    CHECK (trigger_type IN ('admin_manual', 'admin_bank_manual', 'webhook', 'system')),

  -- 결제 연결 정보 (후속 추적용)
  payment_id varchar(255),
  payment_method varchar(50),
  pg_provider varchar(100),

  -- 환불 세부
  amount integer NOT NULL CHECK (amount >= 0),
  reason text,
  cancellation_id varchar(255),

  -- PortOne 원본 응답 백업 (장애 분석용)
  portone_response jsonb,

  -- 처리 상태
  status varchar(32) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'succeeded', 'failed')),
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_refund_logs_order_id ON refund_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_logs_created_at ON refund_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_logs_status ON refund_logs(status);
CREATE INDEX IF NOT EXISTS idx_refund_logs_payment_id ON refund_logs(payment_id);

-- RLS — service role만 사용 (애플리케이션 레벨에서 관리자 인증 검증)
ALTER TABLE refund_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access" ON refund_logs;
CREATE POLICY "service_role_full_access"
  ON refund_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3) 보호용 주석
COMMENT ON TABLE refund_logs IS '주문 환불 이력 원장. orders.refund_* 필드만으로는 부족한 부분환불·재시도·감사 추적을 담당.';
COMMENT ON COLUMN orders.cancellation_id IS 'PortOne이 마지막 환불 시점 반환한 cancellationId. refund_logs에는 전체 이력, 여기에는 최근 값만.';
COMMENT ON COLUMN orders.refunded_by IS '환불을 실행한 관리자 이메일 (admin_manual, admin_bank_manual, webhook, system 등).';
