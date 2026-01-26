'use client'

import Link from 'next/link'
import { Instagram, Twitter, Facebook, Mail } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative z-20 bg-black text-white border-t-4 border-yellow-400">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex flex-col items-start mb-4">
              <span className="text-2xl font-black tracking-tighter text-white">
                AC&apos;SCENT
              </span>
              <span className="text-xs font-bold tracking-[0.4em] text-yellow-400 -mt-1">
                IDENTITY
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              나만의 향기를 찾는<br />가장 즐거운 서비스
            </p>
            <p className="text-xs text-slate-400">
              AI 기술과 향수 전문성의 결합으로<br />
              누구나 자신만의 향을 찾을 수 있습니다.
            </p>
          </div>

          {/* About Links */}
          <div>
            <h3 className="text-sm font-black tracking-wider uppercase text-yellow-400 mb-4">
              브랜드
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about/brand"
                  className="text-sm text-slate-300 hover:text-white hover:translate-x-1 inline-block transition-all"
                >
                  브랜드 스토리
                </Link>
              </li>
              <li>
                <Link
                  href="/about/how-it-works"
                  className="text-sm text-slate-300 hover:text-white hover:translate-x-1 inline-block transition-all"
                >
                  작동 원리
                </Link>
              </li>
            </ul>
          </div>

          {/* Programs Links */}
          <div>
            <h3 className="text-sm font-black tracking-wider uppercase text-yellow-400 mb-4">
              프로그램
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/programs/idol-image"
                  className="text-sm text-slate-300 hover:text-white hover:translate-x-1 inline-block transition-all"
                >
                  AI 이미지 분석
                </Link>
              </li>
              <li>
                <Link
                  href="/programs/figure"
                  className="text-sm text-slate-300 hover:text-white hover:translate-x-1 inline-block transition-all"
                >
                  피규어 디퓨저
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links (Placeholder) */}
          <div>
            <h3 className="text-sm font-black tracking-wider uppercase text-yellow-400 mb-4">
              고객지원
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  disabled
                  className="text-sm text-slate-500 cursor-not-allowed"
                  title="준비 중"
                >
                  문의하기 (준비 중)
                </button>
              </li>
              <li>
                <button
                  disabled
                  className="text-sm text-slate-500 cursor-not-allowed"
                  title="준비 중"
                >
                  FAQ (준비 중)
                </button>
              </li>
              <li>
                <button
                  disabled
                  className="text-sm text-slate-500 cursor-not-allowed"
                  title="준비 중"
                >
                  개인정보처리방침 (준비 중)
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media & Copyright */}
        <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Social Links (Placeholder) */}
          <div className="flex items-center gap-4">
            <button
              disabled
              className="w-10 h-10 rounded-full border-2 border-slate-600 flex items-center justify-center text-slate-600 cursor-not-allowed"
              title="Coming Soon"
            >
              <Instagram size={18} />
            </button>
            <button
              disabled
              className="w-10 h-10 rounded-full border-2 border-slate-600 flex items-center justify-center text-slate-600 cursor-not-allowed"
              title="Coming Soon"
            >
              <Twitter size={18} />
            </button>
            <button
              disabled
              className="w-10 h-10 rounded-full border-2 border-slate-600 flex items-center justify-center text-slate-600 cursor-not-allowed"
              title="Coming Soon"
            >
              <Mail size={18} />
            </button>
          </div>

          {/* Copyright */}
          <p className="text-sm text-slate-400">
            © {currentYear} AC&apos;SCENT IDENTITY. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
