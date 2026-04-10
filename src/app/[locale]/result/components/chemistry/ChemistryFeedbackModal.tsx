"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles, ChevronRight, ThumbsUp, ThumbsDown, Droplet, TestTube2, AlertTriangle, Check } from "lucide-react"
import { perfumes } from "@/data/perfumes"
import {
  SCENT_FAMILIES,
  type ScentPreference, type ScentIntensity,
  type ChemistryTasteData, type ChemistryRecipeResult,
  type GeneratedRecipe,
} from "@/types/feedback"
import { apiFetch } from "@/lib/api-client"

interface ChemistryFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  characterAName: string
  characterBName: string
  perfumeAId: string
  perfumeAName: string
  perfumeBId: string
  perfumeBName: string
  perfumeACharacteristics?: Record<string, number>
  perfumeBCharacteristics?: Record<string, number>
}

// 한 캐릭터의 취향 데이터
interface SingleTasteState {
  satisfied: boolean // 만족해서 변경 불필요
  retention: number // 기존 향 유지 비율 0-100
  scentPrefs: Record<string, ScentPreference>
  warmth: number
  intensity: ScentIntensity
  feedbackGood: string // 기존 향에서 좋았던/싫었던 점
  feedbackWish: string // 이렇게 바뀌면 좋겠다
}

const createInitialTaste = (): SingleTasteState => ({
  satisfied: true,
  retention: 70,
  scentPrefs: Object.fromEntries(SCENT_FAMILIES.map(f => [f.id, 'none' as ScentPreference])),
  warmth: 50,
  intensity: 'moderate',
  feedbackGood: '',
  feedbackWish: '',
})

type ModalStep = 'formA' | 'formB' | 'generating' | 'result' | 'confirmed'

