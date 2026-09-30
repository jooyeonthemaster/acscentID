import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { isCardCode } from '@/lib/photobooth/card-code'
import { BOOTH_LANGS, boothText, parseBoothLang } from '@/lib/booth/i18n'

// 카드 QR을 폰으로 찍었을 때 열리는 안내 페이지 (부스 카메라로 찍으면 여기까지 오지 않는다)
export const metadata = {
  title: "포토카드 | AC'SCENT WOW",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function BoothCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  /** ?lang= — 있으면 그 언어로(인쇄된 카드 QR 에는 없어 한국어) */
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  const { code: raw } = await params
  const lang = parseBoothLang((await searchParams).lang)
  const t = boothText(lang)
  const code = decodeURIComponent(raw).trim().toUpperCase()
  if (!isCardCode(code)) notFound()

  const serviceClient = createServiceRoleClient()
  const { data } = await serviceClient
    .from('photobooth_cards')
    .select('code, title, image_url, is_active, photobooth_events(title, artist, hashtag)')
    .eq('code', code)
    .maybeSingle()

  if (!data || !data.is_active) notFound()

  const event = Array.isArray(data.photobooth_events)
    ? data.photobooth_events[0]
    : data.photobooth_events

  return (
    <div lang={BOOTH_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'} className="min-h-svh bg-neutral-950 text-white flex flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm font-bold tracking-[0.25em] text-white/50 mb-8">AC&apos;SCENT WOW</p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.image_url}
        alt={data.title}
        className="w-52 rounded-2xl shadow-2xl mb-7"
      />

      <h1 className="text-2xl font-bold mb-1">{data.title}</h1>
      {event?.artist && <p className="text-white/50 text-sm mb-1">{event.artist}</p>}
      {event?.title && <p className="text-white/35 text-xs mb-6">{event.title}</p>}

      <div className="w-full max-w-sm rounded-2xl border border-white/15 p-5 mb-5">
        <p className="text-sm leading-relaxed text-white/70">
          {t.cardUse[0]}<span className="font-bold text-white">{t.cardUse[1]}</span>{t.cardUse[2]}
          <br />
          {t.cardHow[0]}<span className="font-bold text-white">{t.tileCard}</span>{t.cardHow[1]}
        </p>
        <p className="mt-4 font-mono text-2xl font-bold tracking-[0.3em]">{data.code}</p>
        <p className="mt-1 text-xs text-white/35">{t.cardCodeHint}</p>
      </div>

      {event?.hashtag && (
        <p className="text-sm text-white/45">
          {t.cardHashtag} <span className="font-bold text-white/80">{event.hashtag}</span>
        </p>
      )}
    </div>
  )
}
