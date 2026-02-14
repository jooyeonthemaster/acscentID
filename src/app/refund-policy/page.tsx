"use client"

import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { RotateCcw, XCircle, RefreshCw, Truck, CreditCard, Phone } from "lucide-react"
import Link from "next/link"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF5]">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-bold mb-6">
              <RotateCcw size={16} />
              취소/환불/교환 정책
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              AC&apos;SCENT IDENTITY<br />취소/환불/교환 정책
            </h1>
            <p className="text-slate-600">
              시행일: 2025년 1월 1일
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
            className="bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_black] p-6 md:p-10 space-y-10"
          >
            {/* 제1조 - 주문 취소 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <XCircle size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제1조 (주문 취소)</h2>
              </div>
              <div className="pl-13 space-y-4 text-slate-700 leading-relaxed">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-bold text-slate-900 mb-3">취소 가능 조건</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 font-bold">주문 상태</th>
                        <th className="text-left py-2 font-bold">취소 가능 여부</th>
                        <th className="text-left py-2 font-bold">취소 방법</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2">입금 대기</td>
                        <td className="py-2 text-green-600 font-bold">가능</td>
                        <td className="py-2">마이페이지 &gt; 주문내역 &gt; 취소 신청</td>
                      </tr>
                      <tr>
                        <td className="py-2">입금 완료 (제작 전)</td>
                        <td className="py-2 text-green-600 font-bold">가능</td>
                        <td className="py-2">마이페이지에서 취소 신청 또는 고객센터 연락</td>
                      </tr>
                      <tr>
                        <td className="py-2">제작 중</td>
                        <td className="py-2 text-red-600 font-bold">불가</td>
                        <td className="py-2">맞춤 제작 상품은 제작 착수 후 취소 불가</td>
                      </tr>
                      <tr>
                        <td className="py-2">배송 중</td>
                        <td className="py-2 text-red-600 font-bold">불가</td>
                        <td className="py-2">수령 후 교환/환불 절차 진행</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-slate-500">
                  ※ 계좌이체(무통장입금)의 경우, 입금 전 주문 취소 시 별도 환불 절차 없이 주문이 취소됩니다.
                </p>
                <p className="text-sm text-slate-500">
                  ※ 무통장입금 주문은 주문일로부터 3일 이내 입금이 확인되지 않으면 자동 취소될 수 있습니다.
                </p>
              </div>
            </section>

            {/* 제2조 - 환불 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <CreditCard size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제2조 (환불)</h2>
              </div>
              <div className="pl-13 space-y-4 text-slate-700 leading-relaxed">
                <p className="font-bold">1. 환불 사유</p>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li>주문 취소가 승인된 경우</li>
                  <li>상품 하자 (파손, 변질, 오배송 등)</li>
                  <li>상품이 표시·광고 내용과 현저히 다른 경우</li>
                </ul>

                <p className="font-bold mt-4">2. 결제 수단별 환불 방법</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 font-bold">결제 수단</th>
                        <th className="text-left py-2 font-bold">환불 방법</th>
                        <th className="text-left py-2 font-bold">소요 기간</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2">계좌이체 (무통장입금)</td>
                        <td className="py-2">고객 계좌로 환불금 입금</td>
                        <td className="py-2">영업일 기준 3~5일</td>
                      </tr>
                      <tr>
                        <td className="py-2">신용카드 / 체크카드</td>
                        <td className="py-2">카드사를 통한 결제 취소</td>
                        <td className="py-2">영업일 기준 3~7일</td>
                      </tr>
                      <tr>
                        <td className="py-2">카카오페이</td>
                        <td className="py-2">카카오페이 결제 취소</td>
                        <td className="py-2">영업일 기준 3~5일</td>
                      </tr>
                      <tr>
                        <td className="py-2">네이버페이</td>
                        <td className="py-2">네이버페이 결제 취소</td>
                        <td className="py-2">영업일 기준 3~5일</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="font-bold mt-4">3. 환불 금액</p>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li>상품 금액 전액 환불 (배송비 포함)</li>
                  <li>쿠폰 사용 주문 취소 시, 쿠폰은 재발급됩니다.</li>
                  <li>상품 하자로 인한 환불 시 반품 배송비는 회사가 부담합니다.</li>
                  <li>단순 변심에 의한 환불 시 반품 배송비는 이용자가 부담합니다.</li>
                </ul>
              </div>
            </section>

            {/* 제3조 - 교환 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <RefreshCw size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제3조 (교환)</h2>
              </div>
              <div className="pl-13 space-y-4 text-slate-700 leading-relaxed">
                <p className="font-bold">1. 교환 가능 조건</p>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>상품 수령 후 <span className="font-bold">7일 이내</span> 교환 신청</li>
                    <li>상품이 파손되었거나 하자가 있는 경우</li>
                    <li>오배송된 경우 (주문한 상품과 다른 상품이 배송된 경우)</li>
                  </ul>
                </div>

                <p className="font-bold mt-4">2. 교환 불가 조건</p>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>이용자의 책임 있는 사유로 상품이 훼손된 경우</li>
                    <li>상품을 사용하거나 개봉하여 상품 가치가 감소한 경우 (퍼퓸 개봉, 디퓨저 사용 등)</li>
                    <li>맞춤 제작 상품의 단순 변심에 의한 교환 (주문제작 특성상)</li>
                    <li>시간 경과로 재판매가 곤란한 경우</li>
                    <li>수령 후 7일이 경과한 경우</li>
                  </ul>
                </div>

                <p className="font-bold mt-4">3. 교환 절차</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>고객센터로 교환 사유 접수 (전화 또는 이메일)</li>
                    <li>회사의 교환 승인 확인</li>
                    <li>상품 반송 (회사 지정 주소로)</li>
                    <li>반품 상품 수령 및 확인 후 교환 상품 발송</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* 제4조 - 배송 관련 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Truck size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제4조 (배송 및 반품 주소)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm space-y-2">
                  <p><span className="font-bold">배송 기간:</span> 입금 확인 / 결제 완료 후 2~3 영업일 이내 발송</p>
                  <p><span className="font-bold">배송비:</span> 기본 3,000원 (50,000원 이상 무료배송)</p>
                  <p><span className="font-bold">반품 주소:</span> 서울 마포구 와우산로29라길 22, NEANDER Co.,LTD</p>
                  <p><span className="font-bold">반품 배송비:</span> 상품 하자 시 회사 부담 / 단순 변심 시 이용자 부담 (3,000원)</p>
                </div>
                <p className="text-sm text-slate-500">
                  ※ 맞춤 제작 상품(피규어 디퓨저 등)은 제작 기간에 따라 발송이 지연될 수 있으며, 사전 안내드립니다.
                </p>
              </div>
            </section>

            {/* 제5조 - 고객센터 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Phone size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제5조 (고객센터 안내)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>취소, 환불, 교환과 관련한 문의는 아래 고객센터로 연락해 주세요.</p>
                <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                  <div className="space-y-2 text-sm">
                    <p><span className="font-bold">전화:</span> 02-336-3368</p>
                    <p><span className="font-bold">이메일:</span> neander@neander.co.kr</p>
                    <p><span className="font-bold">운영 시간:</span> 평일 10:00 ~ 18:00 (점심 12:00 ~ 13:00 / 주말·공휴일 휴무)</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  ※ 이메일 문의 시 주문번호와 함께 문의 내용을 보내주시면 보다 빠른 처리가 가능합니다.
                </p>
              </div>
            </section>

            {/* 제6조 - 전자상거래법 안내 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <RotateCcw size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제6조 (전자상거래법에 따른 청약철회)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>전자상거래 등에서의 소비자보호에 관한 법률에 따라, 이용자는 상품을 수령한 날로부터 7일 이내에 청약 철회를 할 수 있습니다.</p>
                <p>다만, 다음의 경우에는 청약 철회가 제한됩니다.</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>이용자의 책임 있는 사유로 상품이 멸실 또는 훼손된 경우</li>
                    <li>이용자의 사용 또는 일부 소비에 의해 상품의 가치가 현저히 감소한 경우</li>
                    <li>주문에 따라 개별적으로 생산되는 상품(맞춤 퍼퓸, 피규어 디퓨저 등)으로서 청약 철회를 인정하면 판매자에게 회복할 수 없는 중대한 피해가 예상되는 경우</li>
                    <li>복제가 가능한 상품의 포장을 훼손한 경우</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 부칙 */}
            <section className="pt-6 border-t-2 border-slate-200">
              <p className="text-slate-600 text-sm">
                본 취소/환불/교환 정책은 <span className="font-bold">2025년 1월 1일</span>부터 시행됩니다.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                정책이 변경되는 경우 변경 사항을 서비스 내 공지사항을 통해 안내드립니다.
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/terms"
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  이용약관 →
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  개인정보처리방침 →
                </Link>
              </div>
            </section>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
