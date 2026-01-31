"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { StepHeader } from "./StepHeader"
import { SelectChip } from "./SelectChip"
import { CustomInputToggle } from "./CustomInputToggle"
import { PERSONALITIES } from "../constants"
import type { Step3Props } from "../types"

export function Step3({ formData, setFormData, togglePersonality, isIdol }: Step3Props) {
    const [showCustomInput, setShowCustomInput] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col overflow-hidden"
        >
            <StepHeader
                title={`${isIdol ? "분석 대상" : "나"}의 성격`}
                step={3}
                description={`${isIdol ? "분석 대상" : "본인"}이 어떤 성격인지 선택해주세요 (복수 선택 가능)`}
            />

            <div className="flex-1 mt-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                    {PERSONALITIES.map((personality) => (
                        <SelectChip
                            key={personality}
                            label={personality}
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
                placeholder="다른 성격을 입력해주세요"
            />
        </motion.div>
    )
}
