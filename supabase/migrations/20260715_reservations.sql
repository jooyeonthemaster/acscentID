-- 오프라인 방문 예약 테이블
-- 더블부킹 방지: 구글 캘린더 freeBusy(1차) + 부분 유니크 인덱스(2차, 동시 제출 레이스 방어)
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reservation_code TEXT UNIQUE NOT NULL,        -- RSV-XXXXXX
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  party_size INTEGER NOT NULL DEFAULT 1 CHECK (party_size BETWEEN 1 AND 10),
  program TEXT NOT NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  notes TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','cancelled','no_show','completed')),
  google_event_id TEXT,
  -- P2 취소 링크 동선용 선반영 (MVP에서는 미사용)
  cancel_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex')
);

-- 활성(confirmed) 예약은 슬롯당 1건 — 동시 제출 시 한쪽은 23505
CREATE UNIQUE INDEX uq_reservations_active_slot ON reservations (slot_start) WHERE status = 'confirmed';
CREATE INDEX idx_reservations_slot_start ON reservations (slot_start);
CREATE INDEX idx_reservations_email ON reservations (email);

-- RLS 활성화 + 정책 없음 = service-role 전용 (고객 PII 보호)
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
