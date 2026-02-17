'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/analytics/client'
import { useAuth } from './AuthContext'

interface AnalyticsContextType {
  trackEvent: (eventName: string, data?: Record<string, unknown>, category?: string) => Promise<void>
  trackClick: (elementName: string, data?: Record<string, unknown>) => Promise<void>
  trackFormSubmit: (formName: string, data?: Record<string, unknown>) => Promise<void>
  trackPurchase: (orderId: string, amount: number, items?: unknown[]) => Promise<void>
  trackAddToCart: (productId: string, productName: string, price: number) => Promise<void>
  trackSearch: (query: string, resultsCount?: number) => Promise<void>
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null)

interface AnalyticsProviderProps {
  children: ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  // 초기화 및 사용자 ID 설정
  useEffect(() => {
    analytics.init(user?.id)
  }, [user?.id])

  // 페이지 변경 시 자동 추적
  useEffect(() => {
    if (pathname) {
      analytics.trackPageView(pathname)
    }
  }, [pathname])

  // 사용자 ID 변경 시 업데이트
  useEffect(() => {
    analytics.setUserId(user?.id || null)
  }, [user?.id])

  const value: AnalyticsContextType = {
    trackEvent: (eventName, data, category) => analytics.trackEvent(eventName, data, category),
    trackClick: (elementName, data) => analytics.trackClick(elementName, data),
    trackFormSubmit: (formName, data) => analytics.trackFormSubmit(formName, data),
    trackPurchase: (orderId, amount, items) => analytics.trackPurchase(orderId, amount, items),
    trackAddToCart: (productId, productName, price) =>
      analytics.trackAddToCart(productId, productName, price),
    trackSearch: (query, resultsCount) => analytics.trackSearch(query, resultsCount),
  }

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}
