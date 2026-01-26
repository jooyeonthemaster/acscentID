"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"

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

    // URL이 변경되면(페이지 이동 완료되면) 문을 연다
    useEffect(() => {
        console.log('Pathname changed:', pathname, 'Current stage:', stage)
        // 만약 현재 닫혀있는 상태라면 (혹은 닫히는 중이었다면) 페이지 이동이 감지되었을 때 문을 연다
        if (stage === 'closed' || stage === 'closing') {
            console.log('Opening doors...')
            // 약간의 지연을 주어 페이지 로딩이 조금 진행된 후 열리게 할 수도 있음
            // 여기서는 즉시 열림 시작
            setStage('opening')
        }
    }, [pathname])

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
                onClosed={onDoorClosed}
                onOpened={onTransitionEnd}
            />
        </TransitionContext.Provider>
    )
}

import { motion, AnimatePresence } from "framer-motion"

function DoorTransitionController({
    stage,
    onClosed,
    onOpened
}: {
    stage: TransitionStage
    onClosed: () => void
    onOpened: () => void
}) {
    // stage에 따라 애니메이션 제어

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex">
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
                className="w-1/2 h-full bg-black border-r border-white/10 relative pointer-events-auto"
            >
                {/* 문에 장식 요소 추가 가능 */}
                {(stage === 'closing' || stage === 'closed') && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 whitespace-nowrap font-black text-6xl rotate-90 opacity-50">
                        LOADING
                    </div>
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
                className="w-1/2 h-full bg-black border-l border-white/10 relative pointer-events-auto"
            >
                {(stage === 'closing' || stage === 'closed') && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 whitespace-nowrap font-black text-6xl -rotate-90 opacity-50">
                        ANALYSIS
                    </div>
                )}
            </motion.div>
        </div>
    )
}

export function useTransition() {
    const context = useContext(TransitionContext)
    if (context === undefined) {
        throw new Error("useTransition must be used within a TransitionProvider")
    }
    return context
}
