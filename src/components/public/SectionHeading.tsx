import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  kicker?: ReactNode
  title: ReactNode
  lead?: ReactNode
  align?: 'center' | 'left'
  dark?: boolean
  className?: string
}

/** 섹션 헤딩 — 킥커(포인트색) → 제목 → 리드 순의 정형 위계 */
export function SectionHeading({
  kicker,
  title,
  lead,
  align = 'center',
  dark = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'mx-auto mb-10 max-w-[680px] lg:mb-14',
        align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {kicker && (
        <span
          className={cn(
            'mb-3 block text-[11px] font-black',
            dark ? 'text-[var(--accent-strong,#E9B82E)]' : 'text-[var(--accent-deep,#686863)]',
          )}
        >
          {kicker}
        </span>
      )}
      <h2
        className={cn(
          'break-keep text-[26px] font-black leading-[1.3] lg:text-4xl',
          dark ? 'text-white' : 'text-[var(--ink)]',
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            'mt-4 break-keep text-sm leading-[1.8] lg:text-base',
            dark ? 'text-[var(--dark-muted)]' : 'text-[var(--muted-ink)]',
          )}
        >
          {lead}
        </p>
      )}
    </div>
  )
}
