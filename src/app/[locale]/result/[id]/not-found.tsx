import Link from 'next/link'

export default function ResultNotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[var(--canvas)] font-wanted">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-[var(--canvas)]">
        <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--soft)] rounded-full mix-blend-multiply animate-blob" />
        </div>
      </div>

      <div className="relative z-10 text-center glass-card rounded-[6px] p-8 max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">😢</span>
        </div>
        <h2 className="text-xl font-bold text-[var(--ink)] mb-2">결과를 찾을 수 없어요</h2>
        <p className="text-[var(--muted-ink)] text-sm lg:text-base mb-6">링크가 만료되었거나 잘못되었습니다.</p>
        <Link
          href="/"
          className="inline-block bg-[var(--soft)] text-[var(--ink)] hover:bg-[var(--soft)] rounded-[6px] px-6 py-3 font-bold transition-colors"
        >
          나도 분석 받기
        </Link>
      </div>
    </div>
  )
}
