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
      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]"
    >
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">✨</span>
        <h3 className="text-lg font-black text-slate-900">향기 스토리</h3>
      </div>

      {/* 스토리 제목 */}
      <div className="bg-white rounded-xl p-4 border-2 border-purple-200 mb-4">
        <h4 className="text-xl font-black text-purple-700 mb-3 text-center">
          &ldquo;{scentStory.storyTitle}&rdquo;
        </h4>
        <div className="w-16 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto" />
      </div>

      {/* 스토리 본문 */}
      <div className="bg-white/60 rounded-xl p-4 border border-purple-100">
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
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
