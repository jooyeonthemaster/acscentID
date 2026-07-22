"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Link2, Loader2, MoonStar, X } from 'lucide-react'
import { ImageAnalysisResult } from '@/types/analysis'
import { setMobileOverlayOpen } from '@/lib/mobile-overlay'
import { shareSajuCard, type SajuShareCardOptions } from '@/lib/saju/share-card'
import { SAJU_CLOUDS } from '@/components/saju/clouds'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  userImage?: string
  twitterName: string
  // 결과 페이지 전용 메타 (다른 곳에서 재사용 시 생략 가능 — 본문에서 사용하지 않음)
  userName?: string
  userGender?: string
  perfumeName: string
  perfumeBrand?: string
  analysisData?: ImageAnalysisResult
  shareUrl?: string
  /** 사주 전용 — 운문 공유 카드(PNG) 생성 옵션. 전달 시 카드 저장 버튼 노출 (SAJU_CLOUDS) */
  sajuCard?: SajuShareCardOptions
}

export function ShareModal({
  isOpen,
  onClose,
  twitterName,
  perfumeName,
  shareUrl,
  sajuCard
}: ShareModalProps) {
  const t = useTranslations('share')
  const [copied, setCopied] = useState(false)
  const [cardBusy, setCardBusy] = useState(false)

  const handleSajuCard = async () => {
    if (!sajuCard || cardBusy) return
    setCardBusy(true)
    try {
      await shareSajuCard(sajuCard)
    } catch (e) {
      console.error('Saju card share error:', e)
    } finally {
      setCardBusy(false)
    }
  }

  useEffect(() => {
    setMobileOverlayOpen('share-modal', isOpen)
    return () => setMobileOverlayOpen('share-modal', false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    const body = document.body
    const html = document.documentElement

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'

    return () => {
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.overflow = ''
      html.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  const handleLinkShare = async () => {
    const fullUrl = shareUrl || window.location.href

    try {
      if (navigator.share) {
        await navigator.share({
          title: `AC'SCENT IDENTITY - ${perfumeName}`,
          text: twitterName,
          url: fullUrl
        })
      } else {
        await navigator.clipboard.writeText(fullUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Link share error:', error)
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="
              fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[90]
              max-w-[400px] mx-auto
              bg-[var(--paper)] rounded-[6px] shadow-2xl
              overflow-hidden
            "
            style={{
              WebkitOverflowScrolling: 'touch',
              maxHeight: 'calc(100dvh - 32px)'
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
              <h2 className="text-lg font-bold text-[var(--ink)]">{t('title')}</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-[var(--soft)] transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-[var(--muted-ink)]" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <button
                onClick={handleLinkShare}
                className="
                  w-full flex items-center gap-4 p-4
                  bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]
                  hover:from-[var(--soft)] hover:to-[var(--soft)]
                  rounded-[6px] transition-all
                "
              >
                <div className="w-12 h-12 bg-[var(--soft)] rounded-[6px] flex items-center justify-center">
                  {copied ? (
                    <Check size={22} className="text-[var(--ink)]" />
                  ) : (
                    <Link2 size={22} className="text-[var(--ink)]" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-bold text-[var(--ink)]">
                    {copied ? t('linkCopied') : t('linkShare')}
                  </p>
                  <p className="text-xs lg:text-sm text-[var(--muted-ink)]">
                    {t('linkShareDesc')}
                  </p>
                </div>
              </button>

              {/* 사주 전용 — 운문 카드 저장 (실물 상품 아트와 같은 달+구름 카드) */}
              {sajuCard && SAJU_CLOUDS && (
                <button
                  onClick={handleSajuCard}
                  disabled={cardBusy}
                  className="
                    w-full flex items-center gap-4 p-4
                    bg-[var(--canvas)] hover:bg-[#171C28]
                    rounded-[6px] transition-all disabled:opacity-60
                  "
                >
                  <div className="w-12 h-12 rounded-[6px] flex items-center justify-center border border-[#C9A227]/50 bg-[var(--paper)]">
                    {cardBusy ? (
                      <Loader2 size={22} className="animate-spin text-[#C9A227]" />
                    ) : (
                      <MoonStar size={22} className="text-[#C9A227]" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-serif-kr font-bold text-[var(--ink)]">{t('sajuCardSave')}</p>
                    <p className="text-xs lg:text-sm text-[var(--muted-ink)]">{t('sajuCardSaveDesc')}</p>
                  </div>
                </button>
              )}
            </div>

            <div className="px-5 pb-5">
              <p className="text-center text-xs lg:text-sm text-[var(--muted-ink)]">
                {t('shareHint')}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
