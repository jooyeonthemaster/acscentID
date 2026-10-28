import { notFound } from 'next/navigation'
import { KIOSK_PC_PROGRAMS, findKioskPcProgram } from '@/lib/kiosk/pc'
import { PcScreen } from '../PcScreen'

// 노트북 가로 화면 체험 — /kiosk/pc/color · /kiosk/pc/caricature · /kiosk/pc/career (docs/kiosk-pc.md)
export function generateStaticParams() {
  return KIOSK_PC_PROGRAMS.map((program) => ({ program: program.slug }))
}
export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ program: string }> }) {
  const { program } = await params
  return {
    title: findKioskPcProgram(program)?.name ?? '체험',
    robots: { index: false, follow: false },
  }
}

export default async function KioskPcPage({ params }: { params: Promise<{ program: string }> }) {
  const { program } = await params
  if (!findKioskPcProgram(program)) notFound()
  return <PcScreen slug={program} />
}
