'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PackageX } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useActiveProducts } from '@/hooks/useAdminContent'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ProgramSuggestions } from '@/components/programs/ProgramSuggestions'
import { hasOwnBottomBar } from '@/lib/route-visibility'

interface InactiveProductGuardProps {
  productSlug: string
  children: React.ReactNode
}

export function InactiveProductGuard({ productSlug, children }: InactiveProductGuardProps) {
  const { isProductActive, loading } = useActiveProducts()
  const isAdminPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('adminPreview') === '1'

  // 로딩 중에는 children 렌더 (깜빡임 방지)
  if (loading) return <>{children}</>

  // 관리자 상품 편집 미리보기에서는 비활성 상품도 그대로 편집 가능해야 합니다.
  if (isAdminPreview) return <>{children}</>

  if (!isProductActive(productSlug)) {
    return <InactiveProductNotice productSlug={productSlug} />
  }

  return <>{children}</>
}

function InactiveProductNotice({ productSlug }: { productSlug: string }) {
  const t = useTranslations()
  const pathname = usePathname()
  // 자체 구매바 페이지(le-quack 등)는 전역 푸터·하단 탭을 숨기므로, 안내 화면에서는 직접 붙인다
  const needsShellChrome = hasOwnBottomBar(pathname)

  return (
    <>
      <Header />
      <section className="bg-[var(--canvas)] px-4 pb-16 pt-28 lg:pt-32">
        <div className="mx-auto w-full max-w-[455px] lg:max-w-[720px]">
          <div className="rounded-[6px] border border-[var(--line)] bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)]">
              <PackageX className="h-7 w-7 text-[var(--muted-ink)]" aria-hidden />
            </div>
            <h1 className="mb-2 text-xl font-black text-[var(--ink)]">{t('programs.inactive.title')}</h1>
            <p className="text-sm lg:text-base text-[var(--muted-ink)]">{t('programs.inactive.description')}</p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[5px] bg-[var(--ink)] px-5 text-base font-bold text-white transition-colors hover:bg-black"
            >
              {t('programs.inactive.backHome')}
            </Link>
          </div>

          <ProgramSuggestions title={t('programs.inactive.alternativesTitle')} excludeSlug={productSlug} />
        </div>
      </section>
      {needsShellChrome && (
        <>
          <Footer ignoreOwnBottomBar />
          <MobileBottomNav ignoreOwnBottomBar />
        </>
      )}
    </>
  )
}
