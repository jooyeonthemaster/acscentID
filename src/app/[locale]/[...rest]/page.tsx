import { notFound } from 'next/navigation'

// 매칭되지 않는 모든 공개 경로를 [locale]/not-found.tsx(헤더·푸터 포함, 다국어)로 보낸다
export default function CatchAllNotFound() {
  notFound()
}
