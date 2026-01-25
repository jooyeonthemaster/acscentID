-- ============================================
-- 리뷰 시스템 테이블
-- ============================================

-- 리뷰 테이블
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  program_type TEXT NOT NULL CHECK (program_type IN ('idol_image', 'personal', 'figure')),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  idol_name TEXT,
  option_info TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0
);

-- 리뷰 이미지 테이블
CREATE TABLE IF NOT EXISTS review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- 리뷰 좋아요 테이블
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  UNIQUE(user_id, review_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_reviews_program_type ON reviews(program_type);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);

-- RLS 정책
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- 리뷰: 모든 사용자가 읽기 가능, 본인만 작성/수정/삭제 가능
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- 리뷰 이미지: 모든 사용자가 읽기 가능
CREATE POLICY "Review images are viewable by everyone" ON review_images
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their review images" ON review_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM reviews WHERE reviews.id = review_images.review_id AND reviews.user_id = auth.uid()
    )
  );

-- 리뷰 좋아요: 모든 사용자가 읽기 가능, 본인만 토글 가능
CREATE POLICY "Review likes are viewable by everyone" ON review_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can toggle their own likes" ON review_likes
  FOR ALL USING (auth.uid() = user_id);

-- helpful_count 증감 함수
CREATE OR REPLACE FUNCTION increment_helpful_count(review_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_helpful_count(review_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Storage 버킷 생성 (Supabase Dashboard에서 실행)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true);

-- Storage 정책
-- CREATE POLICY "Review images are publicly accessible" ON storage.objects
--   FOR SELECT USING (bucket_id = 'review-images');

-- CREATE POLICY "Authenticated users can upload review images" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'review-images' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can delete their own review images" ON storage.objects
--   FOR DELETE USING (bucket_id = 'review-images' AND auth.uid()::text = (storage.foldername(name))[1]);
