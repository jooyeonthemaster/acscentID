'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  flushLocaleSwitchStateSnapshots,
  notifyLocaleSwitchStart,
  restoreLocaleFormDomSnapshot,
  saveLocaleFormDomSnapshot,
} from '@/hooks/useLocaleSwitchState'

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scopeKey = `${pathname}${window.location.search}`
    let attempts = 0
    let timeoutId: number | undefined

    const tryRestore = () => {
      attempts += 1
      const restored = restoreLocaleFormDomSnapshot(scopeKey)
      if (restored || attempts >= 20) return
      timeoutId = window.setTimeout(tryRestore, 100)
    }

    timeoutId = window.setTimeout(tryRestore, 0)

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [locale, pathname])

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

  const handleLocaleChange = async (newLocale: Locale) => {
    const search = window.location.search
    const scopeKey = `${pathname}${search}`
    await flushLocaleSwitchStateSnapshots()
    saveLocaleFormDomSnapshot(scopeKey)
    notifyLocaleSwitchStart(newLocale)
    router.replace(pathname + search, { locale: newLocale })
    setIsOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-1.5 py-1 rounded-[4px] transition-colors",
          dark ? "text-[var(--dark-muted)] hover:bg-white/10 hover:text-white" : "text-[var(--muted-ink)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"
        )}
        aria-label="Language"
      >
        <Globe size={14} />
        <span className="text-[10px] lg:text-[12px] font-bold uppercase">{locale}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 bg-white border border-[var(--line)] rounded-[6px] shadow-sm overflow-hidden z-50 min-w-[140px]"
          >
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => handleLocaleChange(l)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm lg:text-base transition-colors",
                  locale === l
                    ? "bg-[var(--soft)] font-bold text-[var(--ink)]"
                    : "hover:bg-[var(--soft)] text-[var(--muted-ink)]"
                )}
              >
                <span className="text-base">{localeFlags[l]}</span>
                <span className="text-xs lg:text-sm font-medium">{localeNames[l]}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
