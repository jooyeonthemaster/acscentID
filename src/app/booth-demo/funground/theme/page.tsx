import type { Metadata } from 'next'
import { THEMES, type ThemeId } from '@/lib/funground/theme-photo'
import { ThemePhoto } from './ThemePhoto'

// 펀그라운드 B안 1. 테마 포토 「THEME!」 — /booth-demo/funground/theme?demo=1 (시작 화면에서는 같은 16:9 칸에 iframe 으로 연다)
// 외부 AI 호출 없음: 사람 분리는 브라우저(설치 때는 기기) 안 MediaPipe + MODNet(src/lib/funground/cutout.ts), 합성 · 인쇄 원판도 기기 안 캔버스.
// 미리 만든 배경(public/assets/booth-programs/funground-theme/<id>.webp)은 저장소에 함께 들어 있어 모든 테마를 그림으로 쓴다
// (fs 로 파일을 확인하면 Vercel 이 public/ 일부를 함수에 묶는다 — LATER! 와 같은 이유로 뺐다, 2026-11-14).
export const metadata: Metadata = { title: 'THEME! 테마 포토 · FUN GROUND', robots: { index: false, follow: false } }

export default function FungroundThemePage() {
  const artReady: ThemeId[] = THEMES.map((t) => t.id)
  return <ThemePhoto artReady={artReady} />
}
