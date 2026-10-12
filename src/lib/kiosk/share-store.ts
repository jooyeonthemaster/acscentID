// "휴대폰으로 받기" 파일을 저장소에 넣고 꺼내는 방법(서버 전용).
// 저장소 버킷(analysis-images)은 그림 형식(JPEG·PNG·WebP·GIF)만 받는다. 그림은 그대로 올리고,
// 그 밖의 것(목소리 WAV·명함 PDF·파일 목록 JSON)은 1×1 PNG 한 장의 사설 청크(kxDt)에 담아 PNG 로 올린다
// — 형식을 속이는 게 아니라 진짜 PNG 파일이고, 꺼낼 때 청크만 풀어 원래 형식으로 내려 준다.
// 버킷 설정을 바꾸지 않아도 되고, 저장소 주소를 직접 열어도 흰 점 하나만 보인다.

import { deflateSync } from 'zlib'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SHARE_BUCKET, shareFilePath, shareMetaPath, type ShareType } from './share'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
/** 사설 보조 청크 이름 — 소문자 k(없어도 그림은 열린다)·소문자 x(공개 규격 아님) */
const DATA_CHUNK = 'kxDt'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(...parts: Uint8Array[]): number {
  let crc = 0xffffffff
  for (const part of parts) for (let i = 0; i < part.length; i++) crc = CRC_TABLE[(crc ^ part[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Buffer {
  const name = Buffer.from(type, 'ascii')
  const head = Buffer.alloc(4)
  head.writeUInt32BE(data.length)
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE(crc32(name, data))
  return Buffer.concat([head, name, data, tail])
}

/** 아무 파일이나 PNG 한 장에 담는다 */
export function wrapInPng(payload: Uint8Array): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(1, 0)
  header.writeUInt32BE(1, 4)
  header[8] = 8 // 8비트 흑백 한 점
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk(DATA_CHUNK, payload), chunk('IDAT', deflateSync(Buffer.from([0, 255]))), chunk('IEND', new Uint8Array(0))])
}

/** 담아 둔 파일을 꺼낸다. 우리가 만든 PNG 가 아니거나 깨졌으면 null */
export function unwrapFromPng(png: Uint8Array): Buffer | null {
  const bytes = Buffer.from(png.buffer, png.byteOffset, png.byteLength)
  if (bytes.length < 20 || !bytes.subarray(0, 8).equals(SIGNATURE)) return null
  let at = 8
  while (at + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(at)
    const end = at + 8 + length
    if (end + 4 > bytes.length) return null
    const type = bytes.subarray(at + 4, at + 8)
    const data = bytes.subarray(at + 8, end)
    if (type.toString('ascii') === DATA_CHUNK) return bytes.readUInt32BE(end) === crc32(type, data) ? Buffer.from(data) : null
    at = end + 4
  }
  return null
}

const isImage = (type: ShareType) => type === 'image/jpeg' || type === 'image/png'
/** 저장소 안의 이름 — 그림이 아니면 .png 를 덧붙인다(my-voice.wav.png) */
const storedPath = (token: string, name: string, type: ShareType) => shareFilePath(token, isImage(type) ? name : `${name}.png`)

export async function putShareFile(client: SupabaseClient, token: string, name: string, type: ShareType, bytes: Buffer): Promise<string | null> {
  const { error } = await client.storage.from(SHARE_BUCKET).upload(storedPath(token, name, type), isImage(type) ? bytes : wrapInPng(bytes), { contentType: isImage(type) ? type : 'image/png', cacheControl: '3600', upsert: false })
  return error ? error.message : null
}

export async function getShareFile(client: SupabaseClient, token: string, name: string, type: ShareType): Promise<Buffer | null> {
  const { data, error } = await client.storage.from(SHARE_BUCKET).download(storedPath(token, name, type))
  if (error || !data) return null
  const bytes = Buffer.from(await data.arrayBuffer())
  return isImage(type) ? bytes : unwrapFromPng(bytes)
}

/** 파일 목록(meta) — JSON 을 같은 방법으로 담는다 */
export async function putShareMeta(client: SupabaseClient, token: string, meta: unknown): Promise<string | null> {
  const { error } = await client.storage.from(SHARE_BUCKET).upload(shareMetaPath(token), wrapInPng(Buffer.from(JSON.stringify(meta))), { contentType: 'image/png', upsert: false })
  return error ? error.message : null
}

export async function getShareMeta(client: SupabaseClient, token: string): Promise<unknown> {
  const { data, error } = await client.storage.from(SHARE_BUCKET).download(shareMetaPath(token))
  if (error || !data) return null
  try { return JSON.parse(unwrapFromPng(Buffer.from(await data.arrayBuffer()))?.toString('utf8') ?? 'null') } catch { return null }
}
