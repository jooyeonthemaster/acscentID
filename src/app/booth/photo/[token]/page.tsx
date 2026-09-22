import { notFound } from 'next/navigation'
import {
  RESULT_PHOTO_TTL_HOURS,
  isResultExpired,
  isResultToken,
  resultPhotoImagePath,
  resultTokenCreatedAt,
} from '@/lib/photobooth/result-photo'
import PhotoSaver from './PhotoSaver'

// 부스 [이미지 저장] QR 을 폰으로 찍으면 열리는 페이지 — 손님이 자기 사진을 갤러리에 저장한다
export const metadata = {
  title: "내 사진 | AC'SCENT WOW",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function BoothPhotoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!isResultToken(token)) notFound()

  if (isResultExpired(token)) {
    return (
      <div className="min-h-svh bg-neutral-950 text-white flex flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-sm font-bold tracking-[0.25em] text-white/50 mb-8">AC&apos;SCENT WOW</p>
        <h1 className="text-2xl font-bold mb-3 break-keep">사진 보관 기간이 지났어요</h1>
        <p className="text-white/55 text-sm leading-relaxed break-keep">
          부스 사진은 개인정보 보호를 위해
          <br />
          촬영 후 {RESULT_PHOTO_TTL_HOURS}시간이 지나면 자동으로 삭제돼요.
        </p>
      </div>
    )
  }

  const expiresAt = resultTokenCreatedAt(token) + RESULT_PHOTO_TTL_HOURS * 60 * 60 * 1000

  return (
    <PhotoSaver
      imageUrl={resultPhotoImagePath(token)}
      downloadUrl={resultPhotoImagePath(token, true)}
      fileName={`acscent-wow-${token.slice(-6)}.jpg`}
      expiresAt={expiresAt}
    />
  )
}
