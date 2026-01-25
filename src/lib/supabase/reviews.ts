/**
 * 리뷰 시스템 API
 * - 리뷰 조회/작성/수정/삭제
 * - 좋아요 기능
 * - 리뷰 이미지 업로드
 */

import { supabase } from './client'

// ============ 타입 정의 ============

export interface Review {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  program_type: 'idol_image' | 'personal' | 'figure'
  order_id: string | null
  rating: number
  content: string | null
  idol_name: string | null
  option_info: string | null
  is_verified: boolean
  helpful_count: number
  images: ReviewImage[]
  user_profile: {
    name: string | null
    avatar_url: string | null
  } | null
  has_liked?: boolean
}

export interface ReviewImage {
  id: string
  image_url: string
  order_index: number
}

export interface ReviewStats {
  average_rating: number
  total_count: number
  rating_distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
  photo_review_count: number
}

export interface ReviewFilter {
  program_type: 'idol_image' | 'personal' | 'figure'
  sort_by?: 'latest' | 'rating_high' | 'rating_low' | 'helpful'
  rating?: number | null
  photo_only?: boolean
  page?: number
  limit?: number
}

export interface CreateReviewInput {
  program_type: 'idol_image' | 'personal' | 'figure'
  order_id?: string
  rating: number
  content?: string
  idol_name?: string
  option_info?: string
  images?: File[]
}

// ============ 리뷰 조회 ============

/**
 * 리뷰 목록 조회
 */
export async function getReviews(
  filter: ReviewFilter,
  currentUserId?: string
): Promise<{ reviews: Review[]; hasMore: boolean; totalCount: number }> {
  const { program_type, sort_by = 'latest', rating, photo_only, page = 1, limit = 10 } = filter
  const offset = (page - 1) * limit

  // 총 개수 조회 (필터 적용)
  let countQuery = supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('program_type', program_type)

  if (rating) {
    countQuery = countQuery.eq('rating', rating)
  }

  const { count: totalCount } = await countQuery

  let query = supabase
    .from('reviews')
    .select(`
      *,
      review_images (
        id,
        image_url,
        order_index
      ),
      user_profiles!reviews_user_id_fkey (
        name,
        avatar_url
      )
    `)
    .eq('program_type', program_type)
    .range(offset, offset + limit - 1)

  // 정렬
  switch (sort_by) {
    case 'latest':
      query = query.order('created_at', { ascending: false })
      break
    case 'rating_high':
      query = query.order('rating', { ascending: false }).order('created_at', { ascending: false })
      break
    case 'rating_low':
      query = query.order('rating', { ascending: true }).order('created_at', { ascending: false })
      break
    case 'helpful':
      query = query.order('helpful_count', { ascending: false }).order('created_at', { ascending: false })
      break
  }

  // 별점 필터
  if (rating) {
    query = query.eq('rating', rating)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Reviews] Fetch error:', error)
    throw new Error('리뷰를 불러오는데 실패했습니다.')
  }

  let reviews: Review[] = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user_id: row.user_id as string,
    program_type: row.program_type as Review['program_type'],
    order_id: row.order_id as string | null,
    rating: row.rating as number,
    content: row.content as string | null,
    idol_name: row.idol_name as string | null,
    option_info: row.option_info as string | null,
    is_verified: row.is_verified as boolean,
    helpful_count: row.helpful_count as number,
    images: (row.review_images as ReviewImage[]) || [],
    user_profile: row.user_profiles as Review['user_profile'],
  }))

  // 사진 리뷰만 필터
  if (photo_only) {
    reviews = reviews.filter(r => r.images.length > 0)
  }

  // 현재 사용자의 좋아요 상태 확인
  if (currentUserId && reviews.length > 0) {
    const reviewIds = reviews.map(r => r.id)
    const { data: likes } = await supabase
      .from('review_likes')
      .select('review_id')
      .eq('user_id', currentUserId)
      .in('review_id', reviewIds)

    const likedSet = new Set((likes || []).map((l: { review_id: string }) => l.review_id))
    reviews = reviews.map(r => ({ ...r, has_liked: likedSet.has(r.id) }))
  }

  return {
    reviews,
    hasMore: reviews.length === limit,
    totalCount: totalCount ?? 0
  }
}

/**
 * 리뷰 통계 조회
 */
export async function getReviewStats(programType: 'idol_image' | 'personal' | 'figure'): Promise<ReviewStats> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating, review_images(id)')
    .eq('program_type', programType)

  if (error) {
    console.error('[Reviews] Stats error:', error)
    return {
      average_rating: 0,
      total_count: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      photo_review_count: 0
    }
  }

  const reviews = data || []
  const totalCount = reviews.length

  if (totalCount === 0) {
    return {
      average_rating: 0,
      total_count: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      photo_review_count: 0
    }
  }

  const ratingSum = reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0)
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let photoCount = 0

  reviews.forEach((r: { rating: number; review_images: unknown[] | null }) => {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as keyof typeof distribution]++
    }
    if (r.review_images && r.review_images.length > 0) {
      photoCount++
    }
  })

  return {
    average_rating: Math.round((ratingSum / totalCount) * 10) / 10,
    total_count: totalCount,
    rating_distribution: distribution,
    photo_review_count: photoCount
  }
}

