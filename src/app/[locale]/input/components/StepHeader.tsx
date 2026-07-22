"use client"

import { motion } from "framer-motion"
import { TOTAL_STEPS } from "../constants"

interface StepHeaderProps {
    title: string
    step: number
    description: string
}

export function StepHeader({ title, step, description }: StepHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <p className="text-[10px] lg:text-[12px] font-bold text-[var(--muted-ink)] tracking-widest mb-1">
                {step}/{TOTAL_STEPS}
            </p>
            <h1 className="text-2xl font-extrabold text-[var(--ink)] leading-tight">
                {title}
            </h1>
            <p className="text-sm lg:text-base text-[var(--muted-ink)] mt-2">
                {description}
            </p>
        </motion.div>
    )
}
