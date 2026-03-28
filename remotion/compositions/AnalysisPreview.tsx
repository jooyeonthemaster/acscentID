import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Sequence,
} from 'remotion';

export interface AnalysisPreviewProps {
  colors?: string[];
  keywords?: string[];
  moodScore?: number;
  perfumeName?: string;
  topNotes?: string;
  middleNotes?: string;
  baseNotes?: string;
}

const defaultColors = ['#C084FC', '#F9A8D4', '#1E293B'];
const defaultKeywords = ['시크', '달콤', '카리스마'];

export const AnalysisPreview: React.FC<AnalysisPreviewProps> = ({
  colors = defaultColors,
  keywords = defaultKeywords,
  moodScore = 87,
  perfumeName = "AC'SCENT 27\n스모키 블랜드 우드",
  topNotes = '베르가못, 블랙커런트',
  middleNotes = '다마스크 로즈, 피오니',
  baseNotes = '머스크, 샌달우드',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* 배경 데코레이션 */}
      <BackgroundDeco frame={frame} />

      {/* 시퀀스 1: 분석 중 (0-30프레임) */}
      <Sequence from={0} durationInFrames={30}>
        <AnalyzingPhase frame={frame} />
      </Sequence>

      {/* 시퀀스 2: 컬러 분석 결과 (30-60프레임) */}
      <Sequence from={30} durationInFrames={40}>
        <ColorAnalysis colors={colors} frame={frame - 30} fps={fps} />
      </Sequence>

      {/* 시퀀스 3: 키워드 & 점수 (60-100프레임) */}
      <Sequence from={60} durationInFrames={50}>
        <KeywordsAndScore
          keywords={keywords}
          moodScore={moodScore}
          frame={frame - 60}
          fps={fps}
        />
      </Sequence>

      {/* 시퀀스 4: 향수 레시피 (100-150프레임) */}
      <Sequence from={100} durationInFrames={50}>
        <PerfumeRecipe
          topNotes={topNotes}
          middleNotes={middleNotes}
          baseNotes={baseNotes}
          frame={frame - 100}
          fps={fps}
        />
      </Sequence>

      {/* 시퀀스 5: 최종 향수 이름 (150-180프레임) */}
      <Sequence from={150} durationInFrames={30}>
        <FinalReveal perfumeName={perfumeName} frame={frame - 150} fps={fps} />
      </Sequence>
    </AbsoluteFill>
  );
};

