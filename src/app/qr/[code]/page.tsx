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

  // 현재는 image_analysis만 구현되어 있음
  // 향후 다른 상품 타입 추가 시 분기 처리
  switch (productType) {
    case 'image_analysis':
      redirect(`/input?service_mode=${serviceMode}&qr_code=${qrCodeId}`)
    case 'figure_diffuser':
      // TODO: 피규어 디퓨저 경로 구현 시 변경
      redirect(`/input?product_type=figure_diffuser&service_mode=${serviceMode}&qr_code=${qrCodeId}`)
    case 'personal_scent':
      // TODO: 퍼스널 센트 경로 구현 시 변경
      redirect(`/input?product_type=personal_scent&service_mode=${serviceMode}&qr_code=${qrCodeId}`)
    default:
      redirect(`/input?service_mode=${serviceMode}&qr_code=${qrCodeId}`)
  }
}
