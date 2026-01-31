import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/service'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function QRRedirectPage({ params }: PageProps) {
  const { code } = await params

  // 서비스 계정으로 Supabase 클라이언트 생성 (RLS 우회)
  const supabase = createServiceRoleClient()

  // QR 코드 조회
  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (error || !qrCode) {
    // QR 코드가 없거나 비활성화된 경우 메인 페이지로
    redirect('/')
  }

  // 스캔 카운트 증가
  await supabase
    .from('qr_codes')
    .update({
      scan_count: qrCode.scan_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', qrCode.id)

  // 상품 타입에 따라 적절한 경로로 리다이렉트
  const productType = qrCode.product_type
  const serviceMode = qrCode.service_mode || 'offline'
  const qrCodeId = qrCode.code

  // 상품 타입에 따른 리다이렉트
  // mode 파라미터: qr (오프라인 QR 스캔), online (온라인 모드)
  const modeParam = serviceMode === 'offline' ? 'qr' : 'online'

  switch (productType) {
    case 'image_analysis':
      redirect(`/input?type=idol_image&mode=${modeParam}&qr_code=${qrCodeId}`)
    case 'figure_diffuser':
      redirect(`/input?type=figure&mode=${modeParam}&qr_code=${qrCodeId}`)
    case 'graduation':
      redirect(`/input?type=graduation&mode=${modeParam}&qr_code=${qrCodeId}`)
    case 'personal_scent':
      redirect(`/input?type=personal&mode=${modeParam}&qr_code=${qrCodeId}`)
    default:
      redirect(`/input?type=idol_image&mode=${modeParam}&qr_code=${qrCodeId}`)
  }
}
