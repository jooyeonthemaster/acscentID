import Link from 'next/link'

export default function ResultNotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[#10131C] font-wanted">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#0C0E16]">
        <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#232838] rounded-full mix-blend-multiply animate-blob" />
        </div>
      </div>

      <div className="relative z-10 text-center glass-card rounded-[12px] p-8 max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">😢</span>
        </div>
        <h2 className="text-xl font-bold text-[#E9E2D0] mb-2">결과를 찾을 수 없어요</h2>
        <p className="text-[#8B8578] text-sm lg:text-base mb-6">링크가 만료되었거나 잘못되었습니다.</p>
        <Link
          href="/"
          className="inline-block bg-[#161925] text-[#E9E2D0] hover:bg-[#161925] rounded-[12px] px-6 py-3 font-bold transition-colors"
        >
          나도 분석 받기
        </Link>
      </div>
    </div>
  )
}
