'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Instagram, Twitter, Copy, Check } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { ADMIN_PROGRAMS } from '@/lib/admin/catalog'
import { useActiveProducts } from '@/hooks/useAdminContent'
import { getTranslatedProgramName } from '@/components/layout/Footer'
import { useViewportMode } from '@/hooks/useViewportMode'
import { isDesktopFooterExcludedPath } from '@/lib/desktop/routes'

const DEPOSIT_ACCOUNT_NUMBER = '1005-204-549279'

/**
 * lg 이상 전용 전역 푸터. 모바일 Footer와 동일한 데이터 소스(노출 프로그램,
 * 번역 키, 계좌 복사)를 4컬럼 와이드 그리드로 배치한다.
 */
export function DesktopFooter() {
  const pathname = usePathname()
  const mode = useViewportMode()
  const t = useTranslations()
  const locale = useLocale()
  const currentYear = new Date().getFullYear()
  const [copied, setCopied] = useState(false)
  const { products, isProductVisible } = useActiveProducts()

  if (isDesktopFooterExcludedPath(pathname)) return null
  if (mode === 'mobile') return null

  const productBySlug = new Map(products.map((p) => [p.slug, p]))
  const visiblePrograms = ADMIN_PROGRAMS
    .filter((program) => isProductVisible(program.slug))
    .map((program) => ({
      slug: program.slug,
      href: program.publicHref,
      name: locale === 'ko'
        ? productBySlug.get(program.slug)?.name ?? program.name
        : getTranslatedProgramName(program.slug, program.name, t),
      order: productBySlug.get(program.slug)?.display_order ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.order - b.order)

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(DEPOSIT_ACCOUNT_NUMBER)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 접근 불가 시 무시
    }
  }

  const linkClass = 'text-xs lg:text-sm text-[var(--dark-muted)] hover:text-white inline-block transition-all'

  return (
    <footer className="relative z-20 hidden w-full bg-[var(--dark-band)] text-white lg:block">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <div className="grid grid-cols-[2fr_1fr_1fr_1.4fr] gap-10">
          {/* 브랜드 */}
          <div>
            <Image
              src="/images/logo/acscent-wordmark-cream.png"
              alt="AC'SCENT"
              width={2053}
              height={285}
              className="h-[19px] w-auto select-none"
            />
            <p className="mt-3 text-xs lg:text-sm leading-relaxed text-[var(--dark-muted)]">
              {t('footer.tagline')}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Link
                href="https://www.instagram.com/acscent_id/"
                target="_blank"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--dark-line)] text-[var(--dark-muted)] transition-colors hover:border-white hover:text-white"
              >
                <Instagram size={14} />
              </Link>
              <Link
                href="https://x.com/acscent_id"
                target="_blank"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--dark-line)] text-[var(--dark-muted)] transition-colors hover:border-white hover:text-white"
              >
                <Twitter size={14} />
              </Link>
            </div>
          </div>

          {/* 프로그램 */}
          <div>
            <h3 className="mb-3 text-xs lg:text-sm font-black uppercase text-white">
              {t('footer.programs')}
            </h3>
            <ul className="space-y-1.5">
              {visiblePrograms.map((program) => (
                <li key={program.slug}>
                  <Link href={program.href} className={linkClass}>
                    {program.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h3 className="mb-3 text-xs lg:text-sm font-black uppercase text-white">
              {t('footer.support')}
            </h3>
            <ul className="space-y-1.5">
              <li><Link href="/faq" className={linkClass}>FAQ</Link></li>
              <li><Link href="/terms" className={linkClass}>{t('footer.terms')}</Link></li>
              <li><Link href="/privacy" className={linkClass}>{t('footer.privacy')}</Link></li>
              <li><Link href="/refund-policy" className={linkClass}>{t('footer.cancelRefundExchange')}</Link></li>
            </ul>
          </div>

          {/* 회사 정보 + 입금계좌 */}
          <div>
            <p className="text-[11px] lg:text-[13px] leading-relaxed text-[var(--dark-muted)]">
              <span className="font-bold text-white">NEANDER Co.,LTD</span>
              <br />
              {t('footer.companyInfo')}
              <br />
              {t('footer.salesRegistration')}
              <br />
              {t('footer.companyAddress')}
              <br />
              {t('footer.companyContact')}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[6px] border border-[var(--dark-line)] px-3 py-2.5">
              <p className="text-xs lg:text-sm font-bold text-white">
                {t('footer.depositAccount')}
              </p>
              <button
                onClick={handleCopyAccount}
                title={copied ? t('footer.copied') : t('footer.copyAccount')}
                aria-label={copied ? t('footer.copied') : t('footer.copyAccount')}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                  copied
                    ? 'border-white text-white'
                    : 'border-[var(--dark-line)] text-[var(--dark-muted)] hover:border-white hover:text-white'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-[var(--dark-line)] pt-4">
          <p className="text-[10px] lg:text-[12px] text-[var(--dark-muted)]">© {currentYear} NEANDER Co.,LTD</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-[10px] lg:text-[12px] text-[var(--dark-muted)] transition-colors hover:text-white">
              {t('footer.terms')}
            </Link>
            <Link href="/privacy" className="text-[10px] lg:text-[12px] text-[var(--dark-muted)] transition-colors hover:text-white">
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
