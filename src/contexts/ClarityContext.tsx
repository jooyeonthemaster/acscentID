'use client'

import { useEffect, useCallback } from 'react'
import Clarity from '@microsoft/clarity'
import { useAuth } from './AuthContext'

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID
const CONSENT_KEY = 'acscent-cookie-consent'

export function ClarityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const initClarity = useCallback(() => {
    if (!CLARITY_PROJECT_ID || typeof window === 'undefined') return
    const consent = localStorage.getItem(CONSENT_KEY)
    if (consent === 'accepted') {
      Clarity.init(CLARITY_PROJECT_ID)
    }
  }, [])

  // 페이지 로드 시 동의 상태 확인 후 초기화
  useEffect(() => {
    initClarity()
  }, [initClarity])

  // 동의 변경 이벤트 수신
  useEffect(() => {
    const handler = () => initClarity()
    window.addEventListener('cookie-consent-changed', handler)
    return () => window.removeEventListener('cookie-consent-changed', handler)
  }, [initClarity])

  // 로그인 사용자 식별
  useEffect(() => {
    if (CLARITY_PROJECT_ID && user?.id) {
      const consent = localStorage.getItem(CONSENT_KEY)
      if (consent === 'accepted') {
        Clarity.identify(user.id, undefined, undefined, user.email)
      }
    }
  }, [user?.id, user?.email])

  return <>{children}</>
}
