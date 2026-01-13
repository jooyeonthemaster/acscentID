"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Sparkles, Target, Rocket, TrendingUp } from "lucide-react"
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

export default function VisionPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAFAFA] font-sans">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] pointer-events-none" />
        <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl opacity-20 animate-pulse" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          {/* Tag */}
          <div className="inline-block px-4 py-2 rounded-full border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 transform rotate-2">
            <span className="text-xs font-black text-black tracking-widest uppercase flex items-center gap-2">
              <Target size={14} className="text-purple-500" />
              VISION
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500">
              비전 & 미션
            </span>
          </h1>

          <p className="text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            AC'SCENT IDENTITY가 꿈꾸는 미래를 소개합니다.
          </p>
        </motion.div>
      </section>

      {/* Mission Statement */}
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
              우리의 미션
            </h2>
          </div>

          <div className="p-12 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-[1.4] text-center mb-6">
              "향기로 당신의 정체성을 발견하다"
            </p>
            <p className="text-lg text-slate-600 leading-relaxed text-center">
              우리는 모든 사람이 자신만의 시그니처 향을 가질 권리가 있다고 믿습니다.
              AI 기술을 통해 향수 선택의 장벽을 낮추고,
              향기 탐색을 즐겁고 의미있는 경험으로 만듭니다.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Vision */}
      <section className="relative py-20 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
              우리가 그리는 미래
            </h2>
          </div>

          <div className="space-y-8">
            {/* Vision 1 */}
            <div className="p-8 bg-yellow-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center">
                  <Sparkles size={24} className="text-black" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">향기로 표현하는 세상</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    향기를 통한 자기표현이 일상이 되는 세상을 만듭니다.
                    모든 사람이 자신의 정체성을 향으로 표현하고,
                    향기가 개성과 스타일의 중요한 부분이 되는 미래를 그립니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Vision 2 */}
            <div className="p-8 bg-purple-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-400 border-2 border-black rounded-full flex items-center justify-center">
                  <Target size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">AI와 감성의 조화</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    최첨단 AI 기술과 전통적인 향수 제조의 감성을 결합하여,
                    누구나 쉽고 재미있게 자신에게 맞는 향을 찾을 수 있도록 돕습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Vision 3 */}
            <div className="p-8 bg-pink-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-pink-400 border-2 border-black rounded-full flex items-center justify-center">
                  <Rocket size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">글로벌 향수 문화</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    K-pop과 K-culture를 시작으로, 전 세계 모든 사람들이
                    자신만의 향기를 찾고 즐길 수 있는 문화를 만들어갑니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Roadmap */}
      <section className="relative py-20 px-6 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
              로드맵
            </h2>
            <p className="text-lg text-slate-600">
              우리가 걸어갈 여정
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 2024 */}
            <motion.div variants={fadeInUp} className="relative p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="inline-block px-3 py-1 bg-yellow-400 border-2 border-black rounded-full mb-4">
                <span className="text-xs font-black uppercase">현재</span>
              </div>
              <div className="text-4xl font-black text-slate-900 mb-3">2024</div>
              <h3 className="text-xl font-black text-slate-900 mb-3">AI 분석 고도화</h3>
              <ul className="space-y-2 text-slate-600">
                <li>• 최신 AI 기술 통합</li>
                <li>• 이미지 분석 정확도 향상</li>
                <li>• 맞춤 향수 레시피 시스템 구축</li>
                <li>• 사용자 피드백 시스템 구축</li>
              </ul>
            </motion.div>

            {/* 2025 */}
            <motion.div variants={fadeInUp} className="relative p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="inline-block px-3 py-1 bg-purple-400 border-2 border-black rounded-full mb-4">
                <span className="text-xs font-black uppercase text-white">계획</span>
              </div>
              <div className="text-4xl font-black text-slate-900 mb-3">2025</div>
              <h3 className="text-xl font-black text-slate-900 mb-3">서비스 확장</h3>
              <ul className="space-y-2 text-slate-600">
                <li>• 맞춤 향수 제조 서비스</li>
                <li>• 구독 서비스 출시</li>
                <li>• 오프라인 팝업스토어</li>
                <li>• 파트너십 확대</li>
              </ul>
            </motion.div>

            {/* 2026 */}
            <motion.div variants={fadeInUp} className="relative p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="inline-block px-3 py-1 bg-pink-400 border-2 border-black rounded-full mb-4">
                <span className="text-xs font-black uppercase text-white">비전</span>
              </div>
              <div className="text-4xl font-black text-slate-900 mb-3">2026</div>
              <h3 className="text-xl font-black text-slate-900 mb-3">글로벌 진출</h3>
              <ul className="space-y-2 text-slate-600">
                <li>• 다국어 서비스 지원</li>
                <li>• 해외 시장 진출</li>
                <li>• 글로벌 향수 브랜드 협업</li>
                <li>• AI 기술 고도화</li>
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Values Grid */}
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
              핵심 가치
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Value 1 */}
            <motion.div variants={fadeInUp} className="p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">진정성</h3>
              <p className="text-slate-600 leading-relaxed">
                진실된 분석과 추천으로 신뢰를 쌓습니다.
                과장하지 않고, 솔직하게 소통합니다.
              </p>
            </motion.div>

            {/* Value 2 */}
            <motion.div variants={fadeInUp} className="p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">혁신</h3>
              <p className="text-slate-600 leading-relaxed">
                AI 기술과 전통 향수 제조의 결합으로
                새로운 경험을 만들어갑니다.
              </p>
            </motion.div>

            {/* Value 3 */}
            <motion.div variants={fadeInUp} className="p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">즐거움</h3>
              <p className="text-slate-600 leading-relaxed">
                향수 찾기가 재미있고 설레는 경험이 되도록
                모든 과정을 디자인합니다.
              </p>
            </motion.div>

            {/* Value 4 */}
            <motion.div variants={fadeInUp} className="p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">개인화</h3>
              <p className="text-slate-600 leading-relaxed">
                모두를 위한 맞춤 향수로,
                각자의 개성과 정체성을 존중합니다.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative py-20 px-6 bg-white border-t-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6">
            우리와 함께 만들어가요
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            AC'SCENT IDENTITY의 여정에 함께 해주세요.
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
