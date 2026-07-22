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
            onClick={onClick}
            className={`relative w-full py-3.5 px-4 rounded-[6px] text-sm lg:text-base font-semibold overflow-hidden border-2
                transition-colors duration-150 ease-out
                active:scale-[0.97] transform-gpu will-change-transform
                ${isSelected
                    ? "font-black text-[var(--ink)] border-[var(--line)] bg-[var(--soft)] shadow-[0_0_0_3px_rgba(212,160,23,0.22),0_4px_14px_rgba(212,160,23,0.28)]"
                    : "text-[var(--muted-ink)] border-[var(--line)] bg-[var(--soft)] hover:border-[var(--line)]"
                }`}
        >
            <span className="flex items-center justify-center gap-2">
                {isSelected && (
                    <span className="text-[var(--accent-ai-deep)] animate-[scaleIn_0.15s_ease-out]">✓</span>
                )}
                {label}
            </span>
        </button>
    )
})
