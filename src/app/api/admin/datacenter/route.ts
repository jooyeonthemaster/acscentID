import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

// 관리자 인증 확인
async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email
    }
  }

  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
      email: user.email
    }
  }

  return { isAdmin: false, email: null }
}

// 프로그램 타입 정의
const PROGRAM_TYPES = ['idol_image', 'figure', 'graduation'] as const
type ProgramType = typeof PROGRAM_TYPES[number]

interface CountItem {
  name: string
  count: number
}

interface ProgramStats {
  totalAnalyses: number
  perfumeCounts: CountItem[]
  keywordCounts: CountItem[]
  nameCounts: CountItem[]       // 분석 대상 이름 통계
  genderCounts: CountItem[]     // 성별 통계
}

// 프로그램 타입 매핑 (DB 값 -> 표시용)
const programTypeMapping: Record<string, ProgramType> = {
  'image_analysis': 'idol_image',
  'idol_image': 'idol_image',
  'figure_diffuser': 'figure',
  'figure': 'figure',
  'graduation': 'graduation',
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') // 'json' | 'csv'
    const programFilter = searchParams.get('program') // 특정 프로그램만

    const supabase = await createServerSupabaseClientWithCookies()

    // 모든 분석 결과 조회
    const { data: analyses, error } = await supabase
      .from('analysis_results')
      .select('id, created_at, product_type, perfume_name, matching_keywords, idol_name, twitter_name, analysis_data')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching analyses:', error)
      return NextResponse.json({ error: '데이터를 불러오는데 실패했습니다' }, { status: 500 })
    }

    // CSV/엑셀 다운로드 요청인 경우
    if (format === 'csv') {
      return generateCSV(analyses || [], programFilter)
    }

    // 프로그램별 통계 집계
    const statsByProgram: Record<string, ProgramStats> = {}

    // 초기화
    for (const programType of PROGRAM_TYPES) {
      statsByProgram[programType] = {
        totalAnalyses: 0,
        perfumeCounts: [],
        keywordCounts: [],
        nameCounts: [],
        genderCounts: [],
      }
    }

    // 임시 집계 객체
    const perfumeCountsTemp: Record<string, Record<string, number>> = {}
    const keywordCountsTemp: Record<string, Record<string, number>> = {}
    const nameCountsTemp: Record<string, Record<string, number>> = {}
    const genderCountsTemp: Record<string, Record<string, number>> = {}

    for (const programType of PROGRAM_TYPES) {
      perfumeCountsTemp[programType] = {}
      keywordCountsTemp[programType] = {}
      nameCountsTemp[programType] = {}
      genderCountsTemp[programType] = {}
    }

    // 데이터 집계
    for (const analysis of analyses || []) {
      const rawType = analysis.product_type || 'idol_image'
      const programType = programTypeMapping[rawType] || 'idol_image'

      if (!PROGRAM_TYPES.includes(programType as ProgramType)) continue

      statsByProgram[programType].totalAnalyses++

      // 향수 이름 집계
      const perfumeName = analysis.perfume_name
      if (perfumeName) {
        perfumeCountsTemp[programType][perfumeName] =
          (perfumeCountsTemp[programType][perfumeName] || 0) + 1
      }

      // 키워드 집계
      const keywords = analysis.matching_keywords as string[] | null
      if (keywords && Array.isArray(keywords)) {
        for (const keyword of keywords) {
          if (keyword && typeof keyword === 'string') {
            const trimmedKeyword = keyword.trim()
            if (trimmedKeyword) {
              keywordCountsTemp[programType][trimmedKeyword] =
                (keywordCountsTemp[programType][trimmedKeyword] || 0) + 1
            }
          }
        }
      }

      // 분석 대상 이름 집계 (idol_name)
      const idolName = analysis.idol_name
      if (idolName && typeof idolName === 'string') {
        const trimmedName = idolName.trim()
        if (trimmedName) {
          nameCountsTemp[programType][trimmedName] =
            (nameCountsTemp[programType][trimmedName] || 0) + 1
        }
      }

      // 성별 집계 (analysis_data에서 추출)
      const analysisData = analysis.analysis_data as Record<string, unknown> | null
      // analysis_data 또는 input_data에서 gender 추출 시도
      let gender: string | null = null
      if (analysisData) {
        // 다양한 위치에서 gender 찾기
        if (typeof analysisData.gender === 'string') {
          gender = analysisData.gender
        } else if (analysisData.inputData && typeof (analysisData.inputData as Record<string, unknown>).gender === 'string') {
          gender = (analysisData.inputData as Record<string, unknown>).gender as string
        } else if (analysisData.formData && typeof (analysisData.formData as Record<string, unknown>).gender === 'string') {
          gender = (analysisData.formData as Record<string, unknown>).gender as string
        }
      }

      if (gender) {
        const genderLabel = gender === 'male' ? '남성' : gender === 'female' ? '여성' : gender === 'other' ? '기타' : gender
        genderCountsTemp[programType][genderLabel] =
          (genderCountsTemp[programType][genderLabel] || 0) + 1
      }
    }

    // 정렬하여 최종 결과 생성
    for (const programType of PROGRAM_TYPES) {
      statsByProgram[programType].perfumeCounts = Object.entries(perfumeCountsTemp[programType])
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      statsByProgram[programType].keywordCounts = Object.entries(keywordCountsTemp[programType])
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      statsByProgram[programType].nameCounts = Object.entries(nameCountsTemp[programType])
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      statsByProgram[programType].genderCounts = Object.entries(genderCountsTemp[programType])
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    }

    // 전체 통계 계산
    const totalStats: ProgramStats = {
      totalAnalyses: 0,
      perfumeCounts: [],
      keywordCounts: [],
      nameCounts: [],
      genderCounts: [],
    }

    const totalPerfumeCounts: Record<string, number> = {}
    const totalKeywordCounts: Record<string, number> = {}
    const totalNameCounts: Record<string, number> = {}
    const totalGenderCounts: Record<string, number> = {}

    for (const programType of PROGRAM_TYPES) {
      totalStats.totalAnalyses += statsByProgram[programType].totalAnalyses

      for (const item of statsByProgram[programType].perfumeCounts) {
        totalPerfumeCounts[item.name] = (totalPerfumeCounts[item.name] || 0) + item.count
      }
      for (const item of statsByProgram[programType].keywordCounts) {
        totalKeywordCounts[item.name] = (totalKeywordCounts[item.name] || 0) + item.count
      }
      for (const item of statsByProgram[programType].nameCounts) {
        totalNameCounts[item.name] = (totalNameCounts[item.name] || 0) + item.count
      }
      for (const item of statsByProgram[programType].genderCounts) {
        totalGenderCounts[item.name] = (totalGenderCounts[item.name] || 0) + item.count
      }
    }

    totalStats.perfumeCounts = Object.entries(totalPerfumeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    totalStats.keywordCounts = Object.entries(totalKeywordCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    totalStats.nameCounts = Object.entries(totalNameCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    totalStats.genderCounts = Object.entries(totalGenderCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      byProgram: statsByProgram,
      total: totalStats,
    })
  } catch (error) {
    console.error('Error in datacenter API:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// CSV 생성 함수
function generateCSV(analyses: Array<Record<string, unknown>>, programFilter: string | null) {
  // 프로그램 필터 적용
  let filteredAnalyses = analyses
  if (programFilter && programFilter !== 'all') {
    filteredAnalyses = analyses.filter(a => {
      const rawType = (a.product_type as string) || 'idol_image'
      const programType = programTypeMapping[rawType] || 'idol_image'
      return programType === programFilter
    })
  }

  // CSV 헤더
  const headers = [
    '분석ID',
    '분석일시',
    '프로그램',
    '분석대상이름',
    '트위터이름',
    '추천향수',
    '키워드',
  ]

  // CSV 데이터 행
  const rows = filteredAnalyses.map(analysis => {
    const rawType = (analysis.product_type as string) || 'idol_image'
    const programType = programTypeMapping[rawType] || 'idol_image'
    const programLabel = programType === 'idol_image' ? 'AI이미지분석' :
                         programType === 'figure' ? '피규어디퓨저' : '졸업퍼퓸'

    const keywords = analysis.matching_keywords as string[] | null
    const keywordsStr = keywords ? keywords.join(', ') : ''

    return [
      analysis.id as string,
      new Date(analysis.created_at as string).toLocaleString('ko-KR'),
      programLabel,
      (analysis.idol_name as string) || '',
      (analysis.twitter_name as string) || '',
      (analysis.perfume_name as string) || '',
      keywordsStr,
    ]
  })

  // CSV 문자열 생성 (BOM 추가로 엑셀 한글 호환)
  const BOM = '\uFEFF'
  const csvContent = BOM + [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  // 파일명 생성
  const date = new Date().toISOString().split('T')[0]
  const filename = `분석데이터_${programFilter || 'all'}_${date}.csv`

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
}
