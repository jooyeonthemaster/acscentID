'use client'

// 화면 관리 — '이벤트 배경'과 '배경 라이브러리'를 한 페이지에 쌓지 않고 탭으로 나눈다.
// 화면 배경 관리 페이지·키오스크 관리·포토부스 관리의 화면 탭이 같이 쓴다. 고른 탭은 이 브라우저에 기억한다.

import { useSyncExternalStore } from 'react'
import { CalendarClock, Images } from 'lucide-react'
import type { ScreenTarget } from '@/lib/screen-backgrounds/types'
import { ScreenBackgroundManager } from './ScreenBackgroundManager'
import { ScreenEventManager } from './ScreenEventManager'

type View = 'events' | 'library'
const KEY = 'acscent-admin-screen-view'
const EVENT = 'acscent-admin-screen-view-change'

function read(): View {
  try { return localStorage.getItem(KEY) === 'library' ? 'library' : 'events' } catch { return 'events' }
}
function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener('storage', onChange) }
}
function choose(view: View) {
  try { localStorage.setItem(KEY, view) } catch { /* 기억 못 해도 전환은 된다 */ }
  window.dispatchEvent(new Event(EVENT))
}

const VIEWS: { id: View; label: string; hint: string; Icon: typeof Images }[] = [
  { id: 'events', label: '이벤트 배경', hint: '이벤트 기간에만 자동 적용되는 배경·글꼴', Icon: CalendarClock },
  { id: 'library', label: '배경 라이브러리', hint: '평소 배경 목록·화면 디자인·글꼴', Icon: Images },
]

export function ScreenManagerTabs({ initialTarget }: { initialTarget?: ScreenTarget }) {
  const view = useSyncExternalStore(subscribe, read, () => 'events' as View)
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="화면 관리" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:inline-grid sm:w-auto">
        {VIEWS.map(({ id, label, hint, Icon }) => (
          <button key={id} type="button" role="tab" id={`screen-tab-${id}`} aria-selected={view === id} aria-controls={`screen-panel-${id}`} title={hint}
            onClick={() => choose(id)}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-colors ${
              view === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`screen-panel-${view}`} aria-labelledby={`screen-tab-${view}`}>
        {view === 'events' ? <ScreenEventManager /> : <ScreenBackgroundManager initialTarget={initialTarget} />}
      </div>
    </div>
  )
}
