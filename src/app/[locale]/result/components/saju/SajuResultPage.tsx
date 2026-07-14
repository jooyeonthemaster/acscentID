'use client';

// ============================================================
// 사주 결과 페이지 셸 — 「자정의 조향소」 두루마리 (UI-SPEC §5.0)
// - /result?type=saju 전용 풀페이지(탭 없음, 章 세로 스크롤 서사).
// - 배경: bg-[#0C0E16] + .saju-ink-grain + 전역 GoldDust(count 14) 1개만.
//   (기존 키치 블롭/bg-noise는 사주 월드에서 금지 — §1.0)
// - 데이터: useResultData(localStorage + ?id= DB 재열람 + 로케일 번역 파이프라인 공용).
// - 저장: useAutoSave — product_type 'saju_perfume', 사진 없음(userImage null).
// - 모달(Share/Feedback/History/Auth) 와이어링은 ResultPageMain과 동일, 스킨 변경 없음.
// - 섹션 순서: 序 → 一 → 二 → 三 → 四 → 五 → 終 → 처방 → 하단 바.
//   (四/五/終/처방/하단 바는 동시 작업 중인 섹션 에이전트 소유 — sections/types.ts 계약)
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useResultData } from '../../hooks/useResultData';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useAuth } from '@/contexts/AuthContext';
import { useProductPricing } from '@/hooks/useProductPricing';
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes';

import { Header } from '@/components/layout/Header';
import { AuthModal } from '@/components/auth/AuthModal';
import { ShareModal } from '../ShareModal';
import { FeedbackModal } from '../FeedbackModal';
import { FeedbackHistory } from '../feedback/FeedbackHistory';
import Image from 'next/image';
import { SealStamp } from '@/components/saju';

import type { SajuAnalysisResult } from '@/types/analysis';
import { GoldDust } from './GoldDust';
import { PrologueStars } from './sections/PrologueStars';
import { ChapterMyeongsik } from './sections/ChapterMyeongsik';
import { ChapterIlgan } from './sections/ChapterIlgan';
import { ChapterElementFlow } from './sections/ChapterElementFlow';
// ↓ 동시 작업 중인 섹션 에이전트가 같은 폴더에 정확히 이 파일명으로 만든다 (sections/types.ts 계약)
import { ChapterPurpose } from './sections/ChapterPurpose';
import { ChapterYongsin } from './sections/ChapterYongsin';
import { ChapterReveal } from './sections/ChapterReveal';
import { Prescription } from './sections/Prescription';
import { SajuBottomActions } from './SajuBottomActions';

// ── 섹션 명암 교차 밴드 (§5.0 보강) ─────────────────────────────
// 산문 챕터마다 밴드 색을 번갈아 줘서 모든 섹션이 구분되게 한다.
//  - 'raised'(一·三): 페이지보다 한 톤 밝은 먹색
//  - 'deep'  (二·四): 페이지보다 한 톤 깊은 먹색
// → 序(먹색)·一(밝음)·二(깊음)·三(밝음)·四(깊음)·五·終(먹색)의 밝음/깊음 교차 리듬.
// 위·아래 경계는 페이지 먹색(#0C0E16)으로 그라데이션 페이드해 색이 자연스럽게 섞이게 한다.
// ★ 되돌리기: 아래 플래그를 false로 두면 전 섹션이 이전과 동일한 먹색(#0C0E16)으로 렌더된다.
const SAJU_SECTION_BANDS = true;

