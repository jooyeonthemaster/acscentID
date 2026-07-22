import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DetailListItem {
  term: string
  description: string
}

interface MediaCopySectionProps {
  media: ReactNode
  kicker?: ReactNode
  title: ReactNode
  lead?: ReactNode
  detailList?: DetailListItem[]
  /** 표 등 detailList 대신/이후에 붙는 자유 콘텐츠 */
  children?: ReactNode
  reverse?: boolean
  dark?: boolean
  className?: string
}

/** 미디어+카피 2열 섹션 — 목업의 media-copy 패턴 */
export function MediaCopySection({
  media,
  kicker,
  title,
  lead,
  detailList,
  children,
  reverse = false,
  dark = false,
  className,
}: MediaCopySectionProps) {
  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-[1120px] grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-16',
        className,
      )}
    >
      <div className={cn('mx-auto w-full max-w-[620px] lg:max-w-none', reverse && 'lg:order-2')}>
        {media}
      </div>
      <div className={cn(reverse && 'lg:order-1')}>
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
              'mt-4 break-keep text-sm leading-[1.8] lg:mt-5 lg:text-[15px]',
              dark ? 'text-[var(--dark-muted)]' : 'text-[var(--muted-ink)]',
            )}
          >
            {lead}
          </p>
        )}
        {detailList && detailList.length > 0 && (
          <dl
            className={cn(
              'mt-7 border-t lg:mt-8',
              dark ? 'border-[var(--dark-line)]' : 'border-[#BFC0B9]',
            )}
          >
            {detailList.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'grid grid-cols-1 gap-1.5 border-b py-4 lg:grid-cols-[155px_minmax(0,1fr)] lg:gap-4',
                  dark ? 'border-[var(--dark-line)]' : 'border-[#CDCEC8]',
                )}
              >
                <dt
                  className={cn(
                    'text-[11px] font-black',
                    dark ? 'text-[var(--accent-strong,#E9B82E)]' : 'text-[var(--accent-deep,#686863)]',
                  )}
                >
                  {item.term}
                </dt>
                <dd
                  className={cn(
                    'break-keep text-[13px] leading-[1.6]',
                    dark ? 'text-[var(--dark-muted)]' : 'text-[#484843]',
                  )}
                >
                  {item.description}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {children}
      </div>
    </div>
  )
}
