'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles, HelpCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'

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

// FAQ 데이터
const FAQ_DATA: FAQCategory[] = [
  {
    id: 'perfume',
    label: 'AI 이미지 분석 퍼퓸',
    faqs: [
      {
        question: '어떤 이미지를 업로드해야 하나요?',
        answer: '인물 또는 캐릭터의 얼굴이 보이는 사진이면 모두 가능합니다. 화보, 무대, 셀카 등 어떤 사진이든 분석 가능합니다.\n\n분석 받고 싶은 인물 또는 캐릭터가 단독으로 있는 사진일수록, 고화질일수록 더 정확한 분석이 가능합니다.'
      }
    ]
  },
  {
    id: 'figure',
    label: '피규어 화분 디퓨저',
    faqs: [
      {
        question: '어떤 이미지를 업로드해야 하나요?',
        answer: '피규어로 제작될 이미지를 업로드하실 때는 인물 또는 캐릭터의 전신 또는 상반신이 잘 보이는 이미지일수록 좋습니다.\n\n업로드하신 이미지와 최대한 비슷하게 구현하고 있기 때문에 피규어로 제작될 이미지를 업로드해주시면 됩니다.'
      },
      {
        question: '디퓨저는 어떻게 사용하나요?',
        answer: '샤쉐스톤 위에 향 에센스를 뿌려주시면 됩니다. 향이 약하면 에센스를 더욱 많이 뿌려주세요.'
      }
    ]
  },
  {
    id: 'order',
    label: '주문/결제',
    faqs: [
      {
        question: '주문은 어떻게 하나요?',
        answer: '원하시는 프로그램 페이지에서 이미지를 업로드하고 분석을 진행한 후, 결과가 마음에 드시면 결제를 진행하시면 됩니다.'
      }
    ]
  },
  {
    id: 'shipping',
    label: '배송',
    faqs: [
      {
        question: '언제 배송되나요?',
        answer: '주문일로부터 2~3일 내에 배송이 접수됩니다. 배송 접수가 지연되는 경우 미리 연락드릴 예정입니다.'
      }
    ]
  }
]

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
  const [activeTab, setActiveTab] = useState('perfume')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
              <span className="text-sm font-bold text-purple-700">자주 묻는 질문</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black text-slate-900 mb-4"
            >
              FAQ
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-600 text-lg"
            >
              궁금하신 점이 있으신가요?<br className="md:hidden" /> 아래에서 답변을 찾아보세요.
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

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center p-8 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <Sparkles size={32} className="mx-auto mb-4 text-purple-500" />
            <h3 className="text-xl font-black text-slate-900 mb-2">
              원하는 답변을 찾지 못하셨나요?
            </h3>
            <p className="text-slate-600 mb-6 whitespace-nowrap text-sm">
              추가 문의사항이 있으시면 언제든 연락해 주세요.
            </p>
            <a
              href="mailto:support@acscent.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              문의하기
            </a>
          </motion.div>
        </div>
      </main>
    </>
  )
}
