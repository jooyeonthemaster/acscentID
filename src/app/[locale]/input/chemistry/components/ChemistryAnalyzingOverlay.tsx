"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { Layers } from "lucide-react"

interface ChemistryAnalyzingOverlayProps {
  isVisible: boolean
  character1Name: string
  character2Name: string
  image1Preview: string | null
  image2Preview: string | null
  isComplete?: boolean
  onDoorOpened?: () => void
}

export function ChemistryAnalyzingOverlay({
  isVisible, character1Name, character2Name,
  image1Preview, image2Preview,
  isComplete = false, onDoorOpened,
}: ChemistryAnalyzingOverlayProps) {
  const t = useTranslations('chemistry.analyzing')
  const tRoot = useTranslations()
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
  const [doorState, setDoorState] = useState<'closed' | 'opening'>('closed')
  const [mergePhase, setMergePhase] = useState(0) // 0: 떨어짐, 1: 접근, 2: 합체

  const [shuffledQuotes] = useState(() => {
    const rawQuotes = t.raw('quotes') as string[]
    const shuffled = [...rawQuotes]
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
      const openTimer = setTimeout(() => setDoorState('opening'), 0)
      return () => clearTimeout(openTimer)
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
      <div className="absolute inset-0 bg-[#0B0E16] z-10" />

      {/* 두 시향지가 벌어지듯 열리는 문 */}
      <div className="absolute inset-0 z-20 flex pointer-events-none overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: doorPosition.left }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={handleDoorAnimationComplete}
          className="relative h-full w-1/2 overflow-hidden border-r border-[var(--line)]"
        >
          <ChemistryBlotterDoorHalf side="left" />
        </motion.div>

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: doorPosition.right }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-full w-1/2 overflow-hidden border-l border-[var(--line)]"
        >
          <ChemistryBlotterDoorHalf side="right" />
        </motion.div>
      </div>

      <motion.div
        animate={{
          opacity: doorState === 'opening' ? 0 : 1,
          scale: doorState === 'opening' ? 0.9 : 1,
        }}
        transition={{ duration: 0.4 }}
        className="relative z-30 w-full max-w-[360px] px-6"
      >
        <div className="overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--soft)] shadow-[0_30px_70px_-20px_rgba(11,14,22,0.7)]">
          <div className="bg-[var(--paper)] px-6 py-5 text-center">
            <Image
              src="/images/logo/acscent-wordmark-cream.png"
              alt="AC'SCENT"
              width={2053}
              height={285}
              priority
              className="mx-auto h-[18px] w-auto select-none"
            />
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-[#8B8371]">{tRoot('chemistry.title')}</p>
          </div>

          <div className="px-6 py-7">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--soft)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted-ink)]">
              <Layers size={12} strokeWidth={2} className="text-[#9A8B5E]" />
              {tRoot('chemistry.title')}
            </div>

            <p className="mb-6 text-left font-heading text-[22px] font-semibold leading-snug tracking-[-0.01em] text-[var(--ink)]">
              {t('title')}
            </p>

            <div className="relative mb-6 h-[170px] overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--soft)]">
              <svg className="absolute inset-x-4 bottom-6 h-24 w-[calc(100%-2rem)]" viewBox="0 0 280 92" aria-hidden>
                <path d="M16 34C58 -6 98 66 139 38C188 4 226 20 264 56" fill="none" stroke="#B7B39E" strokeWidth="8" strokeLinecap="round" opacity="0.5" />
                <path d="M16 70C70 24 112 88 162 60C206 36 238 48 264 76" fill="none" stroke="#C7A98C" strokeWidth="8" strokeLinecap="round" opacity="0.45" />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    x: mergePhase === 0 ? -40 : mergePhase === 1 ? -22 : -10,
                    scale: mergePhase === 2 ? 0.96 : 1,
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="relative z-10 text-center"
                >
                  <div className="h-[76px] w-[76px] overflow-hidden rounded-full border border-[var(--line)] bg-[var(--soft)]">
                    {image1Preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image1Preview} alt={character1Name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-semibold text-[var(--ink)]">
                        {character1Name.charAt(0) || 'A'}
                      </div>
                    )}
                  </div>
                  <span className="mt-2 block max-w-[84px] truncate text-xs lg:text-sm font-medium text-[var(--muted-ink)]">
                    {character1Name || 'A'}
                  </span>
                </motion.div>

                <motion.div
                  animate={{
                    scale: mergePhase === 2 ? [1, 1.12, 1] : 1,
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: mergePhase === 2 ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                  className="relative z-20 mx-[-2px] flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-base font-medium text-[var(--ink)]"
                >
                  ×
                </motion.div>

                <motion.div
                  animate={{
                    x: mergePhase === 0 ? 40 : mergePhase === 1 ? 22 : 10,
                    scale: mergePhase === 2 ? 0.96 : 1,
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="relative z-10 text-center"
                >
                  <div className="h-[76px] w-[76px] overflow-hidden rounded-full border border-[var(--line)] bg-[var(--soft)]">
                    {image2Preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image2Preview} alt={character2Name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-semibold text-[var(--ink)]">
                        {character2Name.charAt(0) || 'B'}
                      </div>
                    )}
                  </div>
                  <span className="mt-2 block max-w-[84px] truncate text-xs lg:text-sm font-medium text-[var(--muted-ink)]">
                    {character2Name || 'B'}
                  </span>
                </motion.div>
              </div>
            </div>

            <div className="mb-6 overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-5 py-6">
              <div className="flex min-h-[48px] items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentQuoteIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="text-center text-sm lg:text-[15px] font-normal italic leading-relaxed text-[var(--muted-ink)]"
                  >
                    &ldquo;{shuffledQuotes[currentQuoteIndex]}&rdquo;
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--paper)]/10">
              <motion.div
                className="h-full rounded-full bg-[var(--paper)]"
                initial={{ width: "0%" }}
                animate={{ width: isComplete ? "100%" : "90%" }}
                transition={{ duration: isComplete ? 0.3 : 25, ease: "linear" }}
              />
            </div>
            <p className="mt-3 text-right text-[10px] font-medium uppercase tracking-[0.22em] text-[#8B8371]">
              {isComplete ? '100%' : 'Blending'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ChemistryBlotterDoorHalf({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  const label = isLeft ? 'A NOTE' : 'B NOTE'
  const lineClassName = isLeft ? 'left-10' : 'right-10'
  const spineClassName = isLeft ? 'right-0' : 'left-0'
  // 좌우 은근한 톤 차이 — 왼쪽은 살짝 차갑게, 오른쪽은 살짝 따뜻하게
  const background = isLeft
    ? 'linear-gradient(160deg, #FBF8F1 0%, #E6E7DB 100%)'
    : 'linear-gradient(160deg, #FBF6EE 0%, #EEE0D2 100%)'

  return (
    <>
      <div className="absolute inset-0" style={{ background }} />
      <div className="absolute left-1/2 top-[15%] flex -translate-x-1/2 flex-col items-center gap-2.5">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)]/70">
          <Layers size={20} strokeWidth={1.6} className="text-[#9A8B5E]" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#9A9179]">{label}</span>
      </div>
      {[34, 50, 66, 82].map((top) => (
        <div
          key={top}
          className={`absolute h-px w-16 bg-[var(--ink)]/10 ${lineClassName}`}
          style={{ top: `${top}%` }}
        />
      ))}
      <div className={`absolute inset-y-0 w-px bg-[var(--line)] ${spineClassName}`} />
    </>
  )
}
