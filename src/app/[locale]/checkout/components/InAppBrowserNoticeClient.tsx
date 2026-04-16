"use client"

import { useState } from "react"
import { AlertTriangle, ExternalLink, Copy, Check } from "lucide-react"
import {
  detectInAppBrowser,
  escapeInAppBrowser,
  getManualEscapeGuide,
  type InAppBrowserInfo,
} from "@/lib/mobile/inAppBrowser"

/**
 * 인앱브라우저 경고 배너의 클라이언트 구현체.
 * 상위 컴포넌트에서 dynamic({ ssr: false })로 감싸져 하이드레이션 이후에만 렌더된다.
 */
export function InAppBrowserNoticeClient() {
  // dynamic ssr:false 로 로드되므로 window가 반드시 정의된 시점에 한정된다.
  // useState lazy initializer로 한 번만 계산하고 이후 이벤트 핸들러에서만 상태를 바꾼다.
  const [info] = useState<InAppBrowserInfo>(() => detectInAppBrowser())
  const [copied, setCopied] = useState(false)

  if (!info.isInApp) return null

  const handleOpenExternal = () => {
    escapeInAppBrowser(info)
  }

  const copyCurrentUrl = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 mb-4 shadow-[3px_3px_0px_#FCA5A5]">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center mt-0.5">
          <AlertTriangle size={18} className="text-red-600" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-red-900 text-base mb-1">
            {info.displayName} 브라우저에서는 결제가 제한됩니다
          </h3>
          <p className="text-sm text-red-800 font-medium leading-relaxed break-keep">
            원활한 결제를 위해 <strong className="font-black">Safari 또는 Chrome</strong>에서 열어주세요.
          </p>

          {info.canAutoEscape ? (
            <button
              onClick={handleOpenExternal}
              className="mt-3 w-full h-12 bg-red-500 text-white rounded-xl font-black border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              외부 브라우저로 열기
            </button>
          ) : (
            <>
              <div className="mt-3 bg-white border-2 border-red-300 rounded-xl p-3">
                <p className="text-xs text-slate-700 font-bold leading-relaxed break-keep">
                  {getManualEscapeGuide(info)}
                </p>
              </div>
              <button
                onClick={copyCurrentUrl}
                className={`mt-2 w-full h-11 rounded-xl font-black border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 ${
                  copied ? "bg-green-500 text-white" : "bg-white text-slate-900"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    주소가 복사되었습니다
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    주소 복사하기
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
