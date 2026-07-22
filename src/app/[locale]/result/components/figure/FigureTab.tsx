'use client';

import { motion } from 'framer-motion';
import { FigureModelingCard } from './FigureModelingCard';
import type { ImageAnalysisResult, FigureModeling } from '@/types/analysis';

interface FigureTabProps {
  displayedAnalysis: ImageAnalysisResult;
  figureImage?: string;
  isDesktop?: boolean;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export function FigureTab({ displayedAnalysis, figureImage, isDesktop }: FigureTabProps) {
  // displayedAnalysis에서 figure 전용 필드 추출
  const figureModeling = (displayedAnalysis as any).figureModeling as FigureModeling | undefined;

  // 데이터가 없을 경우 기본값 사용
  const defaultFigureModeling: FigureModeling = {
    figureImage: figureImage || '',
    characterName: '캐릭터',
    poseDescription: '피규어 포즈를 분석 중입니다...',
    specialRequests: [],
    diffuserScent: '분석 중'
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      className="space-y-6"
    >
      {/* 피규어 제작 정보 */}
      <motion.div variants={fadeInUp}>
        <FigureModelingCard
          figureModeling={figureModeling || defaultFigureModeling}
          figureImage={figureImage}
        />
      </motion.div>

      {/* 제작 과정 안내 */}
      <motion.div variants={fadeInUp}>
        <div className="bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📦</span>
            <h3 className="text-lg font-black text-[var(--ink)]">제작 과정</h3>
          </div>

          <div className="space-y-3">
            {[
              { step: 1, icon: '🎨', title: '3D 모델링', desc: '업로드한 이미지를 기반으로 3D 모델링 진행' },
              { step: 2, icon: '🖨️', title: '3D 프린팅', desc: '단색 레진으로 고품질 출력' },
              { step: 3, icon: '🧪', title: '디퓨저 제작', desc: '분석된 향기로 맞춤 디퓨저 제작' },
              { step: 4, icon: '📬', title: '배송', desc: 'DIY 색칠 키트와 함께 발송' }
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex items-start gap-3 bg-[var(--soft)] rounded-[6px] p-3 border border-[var(--line)]">
                <div className="w-8 h-8 bg-[var(--soft)] rounded-[6px] flex items-center justify-center flex-shrink-0 border border-[var(--line)]">
                  <span>{icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs lg:text-sm bg-[var(--line)] text-[var(--ink)] px-2 py-0.5 rounded-full font-bold">
                      STEP {step}
                    </span>
                    <span className="text-sm lg:text-base font-black text-[var(--ink)]">{title}</span>
                  </div>
                  <p className="text-xs lg:text-sm text-[var(--muted-ink)] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 주의사항 */}
      <motion.div variants={fadeInUp}>
        <div className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)]">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <span className="text-sm lg:text-base font-bold text-[var(--ink)] block mb-1">제작 주의사항</span>
              <ul className="text-xs lg:text-sm text-[var(--muted-ink)] space-y-1">
                <li>• 너무 복잡한 디테일은 3D 프린팅 특성상 구현이 어려울 수 있어요</li>
                <li>• 피규어는 약 10cm 크기로 제작됩니다</li>
                <li>• 제작 기간은 약 2-3주 소요됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
