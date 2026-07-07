'use client'

// ============================================================
// SajuAnalyzingOverlay — 괘를 뽑는 의식 (UI-SPEC §4 스토리보드)
//  0.0–1.0  페이드인 + 만세력 책 실루엣 + 헤드라인
//  1.0–4.6  페이지 넘김 3회 (갑자·연도 잔상) → 책 침잠
//  4.6–12.0 8패 순차 플립 — 계산된 실제 팔자 글자 (삼주면 6패 + unknown 2패)
// 12.0–13.2 원국 도킹(상단 1/3) + 헤드라인 크로스페이드
// 13.2–     ElementRing 앰비언트 + 명리 격언 로테이션
// 완료      금실 100% → 開 낙관 → 족자 봉 등장 → 화폭 말려 올라감 → onDoorOpened
// chart가 null이면 패/링 없이 우아하게 저하(책+격언+진행 실만).
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { SajuChartSnapshot } from '@/types/analysis'
import {
    ElementRing,
    GanjiTile,
    SealStamp,
    SAJU_EASE_BRUSH,
    SAJU_EASE_INK,
    SAJU_GOLD_GRADIENT,
} from '@/components/saju'
import { GoldDust } from './SajuAtoms'
import {
    BookSilhouette,
    GHOST_GANJI,
    KNOT_PCTS,
    KNOT_TIMES_MS,
    TILE_FLIP_INTERVAL,
    tilesOf,
    type TileDatum,
} from './SajuOverlayParts'

export interface SajuAnalyzingOverlayProps {
    isVisible: boolean
    userName: string
    targetType: 'idol' | 'self'
    /** 계산된 실제 팔자 — 패에 그대로 사용 (null = 우아한 저하) */
    chart: SajuChartSnapshot | null
    isComplete?: boolean
    /** 족자 전환 완료 시점 호출 (계약 이름 유지) */
    onDoorOpened?: () => void
}

