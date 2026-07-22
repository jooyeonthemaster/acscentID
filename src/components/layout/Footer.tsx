'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Instagram, Twitter, Copy, Check } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { isFocusedExperiencePath, hasOwnBottomBar } from '@/lib/route-visibility'
import { ADMIN_PROGRAMS } from '@/lib/admin/catalog'
import { useActiveProducts } from '@/hooks/useAdminContent'
import { useViewportMode } from '@/hooks/useViewportMode'
import { isDesktopChromeExcludedPath } from '@/lib/desktop/routes'

// 입금계좌 (복사용 — 숫자만)
const DEPOSIT_ACCOUNT_NUMBER = '1005-204-549279'

export const PROGRAM_NAME_KEYS: Record<string, string> = {
  'idol-image': 'products.idolImage',
  figure: 'products.figureDiffuser',
  graduation: 'products.graduation',
  personal: 'products.personal',
  'le-quack': 'products.leQuack',
  chemistry: 'products.chemistry',
  saju: 'products.saju',
  sample: 'programs.detail.sample.productName',
  'today-scent': 'todayScent.title',
}

export function Footer() {
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()
  const t = useTranslations()
  const locale = useLocale()
  const [copied, setCopied] = useState(false)
  const { products, isProductVisible } = useActiveProducts()
  const viewportMode = useViewportMode()
  // 데스크탑 크롬이 켜진 라우트에서는 lg+에서 DesktopFooter가 대신 렌더링된다
  const hideAtLg = !isDesktopChromeExcludedPath(pathname)

  // 노출(활성) 중인 프로그램만 admin_products 표시순서대로 자동 노출
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

  // 관리자 페이지, 집중 경험 경로, 자체 하단 고정 바 페이지(구매바 등)에서는 숨김
  // — 자체 하단 바가 있는 페이지에서 푸터가 고정 바를 덮는 겹침을 막는다.
  if (pathname?.startsWith('/admin') || isFocusedExperiencePath(pathname) || hasOwnBottomBar(pathname)) return null

  // 하이드레이션 후 데스크탑으로 확정되면 모바일 푸터는 언마운트 (lg 미만 동작 불변)
  if (hideAtLg && viewportMode === 'desktop') return null

  return (
    <footer className={`relative z-20 bg-[var(--dark-band)] text-white font-wanted${hideAtLg ? ' lg:hidden' : ''}`}>
      <div className="w-full px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Brand Section */}
          <div className="col-span-2">
            <div className="flex flex-col items-start mb-3">
              <Image
                src="/images/logo/acscent-wordmark-cream.png"
                alt="AC'SCENT"
                width={2053}
                height={285}
                className="h-[19px] w-auto select-none"
              />
            </div>
            <p className="text-xs lg:text-sm text-[var(--dark-muted)] leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Programs Links */}
          <div>
            <h3 className="text-xs lg:text-sm font-black uppercase text-white mb-3">
              {t('footer.programs')}
            </h3>
            <ul className="space-y-1.5">
              {visiblePrograms.map((program) => (
                <li key={program.slug}>
                  <Link
                    href={program.href}
                    className="text-xs lg:text-sm text-[var(--dark-muted)] hover:text-white inline-block transition-all"
                  >
                    {program.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-xs lg:text-sm font-black uppercase text-white mb-3">
              {t('footer.support')}
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/faq"
                  className="text-xs lg:text-sm text-[var(--dark-muted)] hover:text-white inline-block transition-all"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-xs lg:text-sm text-[var(--dark-muted)] hover:text-white inline-block transition-all"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Company Info */}
        <div className="border-t border-[var(--dark-line)] pt-4 mb-4">
          <p className="text-[10px] lg:text-[12px] text-[var(--dark-muted)] leading-relaxed">
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
          <div className="flex gap-3 mt-2">
            <Link href="/terms" className="text-[10px] lg:text-[12px] text-[var(--dark-muted)] hover:text-white transition-colors">
              {t('footer.terms')}
            </Link>
            <Link href="/privacy" className="text-[10px] lg:text-[12px] text-[var(--dark-muted)] hover:text-white transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href="/refund-policy" className="text-[10px] lg:text-[12px] text-[var(--dark-muted)] hover:text-white transition-colors">
              {t('footer.cancelRefundExchange')}
            </Link>
          </div>
        </div>

        {/* Deposit Account */}
        <div className="border-t border-[var(--dark-line)] pt-4 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm lg:text-base md:text-base font-bold text-white">
              {t('footer.depositAccount')}
            </p>
            <button
              onClick={handleCopyAccount}
              title={copied ? t('footer.copied') : t('footer.copyAccount')}
              aria-label={copied ? t('footer.copied') : t('footer.copyAccount')}
              className={`flex items-center justify-center w-9 h-9 rounded-[4px] border transition-colors shrink-0 ${
                copied
                  ? 'border-white text-white'
                  : 'border-[var(--dark-line)] text-[var(--dark-muted)] hover:border-white hover:text-white'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Social Media & Copyright */}
        <div className="border-t border-[var(--dark-line)] pt-4 flex items-center justify-between gap-3">
          {/* Social Links */}
          <div className="flex items-center gap-2">
            <Link
              href="https://www.instagram.com/acscent_id/"
              target="_blank"
              className="w-8 h-8 rounded-full border border-[var(--dark-line)] flex items-center justify-center text-[var(--dark-muted)] hover:border-white hover:text-white transition-colors"
            >
              <Instagram size={14} />
            </Link>
            <Link
              href="https://x.com/acscent_id"
              target="_blank"
              className="w-8 h-8 rounded-full border border-[var(--dark-line)] flex items-center justify-center text-[var(--dark-muted)] hover:border-white hover:text-white transition-colors"
            >
              <Twitter size={14} />
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-[10px] lg:text-[12px] text-[var(--dark-muted)]">
            © {currentYear} NEANDER Co.,LTD
          </p>
        </div>
      </div>
    </footer>
  )
}

export function getTranslatedProgramName(
  slug: string,
  fallback: string,
  t: ReturnType<typeof useTranslations>
) {
  const key = PROGRAM_NAME_KEYS[slug]
  return key && t.has(key) ? t(key) : fallback
}
