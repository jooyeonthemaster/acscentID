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
      className="bg-gradient-to-br from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-5 border-2 border-[#D8CFBB]"
    >
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎨</span>
        <h3 className="text-lg font-black text-[#1A1610]">피규어 제작 정보</h3>
      </div>

      {/* 피규어 이미지 */}
      {figureImage && (
        <div className="relative w-full aspect-square rounded-[12px] overflow-hidden border-2 border-[#D8CFBB] mb-4 bg-[#F5EFE2]">
          <Image
            src={figureImage}
            alt="피규어 참고 이미지"
            fill
            className="object-contain"
          />
        </div>
      )}

      {/* 캐릭터 정보 */}
      <div className="bg-[#F5EFE2] rounded-[12px] p-4 border-2 border-[#D8CFBB] mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs lg:text-sm text-[#8B8578] font-bold">캐릭터</span>
            <p className="text-sm lg:text-base font-black text-[#1A1610]">{figureModeling.characterName}</p>
          </div>
          <div>
            <span className="text-xs lg:text-sm text-[#8B8578] font-bold">디퓨저 향</span>
            <p className="text-sm lg:text-base font-black text-[#5C564A]">{figureModeling.diffuserScent || '분석 중'}</p>
          </div>
        </div>
      </div>

      {/* 포즈 설명 */}
      {figureModeling.poseDescription && (
        <div className="bg-[#F5EFE2]/60 rounded-[12px] p-3 border border-[#EDE5D2] mb-4">
          <span className="text-xs lg:text-sm text-[#8B8578] font-bold block mb-1">포즈 설명</span>
          <p className="text-sm lg:text-base text-[#5C564A]">{figureModeling.poseDescription}</p>
        </div>
      )}

      {/* 요청사항 */}
      {figureModeling.specialRequests && figureModeling.specialRequests.length > 0 && (
        <div className="bg-[#FDFAF1] rounded-[12px] p-4 border-2 border-[#D8CFBB] mb-4">
          <span className="text-xs lg:text-sm text-[#5C564A] font-bold block mb-2">특별 요청사항</span>
          <ul className="space-y-1">
            {figureModeling.specialRequests.map((request, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm lg:text-base text-[#5C564A]">
                <span className="text-[#8B8578]">•</span>
                <span>{request}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 색상 팔레트 */}
      {figureModeling.colorPalette && figureModeling.colorPalette.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs lg:text-sm text-[#8B8578] font-bold">추천 색상</span>
          <div className="flex gap-1">
            {figureModeling.colorPalette.map((color, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-[12px] border-2 border-[#D8CFBB]"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* DIY 안내 */}
      <div className="mt-4 p-3 bg-[#EDE5D2] rounded-[12px] border border-[#D8CFBB]">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div>
            <span className="text-xs lg:text-sm font-bold text-[#5C564A] block">DIY 키트 안내</span>
            <p className="text-xs lg:text-sm text-[#8B8578] mt-1">
              단색 피규어로 출력되며, 동봉된 물감으로 직접 색칠하실 수 있어요!
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
