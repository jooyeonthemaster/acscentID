'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Instagram, Twitter } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { isFocusedExperiencePath } from '@/lib/route-visibility'

export function Footer() {
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()
  const t = useTranslations()

  // 관리자 페이지에서는 숨김
  if (pathname?.startsWith('/admin') || isFocusedExperiencePath(pathname)) return null

  return (
    <footer className="relative z-20 bg-black text-white border-t-4 border-yellow-400">
      <div className="w-full px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Brand Section */}
          <div className="col-span-2">
            <div className="flex flex-col items-start mb-3">
              <span className="text-xl font-black tracking-tighter text-white">
                AC&apos;SCENT
              </span>
              <span className="text-[10px] font-bold tracking-[0.3em] text-yellow-400 -mt-1">
                IDENTITY
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Programs Links */}
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-yellow-400 mb-3">
              {t('footer.programs')}
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/programs/idol-image"
                  className="text-xs text-slate-300 hover:text-white inline-block transition-all"
                >
                  {t('footer.aiImageAnalysis')}
                </Link>
              </li>
              <li>
                <Link
                  href="/programs/figure"
                  className="text-xs text-slate-300 hover:text-white inline-block transition-all"
                >
                  {t('footer.figureDiffuser')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-yellow-400 mb-3">
              {t('footer.support')}
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/faq"
                  className="text-xs text-slate-300 hover:text-white inline-block transition-all"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-xs text-slate-300 hover:text-white inline-block transition-all"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Company Info */}
        <div className="border-t border-slate-700 pt-4 mb-4">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-300">NEANDER Co.,LTD</span>
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
            <Link href="/terms" className="text-[10px] text-slate-400 hover:text-white transition-colors">
              {t('footer.terms')}
            </Link>
            <Link href="/privacy" className="text-[10px] text-slate-400 hover:text-white transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href="/refund-policy" className="text-[10px] text-slate-400 hover:text-white transition-colors">
              {t('footer.cancelRefundExchange')}
            </Link>
          </div>
        </div>

        {/* Social Media & Copyright */}
        <div className="border-t border-slate-700 pt-4 flex items-center justify-between gap-3">
          {/* Social Links */}
          <div className="flex items-center gap-2">
            <Link
              href="https://www.instagram.com/acscent_id/"
              target="_blank"
              className="w-8 h-8 rounded-full border border-slate-400 flex items-center justify-center text-slate-400 hover:border-white hover:text-white transition-colors"
            >
              <Instagram size={14} />
            </Link>
            <Link
              href="https://x.com/acscent_id"
              target="_blank"
              className="w-8 h-8 rounded-full border border-slate-400 flex items-center justify-center text-slate-400 hover:border-white hover:text-white transition-colors"
            >
              <Twitter size={14} />
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-[10px] text-slate-400">
            © {currentYear} NEANDER Co.,LTD
          </p>
        </div>
      </div>
    </footer>
  )
}
