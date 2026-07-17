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
            className={`relative w-full py-3.5 px-4 rounded-[12px] text-sm lg:text-base font-semibold overflow-hidden border bg-[#12141D]
                transition-colors duration-150 ease-out
                active:scale-[0.97] transform-gpu will-change-transform
                ${isSelected
                    ? "text-[#E9E2D0] border-[#E9E2D0] shadow-[0_0_20px_rgba(233,226,208,0.12)]"
                    : "text-[#A69F8D] border-[#262A38] hover:border-[#3A4051]"
                }`}
        >
            <span className="flex items-center justify-center gap-2">
                {isSelected && (
                    <span className="text-[#E9E2D0] animate-[scaleIn_0.15s_ease-out]">✓</span>
                )}
                {label}
            </span>
        </button>
    )
})
