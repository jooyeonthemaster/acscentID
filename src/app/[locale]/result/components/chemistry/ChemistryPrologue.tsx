"use client"

import { motion } from "framer-motion"
import { CHEMISTRY_TYPE_LABELS, CHEMISTRY_TYPE_COLORS, type ChemistryProfile } from "@/types/analysis"

// 케미합 티어 시스템 (최소 50%)
function getScoreTier(score: number) {
  if (score >= 90) return { tier: '천생연분', emoji: '💘', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', barColor: 'from-rose-400 to-pink-500', desc: '우주가 허락한 만남' }
  if (score >= 75) return { tier: '찐케미', emoji: '🔥', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', barColor: 'from-orange-400 to-amber-500', desc: '같은 세계관 확정' }
  if (score >= 65) return { tier: '은근케미', emoji: '✨', color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200', barColor: 'from-violet-400 to-purple-500', desc: '은근히 잘 어울리는 사이' }
  return { tier: '묘한 끌림', emoji: '🌙', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', barColor: 'from-cyan-400 to-blue-500', desc: '다르기에 끌리는 의외의 매력' }
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
  const typeColor = CHEMISTRY_TYPE_COLORS[chemistry.chemistryType]
  const typeLabel = CHEMISTRY_TYPE_LABELS[chemistry.chemistryType]
  const score = chemistry.chemistryScore?.overall ?? chemistry.faceMatch?.score ?? 75
  const tier = getScoreTier(score)

  const punchline = chemistry.traitsSynergy?.synergyOneLiner
    || chemistry.chemistryStory?.split('.')[0]
    || '이 둘의 케미, 실화냐?!'

  const keywords = chemistry.relationshipDynamic?.chemistryKeywords || []

  return (
    <div className="px-4">
      <div className="bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_black] overflow-hidden">

        {/* 상단 타입 바 */}
        <div className={`bg-gradient-to-r ${typeColor.gradient} px-5 py-2.5 flex items-center justify-center`}>
          <span className="px-4 py-1 bg-white/25 rounded-full text-sm font-black text-white backdrop-blur-sm border border-white/40">
            {typeLabel}
          </span>
        </div>

        {/* 얼굴합 메인 영역 — 큰 이미지 좌우 + 중앙 VS */}
        <div className="bg-white px-2 pt-6 pb-4">
          <div className="flex items-start justify-center gap-0">
            {/* A 이미지 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex-1 flex flex-col items-center"
            >
              <div className="w-[156px] h-[156px] rounded-2xl border-3 border-violet-400 overflow-hidden shadow-[4px_4px_0_0_#8b5cf6]">
                {image1Preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image1Preview} alt={character1Name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-violet-100 flex items-center justify-center text-4xl font-black text-violet-400">A</div>
                )}
              </div>
              <span className="text-sm font-black text-slate-800 mt-2 block text-center">{character1Name}</span>
            </motion.div>

            {/* VS 마크 */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", bounce: 0.5 }}
              className="flex-shrink-0 -mx-4 mt-14 z-10"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center border-[3px] border-white shadow-lg">
                <span className="text-white text-sm font-black">VS</span>
              </div>
            </motion.div>

            {/* B 이미지 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex-1 flex flex-col items-center"
            >
              <div className="w-[156px] h-[156px] rounded-2xl border-3 border-pink-400 overflow-hidden shadow-[4px_4px_0_0_#ec4899]">
                {image2Preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image2Preview} alt={character2Name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-pink-100 flex items-center justify-center text-4xl font-black text-pink-400">B</div>
                )}
              </div>
              <span className="text-sm font-black text-slate-800 mt-2 block text-center">{character2Name}</span>
            </motion.div>
          </div>
        </div>

        {/* 얼굴합 점수 — 크고 드라마틱하게 */}
        <div className="bg-white px-6 pt-4 pb-4 text-center">
          {/* 점수 숫자 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", bounce: 0.4 }}
          >
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">케미합</span>
            </div>
            <div className="flex items-baseline justify-center gap-0 mt-1">
              <span className={`text-8xl font-black ${tier.color} tabular-nums leading-none drop-shadow-sm`}>
                {score}
              </span>
              <span className={`text-4xl font-black ${tier.color} -ml-1`}>%</span>
            </div>
          </motion.div>

          {/* 티어 뱃지 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-3"
          >
            <span className={`inline-flex items-center gap-1.5 px-5 py-2 ${tier.bg} ${tier.border} border-2 rounded-full`}>
              <span className="text-lg">{tier.emoji}</span>
              <span className={`text-base font-black ${tier.color}`}>{tier.tier}</span>
            </span>
            <p className="text-xs text-slate-500 mt-2 font-bold">
              {chemistry.chemistryScore?.tierLabel || tier.desc}
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
                  className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200"
                >
                  #{kw}
                </motion.span>
              ))}
            </div>
          )}

          {/* 게이지 바 — 티어 존 컬러 */}
          <div className="mt-5 px-1">
            <div className="relative w-full h-5 bg-slate-100 rounded-full overflow-hidden flex">
              {/* 티어 존 배경 */}
              <div className="w-[20%] h-full bg-slate-200/50" />
              <div className="w-[20%] h-full bg-cyan-100/50" />
              <div className="w-[20%] h-full bg-violet-100/50" />
              <div className="w-[15%] h-full bg-orange-100/50" />
              <div className="w-[25%] h-full bg-rose-100/50" />
              {/* 실제 채움 */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${tier.barColor} rounded-full`}
              />
            </div>
            <div className="flex justify-between mt-1.5 px-0.5">
              <span className="text-[10px] text-slate-400 font-bold">0</span>
              <span className="text-[10px] text-slate-400 font-bold">25</span>
              <span className="text-[10px] text-slate-400 font-bold">50</span>
              <span className="text-[10px] text-slate-400 font-bold">75</span>
              <span className="text-[10px] text-slate-400 font-bold">100</span>
            </div>
          </div>
        </div>

        {/* 칭호 + 한 줄 멘트 */}
        <div className="px-6 pt-3 pb-5 text-center bg-white border-t border-dashed border-slate-200">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-base font-extrabold text-slate-800 leading-snug mb-1.5"
          >
            &ldquo;{chemistry.chemistryTitle}&rdquo;
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xs text-slate-500 font-bold leading-relaxed italic"
          >
            {punchline}
          </motion.p>
        </div>
      </div>
    </div>
  )
}
