import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface EvidenceMediaItem {
  src: string
  alt: string
  /** "실제 상품 사진 기반" | "내부 구성 시각화" 등 출처 라벨 */
  badge: string
  caption: string
}

interface EvidenceMediaGridProps {
  items: EvidenceMediaItem[]
  dark?: boolean
  /** 다크 밴드 안에서 실사 그리드를 감싸는 얇은 프레임 (sm+ 전용 — 모바일은 풀블리드) */
  framed?: boolean
  sizes?: string
  className?: string
}

/**
 * 실사 근거 그리드 — 출처 배지와 설명이 붙는 정사각 사진.
 * 모바일: 1열 풀블리드(호스트 섹션의 px-5를 -mx-5로 상쇄) / sm+: 2열 카드.
 */
export function EvidenceMediaGrid({
  items,
  dark = false,
  framed = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 860px) 50vw, 280px',
  className,
}: EvidenceMediaGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-3',
        '-mx-5 sm:mx-0',
        framed && 'sm:rounded-[6px] sm:border sm:border-[var(--dark-line)] sm:bg-[#282927] sm:p-2.5',
        className,
      )}
    >
      {items.map((item, index) => (
        <figure key={index} className="min-w-0">
          <div className="relative aspect-square overflow-hidden bg-[var(--soft)] sm:rounded-[5px]">
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes={sizes}
              className="object-cover"
              data-pin-nopin="true"
            />
          </div>
          <figcaption
            className={cn(
              'mt-2 px-5 text-[11px] leading-[1.5] sm:px-0.5',
              dark ? 'text-[var(--dark-muted)]' : 'text-[var(--muted-ink)]',
            )}
          >
            <strong
              className={cn(
                'mb-0.5 block text-[10px] font-black',
                dark ? 'text-white' : 'text-[var(--ink)]',
              )}
            >
              {item.badge}
            </strong>
            {item.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
