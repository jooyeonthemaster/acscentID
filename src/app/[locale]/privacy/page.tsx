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
    <main className="min-h-screen bg-[#0C0E16]">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-8 px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-center"
        >
          <h1 className="text-2xl font-black text-[#E9E2D0] mb-2">
            {t('title')}
          </h1>
          <p className="text-sm lg:text-base text-[#8B8578]">
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
          className="space-y-8 lg:mx-auto lg:max-w-3xl"
        >
          {/* 제1조 */}
          <section>
            <h2 className="text-base font-bold text-[#E9E2D0] mb-3">{t('article1Title')}</h2>
            <div className="space-y-3 text-[#A69F8D] text-sm lg:text-base leading-relaxed">
              <p>{t('article1Intro')}</p>
              <div className="bg-[#151823] rounded-[12px] p-3.5 border border-[#262A38]">
                <p className="font-bold text-[#E9E2D0] mb-1.5">{t('article1Required')}</p>
                <ul className="list-disc list-inside space-y-1 text-[#A69F8D]">
                  <li>{t('article1RequiredItem1')}</li>
                  <li>{t('article1RequiredItem2')}</li>
                </ul>
              </div>
              <div className="bg-[#151823] rounded-[12px] p-3.5 border border-[#262A38]">
                <p className="font-bold text-[#E9E2D0] mb-1.5">{t('article1Auto')}</p>
                <ul className="list-disc list-inside space-y-1 text-[#A69F8D]">
                  <li>{t('article1AutoItem1')}</li>
                  <li>{t('article1AutoItem2')}</li>
                  <li>{t('article1AutoItem3')}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-base font-bold text-[#E9E2D0] mb-3">{t('article2Title')}</h2>
            <div className="space-y-3 text-[#A69F8D] text-sm lg:text-base leading-relaxed">
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
            <h2 className="text-base font-bold text-[#E9E2D0] mb-3">{t('article3Title')}</h2>
            <div className="space-y-3 text-[#A69F8D] text-sm lg:text-base leading-relaxed">
              <p>{t('article3Intro')}</p>
              <div className="bg-[#151823] rounded-[12px] p-3.5 border border-[#262A38]">
                <ul className="space-y-1.5 text-[#A69F8D]">
                  <li><span className="font-semibold">{t('article3Item1Label')}</span> {t('article3Item1Desc')}</li>
                  <li><span className="font-semibold">{t('article3Item2Label')}</span> {t('article3Item2Desc')}</li>
                  <li><span className="font-semibold">{t('article3Item3Label')}</span> {t('article3Item3Desc')}</li>
                </ul>
              </div>
              <p className="text-xs lg:text-sm text-[#8B8578]">{t('article3Note')}</p>
            </div>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-base font-bold text-[#E9E2D0] mb-3">{t('article4Title')}</h2>
            <div className="space-y-3 text-[#A69F8D] text-sm lg:text-base leading-relaxed">
              <p>{t('article4Intro')}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('article4Item1')}</li>
                <li>{t('article4Item2')}</li>
              </ul>
            </div>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-base font-bold text-[#E9E2D0] mb-3">{t('article5Title')}</h2>
            <div className="space-y-3 text-[#A69F8D] text-sm lg:text-base leading-relaxed">
              <p>{t('article5Intro')}</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>{t('article5Item1')}</li>
                <li>{t('article5Item2')}</li>
                <li>{t('article5Item3')}</li>
                <li>{t('article5Item4')}</li>
              </ul>
              <div className="bg-[#0C0E16]/70 rounded-[12px] p-3.5 border border-[#262A38]">
                <p className="font-semibold text-[#E9E2D0] mb-0.5 text-sm lg:text-base">{t('article5ContactTitle')}</p>
                <p className="text-xs lg:text-sm text-[#A69F8D]">{t('article5ContactDesc')}</p>
              </div>
            </div>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-base font-bold text-[#E9E2D0] mb-3">{t('article6Title')}</h2>
            <div className="space-y-3 text-[#A69F8D] text-sm lg:text-base leading-relaxed">
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
          <section className="pt-5 border-t border-[#262A38]">
            <p className="text-[#8B8578] text-xs lg:text-sm">
              {t('supplementEffective', { date: '2025년 1월 1일' })}
            </p>
            <p className="text-[#8B8578] text-xs lg:text-sm mt-1">
              {t('supplementNotice')}
            </p>
          </section>
        </motion.div>
      </section>
    </main>
  )
}