// ============ 리뷰 작성/수정/삭제 ============

const REVIEW_BUCKET = 'review-images'

/**
 * 리뷰 이미지 업로드
 */
async function uploadReviewImages(userId: string, reviewId: string, files: File[]): Promise<string[]> {
  const urls: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${userId}/${reviewId}/${i}_${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from(REVIEW_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false
      })

    if (error) {
      console.error('[Reviews] Image upload error:', error)
      continue
    }

    const { data: urlData } = supabase.storage
      .from(REVIEW_BUCKET)
      .getPublicUrl(filePath)

    urls.push(urlData.publicUrl)
  }

  return urls
}

/**
 * 리뷰 작성
 */
export async function createReview(userId: string, input: CreateReviewInput): Promise<Review> {
  // 1. 리뷰 생성
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      user_id: userId,
      program_type: input.program_type,
      order_id: input.order_id || null,
      rating: input.rating,
      content: input.content || null,
      idol_name: input.idol_name || null,
      option_info: input.option_info || null,
      is_verified: !!input.order_id
    })
    .select()
    .single()

  if (reviewError || !review) {
    console.error('[Reviews] Create error:', reviewError)
    throw new Error('리뷰 작성에 실패했습니다.')
  }

  // 2. 이미지 업로드 및 저장
  const images: ReviewImage[] = []
  if (input.images && input.images.length > 0) {
    const imageUrls = await uploadReviewImages(userId, review.id, input.images)

    for (let i = 0; i < imageUrls.length; i++) {
      const { data: imgData, error: imgError } = await supabase
        .from('review_images')
        .insert({
          review_id: review.id,
          image_url: imageUrls[i],
          order_index: i
        })
        .select()
        .single()

      if (!imgError && imgData) {
        images.push(imgData)
      }
    }
  }

  // 3. 사용자 프로필 조회
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, avatar_url')
    .eq('id', userId)
    .single()

  return {
    ...review,
    images,
    user_profile: profile,
    has_liked: false
  }
}

/**
 * 리뷰 삭제
 */
export async function deleteReview(userId: string, reviewId: string): Promise<void> {
  // 권한 확인
  const { data: review } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('id', reviewId)
    .single()

  if (!review || review.user_id !== userId) {
    throw new Error('삭제 권한이 없습니다.')
  }

  // 이미지 삭제
  const { data: images } = await supabase
    .from('review_images')
    .select('image_url')
    .eq('review_id', reviewId)

  if (images && images.length > 0) {
    const paths = images
      .map((img: { image_url: string }) => {
        const url = img.image_url
        const bucketPath = `${REVIEW_BUCKET}/`
        const pathIndex = url.indexOf(bucketPath)
        return pathIndex !== -1 ? url.substring(pathIndex + bucketPath.length) : null
      })
      .filter((p): p is string => p !== null)

    if (paths.length > 0) {
      await supabase.storage.from(REVIEW_BUCKET).remove(paths)
    }
  }

  // 리뷰 삭제 (cascade로 이미지, 좋아요도 삭제됨)
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) {
    throw new Error('리뷰 삭제에 실패했습니다.')
  }
}

// ============ 좋아요 기능 ============

/**
 * 좋아요 토글
 */
export async function toggleReviewLike(userId: string, reviewId: string): Promise<{ liked: boolean; count: number }> {
  // 현재 좋아요 상태 확인
  const { data: existing } = await supabase
    .from('review_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('review_id', reviewId)
    .single()

  if (existing) {
    // 좋아요 취소
    await supabase
      .from('review_likes')
      .delete()
      .eq('id', existing.id)

    await supabase.rpc('decrement_helpful_count', { review_id: reviewId })

    const { data: review } = await supabase
      .from('reviews')
      .select('helpful_count')
      .eq('id', reviewId)
      .single()

    return { liked: false, count: review?.helpful_count || 0 }
  } else {
    // 좋아요 추가
    await supabase
      .from('review_likes')
      .insert({ user_id: userId, review_id: reviewId })

    await supabase.rpc('increment_helpful_count', { review_id: reviewId })

    const { data: review } = await supabase
      .from('reviews')
      .select('helpful_count')
      .eq('id', reviewId)
      .single()

    return { liked: true, count: review?.helpful_count || 0 }
  }
}

// ============ 구매 확인 ============

/**
 * 사용자가 해당 프로그램을 구매했는지 확인
 */
export async function checkPurchase(
  userId: string,
  programType: 'idol_image' | 'personal' | 'figure'
): Promise<{ canReview: boolean; hasReviewed: boolean; orderId?: string }> {
  // 구매 내역 확인
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('program_type', programType)
    .eq('status', 'completed')
    .limit(1)

  if (!orders || orders.length === 0) {
    return { canReview: false, hasReviewed: false }
  }

  // 이미 리뷰를 작성했는지 확인
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('program_type', programType)
    .limit(1)

  return {
    canReview: true,
    hasReviewed: !!existingReview && existingReview.length > 0,
    orderId: orders[0].id
  }
}
