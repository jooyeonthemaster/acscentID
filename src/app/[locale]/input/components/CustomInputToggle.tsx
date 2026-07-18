"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

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
    placeholder
}: CustomInputToggleProps) {
    const t = useTranslations()

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
                        text-sm lg:text-base font-medium text-[#A69F8D]
                        bg-[#F5EFE2] rounded-[12px]
                        border border-dashed border-[#D8CFBB]
                        hover:border-[#C9BFA8]
                        transition-all duration-200
                    "
                >
                    {t('input.customInput')}
                </button>
            ) : (
                <div className="relative">
                    {/* 스티치 효과 - 외곽선 */}
                    <div className="absolute -inset-[3px] rounded-[12px] border border-dashed border-[#3A4051] pointer-events-none" />
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || t('input.customPlaceholder')}
                        className="
                            relative w-full p-3
                            bg-[#12141D] rounded-[12px]
                            text-sm lg:text-base text-[#E9E2D0]
                            placeholder:text-[#5C564A]
                            outline-none
                            border border-[#262A38]
                            focus:border-[#E9E2D0]/70
                            transition-all
                        "
                    />
                </div>
            )}
        </motion.div>
    )
}
