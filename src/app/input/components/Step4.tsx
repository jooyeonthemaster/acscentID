"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { StepHeader } from "./StepHeader"
import { SelectChip } from "./SelectChip"
import { CustomInputToggle } from "./CustomInputToggle"
import { CHARM_POINTS } from "../constants"
import type { Step4Props } from "../types"

export function Step4({ formData, setFormData, toggleCharmPoint, isIdol }: Step4Props) {
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
                title={`${isIdol ? "최애" : "나"}의 매력 포인트`}
                step={4}
                description={`${isIdol ? "최애" : "본인"}의 매력 포인트를 선택해주세요 (복수 선택 가능)`}
            />

            <div className="flex-1 mt-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                    {CHARM_POINTS.map((point) => (
                        <SelectChip
                            key={point}
                            label={point}
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
                placeholder="다른 매력 포인트를 입력해주세요"
            />
        </motion.div>
    )
}
