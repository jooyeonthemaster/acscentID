'use client';

import { motion } from 'framer-motion';
import { MemorySceneCard } from './MemorySceneCard';
import { ScentStoryCard } from './ScentStoryCard';
import type { ImageAnalysisResult, MemoryScene, ScentStory } from '@/types/analysis';

interface MemoryTabProps {
  displayedAnalysis: ImageAnalysisResult;
  memoryImage?: string;
  isDesktop?: boolean;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export function MemoryTab({ displayedAnalysis, memoryImage, isDesktop }: MemoryTabProps) {
  // displayedAnalysis에서 figure 전용 필드 추출
  const memoryScene = (displayedAnalysis as any).memoryScene as MemoryScene | undefined;
  const scentStory = (displayedAnalysis as any).scentStory as ScentStory | undefined;

  // 데이터가 없을 경우 기본값 사용
  const defaultMemoryScene: MemoryScene = {
    sceneTitle: '소중한 기억',
    sceneSummary: '당신의 특별한 순간을 분석 중입니다...',
    emotions: ['행복', '설렘'],
    extractedScent: {
      primary: '분석 중',
      description: '기억에서 향기를 추출하고 있어요!'
    }
  };

  const defaultScentStory: ScentStory = {
    storyTitle: '향기로 담은 기억',
    storyNarrative: '당신의 소중한 기억을 향기로 담아내고 있습니다. 잠시만 기다려주세요...',
    memoryConnection: '기억과 향기의 연결을 분석 중입니다...'
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      className={`space-y-6 ${isDesktop ? 'lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0' : ''}`}
    >
      {/* 기억의 순간 카드 */}
      <motion.div variants={fadeInUp}>
        <MemorySceneCard
          memoryScene={memoryScene || defaultMemoryScene}
          memoryImage={memoryImage}
        />
      </motion.div>

      {/* 향기 스토리 카드 */}
      <motion.div variants={fadeInUp}>
        <ScentStoryCard
          scentStory={scentStory || defaultScentStory}
        />
      </motion.div>

      {/* 감정 분석 요약 */}
      {(displayedAnalysis as any).figureEmotionTraits && (
        <motion.div
          variants={fadeInUp}
          className={`col-span-full ${isDesktop ? '' : ''}`}
        >
          <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">💭</span>
              <h3 className="text-lg font-black text-slate-900">감정 분석</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries((displayedAnalysis as any).figureEmotionTraits || {}).map(([key, value]) => {
                const labels: Record<string, string> = {
                  nostalgia: '그리움',
                  warmth: '따뜻함',
                  excitement: '설렘',
                  comfort: '편안함',
                  passion: '열정',
                  tenderness: '다정함',
                  joy: '기쁨',
                  melancholy: '아련함',
                  serenity: '평온함',
                  intensity: '강렬함'
                };
                return (
                  <div key={key} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 font-bold mb-1">{labels[key] || key}</div>
                    <div className="text-lg font-black text-slate-900">{value as number}/10</div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-gradient-to-r from-pink-400 to-purple-400 h-1.5 rounded-full"
                        style={{ width: `${(value as number) * 10}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
