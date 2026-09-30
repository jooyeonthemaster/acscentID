import { notFound } from 'next/navigation'
import {
  RESULT_PHOTO_TTL_HOURS,
  isResultExpired,
  isResultToken,
  resultPhotoImagePath,
  resultTokenCreatedAt,
} from '@/lib/photobooth/result-photo'
import PhotoSaver from './PhotoSaver'
import { BOOTH_LANGS, boothText, parseBoothLang } from '@/lib/booth/i18n'

// 부스 [이미지 저장] QR 을 폰으로 찍으면 열리는 페이지 — 손님이 자기 사진을 갤러리에 저장한다
export const metadata = {
  title: "내 사진 | AC'SCENT WOW",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function BoothPhotoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  /** ?lang= — 부스 화면 언어(부스가 [이미지 저장] QR 주소에 붙인다, 없으면 한국어) */
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  const { token } = await params
  if (!isResultToken(token)) notFound()
  const lang = parseBoothLang((await searchParams).lang)
  const t = boothText(lang)
  const expiredDesc = t.photoExpiredDesc(RESULT_PHOTO_TTL_HOURS)

  if (isResultExpired(token)) {
    return (
      <div lang={BOOTH_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'} className="min-h-svh bg-neutral-950 text-white flex flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-sm font-bold tracking-[0.25em] text-white/50 mb-8">AC&apos;SCENT WOW</p>
        <h1 className="text-2xl font-bold mb-3 break-keep">{t.photoExpiredTitle}</h1>
        <p className="text-white/55 text-sm leading-relaxed break-keep">
          {expiredDesc[0]}
          <br />
          {expiredDesc[1]}
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
      lang={lang}
    />
  )
}
