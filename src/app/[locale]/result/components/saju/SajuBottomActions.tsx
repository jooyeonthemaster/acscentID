'use client';

// ============================================================
// S8 — SajuBottomActions (UI-SPEC §5.8)
// 기존 ResultBottomActions의 바 높이/버튼 구성 계약을 그대로 유지하고
// 스킨만 먹/금/주사로 교체한다.
//   - 바: fixed inset-x-0 bottom-0, max-w-[455px], px-4 py-3, safe-area-bottom
//     (bg-[#12141D]/95 + backdrop-blur + border-t border-[#C9A227]/30,
//      기존 노란 오프셋 그림자 제거)
//   - 버튼 높이 52px 고정(h-[52px]) — 원본 py-3.5+border-2 실측과 동일
//   - online: 공유(정사각) / 장바구니 / 바로구매 — 시향지 CTA 없음
//     (saju는 canBuyScentPaper false 계약)
//   - offline: 공유(정사각) / 피드백 기록(FeedbackModal은 부모 콜백이 연다) / 기록
//   - 바로구매 글로우: 기존 .animate-buy-glow와 동일 키프레임 구조의
//     금 변형 .animate-saju-buy-glow (drop-shadow, 1.8s, reduced-motion 정지)
//
// 체크아웃 localStorage 계약 (ResultPageMain.handleCheckout과 동일하게 쓸 것):
//   checkoutProductType = 'saju_perfume'
//   checkoutAnalysisId  = savedResultId || existingResultId (있을 때만)
//   ※ checkoutSelectedSize는 시향지 전용, checkoutRecipe는 피드백 커스텀 전용
//     — 사주 기본 구매 플로우에서는 쓰지 않는다.
//   부모(SajuResultPage)의 onCheckout에서 writeSajuCheckoutStorage() 사용 권장.
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  CreditCard,
  History,
  MessageSquarePlus,
  Share2,
  ShoppingCart,
} from 'lucide-react';
import { SAJU_EASE_INK } from '@/components/saju';
// 바 prop 계약 SSOT — sections/types.ts
import type { SajuBottomActionsProps } from './sections/types';

export type { SajuBottomActionsProps };

export const SAJU_CHECKOUT_PRODUCT_TYPE = 'saju_perfume' as const;

/**
 * 바로구매/장바구니 진입 전 체크아웃 키 기록 — ResultPageMain.handleCheckout(158-168행)과
 * 동일한 키/순서. SajuResultPage의 onCheckout 핸들러에서 호출한다.
 */
export function writeSajuCheckoutStorage(analysisId?: string | null): void {
  localStorage.setItem('checkoutProductType', SAJU_CHECKOUT_PRODUCT_TYPE);
  if (analysisId) {
    localStorage.setItem('checkoutAnalysisId', analysisId);
  }
}

export function SajuBottomActions({
  onShare,
  onAddToCart,
  onCheckout,
  onFeedback,
  onFeedbackHistory,
  isShareSaving = false,
  isAddingToCart = false,
  serviceMode,
}: SajuBottomActionsProps) {
  const t = useTranslations('bottomActions');

  // 페이지 맨 끝 근처(≤240px)에 도달하면 피드백 CTA를 천천히 글로우시켜 클릭을 유도한다.
  const [nearEnd, setNearEnd] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const reachedEnd = window.innerHeight + window.scrollY >= doc.scrollHeight - 240;
      setNearEnd(reachedEnd);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4, ease: SAJU_EASE_INK }}
      className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[455px] border-t border-[#C9A227]/30 bg-[#12141D]/95 px-4 py-3 backdrop-blur lg:max-w-[680px]"
    >
      {/* 금 글로우 — 기존 buyGlow(1.8s, drop-shadow) 키프레임 구조의 금 변형 (§5.8) */}
      <style>{`
        @keyframes sajuBuyGlow {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(201, 162, 39, 0.55)) drop-shadow(0 0 6px rgba(201, 162, 39, 0.35));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(201, 162, 39, 0.95)) drop-shadow(0 0 18px rgba(232, 199, 102, 0.7));
          }
        }
        .animate-saju-buy-glow {
          animation: sajuBuyGlow 1.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-saju-buy-glow {
            animation: none;
            filter: drop-shadow(0 0 6px rgba(201, 162, 39, 0.6));
          }
        }

        /* 피드백 CTA 글로우 — 페이지 끝 도달 시 천천히(2.8s) 맥동하며 클릭 유도 */
        @keyframes sajuCtaGlow {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(201, 162, 39, 0.4)) drop-shadow(0 0 6px rgba(192, 57, 43, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(232, 199, 102, 0.85)) drop-shadow(0 0 22px rgba(201, 162, 39, 0.6));
          }
        }
        .animate-saju-cta-glow {
          animation: sajuCtaGlow 2.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-saju-cta-glow {
            animation: none;
            filter: drop-shadow(0 0 6px rgba(201, 162, 39, 0.55));
          }
        }
      `}</style>

      <div className="flex gap-2">
        {/* 결과 공유 — 정사각 아이콘 버튼 */}
        <motion.button
          type="button"
          onClick={onShare}
          disabled={isShareSaving}
          aria-label={isShareSaving ? t('saving') : t('share')}
          whileTap={{ scale: 0.98 }}
          className="flex aspect-square h-[52px] shrink-0 items-center justify-center rounded-xl border border-[#262A38] bg-transparent text-[#A69F8D] transition-colors disabled:opacity-70"
        >
          <Share2 size={16} />
        </motion.button>

        {/* 장바구니 담기 + 바로 구매 (online) */}
        {serviceMode === 'online' && (
          <>
            <motion.button
              type="button"
              onClick={onAddToCart}
              disabled={isAddingToCart}
              whileTap={{ scale: 0.98 }}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#C9A227]/60 bg-transparent font-serif-kr text-sm font-semibold text-[#E8C766] transition-colors disabled:opacity-70"
            >
              <ShoppingCart size={16} />
              <span className="break-keep">{isAddingToCart ? t('adding') : t('addToCart')}</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={onCheckout}
              whileTap={{ scale: 0.98 }}
              className="animate-saju-buy-glow flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#C0392B] font-serif-kr text-sm font-semibold text-[#F5EFE2]"
            >
              <CreditCard size={16} />
              <span className="break-keep">{t('buy')}</span>
            </motion.button>
          </>
        )}

        {/* 피드백 기록 + 히스토리 (offline) */}
        {serviceMode === 'offline' && (
          <>
            <motion.button
              type="button"
              onClick={onFeedback}
              whileTap={{ scale: 0.98 }}
              className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#C0392B] font-serif-kr text-sm font-semibold text-[#F5EFE2] ${
                nearEnd ? 'animate-saju-cta-glow' : ''
              }`}
            >
              <MessageSquarePlus size={16} />
              <span className="break-keep">{t('feedback')}</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={onFeedbackHistory}
              aria-label="feedback history"
              whileTap={{ scale: 0.98 }}
              className="flex h-[52px] items-center justify-center rounded-xl border border-[#262A38] bg-transparent px-4 text-[#A69F8D]"
            >
              <History size={16} />
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}
