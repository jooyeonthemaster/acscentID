'use client'

import { useMemo } from 'react'
import { ImageAnalysisResult, TraitScores, ScentCategoryScores } from '@/types/analysis'

interface PrintableReportProps {
  analysis: {
    id: string
    analysis_data: ImageAnalysisResult
    twitter_name: string
    perfume_name: string
    perfume_brand: string
    matching_keywords: string[]
    idol_name: string | null
    service_mode: string
    created_at: string
    user_image_url?: string | null
  }
  feedback?: {
    perfume_name: string
    retention_percentage: number
    generated_recipe?: {
      granules: Array<{
        id: string
        name: string
        mainCategory: string
        drops: number
        ratio: number
        reason?: string
      }>
      overallExplanation?: string
      totalDrops: number
    } | null
  } | null
  userProfile?: {
    name: string | null
    email: string | null
  } | null
}

// 특성 한글 라벨
const TRAIT_LABELS: Record<keyof TraitScores, string> = {
  sexy: '섹시',
  cute: '큐트',
  charisma: '카리스마',
  darkness: '다크',
  freshness: '청량',
  elegance: '우아',
  freedom: '자유',
  luxury: '럭셔리',
  purity: '순수',
  uniqueness: '유니크',
}

// 향 카테고리 한글 라벨
const SCENT_LABELS: Record<keyof ScentCategoryScores, string> = {
  citrus: '시트러스',
  floral: '플로럴',
  woody: '우디',
  musky: '머스크',
  fruity: '프루티',
  spicy: '스파이시',
}

// 퍼스널 컬러 한글
const SEASON_LABELS: Record<string, string> = {
  spring: '봄 웜톤',
  summer: '여름 쿨톤',
  autumn: '가을 웜톤',
  winter: '겨울 쿨톤',
}

