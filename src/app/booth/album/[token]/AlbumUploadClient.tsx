'use client'

// 휴대폰 → 부스 사진 보내기. 고른 사진을 휴대폰에서 줄여(긴 변 1600px JPEG) 한 장씩 올린다 — 장마다 진행·실패·다시 보내기.
// 올라간 사진은 지울 수 있고, 부스 화면에도 바로 보인다(부스가 2.5초마다 목록을 가져간다).
import { useCallback, useEffect, useRef, useState } from 'react'

interface Uploaded { name: string; url: string }
interface Item { id: string; file: File; state: 'wait' | 'sending' | 'done' | 'failed'; error?: string; preview: string }

const MIN_MOVIE = 5

async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(async () => {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  })
  const w = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width
  const h = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height
  const scale = Math.min(1, 1600 / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  if ('close' in bitmap) bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function AlbumUploadClient({ token, max, purpose }: { token: string; max: number; purpose: 'photo' | 'movie' }) {
  const [uploaded, setUploaded] = useState<Uploaded[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [expired, setExpired] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const sending = useRef(false)
  const input = useRef<HTMLInputElement | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/photobooth/album?token=${encodeURIComponent(token)}`, { cache: 'no-store' }).catch(() => null)
    if (!res) return
    if (res.status === 410) { setExpired(true); return }
    const data = await res.json().catch(() => ({}))
    if (Array.isArray(data.photos)) setUploaded(data.photos)
  }, [token])
  useEffect(() => {
    void refresh()
    const timer = window.setInterval(refresh, 4000)
    return () => window.clearInterval(timer)
  }, [refresh])

  /** 보낼 차례 — 화면 목록(items)과 따로 둔다(상태 갱신을 기다리지 않게) */
  const queue = useRef<Item[]>([])
  const update = (id: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const pump = useCallback(async () => {
    if (sending.current) return
    sending.current = true
    try {
      for (let next = queue.current.shift(); next; next = queue.current.shift()) {
        const id = next.id
        update(id, { state: 'sending' })
        try {
          const imageBase64 = await shrink(next.file)
          const res = await fetch('/api/photobooth/album', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, imageBase64 }) })
          const data = await res.json().catch(() => ({}))
          if (res.status === 410) setExpired(true)
          if (Array.isArray(data.photos)) setUploaded(data.photos)
          if (!res.ok) throw new Error(data.error || '보내지 못했어요')
          update(id, { state: 'done' })
        } catch (cause) {
          update(id, { state: 'failed', error: cause instanceof Error ? cause.message : '보내지 못했어요' })
        }
      }
    } finally {
      sending.current = false
    }
  }, [token])

  const pick = (files: FileList | null) => {
    if (!files?.length) return
    const room = max - uploaded.length - queue.current.length - (sending.current ? 1 : 0)
    const chosen = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, room))
    setNotice(files.length > chosen.length ? `사진은 ${max}장까지 보낼 수 있어요. ${chosen.length}장만 보낼게요.` : null)
    const fresh = chosen.map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, file, state: 'wait' as const, preview: URL.createObjectURL(file) }))
    queue.current.push(...fresh)
    setItems((list) => [...list.filter((i) => i.state !== 'done'), ...fresh])
    void pump()
  }
  const retry = (item: Item) => {
    update(item.id, { state: 'wait', error: undefined })
    queue.current.push(item)
    void pump()
  }
  const remove = async (name: string) => {
    setUploaded((list) => list.filter((p) => p.name !== name))
    await fetch(`/api/photobooth/album?token=${encodeURIComponent(token)}&name=${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(() => undefined)
    void refresh()
  }

  const pending = items.filter((i) => i.state !== 'done')
  const enough = purpose === 'movie' ? uploaded.length >= MIN_MOVIE : uploaded.length >= max

  if (expired) {
    return (
      <main className="min-h-svh bg-[#f5ede1] text-[#3a2a1b] flex flex-col items-center justify-center px-6 text-center gap-3">
        <h1 className="text-2xl font-bold">연결 시간이 지났어요</h1>
        <p className="text-sm text-[#7d6650] break-keep">부스 화면의 [QR 다시 받기]를 누르고 새 QR을 찍어 주세요.<br />이미 보낸 사진은 부스에 그대로 있어요.</p>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[#f5ede1] text-[#3a2a1b] px-5 py-8 flex flex-col gap-5">
      <header className="text-center">
        <p className="text-xs font-bold tracking-[0.3em] text-[#a0825f]">PHOTOBOOTH</p>
        <h1 className="mt-2 text-2xl font-black break-keep">{purpose === 'movie' ? '추억 영상에 넣을 사진 보내기' : max > 1 ? `사진 ${max}장 보내기` : '내 사진 한 장 보내기'}</h1>
        <p className="mt-2 text-sm text-[#7d6650] break-keep">
          {purpose === 'movie' ? `사진 ${MIN_MOVIE}~${max}장을 골라 주세요. 보낸 순서대로 들어가고, 부스에서 순서를 바꿀 수 있어요.` : '얼굴이 잘 보이는 사진을 골라 주세요. 보내면 부스 화면에 바로 나타나요.'}
        </p>
      </header>

      <button type="button" onClick={() => input.current?.click()} disabled={uploaded.length >= max}
        className="min-h-14 rounded-2xl bg-[#6b4a2b] text-white text-lg font-bold disabled:opacity-40">
        사진 고르기 ({uploaded.length} / {max})
      </button>
      <input ref={input} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
      {notice && <p className="text-sm font-bold text-[#b2552a]">{notice}</p>}

      {pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold">보내는 중</h2>
          {pending.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-xl bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <span className="flex-1 text-sm">{i.state === 'wait' ? '기다리는 중' : i.state === 'sending' ? '보내는 중…' : i.error}</span>
              {i.state === 'failed' && <button type="button" onClick={() => retry(i)} className="min-h-11 rounded-lg border border-[#6b4a2b] px-3 text-sm font-bold">다시 보내기</button>}
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold">부스로 보낸 사진 {uploaded.length}장</h2>
        <ul className="grid grid-cols-3 gap-2">
          {uploaded.map((p, i) => (
            <li key={p.name} className="relative aspect-square overflow-hidden rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${i + 1}번째 사진`} className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded-full bg-[#6b4a2b] px-2 text-xs font-bold text-white">{i + 1}</span>
              <button type="button" onClick={() => void remove(p.name)} aria-label={`${i + 1}번째 사진 지우기`}
                className="absolute right-0 top-0 h-11 w-11 text-white text-xl font-bold drop-shadow">×</button>
            </li>
          ))}
        </ul>
      </section>

      <p className={`rounded-xl p-3 text-center text-sm font-bold ${enough ? 'bg-[#e6f2e1] text-[#2f6b3a]' : 'bg-white text-[#7d6650]'}`}>
        {enough ? '준비됐어요! 이제 부스 화면에서 이어서 진행해 주세요.' : purpose === 'movie' ? `${MIN_MOVIE - uploaded.length > 0 ? `${MIN_MOVIE - uploaded.length}장 더 보내 주세요` : ''}` : `${max - uploaded.length}장 더 보내 주세요`}
      </p>
      <p className="text-center text-xs text-[#a0825f] break-keep">보낸 사진은 영상·사진을 만드는 데만 쓰고, 체험이 끝나면 지워져요(늦어도 30분 뒤).</p>
    </main>
  )
}
