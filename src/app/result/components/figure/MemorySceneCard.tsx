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
      className="bg-gradient-to-br from-pink-50 to-yellow-50 rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]"
    >
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📸</span>
        <h3 className="text-lg font-black text-slate-900">기억의 순간</h3>
      </div>

      {/* 기억 장면 이미지 */}
      {memoryImage && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-200 mb-4">
          <Image
            src={memoryImage}
            alt="기억의 순간"
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* 장면 제목 */}
      <div className="bg-white rounded-xl p-4 border-2 border-slate-200 mb-4">
        <h4 className="text-xl font-black text-slate-900 mb-2">
          &ldquo;{memoryScene.sceneTitle}&rdquo;
        </h4>
        <p className="text-slate-600 text-sm leading-relaxed">
          {memoryScene.sceneSummary}
        </p>
      </div>

      {/* 감정 태그 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {memoryScene.emotions.map((emotion, idx) => (
          <span
            key={idx}
            className="px-3 py-1.5 bg-pink-200 text-pink-800 rounded-full text-sm font-bold border border-pink-300"
          >
            {emotion}
          </span>
        ))}
      </div>

      {/* 추출된 향기 */}
      <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-4 border-2 border-yellow-300">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🌸</span>
          <span className="font-black text-slate-900">추출된 향기</span>
        </div>
        <h5 className="text-lg font-black text-orange-700 mb-1">
          {memoryScene.extractedScent.primary}
        </h5>
        <p className="text-sm text-slate-600">
          {memoryScene.extractedScent.description}
        </p>
      </div>
    </motion.div>
  );
}
