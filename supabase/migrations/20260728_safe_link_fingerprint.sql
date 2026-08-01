-- 2026-07-28 계정 뒤섞임 사고 대응
--
-- link_fingerprint_data RPC가 기기 fingerprint의 미귀속(user_id IS NULL) 데이터를
-- 무제한 과거까지 통째로 로그인 계정에 귀속시켜, 매장 태블릿 등 공용 기기에서
-- 다른 손님의 분석이 먼저 로그인한 계정에 흡수되는 사고가 발생
-- (전수 조사: 기기 69대 / 367건 뒤섞임 확인).
--
-- 앱은 이제 /api/user/link-fingerprint (24시간 윈도우, service role)를 사용하지만,
-- 배포 전 구버전 클라이언트가 이 RPC를 직접 호출할 수 있으므로 RPC에도
-- 동일한 24시간 윈도우를 적용해 둔다.

DROP FUNCTION IF EXISTS link_fingerprint_data(uuid, text);
DROP FUNCTION IF EXISTS link_fingerprint_data(text, text);

CREATE OR REPLACE FUNCTION link_fingerprint_data(p_user_id uuid, p_fingerprint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '24 hours';
BEGIN
  UPDATE analysis_results
     SET user_id = p_user_id
   WHERE user_fingerprint = p_fingerprint
     AND user_id IS NULL
     AND created_at >= v_cutoff;

  UPDATE layering_sessions
     SET user_id = p_user_id
   WHERE user_fingerprint = p_fingerprint
     AND user_id IS NULL
     AND created_at >= v_cutoff;

  UPDATE perfume_feedbacks
     SET user_id = p_user_id
   WHERE user_fingerprint = p_fingerprint
     AND user_id IS NULL
     AND created_at >= v_cutoff;
END;
$$;
