"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Link2, X } from 'lucide-react'
import { ImageAnalysisResult } from '@/types/analysis'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  userImage?: string
  twitterName: string
  // 결과 페이지 전용 메타 (다른 곳에서 재사용 시 생략 가능 — 본문에서 사용하지 않음)
  userName?: string
  userGender?: string
  perfumeName: string
  perfumeBrand?: string
  analysisData?: ImageAnalysisResult
  shareUrl?: string
}

export function ShareModal({
  isOpen,
  onClose,
  twitterName,
  perfumeName,
  shareUrl
}: ShareModalProps) {
  const t = useTranslations('share')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    const body = document.body
    const html = document.documentElement

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'

    return () => {
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.overflow = ''
      html.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  const handleLinkShare = async () => {
    const fullUrl = shareUrl || window.location.href

    try {
      if (navigator.share) {
        await navigator.share({
          title: `AC'SCENT IDENTITY - ${perfumeName}`,
          text: twitterName,
          url: fullUrl
        })
      } else {
        await navigator.clipboard.writeText(fullUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Link share error:', error)
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="
              fixed inset-x-4 bottom-4 z-50
              max-w-[400px] mx-auto
              bg-white rounded-3xl shadow-2xl
              overflow-hidden
            "
            style={{
              WebkitOverflowScrolling: 'touch',
              maxHeight: 'calc(100dvh - 32px)'
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{t('title')}</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <button
                onClick={handleLinkShare}
                className="
                  w-full flex items-center gap-4 p-4
                  bg-gradient-to-r from-slate-50 to-slate-100
                  hover:from-slate-100 hover:to-slate-200
                  rounded-2xl transition-all
                "
              >
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                  {copied ? (
                    <Check size={22} className="text-white" />
                  ) : (
                    <Link2 size={22} className="text-white" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900">
                    {copied ? t('linkCopied') : t('linkShare')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t('linkShareDesc')}
                  </p>
                </div>
              </button>
            </div>

            <div className="px-5 pb-5">
              <p className="text-center text-xs text-slate-400">
                {t('shareHint')}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