export function PrintableReport({ analysis, feedback, userProfile }: PrintableReportProps) {
  const analysisData = analysis.analysis_data
  const traits = analysisData.traits
  const scentCategories = analysisData.scentCategories
  const personalColor = analysisData.personalColor
  const dominantColors = analysisData.dominantColors || []
  const matchingPerfume = analysisData.matchingPerfumes?.[0]
  const isOffline = analysis.service_mode === 'offline'

  // 확정 향수 정보 (오프라인은 피드백 기반, 온라인은 초기 추천)
  const finalPerfumeName = isOffline && feedback?.perfume_name
    ? feedback.perfume_name
    : analysis.perfume_name

  // 특성 정렬 (높은 순)
  const sortedTraits = useMemo(() => {
    return Object.entries(traits)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }, [traits])

  // 향 카테고리 정렬 (높은 순)
  const sortedScents = useMemo(() => {
    return Object.entries(scentCategories)
      .sort(([, a], [, b]) => b - a)
  }, [scentCategories])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <>
      {/* 프린트 스타일 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            width: 100%;
            height: 100%;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* 보고서 컨테이너 */}
      <div className="print-container bg-white min-h-screen p-4 print:p-0">
        <div className="max-w-[297mm] mx-auto bg-white">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center border-2 border-slate-900">
                <span className="text-slate-900 font-bold text-sm">AC</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">AC'SCENT IDENTITY</h1>
                <p className="text-sm text-slate-600">향수 분석 보고서</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-slate-900">{analysis.idol_name || analysis.twitter_name}</p>
              <p className="text-sm text-slate-500">{formatDate(analysis.created_at)}</p>
            </div>
          </div>

          {/* 메인 콘텐츠 (2컬럼) */}
          <div className="grid grid-cols-2 gap-6">
            {/* 왼쪽: 최애 분석 */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 bg-slate-100 px-3 py-2 rounded-lg border-2 border-slate-900">
                최애 분석
              </h2>

              {/* 레이더 차트 (정적 SVG) */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">특성 프로필</h3>
                <div className="flex items-start gap-4">
                  {/* 간단한 레이더 차트 대체 - 바 차트 */}
                  <div className="flex-1 space-y-2">
                    {sortedTraits.map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-16 text-xs text-slate-600">
                          {TRAIT_LABELS[key as keyof TraitScores]}
                        </span>
                        <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${value * 10}%` }}
                          />
                        </div>
                        <span className="w-6 text-xs font-medium text-slate-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 키워드 */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">매칭 키워드</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.matching_keywords?.slice(0, 8).map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full border border-yellow-300"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* 퍼스널 컬러 */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">퍼스널 컬러</h3>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {personalColor?.palette?.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-lg border border-slate-200"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {SEASON_LABELS[personalColor?.season || ''] || personalColor?.season}
                    </p>
                    <p className="text-xs text-slate-500">{personalColor?.tone}</p>
                  </div>
                </div>
              </div>

              {/* 도미넌트 컬러 */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">이미지 컬러</h3>
                <div className="flex gap-2">
                  {dominantColors.slice(0, 5).map((color, idx) => (
                    <div key={idx} className="text-center">
                      <div
                        className="w-10 h-10 rounded-lg border-2 border-slate-200 mb-1"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] text-slate-500 font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 향 정보 */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 bg-yellow-400 px-3 py-2 rounded-lg border-2 border-slate-900">
                {isOffline ? '확정 향수' : '추천 향수'}
              </h2>

              {/* 향수 정보 */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl border-2 border-slate-900"
                    style={{ backgroundColor: matchingPerfume?.persona?.primaryColor || '#FEF9C3' }}
                  />
                  <div>
                    <p className="font-bold text-xl text-slate-900">{finalPerfumeName}</p>
                    <p className="text-slate-600">{analysis.perfume_brand}</p>
                  </div>
                </div>
                {matchingPerfume && (
                  <p className="text-sm text-slate-600">
                    매칭 점수: <span className="font-medium">{Math.round((matchingPerfume.score || 0) * 100)}%</span>
                  </p>
                )}
              </div>

              {/* 향 노트 */}
              {matchingPerfume?.persona && (
                <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">향 노트</h3>
                  <div className="space-y-3">
                    {matchingPerfume.persona.mainScent && (
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">TOP</span>
                        <span className="text-slate-900">{matchingPerfume.persona.mainScent.name}</span>
                      </div>
                    )}
                    {matchingPerfume.persona.subScent1 && (
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-xs font-medium text-pink-600 bg-pink-50 px-2 py-1 rounded">HEART</span>
                        <span className="text-slate-900">{matchingPerfume.persona.subScent1.name}</span>
                      </div>
                    )}
                    {matchingPerfume.persona.subScent2 && (
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">BASE</span>
                        <span className="text-slate-900">{matchingPerfume.persona.subScent2.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 향 카테고리 프로필 */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">향 카테고리</h3>
                <div className="space-y-2">
                  {sortedScents.map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-16 text-xs text-slate-600">
                        {SCENT_LABELS[key as keyof ScentCategoryScores]}
                      </span>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full"
                          style={{ width: `${value * 10}%` }}
                        />
                      </div>
                      <span className="w-6 text-xs font-medium text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 커스텀 레시피 (오프라인 전용) */}
              {isOffline && feedback?.generated_recipe && (
                <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-purple-800 mb-3">커스텀 레시피</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {feedback.generated_recipe.granules?.map((granule, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-2 text-center border border-purple-200">
                        <p className="text-xs font-medium text-slate-900 truncate">{granule.name}</p>
                        <p className="text-lg font-bold text-purple-700">{granule.drops}</p>
                        <p className="text-[10px] text-slate-500">방울</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-purple-600 text-center">
                    총 {feedback.generated_recipe.totalDrops}방울 | 잔향률 {feedback.retention_percentage}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 푸터 */}
          <div className="mt-6 pt-3 border-t-2 border-slate-200 flex items-center justify-between text-sm text-slate-500">
            <span>AC'SCENT IDENTITY - 당신의 최애를 위한 향수</span>
            <span>Report ID: {analysis.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    </>
  )
}
