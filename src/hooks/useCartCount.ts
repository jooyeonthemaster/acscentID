'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { onCartChanged } from '@/lib/cart-events'

/**
 * 헤더 장바구니 뱃지용 개수. Header.tsx와 동일 동작:
 * 로그인 시 조회, 페이지 이동·장바구니 변경 이벤트 시 갱신, 비로그인 0.
 */
export function useCartCount(): number {
  const { user, unifiedUser } = useAuth()
  const currentUser = unifiedUser || user
  const [cartCount, setCartCount] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false

    const refresh = () => {
      fetch('/api/cart?count=true')
        .then(res => (res.ok ? res.json() : null))
        .then(data => { if (data && !cancelled) setCartCount(data.count || 0) })
        .catch(() => {})
    }

    refresh()
    const unsubscribe = onCartChanged(refresh)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [currentUser, pathname])

  return currentUser ? cartCount : 0
}
