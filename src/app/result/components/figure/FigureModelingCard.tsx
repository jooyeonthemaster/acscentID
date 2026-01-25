'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { FigureModeling } from '@/types/analysis';

interface FigureModelingCardProps {
  figureModeling: FigureModeling;
  figureImage?: string;
}

export function FigureModelingCard({ figureModeling, figureImage }: FigureModelingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]"
    >
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎨</span>
        <h3 className="text-lg font-black text-slate-900">피규어 제작 정보</h3>
      </div>

      {/* 피규어 이미지 */}
      {figureImage && (
        <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-cyan-200 mb-4 bg-white">
          <Image
            src={figureImage}
            alt="피규어 참고 이미지"
            fill
            className="object-contain"
          />
        </div>
      )}

      {/* 캐릭터 정보 */}
      <div className="bg-white rounded-xl p-4 border-2 border-cyan-200 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-slate-500 font-bold">캐릭터</span>
            <p className="text-sm font-black text-slate-900">{figureModeling.characterName}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold">디퓨저 향</span>
            <p className="text-sm font-black text-cyan-700">{figureModeling.diffuserScent || '분석 중'}</p>
          </div>
        </div>
      </div>

      {/* 포즈 설명 */}
      {figureModeling.poseDescription && (
        <div className="bg-white/60 rounded-xl p-3 border border-cyan-100 mb-4">
          <span className="text-xs text-slate-500 font-bold block mb-1">포즈 설명</span>
          <p className="text-sm text-slate-700">{figureModeling.poseDescription}</p>
        </div>
      )}

      {/* 요청사항 */}
      {figureModeling.specialRequests && figureModeling.specialRequests.length > 0 && (
        <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200 mb-4">
          <span className="text-xs text-yellow-700 font-bold block mb-2">특별 요청사항</span>
          <ul className="space-y-1">
            {figureModeling.specialRequests.map((request, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-yellow-500">•</span>
                <span>{request}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 색상 팔레트 */}
      {figureModeling.colorPalette && figureModeling.colorPalette.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold">추천 색상</span>
          <div className="flex gap-1">
            {figureModeling.colorPalette.map((color, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-lg border-2 border-slate-200"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* DIY 안내 */}
      <div className="mt-4 p-3 bg-slate-100 rounded-xl border border-slate-200">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div>
            <span className="text-xs font-bold text-slate-700 block">DIY 키트 안내</span>
            <p className="text-xs text-slate-500 mt-1">
              단색 피규어로 출력되며, 동봉된 물감으로 직접 색칠하실 수 있어요!
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
