import type { Metadata } from 'next'
import { LATER_SCENES, type LaterSceneId } from '@/lib/funground/later-photo'
import { LaterPhoto } from './LaterPhoto'

// 펀그라운드 B안 1. 타임캡슐 포토 「LATER!」 — /booth-demo/funground/later?demo=1 (시작 화면에서는 같은 16:9 칸에 iframe 으로 연다)
// 외부 AI 호출 없음: 사람 분리는 브라우저(설치 때는 기기) 안 MediaPipe, 합성 · 인쇄 원판도 기기 안 캔버스. 얼굴을 AI 로 바꾸지 않는다.
// 미리 만든 배경(public/assets/booth-programs/…/<id>.webp)은 저장소에 함께 들어 있어 모든 장면을 그림으로 쓴다.
// (2026-11-14: 예전에는 여기서 fs 로 파일이 있는지 봤는데, 경로가 데이터에서 나와 Vercel 이 public/ 전체를 함수에 묶어 378MB → 배포 실패)
export const metadata: Metadata = { title: 'LATER! 타임캡슐 포토 · FUN GROUND', robots: { index: false, follow: false } }

export default function FungroundLaterPage() {
  const artReady: LaterSceneId[] = LATER_SCENES.map((s) => s.id)
  return <LaterPhoto artReady={artReady} />
}
