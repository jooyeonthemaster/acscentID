"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { RELATION_TROPES, ARCHETYPE_OPTIONS, SCENE_OPTIONS, EMOTION_KEYWORDS } from "@/types/analysis"
import { getChemistryOptionLabel } from "@/lib/gemini/chemistry-labels"
import type { Locale } from "@/i18n/config"
import type { ChemistryFormState } from "../hooks/useChemistryForm"

interface CatalystPhaseProps {
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
  character1Name: string
  character2Name: string
}

export function CatalystPhase({ formData, character1Name, character2Name }: CatalystPhaseProps) {
  const locale = useLocale() as Locale
  const t = useTranslations('chemistry')
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#EFE4C8] to-[#EFE4C8] text-[#1A1610] rounded-full border-2 border-[#D8CFBB]"
        >
          <Sparkles size={16} />
          <span className="text-sm lg:text-base font-black">{t('catalyst.ready')}</span>
        </motion.div>
        <h2 className="text-xl font-black text-[#1A1610] mt-4">
          {t('catalyst.title')}
        </h2>
        <p className="text-sm lg:text-base text-[#8B8578] mt-1">{t('catalyst.subtitle')}</p>
      </div>

      {/* 요약 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[12px] overflow-hidden"
      >
        {/* 캐릭터 요약 */}
        <div className="p-4 border-b-2 border-[#D8CFBB] bg-[#0E1016]">
          <div className="flex items-center justify-center gap-4">
            {/* A */}
            <div className="text-center">
              {formData.character1ImageBase64 && (
                <div className="w-16 h-16 rounded-[12px] border-2 border-[#C9BFA8] overflow-hidden mx-auto mb-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.character1ImageBase64} alt={character1Name} className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-xs lg:text-sm font-bold text-[#1A1610] block">{character1Name}</span>
              <span className="text-[10px] lg:text-[12px] text-[#8B8578]">{archs1.length > 0 ? archs1.map(a => `${a!.emoji} ${getChemistryOptionLabel(a!.id, locale)}`).join(', ') : formData.customArchetype1 || ''}</span>
            </div>

            {/* VS */}
            <div className="text-2xl font-black text-[#8B8578]">x</div>

            {/* B */}
            <div className="text-center">
              {formData.character2ImageBase64 && (
                <div className="w-16 h-16 rounded-[12px] border-2 border-[#C9BFA8] overflow-hidden mx-auto mb-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.character2ImageBase64} alt={character2Name} className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-xs lg:text-sm font-bold text-[#1A1610] block">{character2Name}</span>
              <span className="text-[10px] lg:text-[12px] text-[#8B8578]">{archs2.length > 0 ? archs2.map(a => `${a!.emoji} ${getChemistryOptionLabel(a!.id, locale)}`).join(', ') : formData.customArchetype2 || ''}</span>
            </div>
          </div>
        </div>

        {/* 설정 요약 */}
        <div className="p-4 space-y-3">
          <SummaryRow label={t('summary.relationship')} value={tropes.map(trope => `${trope!.emoji} ${getChemistryOptionLabel(trope!.id, locale)}`).join(', ')} customValue={formData.customTrope} />
          <SummaryRow label={t('summary.scene')} value={selectedScenes.map(scene => `${scene!.emoji} ${getChemistryOptionLabel(scene!.id, locale)}`).join(', ')} customValue={formData.customScene} />
          <SummaryRow
            label={t('summary.emotion')}
            value={emotions.map(e => e ? `${e.emoji} ${getChemistryOptionLabel(e.id, locale)}` : '').join(', ')}
            customValue={formData.customEmotion}
          />
          {formData.message && (
            <SummaryRow label={t('summary.message')} value={formData.message} />
          )}
        </div>
      </motion.div>

      {/* 안내 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-[#FDFAF1] border-2 border-[#D8CFBB] rounded-[12px] p-4 text-center"
      >
        <p className="text-xs lg:text-sm text-[#5C564A] font-medium">
          {t('catalyst.guideLine1')}<br />
          {t('catalyst.guideLine2')}<br />
          <span className="text-[#8B8578]">{t('catalyst.duration')}</span>
        </p>
      </motion.div>
    </div>
  )
}

function SummaryRow({ label, value, customValue }: { label: string; value: string; customValue?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs lg:text-sm font-bold text-[#8B8578] w-16 flex-shrink-0">{label}</span>
      <div className="flex-1">
        <span className="text-xs lg:text-sm font-medium text-[#5C564A]">{value}</span>
        {customValue && (
          <span className="text-xs lg:text-sm text-[#8B8578] font-medium block mt-0.5">+ {customValue}</span>
        )}
      </div>
    </div>
  )
}
