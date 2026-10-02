import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createMetadata } from '@/lib/seo/metadata'
import { isProgramEnabledServer } from '@/lib/programs/availability'
import { getLocalizedProgramPath, getProgramSeo, resolveProgramLocale } from '@/lib/programs/program-seo'

interface ProgramLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveProgramLocale((await params).locale)
  const seo = getProgramSeo('personal', locale)
  const enabled = await isProgramEnabledServer('personal')
  const tInactive = await getTranslations({ locale, namespace: 'programs.inactive' })
  const title = enabled ? seo.title : `${tInactive('metaTitlePrefix')} · ${seo.title}`

  return createMetadata({
    title,
    // 판매중지 프로그램은 검색 노출에서 제외
    noIndex: !enabled,
    description: seo.description,
    path: getLocalizedProgramPath('personal', locale),
    keywords: seo.keywords,
    locale,
  })
}

export default function PersonalLayout({ children }: ProgramLayoutProps) {
  return <>{children}</>
}
