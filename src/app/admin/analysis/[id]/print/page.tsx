'use client'

import { useState, useEffect, use } from 'react'
import { Loader2, Printer } from 'lucide-react'
import { PrintableReport } from '../../components/PrintableReport'

interface PrintPageData {
  analysis: any
  user_profile: any
  feedback: any
}

export default function PrintReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<PrintPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/analysis/${id}`)
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다')
      const data = await res.json()
      setData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
        <p className="text-red-500 mb-4">{error || '데이터를 불러올 수 없습니다'}</p>
        <button
          onClick={() => window.history.back()}
          className="text-blue-600 hover:underline"
        >
          뒤로 가기
        </button>
      </div>
    )
  }

  return (
    <>
      {/* 인쇄 버튼 (화면에서만 표시) */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
        >
          뒤로
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_#1e293b] hover:shadow-[1px_1px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          <Printer className="w-5 h-5" />
          인쇄하기
        </button>
      </div>

      {/* 보고서 */}
      <PrintableReport
        analysis={data.analysis}
        feedback={data.feedback}
        userProfile={data.user_profile}
      />
    </>
  )
}
