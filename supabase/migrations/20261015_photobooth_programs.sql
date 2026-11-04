-- 포토부스 프로그램 14종(런웨이·한복·웨딩·뮤직비디오·추억 무비 등, src/lib/booth/programs/catalog.ts)
--
-- ⚠️ CLI 미사용 환경 — Supabase SQL Editor에서 직접 실행 필요. 두 번 실행해도 괜찮다.
--
-- 1) 영상 결과(뮤직비디오·추억 무비)를 폰으로 받게 7일 보관하는 비공개 버킷.
--    부스가 서버에서 받은 한 번 쓰는 주소로 바로 올리고(Vercel 4.5MB 제한을 거치지 않게),
--    폰은 /api/photobooth/media/[token] 이 주는 잠깐 쓰는 서명 주소로 받는다(src/lib/photobooth/result-media.ts).
--    실행 전에는 영상 저장에서 "영상 보관 저장소가 아직 준비되지 않았어요"가 뜬다.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photobooth-media', 'photobooth-media', false, 41943040, ARRAY['video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = 41943040, allowed_mime_types = ARRAY['video/mp4', 'video/webm'];

-- 2) 촬영 통계에 프로그램 촬영을 남긴다 — mode 'program' + frame_title = 프로그램 id.
--    실행 전에는 프로그램 촬영 기록만 빠진다(손님 흐름은 그대로).
ALTER TABLE photobooth_shots DROP CONSTRAINT IF EXISTS photobooth_shots_mode_check;
ALTER TABLE photobooth_shots
  ADD CONSTRAINT photobooth_shots_mode_check CHECK (mode IN ('solo', 'together', 'template', 'card', 'program'));
