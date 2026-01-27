"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Sparkles, Brain, Database, Shield, Zap } from "lucide-react"
import { Header } from "@/components/layout/Header"

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
              HOW IT WORKS
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              작동 원리
            </span>
          </h1>

          <p className="text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            AC'SCENT IDENTITY의 AI 분석 시스템을 소개합니다.
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
              AI가 퍼퓸를 추천하는 방법
            </h2>
          </div>

          <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xl text-slate-700 leading-relaxed text-center">
              최신 AI 기술을 활용하여 이미지와 텍스트를 동시에 분석하고,
              당신만을 위한 퍼퓸 레시피를 만들어드립니다.
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
              핵심 기술
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Tech 1 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-blue-400 border-2 border-black rounded-full flex items-center justify-center mb-4">
                <Brain size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">AI 분석</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                최신 멀티모달 AI로 이미지와 텍스트를 동시 분석합니다.
              </p>
            </motion.div>

            {/* Tech 2 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-purple-400 border-2 border-black rounded-full flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">이미지 분석</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                색감, 분위기, 표정을 인식하여 시각적 특성을 파악합니다.
              </p>
            </motion.div>

            {/* Tech 3 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center mb-4">
                <Database size={24} className="text-black" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">퍼퓸 데이터</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                다양한 퍼퓸 데이터를 기반으로 맞춤 레시피를 만듭니다.
              </p>
            </motion.div>

            {/* Tech 4 */}
            <motion.div variants={fadeInUp} className="p-6 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-pink-400 border-2 border-black rounded-full flex items-center justify-center mb-4">
                <Zap size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">매칭 알고리즘</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                특성 기반 최적 매칭으로 당신에게 맞는 퍼퓸를 찾습니다.
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
              분석 프로세스
            </h2>
            <p className="text-lg text-slate-600">
              4단계로 완성되는 당신만의 퍼퓸 추천
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
                  <h3 className="text-2xl font-black text-slate-900 mb-3">데이터 수집</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    사용자의 이미지와 선택 정보(스타일, 성격, 매력포인트)를 수집합니다.
                    이미지는 자동으로 압축되어 800x960 크기로 최적화됩니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">이미지 업로드</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">스타일 선택</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">성격 선택</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">매력포인트</span>
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
                  <h3 className="text-2xl font-black text-slate-900 mb-3">AI 분석</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    AI가 이미지를 70% 우선순위로 분석합니다.
                    색감, 분위기, 표정, 전체적인 비주얼 톤을 파악하고,
                    사용자가 선택한 정보 30%를 결합하여 종합 분석합니다.
                  </p>
                  <div className="p-4 bg-white border-2 border-black rounded-xl">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-700 mb-1">이미지 분석</div>
                        <div className="h-3 bg-slate-200 border border-black rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400 border-r border-black" style={{ width: '70%' }} />
                        </div>
                      </div>
                      <span className="text-sm font-black text-purple-600">70%</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-700 mb-1">선택 정보</div>
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
                  <h3 className="text-2xl font-black text-slate-900 mb-3">레시피 생성</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    분석 결과를 바탕으로 당신만을 위한 퍼퓸 레시피를 만듭니다.
                    각 퍼퓸는 10가지 특성(sexy, cute, charisma 등)과
                    6가지 향 카테고리(citrus, floral, woody 등)로 정의되어 있습니다.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="px-3 py-2 bg-white border-2 border-black rounded-lg text-center">
                      <div className="text-xs font-bold text-slate-500">특성</div>
                      <div className="text-sm font-black">10가지</div>
                    </div>
                    <div className="px-3 py-2 bg-white border-2 border-black rounded-lg text-center">
                      <div className="text-xs font-bold text-slate-500">향 카테고리</div>
                      <div className="text-sm font-black">6가지</div>
                    </div>
                    <div className="px-3 py-2 bg-white border-2 border-black rounded-lg text-center">
                      <div className="text-xs font-bold text-slate-500">맞춤</div>
                      <div className="text-sm font-black">레시피</div>
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
                  <h3 className="text-2xl font-black text-slate-900 mb-3">추천 생성</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    가장 높은 매칭도를 보이는 퍼퓸를 추천하고,
                    팬덤 톤의 재미있는 설명과 함께 제공합니다.
                    사용자는 피드백을 통해 추천을 조정할 수 있습니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">퍼퓸 추천</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">재미있는 설명</span>
                    <span className="px-3 py-1 bg-white border-2 border-black rounded-full text-sm font-bold">피드백 반영</span>
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
              다양한 퍼퓸 카테고리
            </h2>
            <p className="text-lg text-slate-600">
              당신에게 어울리는 향기를 찾아드립니다
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Scent Categories */}
            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🍋</div>
              <div className="text-sm font-black">Citrus</div>
              <div className="text-xs text-slate-600">시트러스</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🌸</div>
              <div className="text-sm font-black">Floral</div>
              <div className="text-xs text-slate-600">플로럴</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🌲</div>
              <div className="text-sm font-black">Woody</div>
              <div className="text-xs text-slate-600">우디</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🍓</div>
              <div className="text-sm font-black">Fruity</div>
              <div className="text-xs text-slate-600">프루티</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🌿</div>
              <div className="text-sm font-black">Fresh</div>
              <div className="text-xs text-slate-600">프레쉬</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-3xl mb-2">🌹</div>
              <div className="text-sm font-black">Oriental</div>
              <div className="text-xs text-slate-600">오리엔탈</div>
            </motion.div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-slate-600 text-lg">
              각 카테고리의 특성을 분석하여 당신에게 맞는 퍼퓸 레시피를 만들어드립니다.
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
              데이터 보호
            </h2>
          </div>

          <div className="p-8 bg-green-50 border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              업로드된 이미지는 분석 후 안전하게 처리되며,
              사용자의 동의 없이 다른 목적으로 사용되지 않습니다.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-white">✓</span>
                </div>
                <p className="text-slate-600">이미지는 분석 목적으로만 사용됩니다</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-white">✓</span>
                </div>
                <p className="text-slate-600">개인정보는 암호화되어 안전하게 보관됩니다</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-400 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-white">✓</span>
                </div>
                <p className="text-slate-600">제3자와 정보를 공유하지 않습니다</p>
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
            지금 바로 체험해보세요
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            AI가 분석하는 당신만의 시그니처 퍼퓸를 만나보세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 bg-black text-white rounded-2xl font-black text-lg shadow-[6px_6px_0px_0px_#FACC15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#FACC15] transition-all border-2 border-black"
            >
              <Sparkles size={20} />
              프로그램 시작하기
            </Link>
            <Link
              href="/about/brand"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 bg-white text-slate-900 rounded-2xl font-bold text-lg border-2 border-black hover:bg-slate-50 transition-all"
            >
              브랜드 스토리
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
