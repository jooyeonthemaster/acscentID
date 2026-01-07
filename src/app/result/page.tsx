import React, { Suspense } from 'react'
import ResultPageMain from './components/ResultPageMain'

// 로딩 컴포넌트
function ResultLoading() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[#FAFAFA] font-sans">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#FDFDFD]">
        <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply animate-blob animation-delay-4000" />
        </div>
      </div>
      <div className="relative z-10 text-center">
        <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-700 font-semibold">분석 결과를 불러오는 중...</p>
        <p className="text-slate-400 text-sm mt-1">잠시만 기다려주세요</p>
      </div>
    </div>
  )
}

export default function ResultPage() {
  return (
    <Suspense fallback={<ResultLoading />}>
      <ResultPageMain />
    </Suspense>
  )
}