function SectionBand({
  children,
  tone = 'raised',
}: {
  children: React.ReactNode;
  tone?: 'raised' | 'deep';
}) {
  if (!SAJU_SECTION_BANDS) return <>{children}</>;
  const bandBg = tone === 'deep' ? 'bg-[#08090F]' : 'bg-[#171C28]';
  return (
    <div className={`relative ${bandBg}`}>
      {/* 상단 경계 — 페이지 먹색 → 밴드색으로 자연스럽게 섞임 (섹션 py-24 여백 안) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24 bg-gradient-to-b from-[#0C0E16] to-transparent"
      />
      {children}
      {/* 하단 경계 — 밴드색 → 페이지 먹색 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-24 bg-gradient-to-t from-[#0C0E16] to-transparent"
      />
    </div>
  );
}

export default function SajuResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const locale = useLocale();
  const { user, unifiedUser, loading: authLoading } = useAuth();
  const { getOption, getDefaultPrice, getDefaultSize } = useProductPricing();
  const { getLocalizedName } = useLocalizedPerfumes();

  const fromPage = searchParams.get('from');
  const backHref = fromPage === 'mypage' ? '/mypage' : '/';

  // 序/五章의 useScroll(target)은 윈도우 스크롤 컨테이너(documentElement)를 기준으로
  // 진행도를 계산한다. 컨테이너가 position:static이면 framer-motion이 오프셋 계산
  // 경고를 내고 스크롤 바인딩(§5.1/§5.6)이 어긋날 수 있어, 머무는 동안만 relative로 둔다.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.position;
    root.style.position = 'relative';
    return () => {
      root.style.position = prev;
    };
  }, []);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isFeedbackHistoryOpen, setIsFeedbackHistoryOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const {
    loading,
    error,
    twitterName,
    userInfo,
    displayedAnalysis,
    existingResultId,
    idolName,
    serviceMode: loadedServiceMode,
    targetType,
  } = useResultData();

  // 사주 결과 검증 — sajuChart + sajuAnalysis가 없으면 사주 결과가 아니다(우아한 격하)
  const maybeSaju = displayedAnalysis as SajuAnalysisResult | null;
  const sajuResult = maybeSaju?.sajuChart && maybeSaju?.sajuAnalysis ? maybeSaju : null;

  // 서비스 모드 — ResultPageMain과 동일한 기본값 계약(로드 실패 시 offline)
  const serviceMode: 'online' | 'offline' = loadedServiceMode || 'offline';
  const userName = userInfo?.name || idolName || null;

  const topPerfume = sajuResult?.matchingPerfumes?.[0];
  const topPerfumeName = topPerfume?.perfumeId
    ? getLocalizedName(topPerfume.perfumeId, topPerfume.persona?.name)
    : topPerfume?.persona?.name;

  // 자동 저장 — 사주는 사진이 없으므로 userImage null, product_type은 saju_perfume 고정
  const {
    isSaved: isAutoSaved,
    isSaving: isAutoSaving,
    savedResultId,
    showLoginPrompt,
    setShowLoginPrompt,
  } = useAutoSave({
    analysisResult: sajuResult,
    userImage: null,
    twitterName,
    userId: user?.id || unifiedUser?.id || null,
    authLoading,
    existingResultId,
    idolName,
    idolGender: userInfo?.gender || null,
    productType: 'saju_perfume',
    pin: userInfo?.pin || null,
    targetType,
  });

  // 자동 저장 상태 pill — 저장 중엔 계속, 저장 완료 후 2.5초 뒤 자동으로 사라진다
  const [showSavePill, setShowSavePill] = useState(false);
  useEffect(() => {
    if (isAutoSaving) {
      setShowSavePill(true);
      return;
    }
    if (isAutoSaved) {
      setShowSavePill(true);
      const timer = setTimeout(() => setShowSavePill(false), 2500);
      return () => clearTimeout(timer);
    }
    setShowSavePill(false);
  }, [isAutoSaving, isAutoSaved]);

  const handleRestart = () => {
    localStorage.removeItem('analysisResult');
    localStorage.removeItem('userImage');
    localStorage.removeItem('savedResultId');
    router.push('/');
  };

  // 바로 구매 — checkout 계약(ResultPageMain과 동일 키)
  const handleCheckout = useCallback(() => {
    localStorage.setItem('checkoutProductType', 'saju_perfume');
    const analysisIdToSave = savedResultId || existingResultId;
    if (analysisIdToSave) {
      localStorage.setItem('checkoutAnalysisId', analysisIdToSave);
    }
    router.push('/checkout');
  }, [savedResultId, existingResultId, router]);

  // 장바구니 담기 — ResultPageMain 와이어링 복제(product_type saju_perfume)
  const handleAddToCart = useCallback(async () => {
    if (!sajuResult || isAddingToCart) return;

    if (!user && !unifiedUser) {
      setShowLoginPrompt(true);
      return;
    }

    setIsAddingToCart(true);

    try {
      const perfumeName = topPerfumeName || t('result.recommendedPerfume');
      const perfumeBrand = topPerfume?.persona?.recommendation || "AC'SCENT";
      const analysisId = savedResultId || existingResultId || `temp-${Date.now()}`;

      let cartSize = '50ml';
      const cartPrice =
        getOption('saju_perfume', '50ml')?.price ?? getDefaultPrice('saju_perfume') ?? 48000;
      if (!getOption('saju_perfume', '50ml')) {
        cartSize = getDefaultSize('saju_perfume');
      }

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          product_type: 'saju_perfume',
          perfume_name: perfumeName,
          perfume_brand: perfumeBrand,
          twitter_name: twitterName,
          size: cartSize,
          price: cartPrice,
          image_url: null,
          analysis_data: sajuResult,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/mypage?tab=cart');
      } else {
        alert(data.error || t('errors.cartAddFailed'));
      }
    } catch (err) {
      console.error('Add to cart error:', err);
      alert(t('errors.cartAddError'));
    } finally {
      setIsAddingToCart(false);
    }
  }, [
    sajuResult,
    isAddingToCart,
    user,
    unifiedUser,
    savedResultId,
    existingResultId,
    topPerfume,
    topPerfumeName,
    twitterName,
    router,
    setShowLoginPrompt,
    getOption,
    getDefaultPrice,
    getDefaultSize,
    t,
  ]);

  // 공유 — ResultPageMain 와이어링 복제.
  // 단 폴백 POST에는 productType/serviceMode/targetType/locale을 명시해
  // saju 결과가 image_analysis로 오저장되는 함정을 막는다.
  const handleShare = useCallback(async () => {
    if (!sajuResult) return;

    if (shareUrl) {
      setIsShareModalOpen(true);
      return;
    }

    if (savedResultId) {
      const newShareUrl = `${window.location.origin}/result/${savedResultId}`;
      setShareUrl(newShareUrl);
      setIsShareModalOpen(true);
      return;
    }

    setIsSaving(true);

    try {
      const perfumeName = topPerfumeName || t('result.recommendedPerfume');
      const perfumeBrand = topPerfume?.persona?.recommendation || "AC'SCENT";
      const fingerprint =
        typeof window !== 'undefined' ? localStorage.getItem('user_fingerprint') : null;

      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userImageUrl: null,
          analysisData: sajuResult,
          twitterName,
          perfumeName,
          perfumeBrand,
          matchingKeywords: sajuResult.matchingKeywords || [],
          userId: user?.id || unifiedUser?.id || null,
          userFingerprint: fingerprint,
          idolName,
          idolGender: userInfo?.gender || null,
          productType: 'saju_perfume',
          serviceMode,
          targetType,
          locale,
        }),
      });

      const data = await response.json();

      if (data.success && data.id) {
        const newShareUrl = `${window.location.origin}/result/${data.id}`;
        setShareUrl(newShareUrl);
      }

      setIsShareModalOpen(true);
    } catch (err) {
      console.error('Save error:', err);
      setIsShareModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  }, [
    sajuResult,
    shareUrl,
    savedResultId,
    topPerfume,
    topPerfumeName,
    twitterName,
    user,
    unifiedUser,
    idolName,
    userInfo,
    serviceMode,
    targetType,
    locale,
    t,
  ]);

  // ---------- 로딩 — 먹색 정적 대기(§1.0: 스피너 키치 금지) ----------
  if (loading) {
    return (
      <div className="saju-ink-grain relative flex min-h-screen flex-col items-center justify-center bg-[#0C0E16] px-8">
        <GoldDust count={12} className="absolute inset-0" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <Image
            src="/images/saju/saju-logo.png"
            alt={t('saju.common.programName')}
            width={72}
            height={72}
            className="h-[72px] w-[72px] select-none object-contain"
            priority
          />
          <p className="font-serif-kr break-keep text-center text-[15px] leading-[1.85] text-[#A69F8D]">
            {t('saju.result.loading')}
          </p>
        </div>
      </div>
    );
  }

  // ---------- 에러 / 사주 데이터 아님 ----------
  if (error || !sajuResult) {
    return (
      <div className="saju-ink-grain relative flex min-h-screen flex-col items-center justify-center bg-[#0C0E16] px-8">
        <div className="relative z-10 flex w-full max-w-[360px] flex-col items-center gap-6 text-center">
          <SealStamp chars="命" size="lg" tone="ink" />
          <h2 className="font-serif-kr break-keep text-[24px] font-semibold leading-[1.45] text-[#E9E2D0]">
            {t('errors.generic')}
          </h2>
          <p className="font-serif-kr break-keep text-[15px] leading-[1.85] text-[#A69F8D]">
            {error || t('saju.result.dataMissing')}
          </p>
          <button
            onClick={handleRestart}
            className="font-serif-kr h-[52px] w-full rounded-lg bg-[#C0392B] text-[16px] font-semibold text-[#F5EFE2]"
          >
            {t('result.goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="saju-ink-grain relative min-h-screen bg-[#0C0E16]">
      {/* 전역 금 파티클 — 페이지에 1개만(§5.10). 섹션 로컬 파티클은 終章 8개만 허용 */}
      <GoldDust count={14} className="fixed inset-0 z-0" />

      {/* 전역 크롬 — 사주 다크 테마로 재스킨 */}
      <Header showBack backHref={backHref} dark />

      {/* 자동 저장 상태 pill (기존 로직, 사주 스킨) — 저장 완료 후 2.5초 뒤 페이드아웃 */}
      <AnimatePresence>
        {showSavePill && (isAutoSaving || isAutoSaved) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed left-1/2 top-[88px] z-40 -translate-x-1/2"
          >
            <div className="flex items-center gap-1.5 rounded-full border border-[#262A38] bg-[#12141D]/95 px-3 py-1.5 backdrop-blur">
              {isAutoSaving ? (
                <>
                  <Loader2 size={11} className="animate-spin text-[#A69F8D]" />
                  <span className="font-serif-kr text-[11px] font-semibold text-[#A69F8D]">
                    {t('result.saving')}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={11} className="text-[#C9A227]" />
                  <span className="font-serif-kr text-[11px] font-semibold text-[#A69F8D]">
                    {t('result.saved')}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 두루마리 — 章 세로 서사 */}
      <main className="relative z-10">
        <div className="mx-auto w-full max-w-[455px]">
          {/* 序 — 밤하늘 (sticky #1) */}
          <PrologueStars result={sajuResult} targetType={targetType} locale={locale} />

          {/* 一章 — 원국 命式 (밝은 밴드) */}
          <SectionBand>
            <ChapterMyeongsik
              result={sajuResult}
              targetType={targetType}
              locale={locale}
              userName={userName}
            />
          </SectionBand>

          {/* 二章 — 일간 日干 (깊은 밴드) */}
          <SectionBand tone="deep">
            <ChapterIlgan result={sajuResult} targetType={targetType} locale={locale} />
          </SectionBand>

          {/* 三章 — 오행의 흐름 (밝은 밴드) */}
          <SectionBand>
            <ChapterElementFlow result={sajuResult} targetType={targetType} locale={locale} />
          </SectionBand>

          {/* 四章 — 소망의 운 (궁합 시 §5.5-B 대체) (깊은 밴드) */}
          <SectionBand tone="deep">
            <ChapterPurpose
              result={sajuResult}
              targetType={targetType}
              locale={locale}
              userName={userName ?? undefined}
            />
          </SectionBand>

          {/* 五章 — 용신의 계시 (sticky #2) */}
          <ChapterYongsin result={sajuResult} targetType={targetType} locale={locale} />

          {/* 終章 — 운명의 향 공개 */}
          <ChapterReveal result={sajuResult} targetType={targetType} locale={locale} />

          {/* 처방전 — 리츄얼 (크림 반전) */}
          <Prescription result={sajuResult} targetType={targetType} locale={locale} />

          {/* 하단 고정 바 클리어런스 (§0 계약) — 서명 블록에서 리포트가 끝나 보이도록 최소치(바 높이 ≈76px + 여유) */}
          <div className="pb-24" aria-hidden />
        </div>
      </main>

      {/* 하단 고정 액션 바 — 기존 계약, 사주 스킨(§5.8 S8) */}
      <SajuBottomActions
        onShare={handleShare}
        onAddToCart={handleAddToCart}
        onCheckout={handleCheckout}
        onFeedback={() => setIsFeedbackModalOpen(true)}
        onFeedbackHistory={() => setIsFeedbackHistoryOpen(true)}
        isShareSaving={isSaving}
        isAddingToCart={isAddingToCart}
        serviceMode={serviceMode}
      />

      {/* 공유 모달 — 공용 컴포넌트 그대로 */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        userImage={undefined}
        twitterName={twitterName}
        userName={userInfo?.name || t('result.anonymous')}
        userGender={userInfo?.gender || 'Unknown'}
        perfumeName={topPerfumeName || t('result.recommendedPerfume')}
        perfumeBrand={topPerfume?.persona?.recommendation || "AC'SCENT"}
        analysisData={sajuResult}
        shareUrl={shareUrl}
      />

      {/* 피드백 모달 (offline) — 공용 컴포넌트 + 사주 한지 스킨 */}
      {topPerfume && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          perfumeId={topPerfume.perfumeId || "AC'SCENT 01"}
          perfumeName={topPerfumeName || t('result.recommendedPerfume')}
          perfumeCharacteristics={
            topPerfume.persona?.categories || {
              citrus: 5,
              floral: 5,
              woody: 5,
              musky: 5,
              fruity: 5,
              spicy: 5,
            }
          }
          perfumeCategory={
            topPerfume.persona?.categories
              ? Object.entries(topPerfume.persona.categories).reduce(
                  (max, [key, val]) => (val > max.val ? { key, val } : max),
                  { key: 'floral', val: 0 }
                ).key
              : 'floral'
          }
          resultId={existingResultId || savedResultId || undefined}
          theme="saju"
        />
      )}

      {/* 피드백 히스토리 모달 */}
      <FeedbackHistory
        isOpen={isFeedbackHistoryOpen}
        onClose={() => setIsFeedbackHistoryOpen(false)}
        theme="saju"
      />

      {/* 로그인 유도 모달 (익명 사용자용) */}
      <AuthModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        title={t('result.saveLoginTitle')}
        description={t('result.saveLoginDesc')}
      />
    </div>
  );
}
