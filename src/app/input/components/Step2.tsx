"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { StepHeader } from "./StepHeader"
import { SelectChip } from "./SelectChip"
import { CustomInputToggle } from "./CustomInputToggle"
import { STYLES } from "../constants"
import type { Step2Props } from "../types"

export function Step2({ formData, setFormData, toggleStyle, isIdol }: Step2Props) {
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
                title={`${isIdol ? "최애" : "나"}의 스타일`}
                step={2}
                description={`${isIdol ? "최애" : "본인"}가 어떤 스타일인지 선택해주세요 (복수 선택 가능)`}
            />

            <div className="flex-1 mt-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                    {STYLES.map((style) => (
                        <SelectChip
                            key={style}
                            label={style}
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
                placeholder="다른 스타일을 입력해주세요"
            />
        </motion.div>
    )
}
