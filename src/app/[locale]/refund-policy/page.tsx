"use client"

import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { RotateCcw, XCircle, RefreshCw, Truck, CreditCard, Phone } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function RefundPolicyPage() {
  const t = useTranslations('policy.refund')

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
              <RotateCcw size={16} />
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
            {/* 제1조 - 주문 취소 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-400 rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <XCircle size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article1Title')}</h2>
              </div>
              <div className="pl-13 space-y-4 text-[#A69F8D] leading-relaxed">
                <div className="bg-[#151823] rounded-[12px] p-4 border border-[#262A38]">
                  <p className="font-bold text-[#E9E2D0] mb-3">{t('cancelConditions')}</p>
                  <table className="w-full text-sm lg:text-base">
                    <thead>
                      <tr className="border-b border-[#262A38]">
                        <th className="text-left py-2 font-bold">{t('cancelTableStatus')}</th>
                        <th className="text-left py-2 font-bold">{t('cancelTablePossible')}</th>
                        <th className="text-left py-2 font-bold">{t('cancelTableMethod')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E222E]">
                      <tr>
                        <td className="py-2">{t('cancelStatus1')}</td>
                        <td className="py-2 text-[#A69F8D] font-bold">{t('cancelPossible1')}</td>
                        <td className="py-2">{t('cancelMethod1')}</td>
                      </tr>
                      <tr>
                        <td className="py-2">{t('cancelStatus2')}</td>
                        <td className="py-2 text-[#A69F8D] font-bold">{t('cancelPossible2')}</td>
                        <td className="py-2">{t('cancelMethod2')}</td>
                      </tr>
                      <tr>
                        <td className="py-2">{t('cancelStatus3')}</td>
                        <td className="py-2 text-red-600 font-bold">{t('cancelPossible3')}</td>
                        <td className="py-2">{t('cancelMethod3')}</td>
                      </tr>
                      <tr>
                        <td className="py-2">{t('cancelStatus4')}</td>
                        <td className="py-2 text-red-600 font-bold">{t('cancelPossible4')}</td>
                        <td className="py-2">{t('cancelMethod4')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm lg:text-base text-[#8B8578]">
                  {t('cancelNote1')}
                </p>
                <p className="text-sm lg:text-base text-[#8B8578]">
                  {t('cancelNote2')}
                </p>
              </div>
            </section>

            {/* 제2조 - 환불 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <CreditCard size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article2Title')}</h2>
              </div>
              <div className="pl-13 space-y-4 text-[#A69F8D] leading-relaxed">
                <p className="font-bold">{t('refundReasonTitle')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm lg:text-base ml-2">
                  <li>{t('refundReason1')}</li>
                  <li>{t('refundReason2')}</li>
                  <li>{t('refundReason3')}</li>
                </ul>

                <p className="font-bold mt-4">{t('refundMethodTitle')}</p>
                <div className="bg-[#151823] rounded-[12px] p-4 border border-[#262A38]">
                  <table className="w-full text-sm lg:text-base">
                    <thead>
                      <tr className="border-b border-[#262A38]">
                        <th className="text-left py-2 font-bold">{t('refundTableMethod')}</th>
                        <th className="text-left py-2 font-bold">{t('refundTableHow')}</th>
                        <th className="text-left py-2 font-bold">{t('refundTableDuration')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E222E]">
                      <tr>
                        <td className="py-2">{t('refundMethod1Name')}</td>
                        <td className="py-2">{t('refundMethod1How')}</td>
                        <td className="py-2">{t('refundMethod1Duration')}</td>
                      </tr>
                      <tr>
                        <td className="py-2">{t('refundMethod2Name')}</td>
                        <td className="py-2">{t('refundMethod2How')}</td>
                        <td className="py-2">{t('refundMethod2Duration')}</td>
                      </tr>
                      <tr>
                        <td className="py-2">{t('refundMethod3Name')}</td>
                        <td className="py-2">{t('refundMethod3How')}</td>
                        <td className="py-2">{t('refundMethod3Duration')}</td>
                      </tr>
                      <tr>
                        <td className="py-2">{t('refundMethod4Name')}</td>
                        <td className="py-2">{t('refundMethod4How')}</td>
                        <td className="py-2">{t('refundMethod4Duration')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="font-bold mt-4">{t('refundAmountTitle')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm lg:text-base ml-2">
                  <li>{t('refundAmount1')}</li>
                  <li>{t('refundAmount2')}</li>
                  <li>{t('refundAmount3')}</li>
                  <li>{t('refundAmount4')}</li>
                </ul>
              </div>
            </section>

            {/* 제3조 - 교환 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <RefreshCw size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article3Title')}</h2>
              </div>
              <div className="pl-13 space-y-4 text-[#A69F8D] leading-relaxed">
                <p className="font-bold">{t('exchangeConditionTitle')}</p>
                <div className="bg-[#0C0E16] rounded-[12px] p-4 border border-[#262A38]">
                  <ul className="list-disc list-inside space-y-1 text-sm lg:text-base">
                    <li>{t('exchangeCondition1')}</li>
                    <li>{t('exchangeCondition2')}</li>
                    <li>{t('exchangeCondition3')}</li>
                  </ul>
                </div>

                <p className="font-bold mt-4">{t('exchangeNotPossibleTitle')}</p>
                <div className="bg-red-50 rounded-[12px] p-4 border border-red-200">
                  <ul className="list-disc list-inside space-y-1 text-sm lg:text-base">
                    <li>{t('exchangeNotPossible1')}</li>
                    <li>{t('exchangeNotPossible2')}</li>
                    <li>{t('exchangeNotPossible3')}</li>
                    <li>{t('exchangeNotPossible4')}</li>
                    <li>{t('exchangeNotPossible5')}</li>
                  </ul>
                </div>

                <p className="font-bold mt-4">{t('exchangeProcessTitle')}</p>
                <div className="bg-[#151823] rounded-[12px] p-4 border border-[#262A38]">
                  <ol className="list-decimal list-inside space-y-2 text-sm lg:text-base">
                    <li>{t('exchangeProcess1')}</li>
                    <li>{t('exchangeProcess2')}</li>
                    <li>{t('exchangeProcess3')}</li>
                    <li>{t('exchangeProcess4')}</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* 제4조 - 배송 관련 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <Truck size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article4Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <div className="bg-[#151823] rounded-[12px] p-4 border border-[#262A38] text-sm lg:text-base space-y-2">
                  <p><span className="font-bold">{t('shippingPeriodLabel')}</span> {t('shippingPeriodValue')}</p>
                  <p><span className="font-bold">{t('shippingFeeLabel')}</span> {t('shippingFeeValue')}</p>
                  <p><span className="font-bold">{t('returnAddressLabel')}</span> {t('returnAddressValue')}</p>
                  <p><span className="font-bold">{t('returnFeeLabel')}</span> {t('returnFeeValue')}</p>
                </div>
                <p className="text-sm lg:text-base text-[#8B8578]">
                  {t('shippingNote')}
                </p>
              </div>
            </section>

            {/* 제5조 - 고객센터 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <Phone size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article5Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <p>{t('article5Intro')}</p>
                <div className="bg-[#0C0E16] rounded-[12px] p-4 border-2 border-[#262A38]">
                  <div className="space-y-2 text-sm lg:text-base">
                    <p><span className="font-bold">{t('contactPhoneLabel')}</span> {t('contactPhoneValue')}</p>
                    <p><span className="font-bold">{t('contactEmailLabel')}</span> {t('contactEmailValue')}</p>
                    <p><span className="font-bold">{t('contactHoursLabel')}</span> {t('contactHoursValue')}</p>
                  </div>
                </div>
                <p className="text-sm lg:text-base text-[#8B8578]">
                  {t('contactNote')}
                </p>
              </div>
            </section>

            {/* 제6조 - 전자상거래법 안내 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#161925] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
                  <RotateCcw size={20} />
                </div>
                <h2 className="text-xl font-black text-[#E9E2D0]">{t('article6Title')}</h2>
              </div>
              <div className="pl-13 space-y-3 text-[#A69F8D] leading-relaxed">
                <p>{t('article6Desc1')}</p>
                <p>{t('article6Desc2')}</p>
                <div className="bg-[#151823] rounded-[12px] p-4 border border-[#262A38]">
                  <ul className="list-disc list-inside space-y-1 text-sm lg:text-base">
                    <li>{t('article6Limit1')}</li>
                    <li>{t('article6Limit2')}</li>
                    <li>{t('article6Limit3')}</li>
                    <li>{t('article6Limit4')}</li>
                  </ul>
                </div>
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
                  href="/terms"
                  className="text-sm lg:text-base font-bold text-[#A69F8D] hover:underline"
                >
                  {t('linkTerms')}
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm lg:text-base font-bold text-[#A69F8D] hover:underline"
                >
                  {t('linkPrivacy')}
                </Link>
              </div>
            </section>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
