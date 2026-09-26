'use client'

// 프레임·템플릿·포토카드를 화면 이벤트(ERP·노션 행사 — 이벤트 배경과 같은 목록)에 묶는 선택·거르기 부품.
// 목록 API(/api/admin/photobooth, /api/admin/photobooth/cards)가 screen_events 로 선택지를 같이 내려준다.

export interface ScreenEventOption {
  id: string
  title: string
  starts_on: string
  ends_on: string
  /** 지금 매장 기기에 적용 중(기간 안 또는 지금 바로 적용) */
  live: boolean
  past: boolean
}

/** 'all' 전체 · 'none' 상시 · 'orphan' 지워진 행사 · 그 밖엔 행사 id */
export type ScreenEventFilterValue = string

const md = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`
export const screenEventDate = (o: Pick<ScreenEventOption, 'starts_on' | 'ends_on'>) =>
  o.starts_on === o.ends_on ? md(o.starts_on) : `${md(o.starts_on)}~${md(o.ends_on)}`
export const screenEventLabel = (o: ScreenEventOption) =>
  `${screenEventDate(o)} ${o.title}${o.live ? ' · 진행 중' : o.past ? ' · 지난 행사' : ''}`

type Linked = { screen_event_id?: string | null }

export function matchesScreenEvent(item: Linked, filter: ScreenEventFilterValue, options: ScreenEventOption[]) {
  const id = item.screen_event_id ?? null
  if (filter === 'all') return true
  if (filter === 'none') return !id
  if (filter === 'orphan') return !!id && !options.some((o) => o.id === id)
  return id === filter
}

/** 소재 카드의 행사 이름표 — 진행 중이면 분홍, 아니면 회색. 없으면 null(상시) */
export function linkedEvent(item: Linked, options: ScreenEventOption[]): { title: string; live: boolean } | null {
  const id = item.screen_event_id
  if (!id) return null
  const option = options.find((o) => o.id === id)
  return option ? { title: option.title, live: option.live } : { title: '지워진 행사', live: false }
}

const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-none disabled:opacity-50'

export function ScreenEventSelect({ value, options, onChange, disabled, className }: {
  value: string | null | undefined
  options: ScreenEventOption[]
  onChange: (id: string | null) => void
  disabled?: boolean
  className?: string
}) {
  const known = !value || options.some((o) => o.id === value)
  return (
    <select
      aria-label="행사"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
      className={className ?? selectClass}
    >
      <option value="">상시 (행사 없음)</option>
      {!known && <option value={value!}>지워진 행사</option>}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {screenEventLabel(o)}
        </option>
      ))}
    </select>
  )
}

export function ScreenEventFilter({ value, options, items, onChange }: {
  value: ScreenEventFilterValue
  options: ScreenEventOption[]
  items: Linked[]
  onChange: (value: ScreenEventFilterValue) => void
}) {
  const count = (id: string | null) => items.filter((i) => (i.screen_event_id ?? null) === id).length
  const orphans = items.filter((i) => i.screen_event_id && !options.some((o) => o.id === i.screen_event_id)).length
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="shrink-0">행사</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
      >
        <option value="all">전체 ({items.length})</option>
        <option value="none">상시 ({count(null)})</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {screenEventLabel(o)} ({count(o.id)})
          </option>
        ))}
        {orphans > 0 && <option value="orphan">지워진 행사 ({orphans})</option>}
      </select>
    </label>
  )
}
