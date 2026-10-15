import { AlbumUploadClient } from './AlbumUploadClient'

// 포토부스 프로그램 — 휴대폰 사진 보내기(추억 무비 5~20장 · 사진 프로그램 1~2장). 부스 화면 QR 로만 온다
export const metadata = {
  title: '사진 보내기 | 포토부스',
  robots: { index: false, follow: false },
}

export default async function BoothAlbumPage({ params, searchParams }: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ n?: string; for?: string }>
}) {
  const { token } = await params
  const query = await searchParams
  const max = Math.min(20, Math.max(1, Number(query.n) || 20))
  return <AlbumUploadClient token={decodeURIComponent(token)} max={max} purpose={query.for === 'photo' ? 'photo' : 'movie'} />
}
