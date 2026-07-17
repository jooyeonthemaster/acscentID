'use client'

import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { DesktopDetailHero } from '@/components/desktop/DesktopDetailHero'
import type { ProductPageContent, ProductPagePositionField } from '@/lib/products/page-content'

type DesktopHeroProps = ComponentProps<typeof DesktopDetailHero>

interface PersonalDesktopProps {
  title: ReactNode
  imageAlt: string
  pageContent: ProductPageContent
  pagePositionStyle: (field: ProductPagePositionField) => CSSProperties | undefined
  breadcrumbs: DesktopHeroProps['breadcrumbs']
  /** 모바일과 공유하는 컨트롤드 이미지 상태 (선택 인덱스가 페이지에 있어 리사이즈에도 유지) */
  images: DesktopHeroProps['images']
  secondaryBadges: ReactNode
  meta: ReactNode
  price: ReactNode
  infoIcon: ReactNode
  infoItems: ReactNode[]
  cta: DesktopHeroProps['cta']
  /** 모바일과 공유하는 상세 본문 (isCustomMode 분기 포함) */
  detailBody: ReactNode
  /** 모바일과 공유하는 리뷰 섹션 */
  reviewSection: ReactNode
  /** 리뷰 뒤에 오는 FAQ · 최종 CTA 섹션 (모바일 순서 그대로) */
  marketingSections: ReactNode
}

/**
 * 퍼스널 센트 프로그램 데스크탑 변형 (lg+):
 * DesktopDetailHero 2컬럼 + 상세 본문/리뷰/FAQ·최종 CTA를 중앙 레일에 배치.
 * 히어로 props는 모바일 UnifiedDetailHero에 넘기는 값을 그대로 미러링한다.
 */
export function PersonalDesktop({
  title,
  imageAlt,
  pageContent,
  pagePositionStyle,
  breadcrumbs,
  images,
  secondaryBadges,
  meta,
  price,
  infoIcon,
  infoItems,
  cta,
  detailBody,
  reviewSection,
  marketingSections,
}: PersonalDesktopProps) {
  return (
    <>
      <DesktopDetailHero
        productSlug="personal"
        title={title}
        imageAlt={imageAlt}
        pageContent={pageContent}
        pagePositionStyle={pagePositionStyle}
        breadcrumbs={breadcrumbs}
        images={images}
        secondaryBadges={secondaryBadges}
        meta={meta}
        price={price}
        infoIcon={infoIcon}
        infoItems={infoItems}
        cta={cta}
      />

      {/* 상세 본문 — 모바일과 동일 JSX를 중앙 레일에 배치 (섹션 자체 배경이 레일 폭으로 렌더링됨) */}
      {/* 리뷰 레일(960)과 폭을 맞춰 후기 진입 시 갑자기 넓어지는 단차 제거 */}
      <div className="mx-auto w-full max-w-[960px]">
        {detailBody}
      </div>

      {/* 리뷰 — 조금 더 넓은 레일 */}
      <div className="mx-auto w-full max-w-[960px]">
        {reviewSection}
      </div>

      {/* FAQ · 최종 CTA — 모바일과 동일 JSX를 콘텐츠 레일에 배치 (본문·리뷰와 동일한 960 레일로 폭 통일) */}
      <div className="mx-auto w-full max-w-[960px]">
        {marketingSections}
      </div>
    </>
  )
}
