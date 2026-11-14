import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { LATER_SCENES, type LaterSceneId } from '@/lib/funground/later-photo'
import { LaterPhoto } from './LaterPhoto'

// 펀그라운드 B안 1. 타임캡슐 포토 「LATER!」 — /booth-demo/funground/later?demo=1 (시작 화면에서는 같은 16:9 칸에 iframe 으로 연다)
// 외부 AI 호출 없음: 사람 분리는 브라우저(설치 때는 기기) 안 MediaPipe, 합성 · 인쇄 원판도 기기 안 캔버스. 얼굴을 AI 로 바꾸지 않는다.
// 미리 만든 배경(public/assets/booth-programs/…/<id>.webp)이 있는지는 빌드 때 여기서 본다 — 없는 장면은 코드 그림으로(요청 404 없음).
export const metadata: Metadata = { title: 'LATER! 타임캡슐 포토 · FUN GROUND', robots: { index: false, follow: false } }

export default function FungroundLaterPage() {
  const artReady: LaterSceneId[] = LATER_SCENES
    .filter((s) => fs.existsSync(path.join(process.cwd(), 'public', s.art)))
    .map((s) => s.id)
  return <LaterPhoto artReady={artReady} />
}
