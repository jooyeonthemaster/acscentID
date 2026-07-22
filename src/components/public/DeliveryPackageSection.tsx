import { MediaCopySection, type DetailListItem } from './MediaCopySection'
import { EvidenceMediaGrid, type EvidenceMediaItem } from './EvidenceMediaGrid'

export interface PackageListItem {
  title: string
  description: string
}

export interface DeliveryFlowStep {
  title: string
  description: string
}

interface DeliveryPackageSectionProps {
  media: EvidenceMediaItem[]
  kicker: string
  title: React.ReactNode
  lead: string
  packageList: PackageListItem[]
  deliveryFlow: DeliveryFlowStep[]
  detailList?: DetailListItem[]
}

/** 배송 안내 — 실제 출고 사진 + 구성품 목록 + 배송 과정을 담는 다크 밴드 */
export function DeliveryPackageSection({
  media,
  kicker,
  title,
  lead,
  packageList,
  deliveryFlow,
  detailList,
}: DeliveryPackageSectionProps) {
  return (
    <section className="bg-[#1B1C1B] px-5 py-16 text-white lg:px-6 lg:py-28">
      <MediaCopySection
        dark
        media={<EvidenceMediaGrid items={media} dark framed sizes="(max-width: 640px) 100vw, (max-width: 860px) 90vw, 280px" />}
        kicker={kicker}
        title={title}
        lead={lead}
        detailList={detailList}
      >
        <ul className="mt-7 border-t border-[var(--dark-line)]">
          {packageList.map((item, index) => (
            <li
              key={index}
              className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 border-b border-[#3F403E] py-4"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--accent-strong,#E9B82E)] text-[11px] font-black text-[var(--accent-strong,#E9B82E)]">
                {index + 1}
              </span>
              <div>
                <strong className="text-sm font-bold text-white">{item.title}</strong>
                <p className="mt-1 break-keep text-xs text-[var(--dark-muted)]">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </MediaCopySection>

      <div
        className="mx-auto mt-12 grid w-full max-w-[1080px] grid-cols-1 border-y border-[var(--dark-line)] sm:grid-cols-2 lg:mt-16 lg:grid-cols-4"
        aria-label="delivery flow"
      >
        {deliveryFlow.map((step, index) => (
          <div
            key={index}
            className="min-h-[116px] border-t border-[var(--dark-line)] p-5 first:border-t-0 sm:border-t-0 sm:[&:nth-child(n+3)]:border-t lg:min-h-[148px] lg:border-l lg:!border-t-0 lg:first:border-l-0"
          >
            <span className="mb-3 block text-[11px] font-black text-[var(--accent-strong,#E9B82E)] lg:mb-5">
              {String(index + 1).padStart(2, '0')}
            </span>
            <strong className="text-sm font-bold text-white">{step.title}</strong>
            <p className="mt-1.5 break-keep text-[11px] leading-[1.55] text-[var(--dark-muted)]">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
