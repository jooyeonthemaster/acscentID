"use client"

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"

type TransitionStage = 'open' | 'closing' | 'closed' | 'opening'

interface TransitionContextType {
    stage: TransitionStage
    startTransition: (url: string) => void
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined)

export function TransitionProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [stage, setStage] = useState<TransitionStage>('open')
    const [targetUrl, setTargetUrl] = useState<string | null>(null)
    const previousPathnameRef = useRef(pathname)
    const isSajuDoorTransition =
        targetUrl?.includes('type=saju') || targetUrl?.includes('/programs/saju')

    // URL이 변경되면(페이지 이동 완료되면) 문을 연다
    useEffect(() => {
        console.log('Pathname changed:', pathname, 'Current stage:', stage)
        const pathnameChanged = previousPathnameRef.current !== pathname
        previousPathnameRef.current = pathname
        if (!pathnameChanged) return

        // 만약 현재 닫혀있는 상태라면 (혹은 닫히는 중이었다면) 페이지 이동이 감지되었을 때 문을 연다
        if (stage === 'closed' || stage === 'closing') {
            console.log('Opening doors...')
            // 약간의 지연을 주어 페이지 로딩이 조금 진행된 후 열리게 할 수도 있음
            const openTimer = window.setTimeout(() => setStage('opening'), 0)
            return () => window.clearTimeout(openTimer)
        }
    }, [pathname, stage])

    // 문이 다 열리면 상태를 open으로 초기화 (애니메이션이 끝난 후 호출되어야 함)
    const onTransitionEnd = () => {
        console.log('Transition ended, resetting to open')
        if (stage === 'opening') {
            setStage('open')
        }
    }

    const startTransition = (url: string) => {
        console.log('Starting transition to:', url, 'Current stage:', stage)
        if (stage !== 'open') return // 이미 진행중이면 무시
        setTargetUrl(url)
        setStage('closing')
    }

    // 문이 다 닫히면 실제 페이지 이동 실행
    const onDoorClosed = () => {
        console.log('Door closed, navigating to:', targetUrl)
        if (targetUrl) {
            router.push(targetUrl)
            // setTargetUrl(null) // 주석 처리: 라우팅이 비동기라 바로 null하면 안될수도 있음, 하지만 일단 유지
            // stage는 그대로 'closed' 유지 -> pathname 변경 감지 후 'opening'으로 전환
            // 단, 같은 페이지로 이동하거나 router.push가 즉시 완료되지 않을 수 있으므로
            // 상태 관리를 주의해야 함. 
            // 여기서는 router.push 직후에 stage를 closed로 둠.
            setStage('closed')
        }
    }

    return (
        <TransitionContext.Provider value={{ stage, startTransition }}>
            {children}
            {/* 
        이 방식은 Provider가 상태만 제공하고, 
        실제 컴포넌트(DoorTransition)가 onDoorClosed 등을 prop으로 받거나 
        Context에 콜백을 등록하는 방식이 필요함.
        
        간단하게 하기 위해 Context 내부에서 다 처리하기보다는, 
        Provider가 상태만 관리하고,
        DoorTransition 컴포넌트가 애니메이션 종료 이벤트를 받아서
        Context의 메서드를 호출하는 방식이 깔끔할 수 있음.
        
        하지만 여기서는 로직 분리를 위해
        'Animation Completed' 콜백을 Context에 다시 전달해주는 구조를 쓸 수 있지만,
        구현의 단순성을 위해 DoorTransition 컴포넌트가 Context를 구독하고
        애니메이션이 끝나면 특정 액션을 취하도록 설계할 수 있음.
        
        수정: DoorTransition 컴포넌트에서 onAnimationComplete를 받아서 처리하도록
        Context에 로직을 노출하는 게 좋음.
      */}
            <DoorTransitionController
                stage={stage}
                isSajuDoor={!!isSajuDoorTransition}
                onClosed={onDoorClosed}
                onOpened={onTransitionEnd}
            />
        </TransitionContext.Provider>
    )
}



