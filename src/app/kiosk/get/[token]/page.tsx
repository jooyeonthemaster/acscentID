import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { KIOSK_LANGS } from '@/lib/kiosk/i18n'
import { isShareExpired, isShareToken, parseShareMeta, shareExpiresAt, shareKindMeta } from '@/lib/kiosk/share'
import { getShareMeta } from '@/lib/kiosk/share-store'
import { ShareSaver } from './ShareSaver'
import { SHARE_TEXT } from './text'

// 키오스크 체험 결과의 [휴대폰으로 받기] QR 을 폰으로 찍으면 열리는 페이지 — 손님이 자기 결과(사진·명함·목소리)를 저장한다
export const metadata = {
  title: '내 체험 결과 받기',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

function Message({ lang, title, desc }: { lang: string; title: string; desc: string }) {
  return (
    <div lang={lang} className="flex min-h-svh flex-col items-center justify-center bg-neutral-950 px-6 py-10 text-center text-white">
      <h1 className="mb-3 break-keep text-2xl font-bold">{title}</h1>
      <p className="break-keep text-sm leading-relaxed text-white/60">{desc}</p>
    </div>
  )
}

export default async function KioskSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isShareToken(token)) notFound()
  if (isShareExpired(token)) return <Message lang="ko" title={SHARE_TEXT.ko.expiredTitle} desc={SHARE_TEXT.ko.expiredDesc} />

  const meta = parseShareMeta(await getShareMeta(createServiceRoleClient(), token))
  if (!meta) return <Message lang="ko" title={SHARE_TEXT.ko.missingTitle} desc={SHARE_TEXT.ko.missingDesc} />

  return (
    <ShareSaver
      token={token}
      meta={meta}
      tag={shareKindMeta(meta.kind).tag}
      color={shareKindMeta(meta.kind).color}
      htmlLang={KIOSK_LANGS.find((l) => l.id === meta.lang)?.htmlLang ?? 'ko'}
      expiresAt={shareExpiresAt(token)}
    />
  )
}
