'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProgressHeaderProps {
  progress: number;
  title?: string;
}

export function ProgressHeader({ progress, title = '피규어 디퓨저' }: ProgressHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-white border-b-2 border-black sticky top-0 z-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-2xl">🧴</span>
          <h1 className="font-bold text-lg">{title}</h1>
        </div>

        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      {/* 진행률 바 */}
      <div className="h-1 bg-gray-200">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* 진행률 텍스트 */}
      <div className="px-4 py-2 text-center">
        <span className="text-sm text-gray-500">
          진행률: <span className="font-bold text-black">{progress}%</span>
        </span>
      </div>
    </div>
  );
}
