// 체험 모드가 쓰는 큰 파일(인식 엔진 WASM · 손/얼굴 모델) 받기 — 기기 보관함(Cache Storage)에 두고 다시 받지 않는다.
// 퍼스널 컬러(garment-recolor.ts)와 같은 방식 · 같은 보관함이다: 엔진 파일(9.5MB)을 서로 같이 쓴다.
//  · 매장 키오스크는 USB Wi-Fi 라 큰 파일을 한꺼번에 받으면 회선이 끊긴 적이 있다(2026-10-09) — 부분 요청(Range)으로 조각을 나눠 받는다.
//  · 손님이 없는 첫 화면에서는 천천히('idle'), 손님이 기다리는 화면에서는 조각 사이를 짧게('now').
//  · 받다 만 조각은 앱이 켜져 있는 동안 기억해 두었다가 이어 받는다.

/** 퍼스널 컬러와 같은 이름 — @mediapipe/tasks-vision 을 올리면 두 곳의 번호를 같이 올린다 */
const ASSET_CACHE = 'kiosk-garment-assets-v1'

export type AssetPace = 'idle' | 'now'
const PACE: Record<AssetPace, { chunk: number; gap: number }> = {
  idle: { chunk: 320 * 1024, gap: 1300 },
  now: { chunk: 640 * 1024, gap: 150 },
}

const partial = new Map<string, { etag: string | null; total: number; type: string; chunks: BlobPart[]; received: number }>()

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('aborted', 'AbortError'))
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve() }, ms)
    const onAbort = () => { window.clearTimeout(timer); reject(new DOMException('aborted', 'AbortError')) }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** 보관함에 있으면 그것을(망을 쓰지 않는다), 없으면 조각으로 받아 보관함에 넣는다 */
export async function getCachedAsset(url: string, signal: AbortSignal, pace: AssetPace): Promise<Blob> {
  const store = typeof caches === 'undefined' ? null : await caches.open(ASSET_CACHE).catch(() => null)
  const kept = await store?.match(url).catch(() => undefined)
  if (kept) return kept.blob()
  const keep = async (blob: Blob) => {
    partial.delete(url)
    await store?.put(url, new Response(blob, { headers: { 'content-type': blob.type } })).catch(() => {})
    return blob
  }
  const { chunk, gap } = PACE[pace]
  for (;;) {
    const part = partial.get(url)
    const from = part?.received ?? 0
    if (part && from >= part.total) return keep(new Blob(part.chunks, { type: part.type }))
    const res = await fetch(url, { signal, cache: 'no-store', priority: pace === 'idle' ? 'low' : 'auto', headers: { Range: `bytes=${from}-${from + chunk - 1}` } } as RequestInit)
    const type = res.headers.get('content-type') ?? 'application/octet-stream'
    // 부분 요청을 무시하고 통째로 준 서버 — 받은 것을 그대로 쓴다
    if (res.status === 200) return keep(new Blob([await res.arrayBuffer()], { type }))
    if (res.status !== 206) throw new Error(`${url} ${res.status}`)
    const total = Number(res.headers.get('content-range')?.split('/')[1])
    const etag = res.headers.get('etag')
    if (!Number.isFinite(total) || total <= 0) throw new Error(`${url} no total`)
    if (part && (part.etag !== etag || part.total !== total)) {
      // 받는 사이에 파일이 바뀌었다(새 배포) — 처음부터
      partial.delete(url)
      continue
    }
    const bytes = await res.arrayBuffer()
    if (!bytes.byteLength) throw new Error(`${url} empty chunk`)
    const next = part ?? { etag, total, type, chunks: [], received: 0 }
    next.chunks.push(bytes)
    next.received += bytes.byteLength
    partial.set(url, next)
    if (next.received < next.total) await pause(gap, signal)
  }
}
