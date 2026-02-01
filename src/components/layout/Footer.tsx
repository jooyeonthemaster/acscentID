'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Instagram, Twitter } from 'lucide-react'

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

        {/* Company Info */}
        <div className="border-t border-slate-700 pt-4 mb-4">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-300">NEANDER Co.,LTD</span>
            <br />
            대표 유재영, 이동주 | 사업자등록번호 683-86-02812
            <br />
            통신판매신고번호 2023-서울서대문-1558
            <br />
            서울 마포구 와우산로29라길 22
            <br />
            Tel. 02-336-3368 | Mail. neander@neander.co.kr
          </p>
          <div className="flex gap-3 mt-2">
            <Link href="/terms" className="text-[10px] text-slate-400 hover:text-white transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="text-[10px] text-slate-400 hover:text-white transition-colors">
              개인정보처리방침
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
