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
            className={`relative w-full py-3.5 px-4 rounded-xl text-sm font-semibold overflow-hidden border
                transition-colors duration-150 ease-out
                active:scale-[0.97] transform-gpu will-change-transform
                ${isSelected
                    ? "bg-yellow-400 text-slate-900 shadow-lg border-yellow-300"
                    : "bg-white/90 text-slate-600 border-white/70 shadow-md hover:bg-white hover:border-slate-200"
                }`}
        >
            <span className="flex items-center justify-center gap-2">
                {isSelected && (
                    <span className="text-slate-800 animate-[scaleIn_0.15s_ease-out]">✓</span>
                )}
                {label}
            </span>
        </button>
    )
})
