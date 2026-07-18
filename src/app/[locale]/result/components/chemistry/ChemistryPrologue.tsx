"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { CHEMISTRY_TYPE_COLORS, type ChemistryProfile } from "@/types/analysis"

// 케미합 티어 시스템 (최소 50%)
function getScoreTier(score: number) {
  if (score >= 90) return { tierKey: 'soulmate', descKey: 'soulmateDesc', emoji: '💘', color: 'text-[#6E6659]', bg: 'bg-[#F5EFE2]', border: 'border-[#D8CFBB]', barColor: 'from-[#EFE4C8] to-[#EFE4C8]' }
  if (score >= 75) return { tierKey: 'realDeal', descKey: 'realDealDesc', emoji: '🔥', color: 'text-[#6E6659]', bg: 'bg-[#F5EFE2]', border: 'border-[#D8CFBB]', barColor: 'from-[#EFE4C8] to-[#EFE4C8]' }
  if (score >= 65) return { tierKey: 'subtle', descKey: 'subtleDesc', emoji: '✨', color: 'text-[#6E6659]', bg: 'bg-[#F5EFE2]', border: 'border-[#D8CFBB]', barColor: 'from-[#EFE4C8] to-[#EFE4C8]' }
  return { tierKey: 'mysterious', descKey: 'mysteriousDesc', emoji: '🌙', color: 'text-[#5C564A]', bg: 'bg-[#F5EFE2]', border: 'border-[#D8CFBB]', barColor: 'from-[#EFE4C8] to-[#EFE4C8]' }
}

interface ChemistryPrologueProps {
  chemistry: ChemistryProfile
  character1Name: string
  character2Name: string
  image1Preview: string | null
  image2Preview: string | null
}

