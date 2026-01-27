"use client"

import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Shield, Lock, Eye, Trash2, Mail } from "lucide-react"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function PrivacyPage() {
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
              <Shield size={16} />
              개인정보처리방침
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              AC'SCENT IDENTITY<br />개인정보처리방침
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
                  <Eye size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제1조 (개인정보의 수집 항목)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>AC'SCENT IDENTITY(이하 "회사")는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-bold text-slate-900 mb-2">필수 수집 항목</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>소셜 로그인 정보: 이름(닉네임), 프로필 이미지</li>
                    <li>이메일 주소 (Google 로그인 시)</li>
                  </ul>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-bold text-slate-900 mb-2">서비스 이용 시 자동 수집 항목</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>업로드한 이미지 데이터</li>
                    <li>AI 분석 결과 및 레시피 정보</li>
                    <li>서비스 이용 기록, 접속 로그</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제2조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Lock size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제2조 (개인정보의 수집 및 이용 목적)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>수집한 개인정보는 다음의 목적을 위해 이용됩니다.</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><span className="font-bold">회원 식별 및 관리:</span> 소셜 로그인을 통한 본인 확인</li>
                  <li><span className="font-bold">서비스 제공:</span> AI 이미지 분석, 퍼퓸 레시피 생성 및 저장</li>
                  <li><span className="font-bold">주문 처리:</span> 구매 상품의 배송 및 결제 처리</li>
                  <li><span className="font-bold">고객 지원:</span> 문의 응대 및 서비스 개선</li>
                </ul>
              </div>
            </section>

            {/* 제3조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Shield size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제3조 (개인정보의 보유 및 이용 기간)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <ul className="space-y-2 text-sm">
                    <li><span className="font-bold">회원 정보:</span> 회원 탈퇴 시까지</li>
                    <li><span className="font-bold">분석 결과 및 레시피:</span> 회원 탈퇴 시 또는 삭제 요청 시까지</li>
                    <li><span className="font-bold">업로드 이미지:</span> 분석 완료 후 30일 이내 자동 삭제</li>
                  </ul>
                </div>
                <p className="text-sm text-slate-500">
                  단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
                </p>
              </div>
            </section>

            {/* 제4조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Trash2 size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제4조 (개인정보의 파기)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>전자적 파일: 복구가 불가능한 방법으로 영구 삭제</li>
                  <li>출력물: 분쇄기로 분쇄하거나 소각</li>
                </ul>
              </div>
            </section>

            {/* 제5조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Mail size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제5조 (이용자의 권리)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>개인정보 열람 요청</li>
                  <li>개인정보 정정 및 삭제 요청</li>
                  <li>개인정보 처리 정지 요청</li>
                  <li>회원 탈퇴 및 동의 철회</li>
                </ul>
                <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                  <p className="font-bold text-slate-900 mb-1">문의처</p>
                  <p className="text-sm">마이페이지에서 직접 삭제하거나, 고객센터를 통해 요청하실 수 있습니다.</p>
                </div>
              </div>
            </section>

            {/* 제6조 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-400 rounded-xl flex items-center justify-center border-2 border-black">
                  <Lock size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">제6조 (개인정보의 안전성 확보 조치)</h2>
              </div>
              <div className="pl-13 space-y-3 text-slate-700 leading-relaxed">
                <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>개인정보 암호화 저장 및 전송</li>
                  <li>해킹 등에 대비한 기술적 대책</li>
                  <li>개인정보 접근 제한 및 관리</li>
                  <li>정기적인 보안 점검</li>
                </ul>
              </div>
            </section>

            {/* 부칙 */}
            <section className="pt-6 border-t-2 border-slate-200">
              <p className="text-slate-600 text-sm">
                본 개인정보처리방침은 <span className="font-bold">2025년 1월 1일</span>부터 시행됩니다.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                개인정보처리방침이 변경되는 경우 변경 사항을 서비스 내 공지사항을 통해 안내드립니다.
              </p>
            </section>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
