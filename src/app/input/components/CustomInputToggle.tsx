"use client"

import { motion } from "framer-motion"

interface CustomInputToggleProps {
    isOpen: boolean
    onToggle: () => void
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export function CustomInputToggle({
    isOpen,
    onToggle,
    value,
    onChange,
    placeholder = "직접 입력해주세요"
}: CustomInputToggleProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
        >
            {!isOpen ? (
                <button
                    type="button"
                    onClick={onToggle}
                    className="
                        w-full py-3
                        text-sm text-slate-400
                        hover:text-yellow-600
                        transition-colors
                    "
                >
                    + 직접 입력하기
                </button>
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="
                        w-full p-3
                        bg-white/60 rounded-xl
                        text-sm text-slate-800
                        placeholder:text-slate-300
                        outline-none
                        border-2 border-transparent
                        focus:border-yellow-400 focus:bg-white
                        transition-all
                    "
                />
            )}
        </motion.div>
    )
}
