'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, Loader2, MessagesSquare } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { loadFaqs, type FAQItem } from '@/lib/faq/store'

// FAQ 아이템 컴포넌트 — 얇은 구분선 아코디언
function FAQAccordionItem({
  faq,
  isOpen,
  onToggle,
  showCategory,
}: {
  faq: FAQItem
  isOpen: boolean
  onToggle: () => void
  showCategory?: boolean
}) {
  return (
    <div className="border-b border-[var(--line)]">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 py-5 pl-1 pr-2 text-left transition-colors hover:text-[var(--muted-ink)]"
      >
        <span className="flex-1 break-keep text-sm font-bold leading-snug text-[var(--ink)] lg:text-[15px]">
          {faq.question}
        </span>
        <span
          aria-hidden="true"
          className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)]"
        >
          <ChevronDown
            size={15}
            className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-5 pl-1 pr-12">
              {showCategory && (
                <span className="mb-2 inline-flex rounded-[3px] bg-[var(--soft)] px-2 py-0.5 text-[10px] font-black text-[var(--muted-ink)]">
                  {faq.category}
                </span>
              )}
              <p className="max-w-[720px] whitespace-pre-line break-keep text-[13px] leading-[1.75] text-[var(--muted-ink)]">
                {faq.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  const t = useTranslations('faq')
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // ---- Fetch active FAQs ----
  useEffect(() => {
    let cancelled = false
    loadFaqs()
      .then((data) => {
        if (!cancelled) setFaqs(data.filter((f) => f.is_active))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ---- Build categories (in display order, first-appearance) ----
  const categories = useMemo(() => {
    const seen: string[] = []
    for (const f of faqs) {
      if (!seen.includes(f.category)) seen.push(f.category)
    }
    return seen
  }, [faqs])

  // 선택된 탭(없거나 더 이상 존재하지 않으면 첫 카테고리로 폴백)
  const currentTab =
    activeTab && categories.includes(activeTab) ? activeTab : categories[0] ?? null

  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0

  const visibleFaqs = useMemo(() => {
    if (isSearching) {
      return faqs.filter((f) =>
        `${f.question} ${f.answer} ${f.category}`.toLowerCase().includes(normalizedQuery)
      )
    }
    return faqs.filter((f) => f.category === currentTab)
  }, [faqs, isSearching, normalizedQuery, currentTab])

  const handleTabChange = (cat: string) => {
    setActiveTab(cat)
    setQuery('')
    setOpenId(null)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--paper)] pb-32 pt-24 lg:pt-32">
        <div className="mx-auto max-w-3xl px-4">
          {/* Hero Section */}
          <div className="mb-8 text-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3 block text-[11px] font-black text-[var(--muted-ink)]"
            >
              {t('badge')}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="mb-3 break-keep text-3xl font-black text-[var(--ink)] md:text-4xl"
            >
              {t('title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="break-keep text-sm text-[var(--muted-ink)] md:text-base"
            >
              {t('subtitle')}
            </motion.p>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-ink)]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setOpenId(null)
              }}
              placeholder={t('searchPlaceholder')}
              className="h-12 w-full rounded-[5px] border border-[var(--line)] bg-white pl-11 pr-4 text-sm font-medium text-[var(--ink)] outline-none placeholder:text-[var(--muted-ink)] focus:border-[var(--ink)] lg:text-base"
            />
          </div>

          {/* Tab Navigation (hidden while searching) */}
          {!isSearching && categories.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mb-8 flex flex-wrap justify-center gap-2"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleTabChange(category)}
                  className={cn(
                    'whitespace-nowrap rounded-[4px] border px-3 py-2 text-[12px] font-bold transition-colors md:px-4 md:text-[13px]',
                    currentTab === category
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                      : 'border-[var(--line)] bg-white text-[var(--muted-ink)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                  )}
                >
                  {category}
                </button>
              ))}
            </motion.div>
          )}

          {/* FAQ List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--muted-ink)]" />
            </div>
          ) : (
            <motion.div
              key={isSearching ? 'search' : currentTab ?? 'none'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="border-t-2 border-[var(--ink)]"
            >
              {visibleFaqs.map((faq) => (
                <FAQAccordionItem
                  key={faq.id}
                  faq={faq}
                  isOpen={openId === faq.id}
                  onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
                  showCategory={isSearching}
                />
              ))}
              {visibleFaqs.length === 0 && (
                <div className="border-b border-[var(--line)] px-5 py-14 text-center">
                  <MessagesSquare className="mx-auto mb-3 h-10 w-10 text-[var(--line)]" />
                  <p className="text-sm font-bold text-[var(--muted-ink)] lg:text-base">{t('noResults')}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </>
  )
}
