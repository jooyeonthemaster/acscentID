'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isDesktopReadyPath } from '@/lib/desktop/routes'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

/**
 * [locale] 레이아웃의 455px 중앙 컬럼. 기존 레이아웃의 내부 div를 그대로
 * 추출한 것으로, lg 미만에서는 전 라우트가 기존과 바이트 동일한 클래스를
 * 출력한다. 데스크탑 변형이 완성되어 레지스트리에 옵트인된 라우트에서만
 * lg 이상에서 폭 제한을 해제한다.
 */
export function ShellColumn({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const wide = isDesktopReadyPath(pathname)

  return (
    <div
      className={cn(
        'w-full max-w-[455px] mx-auto min-h-screen bg-[var(--canvas)] relative flex flex-col',
        wide && 'lg:max-w-none',
      )}
    >
      <main className="flex-1 md:pb-0 relative z-10 bg-[var(--canvas)]">
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
