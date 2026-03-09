'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocaleChange = (newLocale: Locale) => {
    const search = window.location.search
    router.replace(pathname + search, { locale: newLocale })
    setIsOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        aria-label="Language"
      >
        <Globe size={14} />
        <span className="text-[10px] font-bold uppercase">{locale}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50 min-w-[140px]"
          >
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => handleLocaleChange(l)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  locale === l
                    ? "bg-yellow-100 font-bold text-yellow-800"
                    : "hover:bg-slate-50 text-slate-700"
                )}
              >
                <span className="text-base">{localeFlags[l]}</span>
                <span className="text-xs font-medium">{localeNames[l]}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
