'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Palette, Printer } from 'lucide-react';

export function FigureImageNotice() {
  const t = useTranslations('figureChat');
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 p-4 bg-gradient-to-br from-[var(--canvas)] to-[var(--canvas)] border border-[var(--line)] rounded-[6px]"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-[var(--soft)] rounded-full flex items-center justify-center border border-[var(--line)]">
          <AlertTriangle className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-[var(--ink)] mb-2">
            {t('notice.title')}
          </h3>

          <ul className="space-y-2 text-sm lg:text-base text-[var(--ink)]">
            <li className="flex items-start gap-2">
              <Palette className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {t('notice.monoColor')}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Printer className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {t('notice.complexDetail')}
              </span>
            </li>
          </ul>

          <div className="mt-3 text-xs lg:text-sm text-[var(--muted-ink)]">
            💡 {t('notice.simplePoseTip')}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
