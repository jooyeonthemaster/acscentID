"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ChemistryAnalyzingOverlayProps {
  isVisible: boolean
  character1Name: string
  character2Name: string
  image1Preview: string | null
  image2Preview: string | null
  isComplete?: boolean
  onDoorOpened?: () => void
}

const CHEMISTRY_QUOTES = [
  "두 향이 만나는 순간을 조합하는 중...",
  "케미의 화학 반응을 분석하고 있어요...",
  "향수 분자가 서로를 찾아가는 중...",
  "탑노트가 인사를 나누고 있어요...",
  "미들노트에서 대화가 시작되었어요...",
  "베이스노트가 서로의 온기를 느끼는 중...",
  "두 향의 시너지를 계산하고 있어요...",
  "케미 지수가 급상승하고 있어요!",
  "향수병에 두 사람의 이야기를 담는 중...",
  "레이어링 비율을 조율하고 있어요...",
  "두 세계가 하나의 향기로 엮이는 중...",
  "이 조합은 처음 보는 케미인데요?!",
]

export function ChemistryAnalyzingOverlay({
  isVisible, character1Name, character2Name,
  image1Preview, image2Preview,
  isComplete = false, onDoorOpened,
}: ChemistryAnalyzingOverlayProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
  const [doorState, setDoorState] = useState<'closed' | 'opening'>('closed')
  const [mergePhase, setMergePhase] = useState(0) // 0: 떨어짐, 1: 접근, 2: 합체

  const [shuffledQuotes] = useState(() => {
    const shuffled = [...CHEMISTRY_QUOTES]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  })

  useEffect(() => {
    if (!isVisible || isComplete) return
    const interval = setInterval(() => {
      setCurrentQuoteIndex(prev => (prev + 1) % shuffledQuotes.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [isVisible, isComplete, shuffledQuotes.length])

  // 합쳐지는 애니메이션 단계
  useEffect(() => {
    if (!isVisible) return
    const t1 = setTimeout(() => setMergePhase(1), 2000)  // 2초 후 접근
    const t2 = setTimeout(() => setMergePhase(2), 5000)  // 5초 후 합체
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isVisible])

  useEffect(() => {
    if (isComplete && doorState === 'closed') {
      setDoorState('opening')
    }
  }, [isComplete, doorState])

  const handleDoorAnimationComplete = () => {
    if (doorState === 'opening' && onDoorOpened) {
      setTimeout(onDoorOpened, 500)
    }
  }

  const doorPosition = doorState === 'opening' ? { left: "-100%", right: "100%" } : { left: "0%", right: "0%" }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center"
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-200/80 via-pink-100/80 to-violet-200/80 backdrop-blur-xl z-10" />

      {/* 문 효과 */}
      <div className="absolute inset-0 flex pointer-events-none">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: doorPosition.left }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={handleDoorAnimationComplete}
          className="w-1/2 h-full bg-violet-500 border-r-4 border-violet-700 relative"
        >
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <pattern id="wood-chem-l" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0 0h100v100H0z" fill="#8b5cf6" />
                <path d="M0 20h100M0 40h100M0 60h100M0 80h100" stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wood-chem-l)" />
          </svg>
        </motion.div>
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: doorPosition.right }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-1/2 h-full bg-pink-500 border-l-4 border-pink-700 relative"
        >
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <pattern id="wood-chem-r" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0 0h100v100H0z" fill="#ec4899" />
                <path d="M0 20h100M0 40h100M0 60h100M0 80h100" stroke="#db2777" strokeWidth="2" strokeOpacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wood-chem-r)" />
          </svg>
        </motion.div>
      </div>

      {/* 파티클 */}
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 2 === 0 ? '#c4b5fd' : '#f9a8d4',
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <motion.div
        animate={{
          opacity: doorState === 'opening' ? 0 : 1,
          scale: doorState === 'opening' ? 0.9 : 1,
        }}
        transition={{ duration: 0.4 }}
        className="relative z-30 w-full max-w-sm px-6 flex flex-col items-center"
      >
        {/* 두 캐릭터 이미지 — 합쳐지는 애니메이션 */}
        <div className="relative flex items-center justify-center mb-8" style={{ height: 140 }}>
          {/* 캐릭터 A — 왼쪽에서 중앙으로 */}
          <motion.div
            animate={{
              x: mergePhase === 0 ? -50 : mergePhase === 1 ? -25 : -8,
              scale: mergePhase === 2 ? 0.95 : 1,
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="relative z-10"
          >
            <div className="w-[100px] h-[100px] rounded-full border-4 border-white overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              {image1Preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image1Preview} alt={character1Name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-violet-200 flex items-center justify-center text-3xl font-black text-violet-500">
                  {character1Name.charAt(0)}
                </div>
              )}
            </div>
            <span className="block text-center text-xs font-black text-slate-700 mt-2 drop-shadow-sm">
              {character1Name}
            </span>
          </motion.div>

          {/* 가운데 합체 이펙트 */}
          <motion.div
            animate={{
              scale: mergePhase === 2 ? [1, 1.5, 1] : [0.8, 1.2, 0.8],
              opacity: mergePhase === 2 ? 1 : 0.6,
            }}
            transition={{
              duration: mergePhase === 2 ? 1.5 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute z-20 flex items-center justify-center"
          >
            {mergePhase < 2 ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-400 to-pink-400 flex items-center justify-center shadow-lg">
                <span className="text-white text-xs font-black">x</span>
              </div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-400 to-pink-400 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.5)]"
              >
                <span className="text-white text-sm font-black">x</span>
              </motion.div>
            )}
          </motion.div>

          {/* 캐릭터 B — 오른쪽에서 중앙으로 */}
          <motion.div
            animate={{
              x: mergePhase === 0 ? 50 : mergePhase === 1 ? 25 : 8,
              scale: mergePhase === 2 ? 0.95 : 1,
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="relative z-10"
          >
            <div className="w-[100px] h-[100px] rounded-full border-4 border-white overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.4)]">
              {image2Preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image2Preview} alt={character2Name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-pink-200 flex items-center justify-center text-3xl font-black text-pink-500">
                  {character2Name.charAt(0)}
                </div>
              )}
            </div>
            <span className="block text-center text-xs font-black text-slate-700 mt-2 drop-shadow-sm">
              {character2Name}
            </span>
          </motion.div>

          {/* 합체 시 글로우 링 */}
          {mergePhase === 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0.5, 1.8, 2.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute z-0 w-32 h-32 rounded-full border-2 border-violet-300/50"
            />
          )}
        </div>

        {/* 타이틀 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg font-black text-slate-800 text-center mb-6 drop-shadow-sm"
        >
          두 향의 케미를 분석하고 있어요
        </motion.p>

        {/* 프로그레스 바 */}
        <div className="relative w-full max-w-xs h-5 bg-white/30 rounded-full overflow-hidden border border-white/50 backdrop-blur-md shadow-inner mx-auto mb-8">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 via-pink-400 to-violet-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: isComplete ? "100%" : "90%" }}
            transition={{ duration: isComplete ? 0.3 : 25, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-difference tracking-widest">
            {isComplete ? '100%' : 'ANALYZING...'}
          </div>
        </div>

        {/* 멘트 카드 */}
        <div className="w-full bg-white/20 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-xl text-center">
          <div className="min-h-[48px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentQuoteIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="text-slate-700 text-sm font-bold leading-relaxed"
              >
                &ldquo;{shuffledQuotes[currentQuoteIndex]}&rdquo;
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
