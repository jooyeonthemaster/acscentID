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
      className="bg-gradient-to-br from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-5 border-2 border-[#D8CFBB]"
    >
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📸</span>
        <h3 className="text-lg font-black text-[#1A1610]">기억의 순간</h3>
      </div>

      {/* 기억 장면 이미지 */}
      {memoryImage && (
        <div className="relative w-full aspect-video rounded-[12px] overflow-hidden border-2 border-[#D8CFBB] mb-4">
          <Image
            src={memoryImage}
            alt="기억의 순간"
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* 장면 제목 */}
      <div className="bg-[#F5EFE2] rounded-[12px] p-4 border-2 border-[#D8CFBB] mb-4">
        <h4 className="text-xl font-black text-[#1A1610] mb-2">
          &ldquo;{memoryScene.sceneTitle}&rdquo;
        </h4>
        <p className="text-[#5C564A] text-sm lg:text-base leading-relaxed">
          {memoryScene.sceneSummary}
        </p>
      </div>

      {/* 감정 태그 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {memoryScene.emotions.map((emotion, idx) => (
          <span
            key={idx}
            className="px-3 py-1.5 bg-[#D8CFBB] text-[#1A1610] rounded-full text-sm lg:text-base font-bold border border-[#D8CFBB]"
          >
            {emotion}
          </span>
        ))}
      </div>

      {/* 추출된 향기 */}
      <div className="bg-gradient-to-r from-[#EDE5D2] to-[#EDE5D2] rounded-[12px] p-4 border-2 border-[#D8CFBB]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🌸</span>
          <span className="font-black text-[#1A1610]">추출된 향기</span>
        </div>
        <h5 className="text-lg font-black text-[#5C564A] mb-1">
          {memoryScene.extractedScent.primary}
        </h5>
        <p className="text-sm lg:text-base text-[#5C564A]">
          {memoryScene.extractedScent.description}
        </p>
      </div>
    </motion.div>
  );
}
