import './post.css'
import { PostApp } from "./PostApp"

// POST! 우체통 포토부스 — 기기 화면 초안. /booth/post?season=xmas&place=성수동 (&demo=장면 — 그 장면 바로 보기)
// 로케일 라우팅 제외(/booth/ 아래), 검색 노출 금지
export const metadata = {
  title: 'POST! 우체통',
  robots: { index: false, follow: false },
}

export default async function PostPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams
  const season = q.season === 'xmas' ? 'xmas' : 'base'
  const place = typeof q.place === 'string' && q.place.trim() ? q.place.trim().slice(0, 6) : '우리 동네'
  const demo = typeof q.demo === 'string' ? q.demo : null
  return <PostApp season={season} place={place} demo={demo} />
}
