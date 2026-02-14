"use client"

import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { Scale, ShieldCheck, FileText, AlertTriangle, Ban, Gavel } from "lucide-react"
import Link from "next/link"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function TermsPage() {
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
              <Scale size={16} />
              이용약관
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              AC&apos;SCENT IDENTITY<br />이용약관
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
            {/* 제1조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제1조 (목적)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>
                  본 약관은 주식회사 네안더(이하 &quot;회사&quot;)가 운영하는 AC&apos;SCENT IDENTITY 온라인 서비스(이하 &quot;서비스&quot;)의
                  이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임 사항 등을 규정함을 목적으로 합니다.
                </p>
              </div>
            </section>

            {/* 제2조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제2조 (정의)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <ul className="list-disc list-inside space-y-2">
                  <li><span className="font-bold">&quot;서비스&quot;</span>란 회사가 제공하는 AI 이미지 분석 기반 맞춤 퍼퓸 추천, 퍼퓸 제조·판매, 피규어 디퓨저 제조·판매 등 일체의 서비스를 말합니다.</li>
                  <li><span className="font-bold">&quot;이용자&quot;</span>란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                  <li><span className="font-bold">&quot;회원&quot;</span>이란 회사에 개인정보를 제공하여 회원 등록을 한 자로서, 소셜 로그인(Google, Kakao)을 통해 서비스에 접속하여 이용하는 자를 말합니다.</li>
                  <li><span className="font-bold">&quot;상품&quot;</span>이란 회사가 판매하는 맞춤 퍼퓸, 피규어 디퓨저, 시그니처 퍼퓸 등 모든 제품을 말합니다.</li>
                </ul>
              </div>
            </section>

            {/* 제3조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제3조 (약관의 효력 및 변경)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
                  <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 변경 시 적용일 7일 전부터 서비스 내 공지합니다.</li>
                  <li>이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있으며, 변경된 약관의 효력 발생일 이후에도 서비스를 계속 이용하는 경우 약관 변경에 동의한 것으로 간주합니다.</li>
                </ul>
              </div>
            </section>

            {/* 제4조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제4조 (서비스의 제공 및 변경)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>회사는 다음과 같은 서비스를 제공합니다.</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>AI 이미지 분석을 통한 맞춤 퍼퓸 추천 서비스</li>
                    <li>맞춤 퍼퓸 제조 및 판매 (10ml / 50ml)</li>
                    <li>3D 피규어 화분 디퓨저 제조 및 판매</li>
                    <li>졸업 퍼퓸, 시그니처 퍼퓸 등 기획 상품 판매</li>
                    <li>기타 회사가 정하는 서비스</li>
                  </ul>
                </div>
                <p>회사는 서비스의 내용을 변경할 수 있으며, 변경 시 변경 내용을 서비스 내 공지합니다.</p>
              </div>
            </section>

            {/* 제5조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제5조 (회원 가입 및 탈퇴)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>회원 가입은 소셜 로그인(Google, Kakao)을 통해 이루어지며, 회사가 정한 양식에 따라 필요한 정보를 제공한 후 본 약관에 동의함으로써 완료됩니다.</li>
                  <li>회원은 언제든지 마이페이지에서 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 탈퇴를 처리합니다.</li>
                  <li>회원 탈퇴 시 개인정보는 개인정보처리방침에 따라 처리됩니다.</li>
                </ul>
              </div>
            </section>

            {/* 제6조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제6조 (이용자의 의무)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>타인의 정보를 도용하여 서비스를 이용하는 행위</li>
                    <li>회사의 지적재산권 또는 제3자의 권리를 침해하는 행위</li>
                    <li>서비스의 정상적인 운영을 방해하는 행위</li>
                    <li>다른 이용자의 개인정보를 수집하거나 저장하는 행위</li>
                    <li>법령 또는 공공질서, 미풍양속에 위반되는 행위</li>
                    <li>상업적 목적으로 서비스를 무단 이용하는 행위</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제7조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Ban size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제7조 (서비스 이용 제한)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 서비스 이용을 경고, 일시 정지, 영구 이용 정지 등으로 제한할 수 있습니다.</p>
                <p>회사는 전항에 따른 이용 제한 시 그 사유를 이용자에게 통보합니다.</p>
              </div>
            </section>

            {/* 제8조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제8조 (구매 계약의 성립)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>이용자는 서비스 내에서 상품을 선택하고 결제를 진행함으로써 구매 신청을 합니다.</li>
                  <li>회사는 이용자의 구매 신청에 대해 주문 확인 통지를 함으로써 구매 계약이 성립됩니다.</li>
                  <li>상품의 가격, 배송비 등은 주문 시점의 서비스에 표시된 가격을 기준으로 합니다.</li>
                  <li>회사는 다음의 경우 구매 신청을 거절할 수 있습니다.
                    <ul className="list-disc list-inside ml-4 mt-1 text-sm space-y-1">
                      <li>신청 내용에 허위, 누락, 오기가 있는 경우</li>
                      <li>재고 부족으로 상품 제공이 어려운 경우</li>
                      <li>기타 구매 신청을 승인하기 부적절한 사유가 있는 경우</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </section>

            {/* 제9조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제9조 (결제)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>이용자는 회사가 제공하는 다음의 결제 수단으로 상품 대금을 결제할 수 있습니다.</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>계좌이체 (무통장입금)</li>
                    <li>신용카드 / 체크카드</li>
                    <li>간편결제 (카카오페이, 네이버페이 등)</li>
                  </ul>
                </div>
                <p>계좌이체(무통장입금) 결제 시, 주문일로부터 3일 이내에 입금이 확인되지 않으면 주문이 자동 취소될 수 있습니다.</p>
              </div>
            </section>

            {/* 제10조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제10조 (배송)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>상품은 입금 확인 또는 결제 완료 후 2~3 영업일 이내에 발송됩니다.</li>
                  <li>배송비는 기본 3,000원이며, 상품 합계 50,000원 이상 주문 시 무료배송입니다.</li>
                  <li>맞춤 제작 상품(피규어 디퓨저 등)은 제작 기간에 따라 배송이 지연될 수 있으며, 이 경우 이용자에게 사전 안내합니다.</li>
                  <li>이용자의 부재, 주소 오류 등으로 인한 배송 지연은 회사의 책임이 아닙니다.</li>
                </ul>
              </div>
            </section>

            {/* 제11조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제11조 (취소·환불·교환)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>상품의 취소, 환불, 교환에 관한 상세 사항은 <Link href="/refund-policy" className="font-bold text-blue-600 underline underline-offset-2">취소/환불/교환 정책</Link>에서 확인하실 수 있습니다.</p>
                <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200 text-sm space-y-1">
                  <p>• 배송 전 취소: 마이페이지에서 취소 신청 가능</p>
                  <p>• 맞춤 제작 상품: 제작 착수 후 취소/환불 불가</p>
                  <p>• 상품 하자: 수령 후 7일 이내 교환/환불 가능</p>
                </div>
              </div>
            </section>

            {/* 제12조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제12조 (회사의 의무)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>회사는 관련 법령과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 지속적이고 안정적인 서비스 제공을 위해 최선을 다합니다.</li>
                  <li>회사는 이용자의 개인정보를 안전하게 보호하며, 개인정보처리방침을 준수합니다.</li>
                  <li>회사는 서비스 이용과 관련한 이용자의 불만사항 및 의견을 신속히 처리합니다.</li>
                </ul>
              </div>
            </section>

            {/* 제13조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-sky-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제13조 (면책 조항)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 인해 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
                  <li>회사는 이용자의 귀책 사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
                  <li>AI 분석 결과는 참고용이며, 분석 결과에 따른 상품 선택은 이용자의 판단에 따릅니다.</li>
                </ul>
              </div>
            </section>

            {/* 제14조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Gavel size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제14조 (분쟁 해결)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <ul className="list-decimal list-inside space-y-2">
                  <li>회사와 이용자 간에 발생한 분쟁에 관한 소송은 서울중앙지방법원을 관할 법원으로 합니다.</li>
                  <li>회사와 이용자 간의 분쟁은 전자상거래 등에서의 소비자보호에 관한 법률, 전자거래기본법, 소비자기본법 등 관련 법령에 따라 해결합니다.</li>
                  <li>이용자는 공정거래위원회, 한국소비자원 등 관련 기관에 분쟁 조정을 신청할 수 있습니다.</li>
                </ul>
              </div>
            </section>

            {/* 부칙 */}
            <section className="pt-6 border-t-2 border-slate-200">
              <p className="text-slate-600 text-sm">
                본 이용약관은 <span className="font-bold">2025년 1월 1일</span>부터 시행됩니다.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                이용약관이 변경되는 경우 변경 사항을 서비스 내 공지사항을 통해 안내드립니다.
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/privacy"
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  개인정보처리방침 →
                </Link>
                <Link
                  href="/refund-policy"
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  취소/환불/교환 정책 →
                </Link>
              </div>
            </section>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
