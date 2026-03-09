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
    <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0_0_black]">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-white rounded-xl border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_black]">
          <Gift size={24} className="text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm">{t('title')}</p>
          <p className="text-xs text-slate-600 truncate">{t('desc')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="p-2.5 bg-white rounded-xl border-2 border-black shadow-[2px_2px_0_0_black] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
          </button>
          <button
            onClick={handleShare}
            className="p-2.5 bg-black text-white rounded-xl border-2 border-black shadow-[2px_2px_0_0_#a855f7] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
