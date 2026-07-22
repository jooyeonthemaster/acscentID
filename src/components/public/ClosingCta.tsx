import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClosingCtaProps {
  kicker: string
  title: ReactNode
  buttonLabel: string
  onClick?: () => void
  disabled?: boolean
  /** accent-ai | accent-chem 스코프 안에서 var(--accent-strong)을 배경으로 쓴다 */
  className?: string
}

/** 마무리 CTA — 포인트색 풀블리드 밴드 */
export function ClosingCta({ kicker, title, buttonLabel, onClick, disabled, className }: ClosingCtaProps) {
  return (
    <section
      className={cn(
        'grid min-h-[260px] grid-cols-1 items-center gap-8 bg-[var(--accent-strong,#E9B82E)] px-6 py-14 text-[#171717] lg:min-h-[300px] lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-16 lg:px-[max(24px,calc((100%-1080px)/2))]',
        className,
      )}
    >
      <div>
        <span className="mb-3 block text-[11px] font-black">{kicker}</span>
        <h2 className="break-keep text-[26px] font-black leading-[1.3] lg:text-4xl">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex min-h-[54px] w-full max-w-[340px] items-center justify-center gap-2 rounded-[5px] border border-[#171717] bg-white px-5 text-sm font-black text-[#171717] transition-colors hover:bg-[#F3F3EF] disabled:opacity-50"
      >
        {buttonLabel}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  )
}
