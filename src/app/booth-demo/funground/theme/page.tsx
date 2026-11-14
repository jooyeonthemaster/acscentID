import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { THEMES, THEME_ART_DIR, type ThemeId } from '@/lib/funground/theme-photo'
import { ThemePhoto } from './ThemePhoto'

// 펀그라운드 B안 1. 테마 포토 「THEME!」 — /booth-demo/funground/theme?demo=1 (시작 화면에서는 같은 16:9 칸에 iframe 으로 연다)
// 외부 AI 호출 없음: 사람 분리는 브라우저(설치 때는 기기) 안 MediaPipe, 합성 · 인쇄 원판도 기기 안 캔버스.
// 미리 만든 배경(public/assets/booth-programs/funground-theme/<id>.webp)이 있는지는 빌드 때 여기서 본다 — 없는 테마는 코드 그림으로(요청 404 없음).
export const metadata: Metadata = { title: 'THEME! 테마 포토 · FUN GROUND', robots: { index: false, follow: false } }

export default function FungroundThemePage() {
  const artReady: ThemeId[] = THEMES
    .filter((t) => fs.existsSync(path.join(process.cwd(), THEME_ART_DIR, `${t.id}.webp`)))
    .map((t) => t.id)
  return <ThemePhoto artReady={artReady} />
}
