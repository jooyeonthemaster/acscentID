'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { signInWithGoogle, signInWithKakao, signOut as authSignOut, linkFingerprintData } from '@/lib/supabase/auth'

interface AuthContextType {
  user: User | null
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

  useEffect(() => {
    // 초기 세션 확인
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
      } catch (error) {
        console.error('Failed to get initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)

        // 로그인 성공 시 fingerprint 데이터 연동
        if (event === 'SIGNED_IN' && currentSession?.user) {
          // 약간의 딜레이 후 연동 (DB 트리거가 프로필 생성 완료하도록)
          setTimeout(() => {
            linkFingerprintDataInternal(currentSession.user.id)
          }, 1000)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [linkFingerprintDataInternal])

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

  // 로그아웃 핸들러
  const handleSignOut = useCallback(async () => {
    try {
      await authSignOut()
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  }, [])

  // 수동 fingerprint 연동 핸들러
  const handleLinkFingerprintData = useCallback(async () => {
    if (user) {
      await linkFingerprintDataInternal(user.id)
    }
  }, [user, linkFingerprintDataInternal])

  const value: AuthContextType = {
    user,
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
