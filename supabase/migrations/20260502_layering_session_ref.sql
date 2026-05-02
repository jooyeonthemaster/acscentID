-- ============================================================
-- 케미(레이어링 퍼퓸) 카트/주문 참조 정합성 수정
-- 2026-05-02
-- ============================================================
-- 문제:
--   cart_items.analysis_id, order_items.analysis_id, orders.analysis_id 가
--   analysis_results(id) 만 참조하는데, 케미 결과 페이지가 layering_sessions(id)
--   를 그 자리에 넣어 FK 위반(23503) → 500 발생.
--
-- 해결:
--   세 테이블에 layering_session_id 컬럼을 별도로 추가하고,
--   chemistry_set 행은 layering_session_id 만 채우고 analysis_id 는 NULL 로 둔다.
--
-- 데이터 영향:
--   - 라이브에 chemistry_set 행은 0건(검증됨) → 기존 데이터 무결성 위반 없음.
--   - 컬럼 추가는 비파괴적, 기존 단품 흐름 그대로 동작.
-- ============================================================

-- 1) cart_items: layering_session_id 추가 (케미 세션 참조)
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS layering_session_id UUID
  REFERENCES layering_sessions(id) ON DELETE CASCADE;

-- 2) order_items: layering_session_id 추가 (역사 보존: SET NULL)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS layering_session_id UUID
  REFERENCES layering_sessions(id) ON DELETE SET NULL;

-- 3) orders: layering_session_id 추가 (단일 결제 호환 + 다중 결제 첫 상품)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS layering_session_id UUID
  REFERENCES layering_sessions(id) ON DELETE SET NULL;

-- 4) cart_items 기존 UNIQUE(user_id, analysis_id) 제거 → 부분 인덱스로 대체
--    이유: chemistry_set 행은 analysis_id 가 NULL 이라 분리된 unique 정책이 필요.
ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_user_id_analysis_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_analysis_unique
  ON cart_items(user_id, analysis_id)
  WHERE analysis_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_layering_unique
  ON cart_items(user_id, layering_session_id)
  WHERE layering_session_id IS NOT NULL;

-- 5) 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_cart_items_layering_session_id
  ON cart_items(layering_session_id) WHERE layering_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_layering_session_id
  ON order_items(layering_session_id) WHERE layering_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_layering_session_id
  ON orders(layering_session_id) WHERE layering_session_id IS NOT NULL;

-- 6) 무결성 CHECK
--    cart_items / order_items: chemistry_set 이면 layering_session_id 필수,
--    그 외는 analysis_id 필수. (양쪽 모두 가지는 것은 허용 - 향후 확장)
ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_product_ref_check;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_product_ref_check CHECK (
    (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
    OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
  );

--   order_items 도 historical 행에 analysis_id NULL 이 1건 존재 → NOT VALID
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_ref_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_ref_check CHECK (
    (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
    OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
  ) NOT VALID;

--   orders 는 historical 데이터에 product_type/analysis_id NULL 이 섞여 있을 수
--   있으므로 NOT VALID 로 추가하여 신규 INSERT 만 강제. 기존 행은 검증 스킵.
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_product_ref_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_product_ref_check CHECK (
    product_type IS NULL
    OR (product_type = 'chemistry_set' AND layering_session_id IS NOT NULL)
    OR (product_type <> 'chemistry_set' AND analysis_id IS NOT NULL)
  ) NOT VALID;

-- 7) 코멘트
COMMENT ON COLUMN cart_items.layering_session_id IS
  '케미(chemistry_set) 행은 layering_sessions.id 를 여기 저장. 단품은 NULL.';
COMMENT ON COLUMN order_items.layering_session_id IS
  '케미 주문 항목용 layering_sessions.id. 단품은 NULL.';
COMMENT ON COLUMN orders.layering_session_id IS
  '단일/다중 케미 주문 호환용 layering_sessions.id. 단품은 NULL.';
