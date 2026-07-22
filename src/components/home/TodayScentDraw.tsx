"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Share2, Wand2, Gift, X } from 'lucide-react'
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
    <section ref={sectionRef} className="scroll-mt-[100px] bg-[var(--dark-band)] px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-[455px]">
        {/* 섹션 타이틀 */}
        <div className="mb-1 text-center">
          <p className="text-[11px] font-black text-[var(--dark-muted)]">TODAY&apos;S SCENT</p>
          <h2 className="mt-1.5 break-keep text-[22px] font-black leading-tight text-white">{t('title')}</h2>
        </div>
        <p className="mb-7 break-keep text-center text-xs text-[var(--dark-muted)]">{t('subtitle')}</p>

        {/* 친구 공유 유입 환영 배너 */}
        <AnimatePresence>
          {sharedScent && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="relative mb-6 rounded-[5px] border border-[var(--line)] bg-white p-4"
            >
              <button
                onClick={() => setSharedScent(null)}
                aria-label="닫기"
                className="absolute right-2 top-2 rounded-full p-1 transition-colors hover:bg-black/10"
              >
                <X size={16} className="text-[var(--muted-ink)]" />
              </button>
              <div className="flex items-start gap-3 pr-5">
                <div className="shrink-0 text-2xl">{sharedScent.emoji}</div>
                <div className="min-w-0">
                  <p className="break-keep text-sm font-extrabold leading-snug text-[var(--ink)]">
                    {t('sharedBanner', { name: sharedScent.name })}
                  </p>
                  <p className="mt-0.5 break-keep text-xs text-[var(--muted-ink)]">{t('sharedBannerSub')}</p>
                  <button
                    onClick={() => router.push(`/programs/today-scent?scent=${sharedScent.id}`)}
                    className="mt-2 inline-flex items-center gap-1 rounded-[4px] bg-[var(--ink)] px-3 py-1.5 text-xs font-extrabold text-white transition-colors hover:bg-black"
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
                whileTap={{ scale: 0.98 }}
                className="w-full max-w-[340px] rounded-[6px] border border-[var(--line)] bg-white px-6 py-10 text-center transition-colors hover:bg-[var(--soft)]"
              >
                <motion.div
                  animate={{ rotate: [0, -8, 8, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="text-6xl"
                >
                  🎰
                </motion.div>
                <div className="mt-5 break-keep text-xl font-black text-[var(--ink)]">
                  {t('drawButton')}
                </div>
                <div className="mt-2 break-keep text-xs font-bold text-[var(--muted-ink)]">
                  {t('drawHint')}
                </div>
              </motion.button>
            )}

            {/* ===== 뽑는 중 ===== */}
            {phase === 'drawing' && (
              <motion.div
                key="drawing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-[340px] rounded-[6px] border border-[var(--line)] bg-white px-6 py-12 text-center"
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
                <div className="mt-6 animate-pulse break-keep text-base font-black text-[var(--ink)]">
                  {t('drawingText')}
                </div>
              </motion.div>
            )}

            {/* ===== 결과 ===== */}
            {phase === 'result' && scent && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex w-full flex-col items-center"
              >
                {alreadyDrawn && (
                  <div className="mb-4 rounded-[3px] border border-[var(--dark-line)] px-3 py-1.5 text-[11px] font-bold text-[var(--dark-muted)]">
                    {t('alreadyToday')}
                  </div>
                )}

                <TodayScentCard scent={scent} dateLabel={dateLabel} />

                {/* 액션 버튼들 */}
                <div className="mt-6 w-full max-w-[340px] space-y-3">
                  <button
                    onClick={() => router.push(`/programs/today-scent?scent=${scent.id}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-[5px] bg-white py-3.5 text-sm font-extrabold text-[var(--ink)] transition-colors hover:bg-[var(--soft)]"
                  >
                    <Wand2 size={17} />
                    {t('makeButton')}
                  </button>

                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-[5px] border border-white/70 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    <Share2 size={17} />
                    {t('shareButton')}
                  </button>
                </div>

                <p className="mt-5 break-keep text-center text-[11px] text-[var(--dark-muted)]">
                  {t('comeback')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
