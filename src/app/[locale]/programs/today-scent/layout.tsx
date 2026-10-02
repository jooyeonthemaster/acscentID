import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createMetadata, localizePublicPath } from '@/lib/seo/metadata'
import { resolveProgramLocale } from '@/lib/programs/program-seo'

// 오늘의 향 페이지는 InactiveProductGuard를 쓰지 않아 관리자 활성 여부와 무관하게 열린다 —
// 메타데이터도 화면과 같게 판매 중으로 둔다 (판매중지 noindex는 가드가 있는 프로그램에만)
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveProgramLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'metadata.pages.todayScent' })
  return createMetadata({
    title: t('title'),
    description: t('description'),
    path: localizePublicPath('/programs/today-scent', locale),
    locale,
  })
}

export default function TodayScentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
