-- ============================================
-- 목업 리뷰 데이터
-- Supabase SQL Editor에서 실행
-- ============================================

-- 먼저 테스트용 유저가 없다면 user_profiles에 임시 유저 생성 필요
-- (실제 환경에서는 이미 존재하는 user_id 사용)

-- 리뷰 데이터 삽입
INSERT INTO reviews (id, user_id, program_type, rating, content, idol_name, option_info, is_verified, helpful_count, created_at)
VALUES
  -- 5점 리뷰들
  ('11111111-1111-1111-1111-111111111111', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 5,
   '진짜 뷔 느낌 그대로예요... 달달하면서 시크한 향이 너무 좋아요 ㅠㅠ 매일 뿌리고 다녀요!',
   '방탄소년단 뷔', '10ml 롤온', true, 47, NOW() - INTERVAL '2 days'),

  ('22222222-2222-2222-2222-222222222222', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 5,
   '언니 분위기 그대로! 시원하면서 세련된 향 완전 최애각. 친구들한테도 추천했어요',
   'aespa 카리나', '10ml 롤온', true, 35, NOW() - INTERVAL '5 days'),

  ('33333333-3333-3333-3333-333333333333', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 5,
   '이 향 뿌리면 현진이 옆에 있는 느낌ㅋㅋㅋ 달콤하면서 세련된 향이에요. 강추합니다!',
   '스트레이키즈 현진', '50ml', true, 28, NOW() - INTERVAL '7 days'),

  ('44444444-4444-4444-4444-444444444444', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 5,
   '선물로 받았는데 너무 좋아요!! 은은하게 퍼지는 향이 진짜 최애 느낌 그 자체',
   '뉴진스 하니', '10ml 롤온', true, 22, NOW() - INTERVAL '10 days'),

  ('55555555-5555-5555-5555-555555555555', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 5,
   '분석 결과도 신기하고 향수도 너무 만족스러워요. 레시피 카드도 예쁘게 왔어요!',
   'SEVENTEEN 민규', '10ml 롤온', true, 19, NOW() - INTERVAL '12 days'),

  -- 4점 리뷰들
  ('66666666-6666-6666-6666-666666666666', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 4,
   '향은 정말 좋은데 지속력이 조금 아쉬워요. 그래도 재구매 의사 있습니다!',
   'LE SSERAFIM 채원', '10ml 롤온', true, 15, NOW() - INTERVAL '14 days'),

  ('77777777-7777-7777-7777-777777777777', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 4,
   'AI 분석이 생각보다 정확해서 놀랐어요. 향도 이미지랑 잘 맞는 것 같아요',
   '아이브 장원영', '50ml', true, 12, NOW() - INTERVAL '16 days'),

  ('88888888-8888-8888-8888-888888888888', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 4,
   '친구 생일 선물로 줬는데 너무 좋아하더라구요! 패키지도 예쁘고 센스있는 선물이에요',
   'NCT 재현', '10ml 롤온', true, 11, NOW() - INTERVAL '18 days'),

  -- 3점 리뷰
  ('99999999-9999-9999-9999-999999999999', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 3,
   '향은 괜찮은데 제가 기대했던 느낌이랑은 조금 달랐어요. 그래도 독특한 경험이었습니다',
   'BLACKPINK 제니', '10ml 롤온', true, 5, NOW() - INTERVAL '20 days'),

  -- 5점 추가
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 5,
   '덕질하면서 이런 서비스는 처음이에요! 최애 사진 올리니까 진짜 그 분위기 나는 향수가 와서 감동받았어요 ㅠㅠ',
   'ITZY 류진', '10ml 롤온', true, 31, NOW() - INTERVAL '3 days'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 5,
   '50ml로 샀는데 진짜 잘한 선택! 매일 쓰는데도 오래가고 향도 너무 좋아요',
   '투모로우바이투게더 수빈', '50ml', true, 25, NOW() - INTERVAL '8 days'),

  ('cccccccc-cccc-cccc-cccc-cccccccccccc', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 5,
   '배송도 빠르고 포장도 예뻐요! 분석 보고서 카드가 진짜 소장각이에요',
   'EXO 백현', '10ml 롤온', true, 18, NOW() - INTERVAL '15 days'),

  ('dddddddd-dddd-dddd-dddd-dddddddddddd', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 4,
   '향이 독특하고 좋아요. 주변에서 무슨 향수냐고 많이 물어봐요!',
   '트와이스 사나', '10ml 롤온', true, 14, NOW() - INTERVAL '22 days'),

  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', (SELECT id FROM user_profiles LIMIT 1), 'idol_image', 5,
   '두 번째 구매예요! 이번엔 다른 최애로 했는데 또 대만족. 덕질 필수템입니다',
   'ENHYPEN 성훈', '10ml 롤온', true, 20, NOW() - INTERVAL '1 day')

ON CONFLICT (id) DO UPDATE SET
  rating = EXCLUDED.rating,
  content = EXCLUDED.content,
  idol_name = EXCLUDED.idol_name,
  helpful_count = EXCLUDED.helpful_count;

-- 결과 확인
SELECT
  program_type,
  COUNT(*) as total_reviews,
  ROUND(AVG(rating), 1) as avg_rating,
  SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
  SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
  SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star
FROM reviews
GROUP BY program_type;
