"use client"

import { motion } from "framer-motion"
import type { InputFieldProps } from "../types"

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
    letterSpacing
}: InputFieldProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
        >
            <label className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                isFocused ? "text-yellow-600" : "text-slate-500"
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
                className={`w-full bg-white/80 backdrop-blur-md rounded-xl p-4 text-lg font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all duration-300 border border-white/60 shadow-lg shadow-slate-900/5 ${
                    center ? "text-center" : ""
                } ${letterSpacing ? "tracking-[0.3em]" : ""} ${
                    isFocused ? "ring-2 ring-yellow-400 bg-white border-yellow-200" : "hover:bg-white/90 hover:border-white"
                }`}
            />
        </motion.div>
    )
}
