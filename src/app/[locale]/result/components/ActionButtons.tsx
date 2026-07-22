"use client"

import React from 'react'

interface ActionButtonsProps {
  onFeedback: () => void
  onRestart: () => void
}

export function ActionButtons({ onFeedback, onRestart }: ActionButtonsProps) {
  return (
    <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-[var(--line)]">
      <button
        onClick={onFeedback}
        className="px-4 py-2.5 bg-[var(--soft)] text-[var(--ink)] rounded-full font-bold text-sm lg:text-base hover:bg-[var(--soft)] transition-colors shadow-sm"
      >
        피드백 보내기
      </button>
      <button
        onClick={onRestart}
        className="px-4 py-2 border border-[var(--line)] text-[var(--muted-ink)] rounded-full font-medium text-sm lg:text-base hover:bg-[var(--soft)] transition-colors"
      >
        다시 시작하기
      </button>
    </div>
  )
}



