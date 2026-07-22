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
      className="bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]"
    >
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎨</span>
        <h3 className="text-lg font-black text-[var(--ink)]">피규어 제작 정보</h3>
      </div>

      {/* 피규어 이미지 */}
      {figureImage && (
        <div className="relative w-full aspect-square rounded-[6px] overflow-hidden border border-[var(--line)] mb-4 bg-[var(--soft)]">
          <Image
            src={figureImage}
            alt="피규어 참고 이미지"
            fill
            className="object-contain"
          />
        </div>
      )}

      {/* 캐릭터 정보 */}
      <div className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)] mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">캐릭터</span>
            <p className="text-sm lg:text-base font-black text-[var(--ink)]">{figureModeling.characterName}</p>
          </div>
          <div>
            <span className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">디퓨저 향</span>
            <p className="text-sm lg:text-base font-black text-[var(--muted-ink)]">{figureModeling.diffuserScent || '분석 중'}</p>
          </div>
        </div>
      </div>

      {/* 포즈 설명 */}
      {figureModeling.poseDescription && (
        <div className="bg-[var(--soft)]/60 rounded-[6px] p-3 border border-[var(--line)] mb-4">
          <span className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold block mb-1">포즈 설명</span>
          <p className="text-sm lg:text-base text-[var(--muted-ink)]">{figureModeling.poseDescription}</p>
        </div>
      )}

      {/* 요청사항 */}
      {figureModeling.specialRequests && figureModeling.specialRequests.length > 0 && (
        <div className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)] mb-4">
          <span className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold block mb-2">특별 요청사항</span>
          <ul className="space-y-1">
            {figureModeling.specialRequests.map((request, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm lg:text-base text-[var(--muted-ink)]">
                <span className="text-[var(--muted-ink)]">•</span>
                <span>{request}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 색상 팔레트 */}
      {figureModeling.colorPalette && figureModeling.colorPalette.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">추천 색상</span>
          <div className="flex gap-1">
            {figureModeling.colorPalette.map((color, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-[6px] border border-[var(--line)]"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* DIY 안내 */}
      <div className="mt-4 p-3 bg-[var(--soft)] rounded-[6px] border border-[var(--line)]">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div>
            <span className="text-xs lg:text-sm font-bold text-[var(--muted-ink)] block">DIY 키트 안내</span>
            <p className="text-xs lg:text-sm text-[var(--muted-ink)] mt-1">
              단색 피규어로 출력되며, 동봉된 물감으로 직접 색칠하실 수 있어요!
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
