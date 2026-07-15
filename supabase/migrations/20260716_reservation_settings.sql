-- 방문 예약 정책 설정 (단일 행) — 어드민에서 재배포 없이 변경
-- 행이 없으면 서버는 src/lib/reservation/config.ts 기본값으로 동작한다.
CREATE TABLE reservation_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- 단일 행 강제
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepting BOOLEAN NOT NULL DEFAULT TRUE,           -- 예약 접수 on/off
  open_time TEXT NOT NULL DEFAULT '11:00',
  close_time TEXT NOT NULL DEFAULT '19:00',
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_interval_minutes BETWEEN 5 AND 120),
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 5 AND 480),
  min_lead_time_hours INTEGER NOT NULL DEFAULT 12 CHECK (min_lead_time_hours BETWEEN 0 AND 168),
  max_advance_days INTEGER NOT NULL DEFAULT 30 CHECK (max_advance_days BETWEEN 1 AND 90),
  closed_weekdays INTEGER[] NOT NULL DEFAULT '{}',   -- 0=일 ... 6=토
  max_party_size INTEGER NOT NULL DEFAULT 6 CHECK (max_party_size BETWEEN 1 AND 10),
  max_active_reservations_per_email INTEGER NOT NULL DEFAULT 2 CHECK (max_active_reservations_per_email BETWEEN 1 AND 10),
  programs TEXT[] NOT NULL DEFAULT '{idol-image,personal,chemistry}'
);

INSERT INTO reservation_settings (id) VALUES (1);

-- RLS 활성화 + 정책 없음 = service-role 전용
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;
