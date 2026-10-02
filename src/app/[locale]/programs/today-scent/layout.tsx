import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createMetadata, localizePublicPath } from '@/lib/seo/metadata'
import { resolveProgramLocale } from '@/lib/programs/program-seo'
import { isProgramEnabledServer } from '@/lib/programs/availability'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveProgramLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'metadata.pages.todayScent' })
  const enabled = await isProgramEnabledServer('today-scent')
  const tInactive = await getTranslations({ locale, namespace: 'programs.inactive' })
  return createMetadata({
    title: enabled ? t('title') : `${tInactive('metaTitlePrefix')} · ${t('title')}`,
    description: t('description'),
    path: localizePublicPath('/programs/today-scent', locale),
    locale,
    noIndex: !enabled,
  })
}

export default function TodayScentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
