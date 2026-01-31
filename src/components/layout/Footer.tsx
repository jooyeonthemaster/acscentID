'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Instagram, Twitter, Facebook, Mail } from 'lucide-react'

export function Footer() {
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()

  // 관리자 페이지에서는 숨김
  if (pathname?.startsWith('/admin')) return null

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
              나만의 향기를 찾는 가장 즐거운 서비스
            </p>
          </div>

          {/* Programs Links */}
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-yellow-400 mb-3">
              프로그램
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/programs/idol-image"
                  className="text-xs text-slate-300 hover:text-white inline-block transition-all"
                >
                  AI 이미지 분석
                </Link>
              </li>
              <li>
                <Link
                  href="/programs/figure"
                  className="text-xs text-slate-300 hover:text-white inline-block transition-all"
                >
                  피규어 디퓨저
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-yellow-400 mb-3">
              고객지원
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
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media & Copyright */}
        <div className="border-t border-slate-700 pt-4 flex items-center justify-between gap-3">
          {/* Social Links (Placeholder) */}
          <div className="flex items-center gap-2">
            <button
              disabled
              className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center text-slate-600 cursor-not-allowed"
              title="Coming Soon"
            >
              <Instagram size={14} />
            </button>
            <button
              disabled
              className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center text-slate-600 cursor-not-allowed"
              title="Coming Soon"
            >
              <Twitter size={14} />
            </button>
            <button
              disabled
              className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center text-slate-600 cursor-not-allowed"
              title="Coming Soon"
            >
              <Mail size={14} />
            </button>
          </div>

          {/* Copyright */}
          <p className="text-[10px] text-slate-400">
            © {currentYear} AC&apos;SCENT IDENTITY
          </p>
        </div>
      </div>
    </footer>
  )
}
