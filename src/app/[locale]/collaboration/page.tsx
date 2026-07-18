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
    <div className="min-h-screen bg-[#0C0E16] lg:bg-[#FBF7EF] font-wanted selection:bg-[#232838] selection:text-[#E9E2D0]">
      <Header />

      <main className="pt-[80px] pb-32">
        <div className="w-full max-w-[455px] mx-auto px-5 lg:max-w-[880px]">

          {/* 뒤로가기 */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm lg:text-base font-bold text-[#8B8578] hover:text-[#E9E2D0] lg:hover:text-[#1A1610] transition-colors mt-2 mb-8"
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
                <div className="w-full aspect-square relative bg-[#FFFAEB] rounded-[12px] border-2 border-[#262A38] lg:border-[#B8880F]/45 overflow-hidden mb-6 flex items-center justify-center lg:mx-auto lg:max-w-[480px]">
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

                <span className="inline-block px-3 py-1 bg-[#161925] lg:bg-[#EFE4C8] border-2 border-[#262A38] lg:border-[#B8880F]/45 rounded-full text-xs lg:text-sm font-black text-[#E9E2D0] lg:text-[#1A1610] mb-3">
                  {t('badge')}
                </span>

                <h1 className="text-[28px] font-jua text-[#E9E2D0] lg:text-[#1A1610] leading-[1.2] mb-4">
                  {t('heroTitle')}<br />
                  <span className="text-[#8B8578] text-stroke-sm" style={{ WebkitTextStroke: '1px #171717' }}>{t('heroTitleHighlight')}</span>
                </h1>

                <p className="text-sm lg:text-base font-medium text-[#8B8578] leading-relaxed whitespace-pre-wrap">
                  {t('heroDesc')}
                </p>
              </div>
            </motion.section>

            {/* 협업 서비스 카드들 */}
            <section className="space-y-6 mb-20 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
              <div className="flex items-center gap-3 mb-6 lg:col-span-2">
                <div className="h-0.5 flex-1 bg-[#232838] lg:bg-[#D8CFBB]"></div>
                <h2 className="text-lg font-jua text-[#E9E2D0] lg:text-[#1A1610]">
                  {t('serviceTitle')}
                </h2>
                <div className="h-0.5 flex-1 bg-[#232838] lg:bg-[#D8CFBB]"></div>
              </div>

              {COLLABORATION_SERVICES.map((service) => (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  className="bg-[#12141D] lg:bg-[#F5EFE2] rounded-[12px] border-2 border-[#262A38] lg:border-[#B8880F]/45 p-0 overflow-hidden group transition-all duration-300"
                >
                  <div className="bg-[#151823] lg:bg-[#FDFAF1] p-6 flex justify-center items-center border-b-2 border-[#262A38] relative">
                    <div className="absolute top-4 left-4 bg-[#161925] lg:bg-[#EFE4C8] text-[#E9E2D0] lg:text-[#1A1610] text-xs lg:text-sm font-bold px-2 py-1 rounded-[12px]">
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
                      <p className="text-xs lg:text-sm font-bold text-[#8B8578] mb-1">{service.subtitle}</p>
                      <h3 className="font-jua text-xl text-[#E9E2D0] lg:text-[#1A1610]">{service.title}</h3>
                    </div>

                    <p className="text-sm lg:text-base text-[#A69F8D] lg:text-[#6E6659] mb-6 leading-relaxed border-l-4 border-[#1E222E] lg:border-[#D8CFBB] pl-3">
                      {service.description}
                    </p>

                    <div className="bg-[#151823] lg:bg-[#FDFAF1] rounded-[12px] p-4 border border-[#262A38] lg:border-[#B8880F]/30">
                      <ul className="space-y-2">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs lg:text-sm font-medium text-[#A69F8D] lg:text-[#6E6659]">
                            <span className="w-1.5 h-1.5 bg-[#161925] lg:bg-[#EFE4C8] border border-[#262A38] lg:border-[#B8880F]/30 rounded-full flex-shrink-0"></span>
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
                <div className="h-0.5 flex-1 bg-[#232838] lg:bg-[#D8CFBB]"></div>
                <h2 className="text-lg font-jua text-[#E9E2D0] lg:text-[#1A1610]">
                  {t('processTitle')}
                </h2>
                <div className="h-0.5 flex-1 bg-[#232838] lg:bg-[#D8CFBB]"></div>
              </div>

              <div className="relative">
                {/* 연결선 */}
                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-[#232838] lg:bg-[#D8CFBB] border-l-2 border-dotted border-[#262A38] lg:border-[#C9BFA8]"></div>

                <div className="space-y-6 relative">
                  {PROCESS_STEPS.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-5 relative z-10 group">
                      <div className="w-[56px] h-[56px] bg-[#12141D] lg:bg-[#F5EFE2] rounded-[12px] border-2 border-[#262A38] lg:border-[#B8880F]/45 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <span className="font-jua text-lg text-[#E9E2D0] lg:text-[#1A1610]">{item.step}</span>
                      </div>
                      <div className="flex-1 bg-[#12141D] lg:bg-[#F5EFE2] rounded-[12px] border border-[#262A38] lg:border-[#B8880F]/30 p-4 shadow-sm group-hover:border-[#262A38] transition-colors">
                        <p className="text-sm lg:text-base font-black text-[#E9E2D0] lg:text-[#1A1610] mb-0.5">{item.title}</p>
                        <p className="text-xs lg:text-sm text-[#8B8578] font-medium">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* 하단 정보 섹션 (지도 & 연락처) */}
            <motion.section variants={itemVariants}>
              <div className="bg-[#161925] lg:bg-[#EFE4C8] rounded-[12px] p-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#161925] via-[#161925] to-[#161925]"></div>

                <h2 className="text-xl font-jua text-[#E9E2D0] lg:text-[#1A1610] mb-6">
                  {t('contactTitle')}
                </h2>

                <div className="space-y-3 mb-8">
                  <a
                    href="tel:02-336-3368"
                    className="flex items-center justify-between bg-white/10 lg:bg-[#FDFAF1] hover:bg-white/20 lg:hover:bg-[#FFFDF5] rounded-[12px] px-5 py-4 transition-colors border border-white/10 lg:border-[#D8CFBB]"
                  >
                    <span className="text-sm lg:text-base text-[#8B8578] font-bold">{t('contactTel')}</span>
                    <span className="text-sm lg:text-base text-[#E9E2D0] lg:text-[#1A1610] font-medium">02-336-3368</span>
                  </a>
                  <a
                    href="mailto:neander@neander.co.kr"
                    className="flex items-center justify-between bg-white/10 lg:bg-[#FDFAF1] hover:bg-white/20 lg:hover:bg-[#FFFDF5] rounded-[12px] px-5 py-4 transition-colors border border-white/10 lg:border-[#D8CFBB]"
                  >
                    <span className="text-sm lg:text-base text-[#8B8578] font-bold">{t('contactEmail')}</span>
                    <span className="text-sm lg:text-base text-[#E9E2D0] lg:text-[#1A1610] font-medium">neander@neander.co.kr</span>
                  </a>
                </div>

                <div className="bg-[#12141D] lg:bg-[#F5EFE2] rounded-[12px] p-1 overflow-hidden">
                  <div className="rounded-[12px] overflow-hidden border border-[#262A38] lg:border-[#B8880F]/30 relative h-[180px]">
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
                      <p className="text-xs lg:text-sm font-bold text-[#E9E2D0] lg:text-[#1A1610]">{t('mapName')}</p>
                      <p className="text-[10px] lg:text-[12px] text-[#8B8578]">{t('mapAddress')}</p>
                    </div>
                    <a
                      href="https://google.com/maps/place/AC'SCENT+ID"
                      target="_blank"
                      className="w-8 h-8 bg-[#161925] lg:bg-[#EFE4C8] rounded-full flex items-center justify-center text-[#8B8578] hover:scale-110 transition-transform"
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
