"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ScentShareSplashProps {
  id: string
  locale: string
  name: string | null
  emoji: string
  bg: string
  ink: string
}

/**
 * 공유 링크(/today-scent/[id])로 들어온 사람을 홈의 "오늘의 향" 랜딩
 * (?from=today-scent&scent=...)으로 보내는 브랜디드 스플래시.
 * 소셜 크롤러는 JS를 실행하지 않으므로 이 페이지의 OG 메타만 읽어가고,
 * 실제 사람은 홈 랜딩(환영 배너 + 뽑기)으로 이동한다.
 */
export function ScentShareSplash({ id, locale, name, emoji, bg, ink }: ScentShareSplashProps) {
  const router = useRouter()

  useEffect(() => {
    const prefix = locale && locale !== 'ko' ? `/${locale}` : ''
    const target = `${prefix}/?from=today-scent&scent=${id}`
    const timer = setTimeout(() => router.replace(target), 900)
    return () => clearTimeout(timer)
  }, [id, locale, router])

  return (
    <div
      style={{ backgroundColor: bg, color: ink }}
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="text-7xl leading-none animate-bounce">{emoji}</div>
      <p className="mt-6 text-sm font-black opacity-70">오늘의 향</p>
      {name && <h1 className="mt-1 text-2xl font-black">{name}</h1>}
      <p className="mt-4 text-xs font-bold opacity-60">향을 불러오는 중...</p>
      <div className="mt-5 w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
    </div>
  )
}
