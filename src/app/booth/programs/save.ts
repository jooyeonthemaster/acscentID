// 프로그램 결과 저장(부스) — 사진은 /api/photobooth/result, 영상은 /api/photobooth/media 로 업로드 주소를 받아 저장소에 바로.
// 둘 다 7일 보관, QR 은 폰에서 여는 페이지 주소. 촬영 통계(/api/photobooth/shot, mode 'program')는 매장에서만 남긴다.
import QRCode from 'qrcode'

export interface SavedLink {
  /** 폰에서 여는 전체 주소(QR) */
  url: string
  qr: string
  /** 사진 /booth/photo/<token> · 영상 /booth/video/<token> 의 token */
  token: string
  kind: 'photo' | 'video'
}

async function readError(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}))
  return new Error(typeof data?.error === 'string' ? data.error : fallback)
}

export async function makeScreenQr(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 520, margin: 1, errorCorrectionLevel: 'M' })
}

/** 사진(JPEG data URL) 올리기 → 폰 저장 페이지 */
export async function savePhoto(ticket: string, jpeg: string): Promise<SavedLink> {
  const res = await fetch('/api/photobooth/result', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket, imageBase64: jpeg }),
  })
  if (!res.ok) throw await readError(res, '사진을 올리지 못했어요.')
  const data = await res.json()
  // 프로그램 사진은 브랜드 표기 없이(plain=1) 보여 준다
  const url = `${window.location.origin}${data.path}?plain=1`
  return { url, qr: await makeScreenQr(url), token: String(data.token), kind: 'photo' }
}

/** 영상 올리기 — 업로드 주소를 받고 저장소로 바로(진행률은 실제 보낸 바이트) */
export async function saveVideo(ticket: string, blob: Blob, onProgress: (ratio: number) => void, signal?: AbortSignal): Promise<SavedLink> {
  const res = await fetch('/api/photobooth/media', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket, mime: blob.type, size: blob.size }), signal,
  })
  if (!res.ok) throw await readError(res, '영상을 올릴 준비를 하지 못했어요.')
  const { uploadUrl, path, token } = await res.json()
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', blob.type)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`영상을 올리지 못했어요 (${xhr.status}).`)))
    xhr.onerror = () => reject(new Error('네트워크가 끊겨 영상을 올리지 못했어요.'))
    xhr.onabort = () => reject(new Error('영상 올리기를 멈췄어요.'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(blob)
  })
  onProgress(1)
  const url = `${window.location.origin}${path}`
  return { url, qr: await makeScreenQr(url), token: String(token), kind: 'video' }
}

/** QR 을 다시 보여 줄 때 — 파일이 아직 받을 수 있는지 */
export async function linkAlive(link: SavedLink): Promise<boolean> {
  try {
    const res = await fetch(link.kind === 'video' ? `/api/photobooth/media/${link.token}?check=1` : `/api/photobooth/result/${link.token}`, { method: link.kind === 'video' ? 'GET' : 'HEAD', cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

/** 매장 촬영 통계 — 실패해도 손님 흐름은 그대로 */
export async function logProgramShot(program: string): Promise<string | null> {
  try {
    const res = await fetch('/api/photobooth/shot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'program', cut_count: 1, frame_title: program }),
    })
    const data = await res.json().catch(() => ({}))
    return res.ok && typeof data.id === 'string' ? data.id : null
  } catch {
    return null
  }
}

export function markProgramShot(id: string | null, patch: { printed?: boolean; downloaded?: boolean }) {
  if (!id) return
  void fetch('/api/photobooth/shot', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) }).catch(() => undefined)
}
