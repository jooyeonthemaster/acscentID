'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { MemoryScene } from '@/types/analysis';

interface MemorySceneCardProps {
  memoryScene: MemoryScene;
  memoryImage?: string;
}

export function MemorySceneCard({ memoryScene, memoryImage }: MemorySceneCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]"
    >
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📸</span>
        <h3 className="text-lg font-black text-[var(--ink)]">기억의 순간</h3>
      </div>

      {/* 기억 장면 이미지 */}
      {memoryImage && (
        <div className="relative w-full aspect-video rounded-[6px] overflow-hidden border border-[var(--line)] mb-4">
          <Image
            src={memoryImage}
            alt="기억의 순간"
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* 장면 제목 */}
      <div className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)] mb-4">
        <h4 className="text-xl font-black text-[var(--ink)] mb-2">
          &ldquo;{memoryScene.sceneTitle}&rdquo;
        </h4>
        <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed">
          {memoryScene.sceneSummary}
        </p>
      </div>

      {/* 감정 태그 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {memoryScene.emotions.map((emotion, idx) => (
          <span
            key={idx}
            className="px-3 py-1.5 bg-[var(--line)] text-[var(--ink)] rounded-full text-sm lg:text-base font-bold border border-[var(--line)]"
          >
            {emotion}
          </span>
        ))}
      </div>

      {/* 추출된 향기 */}
      <div className="bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🌸</span>
          <span className="font-black text-[var(--ink)]">추출된 향기</span>
        </div>
        <h5 className="text-lg font-black text-[var(--muted-ink)] mb-1">
          {memoryScene.extractedScent.primary}
        </h5>
        <p className="text-sm lg:text-base text-[var(--muted-ink)]">
          {memoryScene.extractedScent.description}
        </p>
      </div>
    </motion.div>
  );
}