function DoorTransitionController({
    stage,
    isSajuDoor,
    onClosed,
    onOpened
}: {
    stage: TransitionStage
    isSajuDoor: boolean
    onClosed: () => void
    onOpened: () => void
}) {
    // stage에 따라 애니메이션 제어

    return (
        <div className="fixed inset-0 z-[100000] pointer-events-none flex">
            {/* 왼쪽 문 */}
            <motion.div
                initial={{ x: "-100%" }}
                animate={{
                    x: (stage === 'closing' || stage === 'closed') ? "0%" : "-100%"
                }}
                transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1]
                }}
                onAnimationComplete={() => {
                    // 왼쪽 문 애니메이션이 끝났을 때만 트리거 (중복 방지)
                    if (stage === 'closing') {
                        onClosed()
                    }
                    if (stage === 'opening') {
                        onOpened()
                    }
                }}
                className={
                    isSajuDoor
                        ? "relative h-full w-1/2 overflow-hidden border-r-[3px] border-[#2E1710] pointer-events-auto flex items-center justify-end"
                        : "w-1/2 h-full bg-amber-400 border-r-4 border-amber-600 relative pointer-events-auto flex items-center justify-end"
                }
            >
                {isSajuDoor ? (
                    <SajuShojiDoorHalf side="left" />
                ) : (
                    <LegacyDoorHalf side="left" stage={stage} />
                )}
            </motion.div>

            {/* 오른쪽 문 */}
            <motion.div
                initial={{ x: "100%" }}
                animate={{
                    x: (stage === 'closing' || stage === 'closed') ? "0%" : "100%"
                }}
                transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1]
                }}
                className={
                    isSajuDoor
                        ? "relative h-full w-1/2 overflow-hidden border-l-[3px] border-[#2E1710] pointer-events-auto flex items-center justify-start"
                        : "w-1/2 h-full bg-amber-400 border-l-4 border-amber-600 relative pointer-events-auto flex items-center justify-start"
                }
            >
                {isSajuDoor ? (
                    <SajuShojiDoorHalf side="right" />
                ) : (
                    <LegacyDoorHalf side="right" stage={stage} />
                )}
            </motion.div>
        </div>
    )
}

function LegacyDoorHalf({ side, stage }: { side: 'left' | 'right'; stage: TransitionStage }) {
    const patternId = `wood-pattern-${side}`
    const label = side === 'left' ? 'OPEN' : 'YOUR WORLD'
    const labelClassName =
        side === 'left'
            ? 'absolute right-12 top-1/2 -translate-y-1/2 text-amber-900/40 whitespace-nowrap font-black text-6xl rotate-90 z-20'
            : 'absolute left-12 top-1/2 -translate-y-1/2 text-amber-900/40 whitespace-nowrap font-black text-6xl -rotate-90 z-20'

    return (
        <>
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
                <defs>
                    <pattern id={patternId} width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M0 0h100v100H0z" fill="#fbbf24" />
                        <path d="M0 20h100M0 40h100M0 60h100M0 80h100" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.3" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#${patternId})`} />
                <rect x="20" y="20" width="calc(100% - 40px)" height="calc(30% - 40px)" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="4" />
                <rect x="20" y="32%" width="calc(100% - 40px)" height="calc(70% - 40px)" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="4" />
            </svg>

            <div className={`relative z-10 h-16 w-4 rounded-full bg-amber-700 shadow-lg flex items-center justify-center ${side === 'left' ? 'mr-4' : 'ml-4'}`}>
                <div className="h-12 w-2 rounded-full bg-amber-600" />
            </div>

            {(stage === 'closing' || stage === 'closed') && (
                <div className={labelClassName}>
                    {label}
                </div>
            )}
        </>
    )
}

