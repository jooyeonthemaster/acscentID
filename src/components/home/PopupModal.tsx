'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import { setMobileOverlayOpen } from '@/lib/mobile-overlay'

interface PopupData {
  id: string
  title: string
  description: string | null
  image_url: string | null
  link_url: string | null
  link_text: string | null
  is_active: boolean
  start_date: string
  end_date: string | null
  display_order: number
  image_aspect_ratio: string
}

export function PopupModal() {
  const router = useRouter()
  const [popups, setPopups] = useState<PopupData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    fetchActivePopups()
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return

    if (isVisible) {
      document.body.dataset.acscentPopupOpen = 'true'
    } else {
      delete document.body.dataset.acscentPopupOpen
    }

    window.dispatchEvent(new Event('acscent-popup-visibility-change'))
    setMobileOverlayOpen('home-popup', isVisible)

    return () => {
      delete document.body.dataset.acscentPopupOpen
      window.dispatchEvent(new Event('acscent-popup-visibility-change'))
      setMobileOverlayOpen('home-popup', false)
    }
  }, [isVisible])

  const fetchActivePopups = async () => {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('admin_popups')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .order('display_order', { ascending: true })

    if (error || !data || data.length === 0) return

    // end_date가 null이거나 아직 지나지 않은 팝업만 필터
    const activePopups = data.filter(
      (p: PopupData) => !p.end_date || new Date(p.end_date) > new Date()
    )

    if (activePopups.length === 0) return

    // 쿠키 체크: 오늘 하루 보지 않기
    const hiddenPopups = getHiddenPopupIds()
    const visiblePopups = activePopups.filter(
      (p: PopupData) => !hiddenPopups.includes(p.id)
    )

    if (visiblePopups.length === 0) return

    setPopups(visiblePopups)
    setCurrentIndex(0)
    setIsVisible(true)
  }

  const getHiddenPopupIds = (): string[] => {
    try {
      const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('hidden_popups='))
      if (!cookie) return []
      return JSON.parse(decodeURIComponent(cookie.split('=')[1]))
    } catch {
      return []
    }
  }

  const hideForToday = () => {
    const current = popups[currentIndex]
    if (!current) return

    const hiddenIds = getHiddenPopupIds()
    hiddenIds.push(current.id)

    // 오늘 자정까지 쿠키 설정
    const midnight = new Date()
    midnight.setHours(23, 59, 59, 999)

    document.cookie = `hidden_popups=${encodeURIComponent(
      JSON.stringify(hiddenIds)
    )}; expires=${midnight.toUTCString()}; path=/`

    goToNextOrClose()
  }

  const goToNextOrClose = () => {
    if (currentIndex < popups.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setIsVisible(false)
    }
  }

  const handleClose = () => {
    goToNextOrClose()
  }

  const handleLinkClick = () => {
    const current = popups[currentIndex]
    if (current?.link_url) {
      if (current.link_url.startsWith('/')) {
        router.push(current.link_url)
      } else {
        window.location.href = current.link_url
      }
    }
    setIsVisible(false)
  }

  if (!isVisible || popups.length === 0) return null

  const current = popups[currentIndex]
  const isExternalImage = current.image_url?.startsWith('http')

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
          />

          {/* Popup Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[360px] bg-[#12141D] rounded-[12px] border-2 border-[#262A38] overflow-hidden z-10"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 bg-[#12141D]/90 rounded-full flex items-center justify-center border border-[#262A38] hover:bg-[#1B1F2C] transition-colors"
            >
              <X size={16} className="text-[#A69F8D]" />
            </button>

            {/* Popup counter */}
            {popups.length > 1 && (
              <div className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/60 text-[#E9E2D0] text-[10px] lg:text-[12px] font-bold rounded-full">
                {currentIndex + 1} / {popups.length}
              </div>
            )}

            {/* Image */}
            {current.image_url && (
              <div
                className={`relative w-full ${
                  current.image_aspect_ratio === '16/9' ? 'aspect-[16/9]' :
                  current.image_aspect_ratio === '1/1' ? 'aspect-square' :
                  current.image_aspect_ratio === '3/4' ? 'aspect-[3/4]' :
                  current.image_aspect_ratio === 'free' ? 'aspect-auto' :
                  'aspect-[4/5]'
                } ${current.link_url ? 'cursor-pointer' : ''}`}
                onClick={current.link_url ? handleLinkClick : undefined}
              >
                {current.image_aspect_ratio === 'free' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.image_url}
                    alt={current.title}
                    className="w-full h-auto"
                  />
                ) : isExternalImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.image_url}
                    alt={current.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={current.image_url}
                    alt={current.title}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
            )}

            {/* Text content */}
            {(current.title || current.description) && (
              <div className="p-4">
                {current.title && !current.image_url && (
                  <h3 className="text-lg font-bold text-[#E9E2D0] mb-1">
                    {current.title}
                  </h3>
                )}
                {current.description && (
                  <p className="text-sm lg:text-base text-[#A69F8D] whitespace-pre-line">
                    {current.description}
                  </p>
                )}
                {current.link_url && current.link_text && (
                  <button
                    onClick={handleLinkClick}
                    className="mt-3 w-full bg-[#F5EFE2] text-[#12141D] font-bold text-sm lg:text-base py-2.5 rounded-[12px] border-2 border-[#262A38] hover:bg-[#FFFDF5] transition-colors"
                  >
                    {current.link_text}
                  </button>
                )}
              </div>
            )}

            {/* Bottom actions */}
            <div className="flex border-t border-[#262A38]">
              <button
                onClick={hideForToday}
                className="flex-1 py-3 text-xs lg:text-sm text-[#8B8578] hover:bg-[#151823] transition-colors font-medium"
              >
                오늘 하루 보지 않기
              </button>
              <div className="w-px bg-[#232838]" />
              <button
                onClick={handleClose}
                className="flex-1 py-3 text-xs lg:text-sm text-[#E9E2D0] hover:bg-[#151823] transition-colors font-bold"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
