import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  hasCostAnalysisAccess,
  isValidCostAnalysisPassword,
  setCostAnalysisAccessCookie,
} from '@/lib/admin/cost-analysis-access'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  return NextResponse.json({ unlocked: hasCostAnalysisAccess(request) })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const password = body && typeof body === 'object' && 'password' in body ? body.password : null

  if (!isValidCostAnalysisPassword(password)) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 })
  }

  const response = NextResponse.json({ unlocked: true })
  setCostAnalysisAccessCookie(response)
  return response
}
