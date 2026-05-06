"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { RELATION_TROPES, ARCHETYPE_OPTIONS, SCENE_OPTIONS, EMOTION_KEYWORDS } from "@/types/analysis"
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
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-1.5 mb-2" role="progressbar" aria-valuenow={currentCard + 1} aria-valuemin={1} aria-valuemax={6} aria-label={`카드 ${currentCard + 1} / 6`}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentCard ? 'bg-violet-500 w-6' : i < currentCard ? 'bg-violet-300' : 'bg-slate-200'
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
      className="bg-[#FFF8E7] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_black] overflow-hidden"
    >
      {children}
    </motion.div>
  )
}

// 직접 입력 토글 컴포넌트
function CustomInputToggle({
  isOpen, onToggle, value, onChange, placeholder = "직접 입력해주세요",
}: {
  isOpen: boolean
  onToggle: () => void
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
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
          className="w-full py-2.5 px-4 text-xs font-bold text-slate-500 bg-white/80 rounded-xl border-2 border-dashed border-slate-300 hover:border-violet-400 hover:text-violet-600 transition-all flex items-center justify-center gap-1"
        >
          <ChevronDown size={14} />
          <span>+ 직접 입력하기</span>
        </button>
      ) : (
        <div className="relative">
          <div className="absolute -inset-[3px] rounded-2xl border-2 border-dashed border-violet-400/60 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="relative w-full p-3 bg-white/90 rounded-xl text-base text-slate-800 placeholder:text-slate-400 outline-none border-2 border-violet-200 shadow-lg shadow-violet-400/10 focus:border-violet-400 focus:bg-white transition-all"
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
        <h2 className="text-lg font-black text-slate-900">이 둘의 관계는?</h2>
        <p className="text-xs text-slate-500 mt-1">해당하는 관계를 모두 골라주세요</p>
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
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-violet-500 bg-violet-50 shadow-[2px_2px_0_0_#8b5cf6]'
                  : 'border-slate-200 bg-white hover:border-violet-300'
              }`}
            >
              <span className="text-xl block mb-1">{trope.emoji}</span>
              <span className="text-xs font-bold text-slate-800 block">{trope.label}</span>
            </motion.button>
          )
        })}
      </div>
      <CustomInputToggle
        isOpen={showCustom}
        onToggle={() => setShowCustom(true)}
        value={formData.customTrope}
        onChange={(v) => setFormData(prev => ({ ...prev, customTrope: v }))}
        placeholder="예: 오랜 파트너, 라이벌이자 동료..."
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
  const [showCustom, setShowCustom] = useState(!!customValue)

  return (
    <div className="p-5">
      {/* 인물 이름 배너 - 2분할 레이아웃 */}
      <div className="bg-yellow-300 border-b-[3px] border-black -mx-5 -mt-5 mb-5 px-5 py-4">
        <div className="flex items-center gap-4">
          {/* 좌측: 사진 */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-xl border-2 border-black overflow-hidden shadow-[2px_2px_0_0_black] bg-white">
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-black rounded-full shadow-[2px_2px_0_0_black] mb-1.5">
              <span className="text-sm">{emoji}</span>
              <span className="text-sm font-black text-slate-900">{label}</span>
            </div>
            <h2 className="text-sm font-black text-slate-900">이 인물은 어떤 성격인가요?</h2>
            <p className="text-[11px] text-slate-600 mt-0.5">해당하는 성격을 모두 골라주세요</p>
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
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-violet-500 bg-violet-50 shadow-[2px_2px_0_0_#8b5cf6]'
                  : 'border-slate-200 bg-white hover:border-violet-300'
              }`}
            >
              <span className="text-xl block mb-1">{arch.emoji}</span>
              <span className="text-xs font-bold text-slate-800 block">{arch.label}</span>
            </motion.button>
          )
        })}
      </div>
      <CustomInputToggle
        isOpen={showCustom}
        onToggle={() => setShowCustom(true)}
        value={customValue}
        onChange={onCustomChange}
        placeholder="예: 겉은 차갑지만 속은 따뜻한 타입..."
      />
    </div>
  )
}

