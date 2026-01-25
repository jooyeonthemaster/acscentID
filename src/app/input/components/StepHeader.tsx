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
            <p className="text-[10px] font-bold text-yellow-600 tracking-widest mb-1 drop-shadow-sm">
                {step}/{TOTAL_STEPS}
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight drop-shadow-sm">
                {title}
            </h1>
            <p className="text-sm text-slate-600 mt-2 drop-shadow-sm">
                {description}
            </p>
        </motion.div>
    )
}
