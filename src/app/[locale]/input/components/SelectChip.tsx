"use client"

import { memo } from "react"

interface SelectChipProps {
    label: string
    isSelected: boolean
    onClick: () => void
}

// memo로 불필요한 리렌더링 방지
export const SelectChip = memo(function SelectChip({ label, isSelected, onClick }: SelectChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isSelected}
            className={`input-choice relative w-full py-3.5 px-4 rounded-[6px] text-sm lg:text-base font-semibold overflow-hidden border-2
                transition-colors duration-150 ease-out
                active:scale-[0.97] transform-gpu will-change-transform
                ${isSelected
                    ? "font-black text-[var(--ink)] border-[var(--line)] bg-[var(--soft)]"
                    : "text-[var(--muted-ink)] border-[var(--line)] bg-[var(--soft)] hover:border-[var(--line)]"
                }`}
        >
            {/* 선택 표시(✓)는 .input-choice[aria-pressed] 스타일이 그린다 */}
            <span className="flex items-center justify-center gap-2">{label}</span>
        </button>
    )
})
