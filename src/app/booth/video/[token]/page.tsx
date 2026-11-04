import { isResultExpired, isResultToken, resultTokenCreatedAt } from '@/lib/photobooth/result-photo'
import { RESULT_MEDIA_TTL_HOURS, resultMediaFilePath } from '@/lib/photobooth/result-media'
import { notFound } from 'next/navigation'

// 포토부스 영상(뮤직비디오·추억 무비) 받기 — 부스 저장 화면 QR 로 온다. 7일 보관
export const metadata = {
  title: '내 영상 | 포토부스',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function BoothVideoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isResultToken(token)) notFound()
  if (isResultExpired(token)) {
    return (
      <main className="min-h-svh bg-[#0f0b30] text-white flex flex-col items-center justify-center px-6 text-center gap-3">
        <h1 className="text-2xl font-bold">보관 기간이 지났어요</h1>
        <p className="text-sm text-white/60 break-keep">영상은 {RESULT_MEDIA_TTL_HOURS / 24}일 동안만 받을 수 있어요.</p>
      </main>
    )
  }
  const until = new Date(resultTokenCreatedAt(token) + RESULT_MEDIA_TTL_HOURS * 3600 * 1000 + 9 * 3600 * 1000)
  const untilText = `${until.getUTCMonth() + 1}월 ${until.getUTCDate()}일 ${String(until.getUTCHours()).padStart(2, '0')}:${String(until.getUTCMinutes()).padStart(2, '0')}`
  return (
    <main className="min-h-svh bg-[#0f0b30] text-white px-5 py-8 flex flex-col items-center gap-5">
      <p className="text-xs font-bold tracking-[0.3em] text-white/50">PHOTOBOOTH</p>
      <h1 className="text-2xl font-black">내 영상</h1>
      <video src={resultMediaFilePath(token)} controls playsInline preload="metadata" className="w-full max-w-xl rounded-2xl bg-black" />
      <a href={resultMediaFilePath(token, true)} className="w-full max-w-xl min-h-14 rounded-2xl bg-[#8b5cf6] text-lg font-bold flex items-center justify-center">
        영상 저장하기
      </a>
      <p className="text-sm text-white/60 text-center break-keep">
        아이폰은 영상을 연 뒤 공유 버튼 → [비디오 저장]을 눌러 주세요.<br />{untilText}까지 받을 수 있어요(한국 시간).
      </p>
    </main>
  )
}
