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
            className="h-full px-6 py-4 flex flex-col overflow-hidden"
        >
            <StepHeader
                title={`${isIdol ? "최애" : "나"}의 성격`}
                step={3}
                description={`${isIdol ? "최애" : "본인"}가 어떤 성격인지 선택해주세요 (복수 선택 가능)`}
            />

            <div className="flex-1 mt-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                    {PERSONALITIES.map((personality, index) => (
                        <motion.div
                            key={personality}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <SelectChip
                                label={personality}
                                isSelected={formData.personalities.includes(personality)}
                                onClick={() => togglePersonality(personality)}
                            />
                        </motion.div>
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
