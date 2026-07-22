"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Sparkles, Brain, Database, Shield, Zap } from "lucide-react"
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

export default function HowItWorksPage() {
  const t = useTranslations('about.howItWorks')

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--canvas)] font-wanted">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          {/* Tag */}
          <div className="inline-block px-4 py-2 rounded-[4px] border border-[var(--line)] bg-white mb-8">
            <span className="text-xs lg:text-sm font-black text-[var(--ink)] tracking-widest uppercase flex items-center gap-2">
              <Brain size={14} className="text-[var(--muted-ink)]" />
              {t('tag')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[var(--ink)] leading-[1.1] mb-6 break-keep">
            {t('headline')}
          </h1>

          <p className="text-xl text-[var(--muted-ink)] font-medium max-w-2xl mx-auto leading-relaxed break-keep">
            {t('heroDesc')}
          </p>
        </motion.div>
      </section>

      {/* Overview */}
      <section className="relative py-20 px-6 bg-[var(--soft)] border-y border-[var(--line)]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-black text-[var(--ink)] mb-8 break-keep">
              {t('overviewTitle')}
            </h2>
          </div>

          <div className="p-8 bg-white border border-[var(--line)] rounded-[6px]">
            <p className="text-xl text-[var(--muted-ink)] leading-relaxed text-center break-keep">
              {t('overviewDesc')}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Technology Stack */}
      <section className="relative py-20 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-[var(--ink)] mb-4 break-keep">
              {t('techTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Tech 1 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border border-[var(--line)] rounded-[6px]">
              <div className="w-12 h-12 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center mb-4">
                <Brain size={24} className="text-[var(--ink)]" />
              </div>
              <h3 className="text-xl font-black text-[var(--ink)] mb-2 break-keep">{t('tech1Title')}</h3>
              <p className="text-sm lg:text-base text-[var(--muted-ink)] leading-relaxed break-keep">
                {t('tech1Desc')}
              </p>
            </motion.div>

            {/* Tech 2 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border border-[var(--line)] rounded-[6px]">
              <div className="w-12 h-12 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-[var(--ink)]" />
              </div>
              <h3 className="text-xl font-black text-[var(--ink)] mb-2 break-keep">{t('tech2Title')}</h3>
              <p className="text-sm lg:text-base text-[var(--muted-ink)] leading-relaxed break-keep">
                {t('tech2Desc')}
              </p>
            </motion.div>

            {/* Tech 3 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border border-[var(--line)] rounded-[6px]">
              <div className="w-12 h-12 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center mb-4">
                <Database size={24} className="text-[var(--ink)]" />
              </div>
              <h3 className="text-xl font-black text-[var(--ink)] mb-2 break-keep">{t('tech3Title')}</h3>
              <p className="text-sm lg:text-base text-[var(--muted-ink)] leading-relaxed break-keep">
                {t('tech3Desc')}
              </p>
            </motion.div>

            {/* Tech 4 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border border-[var(--line)] rounded-[6px]">
              <div className="w-12 h-12 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center mb-4">
                <Zap size={24} className="text-[var(--ink)]" />
              </div>
              <h3 className="text-xl font-black text-[var(--ink)] mb-2 break-keep">{t('tech4Title')}</h3>
              <p className="text-sm lg:text-base text-[var(--muted-ink)] leading-relaxed break-keep">
                {t('tech4Desc')}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Process Detail */}
      <section className="relative py-20 px-6 bg-[var(--soft)] border-y border-[var(--line)]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-[var(--ink)] mb-4 break-keep">
              {t('processTitle')}
            </h2>
            <p className="text-lg text-[var(--muted-ink)] break-keep">
              {t('processSubtitle')}
            </p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="p-8 bg-white border border-[var(--line)] rounded-[6px]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center">
                  <span className="text-2xl font-black text-[var(--ink)]">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-[var(--ink)] mb-3 break-keep">{t('step1Title')}</h3>
                  <p className="text-[var(--muted-ink)] leading-relaxed text-lg mb-4 break-keep">
                    {t('step1Desc')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-sm lg:text-base font-bold text-[var(--ink)]">{t('step1Tag1')}</span>
                    <span className="px-3 py-1 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-sm lg:text-base font-bold text-[var(--ink)]">{t('step1Tag2')}</span>
                    <span className="px-3 py-1 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-sm lg:text-base font-bold text-[var(--ink)]">{t('step1Tag3')}</span>
                    <span className="px-3 py-1 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-sm lg:text-base font-bold text-[var(--ink)]">{t('step1Tag4')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-8 bg-white border border-[var(--line)] rounded-[6px]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center">
                  <span className="text-2xl font-black text-[var(--ink)]">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-[var(--ink)] mb-3 break-keep">{t('step2Title')}</h3>
                  <p className="text-[var(--muted-ink)] leading-relaxed text-lg mb-4 break-keep">
                    {t('step2Desc')}
                  </p>
                  <div className="p-4 bg-[var(--soft)] border border-[var(--line)] rounded-[6px]">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1">
                        <div className="text-sm lg:text-base font-bold text-[var(--muted-ink)] mb-1">{t('step2ImageLabel')}</div>
                        <div className="h-3 bg-white border border-[var(--line)] rounded-[3px] overflow-hidden">
                          <div className="h-full bg-[var(--ink)]" style={{ width: '70%' }} />
                        </div>
                      </div>
                      <span className="text-sm lg:text-base font-black text-[var(--muted-ink)]">70%</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-sm lg:text-base font-bold text-[var(--muted-ink)] mb-1">{t('step2SelectionLabel')}</div>
                        <div className="h-3 bg-white border border-[var(--line)] rounded-[3px] overflow-hidden">
                          <div className="h-full bg-[var(--ink)]" style={{ width: '30%' }} />
                        </div>
                      </div>
                      <span className="text-sm lg:text-base font-black text-[var(--muted-ink)]">30%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-8 bg-white border border-[var(--line)] rounded-[6px]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center">
                  <span className="text-2xl font-black text-[var(--ink)]">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-[var(--ink)] mb-3 break-keep">{t('step3Title')}</h3>
                  <p className="text-[var(--muted-ink)] leading-relaxed text-lg mb-4 break-keep">
                    {t('step3Desc')}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="px-3 py-2 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-center">
                      <div className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">{t('step3Traits')}</div>
                      <div className="text-sm lg:text-base font-black text-[var(--ink)]">{t('step3TraitsCount')}</div>
                    </div>
                    <div className="px-3 py-2 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-center">
                      <div className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">{t('step3Categories')}</div>
                      <div className="text-sm lg:text-base font-black text-[var(--ink)]">{t('step3CategoriesCount')}</div>
                    </div>
                    <div className="px-3 py-2 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-center">
                      <div className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">{t('step3Custom')}</div>
                      <div className="text-sm lg:text-base font-black text-[var(--ink)]">{t('step3Recipe')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-8 bg-white border border-[var(--line)] rounded-[6px]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center">
                  <span className="text-2xl font-black text-[var(--ink)]">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-[var(--ink)] mb-3 break-keep">{t('step4Title')}</h3>
                  <p className="text-[var(--muted-ink)] leading-relaxed text-lg mb-4 break-keep">
                    {t('step4Desc')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-sm lg:text-base font-bold text-[var(--ink)]">{t('step4Tag1')}</span>
                    <span className="px-3 py-1 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-sm lg:text-base font-bold text-[var(--ink)]">{t('step4Tag2')}</span>
                    <span className="px-3 py-1 bg-[var(--soft)] border border-[var(--line)] rounded-[4px] text-sm lg:text-base font-bold text-[var(--ink)]">{t('step4Tag3')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Database Preview */}
      <section className="relative py-20 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-[var(--ink)] mb-4 break-keep">
              {t('categoriesTitle')}
            </h2>
            <p className="text-lg text-[var(--muted-ink)] break-keep">
              {t('categoriesSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Scent Categories */}
            <motion.div variants={fadeInUp} className="p-4 bg-white border border-[var(--line)] rounded-[6px] text-center">
              <div className="text-3xl mb-2">🍋</div>
              <div className="text-sm lg:text-base font-black text-[var(--ink)]">Citrus</div>
              <div className="text-xs lg:text-sm text-[var(--muted-ink)]">{t('categoryCitrus')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border border-[var(--line)] rounded-[6px] text-center">
              <div className="text-3xl mb-2">🌸</div>
              <div className="text-sm lg:text-base font-black text-[var(--ink)]">Floral</div>
              <div className="text-xs lg:text-sm text-[var(--muted-ink)]">{t('categoryFloral')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border border-[var(--line)] rounded-[6px] text-center">
              <div className="text-3xl mb-2">🌲</div>
              <div className="text-sm lg:text-base font-black text-[var(--ink)]">Woody</div>
              <div className="text-xs lg:text-sm text-[var(--muted-ink)]">{t('categoryWoody')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border border-[var(--line)] rounded-[6px] text-center">
              <div className="text-3xl mb-2">🍓</div>
              <div className="text-sm lg:text-base font-black text-[var(--ink)]">Fruity</div>
              <div className="text-xs lg:text-sm text-[var(--muted-ink)]">{t('categoryFruity')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border border-[var(--line)] rounded-[6px] text-center">
              <div className="text-3xl mb-2">🌿</div>
              <div className="text-sm lg:text-base font-black text-[var(--ink)]">Fresh</div>
              <div className="text-xs lg:text-sm text-[var(--muted-ink)]">{t('categoryFresh')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border border-[var(--line)] rounded-[6px] text-center">
              <div className="text-3xl mb-2">🌹</div>
              <div className="text-sm lg:text-base font-black text-[var(--ink)]">Oriental</div>
              <div className="text-xs lg:text-sm text-[var(--muted-ink)]">{t('categoryOriental')}</div>
            </motion.div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[var(--muted-ink)] text-lg break-keep">
              {t('categoriesFooter')}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Privacy */}
      <section className="relative py-20 px-6 bg-[var(--soft)] border-y border-[var(--line)]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white border border-[var(--line)] rounded-full mb-6">
              <Shield size={32} className="text-[var(--ink)]" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-[var(--ink)] mb-4 break-keep">
              {t('privacyTitle')}
            </h2>
          </div>

          <div className="p-8 bg-white border border-[var(--line)] rounded-[6px]">
            <p className="text-lg text-[var(--muted-ink)] leading-relaxed mb-6 break-keep">
              {t('privacyDesc')}
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center">
                  <span className="text-xs lg:text-sm font-black text-[var(--ink)]">✓</span>
                </div>
                <p className="text-[var(--muted-ink)] break-keep">{t('privacyCheck1')}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center">
                  <span className="text-xs lg:text-sm font-black text-[var(--ink)]">✓</span>
                </div>
                <p className="text-[var(--muted-ink)] break-keep">{t('privacyCheck2')}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[var(--soft)] border border-[var(--line)] rounded-full flex items-center justify-center">
                  <span className="text-xs lg:text-sm font-black text-[var(--ink)]">✓</span>
                </div>
                <p className="text-[var(--muted-ink)] break-keep">{t('privacyCheck3')}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative py-20 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl sm:text-5xl font-black text-[var(--ink)] mb-6 break-keep">
            {t('ctaTitle')}
          </h2>
          <p className="text-lg text-[var(--muted-ink)] mb-8 break-keep">
            {t('ctaDesc')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 bg-[var(--ink)] text-white rounded-[5px] font-black text-lg transition-all hover:bg-black"
            >
              <Sparkles size={20} />
              {t('ctaButton')}
            </Link>
            <Link
              href="/about/brand"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 bg-white text-[var(--ink)] rounded-[5px] font-bold text-lg border border-[var(--ink)] hover:bg-[var(--soft)] transition-all"
            >
              {t('ctaBrandStory')}
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
