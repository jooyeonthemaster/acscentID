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
      className="bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]"
    >
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">✨</span>
        <h3 className="text-lg font-black text-[var(--ink)]">향기 스토리</h3>
      </div>

      {/* 스토리 제목 */}
      <div className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)] mb-4">
        <h4 className="text-xl font-black text-[var(--muted-ink)] mb-3 text-center">
          &ldquo;{scentStory.storyTitle}&rdquo;
        </h4>
        <div className="w-16 h-1 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] rounded-full mx-auto" />
      </div>

      {/* 스토리 본문 */}
      <div className="bg-[var(--soft)]/60 rounded-[6px] p-4 border border-[var(--line)]">
        <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed whitespace-pre-wrap">
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