// 배경 데코레이션
const BackgroundDeco: React.FC<{ frame: number }> = ({ frame }) => {
  const rotation = interpolate(frame, [0, 180], [0, 360]);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
          opacity: 0.2,
          transform: `rotate(${rotation}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
          opacity: 0.15,
          transform: `rotate(-${rotation}deg)`,
        }}
      />
    </>
  );
};

// 분석 중 화면
const AnalyzingPhase: React.FC<{ frame: number }> = ({ frame }) => {
  const dots = Math.floor(frame / 10) % 4;
  const scale = interpolate(frame, [0, 15], [0.8, 1], {
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [20, 30], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '24px 40px',
          borderRadius: 20,
          border: '3px solid #1E293B',
          boxShadow: '6px 6px 0px #1E293B',
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: '#1E293B',
          }}
        >
          AI 분석 중{'.'.repeat(dots)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 컬러 분석
const ColorAnalysis: React.FC<{
  colors: string[];
  frame: number;
  fps: number;
}> = ({ colors, frame, fps }) => {
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        padding: 30,
        opacity: fadeIn,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          background: '#C084FC',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 20,
          border: '2px solid #1E293B',
          boxShadow: '3px 3px 0px #1E293B',
          display: 'inline-flex',
          fontSize: 12,
          fontWeight: 900,
          marginBottom: 20,
        }}
      >
        이미지 분석 결과
      </div>

      {/* 컬러 카드 */}
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          border: '3px solid #1E293B',
          boxShadow: '6px 6px 0px #1E293B',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#64748B' }}>
          주요 컬러
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {colors.map((color, i) => {
            const colorSpring = spring({
              frame: frame - i * 5,
              fps,
              config: { damping: 15 },
            });
            return (
              <div
                key={i}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: color,
                  border: '3px solid #1E293B',
                  boxShadow: '3px 3px 0px #1E293B',
                  transform: `scale(${colorSpring})`,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 키워드 & 점수
const KeywordsAndScore: React.FC<{
  keywords: string[];
  moodScore: number;
  frame: number;
  fps: number;
}> = ({ keywords, moodScore, frame, fps }) => {
  const animatedScore = interpolate(frame, [0, 30], [0, moodScore], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ padding: 30, paddingTop: 140 }}>
      {/* 키워드 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#64748B' }}>
          분위기 키워드
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {keywords.map((keyword, i) => {
            const keywordSpring = spring({
              frame: frame - i * 8,
              fps,
              config: { damping: 12 },
            });
            return (
              <span
                key={i}
                style={{
                  padding: '8px 16px',
                  background: '#F3E8FF',
                  color: '#7C3AED',
                  borderRadius: 20,
                  border: '2px solid #7C3AED',
                  fontSize: 14,
                  fontWeight: 700,
                  transform: `scale(${keywordSpring})`,
                  display: 'inline-block',
                }}
              >
                {keyword}
              </span>
            );
          })}
        </div>
      </div>

      {/* 점수 */}
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          border: '3px solid #1E293B',
          boxShadow: '6px 6px 0px #1E293B',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>감정 분석</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#1E293B' }}>
            신비로움 {Math.round(animatedScore)}%
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 향수 레시피
const PerfumeRecipe: React.FC<{
  topNotes: string;
  middleNotes: string;
  baseNotes: string;
  frame: number;
  fps: number;
}> = ({ topNotes, middleNotes, baseNotes, frame, fps }) => {
  const notes = [
    { label: '탑노트', value: topNotes, percent: '25%', color: '#FBBF24' },
    { label: '미들노트', value: middleNotes, percent: '45%', color: '#F97316' },
    { label: '베이스노트', value: baseNotes, percent: '30%', color: '#EC4899' },
  ];

  return (
    <AbsoluteFill style={{ padding: 30, justifyContent: 'center' }}>
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          border: '3px solid #1E293B',
          boxShadow: '6px 6px 0px #1E293B',
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 20 }}>✨</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>
            추천 향수 레시피
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map((note, i) => {
            const noteSpring = spring({
              frame: frame - i * 10,
              fps,
              config: { damping: 15 },
            });
            const width = interpolate(frame - i * 10, [0, 20], [0, 100], {
              extrapolateRight: 'clamp',
            });

            return (
              <div
                key={i}
                style={{
                  background: '#FEF9C3',
                  borderRadius: 16,
                  padding: 16,
                  transform: `translateX(${(1 - noteSpring) * 50}px)`,
                  opacity: noteSpring,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>
                      {note.label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
                      {note.value}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: note.color,
                    }}
                  >
                    {note.percent}
                  </div>
                </div>
                {/* 프로그레스 바 */}
                <div
                  style={{
                    marginTop: 8,
                    height: 6,
                    background: '#E5E7EB',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${width}%`,
                      height: '100%',
                      background: note.color,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 최종 공개
const FinalReveal: React.FC<{
  perfumeName: string;
  frame: number;
  fps: number;
}> = ({ perfumeName, frame, fps }) => {
  const scale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const sparkleOpacity = interpolate(frame, [10, 15, 20, 25], [0, 1, 1, 0.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        {/* AI 추천 배지 */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#FBBF24',
            color: '#1E293B',
            padding: '8px 16px',
            borderRadius: 20,
            border: '2px solid #1E293B',
            boxShadow: '3px 3px 0px #1E293B',
            fontSize: 14,
            fontWeight: 900,
            marginBottom: 20,
            opacity: sparkleOpacity,
          }}
        >
          AI 추천 ✨
        </div>

        {/* 향수 이름 */}
        <div
          style={{
            background: 'white',
            padding: '32px 48px',
            borderRadius: 24,
            border: '4px solid #1E293B',
            boxShadow: '8px 8px 0px #1E293B',
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: '#1E293B',
              marginBottom: 8,
              whiteSpace: 'pre-line',
              textAlign: 'center',
            }}
          >
            &quot;{perfumeName}&quot;
          </div>
          <div style={{ fontSize: 14, color: '#64748B' }}>
            신비롭고 매혹적인 향기
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
