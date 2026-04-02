'use client'

import { useMemo } from 'react'
import { Package } from 'lucide-react'
import DOMPurify from 'dompurify'

interface PhonePreviewProps {
  productLabel: string
  previewHtml: string
}

export default function PhonePreview({ productLabel, previewHtml }: PhonePreviewProps) {
  const sanitizedHtml = useMemo(() => {
    if (typeof window === 'undefined') return previewHtml
    return DOMPurify.sanitize(previewHtml, {
      ADD_TAGS: ['img', 'mark'],
      ADD_ATTR: ['style', 'class', 'data-color', 'target', 'rel'],
      ALLOW_DATA_ATTR: true,
    })
  }, [previewHtml])
  return (
    <div className="flex justify-center">
      <div className="relative">
        {/* Device Bezel */}
        <div className="w-[480px] max-w-full bg-slate-800 rounded-[40px] p-3 shadow-2xl">
          {/* Notch */}
          <div className="flex justify-center mb-2">
            <div className="w-28 h-6 bg-slate-900 rounded-full" />
          </div>

          {/* Screen */}
          <div className="bg-white rounded-[28px] overflow-hidden" style={{ maxHeight: '700px' }}>
            <div className="overflow-y-auto" style={{ maxHeight: '700px' }}>
              {/* Hero placeholder */}
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 h-48 flex items-center justify-center">
                <div className="text-center">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">{productLabel}</p>
                  <p className="text-[10px] text-slate-300 mt-1">상품 히어로 이미지 영역</p>
                </div>
              </div>

              {/* Custom HTML Preview */}
              <div className="p-4">
                <div
                  className="prose prose-sm max-w-none
                    [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg
                    [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3
                    [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2
                    [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-2
                    [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2
                    [&_a]:text-blue-600 [&_a]:underline
                    [&_ul]:list-disc [&_ul]:pl-5
                    [&_ol]:list-decimal [&_ol]:pl-5
                    [&_li]:text-sm
                    [&_hr]:my-4 [&_hr]:border-slate-200
                    [&_mark]:px-1 [&_mark]:rounded
                  "
                  dangerouslySetInnerHTML={{
                    __html: sanitizedHtml || '<p class="text-slate-400 text-center text-sm">콘텐츠를 입력하면 여기에 미리보기가 표시됩니다.</p>',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Home Bar */}
          <div className="flex justify-center mt-2">
            <div className="w-32 h-1 bg-slate-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
