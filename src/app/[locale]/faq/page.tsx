'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle, Search, Loader2, MessagesSquare } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { loadFaqs, type FAQItem } from '@/lib/faq/store'

// FAQ 아이템 컴포넌트
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
    <div
      className={cn(
        'border-2 rounded-2xl overflow-hidden bg-white transition-all',
        isOpen
          ? 'border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
          : 'border-black/80 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 md:px-5 py-4 flex items-center gap-3 text-left hover:bg-yellow-50 transition-colors"
      >
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-black text-yellow-400 grid place-items-center text-sm font-black">
          Q
        </span>
        <span className="flex-1 font-bold text-slate-900 leading-snug">{faq.question}</span>
        <ChevronDown
          size={20}
          className={cn(
            'flex-shrink-0 text-slate-500 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
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
            <div className="px-4 md:px-5 pb-4 pt-3 border-t-2 border-dashed border-slate-200 bg-slate-50/70">
              {showCategory && (
                <span className="inline-flex mb-2 px-2 py-0.5 bg-yellow-100 border border-yellow-300 rounded-full text-[10px] font-black text-slate-700">
                  {faq.category}
                </span>
              )}
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-yellow-400 text-black grid place-items-center text-sm font-black">
                  A
                </span>
                <p className="flex-1 text-slate-600 leading-relaxed whitespace-pre-line pt-0.5">{faq.answer}</p>
              </div>
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
      <main className="min-h-screen bg-gradient-to-b from-yellow-50 via-white to-purple-50 pt-24 pb-32">
        <div className="max-w-3xl mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 border-2 border-purple-300 rounded-full mb-3"
            >
              <HelpCircle size={16} className="text-purple-600" />
              <span className="text-xs font-bold text-purple-700">{t('badge')}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-black text-slate-900 mb-2"
            >
              {t('title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-600 text-sm md:text-lg"
            >
              {t('subtitle')}
            </motion.p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setOpenId(null)
              }}
              placeholder={t('searchPlaceholder')}
              className="w-full h-12 rounded-2xl border-2 border-black bg-white pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 shadow-[3px_3px_0_0_#FACC15] outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>

          {/* Tab Navigation (hidden while searching) */}
          {!isSearching && categories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-1.5 md:gap-2.5 mb-6"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleTabChange(category)}
                  className={cn(
                    'px-2.5 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-bold text-[11px] md:text-sm border-2 transition-all whitespace-nowrap',
                    currentTab === category
                      ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_#FACC15] md:shadow-[3px_3px_0px_0px_#FACC15]'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
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
              <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
            </div>
          ) : (
            <motion.div
              key={isSearching ? 'search' : currentTab ?? 'none'}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3.5"
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
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 px-5 py-14 text-center">
                  <MessagesSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">{t('noResults')}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </>
  )
}
