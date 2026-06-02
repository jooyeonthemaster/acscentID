import { supabase } from '@/lib/supabase/client'

/**
 * 가격 옵션 대표 이미지를 admin-content 스토리지에 업로드하고 public URL 반환.
 */
export async function uploadPricingImage(file: File, productType: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filePath = `pricing/${productType}/${timestamp}_${random}.${ext}`

  const { data, error } = await supabase.storage
    .from('admin-content')
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) throw error
  const { data: urlData } = supabase.storage.from('admin-content').getPublicUrl(data.path)
  return urlData.publicUrl
}
