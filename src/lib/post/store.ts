// POST! 우체통 — 세션(기기 ↔ 손님 휴대폰)과 엽서 저장 (초안)
//
// 초안이라 서버 임시 폴더(os.tmpdir()/acscent-post)에 파일로 둔다. 개발 서버 한 대에서만 맞고,
// Vercel 처럼 요청마다 다른 서버가 받는 곳에서는 안 된다 — 운영 전에 Supabase 표 + 저장소로 바꾼다.
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = path.join(os.tmpdir(), 'acscent-post')

export interface PostCard {
  id: string
  createdAt: string
  season: 'base' | 'xmas'
  recipient: string
  toLine: string
  fromName: string
  letter: string[]
  /** 산타 답장일 때 — 아이가 보낸 편지 원문 */
  wish?: string
  /** 산타 답장일 때 — QR 로 보는 긴 편지 */
  longLetter?: string
  santa: boolean
  hasVoice: boolean
}

export interface PostSession {
  id: string
  createdAt: string
  joinedAt?: string
  cardId?: string
  events: { at: string; what: string }[]
}

const SAFE = /^[a-z0-9-]{8,40}$/
export const isId = (id: string) => SAFE.test(id)
export const newId = () => crypto.randomBytes(9).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12).padEnd(12, '0')

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T
  } catch {
    return null
  }
}
async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(value, null, 2))
}

const sessionFile = (id: string) => path.join(ROOT, 'sessions', `${id}.json`)
const cardDir = (id: string) => path.join(ROOT, 'cards', id)

export async function createSession(): Promise<PostSession> {
  const s: PostSession = { id: newId(), createdAt: new Date().toISOString(), events: [] }
  await writeJson(sessionFile(s.id), s)
  return s
}

export const getSession = (id: string) => readJson<PostSession>(sessionFile(id))

export async function updateSession(id: string, patch: (s: PostSession) => void): Promise<PostSession | null> {
  const s = await getSession(id)
  if (!s) return null
  patch(s)
  await writeJson(sessionFile(id), s)
  return s
}

export async function saveCard(card: PostCard, files: { cardJpg: Buffer; voiceWav?: Buffer }) {
  const dir = cardDir(card.id)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'card.jpg'), files.cardJpg)
  if (files.voiceWav) await fs.writeFile(path.join(dir, 'voice.wav'), files.voiceWav)
  await writeJson(path.join(dir, 'card.json'), card)
}

export const getCard = (id: string) => readJson<PostCard>(path.join(cardDir(id), 'card.json'))

export async function getCardFile(id: string, name: 'card.jpg' | 'voice.wav'): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(cardDir(id), name))
  } catch {
    return null
  }
}
