'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Palette, Printer } from 'lucide-react';

export function FigureImageNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center border-2 border-black">
          <AlertTriangle className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-amber-900 mb-2">
            피규어 제작 안내사항
          </h3>

          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-start gap-2">
              <Palette className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>단색 피규어</strong>로 출력됩니다.
                직접 색칠하는 DIY 키트로 제공돼요!
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Printer className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                3D 프린팅 특성상 <strong>복잡한 디테일</strong>은
                구현이 어려울 수 있어요.
              </span>
            </li>
          </ul>

          <div className="mt-3 text-xs text-amber-600">
            💡 심플한 포즈와 명확한 실루엣의 이미지가 좋아요!
          </div>
        </div>
      </div>
    </motion.div>
  );
}