// 카드 4: 장면/분위기 (복수 선택)
function SceneCard({ formData, setFormData }: {
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
}) {
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
        <h2 className="text-lg font-black text-slate-900">이 둘이 만나는 장소는?</h2>
        <p className="text-xs text-slate-500 mt-1">어울리는 장면을 모두 골라주세요</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SCENE_OPTIONS.map((scene) => {
          const isSelected = formData.scenes.includes(scene.id)
          return (
            <motion.button
              key={scene.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleScene(scene.id)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                isSelected
                  ? 'border-violet-500 bg-violet-50 shadow-[2px_2px_0_0_#8b5cf6]'
                  : 'border-slate-200 bg-white hover:border-violet-300'
              }`}
            >
              <span className="text-2xl block mb-2">{scene.emoji}</span>
              <span className="text-xs font-bold text-slate-800 block">{scene.label}</span>
            </motion.button>
          )
        })}
      </div>
      <CustomInputToggle
        isOpen={showCustom}
        onToggle={() => setShowCustom(true)}
        value={formData.customScene}
        onChange={(v) => setFormData(prev => ({ ...prev, customScene: v }))}
        placeholder="예: 눈 내리는 놀이공원, 새벽 편의점..."
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
  const [showCustom, setShowCustom] = useState(!!formData.customEmotion)

  return (
    <div className="p-5">
      <div className="text-center mb-5">
        <h2 className="text-lg font-black text-slate-900">이 둘 사이의 감정은?</h2>
        <p className="text-xs text-slate-500 mt-1">2~3개를 선택해주세요</p>
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
                  ? 'border-violet-500 bg-violet-100 shadow-[2px_2px_0_0_#8b5cf6]'
                  : 'border-slate-200 bg-white hover:border-violet-300'
              }`}
            >
              <span className="text-base mr-1">{emotion.emoji}</span>
              <span className="text-xs font-bold text-slate-800">{emotion.label}</span>
            </motion.button>
          )
        })}
      </div>
      <div className="mt-4 text-center text-xs text-violet-500 font-medium">
        {formData.emotionKeywords.length}/3 선택됨
      </div>
      <CustomInputToggle
        isOpen={showCustom}
        onToggle={() => setShowCustom(true)}
        value={formData.customEmotion}
        onChange={(v) => setFormData(prev => ({ ...prev, customEmotion: v }))}
        placeholder="예: 묘한 긴장감, 서로를 향한 질투심..."
      />
    </div>
  )
}

// 카드 6: 자유 메시지
function MessageCard({ formData, setFormData }: {
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
}) {
  return (
    <div className="p-5">
      <div className="text-center mb-5">
        <h2 className="text-lg font-black text-slate-900">마지막으로 한마디!</h2>
        <p className="text-xs text-slate-500 mt-1">둘의 관계, 원하는 향 무드 등 자유롭게 적어주세요</p>
      </div>

      <textarea
        value={formData.message}
        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
        className="w-full h-32 px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none resize-none"
        placeholder={"예시)\n• 둘이 티격태격하지만 서로 아끼는 사이예요\n• 상쾌하고 시원한 느낌의 향이 좋아요\n• 달달하면서도 묵직한 무드로 해주세요"}
        maxLength={300}
      />

      <div className="flex justify-end mt-2">
        <span className="text-[11px] text-slate-400">{formData.message.length}/300</span>
      </div>

      <div className="mt-3 bg-violet-50 border border-violet-200 rounded-xl p-3">
        <p className="text-[11px] text-violet-500 leading-relaxed text-center">
          비워두셔도 괜찮아요! AI가 이미지와 설정을 바탕으로 분석합니다
        </p>
      </div>
    </div>
  )
}
