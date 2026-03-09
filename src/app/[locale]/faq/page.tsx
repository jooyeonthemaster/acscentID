'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

// FAQ 데이터 타입
interface FAQItem {
  question: string
  answer: string
}

interface FAQCategory {
  id: string
  label: string
  faqs: FAQItem[]
}

// FAQ 아이템 컴포넌트
function FAQAccordionItem({ faq, isOpen, onToggle }: { faq: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-2 border-black rounded-xl overflow-hidden bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-shadow">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-yellow-50 transition-colors"
      >
        <span className="font-bold text-slate-900 pr-4">{faq.question}</span>
        <ChevronDown
          size={20}
          className={cn(
            "flex-shrink-0 text-slate-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-2 border-t-2 border-dashed border-slate-200 bg-slate-50">
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  const t = useTranslations('faq')
  const [activeTab, setActiveTab] = useState('perfume')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // FAQ 데이터 (translated)
  const FAQ_DATA: FAQCategory[] = [
    {
      id: 'perfume',
      label: t('tabs.perfume'),
      faqs: [
        {
          question: t('questions.perfumeImage'),
          answer: t('questions.perfumeImageAnswer')
        }
      ]
    },
    {
      id: 'figure',
      label: t('tabs.figure'),
      faqs: [
        {
          question: t('questions.figureImage'),
          answer: t('questions.figureImageAnswer')
        },
        {
          question: t('questions.diffuserUsage'),
          answer: t('questions.diffuserUsageAnswer')
        }
      ]
    },
    {
      id: 'order',
      label: t('tabs.order'),
      faqs: [
        {
          question: t('questions.howToOrder'),
          answer: t('questions.howToOrderAnswer')
        }
      ]
    },
    {
      id: 'shipping',
      label: t('tabs.shipping'),
      faqs: [
        {
          question: t('questions.whenShip'),
          answer: t('questions.whenShipAnswer')
        }
      ]
    }
  ]

  const activeCategory = FAQ_DATA.find(cat => cat.id === activeTab) || FAQ_DATA[0]

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setOpenFaq(null) // Reset open FAQ when changing tabs
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-yellow-50 via-white to-purple-50 pt-28 pb-32">
        <div className="max-w-4xl mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 border-2 border-purple-300 rounded-full mb-6"
            >
              <HelpCircle size={16} className="text-purple-600" />
              <span className="text-sm font-bold text-purple-700">{t('badge')}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black text-slate-900 mb-4"
            >
              {t('title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-600 text-lg"
            >
              {t('subtitle')}
            </motion.p>
          </div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-1.5 md:gap-3 mb-10"
          >
            {FAQ_DATA.map((category) => (
              <button
                key={category.id}
                onClick={() => handleTabChange(category.id)}
                className={cn(
                  "px-2 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-bold text-[11px] md:text-sm border-2 transition-all whitespace-nowrap",
                  activeTab === category.id
                    ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_#FACC15] md:shadow-[3px_3px_0px_0px_#FACC15]"
                    : "bg-white text-slate-700 border-slate-300 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                )}
              >
                {category.label}
              </button>
            ))}
          </motion.div>

          {/* FAQ List */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {activeCategory.faqs.map((faq, index) => (
              <FAQAccordionItem
                key={index}
                faq={faq}
                isOpen={openFaq === index}
                onToggle={() => setOpenFaq(openFaq === index ? null : index)}
              />
            ))}
          </motion.div>

        </div>
      </main>
    </>
  )
}
