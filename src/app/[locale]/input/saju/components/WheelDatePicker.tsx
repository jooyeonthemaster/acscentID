'use client'

// ============================================================
// DateWheels — 생년월일 무한롤(휠) 인라인 선택기 (UI-SPEC §3.3)
// iOS 스타일 스크롤-스냅 휠 3열(년/월/일)을 페이지에 바로 렌더한다.
// 값 범위를 유효 범위로 제한해 미래·달력에 없는 날짜는 애초에 못 고른다.
// 스크롤이 멈추면 그 값이 바로 커밋된다(별도 확인 버튼 없음).
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { SAJU_YEAR_MIN, SAJU_YEAR_MAX } from '../constants'

const ITEM_H = 40
const VISIBLE = 5 // 홀수 — 가운데가 선택
const PAD = ITEM_H * ((VISIBLE - 1) / 2)
const DEFAULT_YEAR = 2000
const PAGE_BG = '#0C0E16' // 위저드 배경색 (페이드 색상)

interface WheelItem {
    value: string | number
    label: string
}

function range(from: number, to: number): number[] {
    const out: number[] = []
    for (let i = from; i <= to; i++) out.push(i)
    return out
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

// ---------- 단일 휠 열 ----------

function WheelColumn({
    items,
    value,
    onChange,
    serif = false,
}: {
    items: WheelItem[]
    value: string | number
    onChange: (value: string | number) => void
    /** 텍스트 열(양력/음력)은 명조체·소폭 축소 */
    serif?: boolean
}) {
    const ref = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number | null>(null)
    const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const programmatic = useRef(false)
    const [active, setActive] = useState(() => {
        const i = items.findIndex((it) => it.value === value)
        return i < 0 ? 0 : i
    })

    // 외부 value/목록 변경 시 스크롤 위치를 동기화 (애니메이션 없이)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const idx = items.findIndex((it) => it.value === value)
        if (idx < 0) return
        setActive(idx)
        const target = idx * ITEM_H
        if (Math.abs(el.scrollTop - target) > 1) {
            programmatic.current = true
            el.scrollTop = target
            requestAnimationFrame(() => {
                programmatic.current = false
            })
        }
    }, [value, items])

    const handleScroll = () => {
        const el = ref.current
        if (!el) return
        // 가운데 항목 실시간 하이라이트
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
            const el2 = ref.current
            if (!el2) return
            const idx = clamp(Math.round(el2.scrollTop / ITEM_H), 0, items.length - 1)
            setActive(idx)
        })
        // 프로그램적 정렬 중에는 커밋하지 않는다
        if (programmatic.current) return
        // 스크롤이 멈춘 뒤(스냅 완료) 값 커밋
        if (settleRef.current) clearTimeout(settleRef.current)
        settleRef.current = setTimeout(() => {
            const el2 = ref.current
            if (!el2) return
            const idx = clamp(Math.round(el2.scrollTop / ITEM_H), 0, items.length - 1)
            const picked = items[idx]
            if (picked && picked.value !== value) onChange(picked.value)
        }, 120)
    }

    return (
        <div
            ref={ref}
            onScroll={handleScroll}
            className="snap-y snap-mandatory overflow-y-scroll [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ height: ITEM_H * VISIBLE }}
        >
            <div style={{ height: PAD }} />
            {items.map((it, i) => (
                <div
                    key={it.value}
                    className="flex cursor-pointer snap-center items-center justify-center"
                    style={{ height: ITEM_H }}
                    onClick={() => onChange(it.value)}
                >
                    <span
                        className={`transition-all duration-150 ${serif ? 'font-serif-kr' : 'font-sans tabular-nums'} ${
                            i === active
                                ? `${serif ? 'text-[19px]' : 'text-[22px]'} font-bold text-[#E9E2D0]`
                                : `${serif ? 'text-[15px]' : 'text-[17px]'} text-[#5C564A]`
                        }`}
                    >
                        {it.label}
                    </span>
                </div>
            ))}
            <div style={{ height: PAD }} />
        </div>
    )
}

// ---------- 인라인 3열 휠 ----------

interface DateWheelsProps {
    calendar: 'solar' | 'lunar'
    year: number | null
    month: number | null
    day: number | null
    labels: { year: string; month: string; day: string }
    /** 양력/음력 휠 라벨 */
    calendarLabels: { solar: string; lunar: string }
    onChange: (value: { year: number; month: number; day: number }) => void
    onCalendarChange: (calendar: 'solar' | 'lunar') => void
}

export function DateWheels({
    calendar,
    year,
    month,
    day,
    labels,
    calendarLabels,
    onChange,
    onCalendarChange,
}: DateWheelsProps) {
    // 미래 차단용 오늘 기준값
    const now = useMemo(() => new Date(), [])
    const curY = now.getFullYear()
    const curM = now.getMonth() + 1
    const curD = now.getDate()
    const maxYear = Math.min(SAJU_YEAR_MAX, curY)

    // 현재 표시값 (없으면 기본값). props(=formData)를 SSOT로 삼는 controlled 휠.
    const ty = clamp(year ?? DEFAULT_YEAR, SAJU_YEAR_MIN, maxYear)
    const tm = clamp(month ?? 1, 1, 12)
    const td = clamp(day ?? 1, 1, 31)

    const maxMonth = ty === curY ? curM : 12
    const daysInMonth = calendar === 'lunar' ? 30 : new Date(ty, tm, 0).getDate()
    const maxDay = ty === curY && tm === curM ? Math.min(daysInMonth, curD) : daysInMonth

    const years = useMemo(
        () => range(SAJU_YEAR_MIN, maxYear).map((v) => ({ value: v, label: String(v) })),
        [maxYear],
    )
    const months = useMemo(
        () => range(1, maxMonth).map((v) => ({ value: v, label: String(v) })),
        [maxMonth],
    )
    const days = useMemo(
        () => range(1, maxDay).map((v) => ({ value: v, label: String(v) })),
        [maxDay],
    )
    const calendarItems = useMemo<WheelItem[]>(
        () => [
            { value: 'solar', label: calendarLabels.solar },
            { value: 'lunar', label: calendarLabels.lunar },
        ],
        [calendarLabels.solar, calendarLabels.lunar],
    )

    // 한 축을 바꾸면 나머지 상한을 다시 계산해 넘치는 값은 당겨온다
    const commit = (patch: Partial<{ year: number; month: number; day: number }>) => {
        const next = { year: ty, month: tm, day: td, ...patch }
        const nMaxMonth = next.year === curY ? curM : 12
        if (next.month > nMaxMonth) next.month = nMaxMonth
        const nDays = calendar === 'lunar' ? 30 : new Date(next.year, next.month, 0).getDate()
        const nMaxDay =
            next.year === curY && next.month === curM ? Math.min(nDays, curD) : nDays
        if (next.day > nMaxDay) next.day = nMaxDay
        onChange(next)
    }

    // 빈 상태로 처음 마운트되면 기본값을 커밋해 표시값과 폼 상태를 맞춘다
    useEffect(() => {
        if (year === null || month === null || day === null) {
            onChange({ year: ty, month: tm, day: td })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="relative">
            {/* 중앙 선택 밴드 */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 z-10 rounded-md border-y border-[#C9A227]/40 bg-[#C9A227]/5"
                style={{ top: PAD, height: ITEM_H }}
            />
            {/* 위/아래 페이드 */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-20"
                style={{ height: PAD, background: `linear-gradient(to bottom, ${PAGE_BG}, rgba(12,14,22,0))` }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
                style={{ height: PAD, background: `linear-gradient(to top, ${PAGE_BG}, rgba(12,14,22,0))` }}
            />
            {/* 열 라벨 (선택 밴드 우측에 고정) */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 z-30 flex"
                style={{ top: PAD, height: ITEM_H }}
            >
                {/* 양력/음력 열은 값 자체가 라벨이라 접미사 없음 */}
                <span className="relative flex-1" />
                <span className="relative flex-[1.4]">
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-serif-kr text-[13px] text-[#A69F8D]">
                        {labels.year}
                    </span>
                </span>
                <span className="relative flex-1">
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-serif-kr text-[13px] text-[#A69F8D]">
                        {labels.month}
                    </span>
                </span>
                <span className="relative flex-1">
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-serif-kr text-[13px] text-[#A69F8D]">
                        {labels.day}
                    </span>
                </span>
            </div>

            {/* 휠 4열 — 양력/음력 · 년 · 월 · 일 */}
            <div className="relative flex">
                <div className="flex-1">
                    <WheelColumn
                        items={calendarItems}
                        value={calendar}
                        onChange={(v) => onCalendarChange(v as 'solar' | 'lunar')}
                        serif
                    />
                </div>
                <div className="flex-[1.4]">
                    <WheelColumn items={years} value={ty} onChange={(v) => commit({ year: Number(v) })} />
                </div>
                <div className="flex-1">
                    <WheelColumn items={months} value={tm} onChange={(v) => commit({ month: Number(v) })} />
                </div>
                <div className="flex-1">
                    <WheelColumn items={days} value={td} onChange={(v) => commit({ day: Number(v) })} />
                </div>
            </div>
        </div>
    )
}
