-- 카운터 이용권 발급 — 직원이 결제 후 카운터 영수증 프린터로 이용권을 뽑아 준다 (/booth/counter)
-- · expires_at: 카운터 발급분은 발급 당일 영업 종료까지만 유효 (NULL = 기한 없음, 기존·관리자 발급분)
-- · issued_via: 어디서 발급했는지 (관리자 화면 / 카운터 기기) — 매출과 대조용
-- · photobooth_pass_failures: 부스 키패드의 틀린 번호 입력 기록 — 번호 맞히기 시도를 막는 잠금에 쓴다
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요
-- ⚠️ 코드 배포 전에 먼저 실행할 것 (새 이용권 확인 코드가 expires_at 을 읽는다). 기존 코드는 새 칸을 무시하므로 먼저 실행해도 안전하다.

ALTER TABLE photobooth_passes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE photobooth_passes ADD COLUMN IF NOT EXISTS issued_via TEXT NOT NULL DEFAULT 'admin'
  CHECK (issued_via IN ('admin', 'counter'));

CREATE INDEX IF NOT EXISTS idx_photobooth_passes_via ON photobooth_passes (issued_via, created_at DESC);

CREATE TABLE IF NOT EXISTS photobooth_pass_failures (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photobooth_pass_failures_created ON photobooth_pass_failures (created_at DESC);

-- RLS 활성화 + 정책 없음 = service-role 전용
ALTER TABLE photobooth_pass_failures ENABLE ROW LEVEL SECURITY;
