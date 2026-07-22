'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { X, Bell, Truck, RotateCcw, Package, Trash2 } from 'lucide-react'
import { formatRelativeTime, type UserNotification, type NotificationType } from '@/lib/user/notifications'

function TypeIcon({ type }: { type: NotificationType }) {
  const cls = 'w-5 h-5'
  switch (type) {
    case 'shipping':
      return <Truck className={`${cls} text-[var(--muted-ink)]`} />
    case 'refund':
      return <RotateCcw className={`${cls} text-[var(--muted-ink)]`} />
    case 'order':
      return <Package className={`${cls} text-[var(--muted-ink)]`} />
    default:
      return <Bell className={`${cls} text-[var(--muted-ink)]`} />
  }
}

export function NotificationInbox({
  notifications,
  onClose,
  onClear,
}: {
  notifications: UserNotification[]
  onClose: () => void
  onClear: () => void
}) {
  const t = useTranslations('mypage')
  const locale = useLocale()
  const router = useRouter()

  const handleClick = (n: UserNotification) => {
    if (n.link) {
      onClose()
      router.push(n.link)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-[var(--paper)] border border-[var(--line)] rounded-t-[6px] sm:rounded-[6px] w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[var(--line)] shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--ink)]" />
            <h3 className="text-lg font-bold text-[var(--ink)]">{t('notificationsTitle')}</h3>
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <button
                onClick={onClear}
                title={t('notificationsClear')}
                className="flex items-center gap-1 px-2 py-1.5 text-xs lg:text-sm font-bold text-[var(--muted-ink)] hover:text-red-600 hover:bg-red-50 rounded-[6px] transition-colors"
              >
                <Trash2 size={14} />
                {t('notificationsClear')}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--soft)] rounded-[6px] transition-colors">
              <X size={18} className="text-[var(--muted-ink)]" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell size={40} className="text-[var(--muted-ink)] mx-auto mb-3" />
              <p className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">{t('notificationsEmpty')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    disabled={!n.link}
                    className={`w-full text-left px-5 py-4 flex gap-3 transition-colors ${
                      n.link ? 'hover:bg-[var(--soft)] cursor-pointer' : 'cursor-default'
                    } ${n.read ? '' : 'bg-[var(--canvas)]/60'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <TypeIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm lg:text-base font-bold text-[var(--ink)] truncate">{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                      </div>
                      <p className="text-sm lg:text-base text-[var(--muted-ink)] mt-0.5 whitespace-pre-line">{n.body}</p>
                      <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] mt-1">{formatRelativeTime(n.created_at, locale)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
