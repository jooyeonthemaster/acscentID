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
      className="mx-4 mb-4 p-4 bg-gradient-to-br from-[#0C0E16] to-[#0C0E16] border-2 border-[#262A38] rounded-[12px]"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-[#161925] rounded-full flex items-center justify-center border-2 border-[#262A38]">
          <AlertTriangle className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-[#E9E2D0] mb-2">
            {t('notice.title')}
          </h3>

          <ul className="space-y-2 text-sm lg:text-base text-[#E9E2D0]">
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

          <div className="mt-3 text-xs lg:text-sm text-[#A69F8D]">
            💡 {t('notice.simplePoseTip')}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
