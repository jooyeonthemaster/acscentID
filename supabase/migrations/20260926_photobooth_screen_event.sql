-- 포토부스 프레임·템플릿·포토카드를 '화면 이벤트'(ERP·노션 행사, 이벤트 배경과 같은 목록)에 묶는다.
-- · photobooth_assets.screen_event_id: 묶인 프레임·템플릿은 그 행사 기간(또는 '지금 바로 적용' 중)에만 부스에 보인다. NULL = 상시
-- · photobooth_cards.screen_event_id: 행사별로 묶어 관리한다(카드 인식은 켜기·끄기로만 — 손님이 행사 뒤에 와도 쓸 수 있게)
-- 화면 이벤트는 DB 가 아니라 비공개 버킷(screen-background-settings/events-v1/<id>.json)에 있어 외래키를 걸 수 없다.
-- 행사가 지워지면 묶인 소재는 부스에 나오지 않고, 관리자 화면에 '지워진 행사'로 보여 다시 고를 수 있다.
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요
-- 코드는 이 칸이 없어도 읽기는 그대로 동작한다(행사 연결 저장만 "DB 준비 필요"로 막힌다) — 배포 전후 아무 때나 실행해도 된다.

ALTER TABLE photobooth_assets ADD COLUMN IF NOT EXISTS screen_event_id TEXT;
ALTER TABLE photobooth_cards ADD COLUMN IF NOT EXISTS screen_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_photobooth_assets_screen_event ON photobooth_assets (screen_event_id);
CREATE INDEX IF NOT EXISTS idx_photobooth_cards_screen_event ON photobooth_cards (screen_event_id);
