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
        <div className="bg-gradient-to-br from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-5 border-2 border-[#D8CFBB]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📦</span>
            <h3 className="text-lg font-black text-[#1A1610]">제작 과정</h3>
          </div>

          <div className="space-y-3">
            {[
              { step: 1, icon: '🎨', title: '3D 모델링', desc: '업로드한 이미지를 기반으로 3D 모델링 진행' },
              { step: 2, icon: '🖨️', title: '3D 프린팅', desc: '단색 레진으로 고품질 출력' },
              { step: 3, icon: '🧪', title: '디퓨저 제작', desc: '분석된 향기로 맞춤 디퓨저 제작' },
              { step: 4, icon: '📬', title: '배송', desc: 'DIY 색칠 키트와 함께 발송' }
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex items-start gap-3 bg-[#F5EFE2] rounded-[12px] p-3 border border-[#D8CFBB]">
                <div className="w-8 h-8 bg-[#EDE5D2] rounded-[12px] flex items-center justify-center flex-shrink-0 border border-[#D8CFBB]">
                  <span>{icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs lg:text-sm bg-[#D8CFBB] text-[#1A1610] px-2 py-0.5 rounded-full font-bold">
                      STEP {step}
                    </span>
                    <span className="text-sm lg:text-base font-black text-[#1A1610]">{title}</span>
                  </div>
                  <p className="text-xs lg:text-sm text-[#8B8578] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 주의사항 */}
      <motion.div variants={fadeInUp}>
        <div className="bg-[#FDFAF1] rounded-[12px] p-4 border-2 border-[#D8CFBB]">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <span className="text-sm lg:text-base font-bold text-[#1A1610] block mb-1">제작 주의사항</span>
              <ul className="text-xs lg:text-sm text-[#5C564A] space-y-1">
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
