import { cn } from '@/lib/utils'

export interface ProcessStepItem {
  title: string
  description: string
}

interface ProcessStepsProps {
  steps: ProcessStepItem[]
  className?: string
}

/** 진행 과정 — 포인트색 상단 보더의 4단계 카드 그리드 */
export function ProcessSteps({ steps, className }: ProcessStepsProps) {
  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-[1080px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {steps.map((step, index) => (
        <div
          key={index}
          className="min-h-[150px] rounded-[6px] border border-[var(--line)] border-t-4 border-t-[var(--accent-strong,#E9B82E)] bg-white p-5 lg:min-h-[205px] lg:p-6"
        >
          <span className="text-xs font-black text-[var(--accent-deep,#686863)]">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="mt-5 break-keep text-[15px] font-black text-[var(--ink)] lg:mt-10 lg:text-[17px]">
            {step.title}
          </h3>
          <p className="mt-2 break-keep text-[13px] leading-[1.65] text-[var(--muted-ink)]">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  )
}
