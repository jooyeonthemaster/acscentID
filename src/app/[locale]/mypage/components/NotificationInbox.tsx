'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { X, Bell, Truck, RotateCcw, Package, Trash2 } from 'lucide-react'
import { formatRelativeTime, type UserNotification, type NotificationType } from '@/lib/user/notifications'

function TypeIcon({ type }: { type: NotificationType }) {
  const cls = 'w-5 h-5'
  switch (type) {
    case 'shipping':
      return <Truck className={`${cls} text-blue-600`} />
    case 'refund':
      return <RotateCcw className={`${cls} text-rose-600`} />
    case 'order':
      return <Package className={`${cls} text-amber-600`} />
    default:
      return <Bell className={`${cls} text-slate-500`} />
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
        className="bg-white border-2 border-black rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-[6px_6px_0_0_black] overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-slate-900" />
            <h3 className="text-lg font-bold text-slate-900">{t('notificationsTitle')}</h3>
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <button
                onClick={onClear}
                title={t('notificationsClear')}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                {t('notificationsClear')}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">{t('notificationsEmpty')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    disabled={!n.link}
                    className={`w-full text-left px-5 py-4 flex gap-3 transition-colors ${
                      n.link ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                    } ${n.read ? '' : 'bg-yellow-50/60'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <TypeIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-line">{n.body}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{formatRelativeTime(n.created_at, locale)}</p>
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
