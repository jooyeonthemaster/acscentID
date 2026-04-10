-- Fix: layering_sessions.user_id FK를 auth.users에서 제거
-- 카카오 로그인 유저는 auth.users가 아닌 user_profiles에 ID가 있어서
-- FK 제약 조건이 INSERT를 차단하고, 롤백으로 analysis_results까지 삭제되는 치명적 버그 수정

-- 기존 FK 제약 조건 제거
ALTER TABLE layering_sessions
  DROP CONSTRAINT IF EXISTS layering_sessions_user_id_fkey;

-- FK 없이 user_id 컬럼 유지 (analysis_results와 동일한 패턴)
-- user_id는 여전히 UUID 타입이며, 애플리케이션 레벨에서 관리
