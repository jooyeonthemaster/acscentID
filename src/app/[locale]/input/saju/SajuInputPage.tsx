'use client'

// ============================================================
// 사주 문진 위저드 셸 (UI-SPEC §3.0)
// 페이즈 머신: gate → purpose → birth → (partner) → wish → seal
// 먹색 자정 배경 + 금 파티클 + 금실 진행(ProgressThread) + 한지 넘김 전환
// 모드 계약(온/오프라인·PIN·AuthModal·QR 가드)은 useSajuForm이 이행한다.
// ============================================================

import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { Header } from '@/components/layout/Header'
import { AuthModal } from '@/components/auth/AuthModal'
import Image from 'next/image'
import { CloudRidge, ProgressThread, SAJU_EASE_INK } from '@/components/saju'

import { useSajuForm } from './hooks/useSajuForm'
import type { SajuPhase } from './constants'
import {
    GatePhase,
    PurposePhase,
    BirthPhase,
    PartnerPhase,
    WishPhase,
    SealPhase,
    SajuAnalyzingOverlay,
    GoldDust,
} from './components'

export default function SajuInputPage() {
    const searchParams = useSearchParams()
    const t = useTranslations()
    const tNav = useTranslations('saju.input.nav')
    const tSeal = useTranslations('saju.input.seal')

    const {
        phase,
        phaseIndex,
        progressSteps,
        formData,
        setFormData,
        isCompat,
        isSealing,
        isSubmitting,
        isAnalysisComplete,
        chartSnapshot,
        isOnline,
        showAuthGate,
        isPhaseValid,
        handleNext,
        handlePrev,
        handleSeal,
        navigateToResult,
    } = useSajuForm()

    // 로그인 후 복귀 경로 — 현재 쿼리 파라미터 전부 보존
    const authRedirectPath = `/input?${searchParams.toString()}`

    const nextLabel = (() => {
        switch (phase) {
            case 'gate': return tNav('toPurpose')
            case 'purpose': return tNav('toBirth')
            case 'birth': return isCompat ? tNav('toPartner') : tNav('toWish')
            case 'partner': return tNav('toWish')
            case 'wish': return tNav('toSeal')
            case 'seal': return tSeal('submit')
        }
    })()

    const isSealPhase = phase === 'seal'
    const nextDisabled = !isPhaseValid(phase) || isSealing || isSubmitting
    const onNext = isSealPhase ? handleSeal : handleNext

    const renderPhase = (current: SajuPhase) => {
        switch (current) {
            case 'gate':
                return <GatePhase formData={formData} setFormData={setFormData} isOnline={isOnline} />
            case 'purpose':
                return <PurposePhase formData={formData} setFormData={setFormData} />
            case 'birth':
                return <BirthPhase formData={formData} setFormData={setFormData} />
            case 'partner':
                return <PartnerPhase formData={formData} setFormData={setFormData} />
            case 'wish':
                return <WishPhase formData={formData} setFormData={setFormData} onSkip={handleNext} />
            case 'seal':
                return <SealPhase formData={formData} setFormData={setFormData} isOnline={isOnline} isSealing={isSealing} />
        }
    }

    return (
        <div className="saju-ink-grain min-h-screen bg-[#0C0E16]">
            {/* 분석 의식 오버레이 (§4) */}
            <SajuAnalyzingOverlay
                isVisible={isSubmitting}
                userName={formData.name.trim()}
                targetType={formData.targetType}
                chart={chartSnapshot}
                isComplete={isAnalysisComplete}
                onDoorOpened={navigateToResult}
            />

            {/* 금 파티클 고정 레이어 (count 12 — §3.0) */}
            <div className="pointer-events-none fixed inset-0">
                <GoldDust count={12} />
            </div>

            {/* 운문 — 자정 하늘 아래 구름 능선 (상품 아트 모티프, SAJU_CLOUDS).
                하단 내비 바(z-50)가 아랫단을 덮으므로 초저대비 실루엣만 남긴다. */}
            <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0">
                <CloudRidge tone="raised" strokeOpacity={0.12} fillOpacity={0.7} style={{ height: 96 }} />
            </div>

            {/* 전역 크롬 — 사주 다크 테마로 재스킨 */}
            <Header showBack backHref="back" compact dark />

            <div className="relative mx-auto min-h-screen w-full max-w-[455px]">
                {/* compact 헤더 높이 여백 */}
                <div className="h-14 flex-shrink-0" />

                {/* 프로그램 명패 (전 페이즈 공통) — 사주 분석 낙관 로고 */}
                <div className="flex items-center justify-center gap-2.5 pb-1 pt-4">
                    <Image
                        src="/images/saju/saju-logo.png"
                        alt={t('saju.common.programName')}
                        width={40}
                        height={40}
                        className="h-10 w-10 select-none object-contain"
                        priority
                    />
                    <span className="font-serif-kr text-[11px] font-semibold leading-[1.4] tracking-[0.14em] text-[#A69F8D]">
                        {t('saju.common.programName')}
                    </span>
                </div>

                {/* 금실 진행 (§2.8) */}
                <div className="px-6 pt-2">
                    <ProgressThread steps={progressSteps} currentIndex={phaseIndex} />
                </div>

                {/* 페이즈 콘텐츠 — 한지 넘김 전환 (§3.0) */}
                <main className="relative z-10 px-6 pb-40 pt-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={phase}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12, transition: { duration: 0.35 } }}
                            transition={{ duration: 0.8, ease: SAJU_EASE_INK, delay: 0.15 }}
                        >
                            {renderPhase(phase)}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* 하단 내비게이션 바 (§3.0 — 사주 스킨 자체 구현) */}
            <div className="fixed inset-x-0 bottom-0 z-50">
                <div
                    className="mx-auto w-full max-w-[455px] border-t border-[#262A38] bg-[#12141D]/95 px-6 py-4 backdrop-blur"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
                >
                    <div className="flex items-center gap-4">
                        {phaseIndex > 0 && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={isSealing || isSubmitting}
                                className="font-serif-kr flex-shrink-0 px-2 py-3 text-[14px] text-[#A69F8D]"
                            >
                                {tNav('prev')}
                            </button>
                        )}
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={onNext}
                            disabled={nextDisabled}
                            className={`font-serif-kr h-[52px] flex-1 rounded-lg text-[16px] font-semibold transition-colors duration-300 ${
                                nextDisabled
                                    ? 'bg-[#1E2129] text-[#5C564A]'
                                    : 'bg-[#C0392B] text-[#F5EFE2] ring-1 ring-[#C9A227]/40'
                            }`}
                        >
                            {nextLabel}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* 비회원 차단 게이트 — 전 모드 로그인 필수 (maps/input-flow.md §6) */}
            {/* 온라인 모드에 오프라인 전용 카피(qrLogin*)가 노출되지 않도록 분기 */}
            <AuthModal
                isOpen={showAuthGate}
                onClose={() => {}}
                closeable={false}
                showGuestOption={false}
                title={isOnline ? t('saju.input.authGate.onlineTitle') : t('auth.qrLoginTitle')}
                description={isOnline ? t('saju.input.authGate.onlineDescription') : t('auth.qrLoginDescription')}
                redirectPath={authRedirectPath}
            />
        </div>
    )
}
