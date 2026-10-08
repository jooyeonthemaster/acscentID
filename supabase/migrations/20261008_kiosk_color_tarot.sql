-- 키오스크 분석 기록에 AI 퍼스널 컬러(color) · AI 타로(tarot) 프로그램을 받는다.
--  1) program CHECK 에 두 값을 더한다 — 이게 없으면 두 프로그램의 기록 저장이 거부된다
--     (손님 화면은 그대로 돌고 /admin/kiosk 에만 안 남는다).
--  2) detail JSONB — 두 프로그램의 요약(유형·네 축 점수 / 주제·뽑힌 카드 세 장). saju 컬럼과 같은 자리.
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요

ALTER TABLE kiosk_analyses DROP CONSTRAINT IF EXISTS kiosk_analyses_program_check;
ALTER TABLE kiosk_analyses
  ADD CONSTRAINT kiosk_analyses_program_check
  CHECK (program IN ('personal', 'idol', 'saju', 'color', 'tarot'));

ALTER TABLE kiosk_analyses ADD COLUMN IF NOT EXISTS detail JSONB;
