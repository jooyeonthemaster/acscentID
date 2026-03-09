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
    <main className="relative min-h-screen overflow-hidden bg-[#FAFAFA] font-sans">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] pointer-events-none" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-300 rounded-full blur-3xl opacity-20 animate-pulse" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          {/* Tag */}
          <div className="inline-block px-4 py-2 rounded-full border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 transform -rotate-1">
            <span className="text-xs font-black text-black tracking-widest uppercase flex items-center gap-2">
              <Brain size={14} className="text-blue-500" />
              {t('tag')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              {t('headline')}
            </span>
          </h1>

          <p className="text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            {t('heroDesc')}
          </p>
        </motion.div>
      </section>

      {/* Overview */}
      <section className="relative py-20 px-6 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-8">
              {t('overviewTitle')}
            </h2>
          </div>

          <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xl text-slate-700 leading-relaxed text-center">
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
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
              {t('techTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Tech 1 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-blue-400 border-2 border-black rounded-full flex items-center justify-center mb-4">
                <Brain size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t('tech1Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('tech1Desc')}
              </p>
            </motion.div>

            {/* Tech 2 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-purple-400 border-2 border-black rounded-full flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t('tech2Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('tech2Desc')}
              </p>
            </motion.div>

            {/* Tech 3 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center mb-4">
                <Database size={24} className="text-black" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t('tech3Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('tech3Desc')}
              </p>
            </motion.div>

            {/* Tech 4 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-pink-400 border-2 border-black rounded-full flex items-center justify-center mb-4">
                <Zap size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t('tech4Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('tech4Desc')}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Process Detail */}
      <section className="relative py-20 px-6 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
              {t('processTitle')}
            </h2>
            <p className="text-lg text-slate-600">
              {t('processSubtitle')}
            </p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="p-8 bg-blue-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-2xl font-black text-white">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-900 mb-3">{t('step1Title')}</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    {t('step1Desc')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">{t('step1Tag1')}</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">{t('step1Tag2')}</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">{t('step1Tag3')}</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">{t('step1Tag4')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-8 bg-purple-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-purple-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-2xl font-black text-white">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-900 mb-3">{t('step2Title')}</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    {t('step2Desc')}
                  </p>
                  <div className="p-4 bg-white border-2 border-black rounded-xl">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-700 mb-1">{t('step2ImageLabel')}</div>
                        <div className="h-3 bg-slate-200 border border-black rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400 border-r border-black" style={{ width: '70%' }} />
                        </div>
                      </div>
                      <span className="text-sm font-black text-purple-600">70%</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-700 mb-1">{t('step2SelectionLabel')}</div>
                        <div className="h-3 bg-slate-200 border border-black rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 border-r border-black" style={{ width: '30%' }} />
                        </div>
                      </div>
                      <span className="text-sm font-black text-blue-600">30%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-8 bg-yellow-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-2xl font-black">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-900 mb-3">{t('step3Title')}</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    {t('step3Desc')}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="px-3 py-2 bg-white border-2 border-black rounded-lg text-center">
                      <div className="text-xs font-bold text-slate-500">{t('step3Traits')}</div>
                      <div className="text-sm font-black">{t('step3TraitsCount')}</div>
                    </div>
                    <div className="px-3 py-2 bg-white border-2 border-black rounded-lg text-center">
                      <div className="text-xs font-bold text-slate-500">{t('step3Categories')}</div>
                      <div className="text-sm font-black">{t('step3CategoriesCount')}</div>
                    </div>
                    <div className="px-3 py-2 bg-white border-2 border-black rounded-lg text-center">
                      <div className="text-xs font-bold text-slate-500">{t('step3Custom')}</div>
                      <div className="text-sm font-black">{t('step3Recipe')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-8 bg-pink-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-pink-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-2xl font-black text-white">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-900 mb-3">{t('step4Title')}</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    {t('step4Desc')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">{t('step4Tag1')}</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">{t('step4Tag2')}</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">{t('step4Tag3')}</span>
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
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
              {t('categoriesTitle')}
            </h2>
            <p className="text-lg text-slate-600">
              {t('categoriesSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Scent Categories */}
            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🍋</div>
              <div className="text-sm font-black">Citrus</div>
              <div className="text-xs text-slate-600">{t('categoryCitrus')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🌸</div>
              <div className="text-sm font-black">Floral</div>
              <div className="text-xs text-slate-600">{t('categoryFloral')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🌲</div>
              <div className="text-sm font-black">Woody</div>
              <div className="text-xs text-slate-600">{t('categoryWoody')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🍓</div>
              <div className="text-sm font-black">Fruity</div>
              <div className="text-xs text-slate-600">{t('categoryFruity')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🌿</div>
              <div className="text-sm font-black">Fresh</div>
              <div className="text-xs text-slate-600">{t('categoryFresh')}</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🌹</div>
              <div className="text-sm font-black">Oriental</div>
              <div className="text-xs text-slate-600">{t('categoryOriental')}</div>
            </motion.div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-slate-600 text-lg">
              {t('categoriesFooter')}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Privacy */}
      <section className="relative py-20 px-6 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-400 border-2 border-black rounded-full mb-6">
              <Shield size={32} className="text-white" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
              {t('privacyTitle')}
            </h2>
          </div>

          <div className="p-8 bg-green-50 border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              {t('privacyDesc')}
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-white">✓</span>
                </div>
                <p className="text-slate-600">{t('privacyCheck1')}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-white">✓</span>
                </div>
                <p className="text-slate-600">{t('privacyCheck2')}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-white">✓</span>
                </div>
                <p className="text-slate-600">{t('privacyCheck3')}</p>
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
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6">
            {t('ctaTitle')}
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            {t('ctaDesc')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 bg-black text-white rounded-2xl font-black text-lg shadow-[6px_6px_0px_0px_#FACC15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#FACC15] transition-all border-2 border-black"
            >
              <Sparkles size={20} />
              {t('ctaButton')}
            </Link>
            <Link
              href="/about/brand"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 bg-white text-slate-900 rounded-2xl font-bold text-lg border-2 border-black hover:bg-slate-50 transition-all"
            >
              {t('ctaBrandStory')}
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
