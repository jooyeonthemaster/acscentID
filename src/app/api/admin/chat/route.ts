import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import { initializeGemini, withTimeout } from '@/lib/gemini/client'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

async function getAdminEmail(): Promise<string | null> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email && ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase())) {
    return kakaoSession.user.email
  }
  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return user.email
  }
  return null
}

// ============================================
// DB 스키마 가져오기 (캐시)
// ============================================
let schemaCache: string | null = null
let schemaCacheTime = 0
const SCHEMA_CACHE_TTL = 5 * 60 * 1000 // 5분

async function getDbSchema(supabase: any): Promise<string> {
  if (schemaCache && Date.now() - schemaCacheTime < SCHEMA_CACHE_TTL) {
    return schemaCache
  }

  const { data, error } = await supabase.rpc('get_schema_info')

  if (error) {
    // fallback: 직접 information_schema 조회
    const { data: tables } = await supabase
      .from('information_schema.columns' as any)
      .select('table_name, column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .order('table_name')
      .order('ordinal_position')

    if (!tables) return '스키마 정보를 가져올 수 없습니다.'

    const grouped: Record<string, string[]> = {}
    for (const col of tables) {
      if (!grouped[col.table_name]) grouped[col.table_name] = []
      grouped[col.table_name].push(`  ${col.column_name} (${col.data_type}${col.is_nullable === 'NO' ? ', NOT NULL' : ''})`)
    }

    schemaCache = Object.entries(grouped)
      .map(([table, cols]) => `${table}:\n${cols.join('\n')}`)
      .join('\n\n')
    schemaCacheTime = Date.now()
    return schemaCache
  }

  schemaCache = data as string
  schemaCacheTime = Date.now()
  return schemaCache!
}

// information_schema를 직접 SQL로 조회하는 함수
async function getDbSchemaViaSql(supabase: any): Promise<string> {
  if (schemaCache && Date.now() - schemaCacheTime < SCHEMA_CACHE_TTL) {
    return schemaCache
  }

  // Supabase의 execute_sql 대신 직접 테이블 목록 조회
  const { data: tableList, error: tableError } = await supabase
    .from('perfume_feedbacks')
    .select('id')
    .limit(0)

  // 하드코딩된 스키마 정보 (가장 안정적)
  schemaCache = getHardcodedSchema()
  schemaCacheTime = Date.now()
  return schemaCache
}

function getHardcodedSchema(): string {
  return `## 데이터베이스 테이블 스키마 (실제 DB 기준)

### user_profiles (사용자 프로필, ~669건)
  id (uuid, PK), email (text), name (text), avatar_url (text),
  provider (text: 가입 방식 - kakao|''|mock|reviewer. 회원 가입 경로 분석 시 이 컬럼 사용),
  kakao_id (text: 카카오 고유 ID, provider가 빈문자열이어도 kakao_id가 있으면 카카오 가입자),
  fingerprint (text),
  auth_provider (text: 사용 안 함, 전부 NULL),
  referral_code (varchar), referred_by (uuid),
  created_at (timestamptz), updated_at (timestamptz)

### analysis_results (AI 이미지 분석 결과, ~1475건)
  id (uuid, PK), created_at (timestamptz), user_image_url (text),
  analysis_data (jsonb: 분석 결과 전체, radar_scores 등 포함),
  twitter_name (text: 분석된 캐릭터/아이돌 이름 - "캐릭터명" 역할),
  perfume_name (text: AI가 추천한 향수 이름),
  perfume_brand (text), matching_keywords (text[]),
  user_id (uuid), user_fingerprint (text), view_count (int),
  idol_name (text: 아이돌 이름), idol_gender (varchar: male|female),
  product_type (varchar: idol_image|figure_diffuser|graduation - 프로그램 유형),
  service_mode (varchar: online|offline), qr_code_id (varchar),
  pin (varchar), locale (varchar: ko|en|ja|zh|es),
  modeling_image_url (text), modeling_request (text),
  modeling_submitted_at (timestamptz)

### perfume_feedbacks (향수 피드백, ~759건)
  id (uuid, PK), created_at (timestamptz), result_id (uuid, FK→analysis_results),
  perfume_id (text), perfume_name (text), retention_percentage (int, 0-100),
  category_preferences (jsonb), specific_scents (jsonb: [{id,name,ratio}]),
  notes (text), natural_language_feedback (text),
  generated_recipe (jsonb), user_fingerprint (text),
  selected_recipe_type (varchar: user_direct|ai_recommended|original),
  selected_product (varchar), user_id (uuid), updated_at (timestamptz)

### orders (주문, ~25건) ★매출 분석 핵심 테이블
  id (uuid, PK), order_number (text), user_id (text),
  perfume_name (text), perfume_brand (text), size (text),
  price (int: 단가), original_price (int), final_price (int: 최종 결제액),
  subtotal (int), discount_amount (int), shipping_fee (int),
  item_count (int), product_type (varchar),
  recipient_name (text), phone (text), zip_code (text),
  address (text), address_detail (text), memo (text),
  status (text: pending|paid|preparing|shipped|delivered|cancelled),
  payment_method (varchar), payment_id (varchar),
  pg_provider (varchar), pg_tx_id (varchar),
  paid_at (timestamptz), receipt_url (text),
  refund_amount (int), refunded_at (timestamptz), refund_reason (text),
  cancel_requested_at (timestamptz),
  user_image_url (text), keywords (text[]), analysis_data (jsonb),
  analysis_id (uuid), user_coupon_id (uuid),
  confirmed_recipe (jsonb), admin_memo (text),
  is_influencer (boolean: true면 매출 집계 제외),
  created_at (timestamptz), updated_at (timestamptz)

### order_items (주문 항목, ~11건)
  id (uuid, PK), order_id (uuid, FK→orders), analysis_id (uuid),
  product_type (varchar), perfume_name (varchar), perfume_brand (varchar),
  twitter_name (varchar), size (varchar),
  unit_price (int), quantity (int), subtotal (int),
  image_url (text), analysis_data (jsonb), created_at (timestamptz)

### cart_items (장바구니, ~227건)
  id (uuid, PK), user_id (text), analysis_id (uuid),
  product_type (varchar), perfume_name (varchar), perfume_brand (varchar),
  twitter_name (varchar), size (varchar),
  price (int), quantity (int),
  image_url (text), analysis_data (jsonb),
  created_at (timestamptz), updated_at (timestamptz)

### reviews (리뷰, ~25건)
  id (uuid, PK), created_at (timestamptz), updated_at (timestamptz),
  user_id (uuid), program_type (text), order_id (uuid),
  rating (int, 1-5), content (text),
  idol_name (text), option_info (text),
  is_verified (boolean), helpful_count (int)

### review_images (리뷰 이미지, ~15건)
  id (uuid, PK), review_id (uuid, FK→reviews), image_url (text),
  order_index (int), created_at (timestamptz)

### review_likes (리뷰 좋아요)
  id (uuid, PK), user_id (uuid), review_id (uuid), created_at (timestamptz)

### coupons (쿠폰, ~4건)
  id (uuid, PK), code (varchar), type (varchar), discount_percent (int),
  title (varchar), description (text),
  valid_from (timestamptz), valid_until (timestamptz),
  is_active (boolean), created_at (timestamptz)

### user_coupons (사용자 쿠폰)
  id (uuid, PK), user_id (uuid), coupon_id (uuid),
  claimed_at (timestamptz), used_at (timestamptz), is_used (boolean),
  birthday_proof_type (varchar), birthday_idol_name (varchar),
  used_order_id (uuid)

### referral_rewards (추천 보상)
  id (uuid, PK), referrer_id (uuid), referred_id (uuid),
  referrer_coupon_id (uuid), referred_coupon_id (uuid), created_at (timestamptz)

### qr_codes (QR 코드, ~6건)
  id (uuid, PK), code (varchar), product_type (varchar),
  service_mode (varchar), name (varchar), location (varchar),
  is_active (boolean), scan_count (int), analysis_count (int),
  custom_url (text), created_at (timestamptz), updated_at (timestamptz)

### fragrance_inventory (향료 재고, 30건)
  id (uuid, PK), fragrance_id (varchar), fragrance_name (varchar),
  category (varchar), online_stock_ml (numeric), offline_stock_ml (numeric),
  min_threshold_ml (numeric),
  created_at (timestamptz), updated_at (timestamptz), updated_by (varchar)

### fragrance_inventory_logs (재고 변동 로그, ~729건)
  id (uuid, PK), fragrance_id (varchar),
  change_type (varchar: add|deduct|adjust|initial),
  source (varchar: online|offline),
  change_amount_ml (numeric), resulting_stock_ml (numeric),
  reference_type (varchar), reference_id (varchar),
  note (text), created_at (timestamptz), created_by (varchar)

### analytics_sessions (방문 세션, ~7101건)
  id (uuid, PK), session_id (text), user_id (uuid),
  user_agent (text), device_type (text), browser (text), os (text),
  country (text), city (text),
  referrer (text), referrer_domain (text),
  utm_source (text), utm_medium (text), utm_campaign (text),
  utm_term (text), utm_content (text),
  landing_page (text), page_views_count (int), events_count (int),
  started_at (timestamptz), last_activity_at (timestamptz)

### analytics_page_views (페이지뷰, ~21842건)
  id (uuid, PK), session_id (text), user_id (uuid),
  page_path (text), page_title (text), page_url (text),
  previous_page (text), time_on_page (int),
  viewed_at (timestamptz)

### analytics_events (이벤트)
  id (uuid, PK), session_id (text), user_id (uuid),
  event_name (text), event_category (text), event_data (jsonb),
  page_path (text), created_at (timestamptz)

### analytics_daily_stats (일별 통계)
  id (uuid, PK), date (date), unique_visitors (int),
  total_sessions (int), total_page_views (int), total_events (int),
  avg_session_duration (int), avg_pages_per_session (numeric),
  bounce_rate (numeric), mobile_sessions (int),
  desktop_sessions (int), tablet_sessions (int), updated_at (timestamptz)

### custom_recipes (커스텀 레시피)
  id (uuid, PK), user_id (uuid), analysis_id (uuid),
  original_recipe (jsonb), feedback (text),
  custom_recipe (jsonb), created_at (timestamptz)

### feedback_ai_analyses (AI 피드백 분석)
  id (uuid, PK), created_at (timestamptz),
  analysis_period_start (date), analysis_period_end (date),
  total_feedbacks_analyzed (int), sentiment_summary (jsonb),
  model_used (text), raw_feedbacks_sample (jsonb), created_by (text)

## 테이블 관계
- analysis_results.id → perfume_feedbacks.result_id
- orders.id → order_items.order_id
- orders.id → reviews.order_id
- reviews.id → review_images.review_id
- coupons.id → user_coupons.coupon_id

## ★★★ 비즈니스 플로우 (반드시 이해하고 쿼리 작성할 것) ★★★

사용자 방문(analytics_sessions) → 이미지 업로드 → AI 분석(analysis_results, 향수 추천)
→ 피드백 작성(perfume_feedbacks, 잔향률/추가향료/자연어 피드백)
→ 레시피 확정(perfume_feedbacks.generated_recipe 업데이트)
→ 장바구니(cart_items) → 주문(orders + order_items) → 리뷰(reviews)

각 테이블은 퍼널의 서로 다른 단계를 나타냄. 같은 향수명이라도 테이블마다 의미가 다름:
- analysis_results.perfume_name = AI가 "추천한" 향수
- perfume_feedbacks.perfume_name = 피드백을 "남긴 대상" 향수 (= 추천받은 향수)
- perfume_feedbacks.specific_scents = 유저가 "추가 선택한" 향료들 (추천 향수와 별개)
- orders.perfume_name = 실제 "주문한" 향수
- cart_items.perfume_name = "장바구니에 담은" 향수

## ★★★ 질문 → 테이블 라우팅 규칙 (반드시 따를 것) ★★★

### 매출/주문 관련
- "매출", "수익", "결제", "일매출", "월매출" → orders 테이블
  - 금액: 반드시 final_price 사용 (price, subtotal, original_price 사용 금지)
  - final_price = 상품가 + 배송비 - 할인 = 최종 결제 금액
  - 필터: WHERE is_influencer = false AND status NOT IN ('cancelled', 'cancel_requested')
  - pending 상태도 매출에 포함 (주문 발생 = 매출)
  - 날짜: created_at 기준 (paid_at은 전부 NULL이므로 사용 금지)
- "주문 건수" → COUNT(*) FROM orders (주문 단위)
- "주문 상품 수" → order_items 테이블 (상품 단위, 1주문에 여러 상품 가능)
- "환불" → orders.refund_amount (실제 환불액)
- "인플루언서 주문" → is_influencer = true인 주문, 매출 집계 시 항상 제외

### 향수/추천 관련
- "추천", "추천 향수", "많이 추천된" → analysis_results.perfume_name
- "인기 향수" → 맥락 확인 후, 기본값은 analysis_results (추천 기준)
- "피드백", "사용자 반응", "잔향률" → perfume_feedbacks
- "추가 향료", "추가된 향" → perfume_feedbacks.specific_scents (JSONB 배열)
- "리뷰", "별점", "평점" → reviews 테이블 (구매 후 작성하는 리뷰)
- "레시피" → perfume_feedbacks.generated_recipe (확정된 레시피)
- ⚠️ "피드백"과 "리뷰"는 완전히 다른 테이블! 혼동 금지

### 사용자 관련
- "회원", "가입자", "회원 수" → user_profiles
- "가입 방식", "가입 경로" → user_profiles.provider (kakao|빈문자열|mock|reviewer)
  - ⚠️ auth_provider 컬럼은 전부 NULL, 절대 사용 금지
  - provider가 빈문자열('')이어도 kakao_id가 있으면 카카오 가입자
  - 실질적으로 거의 전원 카카오 가입 (kakao_id 존재 기준)
- "방문자", "트래픽" → analytics_sessions (세션 = 방문 1회)
- "페이지뷰", "조회수" → analytics_page_views
  - ⚠️ 방문자 수 ≠ 페이지뷰 수 (1방문에 여러 페이지 조회 가능, 보통 2-3배 차이)

### 분석 관련
- "분석 횟수", "이미지 분석" → analysis_results
- "캐릭터명", "분석된 이름" → analysis_results.twitter_name (character_name 아님!)
- "아이돌" → analysis_results.idol_name
- "프로그램 유형" → analysis_results.product_type (idol_image|figure_diffuser|graduation)
  - ⚠️ program_type 컬럼은 존재하지 않음

### 재고 관련
- "재고", "남은 향료" → fragrance_inventory (현재 재고 스냅샷)
  - online_stock_ml + offline_stock_ml = 총 재고
- "재고 변동", "소진 이력" → fragrance_inventory_logs

## ★★★ 절대 틀리면 안 되는 컬럼 매핑 ★★★

| 개념 | 정확한 컬럼 | 잘못된 컬럼 (사용 금지) |
|------|------------|----------------------|
| 매출 금액 | orders.final_price | orders.price, orders.subtotal, orders.original_price |
| 주문 날짜 | orders.created_at | orders.paid_at (전부 NULL) |
| 가입 방식 | user_profiles.provider | user_profiles.auth_provider (전부 NULL) |
| 캐릭터명 | analysis_results.twitter_name | character_name (컬럼 없음) |
| 프로그램 | analysis_results.product_type | program_type (컬럼 없음) |
| 항목 단가 | order_items.unit_price | order_items.price (컬럼 없음) |
| 방문자 수 | analytics_sessions COUNT | analytics_page_views COUNT (페이지뷰임) |
| 향수 추천 수 | analysis_results COUNT | perfume_feedbacks COUNT (피드백 수임) |

## ★ 날짜 처리 규칙 ★
- "이번 달" → DATE_TRUNC('month', NOW()) 이상
- "최근 N일" → NOW() - INTERVAL 'N days' 이상
- "일별" → created_at::date 또는 DATE_TRUNC('day', created_at)로 GROUP BY
- 타임존: 한국 시간 기준이므로 created_at AT TIME ZONE 'Asia/Seoul' 권장

## ★ 응답 일관성 규칙 ★
- 같은 대화 세션 내에서 동일한 질문에 대해 같은 테이블을 조회할 것
- 이전 답변에서 사용한 테이블과 다른 테이블을 사용해야 할 경우, 반드시 그 이유를 명시할 것
- 수치를 제시할 때 어느 테이블에서 가져온 데이터인지 항상 밝힐 것`
}


// ============================================
// GET: 세션 목록 + 메시지 조회
// ============================================
export async function GET(request: NextRequest) {
  try {
    const adminEmail = await getAdminEmail()
    if (!adminEmail) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    const supabase = await createServerSupabaseClientWithCookies()

    if (sessionId) {
      // 특정 세션의 메시지 조회
      const { data: messages, error } = await supabase
        .from('admin_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return NextResponse.json({ messages: messages || [] })
    }

    // 세션 목록 조회
    const { data: sessions, error } = await supabase
      .from('admin_chat_sessions')
      .select('*')
      .eq('created_by', adminEmail)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error('Chat GET error:', error)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

// ============================================
// POST: 메시지 전송 + AI 응답
// ============================================
export async function POST(request: NextRequest) {
  try {
    const adminEmail = await getAdminEmail()
    if (!adminEmail) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const { sessionId, message, action } = body

    const supabase = await createServerSupabaseClientWithCookies()

    // 세션 관리 액션
    if (action === 'create_session') {
      const { data, error } = await supabase
        .from('admin_chat_sessions')
        .insert({ title: body.title || '새 채팅', created_by: adminEmail })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ session: data })
    }

    if (action === 'rename_session') {
      const { error } = await supabase
        .from('admin_chat_sessions')
        .update({ title: body.title })
        .eq('id', sessionId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_session') {
      const { error } = await supabase
        .from('admin_chat_sessions')
        .update({ is_archived: true })
        .eq('id', sessionId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 메시지 처리
    if (!sessionId || !message) {
      return NextResponse.json({ error: '세션 ID와 메시지가 필요합니다' }, { status: 400 })
    }

    // 1. 사용자 메시지 저장
    await supabase
      .from('admin_chat_messages')
      .insert({ session_id: sessionId, role: 'user', content: message })

    // 2. 이전 대화 컨텍스트 가져오기 (최근 10개)
    const { data: history } = await supabase
      .from('admin_chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10)

    const chatHistory = (history || []).reverse()

    // 3. DB 스키마 가져오기
    const schema = await getDbSchemaViaSql(supabase)

    // 4. Gemini로 SQL 생성 + 분석
    const genAI = initializeGemini()
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    })

    // Step 1: SQL 생성
    const sqlPrompt = buildSqlPrompt(schema, chatHistory, message)
    const sqlResult = await withTimeout(
      model.generateContent(sqlPrompt),
      30000,
      'SQL 생성 시간 초과'
    )

    let sqlResponse: any
    try {
      sqlResponse = JSON.parse(sqlResult.response.text())
    } catch {
      // JSON 파싱 실패시 직접 응답
      const assistantMsg = {
        session_id: sessionId,
        role: 'assistant',
        content: '죄송합니다, 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.',
        sql_query: null,
        sql_result: null,
      }
      await supabase.from('admin_chat_messages').insert(assistantMsg)
      await supabase.from('admin_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId)
      return NextResponse.json({ response: assistantMsg })
    }

    let queryResults: any = null
    let sqlQuery: string | null = null

    if (sqlResponse.needs_sql && sqlResponse.sql_queries?.length > 0) {
      // SQL 실행 (최대 3개 쿼리)
      const results: any[] = []
      for (const q of sqlResponse.sql_queries.slice(0, 3)) {
        // SELECT만 허용
        const normalized = q.trim().toLowerCase()
        if (!normalized.startsWith('select') && !normalized.startsWith('with')) {
          results.push({ error: 'SELECT 쿼리만 허용됩니다', query: q })
          continue
        }

        // 세미콜론 제거 + 결과 제한 추가
        const cleaned = q.replace(/;\s*$/, '').trim()
        const limitedQuery = cleaned.toLowerCase().includes('limit')
          ? cleaned
          : `${cleaned} LIMIT 100`

        try {
          const { data, error } = await supabase.rpc('execute_readonly_sql', {
            query_text: limitedQuery
          })

          if (error) {
            // RPC가 없으면 직접 조회 시도 (테이블별)
            results.push({ error: error.message, query: limitedQuery })
          } else {
            results.push({ data, query: limitedQuery })
          }
        } catch (e: any) {
          results.push({ error: e.message, query: limitedQuery })
        }
      }

      queryResults = results
      sqlQuery = sqlResponse.sql_queries.join('\n\n')
    }

    // Step 2: 결과 해석 + 답변 생성
    const answerModel = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 4096,
      },
    })

    const answerPrompt = buildAnswerPrompt(message, sqlResponse, queryResults)
    const answerResult = await withTimeout(
      answerModel.generateContent(answerPrompt),
      30000,
      '답변 생성 시간 초과'
    )

    const answerText = answerResult.response.text()

    // 5. 어시스턴트 메시지 저장
    const assistantMsg = {
      session_id: sessionId,
      role: 'assistant',
      content: answerText,
      sql_query: sqlQuery,
      sql_result: queryResults ? JSON.stringify(queryResults).slice(0, 50000) : null,
    }

    await supabase.from('admin_chat_messages').insert(assistantMsg)

    // 세션 업데이트
    await supabase
      .from('admin_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({
      response: {
        content: answerText,
        sql_query: sqlQuery,
        sql_result: queryResults,
      },
    })
  } catch (error: any) {
    console.error('Chat POST error:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

// ============================================
// 프롬프트 빌더
// ============================================
function buildSqlPrompt(schema: string, history: any[], question: string): string {
  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? '관리자' : 'AI'}: ${m.content.slice(0, 200)}`)
    .join('\n')

  return `당신은 향수 커스터마이징 서비스 "AC'SCENT IDENTITY"의 데이터베이스 분석 전문가입니다.
관리자의 질문을 분석하고, 필요한 SQL 쿼리를 생성하세요.

${schema}

## 최근 대화
${historyText || '(첫 대화)'}

## 현재 질문
${question}

## 응답 형식 (JSON)
{
  "needs_sql": true/false,
  "sql_queries": ["SELECT ...", ...],
  "explanation": "이 쿼리들이 왜 필요한지 간단 설명",
  "direct_answer": "SQL 없이 바로 답변 가능한 경우 여기에 작성"
}

## 규칙
- SELECT 문만 생성 (INSERT/UPDATE/DELETE 절대 금지)
- 한 번에 최대 3개 쿼리
- 각 쿼리에 반드시 LIMIT 포함 (최대 100)
- JSONB 필드 조회 시 적절한 캐스팅 사용
- 날짜 필터링 시 timestamptz 형식 사용
- SQL이 필요없는 일반 질문이면 needs_sql: false로 direct_answer에 답변
- 쿼리 결과가 큰 경우 집계(COUNT, SUM, AVG 등) 활용
- SQL 끝에 세미콜론(;)을 절대 붙이지 말 것
- 여러 쿼리를 하나로 합칠 수 있으면 합쳐서 보내기`
}

function buildAnswerPrompt(question: string, sqlResponse: any, queryResults: any): string {
  const resultsText = queryResults
    ? JSON.stringify(queryResults, null, 2).slice(0, 10000)
    : sqlResponse.direct_answer || '데이터 없음'

  return `관리자가 "${question}"이라고 질문했습니다.

${sqlResponse.needs_sql ? `실행한 SQL:
${sqlResponse.sql_queries?.join('\n\n')}

쿼리 결과:
${resultsText}` : `직접 답변: ${sqlResponse.direct_answer}`}

위 데이터를 바탕으로 관리자에게 친절하고 명확하게 답변하세요.

## 답변 규칙
- 한국어로 답변
- 숫자는 천 단위 쉼표 표시 (예: 1,234)
- 금액은 원화 표시 (예: 150,000원)
- 비율은 소수점 1자리까지 (예: 34.5%)
- 가능하면 표 형태로 정리
- 핵심 인사이트를 먼저 말하고 세부 내용은 뒤에
- 마크다운 문법 사용 가능
- 데이터가 없거나 에러가 발생했으면 솔직하게 알려주고 대안 제시
- SQL 에러가 있으면 "다시 시도해주세요" 대신 무엇이 문제였는지 설명`
}
