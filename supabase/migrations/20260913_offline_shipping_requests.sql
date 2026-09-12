-- 오프라인 매장 택배 접수 테이블
-- 손님이 매장 QR(/ship)로 접속해 이름·연락처·주소·상품(선택)을 입력하면 여기에 저장되고,
-- 관리자 페이지(/admin/offline-shipping)에서 상태 관리 + 배송 약식 엑셀 다운로드에 사용한다.
CREATE TABLE offline_shipping_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  request_number TEXT UNIQUE NOT NULL,          -- TB-YYMMDD-XXXX
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  zip_code TEXT,
  address TEXT NOT NULL,
  address_detail TEXT,
  product_name TEXT,                            -- 선택 입력 (보낼 상품)
  memo TEXT,                                    -- 고객 요청사항 (현재 폼 미노출, 확장 대비)
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','preparing','shipping','delivered','cancelled')),
  admin_memo TEXT
);

CREATE INDEX idx_offline_shipping_requests_created_at ON offline_shipping_requests (created_at DESC);
CREATE INDEX idx_offline_shipping_requests_status ON offline_shipping_requests (status);

-- RLS 활성화 + 정책 없음 = service-role 전용 (고객 PII 보호, 접수/조회 모두 API 경유)
ALTER TABLE offline_shipping_requests ENABLE ROW LEVEL SECURITY;
