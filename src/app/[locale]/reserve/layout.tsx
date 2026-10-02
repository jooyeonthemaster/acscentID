import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createMetadata, localizePublicPath } from '@/lib/seo/metadata'
import { resolveProgramLocale } from '@/lib/programs/program-seo'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveProgramLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'metadata.pages.reserve' })
  return createMetadata({
    title: t('title'),
    description: t('description'),
    path: localizePublicPath('/reserve', locale),
    locale,
  })
}

export default function ReserveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
