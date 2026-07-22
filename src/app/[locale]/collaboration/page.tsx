"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Instagram, Mail, MapPin } from "lucide-react"
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
    <div className="min-h-screen bg-[var(--paper)]">
      <Header />

      <main className="pb-32 pt-[80px] lg:pt-[110px]">
        <div className="mx-auto w-full max-w-[455px] px-5 lg:max-w-[880px]">

          {/* 뒤로가기 */}
          <Link
            href="/"
            className="mb-8 mt-2 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted-ink)] transition-colors hover:text-[var(--ink)] lg:text-base"
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
                <div className="relative mb-6 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--soft)] lg:mx-auto lg:max-w-[480px]">
                  <Image
                    src="/images/collaboration/hero.png"
                    alt="Collaboration 3D Illustration"
                    width={400}
                    height={400}
                    className="h-[85%] w-[85%] object-contain"
                    priority
                  />
                </div>

                <span className="mb-3 inline-block rounded-[3px] bg-[var(--soft)] px-3 py-1 text-[11px] font-black text-[var(--muted-ink)]">
                  {t('badge')}
                </span>

                <h1 className="mb-4 break-keep text-[28px] font-black leading-[1.25] text-[var(--ink)] lg:text-[34px]">
                  {t('heroTitle')}<br />
                  <span className="text-[var(--muted-ink)]">{t('heroTitleHighlight')}</span>
                </h1>

                <p className="mx-auto max-w-[560px] whitespace-pre-wrap break-keep text-sm font-medium leading-relaxed text-[var(--muted-ink)] lg:text-base">
                  {t('heroDesc')}
                </p>
              </div>
            </motion.section>

            {/* 협업 서비스 카드들 */}
            <section className="mb-20 space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
              <div className="mb-6 flex items-center gap-3 lg:col-span-2">
                <div className="h-px flex-1 bg-[var(--line)]"></div>
                <h2 className="text-lg font-black text-[var(--ink)]">
                  {t('serviceTitle')}
                </h2>
                <div className="h-px flex-1 bg-[var(--line)]"></div>
              </div>

              {COLLABORATION_SERVICES.map((service) => (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  className="group overflow-hidden rounded-[6px] border border-[var(--line)] bg-white transition-all duration-300"
                >
                  <div className="relative flex items-center justify-center border-b border-[var(--line)] bg-[var(--soft)] p-6">
                    <div className="absolute left-4 top-4 rounded-[3px] bg-white px-2 py-1 text-xs font-bold text-[var(--ink)] lg:text-sm">
                      {service.number}
                    </div>
                    <Image
                      src={service.image}
                      alt={service.title}
                      width={200}
                      height={200}
                      className="h-40 w-40 object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <p className="mb-1 text-xs font-bold text-[var(--muted-ink)] lg:text-sm">{service.subtitle}</p>
                      <h3 className="text-xl font-black text-[var(--ink)]">{service.title}</h3>
                    </div>

                    <p className="mb-6 break-keep border-l-2 border-[var(--line)] pl-3 text-sm leading-relaxed text-[var(--muted-ink)] lg:text-base">
                      {service.description}
                    </p>

                    <ul className="space-y-2 border-t border-[var(--line-soft)] pt-4">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs font-medium text-[var(--muted-ink)] lg:text-sm">
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ink)]"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </section>

            {/* 협업 프로세스 */}
            <motion.section variants={itemVariants} className="mb-20">
              <div className="mb-8 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--line)]"></div>
                <h2 className="text-lg font-black text-[var(--ink)]">
                  {t('processTitle')}
                </h2>
                <div className="h-px flex-1 bg-[var(--line)]"></div>
              </div>

              <div className="relative">
                {/* 연결선 */}
                <div className="absolute bottom-4 left-[27px] top-4 w-px bg-[var(--line)]"></div>

                <div className="relative space-y-4">
                  {PROCESS_STEPS.map((item, idx) => (
                    <div key={idx} className="group relative z-10 flex items-center gap-5">
                      <div className="flex h-[56px] w-[56px] flex-shrink-0 items-center justify-center rounded-[5px] border border-[var(--line)] bg-white">
                        <span className="text-lg font-black text-[var(--ink)]">{item.step}</span>
                      </div>
                      <div className="flex-1 rounded-[5px] border border-[var(--line)] bg-white p-4 transition-colors group-hover:border-[var(--ink)]">
                        <p className="mb-0.5 text-sm font-black text-[var(--ink)] lg:text-base">{item.title}</p>
                        <p className="text-xs font-medium text-[var(--muted-ink)] lg:text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* 하단 정보 섹션 (지도 & 연락처) — 다크 대비 밴드 */}
            <motion.section variants={itemVariants}>
              <div className="relative overflow-hidden rounded-[6px] bg-[var(--dark-band)] p-6 text-center text-white">
                <h2 className="mb-6 text-xl font-black">
                  {t('contactTitle')}
                </h2>

                <div className="mb-8 space-y-3">
                  <a
                    href="tel:02-336-3368"
                    className="flex items-center justify-between rounded-[5px] border border-[var(--dark-line)] bg-white/5 px-5 py-4 transition-colors hover:bg-white/10"
                  >
                    <span className="text-sm font-bold text-[var(--dark-muted)] lg:text-base">{t('contactTel')}</span>
                    <span className="text-sm font-medium text-white lg:text-base">02-336-3368</span>
                  </a>
                  <a
                    href="mailto:neander@neander.co.kr"
                    className="flex items-center justify-between rounded-[5px] border border-[var(--dark-line)] bg-white/5 px-5 py-4 transition-colors hover:bg-white/10"
                  >
                    <span className="text-sm font-bold text-[var(--dark-muted)] lg:text-base">{t('contactEmail')}</span>
                    <span className="text-sm font-medium text-white lg:text-base">neander@neander.co.kr</span>
                  </a>
                </div>

                <div className="overflow-hidden rounded-[5px] border border-[var(--dark-line)]">
                  <div className="relative h-[180px] overflow-hidden">
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
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="text-left">
                      <p className="text-xs font-bold text-white lg:text-sm">{t('mapName')}</p>
                      <p className="text-[10px] text-[var(--dark-muted)] lg:text-[12px]">{t('mapAddress')}</p>
                    </div>
                    <a
                      href="https://google.com/maps/place/AC'SCENT+ID"
                      target="_blank"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--dark-line)] text-white transition-colors hover:bg-white/10"
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
