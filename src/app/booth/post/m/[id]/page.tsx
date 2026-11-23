import '../../post.css'
import { PhoneClient } from './PhoneClient'

// POST! — 손님 휴대폰(기기 화면 QR · 엽서 QR 로 들어옴). 엽서가 완성되면 여기서 배달한다.
export const metadata = { title: 'POST! 엽서 배달', robots: { index: false, follow: false } }

export default async function PhonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PhoneClient sessionId={id} kakaoKey={process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? null} />
}
