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
                        w-full py-3 px-4
                        text-sm font-medium text-slate-600
                        bg-white/80 backdrop-blur-md rounded-xl
                        border-2 border-dashed border-slate-300
                        shadow-md shadow-slate-900/5
                        hover:border-yellow-400 hover:text-yellow-600 hover:bg-white/90
                        transition-all duration-200
                    "
                >
                    + 직접 입력하기
                </button>
            ) : (
                <div className="relative">
                    {/* 스티치 효과 - 외곽선 */}
                    <div className="absolute -inset-[3px] rounded-2xl border-2 border-dashed border-yellow-400/60 pointer-events-none" />
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="
                            relative w-full p-3
                            bg-white/90 backdrop-blur-md rounded-xl
                            text-sm text-slate-800
                            placeholder:text-slate-400
                            outline-none
                            border-2 border-yellow-200
                            shadow-lg shadow-yellow-400/10
                            focus:border-yellow-400 focus:bg-white focus:shadow-yellow-400/20
                            transition-all
                        "
                    />
                </div>
            )}
        </motion.div>
    )
}
