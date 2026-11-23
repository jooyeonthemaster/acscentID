import '../../post.css'
import { CardClient } from './CardClient'

// POST! — 받는 사람이 카톡 카드를 눌러 여는 웹 엽서. 봉투 → 엽서 → 보낸 사람 목소리.
export const metadata = { title: 'POST! 엽서가 도착했어요', robots: { index: false, follow: false } }

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CardClient id={id} />
}
