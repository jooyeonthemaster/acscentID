"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { StepHeader } from "./StepHeader"
import { SelectChip } from "./SelectChip"
import { CustomInputToggle } from "./CustomInputToggle"
import { PERSONALITIES } from "../constants"
import type { Step3Props } from "../types"

export function Step3({ formData, setFormData, togglePersonality, isIdol }: Step3Props) {
    const t = useTranslations()
    const [showCustomInput, setShowCustomInput] = useState(false)
    const personalityLabels = t.raw('input.personalities') as string[]

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col overflow-hidden"
        >
            <StepHeader
                title={isIdol ? t('input.step3.titleIdol') : t('input.step3.titlePersonal')}
                step={3}
                description={isIdol ? t('input.step3.descIdol') : t('input.step3.descPersonal')}
            />

            <div className="flex-1 mt-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                    {PERSONALITIES.map((personality, index) => (
                        <SelectChip
                            key={personality}
                            label={personalityLabels[index] || personality}
                            isSelected={formData.personalities.includes(personality)}
                            onClick={() => togglePersonality(personality)}
                        />
                    ))}
                </div>
            </div>

            <CustomInputToggle
                isOpen={showCustomInput}
                onToggle={() => setShowCustomInput(true)}
                value={formData.customPersonality}
                onChange={(value) => setFormData(prev => ({ ...prev, customPersonality: value }))}
                placeholder={t('input.step3.customPlaceholder')}
            />
        </motion.div>
    )
}
