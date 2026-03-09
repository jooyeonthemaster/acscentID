"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Phone, Instagram, Mail, MapPin } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useTranslations } from "next-intl"

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
}

export default function CollaborationPage() {
  const t = useTranslations('collaboration')

  // 협업 서비스 데이터 (translated)
  const COLLABORATION_SERVICES = [
    {
      id: "ai-program",
      image: "/images/collaboration/service_ai.png",
      number: t('service1Number'),
      title: t('service1Title'),
      subtitle: t('service1Subtitle'),
      description: t('service1Desc'),
      features: [
        t('service1Feature1'),
        t('service1Feature2'),
        t('service1Feature3'),
        t('service1Feature4')
      ]
    },
    {
      id: "popup-store",
      image: "/images/collaboration/service_popup.png",
      number: t('service2Number'),
      title: t('service2Title'),
      subtitle: t('service2Subtitle'),
      description: t('service2Desc'),
      features: [
        t('service2Feature1'),
        t('service2Feature2'),
        t('service2Feature3'),
        t('service2Feature4')
      ]
    },
    {
      id: "custom-keyring",
      image: "/images/collaboration/service_goods.png",
      number: t('service3Number'),
      title: t('service3Title'),
      subtitle: t('service3Subtitle'),
      description: t('service3Desc'),
      features: [
        t('service3Feature1'),
        t('service3Feature2'),
        t('service3Feature3'),
        t('service3Feature4')
      ]
    }
  ]

  const PROCESS_STEPS = [
    { step: "01", title: t('processStep1'), desc: t('processStep1Desc'), icon: Mail },
    { step: "02", title: t('processStep2'), desc: t('processStep2Desc'), icon: MapPin },
    { step: "03", title: t('processStep3'), desc: t('processStep3Desc'), icon: ArrowRight },
    { step: "04", title: t('processStep4'), desc: t('processStep4Desc'), icon: null },
    { step: "05", title: t('processStep5'), desc: t('processStep5Desc'), icon: Instagram }
  ]

  return (
    <div className="min-h-screen bg-[#FFFDF5] font-sans selection:bg-yellow-200 selection:text-yellow-900">
      <Header />

      <main className="pt-[80px] pb-32">
        <div className="w-full max-w-[455px] mx-auto px-5">

          {/* 뒤로가기 */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mt-2 mb-8"
          >
            <ArrowLeft size={18} />
            {t('back')}
          </Link>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* 히어로 섹션 */}
            <motion.section variants={itemVariants} className="mb-16 text-center">
              <div className="relative mb-6">
                {/* 3D Hero Image */}
                <div className="w-full aspect-square relative bg-[#FFFAEB] rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#000] overflow-hidden mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-noise opacity-30 z-10 pointer-events-none mix-blend-multiply"></div>
                  <Image
                    src="/images/collaboration/hero.png"
                    alt="Collaboration 3D Illustration"
                    width={400}
                    height={400}
                    className="w-[85%] h-[85%] object-contain animate-float"
                    priority
                  />
                </div>

                <span className="inline-block px-3 py-1 bg-yellow-400 border-2 border-slate-900 rounded-full text-xs font-black text-slate-900 mb-3 shadow-[2px_2px_0px_#000]">
                  {t('badge')}
                </span>

                <h1 className="text-[28px] font-jua text-slate-900 leading-[1.2] mb-4">
                  {t('heroTitle')}<br />
                  <span className="text-yellow-500 text-stroke-sm" style={{ WebkitTextStroke: '1px #0f172a' }}>{t('heroTitleHighlight')}</span>
                </h1>

                <p className="text-sm font-medium text-slate-500 leading-relaxed whitespace-pre-wrap">
                  {t('heroDesc')}
                </p>
              </div>
            </motion.section>

            {/* 협업 서비스 카드들 */}
            <section className="space-y-6 mb-20">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-0.5 flex-1 bg-slate-200"></div>
                <h2 className="text-lg font-jua text-slate-900">
                  {t('serviceTitle')}
                </h2>
                <div className="h-0.5 flex-1 bg-slate-200"></div>
              </div>

              {COLLABORATION_SERVICES.map((service) => (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  className="bg-white rounded-2xl border-2 border-slate-900 p-0 shadow-[4px_4px_0px_#000] overflow-hidden group hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] transition-all duration-300"
                >
                  <div className="bg-[#FFF9E5] p-6 flex justify-center items-center border-b-2 border-slate-900 relative">
                    <div className="absolute top-4 left-4 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-md">
                      {service.number}
                    </div>
                    <Image
                      src={service.image}
                      alt={service.title}
                      width={200}
                      height={200}
                      className="w-40 h-40 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <p className="text-xs font-bold text-yellow-500 mb-1">{service.subtitle}</p>
                      <h3 className="font-jua text-xl text-slate-900">{service.title}</h3>
                    </div>

                    <p className="text-sm text-slate-600 mb-6 leading-relaxed border-l-4 border-slate-100 pl-3">
                      {service.description}
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <ul className="space-y-2">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <span className="w-1.5 h-1.5 bg-yellow-400 border border-slate-900 rounded-full flex-shrink-0"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </section>

            {/* 협업 프로세스 */}
            <motion.section variants={itemVariants} className="mb-20">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-0.5 flex-1 bg-slate-200"></div>
                <h2 className="text-lg font-jua text-slate-900">
                  {t('processTitle')}
                </h2>
                <div className="h-0.5 flex-1 bg-slate-200"></div>
              </div>

              <div className="relative">
                {/* 연결선 */}
                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-200 border-l-2 border-dotted border-slate-300"></div>

                <div className="space-y-6 relative">
                  {PROCESS_STEPS.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-5 relative z-10 group">
                      <div className="w-[56px] h-[56px] bg-white rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#FCD34D] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <span className="font-jua text-lg text-slate-900">{item.step}</span>
                      </div>
                      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 shadow-sm group-hover:border-slate-900 transition-colors">
                        <p className="text-sm font-black text-slate-900 mb-0.5">{item.title}</p>
                        <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* 하단 정보 섹션 (지도 & 연락처) */}
            <motion.section variants={itemVariants}>
              <div className="bg-slate-900 rounded-3xl p-6 text-center relative overflow-hidden shadow-[4px_4px_0px_#FCD34D]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400"></div>

                <h2 className="text-xl font-jua text-white mb-6">
                  {t('contactTitle')}
                </h2>

                <div className="space-y-3 mb-8">
                  <a
                    href="tel:02-336-3368"
                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-5 py-4 transition-colors border border-white/10"
                  >
                    <span className="text-sm text-yellow-400 font-bold">{t('contactTel')}</span>
                    <span className="text-sm text-white font-medium">02-336-3368</span>
                  </a>
                  <a
                    href="mailto:neander@neander.co.kr"
                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-5 py-4 transition-colors border border-white/10"
                  >
                    <span className="text-sm text-yellow-400 font-bold">{t('contactEmail')}</span>
                    <span className="text-sm text-white font-medium">neander@neander.co.kr</span>
                  </a>
                </div>

                <div className="bg-white rounded-2xl p-1 overflow-hidden">
                  <div className="rounded-xl overflow-hidden border border-slate-200 relative h-[180px]">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3163.6147193789397!2d126.92435!3d37.554938!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357c999f9c2cbed1%3A0x886e9e7e11dbb8e6!2sAC&#39;SCENT%20ID%20%EC%95%85%EC%84%BC%ED%8A%B8%20%EC%95%84%EC%9D%B4%EB%94%94!5e0!3m2!1sko!2skr!4v1706750000000!5m2!1sko!2skr"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0"
                    />
                  </div>
                  <div className="py-3 px-2 flex justify-between items-center">
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900">{t('mapName')}</p>
                      <p className="text-[10px] text-slate-500">{t('mapAddress')}</p>
                    </div>
                    <a
                      href="https://google.com/maps/place/AC'SCENT+ID"
                      target="_blank"
                      className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-yellow-400 hover:scale-110 transition-transform"
                    >
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              </div>
            </motion.section>

            <div className="h-10"></div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
