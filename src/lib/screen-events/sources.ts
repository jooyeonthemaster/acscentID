// 이벤트 정보 출처 두 곳.
// - ACSCENT ERP: Firestore `events` 컬렉션 {store: 'id'|'wow'|'all', title, startDate, endDate} — 기간의 기준.
//   ERP 의 보안 규칙상 공개 읽기라 웹 설정값(프로젝트 ID·API 키)만으로 REST 로 읽는다.
// - 노션 '이벤트 굿즈 관리' 아래 'N월 이벤트' 페이지: 토글 제목 "[와우] 세븐틴 정한 (10.3~10.4) /",
//   토글 안 첫 두 칸(column_list)에 포스터 이미지. 연동(integration) 키로 읽으면 이미지는 1시간짜리 서명 주소다.

import type { EventStore } from './types'
import { addDays } from './types'

export interface SourceEvent {
  store: EventStore
  title: string
  starts_on: string
  ends_on: string
  erp_id?: string
  notion_block_id?: string
  /** 노션 이미지 블록 — 주소는 곧 만료되므로 필요할 때 받는다 */
  notion_image_blocks?: string[]
}

// ---------- ERP ----------
export function erpConfigured() {
  return !!(process.env.ERP_FIREBASE_PROJECT_ID && process.env.ERP_FIREBASE_API_KEY)
}

type FirestoreValue = { stringValue?: string }
export async function fetchErpEvents(from: string, to: string): Promise<SourceEvent[]> {
  if (!erpConfigured()) return []
  const base = `https://firestore.googleapis.com/v1/projects/${process.env.ERP_FIREBASE_PROJECT_ID}/databases/(default)/documents/events`
  const out: SourceEvent[] = []
  let pageToken = ''
  do {
    const url = `${base}?pageSize=300&key=${process.env.ERP_FIREBASE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`ERP 이벤트를 읽지 못했습니다 (${res.status})`)
    const data = await res.json() as { documents?: { name: string; fields: Record<string, FirestoreValue> }[]; nextPageToken?: string }
    for (const doc of data.documents ?? []) {
      const f = (key: string) => doc.fields[key]?.stringValue ?? ''
      const store = f('store') as EventStore
      if (!['wow', 'id', 'all'].includes(store) || !f('title').trim()) continue
      const starts_on = f('startDate'), ends_on = f('endDate') || f('startDate')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(starts_on) || !/^\d{4}-\d{2}-\d{2}$/.test(ends_on)) continue
      if (ends_on < from || starts_on > to) continue
      out.push({ store, title: f('title').trim(), starts_on, ends_on, erp_id: doc.name.split('/').pop() })
    }
    pageToken = data.nextPageToken ?? ''
  } while (pageToken)
  return out
}

// ---------- 노션 ----------
const NOTION_ROOT = () => process.env.NOTION_EVENT_GOODS_PAGE_ID || 'bde67f18-ac10-4490-9619-871ad09be049'
export function notionConfigured() { return !!process.env.NOTION_API_KEY }

type NotionBlock = {
  id: string; type: string; has_children: boolean
  child_page?: { title: string }
  toggle?: { rich_text: { plain_text: string }[] }
  image?: { type: 'file' | 'external'; file?: { url: string }; external?: { url: string } }
}
async function notion<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.notion.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2022-06-28' },
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    })
    if (res.status === 429 && attempt < 3) { await new Promise(ok => setTimeout(ok, 1200 * (attempt + 1))); continue }
    if (!res.ok) throw new Error(`노션을 읽지 못했습니다 (${res.status})`)
    return res.json() as Promise<T>
  }
}
async function children(id: string): Promise<NotionBlock[]> {
  const out: NotionBlock[] = []
  let cursor = ''
  do {
    const page = await notion<{ results: NotionBlock[]; has_more: boolean; next_cursor: string | null }>(`blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`)
    out.push(...page.results)
    cursor = page.has_more && page.next_cursor ? page.next_cursor : ''
  } while (cursor)
  return out
}

const STORE_TAGS: Record<string, EventStore> = { 와우: 'wow', 홍대: 'wow', 아이디: 'id', 신촌: 'id', 공통: 'all' }
/** "[와우] 세븐틴 정한 (10.3~10.4) /" · "(9.29)" · "(5.31-6.1)" */
export function parseNotionTitle(raw: string, today: string): Omit<SourceEvent, 'notion_block_id'> | null {
  const m = raw.match(/^\s*\[([^\]]+)\]\s*(.+?)\s*\(\s*(\d{1,2})\.(\d{1,2})\s*(?:[~\-–]\s*(?:(\d{1,2})\.)?(\d{1,2}))?\s*\)/)
  if (!m) return null
  const store = STORE_TAGS[m[1].trim()]
  if (!store) return null
  const sm = Number(m[3]), sd = Number(m[4])
  const em = m[5] ? Number(m[5]) : sm, ed = m[6] ? Number(m[6]) : sd
  // 월 페이지에 연도가 없다 — 오늘과 가장 가까운 연도로
  const year = Number(today.slice(0, 4))
  const pad = (n: number) => String(n).padStart(2, '0')
  const candidates = [year - 1, year, year + 1].map(y => `${y}-${pad(sm)}-${pad(sd)}`)
  const distance = (d: string) => Math.abs(Date.parse(d) - Date.parse(today))
  const starts_on = candidates.sort((a, b) => distance(a) - distance(b))[0]
  let endYear = Number(starts_on.slice(0, 4))
  if (em < sm) endYear += 1
  const ends_on = `${endYear}-${pad(em)}-${pad(ed)}`
  if (Number.isNaN(Date.parse(starts_on)) || Number.isNaN(Date.parse(ends_on)) || ends_on < starts_on) return null
  return { store, title: m[2].replace(/\s*\/\s*$/, '').trim(), starts_on, ends_on }
}

export async function fetchNotionEvents(from: string, to: string, today: string): Promise<SourceEvent[]> {
  if (!notionConfigured()) return []
  const months = new Set<number>()
  for (let d = from; d <= to; d = addDays(d, 20)) months.add(Number(d.slice(5, 7)))
  months.add(Number(to.slice(5, 7)))
  const pages = (await children(NOTION_ROOT())).filter(b => b.type === 'child_page' && months.has(Number(b.child_page!.title.match(/^\s*(\d{1,2})월 이벤트/)?.[1])))
  const out: SourceEvent[] = []
  for (const page of pages) {
    for (const block of await children(page.id)) {
      if (block.type !== 'toggle') continue
      const parsed = parseNotionTitle(block.toggle!.rich_text.map(t => t.plain_text).join(''), today)
      if (!parsed || parsed.ends_on < from || parsed.starts_on > to) continue
      out.push({ ...parsed, notion_block_id: block.id })
    }
  }
  return out
}

/** 이벤트 토글 안 칸(column_list)의 이미지 블록 id — 첫 칸이 포스터, 둘째가 보조 이미지인 경우가 많다 */
export async function notionPosterBlocks(toggleId: string): Promise<string[]> {
  const ids: string[] = []
  for (const block of await children(toggleId)) {
    if (block.type !== 'column_list') continue
    for (const column of await children(block.id)) for (const item of await children(column.id)) if (item.type === 'image') ids.push(item.id)
    if (ids.length) break
  }
  return ids.slice(0, 3)
}

/** 이미지 블록의 지금 유효한 주소(서명 주소는 1시간 뒤 만료) */
export async function notionImageUrl(blockId: string): Promise<string | null> {
  const block = await notion<NotionBlock>(`blocks/${blockId}`)
  return block.image?.file?.url ?? block.image?.external?.url ?? null
}
