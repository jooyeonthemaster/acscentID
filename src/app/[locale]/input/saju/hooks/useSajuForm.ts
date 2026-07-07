"use client"

// ============================================================
// useSajuForm — 사주 문진 위저드 상태 머신 (UI-SPEC §3.0 / maps/input-flow.md)
// 모드 계약은 useInputForm.ts 를 그대로 이식한다:
//  - isOnline/isOffline 판별식, 오프라인 PIN, 비회원 AuthModal 게이트,
//  - QR 뒤로가기 루프 가드, useLocaleSwitchState 고유 storageKey,
//  - DAILY_ANALYSIS_LIMIT_EXCEEDED 처리, localStorage 결과 핸드오프.
// 제출: ① POST /api/saju/chart (오버레이 실제 팔자 글자용 — 실패 시
//        클라이언트 계산 폴백 → 그래도 실패면 chart=null 로 우아하게 저하)
//       ② POST /api/analyze/saju (SajuAnalyzeRequest — frozen 계약)
// ============================================================

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch } from "@/lib/api-client"
import { useLocaleSwitchState } from "@/hooks/useLocaleSwitchState"
import type { SajuAnalyzeRequest, SajuBirthInput, SajuChartSnapshot, SajuPillarSnapshot } from "@/types/analysis"
import {
    INITIAL_SAJU_FORM,
    SAJU_PHASE_STEPS,
    buildBirthInput,
    isBirthFieldsValid,
    type SajuFormState,
    type SajuPhase,
} from "../constants"

interface SajuLocaleSnapshot {
    phase: SajuPhase
    formData: SajuFormState
}

/** src/lib/saju 의 SajuChart(엔진 산출물) → SajuChartSnapshot(frozen 계약) 최소 변환 — 클라이언트 폴백 전용 */
type EnginePillar = {
    gan: string; ji: string; ganHanja: string; jiHanja: string
    ganElement: SajuPillarSnapshot['ganElement']; jiElement: SajuPillarSnapshot['jiElement']; jiAnimal: string
}
interface EngineChartLike {
    pillars: { year: EnginePillar; month: EnginePillar; day: EnginePillar; hour: EnginePillar | null }
    rawElementCount: SajuChartSnapshot['elementCount']
    dayMaster: { gan: string; hanja: string; element: SajuChartSnapshot['dayMaster']['element']; yinYang: '양' | '음'; strength: '신강' | '신약' | '중화' }
    yongsin: { element: SajuChartSnapshot['yongsin']['element']; reason: SajuChartSnapshot['yongsin']['reason'] }
    lackingElements: SajuChartSnapshot['yongsin']['lackingElements']
    isThreePillar: boolean
    isJasiBirth: boolean
    solarDate: { year: number; month: number; day: number }
}

function pillarToSnapshot(p: EnginePillar): SajuPillarSnapshot {
    return {
        gan: p.gan, ji: p.ji, ganHanja: p.ganHanja, jiHanja: p.jiHanja,
        ganElement: p.ganElement, jiElement: p.jiElement, jiAnimal: p.jiAnimal,
    }
}

function engineChartToSnapshot(chart: EngineChartLike, birth: SajuBirthInput): SajuChartSnapshot {
    const pad = (n: number) => String(n).padStart(2, '0')
    const hourPillar = chart.pillars.hour
    return {
        pillars: {
            year: pillarToSnapshot(chart.pillars.year),
            month: pillarToSnapshot(chart.pillars.month),
            day: pillarToSnapshot(chart.pillars.day),
            hour: hourPillar ? pillarToSnapshot(hourPillar) : null,
        },
        elementCount: chart.rawElementCount,
        dayMaster: {
            gan: chart.dayMaster.gan,
            hanja: chart.dayMaster.hanja,
            element: chart.dayMaster.element,
            yinYang: chart.dayMaster.yinYang,
            strength: chart.dayMaster.strength,
        },
        yongsin: {
            element: chart.yongsin.element,
            reason: chart.yongsin.reason,
            lackingElements: chart.lackingElements,
        },
        isThreePillar: chart.isThreePillar,
        isJasiBirth: chart.isJasiBirth,
        birthDisplay: {
            solarDate: `${chart.solarDate.year}-${pad(chart.solarDate.month)}-${pad(chart.solarDate.day)}`,
            time: birth.hour !== null ? `${pad(birth.hour)}:${pad(birth.minute ?? 0)}` : null,
            calendar: birth.calendar,
            sijin: hourPillar ? `${hourPillar.ji}시(${hourPillar.jiHanja}時)` : null,
        },
    }
}

