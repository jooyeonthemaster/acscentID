"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { StepHeader } from "./StepHeader"
import { SelectChip } from "./SelectChip"
import { CustomInputToggle } from "./CustomInputToggle"
import { CHARM_POINTS } from "../constants"
import type { Step4Props } from "../types"

export function Step4({ formData, setFormData, toggleCharmPoint, isIdol }: Step4Props) {
    const t = useTranslations()
    const [showCustomInput, setShowCustomInput] = useState(false)
    const charmPointLabels = t.raw('input.charmPoints') as string[]

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col overflow-hidden"
        >
            <StepHeader
                title={isIdol ? t('input.step4.titleIdol') : t('input.step4.titlePersonal')}
                step={4}
                description={isIdol ? t('input.step4.descIdol') : t('input.step4.descPersonal')}
            />

            <div className="flex-1 mt-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                    {CHARM_POINTS.map((point, index) => (
                        <SelectChip
                            key={point}
                            label={charmPointLabels[index] || point}
                            isSelected={formData.charmPoints.includes(point)}
                            onClick={() => toggleCharmPoint(point)}
                        />
                    ))}
                </div>
            </div>

            <CustomInputToggle
                isOpen={showCustomInput}
                onToggle={() => setShowCustomInput(true)}
                value={formData.customCharm}
                onChange={(value) => setFormData(prev => ({ ...prev, customCharm: value }))}
                placeholder={t('input.step4.customPlaceholder')}
            />
        </motion.div>
    )
}
