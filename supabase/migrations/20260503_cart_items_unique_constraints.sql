-- ============================================================
-- cart_items: 부분 unique 인덱스 → 일반 UNIQUE 제약 교체
-- 2026-05-03
-- ============================================================
-- 배경:
--   20260502_layering_session_ref 에서 부분 unique 인덱스
--     cart_items_user_analysis_unique  (WHERE analysis_id IS NOT NULL)
--     cart_items_user_layering_unique  (WHERE layering_session_id IS NOT NULL)
--   를 만들었는데, supabase-js 의 .upsert(..., { onConflict: 'col1,col2' }) 는
--   ON CONFLICT 추론 시 인덱스 술어(WHERE …)를 명시할 방법이 없어서
--   PostgreSQL 이 매칭 인덱스를 찾지 못하고 "42P10: there is no unique or
--   exclusion constraint matching the ON CONFLICT specification" 로 실패.
--   결과적으로 /api/cart 가 500 으로 떨어짐.
--
-- 해결:
--   부분 인덱스를 제거하고 일반 UNIQUE 제약을 추가.
--   PostgreSQL 의 일반 UNIQUE 는 NULL 을 distinct 로 보므로
--     · 케미 행: analysis_id=NULL → 단품 unique 제약과 충돌 없음
--     · 단품 행: layering_session_id=NULL → 케미 unique 제약과 충돌 없음
--   따라서 두 unique 제약을 동시에 둬도 의도한 정책 그대로 동작.
-- ============================================================

DROP INDEX IF EXISTS cart_items_user_analysis_unique;
DROP INDEX IF EXISTS cart_items_user_layering_unique;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_user_analysis_unique UNIQUE (user_id, analysis_id);

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_user_layering_unique UNIQUE (user_id, layering_session_id);
