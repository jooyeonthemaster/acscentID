import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FeatureStripProps {
  items: ReactNode[]
  className?: string
}

/** 핵심 특징 스트립 — 히어로 직후의 다크 대비 밴드 */
export function FeatureStrip({ items, className }: FeatureStripProps) {
  return (
    <section className={cn('bg-[var(--dark-band)] text-white', className)} aria-label="key features">
      <div className="mx-auto grid w-full max-w-[1020px] grid-cols-1 gap-2 px-5 py-4 lg:min-h-[76px] lg:grid-cols-3 lg:items-center lg:gap-8 lg:py-0">
        {items.map((item, index) => (
          <span key={index} className="text-[13px] font-bold lg:text-center">
            <b className="mr-2 text-[11px] font-black text-[var(--accent-strong,#E9B82E)]">
              {String(index + 1).padStart(2, '0')}
            </b>
            {item}
          </span>
        ))}
      </div>
    </section>
  )
}
