'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useActiveProducts, useProductThumbnailMap } from '@/hooks/useAdminContent'
import { PROGRAM_NAV_LINKS } from '@/lib/navigation'
import { PRODUCT_IMAGE_PLACEHOLDER } from '@/lib/products/images'

/** 판매중지 안내·404 등에서 지금 이용 가능한 프로그램을 카드로 추천한다 */
export function ProgramSuggestions({
  title,
  excludeSlug,
  limit = 3,
}: {
  title: string
  excludeSlug?: string
  limit?: number
}) {
  const t = useTranslations()
  const { isProductVisible, loading } = useActiveProducts()
  const { thumbnails } = useProductThumbnailMap()
  if (loading) return null

  const programs = PROGRAM_NAV_LINKS
    .filter((link) => link.slug !== excludeSlug && isProductVisible(link.slug))
    .slice(0, limit)
  if (programs.length === 0) return null

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-lg font-black text-[var(--ink)]">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {programs.map((link) => (
          <li key={link.slug}>
            <Link
              href={link.href}
              className="group flex h-full flex-col overflow-hidden rounded-[5px] border border-[var(--line)] bg-white transition-colors hover:border-[var(--ink)]"
            >
              <div className="relative aspect-square bg-[var(--soft)]">
                <Image
                  src={thumbnails[link.slug] || PRODUCT_IMAGE_PLACEHOLDER}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 50vw, 240px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col px-3 py-3">
                <span className="text-sm lg:text-base font-bold text-[var(--ink)]">{t(link.labelKey)}</span>
                <span className="mt-1 line-clamp-2 text-xs lg:text-sm text-[var(--muted-ink)]">{t(link.descKey)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