export function SajuAnalyzingOverlay({
    isVisible,
    userName,
    targetType,
    chart,
    isComplete = false,
    onDoorOpened,
}: SajuAnalyzingOverlayProps) {
    const t = useTranslations('saju.analyzing')
    const reduce = useReducedMotion()

    // 타임라인 상태
    const [bookFlips, setBookFlips] = useState(0) // 페이지 넘김 트리거 (1..3)
    const [bookSunk, setBookSunk] = useState(false)
    const [tilesRevealed, setTilesRevealed] = useState(false)
    const [unknownShown, setUnknownShown] = useState(false)
    const [docked, setDocked] = useState(false)
    const [quotesOn, setQuotesOn] = useState(false)
    const [quoteIndex, setQuoteIndex] = useState(0)
    const [knotPhase, setKnotPhase] = useState(0) // 0..3 통과한 매듭 수
    // 족자 전환 단계: idle → seal(開) → rod(봉 등장) → roll(말림)
    const [scrollStage, setScrollStage] = useState<'idle' | 'seal' | 'rod' | 'roll'>('idle')
    const doorOpenedRef = useRef(false)

    // 격언 — 셔플 시작 (§4.3). 렌더 순수성을 위해 이름 시드 결정적 셔플.
    const quotes = useMemo(() => {
        const raw = (t.raw('quotes') as string[]) ?? []
        let seed = 7
        for (let i = 0; i < userName.length; i += 1) {
            seed = (seed * 31 + userName.charCodeAt(i)) % 997
        }
        const arr = [...raw]
        for (let i = arr.length - 1; i > 0; i -= 1) {
            seed = (seed * 9301 + 49297) % 233280
            const j = seed % (i + 1)
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        return arr
    }, [t, userName])

    const { known: knownTiles, unknownCount } = useMemo(
        () => (chart ? tilesOf(chart) : { known: [] as TileDatum[], unknownCount: 0 }),
        [chart]
    )

    // ---------- 타임라인 (isVisible 동안 1회) ----------
    useEffect(() => {
        if (!isVisible) return
        const timers: number[] = []
        const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))

        if (reduce) {
            // reduced-motion: 즉시 정적 최종 상태 (마이크로태스크로 미뤄 렌더 캐스케이드 방지)
            at(0, () => {
                setBookFlips(3)
                setBookSunk(true)
                setTilesRevealed(true)
                setUnknownShown(true)
                setDocked(true)
                setQuotesOn(true)
            })
        } else {
            at(1000, () => setBookFlips(1))
            at(2200, () => setBookFlips(2))
            at(3400, () => setBookFlips(3))
            at(4600, () => {
                setBookSunk(true)
                setTilesRevealed(true)
            })
            at(11000, () => setUnknownShown(true))
            at(12000, () => setDocked(true))
            at(13200, () => setQuotesOn(true))
        }

        KNOT_TIMES_MS.forEach((ms, i) => at(ms, () => setKnotPhase(i + 1)))

        return () => timers.forEach((id) => window.clearTimeout(id))
    }, [isVisible, reduce])

    // 격언 로테이션 (4s 간격)
    useEffect(() => {
        if (!quotesOn || quotes.length === 0) return
        const interval = window.setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % quotes.length)
        }, 4000)
        return () => window.clearInterval(interval)
    }, [quotesOn, quotes.length])

    // ---------- 완료 → 족자 전환 (§4.5) ----------
    useEffect(() => {
        if (!isComplete || !isVisible) return

        const timers: number[] = []
        const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
        at(0, () => setKnotPhase(3))

        if (reduce) {
            // 1.2s 크로스페이드 대체
            at(0, () => setScrollStage('roll'))
            at(1200, () => {
                if (!doorOpenedRef.current) {
                    doorOpenedRef.current = true
                    onDoorOpened?.()
                }
            })
            return () => timers.forEach((id) => window.clearTimeout(id))
        }

        // 실 100% 채움 0.6s 후 시작
        at(600, () => setScrollStage('seal'))
        at(1100, () => setScrollStage('rod'))
        at(1500, () => setScrollStage('roll'))
        at(3100, () => {
            if (!doorOpenedRef.current) {
                doorOpenedRef.current = true
                onDoorOpened?.()
            }
        })
        return () => timers.forEach((id) => window.clearTimeout(id))
    }, [isComplete, isVisible, reduce, onDoorOpened])

    // 오버레이 표시 중 뒷페이지 스크롤 잠금 (스크롤바 갭·배경 스크롤 방지)
    useEffect(() => {
        if (!isVisible) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [isVisible])

    if (!isVisible) return null

    const headlineEarly = targetType === 'idol'
        ? t('headlineIdol', { name: userName })
        : t('headline', { name: userName })
    const showLate = docked
    const dimmed = scrollStage !== 'idle'
    const isRolling = scrollStage === 'roll'
    const knotLabels = [t('knots.calc'), t('knots.read'), t('knots.blend')]
    const activeKnot = Math.min(knotPhase, 2)

    return (
        <div className="fixed inset-0 z-[99999]">
            {/* 화폭(두루마리) — 족자 말림 시 아래에서 위로 걷힌다 */}
            <motion.div
                className="saju-ink-grain absolute inset-0 overflow-hidden bg-[#0C0E16]"
                initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                animate={
                    reduce
                        ? { opacity: isRolling ? 0 : 1 }
                        : { opacity: 1, clipPath: isRolling ? 'inset(0 0 100% 0)' : 'inset(0 0 0% 0)' }
                }
                transition={
                    reduce
                        ? { duration: 1.2 }
                        : isRolling
                            ? { clipPath: { duration: 1.6, ease: SAJU_EASE_BRUSH } }
                            : { opacity: { duration: 1.0, ease: SAJU_EASE_INK } }
                }
            >
                <GoldDust count={24} />

                <div className="relative mx-auto flex h-full max-w-[455px] flex-col items-center justify-center px-8">
                    {/* 헤드라인 */}
                    <motion.div
                        className="absolute inset-x-8 top-[10%] text-center"
                        animate={{ opacity: dimmed ? 0.3 : 1 }}
                        transition={{ duration: 0.4 }}
                        role="status"
                        aria-live="polite"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={showLate ? 'late' : 'early'}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8, ease: SAJU_EASE_INK }}
                            >
                                <p className="font-serif-kr break-keep text-[20px] font-semibold leading-[1.5] text-[#E9E2D0]">
                                    {showLate ? t('headlineLate') : headlineEarly}
                                </p>
                                {showLate && (
                                    <p className="font-serif-kr break-keep mt-2 text-[12px] leading-[1.6] text-[#A69F8D]">
                                        {t('subLate')}
                                    </p>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>

                    {/* 무대: 원국(패 그리드) + 만세력 책 */}
                    <motion.div
                        className="flex flex-col items-center"
                        animate={{
                            opacity: dimmed ? 0.3 : 1,
                            scale: docked ? 0.82 : 1,
                            y: docked ? -96 : 0,
                        }}
                        transition={{ duration: 1.2, ease: SAJU_EASE_INK }}
                    >
                        {/* 8패 4×2 (열 = 년월일시 좌→우, 간 위/지 아래) */}
                        {chart && (
                            <div className="mb-6 grid grid-flow-col grid-cols-4 grid-rows-2 gap-3">
                                {knownTiles.map((tile) => (
                                    <GanjiTile
                                        key={tile.key}
                                        hanja={tile.hanja}
                                        reading={tile.reading}
                                        element={tile.element}
                                        size="md"
                                        state={tilesRevealed ? 'revealed' : 'hidden'}
                                        flipDelay={tile.order * TILE_FLIP_INTERVAL}
                                    />
                                ))}
                                {/* 삼주(시간모름): 시주 2패는 unknown 상태로 fade-in만 (§4.1) */}
                                {unknownCount > 0 &&
                                    Array.from({ length: unknownCount }).map((_, i) => (
                                        <motion.div
                                            key={`unknown-${i}`}
                                            style={{ width: 56, height: 78 }}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: unknownShown ? 1 : 0 }}
                                            transition={{ duration: 0.8, ease: SAJU_EASE_INK }}
                                        >
                                            {unknownShown && (
                                                <GanjiTile hanja="時" reading="" element="토" size="md" state="unknown" />
                                            )}
                                        </motion.div>
                                    ))}
                            </div>
                        )}

                        {/* 만세력 책 + 페이지 넘김 3회 */}
                        <motion.div
                            className="relative"
                            style={{ perspective: 800 }}
                            animate={{ opacity: bookSunk ? 0.25 : 1, y: bookSunk ? 12 : 0 }}
                            transition={{ duration: 0.8, ease: SAJU_EASE_INK }}
                        >
                            <BookSilhouette />
                            {GHOST_GANJI.map((label, i) =>
                                bookFlips > i ? (
                                    <motion.div
                                        key={label}
                                        aria-hidden
                                        className="absolute left-1/2 top-[4px] flex h-[172px] w-[126px] items-center justify-center rounded-[2px] border border-[#262A38] bg-[#14161F]"
                                        style={{ transformOrigin: 'left center' }}
                                        initial={{ rotateY: 0, opacity: 1 }}
                                        animate={{ rotateY: -160, opacity: [1, 1, 0] }}
                                        transition={{
                                            rotateY: { duration: 0.9, ease: SAJU_EASE_BRUSH },
                                            opacity: { duration: 0.9, times: [0, 0.85, 1] },
                                        }}
                                    >
                                        <span
                                            className="font-serif-kr text-[15px] font-semibold text-[#C9A227]"
                                            style={{ filter: 'blur(2px)', opacity: 0.3 }}
                                        >
                                            {label}
                                        </span>
                                    </motion.div>
                                ) : null
                            )}
                        </motion.div>
                    </motion.div>

                    {/* 대기 루프: ElementRing 앰비언트 (점화는 결과 페이지의 것 — 여기서 소진 금지) */}
                    {chart && (
                        <motion.div
                            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[38%]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: quotesOn && !dimmed ? 1 : quotesOn && dimmed ? 0.3 : 0 }}
                            transition={{ duration: 0.8, ease: SAJU_EASE_INK }}
                        >
                            {quotesOn && (
                                <ElementRing
                                    counts={chart.elementCount}
                                    yongsin={chart.yongsin.element}
                                    size={180}
                                />
                            )}
                        </motion.div>
                    )}

                    {/* 격언 로테이션 */}
                    <motion.div
                        className="absolute inset-x-8 bottom-[130px] text-center"
                        animate={{ opacity: dimmed ? 0.3 : 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <AnimatePresence mode="wait">
                            {quotesOn && quotes.length > 0 && (
                                <motion.p
                                    key={quoteIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, transition: { duration: 0.4 } }}
                                    transition={{ duration: 0.8, ease: SAJU_EASE_INK }}
                                    className="font-serif-kr break-keep text-[15px] leading-[1.85] text-[#A69F8D]"
                                >
                                    <span aria-hidden className="mr-1.5 text-[#C9A227]">·</span>
                                    {quotes[quoteIndex]}
                                    <span aria-hidden className="ml-1.5 text-[#C9A227]">·</span>
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* 진행 표시 — 금실 채움 + 매듭 3개 (§4.4) */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)' }}
                    >
                        <div className="relative" style={{ width: 240 }}>
                            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#262A38]" />
                            <motion.div
                                aria-hidden
                                className="absolute left-0 top-[-0.25px]"
                                style={{ height: 1.5, background: SAJU_GOLD_GRADIENT }}
                                initial={{ width: '0%' }}
                                animate={{ width: isComplete ? '100%' : '90%' }}
                                transition={
                                    isComplete
                                        ? { duration: 0.6, ease: SAJU_EASE_BRUSH }
                                        : { duration: 28, ease: SAJU_EASE_BRUSH }
                                }
                            />
                            {KNOT_PCTS.map((pct, i) => {
                                const passed = knotPhase > i
                                const isActive = activeKnot === i
                                return (
                                    <div key={pct} className="absolute" style={{ left: `${pct}%`, top: 0.75 }}>
                                        <div
                                            className={`-translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500 ${
                                                passed ? 'bg-[#C9A227]' : 'border border-[#262A38] bg-[#0C0E16]'
                                            }`}
                                            style={{ width: passed ? 7 : 6, height: passed ? 7 : 6 }}
                                        />
                                        <span
                                            className={`font-serif-kr absolute left-0 top-2.5 -translate-x-1/2 whitespace-nowrap text-[10px] leading-none transition-colors duration-500 ${
                                                isActive ? 'text-[#C9A227]' : 'text-[#5C564A]'
                                            }`}
                                        >
                                            {knotLabels[i]}
                                        </span>
                                    </div>
                                )
                            })}
                            <span className="absolute -right-1 top-2.5 translate-x-full font-sans text-[9px] leading-none text-[#5C564A]">
                                {t('eta')}
                            </span>
                        </div>
                    </div>

                    {/* 완료 낙인 — 開 (§4.5 1단계) */}
                    <AnimatePresence>
                        {dimmed && !reduce && (
                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                <SealStamp chars="開" size="xl" tone="cinnabar" stamped />
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* 족자 봉 — 화폭 밖 형제 레이어 (클립에 걸리지 않고 말림 경계와 동행 상승) */}
            {!reduce && (scrollStage === 'rod' || scrollStage === 'roll') && (
                <motion.div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 mx-auto max-w-[455px]"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{
                        y: isRolling ? '-100vh' : 0,
                        opacity: 1,
                    }}
                    transition={
                        isRolling
                            ? { y: { duration: 1.6, ease: SAJU_EASE_BRUSH }, opacity: { duration: 0.2 } }
                            : { duration: 0.4, ease: SAJU_EASE_INK }
                    }
                >
                    {/* 말리는 경계 그림자 밴드 (봉 바로 아래) */}
                    <div
                        className="absolute inset-x-0 top-full h-2"
                        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5), transparent)' }}
                    />
                    <div className="relative">
                        <div
                            className="h-[18px] w-full"
                            style={{ background: 'linear-gradient(180deg, #2A2416 0%, #4A3F22 50%, #2A2416 100%)' }}
                        />
                        {/* 양끝 금 마구리 — 셸 밖 6px 돌출 */}
                        {(['left', 'right'] as const).map((side) => (
                            <div
                                key={side}
                                className="absolute top-1/2 -translate-y-1/2 rounded-full"
                                style={{
                                    [side]: -6,
                                    width: 26,
                                    height: 26,
                                    background: SAJU_GOLD_GRADIENT,
                                }}
                            />
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
