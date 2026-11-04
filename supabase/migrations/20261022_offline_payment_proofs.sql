-- 오프라인 결제 증빙 접수
-- 매장에서 결제한 손님이 /proof 에서 결제 내역 사진(결제 날짜·금액이 보이게)과 결제일·결제 금액,
-- 이름(예금주)·연락처·은행·계좌번호를 제출하면 여기에 저장되고,
-- 관리자 페이지(/admin/offline-proofs)에서 사진 확인 + 상태 관리 + 엑셀 다운로드에 사용한다.

-- 1) 접수 테이블
CREATE TABLE IF NOT EXISTS offline_payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_number TEXT UNIQUE NOT NULL,          -- PF-YYMMDD-XXXX
  name TEXT NOT NULL,                           -- 이름(예금주)
  phone TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,                 -- 숫자만 저장 (하이픈 제거)
  payment_date DATE NOT NULL,                   -- 손님이 입력한 결제일
  payment_amount INTEGER NOT NULL CHECK (payment_amount > 0),
  image_paths TEXT[] NOT NULL DEFAULT '{}',     -- offline-payment-proofs 버킷 안 경로 ({id}/1.jpg …)
  privacy_agreed_at TIMESTAMPTZ NOT NULL,       -- 개인정보 수집·이용 동의 시각
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','approved','paid','rejected')),
  admin_memo TEXT
);

CREATE INDEX IF NOT EXISTS idx_offline_payment_proofs_created_at ON offline_payment_proofs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offline_payment_proofs_status ON offline_payment_proofs (status);
CREATE INDEX IF NOT EXISTS idx_offline_payment_proofs_account ON offline_payment_proofs (account_number);

-- RLS 활성화 + 정책 없음 = service-role 전용 (계좌번호 등 PII 보호, 접수/조회 모두 API 경유)
ALTER TABLE offline_payment_proofs ENABLE ROW LEVEL SECURITY;

-- 2) 증빙 사진 저장소 — 비공개 버킷. 관리자 API 가 잠깐 쓰는 서명 주소로만 보여준다.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('offline-payment-proofs', 'offline-payment-proofs', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
