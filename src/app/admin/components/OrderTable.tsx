'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Clock,
  CreditCard,
  Truck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  User
} from 'lucide-react'

interface Order {
  id: string
  order_number: string
  user_id: string
  perfume_name: string
  perfume_brand: string
  size: string
  price: number
  recipient_name: string
  phone: string
  zip_code: string
  address: string
  address_detail: string
  memo: string
  status: 'pending' | 'paid' | 'shipping' | 'delivered'
  created_at: string
  updated_at: string
}

interface OrderTableProps {
  orders: Order[]
  loading: boolean
  onStatusChange: (orderId: string, status: string) => Promise<void>
}

const statusConfig = {
  pending: {
    label: '입금대기',
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    icon: Clock,
  },
  paid: {
    label: '입금완료',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: CreditCard,
  },
  shipping: {
    label: '배송중',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: Truck,
  },
  delivered: {
    label: '배송완료',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    icon: CheckCircle,
  }
}

const statusOptions = [
  { value: 'pending', label: '입금대기' },
  { value: 'paid', label: '입금완료' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
]

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function OrderRow({ order, onStatusChange }: { order: Order; onStatusChange: (orderId: string, status: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const status = statusConfig[order.status]
  const StatusIcon = status.icon

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === order.status) return
    setUpdating(true)
    await onStatusChange(order.id, newStatus)
    setUpdating(false)
  }

  return (
    <>
      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-slate-100 rounded"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-slate-500">{order.order_number}</span>
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="font-semibold text-slate-900">{order.recipient_name}</p>
            <p className="text-xs text-slate-500">{order.phone}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="font-medium text-slate-900">{order.perfume_name}</p>
            <p className="text-xs text-slate-500">{order.size}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="font-semibold text-emerald-600">
            {order.price.toLocaleString()}원
          </span>
        </td>
        <td className="px-4 py-3">
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updating}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 cursor-pointer transition-all ${status.color} ${
              updating ? 'opacity-50' : ''
            }`}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-slate-500">{formatDate(order.created_at)}</span>
        </td>
      </tr>

      {/* 확장 영역 - 배송 상세 정보 */}
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={7} className="px-4 py-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-50 rounded-lg p-4 my-2 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">배송지</p>
                        <p className="text-sm text-slate-900">
                          ({order.zip_code}) {order.address}
                        </p>
                        {order.address_detail && (
                          <p className="text-sm text-slate-700">{order.address_detail}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User size={16} className="text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">배송 메모</p>
                        <p className="text-sm text-slate-900">{order.memo || '없음'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>주문일: {formatDate(order.created_at)}</span>
                    <span>수정일: {formatDate(order.updated_at)}</span>
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

export function OrderTable({ orders, loading, onStatusChange }: OrderTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <Package size={48} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-500">주문 내역이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left w-10"></th>
            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">주문번호</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">주문자</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">상품</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">금액</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">상태</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">주문일</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onStatusChange={onStatusChange} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
