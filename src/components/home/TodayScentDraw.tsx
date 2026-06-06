"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Sparkles, Share2, Wand2, Gift, X } from 'lucide-react'
import { drawToday, getDrawnToday, todayKey } from '@/lib/today-scent/draw'
import { getScentById, type TodayScent } from '@/lib/today-scent/scents'
import { TodayScentCard } from './TodayScentCard'
import { ShareModal } from '@/app/[locale]/result/components/ShareModal'

type Phase = 'idle' | 'drawing' | 'result'

// 가챠 연출용 이모지 (실제 향과 무관, 시각 효과)
const SPIN_EMOJIS = ['🍑', '🌃', '🌸', '🍃', '🌹', '🌊', '✨', '🧸', '🍊', '💜', '🍒', '🔥']

export function TodayScentDraw() {
  const t = useTranslations('todayScent')
  const locale = useLocale()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('idle')
  const [scent, setScent] = useState<TodayScent | null>(null)
  const [spinEmoji, setSpinEmoji] = useState(SPIN_EMOJIS[0])
  const [alreadyDrawn, setAlreadyDrawn] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  // 친구 공유 링크로 유입된 경우 보여줄 향
  const [sharedScent, setSharedScent] = useState<TodayScent | null>(null)

  const sectionRef = useRef<HTMLElement>(null)

  // 마운트 시 오늘 이미 뽑았는지 확인
  useEffect(() => {
    const drawn = getDrawnToday()
    if (drawn) {
      // 클라이언트 전용(localStorage) 초기화 — SSR/hydration 때문에 렌더 중 계산 불가
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScent(drawn)
      setPhase('result')
      setAlreadyDrawn(true)
    }
  }, [])

  // 친구 공유 링크(?from=today-scent&scent=...)로 들어온 경우:
  // 환영 배너 표시 + 이 섹션으로 부드럽게 스크롤
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('from') !== 'today-scent') return
    const sid = params.get('scent')
    const shared = sid ? getScentById(sid) : undefined
    if (!shared) return
    // 클라이언트 전용(window.location) 초기화 — 렌더 중 계산 불가
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSharedScent(shared)
    const timer = setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // 날짜 라벨 (2026.06.02)
  const dateLabel = todayKey().replace(/-/g, '.')

  const handleDraw = useCallback(() => {
    if (phase === 'drawing') return
    setPhase('drawing')

    // 가챠 슬롯 연출: 이모지 빠르게 교체
    let ticks = 0
    const interval = setInterval(() => {
      setSpinEmoji(SPIN_EMOJIS[ticks % SPIN_EMOJIS.length])
      ticks += 1
    }, 90)

    // 1.6초 뒤 결과 확정
    setTimeout(() => {
      clearInterval(interval)
      const picked = drawToday()
      setScent(picked)
      setPhase('result')
    }, 1600)
  }, [phase])

  // 공유 링크(OG 미리보기가 붙는 전용 라우트). 사람은 거기서 홈 랜딩으로 이동.
  const shareUrl = scent && typeof window !== 'undefined'
    ? `${window.location.origin}${locale && locale !== 'ko' ? `/${locale}` : ''}/today-scent/${scent.id}`
    : undefined

  return (
    <section ref={sectionRef} className="bg-white px-4 pt-10 pb-[clamp(132px,18svh,180px)] rounded-t-[32px] -mt-[clamp(84px,12svh,112px)] relative z-20 border-2 border-slate-900 border-b-0 scroll-mt-[100px]">
      {/* 섹션 타이틀 */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={20} className="text-slate-900" />
        <h2 className="text-lg font-black text-slate-900">{t('title')}</h2>
      </div>
      <p className="text-xs text-slate-500 font-medium mb-6">{t('subtitle')}</p>

      {/* 친구 공유 유입 환영 배너 */}
      <AnimatePresence>
        {sharedScent && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative mb-6 bg-[#FCD34D] border-2 border-slate-900 rounded-2xl p-4 shadow-[4px_4px_0px_#0f172a]"
          >
            <button
              onClick={() => setSharedScent(null)}
              aria-label="닫기"
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 transition-colors"
            >
              <X size={16} className="text-slate-700" />
            </button>
            <div className="flex items-start gap-3 pr-5">
              <div className="text-2xl shrink-0">{sharedScent.emoji}</div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 leading-snug">
                  {t('sharedBanner', { name: sharedScent.name })}
                </p>
                <p className="text-xs font-bold text-slate-700/80 mt-0.5">{t('sharedBannerSub')}</p>
                <button
                  onClick={() => router.push(`/programs/today-scent?scent=${sharedScent.id}`)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-black text-slate-900 bg-white border-2 border-slate-900 rounded-full px-3 py-1 shadow-[2px_2px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0f172a] transition-all"
                >
                  <Gift size={13} />
                  {t('viewSharedScent', { name: sharedScent.name })}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center">
        <AnimatePresence mode="wait">
          {/* ===== 뽑기 전 ===== */}
          {phase === 'idle' && (
            <motion.button
              key="idle"
              onClick={handleDraw}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              whileTap={{ scale: 0.97 }}
              className="w-full max-w-[340px] bg-[#FCD34D] border-4 border-slate-900 rounded-[28px] shadow-[8px_8px_0px_#0f172a] px-6 py-10 text-center active:translate-x-[2px] active:translate-y-[2px] active:shadow-[4px_4px_0px_#0f172a] transition-all"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="text-6xl"
              >
                🎰
              </motion.div>
              <div className="mt-5 text-xl font-black text-slate-900">
                {t('drawButton')}
              </div>
              <div className="mt-2 text-xs font-bold text-slate-700/70">
                {t('drawHint')}
              </div>
            </motion.button>
          )}

          {/* ===== 뽑는 중 ===== */}
          {phase === 'drawing' && (
            <motion.div
              key="drawing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-[340px] bg-[#FEF3C7] border-4 border-slate-900 rounded-[28px] shadow-[8px_8px_0px_#0f172a] px-6 py-12 text-center"
            >
              <motion.div
                key={spinEmoji}
                initial={{ scale: 0.6, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.09 }}
                className="text-7xl"
              >
                {spinEmoji}
              </motion.div>
              <div className="mt-6 text-base font-black text-slate-900 animate-pulse">
                {t('drawingText')}
              </div>
            </motion.div>
          )}

          {/* ===== 결과 ===== */}
          {phase === 'result' && scent && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="w-full flex flex-col items-center"
            >
              {alreadyDrawn && (
                <div className="mb-4 px-4 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-full">
                  {t('alreadyToday')}
                </div>
              )}

              <TodayScentCard scent={scent} dateLabel={dateLabel} />

              {/* 액션 버튼들 */}
              <div className="w-full max-w-[340px] mt-6 space-y-3">
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-black text-sm py-3.5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#FCD34D] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#FCD34D] transition-all"
                >
                  <Share2 size={18} />
                  {t('shareButton')}
                </button>

                <button
                  onClick={() => router.push(`/programs/today-scent?scent=${scent.id}`)}
                  className="w-full flex items-center justify-center gap-2 bg-[#FCD34D] text-slate-900 font-black text-sm py-3.5 rounded-2xl border-2 border-slate-900 hover:bg-yellow-300 transition-colors"
                >
                  <Wand2 size={18} />
                  {t('makeButton')}
                </button>
              </div>

              <p className="mt-5 text-[11px] text-slate-400 font-medium text-center">
                {t('comeback')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 공유 모달 — 결과 페이지 등 다른 곳과 동일한 공유 UX */}
      {scent && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          perfumeName={scent.name}
          twitterName={t('shareText', { name: scent.name })}
          shareUrl={shareUrl}
        />
      )}
    </section>
  )
}

export default TodayScentDraw
