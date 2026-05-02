"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, X, Loader2, Moon, Sun, KeyRound } from "lucide-react"
import type { ChemistryFormState } from "../hooks/useChemistryForm"

interface SummonPhaseProps {
  formData: ChemistryFormState
  setFormData: React.Dispatch<React.SetStateAction<ChemistryFormState>>
  handleImage1Upload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleImage2Upload: (e: React.ChangeEvent<HTMLInputElement>) => void
  removeImage1: () => void
  removeImage2: () => void
  isCompressing1: boolean
  isCompressing2: boolean
  isOffline: boolean
}

export function SummonPhase({
  formData, setFormData,
  handleImage1Upload, handleImage2Upload,
  removeImage1, removeImage2,
  isCompressing1, isCompressing2,
  isOffline,
}: SummonPhaseProps) {
  const input1Ref = useRef<HTMLInputElement>(null)
  const input2Ref = useRef<HTMLInputElement>(null)

  // 핀 4자리 입력 완료 시 확인 토스트 (이미지 분석 프로그램과 동일한 패턴)
  const [showPinToast, setShowPinToast] = useState(false)
  const pinToastShownRef = useRef(false)

  useEffect(() => {
    if (formData.pin.length === 4 && !pinToastShownRef.current) {
      pinToastShownRef.current = true
      setShowPinToast(true)
      const timer = setTimeout(() => setShowPinToast(false), 4000)
      return () => clearTimeout(timer)
    }
    if (formData.pin.length < 4) {
      pinToastShownRef.current = false
    }
  }, [formData.pin])

  return (
    <div className="space-y-6">
      {/* 분석 대상 선택: 최애 vs 나와 상대방 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider px-1">
          분석 대상
        </label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { key: "idol", label: "최애", emoji: "💖", desc: "최애 케미 분석" },
            { key: "self", label: "나와 상대방", emoji: "🪞", desc: "나와 상대방의 케미 분석" },
          ] as const).map(({ key, label, emoji, desc }) => {
            const isActive = (formData.targetType ?? "idol") === key
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setFormData(prev => ({ ...prev, targetType: key }))}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl text-sm font-bold transition-all border-2 border-black ${
                  isActive
                    ? "bg-violet-500 text-white shadow-[4px_4px_0_0_black]"
                    : "bg-white text-slate-500 shadow-[2px_2px_0_0_black] hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{emoji}</span>
                  <span className="text-base font-black">{label}</span>
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-white/80" : "text-slate-400"}`}>
                  {desc}
                </span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* 오프라인 PIN */}
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0_0_black]">
            <label className="block text-sm font-bold text-slate-700 mb-2">인증 번호 (숫자 4자리)</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={formData.pin}
              onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
              className="w-full h-12 px-4 text-center text-2xl font-bold tracking-[0.5em] border-2 border-slate-300 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none"
              placeholder="0000"
            />
          </div>

          {/* 핀번호 안내 배너 — 이미지 분석 프로그램과 동일한 멘트 */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-2.5 bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 rounded-xl px-3.5 py-3"
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-rose-400 border-2 border-rose-500 flex items-center justify-center mt-0.5">
              <KeyRound size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-rose-700 leading-tight">
                아무 숫자 4자리를 입력하고 기억해주세요!
              </p>
              <p className="text-[11px] text-rose-600/80 mt-0.5 leading-snug">
                나중에 결과를 확인할 때 이 번호가 필요합니다. 본인만 기억하면 OK!
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 핀번호 확인 토스트 */}
      <AnimatePresence>
        {showPinToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
          >
            <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-4 shadow-2xl shadow-rose-500/30 border-2 border-rose-400">
              <div className="text-center">
                <p className="text-white/80 text-xs font-medium">입력하신 번호는</p>
                <p className="text-white text-2xl font-black tracking-[0.4em] mt-1">{formData.pin}</p>
              </div>
              <p className="text-white/70 text-[11px] mt-2 text-center">이 번호를 꼭 기억해주세요! 📝</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2열 카드 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 캐릭터 A */}
        <CharacterCard
          icon={<Moon size={16} />}
          label="인물 A"
          emoji="🌙"
          name={formData.character1Name}
          imageBase64={formData.character1ImageBase64}
          isCompressing={isCompressing1}
          onNameChange={(name) => setFormData(prev => ({ ...prev, character1Name: name }))}
          onImageClick={() => input1Ref.current?.click()}
          onRemoveImage={removeImage1}
          accentColor="violet"
        />

        {/* 캐릭터 B */}
        <CharacterCard
          icon={<Sun size={16} />}
          label="인물 B"
          emoji="☀️"
          name={formData.character2Name}
          imageBase64={formData.character2ImageBase64}
          isCompressing={isCompressing2}
          onNameChange={(name) => setFormData(prev => ({ ...prev, character2Name: name }))}
          onImageClick={() => input2Ref.current?.click()}
          onRemoveImage={removeImage2}
          accentColor="pink"
        />
      </div>

      {/* [FIX] HIGH: file input에 라벨 추가 */}
      <input ref={input1Ref} type="file" accept="image/*" className="hidden" onChange={handleImage1Upload} aria-label="인물 A 이미지 업로드" id="chemistry-image-1" />
      <input ref={input2Ref} type="file" accept="image/*" className="hidden" onChange={handleImage2Upload} aria-label="인물 B 이미지 업로드" id="chemistry-image-2" />

      {/* 안내 문구 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-4 text-center"
      >
        <p className="text-xs text-violet-600 font-medium">
          케미를 분석할 두 인물의 이미지를 업로드해주세요.<br />
          실제 사진, 일러스트, 게임 캐릭터, 아이돌 모두 가능해요!
        </p>
      </motion.div>
    </div>
  )
}

// 캐릭터 카드 컴포넌트
function CharacterCard({
  icon, label, emoji, name, imageBase64, isCompressing,
  onNameChange, onImageClick, onRemoveImage, accentColor,
}: {
  icon: React.ReactNode
  label: string
  emoji: string
  name: string
  imageBase64: string | null
  isCompressing: boolean
  onNameChange: (name: string) => void
  onImageClick: () => void
  onRemoveImage: () => void
  accentColor: 'violet' | 'pink'
}) {
  const borderColor = accentColor === 'violet' ? 'border-violet-400' : 'border-pink-400'
  const bgColor = accentColor === 'violet' ? 'bg-violet-50' : 'bg-pink-50'
  const focusBorder = accentColor === 'violet' ? 'focus:border-violet-500' : 'focus:border-pink-500'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black]`}
    >
      {/* 헤더 */}
      <div className={`${bgColor} px-3 py-2 flex items-center gap-2 border-b-2 border-black`}>
        {icon}
        <span className="text-xs font-black text-slate-800">{emoji} {label}</span>
      </div>

      {/* 이미지 영역 */}
      <div className="p-3">
        {/* [FIX] HIGH: div 키보드 접근 가능하도록 role/tabIndex/onKeyDown 추가 */}
        <div
          onClick={!imageBase64 ? onImageClick : undefined}
          onKeyDown={!imageBase64 ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(); } } : undefined}
          role={!imageBase64 ? "button" : undefined}
          tabIndex={!imageBase64 ? 0 : undefined}
          aria-label={!imageBase64 ? `${label} 이미지 선택` : undefined}
          className={`relative w-full aspect-square rounded-xl border-2 border-dashed ${borderColor} overflow-hidden cursor-pointer flex items-center justify-center ${bgColor} transition-all hover:opacity-80`}
        >
          {isCompressing ? (
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          ) : imageBase64 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageBase64} alt={label} className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveImage() }}
                className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <div className="text-center">
              <Camera className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-medium">이미지 업로드</span>
            </div>
          )}
        </div>

        {/* 이름 입력 */}
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={`w-full mt-3 h-10 px-3 text-sm font-bold text-center border-2 border-slate-300 rounded-xl ${focusBorder} focus:ring-2 focus:ring-violet-200 outline-none`}
          placeholder="이름 입력"
          maxLength={20}
        />
      </div>
    </motion.div>
  )
}
