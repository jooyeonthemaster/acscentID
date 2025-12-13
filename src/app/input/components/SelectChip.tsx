"use client"

import { motion } from "framer-motion"

interface SelectChipProps {
    label: string
    isSelected: boolean
    onClick: () => void
}

export function SelectChip({ label, isSelected, onClick }: SelectChipProps) {
    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`relative w-full py-3.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${
                isSelected
                    ? "bg-yellow-400 text-slate-900 shadow-md"
                    : "bg-white/60 text-slate-500 hover:bg-white/80"
            }`}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {isSelected && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-slate-800"
                    >
                        ✓
                    </motion.span>
                )}
                {label}
            </span>
        </motion.button>
    )
}
