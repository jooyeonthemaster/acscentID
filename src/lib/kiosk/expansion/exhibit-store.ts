import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { ExhibitError, EXHIBIT_TTL_MS, isViewerLive, nextExhibitContent, validRoomId, validExhibitToken, type ExhibitCommand, type ExhibitContent, type ExhibitKind, type ExhibitState } from './exhibit'

interface Room {
  id: string; kind: ExhibitKind; controller_hash: string; viewer_hash: string; expires_at: number;
  revision: number; sequence: number; acknowledged_sequence: number; acknowledged_at: number | null;
  viewer_seen_at: number | null; content: ExhibitContent | null; last_request_id: string | null;
}
const TABLE = 'kiosk_exhibit_rooms'
const LOCAL = path.join(process.cwd(), '.data', 'kiosk-exhibit')
const digest = (token: string) => createHash('sha256').update(token).digest('hex')
function equal(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y) }
function authorize(room: Room, token: string): 'controller' | 'viewer' {
  if (!validExhibitToken(token)) throw new ExhibitError('전시 연결 권한이 없습니다.', 401)
  const hash = digest(token)
  if (equal(hash, room.controller_hash)) return 'controller'
  if (equal(hash, room.viewer_hash)) return 'viewer'
  throw new ExhibitError('전시 연결 권한이 없습니다.', 401)
}
function current(room: Room | null, now = Date.now()): Room {
  if (!room) throw new ExhibitError('전시 연결을 찾을 수 없습니다.', 404)
  if (room.expires_at <= now) throw new ExhibitError('전시 연결이 만료되었습니다. 새 연결을 만들어 주세요.', 410)
  return room
}
const publicState = (r: Room): ExhibitState => ({ id: r.id, kind: r.kind, expiresAt: r.expires_at, sequence: r.sequence, acknowledgedSequence: r.acknowledged_sequence, acknowledgedAt: r.acknowledged_at, connected: isViewerLive(r.viewer_seen_at), content: r.content })
const local = () => process.env.NODE_ENV !== 'production'
function client() { try { return createServiceRoleClient() } catch { throw new ExhibitError('전시 저장소가 준비되지 않았습니다.', 503) } }
async function load(id: string): Promise<Room | null> {
  if (!validRoomId(id)) throw new ExhibitError('전시 연결을 찾을 수 없습니다.', 404)
  if (local()) {
    try { return JSON.parse(await readFile(path.join(LOCAL, `${id}.json`), 'utf8')) as Room } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw new ExhibitError('전시 저장소를 읽지 못했습니다.', 503)
    }
  }
  const { data, error } = await client().from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw new ExhibitError('전시 저장소가 준비되지 않았습니다.', 503)
  return data as Room | null
}
async function localWrite(room: Room) {
  await mkdir(LOCAL, { recursive: true })
  const file = path.join(LOCAL, `${room.id}.json`), temp = `${file}.${randomBytes(6).toString('hex')}.tmp`
  await writeFile(temp, JSON.stringify(room), { mode: 0o600 })
  await rename(temp, file)
}
const locks = new Map<string, Promise<unknown>>()
async function lock<T>(id: string, run: () => Promise<T>): Promise<T> {
  const previous = locks.get(id) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(run)
  locks.set(id, next)
  try { return await next } finally { if (locks.get(id) === next) locks.delete(id) }
}
async function mutate(id: string, token: string, role: 'controller' | 'viewer', change: (room: Room) => Room): Promise<ExhibitState> {
  return lock(id, async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const room = current(await load(id))
      if (authorize(room, token) !== role) throw new ExhibitError('이 연결로는 해당 작업을 할 수 없습니다.', 403)
      const next = { ...change(room), revision: room.revision + 1 }
      if (local()) { await localWrite(next); return publicState(next) }
      const { data, error } = await client().from(TABLE).update(next).eq('id', id).eq('revision', room.revision).select('id').maybeSingle()
      if (error) throw new ExhibitError('전시 내용을 저장하지 못했습니다.', 503)
      if (data) return publicState(next)
    }
    throw new ExhibitError('전시가 갱신 중입니다. 다시 시도해 주세요.', 409)
  })
}
export async function createExhibitRoom(kind: ExhibitKind) {
  const id = randomBytes(16).toString('hex'), controllerToken = randomBytes(32).toString('hex'), viewerToken = randomBytes(32).toString('hex')
  const room: Room = { id, kind, controller_hash: digest(controllerToken), viewer_hash: digest(viewerToken), expires_at: Date.now() + EXHIBIT_TTL_MS, revision: 0, sequence: 0, acknowledged_sequence: 0, acknowledged_at: null, viewer_seen_at: null, content: null, last_request_id: null }
  if (local()) await localWrite(room)
  else {
    const { error } = await client().from(TABLE).insert(room)
    if (error) throw new ExhibitError('전시 저장소가 준비되지 않았습니다.', 503)
    // Best effort cleanup; expiration checks also block all access to old rooms.
    await client().from(TABLE).delete().lt('expires_at', Date.now()).then(() => undefined, () => undefined)
  }
  return { id, kind, controllerToken, viewerToken, expiresAt: room.expires_at }
}
export async function readExhibitRoom(id: string, token: string) { const room = current(await load(id)); authorize(room, token); return publicState(room) }
export async function heartbeatExhibit(id: string, token: string) { return mutate(id, token, 'viewer', r => ({ ...r, viewer_seen_at: Date.now() })) }
export async function acknowledgeExhibit(id: string, token: string, sequence: number) {
  return mutate(id, token, 'viewer', r => {
    if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence !== r.sequence || !r.content) throw new ExhibitError('현재 화면과 전시 내용이 다릅니다.', 409)
    return { ...r, viewer_seen_at: Date.now(), acknowledged_sequence: sequence, acknowledged_at: Date.now() }
  })
}
export async function publishExhibit(id: string, token: string, command: ExhibitCommand, requestId: string) {
  return mutate(id, token, 'controller', r => {
    if (command.kind !== r.kind) throw new ExhibitError('전시 종류가 다릅니다.')
    if (r.last_request_id === requestId) return r
    if (!isViewerLive(r.viewer_seen_at)) throw new ExhibitError('전시 화면이 연결되어 있지 않습니다. 화면을 열고 다시 시도해 주세요.', 409)
    return { ...r, sequence: r.sequence + 1, content: nextExhibitContent(r.content, command, requestId, Date.now()), last_request_id: requestId }
  })
}
export async function closeExhibit(id: string, token: string) { return mutate(id, token, 'controller', r => ({ ...r, expires_at: Date.now() })) }
