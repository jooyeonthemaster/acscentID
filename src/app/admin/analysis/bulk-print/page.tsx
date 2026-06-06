'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, Loader2, Printer } from 'lucide-react'
import { PrintableReport } from '../components/PrintableReport'

interface PrintPageData {
  analysis: any
  user_profile: any
  feedback: any
  layering_session?: any
  partner_analysis?: any
}

interface LoadedReport {
  id: string
  data: PrintPageData
}

export default function BulkPrintReportPage() {
  const [reports, setReports] = useState<LoadedReport[]>([])
  const [failedIds, setFailedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('bulk-print-open')
    return () => {
      document.body.classList.remove('bulk-print-open')
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ids = Array.from(new Set(
      (params.get('ids') || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    ))

    if (ids.length === 0) {
      setError('인쇄할 분석 건이 선택되지 않았습니다.')
      setLoading(false)
      return
    }

    const fetchReports = async () => {
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await fetch(`/api/admin/analysis/${encodeURIComponent(id)}`)
              if (!res.ok) {
                return { id, data: null, failed: true }
              }

              const data = await res.json()
              return { id, data: data as PrintPageData, failed: false }
            } catch {
              return { id, data: null, failed: true }
            }
          })
        )

        const loadedReports = results
          .filter((result) => Boolean(result.data) && !result.failed)
          .map((result) => ({ id: result.id, data: result.data as PrintPageData }))
        const failed = results
          .filter((result) => result.failed || !result.data)
          .map((result) => result.id)

        if (loadedReports.length === 0) {
          setError('선택한 분석 데이터를 불러오지 못했습니다.')
        }

        setReports(loadedReports)
        setFailedIds(failed)
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
        <p className="mb-4 text-slate-700">{error}</p>
        <button
          onClick={() => window.history.back()}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
        >
          뒤로 가기
        </button>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media screen {
          .bulk-print-page {
            margin: 24px auto;
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html,
          body {
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background: white !important;
          }

          body.bulk-print-open .fixed.inset-0,
          body > .fixed.inset-0 {
            position: static !important;
            inset: auto !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }

          body.bulk-print-open main,
          body > .fixed.inset-0 > main {
            width: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            transition: none !important;
          }

          body * {
            visibility: hidden;
          }

          body.bulk-print-open .fixed.inset-0,
          body.bulk-print-open main,
          body > .fixed.inset-0,
          body > .fixed.inset-0 > main,
          #bulk-print-root,
          #bulk-print-root * {
            visibility: visible;
          }

          #bulk-print-root {
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            width: 842px !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          body.bulk-print-open aside,
          body > .fixed.inset-0 > aside,
          .bulk-print-toolbar {
            display: none !important;
          }

          .bulk-print-page {
            width: 842px !important;
            height: 595px !important;
            margin: 0 !important;
            overflow: hidden !important;
            break-after: page;
            page-break-after: always;
            break-before: auto;
            page-break-before: auto;
          }

          .bulk-print-page + .bulk-print-page {
            break-before: page;
            page-break-before: always;
          }

          .bulk-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .bulk-print-page .printable-report-root {
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="bulk-print-toolbar fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
        <span className="px-3 text-sm font-bold text-slate-600">
          {reports.length}건 인쇄
        </span>
        {failedIds.length > 0 && (
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
            {failedIds.length}건 불러오기 실패
          </span>
        )}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-yellow-400 px-5 py-2 text-sm font-bold text-slate-900 shadow-[3px_3px_0px_#1e293b] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#1e293b]"
        >
          <Printer className="h-4 w-4" />
          인쇄하기
        </button>
      </div>

      <div id="bulk-print-root" className="min-h-screen bg-slate-100 py-20 print:min-h-0 print:bg-white print:py-0">
        {reports.map(({ id, data }, index) => (
          <div key={id} className="bulk-print-page h-[595px] w-[842px] overflow-hidden bg-white">
            <PrintableReport
              analysis={data.analysis}
              feedback={data.feedback}
              userProfile={data.user_profile}
              layeringSession={data.layering_session}
              partnerAnalysis={data.partner_analysis}
              rootId={`printable-report-${index + 1}`}
              standalonePrintStyles={false}
            />
          </div>
        ))}
      </div>
    </>
  )
}
