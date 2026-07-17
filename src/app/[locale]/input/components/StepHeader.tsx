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
            <p className="text-[10px] lg:text-[12px] font-bold text-[#A69F8D] tracking-widest mb-1">
                {step}/{TOTAL_STEPS}
            </p>
            <h1 className="text-2xl font-extrabold text-[#E9E2D0] leading-tight">
                {title}
            </h1>
            <p className="text-sm lg:text-base text-[#A69F8D] mt-2">
                {description}
            </p>
        </motion.div>
    )
}
