import type { Metadata } from 'next'
import { getScentById } from '@/lib/today-scent/scents'
import { getBaseUrl, createMetadata } from '@/lib/seo/metadata'
import type { Locale } from '@/i18n/config'
import { ScentShareSplash } from './ScentShareSplash'

interface Props {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const loc = locale as Locale
  const scent = getScentById(id)
  const baseUrl = getBaseUrl()

  if (!scent) {
    return createMetadata({
      title: "오늘의 향 - AC'SCENT",
      locale: loc,
      path: `/today-scent/${id}`,
      noIndex: true,
    })
  }

  const title = `오늘의 향: ${scent.name}`
  const description = `${scent.vibe} · 탑 ${scent.notes.top} / 미들 ${scent.notes.mid} / 베이스 ${scent.notes.base}`

  return createMetadata({
    title,
    description,
    locale: loc,
    path: `/today-scent/${id}`,
    noIndex: true,
    openGraph: {
      images: [
        { url: `${baseUrl}/today-scent-og/${id}`, width: 1200, height: 630, alt: title },
      ],
    },
  })
}

export default async function TodayScentSharePage({ params }: Props) {
  const { locale, id } = await params
  const scent = getScentById(id)

  return (
    <ScentShareSplash
      id={id}
      locale={locale}
      name={scent?.name ?? null}
      emoji={scent?.emoji ?? '🎁'}
      bg={scent?.theme.bg ?? '#FCD34D'}
      ink={scent?.theme.ink ?? '#1a1a1a'}
    />
  )
}