/** 클라이언트 만세력 계산 폴백 (동적 import — 메인 번들에서 엔진 테이블 제외) */
async function computeChartLocally(birth: SajuBirthInput, gender: string): Promise<SajuChartSnapshot | null> {
    try {
        const saju = await import('@/lib/saju')
        const chart = saju.computeSajuChart({
            date: { year: birth.year, month: birth.month, day: birth.day },
            calendar: birth.calendar,
            isLeapMonth: birth.isLeapMonth === true,
            time: birth.hour !== null ? { hour: birth.hour, minute: birth.minute ?? 0 } : null,
            gender: gender === 'female' ? 'female' : 'male',
        })
        return engineChartToSnapshot(chart as unknown as EngineChartLike, birth)
    } catch (error) {
        console.error('[useSajuForm] 클라이언트 만세력 계산 폴백 실패:', error)
        return null
    }
}

export function useSajuForm() {
    const locale = useLocale()
    const searchParams = useSearchParams()
    const router = useRouter()
    const { showToast } = useToast()
    const mode = searchParams.get("mode") // "online" | "qr" | null
    const serviceMode = searchParams.get("service_mode") // QR 리다이렉트: "online" | "offline"
    const qrCode = searchParams.get("qr_code")

    const [phase, setPhase] = useState<SajuPhase>('gate')
    const [formData, setFormData] = useState<SajuFormState>(INITIAL_SAJU_FORM)
    const [isSealing, setIsSealing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
    const [chartSnapshot, setChartSnapshot] = useState<SajuChartSnapshot | null>(null)

    // Auth 상태 (비회원 차단 게이트)
    const { user, unifiedUser, loading: authLoading } = useAuth()
    const isLoggedIn = !!(user || unifiedUser)

    // 온라인/오프라인 판별 — useInputForm.ts:74-77 의 식을 그대로 사용
    const isOnline = mode === "online" || (serviceMode === "online" && mode !== "qr")
    const isOffline = mode === "qr" || serviceMode === "offline" || (!isOnline && qrCode)

    // 인증 게이트: 비로그인 분석 전면 차단 (온라인/오프라인/QR 무관)
    const showAuthGate = !isLoggedIn && !authLoading

    const isCompat = formData.purpose === 'compatibility'

    // 페이즈 시퀀스: gate → purpose → birth → (partner) → wish → seal
    const phaseSequence = useMemo<SajuPhase[]>(
        () => (isCompat
            ? ['gate', 'purpose', 'birth', 'partner', 'wish', 'seal']
            : ['gate', 'purpose', 'birth', 'wish', 'seal']),
        [isCompat]
    )
    const phaseIndex = Math.max(phaseSequence.indexOf(phase), 0)
    const progressSteps = useMemo(
        () => SAJU_PHASE_STEPS.filter((s) => phaseSequence.includes(s.key)),
        [phaseSequence]
    )

    // ---------- 로케일 전환 스냅숏 (고유 storageKey — 파일럿 키와 충돌 금지) ----------
    const captureLocaleState = useCallback((): SajuLocaleSnapshot => ({ phase, formData }), [phase, formData])
    const restoreLocaleState = useCallback((snapshot: SajuLocaleSnapshot) => {
        setPhase(snapshot.phase ?? 'gate')
        setFormData({
            ...INITIAL_SAJU_FORM,
            ...snapshot.formData,
            partner: { ...INITIAL_SAJU_FORM.partner, ...(snapshot.formData?.partner ?? {}) },
        })
    }, [])

    useLocaleSwitchState({
        storageKey: `input-form:saju:${mode ?? ''}:${serviceMode ?? ''}:${qrCode ?? ''}`,
        capture: captureLocaleState,
        restore: restoreLocaleState,
    })

    // ---------- QR 리다이렉트 무한 루프 방지 (useInputForm.ts:127-142 패턴) ----------
    const phaseIndexRef = useRef(phaseIndex)
    useEffect(() => {
        phaseIndexRef.current = phaseIndex
    }, [phaseIndex])

    useEffect(() => {
        if (!qrCode || typeof window === 'undefined') return

        window.history.pushState({ qrGuard: true }, '', window.location.href)

        const handlePopState = () => {
            if (phaseIndexRef.current <= 0) {
                // 첫 페이즈에서 뒤로가기 → 홈으로 (QR 루프 차단)
                window.location.replace('/')
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [qrCode])

    // ---------- 페이즈 유효성 (§3.1~3.6 — 에러 문구 없이 버튼 비활성) ----------
    const isPhaseValid = useCallback((p: SajuPhase): boolean => {
        const gateBase = formData.name.trim().length > 0 && formData.gender !== ''
        const gateValid = isOnline ? gateBase : gateBase && formData.pin.length === 4
        const purposeValid = formData.purpose !== null
        const birthValid = isBirthFieldsValid(formData)
        const partnerValid =
            formData.partner.relation !== null &&
            formData.partner.name.trim().length > 0 &&
            formData.partner.gender !== '' &&
            isBirthFieldsValid(formData.partner)

        switch (p) {
            case 'gate': return gateValid
            case 'purpose': return purposeValid
            case 'birth': return birthValid
            case 'partner': return partnerValid
            case 'wish': return true // 선택 입력
            case 'seal':
                return gateValid && purposeValid && birthValid && (!isCompat || partnerValid)
            default: return false
        }
    }, [formData, isOnline, isCompat])

    // ---------- 네비게이션 (인증 게이트 활성 시 차단) ----------
    const handleNext = useCallback(() => {
        if (showAuthGate) return
        const idx = phaseSequence.indexOf(phase)
        if (idx >= 0 && idx < phaseSequence.length - 1 && isPhaseValid(phase)) {
            setPhase(phaseSequence[idx + 1])
            if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
        }
    }, [phase, phaseSequence, isPhaseValid, showAuthGate])

    const handlePrev = useCallback(() => {
        const idx = phaseSequence.indexOf(phase)
        if (idx > 0) {
            setPhase(phaseSequence[idx - 1])
            if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
        }
    }, [phase, phaseSequence])

    /** 봉인 단자 '고치기' — 해당 페이즈로 점프 (이후 forward 진행으로 seal 복귀) */
    const jumpToPhase = useCallback((target: SajuPhase) => {
        if (phaseSequence.includes(target)) {
            setPhase(target)
            if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
        }
    }, [phaseSequence])

    // ---------- 제출 ----------
    const handleComplete = useCallback(async () => {
        if (showAuthGate) return
        if (!isPhaseValid('seal') || isSubmitting || formData.purpose === null) return

        setIsSubmitting(true)

        try {
            const birth = buildBirthInput(formData)
            const partnerBirth = isCompat ? buildBirthInput(formData.partner) : undefined

            // ① 만세력 — 오버레이의 실제 팔자 글자 (실패해도 분석은 계속: 우아한 저하)
            let chart: SajuChartSnapshot | null = null
            try {
                const chartRes = await apiFetch('/api/saju/chart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ birth, ...(partnerBirth && { partnerBirth }) }),
                })
                if (chartRes.ok) {
                    const chartJson = await chartRes.json()
                    chart = (chartJson?.chart ?? chartJson?.data?.chart ?? null) as SajuChartSnapshot | null
                }
            } catch (error) {
                console.warn('[useSajuForm] /api/saju/chart 호출 실패 — 클라이언트 계산 폴백:', error)
            }
            if (!chart) {
                chart = await computeChartLocally(birth, formData.gender)
            }
            setChartSnapshot(chart)

            // ② AI 분석 (frozen 계약: SajuAnalyzeRequest)
            const payload: SajuAnalyzeRequest = {
                name: formData.name.trim(),
                gender: formData.gender,
                targetType: formData.targetType,
                purpose: formData.purpose,
                birth,
                ...(isCompat && formData.partner.relation && {
                    partner: {
                        name: formData.partner.name.trim(),
                        gender: formData.partner.gender,
                        relation: formData.partner.relation,
                        birth: partnerBirth as SajuBirthInput,
                    },
                }),
                ...(formData.wish.trim().length > 0 && { wish: formData.wish.trim() }),
                locale,
                serviceMode: isOffline ? 'offline' : 'online',
                ...(isOffline && { pin: formData.pin }),
                ...(qrCode && { qrCode }),
            }

            const response = await apiFetch('/api/analyze/saju', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const result = await response.json()
            if (!response.ok && result.code === 'DAILY_ANALYSIS_LIMIT_EXCEEDED') {
                showToast(result.error || '오늘 가능한 분석 횟수를 모두 사용했어요. 매일 00:00에 다시 이용할 수 있습니다.', 'error', 5000)
                setIsSubmitting(false)
                setIsSealing(false)
                return
            }
            if (!response.ok && !result.fallback) {
                throw new Error(result.error || '분석 요청에 실패했습니다.')
            }

            // 결과 핸드오프 — localStorage 계약 (maps/input-flow.md §9)
            const saveToLocalStorage = (data: unknown) => {
                localStorage.removeItem('savedResultId')

                const resolvedServiceMode = isOffline ? 'offline' : 'online'
                localStorage.setItem('serviceMode', resolvedServiceMode)

                if (qrCode) {
                    localStorage.setItem('qrCode', qrCode)
                } else {
                    localStorage.removeItem('qrCode')
                }

                localStorage.setItem('productType', 'saju_perfume')
                localStorage.setItem('programType', 'saju')
                localStorage.setItem('analysisTargetType', formData.targetType || 'self')

                localStorage.setItem('analysisResult', JSON.stringify(data))
                localStorage.setItem('analysisResultLocale', locale)
                localStorage.setItem(`analysisResult:${locale}`, JSON.stringify(data))

                // 사주는 이미지 없는 프로그램 — 이전 프로그램의 잔존 이미지 명시적 제거 (§3.0)
                localStorage.removeItem('userImage')

                localStorage.setItem('userInfo', JSON.stringify({
                    name: formData.name.trim(),
                    gender: formData.gender,
                    ...(isOffline && { pin: formData.pin }),
                }))
            }

            if (result.success) {
                saveToLocalStorage(result.data)
            } else if (result.fallback) {
                saveToLocalStorage(result.fallback)
                showToast('분석에 문제가 있어 샘플 결과를 보여드립니다.', 'info', 3000)
            } else {
                throw new Error(result.error || '분석 요청에 실패했습니다.')
            }

            // 족자 전환(§4.5) 트리거
            setIsAnalysisComplete(true)
        } catch (error) {
            console.error('[useSajuForm] 분석 오류:', error)
            showToast('오류가 발생했습니다. 다시 시도해주세요.', 'error', 3000)
            setIsSubmitting(false)
            setIsSealing(false)
        }
    }, [formData, isCompat, isOffline, isPhaseValid, isSubmitting, locale, qrCode, showAuthGate, showToast])

    /** 봉인 CTA — 낙관 찍힘/단자 접힘 연출 후 제출 (§3.6: 0.9s 시점 handleComplete) */
    const handleSeal = useCallback(() => {
        if (showAuthGate || isSealing || isSubmitting) return
        if (!isPhaseValid('seal')) return
        setIsSealing(true)
        window.setTimeout(() => {
            void handleComplete()
        }, 900)
    }, [showAuthGate, isSealing, isSubmitting, isPhaseValid, handleComplete])

    // 족자 걷힘 완료 → 결과 페이지
    // QR/오프라인은 replace — 뒤로가기로 input 재진입 방지 (useInputForm.ts:478-484)
    const navigateToResult = useCallback(() => {
        if (qrCode || isOffline) {
            router.replace('/result?type=saju')
        } else {
            router.push('/result?type=saju')
        }
    }, [router, qrCode, isOffline])

    return {
        // 상태
        phase,
        phaseIndex,
        phaseSequence,
        progressSteps,
        formData,
        setFormData,
        isCompat,
        isSealing,
        isSubmitting,
        isAnalysisComplete,
        chartSnapshot,
        isOnline,
        isOffline,
        // 인증 게이트
        showAuthGate,
        authLoading,
        // 함수
        isPhaseValid,
        handleNext,
        handlePrev,
        jumpToPhase,
        handleSeal,
        navigateToResult,
    }
}
