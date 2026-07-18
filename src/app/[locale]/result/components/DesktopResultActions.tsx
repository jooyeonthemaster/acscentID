"use client"

import { useTranslations } from 'next-intl'
import { Share2, ShoppingCart, MessageSquarePlus, History, CreditCard, Ticket } from 'lucide-react'

interface DesktopResultActionsProps {
  onShare: () => void
  onAddToCart: () => void
  onCheckout: () => void
  onScentPaperCheckout?: () => void
  onFeedback?: () => void
  onFeedbackHistory?: () => void
  isShareSaving?: boolean
  isAddingToCart?: boolean
  serviceMode: 'online' | 'offline'
}

/**
 * ResultBottomActions의 데스크탑(lg+) 대응 — 동일한 props로 좌측 컬럼에
 * 인플로우 패널로 배치된다. 모바일 고정 바는 mobile 트리에만 존재한다.
 */
export function DesktopResultActions({
  onShare,
  onAddToCart,
  onCheckout,
  onScentPaperCheckout,
  onFeedback,
  onFeedbackHistory,
  isShareSaving = false,
  isAddingToCart = false,
  serviceMode
}: DesktopResultActionsProps) {
  const t = useTranslations('bottomActions')

  return (
    <div className="rounded-[12px] border border-[#262A38] bg-[#12141D]/80 p-4">
      {serviceMode === 'online' && (
        <div className="flex flex-col gap-2">
          {onScentPaperCheckout && (
            <button
              onClick={onScentPaperCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] px-4 py-3 text-sm font-black text-[#1A1610] transition-colors hover:border-[#B8880F]"
            >
              <Ticket size={16} className="text-[#5C564A]" />
              <span>{t('scentPaperCta')}</span>
            </button>
          )}
          <button
            onClick={onCheckout}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#B8880F] bg-[#EEB62B] py-3.5 text-base font-black text-[#1A1610] transition-colors hover:bg-[#F2C24A]"
          >
            <CreditCard size={17} />
            <span>{t('buy')}</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={onShare}
              disabled={isShareSaving}
              aria-label={isShareSaving ? t('saving') : t('share')}
              className="flex shrink-0 items-center justify-center rounded-[12px] border-2 border-[#F5EFE2] bg-[#F5EFE2] p-3.5 text-sm font-black text-[#12141D] transition-colors hover:bg-[#FFFDF5] disabled:opacity-70"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={onAddToCart}
              disabled={isAddingToCart}
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-[#F5EFE2] bg-[#F5EFE2] py-3.5 text-sm font-black text-[#12141D] transition-colors hover:bg-[#FFFDF5] disabled:opacity-70"
            >
              <ShoppingCart size={16} />
              <span>{isAddingToCart ? t('adding') : t('addToCart')}</span>
            </button>
          </div>
        </div>
      )}

      {serviceMode === 'offline' && (
        <div className="flex flex-col gap-2">
          <button
            onClick={onFeedback}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#F5EFE2] bg-[#F5EFE2] py-3.5 text-sm font-black text-[#12141D] transition-colors hover:bg-[#FFFDF5]"
          >
            <MessageSquarePlus size={16} />
            <span>{t('feedback')}</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={onShare}
              disabled={isShareSaving}
              aria-label={isShareSaving ? t('saving') : t('share')}
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-[#F5EFE2] bg-[#F5EFE2] py-3.5 text-sm font-black text-[#12141D] transition-colors hover:bg-[#FFFDF5] disabled:opacity-70"
            >
              <Share2 size={16} />
              <span>{t('share')}</span>
            </button>
            <button
              onClick={onFeedbackHistory}
              aria-label={t('feedback')}
              className="flex shrink-0 items-center justify-center rounded-[12px] border-2 border-[#262A38] bg-[#12141D] p-3.5 text-[#E9E2D0] transition-colors hover:border-[#3A4051]"
            >
              <History size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
