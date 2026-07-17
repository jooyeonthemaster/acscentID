"use client"

import { motion } from "framer-motion"
import type { InputFieldProps } from "../types"

const ACCENT_STYLES = {
    yellow: {
        label: "text-[#E9E2D0]",
        ring: "border-[#E9E2D0]/70 shadow-[0_0_20px_rgba(233,226,208,0.1)]",
    },
    rose: {
        label: "text-[#E9E2D0]",
        ring: "border-[#E9E2D0]/70 shadow-[0_0_20px_rgba(233,226,208,0.1)]",
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
                isFocused ? accent.label : "text-[#8B8578]"
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
                className={`w-full bg-[#12141D] rounded-[12px] p-4 text-lg font-semibold text-[#E9E2D0] placeholder:text-[#5C564A] placeholder:font-normal outline-none transition-colors duration-300 border ${
                    center ? "text-center" : ""
                } ${letterSpacing ? "tracking-[0.3em]" : ""} ${
                    isFocused ? accent.ring : "border-[#262A38] hover:border-[#3A4051]"
                }`}
            />
        </motion.div>
    )
}
