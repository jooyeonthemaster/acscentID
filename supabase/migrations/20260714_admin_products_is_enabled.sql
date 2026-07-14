-- 프로그램 "활성/비활성"(사용 가능 여부)을 "메인 노출/미노출"(is_active)과 분리한다.
-- is_enabled = false 면 프로그램 자체가 꺼진 상태로, 상세 페이지/체크아웃/QR 진입이 모두 막힌다.
-- is_active   = 메인 페이지·푸터·네비게이션 노출 여부. 실제 메인 노출은 (is_enabled AND is_active).
-- 이렇게 하면 메인에 노출되지 않아도(is_active=false) 프로그램은 활성 상태(is_enabled=true)로 유지할 수 있다.
ALTER TABLE admin_products ADD COLUMN IF NOT EXISTS is_enabled boolean;

-- 기존 동작 보존: 마이그레이션 시점에는 기존 is_active 값을 그대로 활성 여부로 승계한다.
UPDATE admin_products SET is_enabled = COALESCE(is_active, true) WHERE is_enabled IS NULL;

ALTER TABLE admin_products ALTER COLUMN is_enabled SET DEFAULT true;
ALTER TABLE admin_products ALTER COLUMN is_enabled SET NOT NULL;
