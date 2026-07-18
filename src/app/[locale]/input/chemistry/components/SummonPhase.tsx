"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, X, Loader2, Moon, Sun, KeyRound } from "lucide-react"
import { useTranslations } from "next-intl"
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
  const t = useTranslations('chemistry')
  const input1Ref = useRef<HTMLInputElement>(null)
  const input2Ref = useRef<HTMLInputElement>(null)

  // 핀 4자리 입력 완료 시 확인 토스트 (이미지 분석 프로그램과 동일한 패턴)
  const [showPinToast, setShowPinToast] = useState(false)
  const pinToastShownRef = useRef(false)

  useEffect(() => {
    if (formData.pin.length === 4 && !pinToastShownRef.current) {
      pinToastShownRef.current = true
      const showTimer = setTimeout(() => setShowPinToast(true), 0)
      const hideTimer = setTimeout(() => setShowPinToast(false), 4000)
      return () => {
        clearTimeout(showTimer)
        clearTimeout(hideTimer)
      }
    }
    if (formData.pin.length < 4) {
      pinToastShownRef.current = false
    }
  }, [formData.pin])

  return (
    <div className="space-y-4">
      {/* 분석 대상 선택: 최애 vs 나와 상대방 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1.5"
      >
        <label className="block text-xs lg:text-sm font-black text-[#8B8578] uppercase tracking-wider px-1">
          {t('target.label')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: "idol", label: t('target.idol'), emoji: "💖", desc: t('target.idolDesc') },
            { key: "self", label: t('target.self'), emoji: "🪞", desc: t('target.selfDesc') },
          ] as const).map(({ key, label, emoji, desc }) => {
            const isActive = (formData.targetType ?? "idol") === key
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setFormData(prev => ({ ...prev, targetType: key }))}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-[12px] text-sm lg:text-base font-bold border-2 transition-colors duration-300 ${
                  isActive
                    ? "border-[#A87B10] bg-[#FBF3DF] text-[#1A1610]"
                    : "border-[#D8CFBB] bg-[#F5EFE2] text-[#5C564A] hover:border-[#C9BFA8]"
                }`}
                style={isActive ? { boxShadow: '0 0 0 3px rgba(212,160,23,0.22), 0 4px 14px rgba(212,160,23,0.28)' } : undefined}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{emoji}</span>
                  <span className="text-base font-black">{label}</span>
                </div>
                <span className={`text-[9px] font-medium leading-tight ${isActive ? "text-[#5C564A]" : "text-[#8B8578]"}`}>
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
          className="space-y-2"
        >
          <div className="bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[12px] p-3">
            <label className="block text-xs lg:text-sm font-black text-[#5C564A] mb-2">{t('pin.label')}</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={formData.pin}
              onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
              className="w-full h-11 px-4 text-center text-2xl font-bold tracking-[0.5em] bg-[#FDFAF1] text-[#1A1610] placeholder:text-[#8B8578] border-2 border-[#D8CFBB] rounded-[12px] focus:border-[#C9BFA8] focus:ring-2 focus:ring-[#D8CFBB] outline-none"
              placeholder="0000"
            />
          </div>

          {/* 핀번호 안내 배너 — 이미지 분석 프로그램과 동일한 멘트 */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-2 bg-gradient-to-r from-[#FDFAF1] to-[#FDFAF1] border-2 border-[#D8CFBB] rounded-[12px] px-3 py-2.5"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-[12px] bg-[#EFE4C8] border-2 border-[#C9BFA8] flex items-center justify-center mt-0.5">
              <KeyRound size={12} className="text-[#1A1610]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] lg:text-[13px] font-black text-[#5C564A] leading-tight">
                {t('pin.helpTitle')}
              </p>
              <p className="text-[10px] lg:text-[12px] text-[#8B8578] mt-0.5 leading-snug">
                {t('pin.helpDesc')}
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
            <div className="bg-gradient-to-r from-[#EFE4C8] to-[#EFE4C8] rounded-[12px] p-4 shadow-2xl shadow-stone-500/30 border-2 border-[#C9BFA8]">
              <div className="text-center">
                <p className="text-[#5C564A] text-xs lg:text-sm font-medium">{t('pin.toastLabel')}</p>
                <p className="text-[#1A1610] text-2xl font-black tracking-[0.4em] mt-1">{formData.pin}</p>
              </div>
              <p className="text-[#5C564A] text-[11px] lg:text-[13px] mt-2 text-center">{t('pin.toastHelp')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2열 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 캐릭터 A */}
        <CharacterCard
          icon={<Moon size={16} />}
          label={t('summon.characterA')}
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
          label={t('summon.characterB')}
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
      <input ref={input1Ref} type="file" accept="image/*" className="hidden" onChange={handleImage1Upload} aria-label={t('summon.uploadAria', { character: t('summon.characterA') })} id="chemistry-image-1" />
      <input ref={input2Ref} type="file" accept="image/*" className="hidden" onChange={handleImage2Upload} aria-label={t('summon.uploadAria', { character: t('summon.characterB') })} id="chemistry-image-2" />

      {/* 안내 문구 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`${isOffline ? 'bg-[#F5EFE2]/85 border-[#D8CFBB] p-2.5' : 'bg-[#FDFAF1] border-[#D8CFBB] p-4'} border-2 rounded-[12px] text-center`}
      >
        <p className={`${isOffline ? 'text-[11px] lg:text-[13px] text-[#8B8578]' : 'text-xs lg:text-sm text-[#5C564A]'} font-medium leading-relaxed`}>
          {t('summon.imageGuideMain')}
          {!isOffline && <><br />{t('summon.imageGuideSub')}</>}
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
  const t = useTranslations('chemistry.summon')
  const borderColor = accentColor === 'violet' ? 'border-[#C9BFA8]' : 'border-[#C9BFA8]'
  const bgColor = accentColor === 'violet' ? 'bg-[#FDFAF1]' : 'bg-[#FDFAF1]'
  const focusBorder = accentColor === 'violet' ? 'focus:border-[#C9BFA8]' : 'focus:border-[#C9BFA8]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[12px] overflow-hidden`}
    >
      {/* 헤더 */}
      <div className={`${bgColor} px-3 py-1.5 flex items-center gap-2 border-b-2 border-[#D8CFBB]`}>
        {icon}
        <span className="text-xs lg:text-sm font-black text-[#1A1610]">{emoji} {label}</span>
      </div>

      {/* 이미지 영역 */}
      <div className="p-2.5">
        {/* [FIX] HIGH: div 키보드 접근 가능하도록 role/tabIndex/onKeyDown 추가 */}
        <div
          onClick={!imageBase64 ? onImageClick : undefined}
          onKeyDown={!imageBase64 ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(); } } : undefined}
          role={!imageBase64 ? "button" : undefined}
          tabIndex={!imageBase64 ? 0 : undefined}
          aria-label={!imageBase64 ? t('selectImageAria', { character: label }) : undefined}
          className={`relative w-full aspect-[4/3] rounded-[12px] border-2 border-dashed ${borderColor} overflow-hidden cursor-pointer flex items-center justify-center ${bgColor} transition-all hover:opacity-80`}
        >
          {isCompressing ? (
            <Loader2 className="w-8 h-8 text-[#8B8578] animate-spin" />
          ) : imageBase64 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageBase64} alt={label} className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveImage() }}
                className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-[#1A1610]"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <div className="text-center">
              <Camera className="w-8 h-8 text-[#5C564A] mx-auto mb-1" />
              <span className="text-[10px] lg:text-[12px] text-[#8B8578] font-medium">{t('uploadImage')}</span>
            </div>
          )}
        </div>

        {/* 이름 입력 */}
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={`w-full mt-3 h-10 px-3 text-base font-bold text-center bg-[#FDFAF1] text-[#1A1610] placeholder:text-[#8B8578] border-2 border-[#D8CFBB] rounded-[12px] ${focusBorder} focus:ring-2 focus:ring-[#D8CFBB] outline-none`}
          placeholder={t('namePlaceholder')}
          maxLength={20}
        />
      </div>
    </motion.div>
  )
}
