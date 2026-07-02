import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { getLocalizedProgramPath, getProgramSeo, resolveProgramLocale } from '@/lib/programs/program-seo'

interface ProgramLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveProgramLocale((await params).locale)
  const seo = getProgramSeo('personal', locale)

  return createMetadata({
    title: seo.title,
    description: seo.description,
    path: getLocalizedProgramPath('personal', locale),
    keywords: seo.keywords,
    locale,
  })
}

export default function PersonalLayout({ children }: ProgramLayoutProps) {
  return <>{children}</>
}
