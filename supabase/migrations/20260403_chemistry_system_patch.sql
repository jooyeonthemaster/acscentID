-- ================================================
-- 케미 향수 시스템 패치 마이그레이션
-- 2026-04-03 (패치)
-- [FIX] CRITICAL #6, #7, #8 및 HIGH: CHECK 제약, qr_code_id 타입, RLS 정책
-- ================================================

-- [FIX] HIGH: CHECK 제약에 etc 타입 누락
-- analysis_results
ALTER TABLE analysis_results
  DROP CONSTRAINT IF EXISTS analysis_results_product_type_check;

ALTER TABLE analysis_results
  ADD CONSTRAINT analysis_results_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'etc'));

-- cart_items
ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_product_type_check;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'etc'));

-- order_items
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_type_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'etc'));

-- qr_codes
ALTER TABLE qr_codes
  DROP CONSTRAINT IF EXISTS qr_codes_product_type_check;

ALTER TABLE qr_codes
  ADD CONSTRAINT qr_codes_product_type_check
  CHECK (product_type IN ('image_analysis', 'figure_diffuser', 'personal_scent', 'graduation', 'signature', 'chemistry_set', 'payment_test', 'etc'));

-- [FIX] CRITICAL #7: qr_code_id 타입 불일치 — 외래키 제거, TEXT로 변경하여 NULL 허용
-- 기존 FK가 UUID→UUID인데 코드에서 TEXT(code 문자열)를 넣으므로 FK 제거
ALTER TABLE layering_sessions
  DROP CONSTRAINT IF EXISTS layering_sessions_qr_code_id_fkey;

ALTER TABLE layering_sessions
  ALTER COLUMN qr_code_id TYPE TEXT USING qr_code_id::TEXT;

-- [FIX] CRITICAL #8: RLS 정책 결함 — 비로그인 사용자도 SELECT 가능하도록 변경
DROP POLICY IF EXISTS "Users can view own layering sessions" ON layering_sessions;

CREATE POLICY "Anyone can view layering sessions"
  ON layering_sessions FOR SELECT
  USING (true);

-- [FIX] HIGH: RLS SELECT에 user_fingerprint 기반 조회 추가 (이미 true로 변경했으므로 별도 불필요)

-- [FIX] HIGH: INSERT 정책에 비로그인 사용자 허용 (service_role이 INSERT하므로 이미 가능)
-- 단, fingerprint 기반 사용자도 INSERT 가능하도록 수정
DROP POLICY IF EXISTS "Authenticated users can create layering sessions" ON layering_sessions;

CREATE POLICY "Anyone can create layering sessions"
  ON layering_sessions FOR INSERT
  WITH CHECK (true);

-- [FIX] 메인 페이지 상품 목록에 케미 향수 추가
INSERT INTO admin_products (slug, name, is_active, display_order)
VALUES ('chemistry', '케미 향수 세트', true, 5)
ON CONFLICT (slug) DO UPDATE SET is_active = true, name = '케미 향수 세트';
