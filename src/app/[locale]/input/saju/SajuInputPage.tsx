'use client'

// ============================================================
// 사주 문진 위저드 셸 (UI-SPEC §3.0)
// 페이즈 머신: gate → purpose → birth → (partner) → wish → seal
// 먹색 자정 배경 + 금 파티클 + 금실 진행(ProgressThread) + 한지 넘김 전환
// 모드 계약(온/오프라인·PIN·AuthModal·QR 가드)은 useSajuForm이 이행한다.
//
// 뷰포트 분기(ViewportSwitch):
//  - 모바일(<1024px): 기존 455px 셸 그대로 (JSX 무수정 검증 대상)
//  - 데스크탑(lg+): 2패널 — 좌측 레일(낙관 명패 + 한자 매듭 세로 페이즈 목록
//    + 완료 입력 요약) + 우측 패널(페이즈 본문 + 인라인 내비)
//  - 싱글톤(오버레이/금 파티클/운문/AuthModal)은 ViewportSwitch 바깥
//    페이지 루트에 1개만 — 기존 DOM 페인트 순서를 그대로 유지한다.
// ============================================================

import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'

import { Header } from '@/components/layout/Header'
import { AuthModal } from '@/components/auth/AuthModal'
import Image from 'next/image'
import { CloudRidge, ProgressThread, SAJU_EASE_INK, HOUR_BRANCHES } from '@/components/saju'
import { ViewportSwitch } from '@/components/desktop/ViewportSwitch'

