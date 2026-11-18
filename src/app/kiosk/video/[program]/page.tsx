import { notFound } from 'next/navigation'
import { VIDEO_PROGRAMS, type KxVideoProgram } from '../plans'
import { VideoPreview } from '../VideoPreview'

// 키오스크 영상판 흐름 미리보기 — /kiosk/video/color · /kiosk/video/draw · /kiosk/video/makeup (plans.ts)
export function generateStaticParams() {
  return Object.keys(VIDEO_PROGRAMS).map((program) => ({ program }))
}
export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ program: string }> }) {
  const { program } = await params
  const p = VIDEO_PROGRAMS[program as KxVideoProgram]
  return { title: p ? `${p.tag} 영상판 미리보기` : '영상판', robots: { index: false, follow: false } }
}

export default async function KioskVideoPage({ params }: { params: Promise<{ program: string }> }) {
  const { program } = await params
  const p = VIDEO_PROGRAMS[program as KxVideoProgram]
  if (!p) notFound()
  return <VideoPreview id={p.id} />
}
