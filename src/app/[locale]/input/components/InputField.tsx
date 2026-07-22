"use client"

import { motion } from "framer-motion"
import type { InputFieldProps } from "../types"

const ACCENT_STYLES = {
    yellow: {
        label: "text-[var(--ink)]",
        ring: "border-[var(--line)] shadow-[0_0_16px_rgba(212,160,23,0.15)]",
    },
    rose: {
        label: "text-[var(--ink)]",
        ring: "border-[var(--line)] shadow-[0_0_16px_rgba(212,160,23,0.15)]",
    },
}

export function InputField({
    label,
    value,
    onChange,
    placeholder,
    isFocused,
    onFocus,
    onBlur,
    type = "text",
    center,
    letterSpacing,
    maxLength,
    accentColor = "yellow"
}: InputFieldProps) {
    const accent = ACCENT_STYLES[accentColor]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
        >
            <label className={`text-xs lg:text-sm font-bold uppercase tracking-wider transition-colors ${
                isFocused ? accent.label : "text-[var(--muted-ink)]"
            }`}>
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder={placeholder}
                maxLength={maxLength}
                className={`w-full bg-[var(--soft)] rounded-[6px] p-4 text-lg font-semibold text-[var(--ink)] placeholder:text-[var(--muted-ink)] placeholder:font-normal outline-none transition-colors duration-300 border ${
                    center ? "text-center" : ""
                } ${letterSpacing ? "tracking-[0.3em]" : ""} ${
                    isFocused ? accent.ring : "border-[var(--line)] hover:border-[var(--line)]"
                }`}
            />
        </motion.div>
    )
}
