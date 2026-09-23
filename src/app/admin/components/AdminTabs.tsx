'use client'

// 관리자 페이지 탭 — 한 화면에 다 쌓지 않고 관련 있는 것끼리 묶어 전환한다.
// 고른 탭은 주소 #해시에 남겨 새로고침·뒤로가기·링크 공유에도 그 탭이 열린다.

import { useCallback, useSyncExternalStore } from 'react'

export interface AdminTab<T extends string> {
  id: T
  label: string
  hint?: string
  count?: number
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useHashTab<T extends string>(ids: readonly T[], fallback: T): T {
  const read = useCallback(() => {
    const hash = window.location.hash.slice(1) as T
    return ids.includes(hash) ? hash : fallback
  }, [ids, fallback])
  return useSyncExternalStore(subscribe, read, () => fallback)
}

export function AdminTabs<T extends string>({ tabs, current, label }: { tabs: AdminTab<T>[]; current: T; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
      {tabs.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={current === item.id ? 'page' : undefined}
          title={item.hint}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
            current === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          {item.label}
          {item.count !== undefined && (
            <span className={`rounded-full px-1.5 text-xs tabular-nums ${current === item.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
              {item.count.toLocaleString()}
            </span>
          )}
        </a>
      ))}
    </nav>
  )
}
