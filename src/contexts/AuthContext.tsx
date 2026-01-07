'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { signInWithGoogle, signInWithKakao, linkFingerprintData } from '@/lib/supabase/auth'

// 통합 사용자 타입 (Supabase Auth + 카카오 커스텀)
interface UnifiedUser {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  provider: string
}

interface AuthContextType {
  user: User | null  // Supabase Auth 사용자 (하위 호환성)
  unifiedUser: UnifiedUser | null  // 통합 사용자 (카카오 포함)
  session: Session | null
  loading: boolean
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signInWithKakao: (redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  linkFingerprintData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [unifiedUser, setUnifiedUser] = useState<UnifiedUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Fingerprint 데이터 연동 (내부 함수)
  const linkFingerprintDataInternal = useCallback(async (userId: string) => {
    if (typeof window === 'undefined') return

    const fingerprint = localStorage.getItem('user_fingerprint')
    if (!fingerprint) return

    try {
      await linkFingerprintData(userId, fingerprint)
      console.log('Fingerprint data linked successfully')
    } catch (error) {
      console.error('Failed to link fingerprint data:', error)
    }
  }, [])

  // 세션 체크 (카카오 + Supabase 통합)
  const checkSession = useCallback(async () => {
    try {
      // 1. API를 통해 세션 확인 (카카오 + Supabase 모두)
      const response = await fetch('/api/auth/session')
      const data = await response.json()

      if (data.user) {
        setUnifiedUser(data.user)

        // 카카오 사용자가 아닌 경우 Supabase Auth 세션도 확인
        if (data.provider !== 'kakao') {
          const { data: { session: supabaseSession } } = await supabase.auth.getSession()
          setSession(supabaseSession)
          setUser(supabaseSession?.user ?? null)
        } else {
          // 카카오 사용자는 Supabase Auth 세션 없음
          setSession(null)
          setUser(null)
        }
      } else {
        // Supabase Auth 세션만 확인
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        setSession(supabaseSession)
        setUser(supabaseSession?.user ?? null)

        if (supabaseSession?.user) {
          setUnifiedUser({
            id: supabaseSession.user.id,
            email: supabaseSession.user.email ?? null,
            name: supabaseSession.user.user_metadata?.name || supabaseSession.user.user_metadata?.full_name || null,
            avatar_url: supabaseSession.user.user_metadata?.avatar_url || supabaseSession.user.user_metadata?.picture || null,
            provider: supabaseSession.user.app_metadata?.provider || 'google',
          })
        } else {
          setUnifiedUser(null)
        }
      }
    } catch (error) {
      console.error('Session check failed:', error)
      // 폴백: Supabase Auth만 확인
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      setSession(supabaseSession)
      setUser(supabaseSession?.user ?? null)
      setUnifiedUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 초기 세션 확인
    checkSession()

    // Supabase Auth 상태 변경 리스너 (Google 로그인용)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          setUnifiedUser({
            id: currentSession.user.id,
            email: currentSession.user.email ?? null,
            name: currentSession.user.user_metadata?.name || currentSession.user.user_metadata?.full_name || null,
            avatar_url: currentSession.user.user_metadata?.avatar_url || currentSession.user.user_metadata?.picture || null,
            provider: currentSession.user.app_metadata?.provider || 'google',
          })
        }

        setLoading(false)

        // 로그인 성공 시 fingerprint 데이터 연동
        if (event === 'SIGNED_IN' && currentSession?.user) {
          setTimeout(() => {
            linkFingerprintDataInternal(currentSession.user.id)
          }, 1000)
        }
      }
    )

    // URL에서 login_success 파라미터 확인 (카카오 로그인 후)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('login_success') === 'true') {
        // 카카오 로그인 성공 - 세션 다시 확인 후 fingerprint 연동
        checkSession().then(() => {
          // 세션 로드 완료 후 약간의 지연을 두고 fingerprint 연동
          // (unifiedUser state가 업데이트될 시간 확보)
          setTimeout(async () => {
            // 현재 세션에서 userId 다시 가져오기
            try {
              const response = await fetch('/api/auth/session')
              const data = await response.json()
              if (data.user?.id) {
                linkFingerprintDataInternal(data.user.id)
              }
            } catch (error) {
              console.error('Failed to link fingerprint after Kakao login:', error)
            }
          }, 500)
        })
        // URL 정리
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [checkSession, linkFingerprintDataInternal])

  // Google 로그인 핸들러
  const handleSignInWithGoogle = useCallback(async (redirectTo?: string) => {
    try {
      await signInWithGoogle(redirectTo)
    } catch (error) {
      console.error('Google sign in failed:', error)
      throw error
    }
  }, [])

  // Kakao 로그인 핸들러
  const handleSignInWithKakao = useCallback(async (redirectTo?: string) => {
    try {
      await signInWithKakao(redirectTo)
    } catch (error) {
      console.error('Kakao sign in failed:', error)
      throw error
    }
  }, [])

  // 로그아웃 핸들러 (카카오 + Supabase 모두)
  const handleSignOut = useCallback(async () => {
    try {
      // API를 통해 모든 세션 삭제
      await fetch('/api/auth/logout', { method: 'POST' })

      setUser(null)
      setUnifiedUser(null)
      setSession(null)
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  }, [])

  // 수동 fingerprint 연동 핸들러
  const handleLinkFingerprintData = useCallback(async () => {
    const userId = user?.id || unifiedUser?.id
    if (userId) {
      await linkFingerprintDataInternal(userId)
    }
  }, [user, unifiedUser, linkFingerprintDataInternal])

  const value: AuthContextType = {
    user,
    unifiedUser,
    session,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithKakao: handleSignInWithKakao,
    signOut: handleSignOut,
    linkFingerprintData: handleLinkFingerprintData
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Auth Context Hook
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
