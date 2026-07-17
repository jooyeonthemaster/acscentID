'use client';

import { motion } from 'framer-motion';
import type { ScentStory } from '@/types/analysis';

interface ScentStoryCardProps {
  scentStory: ScentStory;
}

export function ScentStoryCard({ scentStory }: ScentStoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gradient-to-br from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-5 border-2 border-[#D8CFBB]"
    >
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">✨</span>
        <h3 className="text-lg font-black text-[#1A1610]">향기 스토리</h3>
      </div>

      {/* 스토리 제목 */}
      <div className="bg-[#F5EFE2] rounded-[12px] p-4 border-2 border-[#D8CFBB] mb-4">
        <h4 className="text-xl font-black text-[#5C564A] mb-3 text-center">
          &ldquo;{scentStory.storyTitle}&rdquo;
        </h4>
        <div className="w-16 h-1 bg-gradient-to-r from-[#EFE4C8] to-[#EFE4C8] rounded-full mx-auto" />
      </div>

      {/* 스토리 본문 */}
      <div className="bg-[#F5EFE2]/60 rounded-[12px] p-4 border border-[#EDE5D2]">
        <p className="text-[#5C564A] text-sm lg:text-base leading-relaxed whitespace-pre-wrap">
          {scentStory.storyNarrative}
        </p>
      </div>

      {/* 장식 요소 */}
      <div className="flex justify-center gap-2 mt-4">
        <span className="text-2xl opacity-60">🌸</span>
        <span className="text-2xl opacity-80">💕</span>
        <span className="text-2xl opacity-60">✨</span>
      </div>
    </motion.div>
  );
}
