'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, X, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { NotificationInbox } from './NotificationInbox'
import type { UserNotification } from '@/lib/user/notifications'

// 기본 아바타 (DiceBear) — ProfileHeader와 동일 규칙
function getDefaultAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`
}

export function ProfileCard() {
  const t = useTranslations('mypage')
  const { user, unifiedUser, refreshUser } = useAuth()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 알림함
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [inboxOpen, setInboxOpen] = useState(false)

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/user/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // 무시
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const openInbox = async () => {
    setInboxOpen(true)
    // 열면 전체 읽음 처리
    if (unreadCount > 0) {
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      try {
        await fetch('/api/user/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      } catch {
        // 무시
      }
    }
  }

  const clearNotifications = async () => {
    if (!confirm(t('notificationsClearConfirm'))) return
    setNotifications([])
    setUnreadCount(0)
    try {
      await fetch('/api/user/notifications', { method: 'DELETE' })
    } catch {
      // 무시
    }
  }

  if (!user && !unifiedUser) return null

  const currentName =
    unifiedUser?.name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    t('profile.defaultUser')

  const email = unifiedUser?.email || user?.email || ''
  const provider = unifiedUser?.provider || user?.app_metadata?.provider || 'email'
  const providerLabel = provider === 'google' ? 'Google' : provider === 'kakao' ? 'Kakao' : t('profile.emailLogin')

  const avatarSeed = unifiedUser?.id || user?.id || email || 'default'
  const avatar =
    unifiedUser?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    getDefaultAvatar(avatarSeed)

  const openEdit = () => {
    setName(currentName === t('profile.defaultUser') ? '' : currentName)
    setError('')
    setEditing(true)
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('profileNameRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || t('profileSaveFailed'))
        return
      }

      // Google 등 Supabase 세션은 클라이언트에서 메타데이터를 갱신해 즉시 반영
      if (provider !== 'kakao' && user) {
        await supabase.auth.updateUser({ data: { name: trimmed } })
      }
      await refreshUser()
      setEditing(false)
    } catch {
      setError(t('profileSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="bg-white border-2 border-black rounded-2xl p-4 mb-4 shadow-[4px_4px_0_0_black]">
        <div className="flex items-center gap-3">
          {/* 프로필 사진 (클릭 시 알림함) + 안 읽은 알림 빨간 뱃지 */}
          <button
            onClick={openInbox}
            title={t('notificationsTitle')}
            className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt={t('profile.profileAlt')}
              className="w-14 h-14 rounded-full object-cover border-2 border-black bg-amber-100"
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 border-2 border-white text-white text-[11px] font-black leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{currentName}</h2>
            {email && <p className="text-xs text-slate-500 truncate">{email}</p>}
            <span className="inline-flex mt-1 text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              {providerLabel} {t('profile.loginSuffix')}
            </span>
          </div>
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 border-2 border-black text-black text-xs font-bold transition-colors shrink-0"
          >
            <Pencil size={14} />
            {t('editButton')}
          </button>
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !saving && setEditing(false)}
        >
          <div
            className="bg-white border-2 border-black rounded-2xl w-full max-w-sm shadow-[6px_6px_0_0_black] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
              <h3 className="text-lg font-bold text-slate-900">{t('profileEditTitle')}</h3>
              <button
                onClick={() => !saving && setEditing(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('profileNameLabel')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (error) setError('')
                  }}
                  maxLength={30}
                  placeholder={t('profileNamePlaceholder')}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 focus:border-black text-sm transition-colors outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('profileEmailLabel')}</label>
                <input
                  type="text"
                  value={email || '-'}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">{t('profileEmailReadonly')}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t-2 border-black bg-slate-50">
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {t('profileCancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-yellow-400 hover:bg-yellow-500 border-2 border-black text-black transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t('profileSave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {inboxOpen && (
        <NotificationInbox
          notifications={notifications}
          onClose={() => setInboxOpen(false)}
          onClear={clearNotifications}
        />
      )}
    </>
  )
}
