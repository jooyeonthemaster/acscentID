import Link from 'next/link'
import { AdminHeader } from '../components/AdminHeader'
import { Package, Sparkles, Tag } from 'lucide-react'

const destinations = [
  {
    href: '/admin/programs',
    title: '프로그램 가격 관리',
    description: '이미지 분석, 시그니처, 오늘의 향 등 프로그램형 판매 옵션을 관리합니다.',
    icon: Sparkles,
  },
  {
    href: '/admin/products#store-pricing',
    title: '상품 가격 관리',
    description: '50ml 향수, 10ml 향수, 시향지처럼 분석 없이 바로 구매하는 상품 옵션을 관리합니다.',
    icon: Package,
  },
]

export default function AdminProductPricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="가격 관리"
        subtitle="가격 옵션 관리는 프로그램과 일반 상품 화면으로 분리되었습니다"
      />

      <div className="mx-auto max-w-5xl p-6">
        <div className="grid grid-cols-2 gap-4">
          {destinations.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 flex items-center gap-2 text-lg font-black text-slate-900">
                  {item.title}
                  <Tag className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-900" />
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
