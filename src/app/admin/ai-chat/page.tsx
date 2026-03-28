'use client'

import { AdminHeader } from '../components/AdminHeader'
import AdminChatbot from '../datacenter/components/AdminChatbot'

export default function AiChatPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="AI 분석봇"
        subtitle="자연어로 질문하면 Gemini가 DB를 분석해서 답변합니다"
      />
      <div className="p-6">
        <AdminChatbot fullPage />
      </div>
    </div>
  )
}
