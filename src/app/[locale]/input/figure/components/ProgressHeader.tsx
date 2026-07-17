'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProgressHeaderProps {
  progress: number;
  title?: string;
}

export function ProgressHeader({ progress, title }: ProgressHeaderProps) {
  const t = useTranslations('figureChat');
  const router = useRouter();
  const resolvedTitle = title || t('title');

  return (
    <div className="bg-[#12141D] border-b-2 border-[#262A38] sticky top-0 z-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1B1F2C] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-2xl">🧴</span>
          <h1 className="font-bold text-lg">{resolvedTitle}</h1>
        </div>

        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      {/* 진행률 바 */}
      <div className="h-1 bg-[#232838]">
        <motion.div
          className="h-full bg-gradient-to-r from-[#161925] via-[#161925] to-[#161925]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* 진행률 텍스트 */}
      <div className="px-4 py-2 text-center">
        <span className="text-sm lg:text-base text-[#8B8578]">
          {t('progress')} <span className="font-bold text-[#E9E2D0]">{progress}%</span>
        </span>
      </div>
    </div>
  );
}
