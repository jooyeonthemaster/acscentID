import { cn } from '@/lib/utils'

export interface SizeComparisonRow {
  option: string
  note: string
  price: string
}

interface SizeComparisonProps {
  headers: [string, string, string]
  rows: SizeComparisonRow[]
  className?: string
}

/**
 * 용량 비교 — 정보성 비교표.
 * 프로그램은 분석 후 구매 흐름이므로 선택 인터랙션을 흉내내지 않는다.
 * 가격은 반드시 DB(useProductPricing) 값을 포맷해 전달할 것.
 */
export function SizeComparison({ headers, rows, className }: SizeComparisonProps) {
  return (
    <div
      className={cn('mt-7 border-t-2 border-[var(--ink)] lg:mt-8', className)}
      role="table"
      aria-label={`${headers[0]} / ${headers[1]} / ${headers[2]}`}
    >
      <div
        role="row"
        className="grid min-h-[42px] grid-cols-[86px_minmax(0,1fr)_max-content] items-center gap-2 border-b border-[var(--line)] px-1 py-2.5 text-[11px] font-bold text-[var(--muted-ink)] lg:grid-cols-[100px_minmax(130px,1fr)_max-content] lg:gap-3 lg:px-2.5"
      >
        <span role="columnheader">{headers[0]}</span>
        <span role="columnheader">{headers[1]}</span>
        <span role="columnheader" className="text-right">{headers[2]}</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          role="row"
          className="grid min-h-[54px] grid-cols-[86px_minmax(0,1fr)_max-content] items-center gap-2 border-b border-[var(--line)] px-1 py-3 text-[12px] lg:grid-cols-[100px_minmax(130px,1fr)_max-content] lg:gap-3 lg:px-2.5 lg:text-[13px]"
        >
          <strong role="cell" className="font-black text-[var(--ink)]">{row.option}</strong>
          <span role="cell" className="break-keep text-[var(--muted-ink)]">{row.note}</span>
          <b role="cell" className="text-right font-bold text-[var(--ink)]">{row.price}</b>
        </div>
      ))}
    </div>
  )
}
