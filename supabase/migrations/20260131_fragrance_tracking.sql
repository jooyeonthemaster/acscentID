-- ============================================
-- 향료 데이터 종합 관리 시스템 마이그레이션
-- 2026-01-31
-- ============================================

-- 1. perfume_feedbacks 테이블에 자연어 피드백 컬럼 추가
ALTER TABLE perfume_feedbacks
ADD COLUMN IF NOT EXISTS natural_language_feedback TEXT;

-- 2. 레시피 선택 타입 컬럼 추가 (user_direct, ai_recommended, original)
ALTER TABLE perfume_feedbacks
ADD COLUMN IF NOT EXISTS selected_recipe_type VARCHAR(20);

-- 3. 성능 최적화 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_feedbacks_result_id
ON perfume_feedbacks(result_id);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at
ON perfume_feedbacks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedbacks_recipe_type
ON perfume_feedbacks(selected_recipe_type);

CREATE INDEX IF NOT EXISTS idx_feedbacks_perfume_id
ON perfume_feedbacks(perfume_id);

-- 4. analysis_results 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_analysis_product_type
ON analysis_results(product_type);

CREATE INDEX IF NOT EXISTS idx_analysis_service_mode
ON analysis_results(service_mode);

CREATE INDEX IF NOT EXISTS idx_analysis_created_at
ON analysis_results(created_at DESC);

-- 5. order_items 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_order_items_analysis_id
ON order_items(analysis_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_type
ON order_items(product_type);

-- 6. 코멘트 추가
COMMENT ON COLUMN perfume_feedbacks.natural_language_feedback IS '사용자가 입력한 자연어 피드백 (예: 더 상큼하게, 가을 분위기)';
COMMENT ON COLUMN perfume_feedbacks.selected_recipe_type IS '선택된 레시피 타입: user_direct(직접선택), ai_recommended(AI추천), original(원본유지)';
