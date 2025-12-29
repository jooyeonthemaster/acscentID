/**
 * Supabase Storage 유틸리티
 * - 분석 이미지 업로드/삭제
 * - 공개 URL 생성
 */

import { supabase } from './client'

const BUCKET_NAME = 'analysis-images'

/**
 * 분석 이미지를 Supabase Storage에 업로드
 * @param imageBlob - 압축된 이미지 Blob
 * @param identifier - 사용자 ID 또는 fingerprint (폴더명으로 사용)
 * @returns 공개 URL
 */
export async function uploadAnalysisImage(
  imageBlob: Blob,
  identifier: string
): Promise<string> {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filePath = `${identifier}/${timestamp}_${random}.jpg`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, imageBlob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000', // 1년 캐시
      upsert: false
    })

  if (error) {
    console.error('[Storage] Upload error:', error)
    throw new Error(`이미지 업로드 실패: ${error.message}`)
  }

  return getPublicUrl(data.path)
}

/**
 * Storage 경로에서 공개 URL 생성
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Storage에서 이미지 삭제
 * @param url - 삭제할 이미지의 공개 URL
 */
export async function deleteAnalysisImage(url: string): Promise<void> {
  // URL에서 경로 추출
  const bucketPath = `${BUCKET_NAME}/`
  const pathIndex = url.indexOf(bucketPath)

  if (pathIndex === -1) {
    console.warn('[Storage] Invalid URL format:', url)
    return
  }

  const path = url.substring(pathIndex + bucketPath.length)

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    console.error('[Storage] Delete error:', error)
    // 삭제 실패는 치명적이지 않으므로 에러를 throw하지 않음
  }
}

/**
 * 여러 이미지 일괄 삭제
 */
export async function deleteMultipleImages(urls: string[]): Promise<void> {
  const paths = urls
    .map(url => {
      const bucketPath = `${BUCKET_NAME}/`
      const pathIndex = url.indexOf(bucketPath)
      return pathIndex !== -1 ? url.substring(pathIndex + bucketPath.length) : null
    })
    .filter((path): path is string => path !== null)

  if (paths.length === 0) return

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths)

  if (error) {
    console.error('[Storage] Batch delete error:', error)
  }
}

/**
 * 사용자의 모든 이미지 삭제 (계정 삭제 시)
 */
export async function deleteUserImages(identifier: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(identifier)

  if (listError || !files?.length) {
    return
  }

  const paths = files.map(file => `${identifier}/${file.name}`)

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths)

  if (error) {
    console.error('[Storage] User images delete error:', error)
  }
}
