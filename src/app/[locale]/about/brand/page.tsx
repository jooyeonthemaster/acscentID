"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Sparkles, Heart, Star, TrendingUp } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useTranslations } from "next-intl"

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
    }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
}

export default function BrandStoryPage() {
  const t = useTranslations('about.brand')

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#10131C] lg:bg-[#FBF7EF] font-wanted">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 px-5 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] pointer-events-none" />
        <div className="absolute top-20 -right-20 w-96 h-96 bg-[#232838] lg:bg-[#EEB62B] rounded-full blur-3xl opacity-20 animate-pulse" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          {/* Tag */}
          <div className="inline-block px-4 py-2 rounded-full border-2 border-[#262A38] lg:border-[#B8880F]/45 bg-[#12141D] lg:bg-[#F5EFE2] mb-6 sm:mb-8 transform -rotate-2">
            <span className="text-xs lg:text-sm font-black text-[#E9E2D0] lg:text-[#1A1610] tracking-widest uppercase flex items-center gap-2">
              <Sparkles size={14} className="text-[#8B8578]" />
              {t('tag')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#E9E2D0] lg:text-[#1A1610] leading-[1.1] tracking-tight mb-6 break-keep">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#161925] via-[#161925] to-[#161925]">
              {t('headline')}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#A69F8D] lg:text-[#6E6659] font-medium max-w-2xl mx-auto leading-relaxed break-keep">
            {t('heroDesc')}
          </p>
        </motion.div>
      </section>

      {/* Origin Story */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-6 bg-[#12141D] lg:bg-[#F5EFE2] border-y-2 border-[#262A38]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="mb-12 sm:mb-16 text-center">
            <h2 className="text-3xl sm:text-5xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-6 sm:mb-8 break-keep">
              {t('originTitle')}
            </h2>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Story 1 */}
            <div className="p-6 sm:p-8 bg-[#0C0E16] lg:bg-[#FDFAF1] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-[12px]">
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#161925] lg:bg-[#EFE4C8] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-full flex items-center justify-center">
                  <Heart size={24} className="text-[#E9E2D0] lg:text-[#1A1610] fill-[#E9E2D0] lg:fill-[#1A1610]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2 sm:mb-3 break-keep">{t('story1Title')}</h3>
                  <p className="text-[#A69F8D] lg:text-[#6E6659] leading-relaxed text-base sm:text-lg break-keep">
                    {t('story1Desc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Story 2 */}
            <div className="p-6 sm:p-8 bg-[#0C0E16] lg:bg-[#FDFAF1] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-[12px]">
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#161925] lg:bg-[#EFE4C8] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-full flex items-center justify-center">
                  <Sparkles size={24} className="text-[#E9E2D0] lg:text-[#1A1610]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2 sm:mb-3 break-keep">{t('story2Title')}</h3>
                  <p className="text-[#A69F8D] lg:text-[#6E6659] leading-relaxed text-base sm:text-lg break-keep">
                    {t('story2Desc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Story 3 */}
            <div className="p-6 sm:p-8 bg-[#0C0E16] lg:bg-[#FDFAF1] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-[12px]">
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#161925] lg:bg-[#EFE4C8] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-full flex items-center justify-center">
                  <Star size={24} className="text-[#E9E2D0] lg:text-[#1A1610] fill-[#E9E2D0] lg:fill-[#1A1610]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2 sm:mb-3 break-keep">{t('story3Title')}</h3>
                  <p className="text-[#A69F8D] lg:text-[#6E6659] leading-relaxed text-base sm:text-lg break-keep">
                    {t('story3Desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Values */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-4 break-keep">
              {t('valuesTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Value 1 */}
            <motion.div variants={fadeInUp} className="relative p-6 sm:p-8 bg-[#12141D] lg:bg-[#F5EFE2] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-[12px] transition-all">
              <div className="text-4xl sm:text-5xl mb-4">✨</div>
              <h3 className="text-xl sm:text-2xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2 sm:mb-3 break-keep">{t('value1Title')}</h3>
              <p className="text-[#A69F8D] lg:text-[#6E6659] leading-relaxed text-base break-keep">
                {t('value1Desc')}
              </p>
            </motion.div>

            {/* Value 2 */}
            <motion.div variants={fadeInUp} className="relative p-6 sm:p-8 bg-[#12141D] lg:bg-[#F5EFE2] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-[12px] transition-all">
              <div className="text-4xl sm:text-5xl mb-4">🎉</div>
              <h3 className="text-xl sm:text-2xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2 sm:mb-3 break-keep">{t('value2Title')}</h3>
              <p className="text-[#A69F8D] lg:text-[#6E6659] leading-relaxed text-base break-keep">
                {t('value2Desc')}
              </p>
            </motion.div>

            {/* Value 3 */}
            <motion.div variants={fadeInUp} className="relative p-6 sm:p-8 bg-[#12141D] lg:bg-[#F5EFE2] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-[12px] transition-all">
              <div className="text-4xl sm:text-5xl mb-4">🤝</div>
              <h3 className="text-xl sm:text-2xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2 sm:mb-3 break-keep">{t('value3Title')}</h3>
              <p className="text-[#A69F8D] lg:text-[#6E6659] leading-relaxed text-base break-keep">
                {t('value3Desc')}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-6 bg-[#12141D] lg:bg-[#F5EFE2] border-y-2 border-[#262A38]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-5xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-4 break-keep">
              {t('statsTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2">10,000+</div>
              <div className="text-xs lg:text-sm sm:text-sm font-bold text-[#A69F8D] lg:text-[#6E6659] break-keep">{t('statAnalysis')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2 break-keep">{t('statCustom')}</div>
              <div className="text-xs lg:text-sm sm:text-sm font-bold text-[#A69F8D] lg:text-[#6E6659] break-keep">{t('statRecipe')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2">95%</div>
              <div className="text-xs lg:text-sm sm:text-sm font-bold text-[#A69F8D] lg:text-[#6E6659] break-keep">{t('statSatisfaction')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-2 break-keep">{t('statProgramsCount')}</div>
              <div className="text-xs lg:text-sm sm:text-sm font-bold text-[#A69F8D] lg:text-[#6E6659] break-keep">{t('statPrograms')}</div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-5xl font-black text-[#E9E2D0] lg:text-[#1A1610] mb-4 sm:mb-6 break-keep">
            {t('ctaTitle')}
          </h2>
          <p className="text-base sm:text-lg text-[#A69F8D] lg:text-[#6E6659] mb-8 break-keep">
            {t('ctaDesc')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 bg-[#F5EFE2] lg:bg-[#EEB62B] text-[#12141D] rounded-[12px] font-black text-lg transition-all border-2 border-[#F5EFE2] lg:border-[#B8880F]"
            >
              <Sparkles size={20} />
              {t('ctaButton')}
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
