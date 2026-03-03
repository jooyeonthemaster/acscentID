import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import SharedResultClient from './SharedResultClient'

interface Props {
  params: Promise<{ id: string }>
}

async function getResult(id: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  // 조회수 증가 (비동기, 응답 차단 X)
  supabase
    .from('analysis_results')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', id)
    .then(() => {})

  return {
    id: data.id,
    createdAt: data.created_at,
    userImageUrl: data.user_image_url,
    analysisData: data.analysis_data,
    twitterName: data.twitter_name,
    perfumeName: data.perfume_name,
    perfumeBrand: data.perfume_brand,
    matchingKeywords: data.matching_keywords,
    viewCount: data.view_count,
  }
}

export default async function SharedResultPage({ params }: Props) {
  const { id } = await params
  const result = await getResult(id)

  if (!result) {
    notFound()
  }

  return <SharedResultClient result={result} />
}
