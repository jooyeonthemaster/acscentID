"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { RELATION_TROPES, ARCHETYPE_OPTIONS, SCENE_OPTIONS, EMOTION_KEYWORDS } from "@/types/analysis"
import { getChemistryOptionLabel } from "@/lib/gemini/chemistry-labels"
import type { Locale } from "@/i18n/config"
import type { ChemistryFormState } from "../hooks/useChemistryForm"

interface CardDeckProps {
  currentCard: number
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
  toggleEmotion: (keyword: string) => void
  character1Name: string
  character2Name: string
}

export function CardDeck({
  currentCard, formData, setFormData, toggleEmotion,
  character1Name, character2Name,
}: CardDeckProps) {
  const t = useTranslations('chemistry')
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-1.5 mb-2" role="progressbar" aria-valuenow={currentCard + 1} aria-valuemin={1} aria-valuemax={6} aria-label={t('deck.cardProgress', { current: currentCard + 1, total: 6 })}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentCard ? 'bg-[var(--soft)] w-6' : i < currentCard ? 'bg-[var(--line)]' : 'bg-[var(--line)]'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentCard === 0 && (
          <CardWrapper key="trope">
            <TropeCard formData={formData} setFormData={setFormData} />
          </CardWrapper>
        )}
        {currentCard === 1 && (
          <CardWrapper key="archetype1">
            <ArchetypeCard
              label={`${character1Name}`}
              emoji="🌙"
              imageBase64={formData.character1ImageBase64}
              values={formData.character1Archetypes}
              customValue={formData.customArchetype1}
              onToggle={(v) => setFormData(prev => {
                const cur = prev.character1Archetypes
                return { ...prev, character1Archetypes: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
              })}
              onCustomChange={(v) => setFormData(prev => ({ ...prev, customArchetype1: v }))}
            />
          </CardWrapper>
        )}
        {currentCard === 2 && (
          <CardWrapper key="archetype2">
            <ArchetypeCard
              label={`${character2Name}`}
              emoji="☀️"
              imageBase64={formData.character2ImageBase64}
              values={formData.character2Archetypes}
              customValue={formData.customArchetype2}
              onToggle={(v) => setFormData(prev => {
                const cur = prev.character2Archetypes
                return { ...prev, character2Archetypes: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
              })}
              onCustomChange={(v) => setFormData(prev => ({ ...prev, customArchetype2: v }))}
            />
          </CardWrapper>
        )}
        {currentCard === 3 && (
          <CardWrapper key="scene">
            <SceneCard formData={formData} setFormData={setFormData} />
          </CardWrapper>
        )}
        {currentCard === 4 && (
          <CardWrapper key="emotion">
            <EmotionBubbleCard formData={formData} setFormData={setFormData} toggleEmotion={toggleEmotion} />
          </CardWrapper>
        )}
        {currentCard === 5 && (
          <CardWrapper key="message">
            <MessageCard formData={formData} setFormData={setFormData} />
          </CardWrapper>
        )}
      </AnimatePresence>
    </div>
  )
}

// 카드 래퍼
function CardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      exit={{ opacity: 0, rotateY: 90, scale: 0.8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] overflow-hidden"
    >
      {children}
    </motion.div>
  )
}

// 직접 입력 토글 컴포넌트
function CustomInputToggle({
  isOpen, onToggle, value, onChange, placeholder,
}: {
  isOpen: boolean
  onToggle: () => void
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const t = useTranslations('chemistry.deck')
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-4"
    >
      {!isOpen ? (
        <button
          type="button"
          onClick={onToggle}
          className="w-full py-2.5 px-4 text-xs lg:text-sm font-bold text-[var(--muted-ink)] bg-[var(--soft)]/80 rounded-[6px] border-2 border-dashed border-[var(--line)] hover:border-[var(--line)] hover:text-[var(--muted-ink)] transition-all flex items-center justify-center gap-1"
        >
          <ChevronDown size={14} />
          <span>{t('customInput')}</span>
        </button>
      ) : (
        <div className="relative">
          <div className="absolute -inset-[3px] rounded-[6px] border-2 border-dashed border-stone-400/60 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || t('customPlaceholder')}
            className="relative w-full p-3 bg-[var(--soft)]/90 rounded-[6px] text-base text-[var(--ink)] placeholder:text-[var(--muted-ink)] outline-none border border-[var(--line)] shadow-lg shadow-stone-400/10 focus:border-[var(--line)] focus:bg-[var(--soft)] transition-all"
            maxLength={50}
          />
        </div>
      )}
    </motion.div>
  )
}

