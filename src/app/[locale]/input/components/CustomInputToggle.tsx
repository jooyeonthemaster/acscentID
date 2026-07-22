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
                        text-sm lg:text-base font-medium text-[var(--muted-ink)]
                        bg-[var(--soft)] rounded-[6px]
                        border border-dashed border-[var(--line)]
                        hover:border-[var(--line)]
                        transition-all duration-200
                    "
                >
                    {t('input.customInput')}
                </button>
            ) : (
                <div className="relative">
                    {/* 스티치 효과 - 외곽선 */}
                    <div className="absolute -inset-[3px] rounded-[6px] border border-dashed border-[var(--line)] pointer-events-none" />
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || t('input.customPlaceholder')}
                        className="
                            relative w-full p-3
                            bg-[var(--paper)] rounded-[6px]
                            text-sm lg:text-base text-[var(--ink)]
                            placeholder:text-[var(--muted-ink)]
                            outline-none
                            border border-[var(--line)]
                            focus:border-[var(--line)]/70
                            transition-all
                        "
                    />
                </div>
            )}
        </motion.div>
    )
}
