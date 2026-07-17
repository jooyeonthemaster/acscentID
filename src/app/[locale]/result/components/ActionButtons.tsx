"use client"

import React from 'react'

interface ActionButtonsProps {
  onFeedback: () => void
  onRestart: () => void
}

export function ActionButtons({ onFeedback, onRestart }: ActionButtonsProps) {
  return (
    <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-[#262A38]">
      <button
        onClick={onFeedback}
        className="px-4 py-2.5 bg-[#F5EFE2] text-[#12141D] rounded-full font-bold text-sm lg:text-base hover:bg-[#FFFDF5] transition-colors shadow-sm"
      >
        피드백 보내기
      </button>
      <button
        onClick={onRestart}
        className="px-4 py-2 border-2 border-[#262A38] text-[#A69F8D] rounded-full font-medium text-sm lg:text-base hover:bg-[#151823] transition-colors"
      >
        다시 시작하기
      </button>
    </div>
  )
}



