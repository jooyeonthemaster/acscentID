-- 포토부스 포토카드 (매장 제작·판매)
-- 총대에게 받은 이미지로 매장이 포카를 제작하고 QR을 심는다. 손님이 부스 카메라에
-- 카드를 보여주면 그 카드의 인물이 배경 제거된 상태로 바로 합성된다.
-- (폰 업로드 경로와 달리 누끼를 등록 시점에 미리 따두므로 품질이 일정하고 즉시 뜬다)
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요
-- ⚠️ 20260915_photobooth_events.sql 실행 후에 실행할 것

CREATE TABLE IF NOT EXISTS photobooth_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  code TEXT UNIQUE NOT NULL,                    -- 카드 코드 (QR + 카드에 병기, 5자)
  title TEXT NOT NULL,                          -- 카드 이름 (예: 〇〇 A)
  event_id UUID REFERENCES photobooth_events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,                      -- 카드 앞면 원본 (인쇄용)
  cutout_url TEXT,                              -- 배경 제거 PNG (부스 합성용)
  source_credit TEXT,                           -- 이미지 제공자(총대) — 제공 출처 기록
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  scan_count INTEGER NOT NULL DEFAULT 0         -- 부스 사용 횟수 (카드별 인기 확인)
);

CREATE INDEX IF NOT EXISTS idx_photobooth_cards_code ON photobooth_cards (code);
CREATE INDEX IF NOT EXISTS idx_photobooth_cards_event ON photobooth_cards (event_id, display_order);

-- 스캔 시 카운트 증가 (service-role 경유 RPC)
CREATE OR REPLACE FUNCTION increment_photobooth_card_scan(card_code TEXT)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE photobooth_cards SET scan_count = scan_count + 1 WHERE code = card_code;
$$;

-- RLS 활성화 + 정책 없음 = service-role 전용
ALTER TABLE photobooth_cards ENABLE ROW LEVEL SECURITY;
