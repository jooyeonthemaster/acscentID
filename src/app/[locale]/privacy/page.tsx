"use client"

import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
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
      <section className="pt-32 pb-8 px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-center"
        >
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-sm text-slate-500">
            {t('effectiveDate')}
          </p>
        </motion.div>
      </section>

      {/* Content */}
      <section className="pb-20 px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="space-y-8"
        >
          {/* 제1조 */}
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">{t('article1Title')}</h2>
            <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
              <p>{t('article1Intro')}</p>
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                <p className="font-bold text-slate-900 mb-1.5">{t('article1Required')}</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>{t('article1RequiredItem1')}</li>
                  <li>{t('article1RequiredItem2')}</li>
                </ul>
              </div>
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                <p className="font-bold text-slate-900 mb-1.5">{t('article1Auto')}</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>{t('article1AutoItem1')}</li>
                  <li>{t('article1AutoItem2')}</li>
                  <li>{t('article1AutoItem3')}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">{t('article2Title')}</h2>
            <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
              <p>{t('article2Intro')}</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><span className="font-semibold">{t('article2Item1Label')}</span> {t('article2Item1Desc')}</li>
                <li><span className="font-semibold">{t('article2Item2Label')}</span> {t('article2Item2Desc')}</li>
                <li><span className="font-semibold">{t('article2Item3Label')}</span> {t('article2Item3Desc')}</li>
                <li><span className="font-semibold">{t('article2Item4Label')}</span> {t('article2Item4Desc')}</li>
              </ul>
            </div>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">{t('article3Title')}</h2>
            <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
              <p>{t('article3Intro')}</p>
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                <ul className="space-y-1.5 text-slate-600">
                  <li><span className="font-semibold">{t('article3Item1Label')}</span> {t('article3Item1Desc')}</li>
                  <li><span className="font-semibold">{t('article3Item2Label')}</span> {t('article3Item2Desc')}</li>
                  <li><span className="font-semibold">{t('article3Item3Label')}</span> {t('article3Item3Desc')}</li>
                </ul>
              </div>
              <p className="text-xs text-slate-400">{t('article3Note')}</p>
            </div>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">{t('article4Title')}</h2>
            <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
              <p>{t('article4Intro')}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('article4Item1')}</li>
                <li>{t('article4Item2')}</li>
              </ul>
            </div>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">{t('article5Title')}</h2>
            <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
              <p>{t('article5Intro')}</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>{t('article5Item1')}</li>
                <li>{t('article5Item2')}</li>
                <li>{t('article5Item3')}</li>
                <li>{t('article5Item4')}</li>
              </ul>
              <div className="bg-yellow-50/70 rounded-lg p-3.5 border border-yellow-200">
                <p className="font-semibold text-slate-900 mb-0.5 text-sm">{t('article5ContactTitle')}</p>
                <p className="text-xs text-slate-600">{t('article5ContactDesc')}</p>
              </div>
            </div>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">{t('article6Title')}</h2>
            <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
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
          <section className="pt-5 border-t border-slate-200">
            <p className="text-slate-500 text-xs">
              {t('supplementEffective', { date: '2025년 1월 1일' })}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {t('supplementNotice')}
            </p>
          </section>
        </motion.div>
      </section>
    </main>
  )
}
