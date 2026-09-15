-- 키오스크 분석 기록 — 매장 무인 기기(/kiosk)에서 나온 분석 결과를 한 건씩 남긴다.
-- 관리자 페이지(/admin/kiosk)의 목록·통계가 이 테이블 하나만 읽는다.
--
-- 왜 별도 테이블인가: 사이트 분석(analysis_results)은 로그인 사용자에 귀속되지만
-- 키오스크는 비로그인 무인 기기라 사용자 FK가 없고, 영수증 발권/출력 여부처럼
-- 매장 운영에서만 쓰는 컬럼이 필요하다.
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요

CREATE TABLE IF NOT EXISTS kiosk_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 무엇을 했나
  program TEXT NOT NULL CHECK (program IN ('personal', 'idol', 'saju')),
  customer_name TEXT,                           -- 손님이 입력한 이름/별명 (게스트 가능)
  gender TEXT,
  photo_source TEXT CHECK (photo_source IN ('camera', 'qr')),  -- 사주는 NULL

  -- 무엇을 만들기로 했나
  product_type TEXT,                            -- perfume_10ml 등
  product_label TEXT,                           -- 퍼퓸 10ml
  perfume_id TEXT,
  perfume_no TEXT,                              -- 영수증 표기용 번호 (예: 07)
  perfume_name TEXT,
  category_en TEXT,                             -- FLORAL 등
  match_score NUMERIC(4, 3),                    -- 0~1

  -- 결과 본문 (재현·분석용)
  keywords TEXT[],
  traits JSONB,                                 -- [{ label, value }] 상위 시그널
  personal_color TEXT,
  analysis_text TEXT,
  recipe JSONB,                                 -- [{ id, name, ratio, amountMl, amountG }]
  saju JSONB,                                   -- 사주 프로그램일 때만 (명식·용신 요약)

  -- 매장 운영
  ticket TEXT,                                  -- 영수증 발권 번호 (프린터 셸에서만 부여)
  printed BOOLEAN NOT NULL DEFAULT FALSE,       -- 영수증을 실제로 뽑았는가
  printed_at TIMESTAMPTZ,
  mocked BOOLEAN NOT NULL DEFAULT FALSE,        -- 데모/폴백 결과 — 통계에서 제외해야 한다
  device TEXT                                   -- 셸 버전 또는 'web'
);

CREATE INDEX IF NOT EXISTS idx_kiosk_analyses_created_at ON kiosk_analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kiosk_analyses_program ON kiosk_analyses (program, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kiosk_analyses_perfume ON kiosk_analyses (perfume_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_analyses_printed ON kiosk_analyses (printed);

-- RLS 활성화 + 정책 없음 = service-role 전용 (손님 이름이 들어가므로 공개 조회 금지)
ALTER TABLE kiosk_analyses ENABLE ROW LEVEL SECURITY;