const shojiWoodStyle: React.CSSProperties = {
    backgroundColor: '#563018',
    backgroundImage: [
        'linear-gradient(90deg, rgba(255,255,255,0.08), transparent 20%, rgba(0,0,0,0.18) 54%, transparent 78%, rgba(255,255,255,0.05))',
        'repeating-linear-gradient(0deg, rgba(255,214,143,0.13) 0 2px, transparent 2px 18px)',
        'linear-gradient(180deg, #7B431F 0%, #9A5A2D 42%, #5A2C18 100%)',
    ].join(', '),
}

const shojiPaperGlowStyle: React.CSSProperties = {
    backgroundImage: [
        'radial-gradient(circle at 24% 20%, rgba(255,255,255,0.78), transparent 32%)',
        'radial-gradient(circle at 78% 70%, rgba(201,162,39,0.16), transparent 35%)',
        'linear-gradient(180deg, rgba(255,248,225,0.9), rgba(237,229,210,0.95))',
    ].join(', '),
}

const shojiLatticeStyle: React.CSSProperties = {
    backgroundImage: [
        'repeating-linear-gradient(90deg, transparent 0 58px, rgba(84,40,19,0.72) 58px 64px)',
        'repeating-linear-gradient(180deg, transparent 0 72px, rgba(84,40,19,0.66) 72px 78px)',
    ].join(', '),
}

function SajuShojiDoorHalf({ side }: { side: 'left' | 'right' }) {
    const isLeft = side === 'left'
    const ornamentSideClass = isLeft ? 'right-10' : 'left-10'

    return (
        <>
            <div className="absolute inset-0" style={shojiWoodStyle} />
            <div
                aria-hidden
                className={`absolute inset-y-0 ${isLeft ? 'right-0' : 'left-0'} w-[10px]`}
                style={{
                    background: 'linear-gradient(90deg, #2E1710 0%, #9A5A2D 45%, #2E1710 100%)',
                    boxShadow: '0 0 22px rgba(12,14,22,0.32)',
                }}
            />

            <div className="absolute inset-[14px] rounded-[3px] border border-[#C9A227]/25 shadow-[inset_0_0_22px_rgba(12,14,22,0.24)]" />

            <div className="absolute inset-[24px] grid grid-rows-[0.34fr_1fr] gap-3">
                {['upper', 'lower'].map((row) => (
                    <div
                        key={row}
                        className="saju-hanji relative overflow-hidden rounded-[3px] border-[6px] border-[#673118] shadow-[inset_0_0_18px_rgba(84,40,19,0.24)]"
                    >
                        <div className="absolute inset-0" style={shojiPaperGlowStyle} />
                        <div className="absolute inset-0 opacity-85" style={shojiLatticeStyle} />
                        <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 bg-[#673118]/75" />
                        <div className="absolute inset-y-0 left-1/2 w-[5px] -translate-x-1/2 bg-[#673118]/70" />
                    </div>
                ))}
            </div>

            <div
                aria-hidden
                className={`absolute top-1/2 z-20 h-[68px] w-[16px] -translate-y-1/2 rounded-full border border-[#C9A227]/55 bg-[#5A2A17] shadow-[0_10px_24px_rgba(12,14,22,0.34)] ${isLeft ? 'right-4' : 'left-4'}`}
            >
                <div className="mx-auto mt-2 h-12 w-[6px] rounded-full bg-gradient-to-b from-[#E8C766] via-[#9A5A2D] to-[#3A1C10]" />
            </div>

            <div
                aria-hidden
                className={`absolute bottom-12 z-10 h-24 w-24 rounded-full border border-[#C0392B]/20 bg-[#C0392B]/[0.06] ${ornamentSideClass}`}
            />
            <div
                aria-hidden
                className={`absolute bottom-16 z-10 h-px w-24 bg-gradient-to-r from-transparent via-[#C9A227]/45 to-transparent ${ornamentSideClass}`}
            />
        </>
    )
}

export function useTransition() {
    const context = useContext(TransitionContext)
    if (context === undefined) {
        throw new Error("useTransition must be used within a TransitionProvider")
    }
    return context
}
