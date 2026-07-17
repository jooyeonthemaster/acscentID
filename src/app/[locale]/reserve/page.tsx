"use client"

import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { Header } from "@/components/layout/Header"
import { ReserveFlow } from "./components/ReserveFlow"

function ReserveLoading() {
  return (
    <div className="min-h-screen bg-[#0E1016] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#262A38] border-t-[#D7D7D7] rounded-full animate-spin" />
    </div>
  )
}

export default function ReservePage() {
  const t = useTranslations('reserve')

  return (
    <div className="relative min-h-screen bg-[#0E1016] font-wanted">
      <Header title={t('title')} showBack={true} backHref="/" />
      <main className="relative z-10 pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Suspense fallback={<ReserveLoading />}>
            <ReserveFlow />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
