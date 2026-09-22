import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { AdminHeader } from '../components/AdminHeader'
import { ScreenBackgroundManager } from '@/components/admin/ScreenBackgroundManager'

export default async function AdminBackgroundsPage({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
  const { target } = await searchParams
  const initialTarget = target === 'booth' || target === 'kiosk' ? target : undefined
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader title="화면 배경 관리" subtitle="포토부스와 키오스크의 배경·글꼴·색상을 관리합니다." actions={
        <><Link href="/booth" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><ExternalLink size={15} />포토부스</Link><Link href="/kiosk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><ExternalLink size={15} />키오스크</Link></>
      } />
      <div className="mx-auto max-w-screen-2xl p-4 lg:p-6"><ScreenBackgroundManager initialTarget={initialTarget} /></div>
    </div>
  )
}
