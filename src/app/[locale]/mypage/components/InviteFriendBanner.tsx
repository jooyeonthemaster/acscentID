'use client'

import { useState } from 'react'
import { Gift, Copy, Check, Share2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useTranslations } from 'next-intl'

export function InviteFriendBanner() {
  const t = useTranslations('mypage.invite')
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  const handleCopyLink = async () => {
    const inviteLink = `${window.location.origin}?ref=invite`

    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      showToast(t('linkCopied'), 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast(t('linkCopyFailed'), 'error')
    }
  }

  const handleShare = async () => {
    const inviteLink = `${window.location.origin}?ref=invite`

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('shareTitle'),
          text: t('shareText'),
          url: inviteLink,
        })
      } catch {
        // 사용자가 공유 취소
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="bg-gradient-to-r from-[#151823] to-[#151823] border-2 border-[#262A38] rounded-[12px] p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#12141D] rounded-[12px] border-2 border-[#262A38] flex items-center justify-center">
          <Gift size={24} className="text-[#A69F8D]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm lg:text-base">{t('title')}</p>
          <p className="text-xs lg:text-sm text-[#A69F8D] truncate">{t('desc')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="p-2.5 bg-[#12141D] rounded-[12px] border-2 border-[#262A38] transition-all"
          >
            {copied ? <Check size={18} className="text-[#A69F8D]" /> : <Copy size={18} />}
          </button>
          <button
            onClick={handleShare}
            className="p-2.5 bg-[#F5EFE2] text-[#12141D] rounded-[12px] border-2 border-[#F5EFE2] transition-all"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
