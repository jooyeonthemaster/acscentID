-- AC'SCENT IDENTITY 분석 결과 저장 테이블
-- Supabase SQL Editor에서 실행하세요

-- 테이블 생성
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 사용자 이미지 (base64 또는 URL)
  user_image_url TEXT,

  -- 분석 결과 전체 JSON
  analysis_data JSONB NOT NULL,

  -- 주요 정보 (빠른 조회용)
  twitter_name TEXT NOT NULL,
  perfume_name TEXT NOT NULL,
  perfume_brand TEXT NOT NULL,

  -- 메타 정보
  matching_keywords TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at
ON analysis_results(created_at DESC);

-- RLS (Row Level Security) 정책
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (공유 링크용)
CREATE POLICY "Anyone can read analysis results"
ON analysis_results FOR SELECT
USING (true);

-- 누구나 생성 가능 (익명 사용자도 저장 가능)
CREATE POLICY "Anyone can insert analysis results"
ON analysis_results FOR INSERT
WITH CHECK (true);

-- 조회수 업데이트 허용
CREATE POLICY "Anyone can update view count"
ON analysis_results FOR UPDATE
USING (true)
WITH CHECK (true);
