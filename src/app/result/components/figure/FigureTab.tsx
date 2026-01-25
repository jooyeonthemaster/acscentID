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
    characterName: '최애',
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
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📦</span>
            <h3 className="text-lg font-black text-slate-900">제작 과정</h3>
          </div>

          <div className="space-y-3">
            {[
              { step: 1, icon: '🎨', title: '3D 모델링', desc: '업로드한 이미지를 기반으로 3D 모델링 진행' },
              { step: 2, icon: '🖨️', title: '3D 프린팅', desc: '단색 레진으로 고품질 출력' },
              { step: 3, icon: '🧪', title: '디퓨저 제작', desc: '분석된 향기로 맞춤 디퓨저 제작' },
              { step: 4, icon: '📬', title: '배송', desc: 'DIY 색칠 키트와 함께 발송' }
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-emerald-200">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-300">
                  <span>{icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      STEP {step}
                    </span>
                    <span className="text-sm font-black text-slate-900">{title}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 주의사항 */}
      <motion.div variants={fadeInUp}>
        <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <span className="text-sm font-bold text-amber-800 block mb-1">제작 주의사항</span>
              <ul className="text-xs text-amber-700 space-y-1">
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
