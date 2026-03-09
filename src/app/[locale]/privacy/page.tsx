"use client"

import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { Shield, Lock, Eye, Trash2, Mail } from "lucide-react"
import { useTranslations } from "next-intl"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function PrivacyPage() {
  const t = useTranslations('policy.privacy')

  return (
    <main className="min-h-screen bg-[#FFFDF5]">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-bold mb-6">
              <Shield size={16} />
              {t('badge')}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 whitespace-pre-line">
              {t('title')}
            </h1>
            <p className="text-slate-600">
              {t('effectiveDate')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_black] p-6 md:p-10 space-y-10"
          >
            {/* 제1조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Eye size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">{t('article1Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>{t('article1Intro')}</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-bold text-slate-900 mb-2">{t('article1Required')}</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>{t('article1RequiredItem1')}</li>
                    <li>{t('article1RequiredItem2')}</li>
                  </ul>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-bold text-slate-900 mb-2">{t('article1Auto')}</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>{t('article1AutoItem1')}</li>
                    <li>{t('article1AutoItem2')}</li>
                    <li>{t('article1AutoItem3')}</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제2조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Lock size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">{t('article2Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>{t('article2Intro')}</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><span className="font-bold">{t('article2Item1Label')}</span> {t('article2Item1Desc')}</li>
                  <li><span className="font-bold">{t('article2Item2Label')}</span> {t('article2Item2Desc')}</li>
                  <li><span className="font-bold">{t('article2Item3Label')}</span> {t('article2Item3Desc')}</li>
                  <li><span className="font-bold">{t('article2Item4Label')}</span> {t('article2Item4Desc')}</li>
                </ul>
              </div>
            </section>

            {/* 제3조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Shield size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">{t('article3Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>{t('article3Intro')}</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <ul className="space-y-2 text-sm">
                    <li><span className="font-bold">{t('article3Item1Label')}</span> {t('article3Item1Desc')}</li>
                    <li><span className="font-bold">{t('article3Item2Label')}</span> {t('article3Item2Desc')}</li>
                    <li><span className="font-bold">{t('article3Item3Label')}</span> {t('article3Item3Desc')}</li>
                  </ul>
                </div>
                <p className="text-sm text-slate-500">
                  {t('article3Note')}
                </p>
              </div>
            </section>

            {/* 제4조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Trash2 size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">{t('article4Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>{t('article4Intro')}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('article4Item1')}</li>
                  <li>{t('article4Item2')}</li>
                </ul>
              </div>
            </section>

            {/* 제5조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Mail size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">{t('article5Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>{t('article5Intro')}</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t('article5Item1')}</li>
                  <li>{t('article5Item2')}</li>
                  <li>{t('article5Item3')}</li>
                  <li>{t('article5Item4')}</li>
                </ul>
                <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                  <p className="font-bold text-slate-900 mb-1">{t('article5ContactTitle')}</p>
                  <p className="text-sm">{t('article5ContactDesc')}</p>
                </div>
              </div>
            </section>

            {/* 제6조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Lock size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">{t('article6Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>{t('article6Intro')}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('article6Item1')}</li>
                  <li>{t('article6Item2')}</li>
                  <li>{t('article6Item3')}</li>
                  <li>{t('article6Item4')}</li>
                </ul>
              </div>
            </section>

            {/* 부칙 */}
            <section className="pt-6 border-t-2 border-slate-200">
              <p className="text-slate-600 text-sm">
                {t('supplementEffective', { date: '2025년 1월 1일' })}
              </p>
              <p className="text-slate-500 text-sm mt-2">
                {t('supplementNotice')}
              </p>
            </section>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
