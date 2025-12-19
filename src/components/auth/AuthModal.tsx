'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  onSuccess?: () => void
}

export function AuthModal({
  isOpen,
  onClose,
  title = '로그인하고 저장하기',
  description = '내 레시피와 분석 결과를 안전하게 보관하세요!',
}: AuthModalProps) {
  const { signInWithGoogle, signInWithKakao, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error('Google login error:', error)
      setIsLoading(false)
    }
  }

  const handleKakaoLogin = async () => {
    try {
      setIsLoading(true)
      await signInWithKakao()
    } catch (error) {
      console.error('Kakao login error:', error)
      setIsLoading(false)
    }
  }

  const isButtonDisabled = loading || isLoading

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 백드롭 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* 헤더 */}
            <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-amber-50 to-white">
              <button
                onClick={onClose}
                disabled={isButtonDisabled}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/30">
                <Sparkles size={28} className="text-white" />
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
              <p className="text-sm text-slate-500">{description}</p>
            </div>

            {/* 로그인 버튼 */}
            <div className="p-6 pt-2 space-y-3">
              {/* Google 로그인 */}
              <button
                onClick={handleGoogleLogin}
                disabled={isButtonDisabled}
                className="w-full h-12 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isLoading ? '로그인 중...' : 'Google로 계속하기'}
              </button>

              {/* Kakao 로그인 */}
              <button
                onClick={handleKakaoLogin}
                disabled={isButtonDisabled}
                className="w-full h-12 bg-[#FEE500] text-[#391B1B] rounded-2xl font-semibold hover:bg-[#FADA0A] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#391B1B"
                    d="M12 3C6.477 3 2 6.463 2 10.691c0 2.648 1.758 4.974 4.394 6.318-.14.51-.52 1.907-.595 2.2-.094.365.134.36.282.262.117-.077 1.848-1.26 2.594-1.773.432.063.878.096 1.325.096 5.523 0 10-3.463 10-7.103C20 6.463 15.523 3 12 3z"
                  />
                </svg>
                {isLoading ? '로그인 중...' : '카카오로 계속하기'}
              </button>

              {/* 안내 문구 */}
              <p className="text-[11px] text-slate-400 text-center pt-2">
                로그인하면 이전에 만든 레시피도 자동으로 연결됩니다
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
