import { SectionHeading } from './SectionHeading'

export interface FaqItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  kicker: string
  title: string
  items: FaqItem[]
  id?: string
}

/** FAQ — 얇은 구분선 아코디언 (네이티브 details/summary, 키보드 접근 기본 지원) */
export function FAQSection({ kicker, title, items, id }: FAQSectionProps) {
  return (
    <section id={id} className="bg-[var(--paper)] px-5 py-16 lg:px-6 lg:py-24">
      <SectionHeading kicker={kicker} title={title} />
      <div className="mx-auto w-full max-w-[860px] border-t-2 border-[var(--ink)]">
        {items.map((item, index) => (
          <details key={index} className="group border-b border-[var(--line)]">
            <summary className="relative cursor-pointer list-none py-5 pl-1 pr-12 text-sm font-bold text-[var(--ink)] [&::-webkit-details-marker]:hidden lg:text-[15px]">
              {item.question}
              <span
                aria-hidden="true"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] font-sans text-lg font-normal text-[var(--ink)] group-open:hidden"
              >
                +
              </span>
              <span
                aria-hidden="true"
                className="absolute right-2 top-1/2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] font-sans text-lg font-normal text-[var(--ink)] group-open:grid"
              >
                −
              </span>
            </summary>
            <p className="max-w-[720px] break-keep pb-5 pl-1 pr-12 text-[13px] leading-[1.75] text-[var(--muted-ink)]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