// 카드 1: 관계 트로프 (복수 선택)
function TropeCard({ formData, setFormData }: {
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
}) {
  const locale = useLocale() as Locale
  const t = useTranslations('chemistry.deck')
  const [showCustom, setShowCustom] = useState(!!formData.customTrope)

  const toggleTrope = (id: string) => {
    setFormData(prev => {
      const cur = prev.relationTropes
      return { ...prev, relationTropes: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }
    })
  }

  return (
    <div className="p-5">
      <div className="text-center mb-5">
        <h2 className="text-lg font-black text-[var(--ink)]">{t('tropeTitle')}</h2>
        <p className="text-xs lg:text-sm text-[var(--muted-ink)] mt-1">{t('tropeSubtitle')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {RELATION_TROPES.map((trope) => {
          const isSelected = formData.relationTropes.includes(trope.id)
          return (
            <motion.button
              key={trope.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleTrope(trope.id)}
              aria-pressed={isSelected}
              className={`p-3 rounded-[6px] border-2 text-left transition-all ${
                isSelected
                  ? 'border-[var(--line)] bg-[var(--soft)] shadow-[0_0_0_3px_rgba(212,160,23,0.22),0_4px_14px_rgba(212,160,23,0.28)]'
                  : 'border-[var(--line)] bg-[var(--soft)] hover:border-[var(--line)]'
              }`}
            >
              <span className="text-xl block mb-1">{trope.emoji}</span>
              <span className="text-xs lg:text-sm font-bold text-[var(--ink)] block">{getChemistryOptionLabel(trope.id, locale)}</span>
            </motion.button>
          )
        })}
      </div>
      <CustomInputToggle
        isOpen={showCustom}
        onToggle={() => setShowCustom(true)}
        value={formData.customTrope}
        onChange={(v) => setFormData(prev => ({ ...prev, customTrope: v }))}
        placeholder={t('customTropePlaceholder')}
      />
    </div>
  )
}

// 카드 2,3: 아키타입
function ArchetypeCard({ label, emoji, imageBase64, values, customValue, onToggle, onCustomChange }: {
  label: string
  emoji: string
  imageBase64: string | null
  values: string[]
  customValue: string
  onToggle: (v: string) => void
  onCustomChange: (v: string) => void
}) {
  const locale = useLocale() as Locale
  const t = useTranslations('chemistry.deck')
  const [showCustom, setShowCustom] = useState(!!customValue)

  return (
    <div className="p-5">
      {/* 인물 이름 배너 - 2분할 레이아웃 */}
      <div className="bg-[var(--line)] border-b-[3px] border-[var(--line)] -mx-5 -mt-5 mb-5 px-5 py-4">
        <div className="flex items-center gap-4">
          {/* 좌측: 사진 */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-[6px] border border-[var(--line)] overflow-hidden bg-[var(--soft)]">
              {imageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageBase64} alt={label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">{emoji}</div>
              )}
            </div>
          </div>
          {/* 우측: 텍스트 좌측 정렬 */}
          <div className="flex-1 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--soft)] border border-[var(--line)] rounded-full mb-1.5">
              <span className="text-sm lg:text-base">{emoji}</span>
              <span className="text-sm lg:text-base font-black text-[var(--ink)]">{label}</span>
            </div>
            <h2 className="text-sm lg:text-base font-black text-[var(--ink)]">{t('archetypeQuestion', { name: label })}</h2>
            <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] mt-0.5">{t('archetypeSubtitle')}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ARCHETYPE_OPTIONS.map((arch) => {
          const isSelected = values.includes(arch.id)
          return (
            <motion.button
              key={arch.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggle(arch.id)}
              className={`p-3 rounded-[6px] border-2 text-left transition-all ${
                isSelected
                  ? 'border-[var(--line)] bg-[var(--soft)] shadow-[0_0_0_3px_rgba(212,160,23,0.22),0_4px_14px_rgba(212,160,23,0.28)]'
                  : 'border-[var(--line)] bg-[var(--soft)] hover:border-[var(--line)]'
              }`}
            >
              <span className="text-xl block mb-1">{arch.emoji}</span>
              <span className="text-xs lg:text-sm font-bold text-[var(--ink)] block">{getChemistryOptionLabel(arch.id, locale)}</span>
            </motion.button>
          )
        })}
      </div>
      <CustomInputToggle
        isOpen={showCustom}
        onToggle={() => setShowCustom(true)}
        value={customValue}
        onChange={onCustomChange}
        placeholder={t('customArchetypePlaceholder')}
      />
    </div>
  )
}

