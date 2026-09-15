-- 포토부스 촬영 내역
-- 어떤 체험을, 어떤 생카에서, 어떤 카드/프레임으로 찍었고 인쇄까지 갔는지 누적한다.
--
-- ⚠️ 사진 자체는 저장하지 않는다. 손님 얼굴은 민감정보라 보관 시 고지·동의·파기 정책이
--    따로 필요해진다. 운영 판단에 필요한 건 "무엇을 몇 번 썼는가"이므로 메타데이터만 남긴다.
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요
-- ⚠️ 20260915_photobooth_events.sql 실행 후에 실행할 것

CREATE TABLE IF NOT EXISTS photobooth_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  mode TEXT NOT NULL CHECK (mode IN ('solo', 'together', 'template', 'card')),
  cut_count INTEGER NOT NULL DEFAULT 1,
  event_id UUID REFERENCES photobooth_events(id) ON DELETE SET NULL,
  card_code TEXT,                               -- 포토카드로 찍은 경우
  frame_title TEXT,                             -- 선택한 프레임
  template_title TEXT,                          -- 최애와 찍기에서 고른 컷
  cutout_used BOOLEAN NOT NULL DEFAULT FALSE,   -- 배경 제거 합성이 실제로 적용됐는지
  printed BOOLEAN NOT NULL DEFAULT FALSE,       -- 인쇄 버튼까지 눌렀는지
  downloaded BOOLEAN NOT NULL DEFAULT FALSE     -- 이미지 저장을 눌렀는지
);

CREATE INDEX IF NOT EXISTS idx_photobooth_shots_created ON photobooth_shots (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photobooth_shots_event ON photobooth_shots (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photobooth_shots_card ON photobooth_shots (card_code);

-- RLS 활성화 + 정책 없음 = service-role 전용
ALTER TABLE photobooth_shots ENABLE ROW LEVEL SECURITY;
