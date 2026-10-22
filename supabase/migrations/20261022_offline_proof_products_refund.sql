-- 오프라인 결제 증빙 — 구매 상품 선택 + 환불 금액(전액/차액/직접 입력)
-- 20261022_offline_payment_proofs.sql 다음에 실행한다. 여러 번 실행해도 안전하다.

-- 1) 증빙 대상 상품 — 관리자 페이지(/admin/offline-proofs)의 「상품 관리」에서 등록·수정한다.
--    price 는 차액 계산용 기준 가격(손님 화면에는 보이지 않음), 비워 두면 차액을 계산하지 않는다.
CREATE TABLE IF NOT EXISTS offline_proof_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  price INTEGER CHECK (price IS NULL OR price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,      -- 끄면 손님 폼에서 숨김 (기존 접수 기록은 유지)
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_offline_proof_products_sort ON offline_proof_products (sort_order, created_at);

-- RLS 활성화 + 정책 없음 = service-role 전용 (손님 폼은 서버가 이름만 골라 보낸다)
ALTER TABLE offline_proof_products ENABLE ROW LEVEL SECURITY;

-- 처음 등록할 상품
INSERT INTO offline_proof_products (name, sort_order)
SELECT '비아이 클리커', 1
WHERE NOT EXISTS (SELECT 1 FROM offline_proof_products WHERE name = '비아이 클리커');

INSERT INTO offline_proof_products (name, sort_order)
SELECT '비아이 피규어', 2
WHERE NOT EXISTS (SELECT 1 FROM offline_proof_products WHERE name = '비아이 피규어');

-- 2) 접수에 구매 상품과 환불 금액을 더한다
ALTER TABLE offline_payment_proofs
  -- [{product_id, name, quantity}] — 상품명은 제출 당시 그대로 남긴다
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 관리자가 정한 환불 방식: full(전액) / difference(차액) / custom(직접 입력)
  ADD COLUMN IF NOT EXISTS refund_type TEXT CHECK (refund_type IN ('full', 'difference', 'custom')),
  -- 실제로 입금할 금액 — 정한 시점의 값으로 고정 (나중에 기준 가격을 바꿔도 그대로)
  ADD COLUMN IF NOT EXISTS refund_amount INTEGER CHECK (refund_amount IS NULL OR refund_amount >= 0);
