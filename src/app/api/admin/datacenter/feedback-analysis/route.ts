import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import { getModel, withTimeout } from '@/lib/gemini/client'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email,
    }
  }

  const supabase = await createServerSupabaseClientWithCookies()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
      email: user.email,
    }
  }

  return { isAdmin: false, email: null }
}

// ============================================
// GET: 저장된 분석 이력 조회
// ============================================
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClientWithCookies()

    const { data, error } = await supabase
      .from('feedback_ai_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching analyses:', error)
      return NextResponse.json({ error: '분석 이력 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ analyses: data || [] })
  } catch (error) {
    console.error('Error in feedback-analysis GET:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// ============================================
// POST: 새 Gemini 분석 실행
// ============================================
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const { dateFrom, dateTo } = body as { dateFrom?: string; dateTo?: string }

    const supabase = await createServerSupabaseClientWithCookies()

    // 분석 기간 설정
    const periodEnd = dateTo || new Date().toISOString().split('T')[0]
    const periodStart = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 해당 기간의 자연어 피드백 조회
    let allFeedbacks: any[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('perfume_feedbacks')
        .select('natural_language_feedback, created_at, perfume_name, retention_percentage, specific_scents')
        .not('natural_language_feedback', 'is', null)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd + 'T23:59:59')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error('Error fetching feedbacks for analysis:', error)
        return NextResponse.json({ error: '피드백 데이터 조회 실패' }, { status: 500 })
      }

      if (!data || data.length === 0) break
      allFeedbacks = allFeedbacks.concat(data)
      if (data.length < pageSize) break
      page++
    }

    if (allFeedbacks.length === 0) {
      return NextResponse.json({
        error: '해당 기간에 자연어 피드백이 없습니다',
      }, { status: 404 })
    }

    // 피드백 텍스트 준비 (최대 500개 샘플링)
    const feedbackSample = allFeedbacks.slice(0, 500)
    const feedbackTexts = feedbackSample.map((fb, idx) => {
      const scents = fb.specific_scents as any[] | null
      const scentNames = scents?.map((s: any) => `${s.name}(${s.ratio}%)`).join(', ') || '없음'
      return `[${idx + 1}] 향수: ${fb.perfume_name} | 잔향률: ${fb.retention_percentage}% | 추가향료: ${scentNames} | 피드백: "${fb.natural_language_feedback}"`
    }).join('\n')

    // Gemini 프롬프트 구성
    const prompt = buildAnalysisPrompt(feedbackTexts, allFeedbacks.length, periodStart, periodEnd)

    // Gemini 호출
    const model = getModel()
    const result = await withTimeout(
      model.generateContent(prompt),
      90000,
      'Gemini 분석 시간이 초과되었습니다'
    )

    const responseText = result.response.text()
    let sentimentSummary: any

    try {
      sentimentSummary = JSON.parse(responseText)
    } catch {
      console.error('Failed to parse Gemini response:', responseText)
      return NextResponse.json({ error: 'AI 분석 결과 파싱 실패' }, { status: 500 })
    }

    // DB에 저장
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('feedback_ai_analyses')
      .insert({
        analysis_period_start: periodStart,
        analysis_period_end: periodEnd,
        total_feedbacks_analyzed: allFeedbacks.length,
        sentiment_summary: sentimentSummary,
        model_used: 'gemini-3-flash-preview',
        raw_feedbacks_sample: feedbackSample.slice(0, 20).map((fb) => ({
          text: fb.natural_language_feedback,
          perfume: fb.perfume_name,
          date: fb.created_at,
        })),
        created_by: adminCheck.email,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving analysis:', saveError)
      // 저장 실패해도 분석 결과는 반환
      return NextResponse.json({
        analysis: {
          sentiment_summary: sentimentSummary,
          total_feedbacks_analyzed: allFeedbacks.length,
          analysis_period_start: periodStart,
          analysis_period_end: periodEnd,
          created_at: new Date().toISOString(),
        },
        saved: false,
      })
    }

    return NextResponse.json({
      analysis: savedAnalysis,
      saved: true,
    })
  } catch (error) {
    console.error('Error in feedback-analysis POST:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// ============================================
// Gemini 분석 프롬프트
// ============================================
function buildAnalysisPrompt(feedbackTexts: string, totalCount: number, periodStart: string, periodEnd: string): string {
  return `당신은 향수 커스터마이징 서비스 "AC'SCENT IDENTITY"의 고객 피드백 감성 분석 전문가입니다.

아래는 ${periodStart} ~ ${periodEnd} 기간 동안 수집된 고객 자연어 피드백 ${totalCount}건 중 샘플입니다.
각 피드백에는 고객이 추천받은 향수, 잔향률(원래 향수를 얼마나 유지할지), 추가한 향료, 그리고 자유롭게 작성한 텍스트 피드백이 포함됩니다.

## 분석 대상 피드백
${feedbackTexts}

## 분석 요청사항
위 피드백을 종합적으로 감성 분석하여 다음 JSON 구조로 반환하세요.
하드코딩된 키워드 매칭이 아닌, 실제 피드백 내용을 깊이 이해하고 맥락을 파악하여 분석하세요.

{
  "overall_sentiment": "positive" | "negative" | "mixed",
  "sentiment_score": (0-100, 전체적인 긍정 점수),
  "executive_summary": "(3-5문장으로 전체 피드백 트렌드 요약. 관리자가 한 눈에 파악할 수 있도록)",

  "key_themes": [
    {
      "theme": "(테마/주제명)",
      "count": (관련 피드백 수 추정),
      "sentiment": "positive" | "negative" | "neutral",
      "description": "(이 테마에 대한 설명과 구체적인 고객 의견 요약)",
      "representative_quotes": ["(대표 인용문 1-2개)"]
    }
  ],

  "emotions": [
    {
      "emotion": "(감정 이름 - 예: 설렘, 만족, 아쉬움, 기대, 호기심 등)",
      "percentage": (전체 중 비율 추정),
      "description": "(이 감정이 어떤 맥락에서 나타나는지)"
    }
  ],

  "user_desires": [
    {
      "desire": "(고객이 원하는 것)",
      "frequency": "high" | "medium" | "low",
      "examples": ["(구체적 사례 1-2개)"],
      "actionable_insight": "(이 니즈에 대응할 수 있는 실질적 제안)"
    }
  ],

  "scent_preferences": [
    {
      "scent_type": "(향 계열 또는 특성)",
      "sentiment": "positive" | "negative" | "mixed",
      "mentions": (언급 횟수 추정),
      "context": "(어떤 맥락에서 이 향이 언급되는지)"
    }
  ],

  "improvement_suggestions": [
    {
      "area": "(개선 영역)",
      "suggestion": "(구체적 제안)",
      "urgency": "high" | "medium" | "low",
      "evidence": "(이 제안의 근거가 되는 피드백 요약)"
    }
  ],

  "seasonal_trends": {
    "current_preference": "(현재 시즌에 선호되는 향 경향)",
    "description": "(계절/시기에 따른 트렌드 설명)"
  },

  "word_cloud_data": [
    {
      "word": "(단어/표현)",
      "weight": (1-100, 중요도/빈도 가중치),
      "sentiment": "positive" | "negative" | "neutral"
    }
  ]
}

## 주의사항
- 모든 텍스트는 한국어로 작성
- key_themes는 5-8개, emotions는 4-6개, user_desires는 3-5개, scent_preferences는 5-8개
- improvement_suggestions는 2-4개
- word_cloud_data는 20-30개 단어 (실제 피드백에서 자주 등장하는 표현 + AI가 분석한 핵심 개념)
- 정량적 수치(count, percentage, mentions)는 전체 ${totalCount}건 기준으로 추정
- 피드백이 없는 주제는 만들어내지 말 것
- executive_summary는 비즈니스 의사결정에 도움이 되도록 핵심 인사이트 중심으로 작성`
}