// 카드 4: 장면/분위기 (복수 선택)
function SceneCard({ formData, setFormData }: {
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
}) {
  const locale = useLocale() as Locale
  const t = useTranslations('chemistry.deck')
  const [showCustom, setShowCustom] = useState(!!formData.customScene)

  const toggleScene = (id: string) => {
    setFormData(prev => {
      const cur = prev.scenes
      return { ...prev, scenes: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }
    })
  }

  return (
    <div className="p-5">
      <div className="text-center mb-5">
        <h2 className="text-lg font-black text-[var(--ink)]">{t('sceneTitle')}</h2>
        <p className="text-xs lg:text-sm text-[var(--muted-ink)] mt-1">{t('sceneSubtitle')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SCENE_OPTIONS.map((scene) => {
          const isSelected = formData.scenes.includes(scene.id)
          return (
            <motion.button
              key={scene.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleScene(scene.id)}
              className={`p-4 rounded-[6px] border-2 text-center transition-all ${
                isSelected
                  ? 'border-[var(--line)] bg-[var(--soft)] shadow-[0_0_0_3px_rgba(212,160,23,0.22),0_4px_14px_rgba(212,160,23,0.28)]'
                  : 'border-[var(--line)] bg-[var(--soft)] hover:border-[var(--line)]'
              }`}
            >
              <span className="text-2xl block mb-2">{scene.emoji}</span>
              <span className="text-xs lg:text-sm font-bold text-[var(--ink)] block">{getChemistryOptionLabel(scene.id, locale)}</span>
            </motion.button>
          )
        })}
      </div>
      <CustomInputToggle
        isOpen={showCustom}
        onToggle={() => setShowCustom(true)}
        value={formData.customScene}
        onChange={(v) => setFormData(prev => ({ ...prev, customScene: v }))}
        placeholder={t('customScenePlaceholder')}
      />
    </div>
  )
}

// 카드 5: 감정 버블
function EmotionBubbleCard({ formData, setFormData, toggleEmotion }: {
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
  toggleEmotion: (keyword: string) => void
}) {
  const locale = useLocale() as Locale
  const t = useTranslations('chemistry.deck')
  const [showCustom, setShowCustom] = useState(!!formData.customEmotion)

  return (
    <div className="p-5">
      <div className="text-center mb-5">
        <h2 className="text-lg font-black text-[var(--ink)]">{t('emotionTitle')}</h2>
        <p className="text-xs lg:text-sm text-[var(--muted-ink)] mt-1">{t('emotionSubtitle')}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {EMOTION_KEYWORDS.map((emotion) => {
          const isSelected = formData.emotionKeywords.includes(emotion.id)
          return (
            <motion.button
              key={emotion.id}
              whileTap={{ scale: 0.9 }}
              animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
              onClick={() => toggleEmotion(emotion.id)}
              className={`px-4 py-3 rounded-full border-2 transition-all ${
                isSelected
                  ? 'border-[var(--line)] bg-[var(--soft)] shadow-[0_0_0_3px_rgba(212,160,23,0.22),0_4px_14px_rgba(212,160,23,0.28)]'
                  : 'border-[var(--line)] bg-[var(--soft)] hover:border-[var(--line)]'
              }`}
            >
              <span className="text-base mr-1">{emotion.emoji}</span>
              <span className="text-xs lg:text-sm font-bold text-[var(--ink)]">{getChemistryOptionLabel(emotion.id, locale)}</span>
            </motion.button>
          )
        })}
      </div>
      <div className="mt-4 text-center text-xs lg:text-sm text-[var(--muted-ink)] font-medium">
        {t('selectedCount', { count: formData.emotionKeywords.length, max: 3 })}
      </div>
      <CustomInputToggle
        isOpen={showCustom}
        onToggle={() => setShowCustom(true)}
        value={formData.customEmotion}
        onChange={(v) => setFormData(prev => ({ ...prev, customEmotion: v }))}
        placeholder={t('customEmotionPlaceholder')}
      />
    </div>
  )
}

// 카드 6: 자유 메시지
function MessageCard({ formData, setFormData }: {
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
}) {
  const t = useTranslations('chemistry.deck')
  return (
    <div className="p-5">
      <div className="text-center mb-5">
        <h2 className="text-lg font-black text-[var(--ink)]">{t('messageTitle')}</h2>
        <p className="text-xs lg:text-sm text-[var(--muted-ink)] mt-1">{t('messageSubtitle')}</p>
      </div>

      <textarea
        value={formData.message}
        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
        className="w-full h-32 px-4 py-3 text-base bg-[var(--soft)] text-[var(--ink)] placeholder:text-[var(--muted-ink)] border border-[var(--line)] rounded-[6px] focus:border-[var(--line)] focus:ring-2 focus:ring-[var(--line)] outline-none resize-none"
        placeholder={t('messagePlaceholder')}
        maxLength={300}
      />

      <div className="flex justify-end mt-2">
        <span className="text-[11px] lg:text-[13px] text-[var(--muted-ink)]">{formData.message.length}/300</span>
      </div>

      <div className="mt-3 bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-3">
        <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] leading-relaxed text-center">
          {t('messageHint')}
        </p>
      </div>
    </div>
  )
}
