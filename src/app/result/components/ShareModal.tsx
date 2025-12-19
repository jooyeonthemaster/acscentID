"use client"

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link2, Image, Download, Loader2, Check } from 'lucide-react'
import { domToPng } from 'modern-screenshot'
import { ImageAnalysisResult } from '@/types/analysis'
import { ShareCard } from './ShareCard'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  userImage?: string
  twitterName: string
  userName: string
  userGender: string
  perfumeName: string
  perfumeBrand: string
  analysisData: ImageAnalysisResult
  shareUrl?: string
}

export function ShareModal({
  isOpen,
  onClose,
  userImage,
  twitterName,
  userName,
  userGender,
  perfumeName,
  perfumeBrand,
  analysisData,
  shareUrl
}: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // iOS Safari 배경 스크롤 차단
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

  // 이미지/폰트 로드 대기
  const waitForAssets = useCallback(async (root?: HTMLElement | null) => {
    // 폰트 로드 대기
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => undefined)
    }

    // 이미지 로드 대기
    const images = Array.from(root?.querySelectorAll('img') || [])
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve()
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
      )
    )

    // 레이아웃 안정화
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    )
  }, [])

  // 이미지 생성
  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null

    try {
      await waitForAssets(cardRef.current)

      const dataUrl = await domToPng(cardRef.current, {
        width: 600,
        height: 800,
        scale: 2,
        backgroundColor: '#feffff'
      })

      // dataUrl → Blob 변환
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      return blob
    } catch (error) {
      console.error('Image generation error:', error)
      return null
    }
  }, [waitForAssets])

  // 1. 링크 공유
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
      // 사용자가 공유 취소한 경우 무시
      if ((error as Error).name !== 'AbortError') {
        console.error('Link share error:', error)
      }
    }
  }

  // 2. 이미지 공유 (인스타 스토리 등)
  const handleImageShare = async () => {
    setIsGenerating(true)

    try {
      const blob = await generateImage()
      if (!blob) throw new Error('이미지 생성 실패')

      const file = new File([blob], `acscent_${Date.now()}.png`, {
        type: 'image/png'
      })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `AC'SCENT IDENTITY`,
          text: twitterName
        })
      } else {
        // 파일 공유 미지원 → 다운로드로 대체
        await handleDownload()
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Image share error:', error)
        alert('이미지 공유 중 오류가 발생했습니다.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // 3. 이미지 다운로드
  const handleDownload = async () => {
    setIsGenerating(true)

    try {
      const blob = await generateImage()
      if (!blob) throw new Error('이미지 생성 실패')

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `acscent_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      alert('다운로드 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* 모달 */}
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
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">공유하기</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* 공유 카드 프리뷰 (숨김 처리) */}
            <div className="absolute -left-[9999px] -top-[9999px]">
              <ShareCard
                ref={cardRef}
                userImage={userImage}
                twitterName={twitterName}
                userName={userName}
                userGender={userGender}
                perfumeName={perfumeName}
                perfumeBrand={perfumeBrand}
                analysisData={analysisData}
              />
            </div>

            {/* 공유 옵션들 */}
            <div className="p-5 space-y-3">
              {/* 링크 공유 */}
              <button
                onClick={handleLinkShare}
                disabled={isGenerating}
                className="
                  w-full flex items-center gap-4 p-4
                  bg-gradient-to-r from-slate-50 to-slate-100
                  hover:from-slate-100 hover:to-slate-200
                  rounded-2xl transition-all
                  disabled:opacity-50
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
                    {copied ? '복사 완료!' : '링크 공유'}
                  </p>
                  <p className="text-xs text-slate-500">
                    카카오톡, 메신저로 공유하기
                  </p>
                </div>
              </button>

              {/* 이미지 공유 */}
              <button
                onClick={handleImageShare}
                disabled={isGenerating}
                className="
                  w-full flex items-center gap-4 p-4
                  bg-gradient-to-r from-pink-50 to-orange-50
                  hover:from-pink-100 hover:to-orange-100
                  rounded-2xl transition-all
                  disabled:opacity-50
                "
              >
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center">
                  {isGenerating ? (
                    <Loader2 size={22} className="text-white animate-spin" />
                  ) : (
                    <Image size={22} className="text-white" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900">이미지로 공유</p>
                  <p className="text-xs text-slate-500">
                    인스타 스토리, SNS에 올리기
                  </p>
                </div>
              </button>

              {/* 이미지 다운로드 */}
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="
                  w-full flex items-center gap-4 p-4
                  bg-gradient-to-r from-yellow-50 to-amber-50
                  hover:from-yellow-100 hover:to-amber-100
                  rounded-2xl transition-all
                  disabled:opacity-50
                "
              >
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center">
                  {isGenerating ? (
                    <Loader2 size={22} className="text-white animate-spin" />
                  ) : (
                    <Download size={22} className="text-white" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900">이미지 저장</p>
                  <p className="text-xs text-slate-500">
                    갤러리에 저장하기
                  </p>
                </div>
              </button>
            </div>

            {/* 안내 문구 */}
            <div className="px-5 pb-5">
              <p className="text-center text-xs text-slate-400">
                친구에게 내 향수 결과를 공유해보세요! ✨
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
