-- 메인 페이지 프로그램 카드의 뱃지(예: "SEASON 3", "14% OFF")를 관리자에서 직접 편집 가능하게 한다.
-- badge_text 가 설정되면 자동 계산("X% OFF") 및 코드 기본 뱃지를 덮어쓴다.
-- badge_color 는 #RRGGBB 형식의 헥스 색상이며, 비어 있으면 카드별 기본 색상을 사용한다.
ALTER TABLE admin_products ADD COLUMN IF NOT EXISTS badge_text text;
ALTER TABLE admin_products ADD COLUMN IF NOT EXISTS badge_color text;
