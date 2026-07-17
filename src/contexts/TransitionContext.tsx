"use client"

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { ImageIcon, FileText, Layers } from "lucide-react"

type TransitionStage = 'open' | 'closing' | 'closed' | 'opening'
type DoorVariant = 'image' | 'chemistry' | 'saju'

interface TransitionContextType {
    stage: TransitionStage
    startTransition: (url: string) => void
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined)

function getDoorVariant(url: string | null): DoorVariant {
    if (url?.includes('type=saju') || url?.includes('/programs/saju')) return 'saju'
    if (url?.includes('type=chemistry') || url?.includes('/programs/chemistry')) return 'chemistry'
    return 'image'
}

export function TransitionProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [stage, setStage] = useState<TransitionStage>('open')
    const [targetUrl, setTargetUrl] = useState<string | null>(null)
    const previousPathnameRef = useRef(pathname)
    const doorVariant = getDoorVariant(targetUrl)

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
                doorVariant={doorVariant}
                onClosed={onDoorClosed}
                onOpened={onTransitionEnd}
            />
        </TransitionContext.Provider>
    )
}



function DoorTransitionController({
    stage,
    doorVariant,
    onClosed,
    onOpened
}: {
    stage: TransitionStage
    doorVariant: DoorVariant
    onClosed: () => void
    onOpened: () => void
}) {
    // stage에 따라 애니메이션 제어
    const isSajuDoor = doorVariant === 'saju'
    const leftBorderClass = isSajuDoor
        ? "relative h-full w-1/2 overflow-hidden border-r-[3px] border-[#2A1D13] pointer-events-auto flex items-center justify-end"
        : "relative h-full w-1/2 overflow-hidden border-r border-[#12141D] pointer-events-auto"
    const rightBorderClass = isSajuDoor
        ? "relative h-full w-1/2 overflow-hidden border-l-[3px] border-[#2A1D13] pointer-events-auto flex items-center justify-start"
        : "relative h-full w-1/2 overflow-hidden border-l border-[#12141D] pointer-events-auto"

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
                className={leftBorderClass}
            >
                {doorVariant === 'saju' ? (
                    <SajuShojiDoorHalf side="left" />
                ) : doorVariant === 'chemistry' ? (
                    <ChemistryBlotterDoorHalf side="left" />
                ) : (
                    <ImageReportDoorHalf side="left" />
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
                className={rightBorderClass}
            >
                {doorVariant === 'saju' ? (
                    <SajuShojiDoorHalf side="right" />
                ) : doorVariant === 'chemistry' ? (
                    <ChemistryBlotterDoorHalf side="right" />
                ) : (
                    <ImageReportDoorHalf side="right" />
                )}
            </motion.div>
        </div>
    )
}

function ImageReportDoorHalf({ side }: { side: 'left' | 'right' }) {
    const isLeft = side === 'left'
    const lineClassName = isLeft ? 'left-10' : 'right-10'
    const spineClassName = isLeft ? 'right-0' : 'left-0'
    const label = isLeft ? 'PHOTO' : 'REPORT'
    const Icon = isLeft ? ImageIcon : FileText

    return (
        <>
            <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(160deg, #FBF7EF 0%, #ECE3D0 100%)' }}
            />
            <div className="absolute inset-5 rounded-[16px] border border-[#D8CFBB]/70" />
            <div className="absolute left-1/2 top-[15%] flex -translate-x-1/2 flex-col items-center gap-2.5">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-[#D8CFBB] bg-[#FBF7EF]/70">
                    <Icon size={20} strokeWidth={1.6} className="text-[#9A8B5E]" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#9A9179]">{label}</span>
            </div>
            {[34, 50, 66, 82].map((top) => (
                <div
                    key={top}
                    className={`absolute h-px w-16 bg-[#1A1610]/10 ${lineClassName}`}
                    style={{ top: `${top}%` }}
                />
            ))}
            <div className={`absolute inset-y-0 w-px bg-[#D8CFBB] ${spineClassName}`} />
            <div className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#D8CFBB] bg-[#FBF7EF] ${isLeft ? 'right-4' : 'left-4'}`} />
            <div className={`absolute bottom-12 h-28 w-28 rounded-full border border-[#1A1610]/8 ${isLeft ? 'right-10' : 'left-10'}`} />
        </>
    )
}

function ChemistryBlotterDoorHalf({ side }: { side: 'left' | 'right' }) {
    const isLeft = side === 'left'
    const label = isLeft ? 'A NOTE' : 'B NOTE'
    const lineClassName = isLeft ? 'left-10' : 'right-10'
    const spineClassName = isLeft ? 'right-0' : 'left-0'
    // 좌우 은근한 톤 차이 — 왼쪽은 살짝 차갑게, 오른쪽은 살짝 따뜻하게
    const background = isLeft
        ? 'linear-gradient(160deg, #FBF8F1 0%, #E6E7DB 100%)'
        : 'linear-gradient(160deg, #FBF6EE 0%, #EEE0D2 100%)'

    return (
        <>
            <div className="absolute inset-0" style={{ background }} />
            <div className="absolute inset-5 rounded-[16px] border border-[#D8CFBB]/70" />
            <div className="absolute left-1/2 top-[15%] flex -translate-x-1/2 flex-col items-center gap-2.5">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-[#D8CFBB] bg-[#FBF7EF]/70">
                    <Layers size={20} strokeWidth={1.6} className="text-[#9A8B5E]" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#9A9179]">{label}</span>
            </div>
            {[34, 50, 66, 82].map((top) => (
                <div
                    key={top}
                    className={`absolute h-px w-16 bg-[#1A1610]/10 ${lineClassName}`}
                    style={{ top: `${top}%` }}
                />
            ))}
            <div className={`absolute inset-y-0 w-px bg-[#D8CFBB] ${spineClassName}`} />
            <div className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#D8CFBB] bg-[#FBF7EF] ${isLeft ? 'right-4' : 'left-4'}`} />
            <div className={`absolute bottom-12 h-28 w-28 rounded-full border border-[#1A1610]/8 ${isLeft ? 'right-10' : 'left-10'}`} />
        </>
    )
}
const shojiWoodStyle: React.CSSProperties = {
    backgroundColor: '#3E2C1E',
    backgroundImage: [
        'linear-gradient(90deg, rgba(255,240,220,0.08), transparent 20%, rgba(0,0,0,0.2) 54%, transparent 78%, rgba(255,240,220,0.05))',
        'repeating-linear-gradient(0deg, rgba(120,90,62,0.16) 0 2px, transparent 2px 18px)',
        'linear-gradient(180deg, #5A4231 0%, #6E5340 42%, #362619 100%)',
    ].join(', '),
}

const shojiPaperGlowStyle: React.CSSProperties = {
    backgroundImage: [
        'radial-gradient(circle at 24% 20%, rgba(255,250,235,0.8), transparent 32%)',
        'radial-gradient(circle at 78% 70%, rgba(200,170,130,0.18), transparent 35%)',
        'linear-gradient(180deg, rgba(255,248,225,0.9), rgba(237,229,210,0.95))',
    ].join(', '),
}

const shojiLatticeStyle: React.CSSProperties = {
    backgroundImage: [
        'repeating-linear-gradient(90deg, transparent 0 58px, rgba(74,55,40,0.72) 58px 64px)',
        'repeating-linear-gradient(180deg, transparent 0 72px, rgba(74,55,40,0.66) 72px 78px)',
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
                    background: 'linear-gradient(90deg, #2A1D13 0%, #6E5340 45%, #2A1D13 100%)',
                    boxShadow: '0 0 22px rgba(20,12,6,0.34)',
                }}
            />

            <div className="absolute inset-[14px] rounded-[12px] border border-[#8B6B4A]/30" />

            <div className="absolute inset-[24px] grid grid-rows-[0.34fr_1fr] gap-3">
                {['upper', 'lower'].map((row) => (
                    <div
                        key={row}
                        className="saju-hanji relative overflow-hidden rounded-[12px] border-[6px] border-[#4A3728]"
                    >
                        <div className="absolute inset-0" style={shojiPaperGlowStyle} />
                        <div className="absolute inset-0 opacity-85" style={shojiLatticeStyle} />
                        <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 bg-[#4A3728]/75" />
                        <div className="absolute inset-y-0 left-1/2 w-[5px] -translate-x-1/2 bg-[#4A3728]/70" />
                    </div>
                ))}
            </div>

            <div
                aria-hidden
                className={`absolute top-1/2 z-20 h-[68px] w-[16px] -translate-y-1/2 rounded-full border border-[#8B6B4A]/55 bg-[#3A2A1D] shadow-[0_10px_24px_rgba(20,12,6,0.36)] ${isLeft ? 'right-4' : 'left-4'}`}
            >
                <div className="mx-auto mt-2 h-12 w-[6px] rounded-full bg-gradient-to-b from-[#C9A87E] via-[#6E5340] to-[#2A1D13]" />
            </div>

            <div
                aria-hidden
                className={`absolute bottom-12 z-10 h-24 w-24 rounded-full border border-[#6B4E37]/25 bg-[#6B4E37]/[0.07] ${ornamentSideClass}`}
            />
            <div
                aria-hidden
                className={`absolute bottom-16 z-10 h-px w-24 bg-gradient-to-r from-transparent via-[#8B6B4A]/50 to-transparent ${ornamentSideClass}`}
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