export function ChemistryFeedbackModal({
  isOpen, onClose, sessionId,
  characterAName, characterBName,
  perfumeAId, perfumeAName, perfumeBId, perfumeBName,
  perfumeACharacteristics, perfumeBCharacteristics,
}: ChemistryFeedbackModalProps) {
  const [tasteA, setTasteA] = useState<SingleTasteState>(createInitialTaste())
  const [tasteB, setTasteB] = useState<SingleTasteState>(createInitialTaste())
  const [step, setStep] = useState<ModalStep>('formA')
  const [result, setResult] = useState<ChemistryRecipeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultTab, setResultTab] = useState<'A' | 'B'>('A')
  const [selectedA, setSelectedA] = useState<1 | 2 | null>(null)
  const [selectedB, setSelectedB] = useState<1 | 2 | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const goToStep = useCallback((s: ModalStep) => {
    setStep(s)
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }, [])

  // 모달 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTasteA(createInitialTaste())
      setTasteB(createInitialTaste())
      setStep('formA')
      setResult(null)
      setError(null)
      setResultTab('A')
      setSelectedA(null)
      setSelectedB(null)
    }
  }, [isOpen])

  // A→B 전환 또는 생성 (만족 시 스킵 처리)
  const handleNextFromA = useCallback(() => {
    if (tasteA.satisfied && tasteB.satisfied) {
      // 둘 다 만족 → 바로 닫기
      onClose()
      return
    }
    goToStep('formB')
  }, [tasteA.satisfied, tasteB.satisfied, goToStep, onClose])

  // handleNextFromB는 handleGenerate 아래에서 정의

  const handleGenerate = useCallback(async () => {
    setStep('generating')
    setError(null)
    try {
      const tasteData: ChemistryTasteData = {
        sessionId,
        scentPreferences: tasteA.scentPrefs,
        warmth: tasteA.warmth,
        intensity: tasteA.intensity,
        freeText: `${tasteA.feedbackGood ? '좋았던점: ' + tasteA.feedbackGood + '. ' : ''}${tasteA.feedbackWish ? '바라는점: ' + tasteA.feedbackWish : ''}`.trim(),
      }
      const response = await apiFetch('/api/feedback/chemistry-customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taste: { ...tasteData, satisfied: tasteA.satisfied, retention: tasteA.retention },
          tasteB: {
            satisfied: tasteB.satisfied, retention: tasteB.retention,
            scentPreferences: tasteB.scentPrefs, warmth: tasteB.warmth, intensity: tasteB.intensity,
            freeText: `${tasteB.feedbackGood ? '좋았던점: ' + tasteB.feedbackGood + '. ' : ''}${tasteB.feedbackWish ? '바라는점: ' + tasteB.feedbackWish : ''}`.trim(),
          },
          perfumeA: { id: perfumeAId, name: perfumeAName, characteristics: perfumeACharacteristics || {} },
          perfumeB: { id: perfumeBId, name: perfumeBName, characteristics: perfumeBCharacteristics || {} },
          characterAName, characterBName,
        }),
      })
      const data = await response.json()
      if (data.success && data.result) { setResult(data.result); setStep('result') }
      else throw new Error(data.error || '레시피 생성 실패')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
      setStep('formB')
    }
  }, [sessionId, tasteA, tasteB, perfumeAId, perfumeAName, perfumeBId, perfumeBName, perfumeACharacteristics, perfumeBCharacteristics, characterAName, characterBName])

  const handleNextFromB = useCallback(() => {
    if (tasteA.satisfied && tasteB.satisfied) { onClose(); return }
    handleGenerate()
  }, [tasteA.satisfied, tasteB.satisfied, onClose, handleGenerate])

  if (!isOpen) return null

  const isFormA = step === 'formA'
  const isFormB = step === 'formB'
  const currentTaste = isFormA ? tasteA : tasteB
  const setCurrentTaste = isFormA ? setTasteA : setTasteB
  const currentName = isFormA ? characterAName : characterBName
  const currentPerfume = isFormA ? perfumeAName : perfumeBName
  const currentEmoji = isFormA ? '🌙' : '☀️'
  const accentBg = isFormA ? 'bg-violet-500' : 'bg-pink-500'

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="relative w-full max-w-[455px] bg-[#FFFDF5] rounded-t-3xl border-t-2 border-x-2 border-black max-h-[88vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-black bg-yellow-400 rounded-t-3xl flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-black">취향 반영하기</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20">
            <X size={16} className="text-black" />
          </button>
        </div>

        {/* 진행 표시 — A/B 스텝 인디케이터 */}
        {(isFormA || isFormB) && (
          <div className="px-5 py-3 border-b-2 border-black bg-[#FFFDF5] flex-shrink-0">
            <div className="flex gap-3">
              <button
                onClick={() => goToStep('formA')}
                className={`flex-1 rounded-xl p-3 border-2 transition-all text-left ${isFormA ? 'border-black bg-violet-100 shadow-[3px_3px_0_0_black]' : 'border-slate-200 bg-white opacity-60 hover:opacity-80 cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🌙</span>
                  {!isFormA && <span className="text-xs text-emerald-500 font-black">✓ 완료</span>}
                </div>
                <span className={`text-sm font-black block mt-1.5 ${isFormA ? 'text-violet-700' : 'text-slate-400'}`}>{perfumeAId || "AC'SCENT"}</span>
                <span className={`text-[10px] block mt-0.5 ${isFormA ? 'text-violet-500' : 'text-slate-400'}`}>{perfumeAName} · {characterAName}</span>
              </button>
              <button
                onClick={() => goToStep('formB')}
                className={`flex-1 rounded-xl p-3 border-2 transition-all text-left ${isFormB ? 'border-black bg-pink-100 shadow-[3px_3px_0_0_black]' : 'border-slate-200 bg-white opacity-60 hover:opacity-80 cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">☀️</span>
                </div>
                <span className={`text-sm font-black block mt-1.5 ${isFormB ? 'text-pink-700' : 'text-slate-400'}`}>{perfumeBId || "AC'SCENT"}</span>
                <span className={`text-[10px] block mt-0.5 ${isFormB ? 'text-pink-500' : 'text-slate-400'}`}>{perfumeBName} · {characterBName}</span>
              </button>
            </div>
          </div>
        )}

        {/* 콘텐츠 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* 폼 A 또는 B */}
            {(isFormA || isFormB) && (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: isFormA ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isFormA ? -20 : 20 }}
                className="px-5 py-5 space-y-5"
              >
                {/* 만족 여부 — 첫 질문 */}
                <div>
                  <p className="text-sm font-black text-slate-800 mb-3">이 향, 어떠셨나요?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCurrentTaste(prev => ({ ...prev, satisfied: true }))}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        currentTaste.satisfied
                          ? 'border-black bg-emerald-100 shadow-[3px_3px_0_0_black] -translate-x-[1px] -translate-y-[1px]'
                          : 'border-slate-300 bg-white hover:border-black'
                      }`}
                    >
                      <span className="text-2xl block mb-1">😍</span>
                      <span className="text-xs font-black block">만족! 그대로 좋아요</span>
                    </button>
                    <button
                      onClick={() => setCurrentTaste(prev => ({ ...prev, satisfied: false }))}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        !currentTaste.satisfied
                          ? 'border-black bg-amber-100 shadow-[3px_3px_0_0_black] -translate-x-[1px] -translate-y-[1px]'
                          : 'border-slate-300 bg-white hover:border-black'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🔧</span>
                      <span className="text-xs font-black block">좀 바꿔보고 싶어요</span>
                    </button>
                  </div>
                </div>

                {/* 바꾸고 싶을 때만 상세 폼 펼침 */}
                <AnimatePresence>
                  {!currentTaste.satisfied && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-5 overflow-hidden"
                    >
                      {/* 유지 비율 슬라이더 */}
                      <TasteQuestion number={1} title="기존 향 유지 비율">
                        <div className="bg-white rounded-2xl p-4 border-2 border-black shadow-[3px_3px_0_0_black]">
                          <div className="flex justify-between text-xs font-bold text-slate-500 mb-3">
                            <span>🌱 완전히 새롭게</span>
                            <span>거의 유지 ✨</span>
                          </div>
                          <input
                            type="range" min={0} max={90} step={10} value={Math.min(currentTaste.retention, 90)}
                            onChange={(e) => setCurrentTaste(prev => ({ ...prev, retention: Number(e.target.value) }))}
                            className="w-full h-3 bg-gradient-to-r from-violet-300 via-amber-200 to-emerald-300 rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
                              [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:shadow-[2px_2px_0_0_black] [&::-webkit-slider-thumb]:cursor-pointer"
                          />
                          <div className="text-center mt-3">
                            <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-700">
                              기존 향 {currentTaste.retention}% 유지
                            </span>
                          </div>
                        </div>
                      </TasteQuestion>

                      {/* 기존 향 피드백 */}
                      <TasteQuestion number={2} title="이 향에서 어떤 점이 좋거나 싫었나요?">
                        <textarea
                          value={currentTaste.feedbackGood}
                          onChange={(e) => setCurrentTaste(prev => ({ ...prev, feedbackGood: e.target.value }))}
                          placeholder="예: 첫 향은 좋았는데 나중에 너무 달아요, 우디한 느낌이 좋았어요..."
                          className="w-full h-16 px-4 py-3 text-sm border-2 border-black rounded-xl bg-white focus:shadow-[2px_2px_0_0_black] outline-none resize-none transition-all"
                          maxLength={200}
                        />
                      </TasteQuestion>

                      {/* 원하는 방향 */}
                      <TasteQuestion number={3} title="향이 이렇게 바뀌면 좋겠어요">
                        <textarea
                          value={currentTaste.feedbackWish}
                          onChange={(e) => setCurrentTaste(prev => ({ ...prev, feedbackWish: e.target.value }))}
                          placeholder="예: 좀 더 상쾌하게, 여름에 어울리게, 달달하면서 은은하게..."
                          className="w-full h-16 px-4 py-3 text-sm border-2 border-black rounded-xl bg-white focus:shadow-[2px_2px_0_0_black] outline-none resize-none transition-all"
                          maxLength={200}
                        />
                      </TasteQuestion>

                      {/* 끌리는 향 계열 */}
                      <TasteQuestion
                        number={4}
                        title="끌리는 향 / 피하고 싶은 향"
                        hint="탭 → 좋아요 👍  한번 더 → 싫어요 👎"
                        optional
                      >
                        <div className="space-y-2">
                          {SCENT_FAMILIES.map((family) => {
                            const pref = currentTaste.scentPrefs[family.id]
                            return (
                              <button
                                key={family.id}
                                onClick={() => setCurrentTaste(prev => ({
                                  ...prev,
                                  scentPrefs: { ...prev.scentPrefs, [family.id]: pref === 'none' ? 'like' : pref === 'like' ? 'dislike' : 'none' }
                                }))}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                  pref === 'like'
                                    ? 'border-black bg-emerald-100 shadow-[2px_2px_0_0_black] -translate-x-[1px] -translate-y-[1px]'
                                    : pref === 'dislike'
                                    ? 'border-black bg-red-100 shadow-[2px_2px_0_0_black] -translate-x-[1px] -translate-y-[1px]'
                                    : 'border-slate-300 bg-white hover:border-black'
                                }`}
                              >
                                <span className="text-2xl flex-shrink-0">{family.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-black text-slate-800">{family.label}</span>
                                  <span className="text-[10px] text-slate-400 block">{family.examples}</span>
                                </div>
                                <div className="flex-shrink-0">
                                  {pref === 'like' && <ThumbsUp size={18} className="text-emerald-600" />}
                                  {pref === 'dislike' && <ThumbsDown size={18} className="text-red-500" />}
                                  {pref === 'none' && <div className="w-6 h-6 rounded-full border-2 border-slate-300" />}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </TasteQuestion>

                      {/* 온도감 */}
                      <TasteQuestion number={5} title="원하는 향의 온도" optional>
                        <div className="bg-white rounded-2xl p-4 border-2 border-black shadow-[3px_3px_0_0_black]">
                          <div className="flex justify-between text-xs font-bold text-slate-500 mb-3">
                            <span>🧊 시원 · 청량</span>
                            <span>따뜻 · 포근 🔥</span>
                          </div>
                          <input
                            type="range" min={0} max={100} value={currentTaste.warmth}
                            onChange={(e) => setCurrentTaste(prev => ({ ...prev, warmth: Number(e.target.value) }))}
                            className="w-full h-3 bg-gradient-to-r from-cyan-400 via-violet-200 to-amber-400 rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
                              [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:shadow-[2px_2px_0_0_black] [&::-webkit-slider-thumb]:cursor-pointer"
                          />
                          <div className="text-center mt-3">
                            <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-700">
                              {currentTaste.warmth <= 30 ? '🧊 시원하고 청량한' : currentTaste.warmth <= 70 ? '⚖️ 밸런스' : '🔥 따뜻하고 포근한'}
                            </span>
                          </div>
                        </div>
                      </TasteQuestion>

                      {/* 존재감 */}
                      <TasteQuestion number={6} title="원하는 향의 존재감" optional>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { id: 'subtle' as ScentIntensity, label: '은은하게', sub: '살짝 스치는', emoji: '🌬️' },
                            { id: 'moderate' as ScentIntensity, label: '적당하게', sub: '자연스러운', emoji: '🌿' },
                            { id: 'bold' as ScentIntensity, label: '강렬하게', sub: '확실한 인상', emoji: '🔥' },
                          ]).map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setCurrentTaste(prev => ({ ...prev, intensity: opt.id }))}
                              className={`p-3 rounded-xl border-2 text-center transition-all ${
                                currentTaste.intensity === opt.id
                                  ? 'border-black bg-yellow-400 text-black shadow-[2px_2px_0_0_black] -translate-x-[1px] -translate-y-[1px]'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-black'
                              }`}
                            >
                              <span className="text-lg block mb-1">{opt.emoji}</span>
                              <span className="text-xs font-black block">{opt.label}</span>
                              <span className="text-[9px] text-slate-500 block mt-0.5">{opt.sub}</span>
                            </button>
                          ))}
                        </div>
                      </TasteQuestion>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="p-3 bg-red-100 border-2 border-red-400 rounded-xl">
                    <p className="text-xs font-bold text-red-700">{error}</p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 px-5">
                <div className="w-14 h-14 border-4 border-yellow-400 border-t-black rounded-xl animate-spin mb-4" />
                <p className="text-sm font-black text-slate-800">취향을 분석하고 있어요...</p>
                <p className="text-xs text-slate-400 mt-1">각 향수별 2가지 대안을 준비 중</p>
              </motion.div>
            )}

            {step === 'result' && result && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-5 py-4 space-y-4">
                {/* A/B 탭 */}
                <div className="flex gap-2">
                  {!tasteA.satisfied && (
                    <button
                      onClick={() => { setResultTab('A'); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-all ${
                        resultTab === 'A'
                          ? 'border-black bg-violet-100 shadow-[2px_2px_0_0_black] font-black text-violet-700'
                          : 'border-slate-200 bg-white text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-black">🌙 {characterAName}</span>
                      {selectedA && <span className="text-emerald-500 ml-1 text-[10px]">✓</span>}
                    </button>
                  )}
                  {!tasteB.satisfied && (
                    <button
                      onClick={() => { setResultTab('B'); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-all ${
                        resultTab === 'B'
                          ? 'border-black bg-pink-100 shadow-[2px_2px_0_0_black] font-black text-pink-700'
                          : 'border-slate-200 bg-white text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-black">☀️ {characterBName}</span>
                      {selectedB && <span className="text-emerald-500 ml-1 text-[10px]">✓</span>}
                    </button>
                  )}
                </div>

                {/* 선택 안내 */}
                <p className="text-[11px] text-slate-400 text-center">둘 중 하나를 골라주세요. 직접 맡아보고 결정!</p>

                <AnimatePresence mode="wait">
                  {/* A 레시피 선택 */}
                  {resultTab === 'A' && !tasteA.satisfied && (
                    <motion.div key="recA" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      <SelectableRecipeCard
                        label="1안"
                        recipe={result.recipeA1}
                        selected={selectedA === 1}
                        onSelect={() => setSelectedA(1)}
                        accentColor="violet"
                      />
                      <SelectableRecipeCard
                        label="2안"
                        recipe={result.recipeA2}
                        selected={selectedA === 2}
                        onSelect={() => setSelectedA(2)}
                        accentColor="violet"
                      />
                    </motion.div>
                  )}
                  {/* B 레시피 선택 */}
                  {resultTab === 'B' && !tasteB.satisfied && (
                    <motion.div key="recB" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      <SelectableRecipeCard
                        label="1안"
                        recipe={result.recipeB1}
                        selected={selectedB === 1}
                        onSelect={() => setSelectedB(1)}
                        accentColor="pink"
                      />
                      <SelectableRecipeCard
                        label="2안"
                        recipe={result.recipeB2}
                        selected={selectedB === 2}
                        onSelect={() => setSelectedB(2)}
                        accentColor="pink"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* 최종 확정 — 테스트 향료 제조 안내 */}
            {step === 'confirmed' && result && (
              <motion.div key="confirmed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-5 py-5 space-y-5">
                {result.layeringNote && (
                  <div className="p-4 bg-black rounded-xl border-2 border-black">
                    <span className="text-[9px] font-black text-yellow-400 uppercase tracking-wider block mb-1">Layering Note</span>
                    <p className="text-xs text-white font-bold leading-relaxed">{result.layeringNote}</p>
                  </div>
                )}

                {/* 확정된 A 레시피 */}
                {!tasteA.satisfied && selectedA && (
                  <ConfirmedRecipeSection
                    label={`${characterAName}의 향`}
                    emoji="🌙"
                    recipe={selectedA === 1 ? result.recipeA1 : result.recipeA2}
                    accentColor="violet"
                  />
                )}

                {/* 확정된 B 레시피 */}
                {!tasteB.satisfied && selectedB && (
                  <ConfirmedRecipeSection
                    label={`${characterBName}의 향`}
                    emoji="☀️"
                    recipe={selectedB === 1 ? result.recipeB1 : result.recipeB2}
                    accentColor="pink"
                  />
                )}

                {result.pairExplanation && (
                  <div className="p-3 bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl border border-violet-200">
                    <p className="text-xs text-slate-600 leading-relaxed">{result.pairExplanation}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 하단 CTA */}
        <div className="px-5 py-4 border-t-2 border-black bg-white flex-shrink-0">
          {isFormA && (
            <button
              onClick={handleNextFromA}
              className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2"
            >
              {characterBName}의 향으로 <ChevronRight size={16} />
            </button>
          )}
          {isFormB && (
            <button
              onClick={handleNextFromB}
              className={`w-full py-3.5 font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 ${
                tasteA.satisfied && tasteB.satisfied
                  ? 'bg-gradient-to-r from-emerald-400 to-green-400 text-black'
                  : 'bg-gradient-to-r from-yellow-400 to-amber-400 text-black'
              }`}
            >
              {tasteA.satisfied && tasteB.satisfied ? (
                <>확인</>
              ) : (
                <><Sparkles size={16} /> 맞춤 레시피 생성</>
              )}
            </button>
          )}
          {step === 'result' && (() => {
            const needA = !tasteA.satisfied
            const needB = !tasteB.satisfied
            const allSelected = (!needA || selectedA !== null) && (!needB || selectedB !== null)
            // A 선택 후 B로 자동 전환
            if (resultTab === 'A' && selectedA && needB && !selectedB) {
              return (
                <button
                  onClick={() => { setResultTab('B'); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] transition-all flex items-center justify-center gap-2"
                >
                  {characterBName}의 향 선택하기 <ChevronRight size={16} />
                </button>
              )
            }
            return (
              <button
                onClick={() => allSelected ? setStep('confirmed') : null}
                disabled={!allSelected}
                className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Check size={16} /> 레시피 확정
              </button>
            )
          })()}
          {step === 'confirmed' && (
            <button onClick={onClose} className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-green-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] transition-all">
              완료
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// 질문 래퍼
function TasteQuestion({ number, title, hint, optional, children }: {
  number: number; title: string; hint?: string; optional?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 bg-yellow-400 text-black text-xs font-black rounded-lg flex items-center justify-center border-2 border-black shadow-[2px_2px_0_0_black]">{number}</span>
        <span className="text-sm font-black text-slate-800">{title}</span>
        {optional && <span className="text-[10px] text-slate-400">(선택)</span>}
      </div>
      {hint && <p className="text-[11px] text-slate-500 mb-3 ml-9">{hint}</p>}
      {children}
    </div>
  )
}

// 향수 색상 헬퍼
function getGranuleColor(id: string) {
  const p = perfumes.find((pf: { id: string }) => pf.id === id)
  return p?.primaryColor || '#6B7280'
}
function isLightColor(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 180
}

// 선택 가능한 레시피 카드
function SelectableRecipeCard({ label, recipe, selected, onSelect, accentColor }: {
  label: string; recipe: GeneratedRecipe; selected: boolean; onSelect: () => void; accentColor: 'violet' | 'pink'
}) {
  const st = accentColor === 'violet'
    ? { border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' }
    : { border: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-700' }

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left border-2 rounded-xl overflow-hidden transition-all ${
        selected
          ? `${st.border} ${st.bg} shadow-[3px_3px_0_0_black] -translate-x-[1px] -translate-y-[1px]`
          : 'border-slate-300 bg-white hover:border-black'
      }`}
    >
      <div className={`px-4 py-2 border-b ${selected ? 'border-black' : 'border-slate-200'} flex items-center justify-between`}>
        <span className={`text-xs font-black ${selected ? st.text : 'text-slate-500'}`}>{label}</span>
        {selected && <Check size={14} className="text-emerald-500" />}
      </div>
      <div className="p-3 space-y-2">
        {recipe.granules.map((g, i) => {
          const bgColor = getGranuleColor(g.id)
          const txtCls = isLightColor(bgColor) ? 'text-slate-800 border border-slate-200' : 'text-white'
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-black flex-shrink-0 ${txtCls}`} style={{ backgroundColor: bgColor }}>
                <span className="text-base leading-none">{g.drops}</span>
                <span className="text-[8px] opacity-70">방울</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800">{g.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">{g.ratio}%</span>
                </div>
                <span className="text-[10px] text-slate-400">{g.id}</span>
              </div>
            </div>
          )
        })}
        {recipe.overallExplanation && (
          <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-100">{recipe.overallExplanation}</p>
        )}
      </div>
    </button>
  )
}

// 확정 레시피 섹션 (테스트 향료 제조 안내)
function ConfirmedRecipeSection({ label, emoji, recipe, accentColor }: {
  label: string; emoji: string; recipe: GeneratedRecipe; accentColor: 'violet' | 'pink'
}) {
  const st = accentColor === 'violet'
    ? { header: 'bg-violet-100', text: 'text-violet-700' }
    : { header: 'bg-pink-100', text: 'text-pink-700' }

  return (
    <div className="border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0_0_black]">
      <div className={`px-4 py-3 ${st.header} border-b-2 border-black flex items-center gap-2`}>
        <span className="text-lg">{emoji}</span>
        <span className={`text-sm font-black ${st.text}`}>{label}</span>
      </div>
      <div className="p-4 bg-white space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Droplet size={14} className="text-amber-500" />
          <h3 className="text-sm font-bold text-slate-700">레시피 구성</h3>
        </div>
        {recipe.granules.map((g, i) => {
          const bgColor = getGranuleColor(g.id)
          const txtCls = isLightColor(bgColor) ? 'text-slate-800 border-2 border-slate-200' : 'text-white'
          return (
            <div key={i} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg flex-shrink-0 ${txtCls}`} style={{ backgroundColor: bgColor }}>
                  <span className="text-3xl leading-none">{g.drops}</span>
                  <span className="text-[10px] font-bold mt-0.5 opacity-70">방울</span>
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{g.name}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">{g.ratio}%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{g.id}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{g.reason}</p>
                </div>
              </div>
            </div>
          )
        })}

        {recipe.testingInstructions && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <TestTube2 size={14} className="text-purple-500" />
              <h3 className="text-sm font-bold text-slate-700">테스트 향료 제조</h3>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 space-y-2">
              {[recipe.testingInstructions.step1, recipe.testingInstructions.step2, recipe.testingInstructions.step3].filter(Boolean).map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-5 h-5 bg-purple-200 rounded-full flex items-center justify-center text-[10px] font-bold text-purple-700 flex-shrink-0">{i + 1}</span>
                  <p className="text-xs text-slate-700 flex-1">{s}</p>
                </div>
              ))}
            </div>
            {recipe.testingInstructions.caution && (
              <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-2.5 border border-amber-200/50">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">{recipe.testingInstructions.caution}</p>
              </div>
            )}
          </div>
        )}

        {recipe.fanMessage && (
          <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200/50">
            <p className="text-xs text-slate-700 leading-relaxed text-center font-medium">{recipe.fanMessage}</p>
          </div>
        )}
      </div>
    </div>
  )
}
