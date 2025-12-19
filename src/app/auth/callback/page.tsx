'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('로그인 처리 중...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL에서 에러 확인
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          console.error('OAuth error:', error, errorDescription)
          setStatus('error')
          setMessage(errorDescription || '로그인 중 오류가 발생했습니다.')
          setTimeout(() => router.push('/'), 2000)
          return
        }

        // Supabase가 자동으로 해시에서 세션을 처리함
        // getSession을 호출하면 URL 해시의 토큰을 자동 처리
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setStatus('error')
          setMessage('세션 처리 중 오류가 발생했습니다.')
          setTimeout(() => router.push('/'), 2000)
          return
        }

        if (session) {
          console.log('Login successful:', session.user.email)
          setStatus('success')
          setMessage('로그인 성공! 이동 중...')

          // next 파라미터가 있으면 해당 경로로, 없으면 /result로
          const next = searchParams.get('next') || '/result'
          setTimeout(() => router.push(next), 1000)
        } else {
          // 세션이 없으면 해시에서 처리 대기
          // onAuthStateChange가 처리할 때까지 대기
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              console.log('Auth state changed: SIGNED_IN')
              setStatus('success')
              setMessage('로그인 성공! 이동 중...')
              const next = searchParams.get('next') || '/result'
              setTimeout(() => router.push(next), 1000)
              subscription.unsubscribe()
            }
          })

          // 5초 후에도 세션이 없으면 에러
          setTimeout(() => {
            if (status === 'loading') {
              setStatus('error')
              setMessage('로그인 시간이 초과되었습니다.')
              setTimeout(() => router.push('/'), 2000)
            }
          }, 5000)
        }
      } catch (err) {
        console.error('Callback error:', err)
        setStatus('error')
        setMessage('예상치 못한 오류가 발생했습니다.')
        setTimeout(() => router.push('/'), 2000)
      }
    }

    handleCallback()
  }, [router, searchParams, status])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4" />
        )}
        {status === 'success' && (
          <div className="text-green-500 text-4xl mb-4">✓</div>
        )}
        {status === 'error' && (
          <div className="text-red-500 text-4xl mb-4">✗</div>
        )}
        <p className="text-white text-lg">{message}</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white text-lg">로그인 처리 중...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
