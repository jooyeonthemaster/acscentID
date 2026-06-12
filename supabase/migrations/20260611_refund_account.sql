-- 계좌이체(무통장입금) 주문의 취소/환불 시 고객이 환불받을 계좌 정보를 저장한다.
-- 고객이 취소 요청 단계에서 직접 입력하며, 관리자는 이 계좌로 수동 송금 후 환불을 기록한다.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS refund_account_number TEXT,
  ADD COLUMN IF NOT EXISTS refund_account_holder TEXT;

COMMENT ON COLUMN orders.refund_bank_name IS
  'Bank name of the customer''s refund account (bank_transfer cancellations only).';
COMMENT ON COLUMN orders.refund_account_number IS
  'Account number the customer wants the refund sent to (bank_transfer cancellations only).';
COMMENT ON COLUMN orders.refund_account_holder IS
  'Account holder name (예금주) of the customer''s refund account (bank_transfer cancellations only).';
