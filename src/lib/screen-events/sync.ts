// ERP·노션에서 이벤트를 불러와 합친다. 기간은 ERP 를 기준으로, 포스터는 노션에서 가져온다.
// 이미 만든 배경·글꼴·적용 여부는 그대로 두고 이름·기간만 갱신한다. 직접 추가한 이벤트는 건드리지 않는다.

import sharp from 'sharp'
import { fetchErpEvents, fetchNotionEvents, notionImageUrl, notionPosterBlocks, type SourceEvent } from './sources'
import { readScreenEvents, uploadPublicImage, writeScreenEvent } from './store'
import { addDays, DEVICE_STORE, emptyEvent, kstToday, type ScreenEvent } from './types'

/** 이름 비교용 — 공백·기호를 빼고 소문자로 ("보이넥스트도어 이한&리우" ≈ "보넥도 이한&리우" 는 날짜로 맞춘다) */
const norm = (s: string) => s.toLowerCase().replace(/[\s·&/()[\]\-_.,'"]+/g, '')

function shortHash(s: string) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0).toString(36)
}

/** 같은 행사인가 — 같은 매장·같은 시작일이면서 이름 일부가 겹치거나, 이름이 같다 */
function sameEvent(a: SourceEvent, b: SourceEvent) {
  if (a.store !== b.store && a.store !== 'all' && b.store !== 'all') return false
  const na = norm(a.title), nb = norm(b.title)
  if (na === nb) return Math.abs(Date.parse(a.starts_on) - Date.parse(b.starts_on)) <= 3 * 86400_000
  if (a.starts_on !== b.starts_on) return false
  const tail = (s: string) => s.slice(-2)
  return na.includes(nb) || nb.includes(na) || tail(na) === tail(nb)
}

export interface SyncResult { added: number; updated: number; posters: number; erp: number; notion: number; errors: string[] }

export async function syncScreenEvents(): Promise<SyncResult> {
  const today = kstToday()
  const from = addDays(today, -1), to = addDays(today, 75)
  const errors: string[] = []
  const [erp, notion] = await Promise.all([
    fetchErpEvents(from, to).catch(e => { errors.push(String(e.message ?? e)); return [] as SourceEvent[] }),
    fetchNotionEvents(from, to, today).catch(e => { errors.push(String(e.message ?? e)); return [] as SourceEvent[] }),
  ])
  // 기기가 있는 매장 행사만 — 다른 매장 행사까지 배경을 만들 이유가 없다
  const mine = (e: SourceEvent) => e.store === DEVICE_STORE || e.store === 'all'
  const merged: SourceEvent[] = erp.filter(mine).map(e => ({ ...e }))
  for (const n of notion.filter(mine)) {
    const match = merged.find(e => !e.notion_block_id && sameEvent(e, n))
    if (match) match.notion_block_id = n.notion_block_id
    else merged.push(n)
  }

  const existing = await readScreenEvents()
  const result: SyncResult = { added: 0, updated: 0, posters: 0, erp: erp.length, notion: notion.length, errors }
  for (const source of merged) {
    const id = source.erp_id ? `erp-${source.erp_id.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)}` : `nt-${shortHash(source.notion_block_id!)}`
    const prev = existing.find(e => e.id === id || (source.notion_block_id && e.notion_block_id === source.notion_block_id))
    let event: ScreenEvent = prev
      ? { ...prev, title: source.title, starts_on: source.starts_on, ends_on: source.ends_on, store: source.store, erp_id: source.erp_id ?? prev.erp_id, notion_block_id: source.notion_block_id ?? prev.notion_block_id }
      : emptyEvent({ id, source: source.erp_id ? 'erp' : 'notion', store: source.store, title: source.title, starts_on: source.starts_on, ends_on: source.ends_on })
    if (!prev) event.erp_id = source.erp_id ?? null
    if (!prev) event.notion_block_id = source.notion_block_id ?? null
    if (prev?.source === 'manual') continue

    // 포스터 — 아직 없을 때만 노션에서 한 번 받아 둔다
    if (!event.posters.length && event.notion_block_id) {
      try {
        const blocks = await notionPosterBlocks(event.notion_block_id)
        const posters: string[] = []
        for (const [index, blockId] of blocks.entries()) {
          const url = await notionImageUrl(blockId)
          if (!url) continue
          const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
          if (!res.ok) continue
          const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer()
          posters.push(await uploadPublicImage(`screen-events/${event.id}/poster-${index + 1}-${Date.now().toString(36)}.jpg`, jpeg, 'image/jpeg'))
        }
        if (posters.length) { event = { ...event, posters, poster: posters[0] }; result.posters++ }
      } catch (e) { errors.push(`${event.title} 포스터: ${e instanceof Error ? e.message : e}`) }
    }

    const changed = !prev || JSON.stringify({ ...prev, updated_at: '' }) !== JSON.stringify({ ...event, updated_at: '' })
    if (!changed) continue
    await writeScreenEvent(event)
    if (prev) result.updated++
    else result.added++
  }
  return result
}
