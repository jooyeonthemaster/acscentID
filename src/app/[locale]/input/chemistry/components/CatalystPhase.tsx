"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { RELATION_TROPES, ARCHETYPE_OPTIONS, SCENE_OPTIONS, EMOTION_KEYWORDS } from "@/types/analysis"
import type { ChemistryFormState } from "../hooks/useChemistryForm"

interface CatalystPhaseProps {
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
  character1Name: string
  character2Name: string
}

export function CatalystPhase({ formData, character1Name, character2Name }: CatalystPhaseProps) {
  const tropes = formData.relationTropes.map(id => RELATION_TROPES.find(t => t.id === id)).filter(Boolean)
  const archs1 = formData.character1Archetypes.map(id => ARCHETYPE_OPTIONS.find(a => a.id === id)).filter(Boolean)
  const archs2 = formData.character2Archetypes.map(id => ARCHETYPE_OPTIONS.find(a => a.id === id)).filter(Boolean)
  const selectedScenes = formData.scenes.map(id => SCENE_OPTIONS.find(s => s.id === id)).filter(Boolean)
  const emotions = formData.emotionKeywords.map(eid => EMOTION_KEYWORDS.find(e => e.id === eid))

  return (
    <div className="space-y-5">
      {/* 타이틀 */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full border-2 border-black shadow-[3px_3px_0_0_black]"
        >
          <Sparkles size={16} />
          <span className="text-sm font-black">촉매 준비 완료</span>
        </motion.div>
        <h2 className="text-xl font-black text-slate-900 mt-4">
          케미 분석을 시작할까요?
        </h2>
        <p className="text-sm text-slate-500 mt-1">입력한 내용을 확인해주세요</p>
      </div>

      {/* 요약 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_black] overflow-hidden"
      >
        {/* 캐릭터 요약 */}
        <div className="p-4 border-b-2 border-black bg-[#FFF8E7]">
          <div className="flex items-center justify-center gap-4">
            {/* A */}
            <div className="text-center">
              {formData.character1ImageBase64 && (
                <div className="w-16 h-16 rounded-xl border-2 border-violet-400 overflow-hidden mx-auto mb-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.character1ImageBase64} alt={character1Name} className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-xs font-bold text-slate-800 block">{character1Name}</span>
              <span className="text-[10px] text-violet-500">{archs1.length > 0 ? archs1.map(a => `${a!.emoji} ${a!.label}`).join(', ') : formData.customArchetype1 || ''}</span>
            </div>

            {/* VS */}
            <div className="text-2xl font-black text-violet-400">x</div>

            {/* B */}
            <div className="text-center">
              {formData.character2ImageBase64 && (
                <div className="w-16 h-16 rounded-xl border-2 border-pink-400 overflow-hidden mx-auto mb-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.character2ImageBase64} alt={character2Name} className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-xs font-bold text-slate-800 block">{character2Name}</span>
              <span className="text-[10px] text-pink-500">{archs2.length > 0 ? archs2.map(a => `${a!.emoji} ${a!.label}`).join(', ') : formData.customArchetype2 || ''}</span>
            </div>
          </div>
        </div>

        {/* 설정 요약 */}
        <div className="p-4 space-y-3">
          <SummaryRow label="관계" value={tropes.map(t => `${t!.emoji} ${t!.label}`).join(', ')} customValue={formData.customTrope} />
          <SummaryRow label="장소" value={selectedScenes.map(s => `${s!.emoji} ${s!.label}`).join(', ')} customValue={formData.customScene} />
          <SummaryRow
            label="감정"
            value={emotions.map(e => e ? `${e.emoji} ${e.label}` : '').join(', ')}
            customValue={formData.customEmotion}
          />
          {formData.message && (
            <SummaryRow label="메시지" value={formData.message} />
          )}
        </div>
      </motion.div>

      {/* 안내 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-4 text-center"
      >
        <p className="text-xs text-violet-600 font-medium">
          AI가 두 주인공의 이미지와 입력 정보를 분석하여<br />
          케미 프로필과 맞춤 향수 세트를 추천합니다!<br />
          <span className="text-violet-400">(약 30~60초 소요)</span>
        </p>
      </motion.div>
    </div>
  )
}

function SummaryRow({ label, value, customValue }: { label: string; value: string; customValue?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-bold text-slate-400 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1">
        <span className="text-xs font-medium text-slate-700">{value}</span>
        {customValue && (
          <span className="text-xs text-violet-500 font-medium block mt-0.5">+ {customValue}</span>
        )}
      </div>
    </div>
  )
}