export function ChemistryPrologue({
  chemistry, character1Name, character2Name, image1Preview, image2Preview,
}: ChemistryPrologueProps) {
  const t = useTranslations()
  const typeColor = CHEMISTRY_TYPE_COLORS[chemistry.chemistryType]
  const typeLabel = t(`chemistry.typeLabels.${chemistry.chemistryType}`)
  const score = chemistry.chemistryScore?.overall ?? chemistry.faceMatch?.score ?? 75
  const tier = getScoreTier(score)

  const punchline = chemistry.traitsSynergy?.synergyOneLiner
    || chemistry.chemistryStory?.split('.')[0]
    || t('chemistry.fallback.punchline')

  const keywords = chemistry.relationshipDynamic?.chemistryKeywords || []

  return (
    <div className="px-4">
      <div className="bg-[#F5EFE2] border border-[#D8CFBB] rounded-[12px] overflow-hidden">

        {/* 상단 타입 바 */}
        <div className={`bg-gradient-to-r ${typeColor.gradient} px-5 py-2.5 flex items-center justify-center`}>
          <span className="px-4 py-1 bg-[#F5EFE2] rounded-full text-sm lg:text-base font-bold text-[#1A1610] border border-[#D8CFBB]">
            {typeLabel}
          </span>
        </div>

        {/* 얼굴합 메인 영역 — 큰 이미지 좌우 + 중앙 VS */}
        <div className="bg-[#F5EFE2] px-2 pt-6 pb-4">
          <div className="flex items-start justify-center gap-0">
            {/* A 이미지 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex-1 flex flex-col items-center"
            >
              <div className="w-[156px] h-[156px] rounded-[12px] border-3 border-[#D8CFBB] overflow-hidden">
                {image1Preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image1Preview} alt={character1Name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#EDE5D2] flex items-center justify-center text-4xl font-bold text-[#6E6659]">A</div>
                )}
              </div>
              <span className="text-sm lg:text-base font-bold text-[#1A1610] mt-2 block text-center">{character1Name}</span>
            </motion.div>

            {/* VS 마크 */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", bounce: 0.5 }}
              className="flex-shrink-0 -mx-4 mt-14 z-10"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#EFE4C8] to-[#EFE4C8] flex items-center justify-center border-[3px] border-[#C9BFA8] shadow-lg">
                <span className="text-[#1A1610] text-sm lg:text-base font-bold">VS</span>
              </div>
            </motion.div>

            {/* B 이미지 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex-1 flex flex-col items-center"
            >
              <div className="w-[156px] h-[156px] rounded-[12px] border-3 border-[#D8CFBB] overflow-hidden">
                {image2Preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image2Preview} alt={character2Name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#EDE5D2] flex items-center justify-center text-4xl font-bold text-[#6E6659]">B</div>
                )}
              </div>
              <span className="text-sm lg:text-base font-bold text-[#1A1610] mt-2 block text-center">{character2Name}</span>
            </motion.div>
          </div>
        </div>

        {/* 얼굴합 점수 — 크고 드라마틱하게 */}
        <div className="bg-[#F5EFE2] px-6 pt-4 pb-4 text-center">
          {/* 점수 숫자 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", bounce: 0.4 }}
          >
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-sm lg:text-base font-bold text-[#6E6659] uppercase tracking-[0.2em]">{t('chemistry.result.chemistryScore')}</span>
            </div>
            <div className="flex items-baseline justify-center gap-0 mt-1">
              <span className={`text-8xl font-bold ${tier.color} tabular-nums leading-none drop-shadow-sm`}>
                {score}
              </span>
              <span className={`text-4xl font-bold ${tier.color} -ml-1`}>%</span>
            </div>
          </motion.div>

          {/* 티어 뱃지 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-3"
          >
            <span className={`inline-flex items-center gap-1.5 px-5 py-2 ${tier.bg} ${tier.border} border rounded-full`}>
              <span className="text-lg">{tier.emoji}</span>
              <span className={`text-base font-bold ${tier.color}`}>{t(`chemistry.tiers.${tier.tierKey}`)}</span>
            </span>
            <p className="text-xs lg:text-sm text-[#6E6659] mt-2 font-medium">
              {chemistry.chemistryScore?.tierLabel || t(`chemistry.tiers.${tier.descKey}`)}
            </p>
          </motion.div>

          {/* 키워드 태그 */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {keywords.map((kw, i) => (
                <motion.span
                  key={kw}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + i * 0.06, type: "spring" }}
                  className="text-xs lg:text-sm font-medium text-[#6E6659] bg-[#EDE5D2] px-2.5 py-1 rounded-[12px] border border-[#D8CFBB]"
                >
                  #{kw}
                </motion.span>
              ))}
            </div>
          )}

          {/* 게이지 바 — 티어 존 컬러 */}
          <div className="mt-5 px-1">
            <div className="relative w-full h-5 bg-[#EDE5D2] rounded-full overflow-hidden flex">
              {/* 티어 존 배경 */}
              <div className="w-[20%] h-full bg-stone-200/50" />
              <div className="w-[20%] h-full bg-[#E5DCC8]" />
              <div className="w-[20%] h-full bg-[#E5DCC8]" />
              <div className="w-[15%] h-full bg-[#E5DCC8]" />
              <div className="w-[25%] h-full bg-[#E5DCC8]" />
              {/* 실제 채움 */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${tier.barColor} rounded-full`}
              />
            </div>
            <div className="flex justify-between mt-1.5 px-0.5">
              <span className="text-[10px] lg:text-[12px] text-[#6E6659] font-medium">0</span>
              <span className="text-[10px] lg:text-[12px] text-[#6E6659] font-medium">25</span>
              <span className="text-[10px] lg:text-[12px] text-[#6E6659] font-medium">50</span>
              <span className="text-[10px] lg:text-[12px] text-[#6E6659] font-medium">75</span>
              <span className="text-[10px] lg:text-[12px] text-[#6E6659] font-medium">100</span>
            </div>
          </div>
        </div>

        {/* 칭호 + 한 줄 멘트 */}
        <div className="px-6 pt-3 pb-5 text-center bg-[#F5EFE2] border-t border-dashed border-[#D8CFBB]">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-base font-extrabold text-[#1A1610] leading-snug mb-1.5"
          >
            &ldquo;{chemistry.chemistryTitle}&rdquo;
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xs lg:text-sm text-[#6E6659] font-medium leading-relaxed italic"
          >
            {punchline}
          </motion.p>
        </div>
      </div>
    </div>
  )
}
