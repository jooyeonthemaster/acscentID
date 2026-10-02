'use client'

import { useTranslations } from 'next-intl'
import { SearchX } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Header } from '@/components/layout/Header'
import { ProgramSuggestions } from '@/components/programs/ProgramSuggestions'

export default function LocaleNotFound() {
  const t = useTranslations('notFound')
  return (
    <>
      <title>{`${t('metaTitle')} | AC'SCENT IDENTITY`}</title>
      <meta name="robots" content="noindex" />
      <Header />
      <section className="bg-[var(--canvas)] px-4 pb-16 pt-28 lg:pt-16">
        <div className="mx-auto w-full max-w-[455px] lg:max-w-[720px]">
          <div className="rounded-[6px] border border-[var(--line)] bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)]">
              <SearchX className="h-7 w-7 text-[var(--muted-ink)]" aria-hidden />
            </div>
            <p className="text-xs lg:text-sm font-black text-[var(--muted-ink)]">404</p>
            <h1 className="mb-2 mt-1 text-xl font-black text-[var(--ink)]">{t('title')}</h1>
            <p className="text-sm lg:text-base text-[var(--muted-ink)]">{t('description')}</p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[5px] bg-[var(--ink)] px-5 text-base font-bold text-white transition-colors hover:bg-black"
            >
              {t('backHome')}
            </Link>
          </div>
          <ProgramSuggestions title={t('popularTitle')} />
        </div>
      </section>
    </>
  )
}
