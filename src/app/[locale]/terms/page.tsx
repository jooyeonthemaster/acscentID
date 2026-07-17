"use client"

import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { Scale, ShieldCheck, FileText, AlertTriangle, Ban, Gavel } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function TermsPage() {
  const t = useTranslations('policy.terms')

  return (
    <main className="min-h-screen bg-[#0C0E16]">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0C0E16] text-[#E9E2D0] rounded-full text-sm lg:text-base font-bold mb-6">
              <Scale size={16} />
              {t('badge')}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-[#E9E2D0] mb-4 whitespace-pre-line">
              {t('title')}
            </h1>
            <p className="text-[#A69F8D]">
              {t('effectiveDate')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="bg-[#12141D] border-2 border-[#262A38] rounded-[12px] p-6 md:p-10 space-y-10"
          >
            {/* 제1조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article1Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <p>{t('article1Desc')}</p>
              </div>
            </section>

            {/* 제2조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article2Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <ul className="list-disc list-inside space-y-2">
                  <li><span className="font-bold">{t('article2Item1Label')}</span>{t('article2Item1Desc')}</li>
                  <li><span className="font-bold">{t('article2Item2Label')}</span>{t('article2Item2Desc')}</li>
                  <li><span className="font-bold">{t('article2Item3Label')}</span>{t('article2Item3Desc')}</li>
                  <li><span className="font-bold">{t('article2Item4Label')}</span>{t('article2Item4Desc')}</li>
                </ul>
              </div>
            </section>

            {/* 제3조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article3Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>{t('article3Item1')}</li>
                  <li>{t('article3Item2')}</li>
                  <li>{t('article3Item3')}</li>
                </ul>
              </div>
            </section>

            {/* 제4조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article4Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <p>{t('article4Intro')}</p>
                <div className="bg-[#151823] rounded-[12px] p-4 border border-[#262A38]">
                  <ul className="list-disc list-inside space-y-1 text-sm lg:text-base">
                    <li>{t('article4Service1')}</li>
                    <li>{t('article4Service2')}</li>
                    <li>{t('article4Service3')}</li>
                    <li>{t('article4Service4')}</li>
                    <li>{t('article4Service5')}</li>
                  </ul>
                </div>
                <p>{t('article4Note')}</p>
              </div>
            </section>

            {/* 제5조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article5Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>{t('article5Item1')}</li>
                  <li>{t('article5Item2')}</li>
                  <li>{t('article5Item3')}</li>
                </ul>
              </div>
            </section>

            {/* 제6조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article6Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <p>{t('article6Intro')}</p>
                <div className="bg-red-50 rounded-[12px] p-4 border border-red-200">
                  <ul className="list-disc list-inside space-y-1 text-sm lg:text-base">
                    <li>{t('article6Item1')}</li>
                    <li>{t('article6Item2')}</li>
                    <li>{t('article6Item3')}</li>
                    <li>{t('article6Item4')}</li>
                    <li>{t('article6Item5')}</li>
                    <li>{t('article6Item6')}</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제7조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <Ban size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article7Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <p>{t('article7Desc1')}</p>
                <p>{t('article7Desc2')}</p>
              </div>
            </section>

            {/* 제8조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article8Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>{t('article8Item1')}</li>
                  <li>{t('article8Item2')}</li>
                  <li>{t('article8Item3')}</li>
                  <li>{t('article8Item4')}
                    <ul className="list-disc list-inside ml-4 mt-1 text-sm lg:text-base space-y-1">
                      <li>{t('article8Reject1')}</li>
                      <li>{t('article8Reject2')}</li>
                      <li>{t('article8Reject3')}</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </section>

            {/* 제9조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article9Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <p>{t('article9Intro')}</p>
                <div className="bg-[#151823] rounded-[12px] p-4 border border-[#262A38]">
                  <ul className="list-disc list-inside space-y-1 text-sm lg:text-base">
                    <li>{t('article9Method1')}</li>
                    <li>{t('article9Method2')}</li>
                    <li>{t('article9Method3')}</li>
                  </ul>
                </div>
                <p>{t('article9Note')}</p>
              </div>
            </section>

            {/* 제10조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article10Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>{t('article10Item1')}</li>
                  <li>{t('article10Item2')}</li>
                  <li>{t('article10Item3')}</li>
                  <li>{t('article10Item4')}</li>
                </ul>
              </div>
            </section>

            {/* 제11조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article11Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <p>{t('article11Intro').split(t('article11RefundLink'))[0]}<Link href="/refund-policy" className="font-bold text-[#A69F8D] underline underline-offset-2">{t('article11RefundLink')}</Link>{t('article11Intro').split(t('article11RefundLink'))[1] || ''}</p>
                <div className="bg-[#0C0E16] rounded-[12px] p-4 border-2 border-[#262A38] text-sm lg:text-base space-y-1">
                  <p>• {t('article11Note1')}</p>
                  <p>• {t('article11Note2')}</p>
                  <p>• {t('article11Note3')}</p>
                </div>
              </div>
            </section>

            {/* 제12조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article12Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>{t('article12Item1')}</li>
                  <li>{t('article12Item2')}</li>
                  <li>{t('article12Item3')}</li>
                </ul>
              </div>
            </section>

            {/* 제13조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article13Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>{t('article13Item1')}</li>
                  <li>{t('article13Item2')}</li>
                  <li>{t('article13Item3')}</li>
                </ul>
              </div>
            </section>

            {/* 제14조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <Gavel size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article14Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>{t('article14Item1')}</li>
                  <li>{t('article14Item2')}</li>
                  <li>{t('article14Item3')}</li>
                </ul>
              </div>
            </section>

            {/* 부칙 */}
            <section className="pt-6 border-t-2 border-[#262A38]">
              <p className="text-[#A69F8D] text-sm lg:text-base">
                {t('supplementEffective', { date: '2025년 1월 1일' })}
              </p>
              <p className="text-[#8B8578] text-sm lg:text-base mt-2">
                {t('supplementNotice')}
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/privacy"
                  className="text-sm lg:text-base font-bold text-[#A69F8D] hover:underline"
                >
                  {t('linkPrivacy')}
                </Link>
                <Link
                  href="/refund-policy"
                  className="text-sm lg:text-base font-bold text-[#A69F8D] hover:underline"
                >
                  {t('linkRefund')}
                </Link>
              </div>
            </section>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
