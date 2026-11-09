-- 무통장입금 자동 확인 (우리은행 입금 알림 문자)
-- 전용 안드로이드 폰이 받은 입금 문자를 MacroDroid 가 POST /api/payments/bank-notify 로 보내면,
-- 금액·입금자명·주문 시각이 맞는 입금대기 주문을 입금완료로 바꾼다. 못 고른 입금은 이 표에 남아
-- 관리자 페이지(/admin/bank-deposits)에서 주문을 골라 처리한다. 흐름은 docs/BANK_DEPOSIT_AUTO_CONFIRM.md.
-- 여러 번 실행해도 안전하다.

-- 1) 주문의 입금자명 — 주문서에서 손님이 적는다(기본값 = 받는 분 이름). 비어 있으면 받는 분 이름으로 맞춘다.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS depositor_name TEXT;

-- 2) 받은 입금 문자
CREATE TABLE IF NOT EXISTS bank_deposit_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,              -- 같은 문자 재전송 거르기(문자 내용 해시 또는 폰이 준 id)
  source TEXT NOT NULL DEFAULT 'sms',
  raw_text TEXT NOT NULL,                        -- 문자 원문(입금자명·잔액 포함 — 관리자 API 로만 본다)
  amount INTEGER NOT NULL CHECK (amount > 0),
  depositor_name TEXT,
  account_suffix TEXT,                           -- 문자의 계좌 끝자리('*549279' → '549279')
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','matched','unmatched','ambiguous','ignored','failed','linked','dismissed')),
  -- matched: 자동 입금완료 · linked: 관리자가 주문을 골라 입금완료 · dismissed: 관리자가 주문 아님으로 넘김
  -- unmatched/ambiguous/failed: 관리자 확인 필요 · ignored: 다른 계좌·출금·이자 등 자동으로 넘김
  matched_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  candidate_order_ids UUID[] NOT NULL DEFAULT '{}',
  note TEXT,
  occurred_at TIMESTAMPTZ,                       -- 문자에 찍힌 입금 시각
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  resolved_by TEXT                               -- 관리자가 처리했으면 그 이메일
);

CREATE INDEX IF NOT EXISTS idx_bank_deposit_notifications_status ON bank_deposit_notifications (status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_deposit_notifications_order ON bank_deposit_notifications (matched_order_id);

-- RLS 활성화 + 정책 없음 = service-role 전용 (입금자명·잔액 등 보호, 읽기·쓰기 모두 API 경유)
ALTER TABLE bank_deposit_notifications ENABLE ROW LEVEL SECURITY;

-- 3) 입금대기 무통장 주문 찾기(금액·시각)
CREATE INDEX IF NOT EXISTS idx_orders_pending_bank_transfer
  ON orders (final_price, created_at)
  WHERE status = 'pending' AND payment_method = 'bank_transfer';
