"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { StepHeader } from "./StepHeader"
import { SelectChip } from "./SelectChip"
import { CustomInputToggle } from "./CustomInputToggle"
import { STYLES } from "../constants"
import type { Step2Props } from "../types"

export function Step2({ formData, setFormData, toggleStyle, isIdol }: Step2Props) {
    const t = useTranslations()
    const [showCustomInput, setShowCustomInput] = useState(false)
    const styleLabels = t.raw('input.styles') as string[]

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col overflow-hidden"
        >
            <StepHeader
                title={isIdol ? t('input.step2.titleIdol') : t('input.step2.titlePersonal')}
                step={2}
                description={isIdol ? t('input.step2.descIdol') : t('input.step2.descPersonal')}
            />

            <div className="flex-1 mt-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                    {STYLES.map((style, index) => (
                        <SelectChip
                            key={style}
                            label={styleLabels[index] || style}
                            isSelected={formData.styles.includes(style)}
                            onClick={() => toggleStyle(style)}
                        />
                    ))}
                </div>
            </div>

            <CustomInputToggle
                isOpen={showCustomInput}
                onToggle={() => setShowCustomInput(true)}
                value={formData.customStyle}
                onChange={(value) => setFormData(prev => ({ ...prev, customStyle: value }))}
                placeholder={t('input.step2.customPlaceholder')}
            />
        </motion.div>
    )
}