import { useSajuForm } from './hooks/useSajuForm'
import {
    SAJU_PURPOSE_HANJA,
    isBirthFieldsValid,
    type SajuBirthFieldsState,
    type SajuPhase,
} from './constants'
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
    const tBirth = useTranslations('saju.input.birth')
    const tPurpose = useTranslations('saju.input.purpose')
    const tPartner = useTranslations('saju.input.partner')

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

    // 페이즈 본문 — 한지 넘김 전환 (§3.0). 모바일/데스크탑 두 트리가 동일 JSX를 공유
    // (하이드레이션 후 ViewportSwitch가 한쪽만 마운트한다)
    const phaseContent = (
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
    )

    // ---------- 데스크탑 레일 표시 전용 포맷 ----------
    // SealPhase(단자 요약)의 birthDisplayOf/sijinOf/genderDisplay와 동일한
    // 번역 키·표기 규칙을 그대로 따른다(SealPhase는 컴포넌트 내부 클로저라
    // import 불가 — 표기 계약만 미러링, 새 문구 없음).

    // 한자 병기 토큰('진시(辰時)')이 여는 괄호 앞에서 줄바꿈되지 않도록 word-joiner(U+2060)로 묶는다
    const glueParens = (v: string): string => v.replace(/\(/g, '⁠(')

    const sijinOf = (fields: SajuBirthFieldsState): string => {
        // '시(時) 미상'이 줄 끝에서 갈라지지 않도록 non-breaking space로 묶는다
        if (fields.timeUnknown || fields.hourBranch === null)
            return tSeal('timeUnknownDisplay').replace(/ /g, ' ')
        const branch = HOUR_BRANCHES[fields.hourBranch]
        return glueParens(`${branch.ji}시(${branch.hanja}時)`)
    }

    const birthDisplayOf = (fields: SajuBirthFieldsState): string => {
        const isLunar = fields.calendar === 'lunar'
        const cal = isLunar ? tBirth('calendarLunar') : tBirth('calendarSolar')
        const calDisplay = isLunar && fields.isLeapMonth ? `${cal} ${tSeal('leapDisplay')}` : cal
        return `${fields.birthYear}${tBirth('yearSuffix')} ${Number(fields.birthMonth)}${tBirth('monthSuffix')} ${Number(fields.birthDay)}${tBirth('daySuffix')} (${calDisplay}) · ${sijinOf(fields)}`
    }

    const genderDisplay = (gender: string): string => {
        if (gender === 'male') return tSeal('genderDisplay.male')
        if (gender === 'female') return tSeal('genderDisplay.female')
        return tSeal('genderDisplay.other')
    }

    // 레일 페이즈 라벨 — 각 페이즈 PhaseHeader가 쓰는 title 키 재사용 (새 문구 없음)
    const phaseTitles: Record<SajuPhase, string> = {
        gate: t('saju.input.gate.title'),
        purpose: t('saju.input.purpose.title'),
        birth: t('saju.input.birth.title'),
        partner: t('saju.input.partner.title'),
        wish: t('saju.input.wish.title'),
        seal: t('saju.input.seal.title'),
    }

    // 완료 페이즈 아래 표시할 입력 요약값 (표시 전용 — seal 인라인 편집으로 값이
    // 비워질 수 있어 각 항목을 방어적으로 검증한다)
    const railValueOf = (key: SajuPhase): string | null => {
        switch (key) {
            case 'gate': {
                const name = formData.name.trim()
                const gender = formData.gender ? genderDisplay(formData.gender) : ''
                return [name, gender].filter(Boolean).join(' · ') || null
            }
            case 'purpose':
                return formData.purpose
                    ? `${SAJU_PURPOSE_HANJA[formData.purpose]} — ${tPurpose(`options.${formData.purpose}.label`)}`
                    : null
            case 'birth':
                return isBirthFieldsValid(formData) ? birthDisplayOf(formData) : null
            case 'partner':
                return isCompat && formData.partner.relation && isBirthFieldsValid(formData.partner)
                    ? `${formData.partner.name.trim()} · ${tPartner(`relations.${formData.partner.relation}`)} · ${birthDisplayOf(formData.partner)}`
                    : null
            case 'wish': {
                const wish = formData.wish.trim()
                if (!wish) return null
                return wish.length > 20 ? `${wish.slice(0, 20)}…` : wish
            }
            case 'seal':
                return null
        }
    }

    // ===== 모바일 트리 (<1024px) — 기존 455px 셸 그대로 =====
    const mobileWizard = (
        <>
            {/* 전역 크롬 — 사주 다크 테마로 재스킨 */}
            <Header showBack backHref="back" compact dark />

            <div className="relative mx-auto min-h-[100dvh] w-full max-w-[455px]">
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
                    {phaseContent}
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
        </>
    )

    // ===== 데스크탑 트리 (lg+) — 2패널, 사주 스킨 =====
    // 루트 캔버스(saju-ink-grain + bg-[#0C0E16])는 ViewportSwitch 바깥 페이지
    // 루트가 공유하므로 여기서 다시 칠하지 않는다(그레인 이중 적용 방지).
    const desktopWizard = (
        // pt: 고정 데스크탑 헤더(84px) 아래로 콘텐츠 시작
        <div className="relative z-10 mx-auto grid w-full max-w-[1020px] grid-cols-[320px_minmax(0,1fr)] gap-12 px-8 pb-16 pt-[116px]">
            {/* 좌측 레일 — 뒤로가기 + 낙관 명패 + 한자 매듭 세로 페이즈 목록 */}
            <aside className="sticky top-[116px] self-start">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        aria-label={t('buttons.prev')}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#262A38] text-[#A69F8D] transition-colors hover:border-[#3A4051] hover:text-[#E9E2D0]"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    {/* 프로그램 명패 — 모바일 셸의 낙관 로고 블록과 동일 마크업 */}
                    <div className="flex items-center gap-2.5">
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
                </div>

                {/* 세로 페이즈 목록 — ProgressThread의 한자 매듭을 세로 실로 푼다 */}
                <ol className="mt-10">
                    {progressSteps.map((step, i) => {
                        const state = i < phaseIndex ? 'done' : i === phaseIndex ? 'now' : 'todo'
                        const value = state === 'done' ? railValueOf(step.key) : null
                        return (
                            <li key={step.key} className="relative pb-6 pl-9 last:pb-0">
                                {/* 세로 금실 — 완료 구간만 금(#C9A227/40), 이후는 헤어라인 */}
                                {i < progressSteps.length - 1 && (
                                    <span
                                        aria-hidden
                                        className={`absolute bottom-1 left-[11.5px] top-7 w-px ${
                                            state === 'done' ? 'bg-[#C9A227]/40' : 'bg-[#262A38]'
                                        }`}
                                    />
                                )}
                                {/* 한자 매듭 — 완료: 금 채움 / 현재: 금 테 / 미래: 딤(#3A4051) */}
                                <span
                                    aria-hidden
                                    className={`font-serif-kr absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold leading-none ${
                                        state === 'done'
                                            ? 'bg-[#C9A227] text-[#0C0E16]'
                                            : state === 'now'
                                                ? 'border border-[#C9A227] bg-[#0C0E16] text-[#E9E2D0]'
                                                : 'border border-[#3A4051] bg-[#0C0E16] text-[#3A4051]'
                                    }`}
                                >
                                    {step.hanja}
                                </span>
                                <span
                                    className={`font-serif-kr break-keep block pt-[3px] text-[14px] leading-tight ${
                                        state === 'now'
                                            ? 'font-semibold text-[#E9E2D0]'
                                            : state === 'done'
                                                ? 'text-[#A69F8D]'
                                                : 'text-[#5C564A]'
                                    }`}
                                >
                                    {phaseTitles[step.key]}
                                </span>
                                {value && (
                                    <p className="font-serif-kr mt-1 truncate text-[12px] leading-snug text-[#8B8578]">
                                        {value}
                                    </p>
                                )}
                            </li>
                        )
                    })}
                </ol>
            </aside>

            {/* 우측 패널 — 페이즈 본문 + 인라인 내비 */}
            <section className="min-w-0">
                {/* 패널 내부 배경은 정확히 #0C0E16 이어야 한다 — WheelDatePicker의
                    상·하 페이드 그라데이션(PAGE_BG)이 #0C0E16을 하드코딩하고 있어
                    다른 색을 깔면 휠 가장자리에 이음선이 생긴다. */}
                <div className="max-w-[560px] rounded-[12px] border border-[#262A38] bg-[#0C0E16] p-8">
                    {phaseContent}

                    {/* 인라인 내비 — 모바일 고정 바와 동일한 라벨/비활성/핸들러 계약 */}
                    <div className="mt-10 flex items-center gap-4 border-t border-[#262A38] pt-6">
                        {phaseIndex > 0 && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={isSealing || isSubmitting}
                                className="font-serif-kr flex flex-shrink-0 items-center gap-1 px-2 py-3 text-[14px] text-[#A69F8D] transition-colors hover:text-[#E9E2D0]"
                            >
                                <ArrowLeft size={15} />
                                {tNav('prev')}
                            </button>
                        )}
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={onNext}
                            disabled={nextDisabled}
                            className={`font-serif-kr h-[52px] flex-1 rounded-[12px] text-[16px] font-semibold transition-colors duration-300 ${
                                nextDisabled
                                    ? 'cursor-not-allowed bg-[#1E2129] text-[#5C564A]'
                                    : 'bg-[#C0392B] text-[#F5EFE2] ring-1 ring-[#C9A227]/40'
                            }`}
                        >
                            {nextLabel}
                        </motion.button>
                    </div>
                </div>
            </section>
        </div>
    )

    return (
        <div className="saju-ink-grain min-h-[100dvh] bg-[#0C0E16]">
            {/* 분석 의식 오버레이 (§4) — 뷰포트 모드 무관 단일 인스턴스 */}
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

            <ViewportSwitch mobile={mobileWizard} desktop={desktopWizard} />

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
