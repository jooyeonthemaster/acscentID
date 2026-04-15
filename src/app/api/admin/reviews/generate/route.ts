import { NextResponse } from 'next/server'
import { getModelWithConfig } from '@/lib/gemini/client'

const PROGRAM_LABELS: Record<string, string> = {
  idol_image: 'AI 이미지 분석 퍼퓸 (좋아하는 아이돌/캐릭터 사진으로 맞춤 향수 제작)',
  figure: '피규어 화분 디퓨저 (좋아하는 이미지로 3D 피규어 화분 + 디퓨저 제작)',
  chemistry_set: '케미 향수 세트 (커플/친구 케미 분석 후 향수 2개 제작)',
  graduation: '졸업 기념 퍼퓸 (졸업 사진으로 기념 향수 제작)',
  personal: '퍼스널 센트 (개인 취향 분석 맞춤 향수)',
  'le-quack': 'LE QUACK 시그니처 향수',
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { programType, count = 3, style = 'natural' } = body

    const programLabel = PROGRAM_LABELS[programType] || programType

    const styleGuide = style === 'enthusiastic'
      ? '열정적이고 감탄이 많은 톤. 이모티콘(ㅎㅎ, ㅠㅠ, ㅋㅋ 등) 자주 사용.'
      : style === 'calm'
        ? '차분하고 담백한 톤. 간결하게 핵심만 전달.'
        : '자연스러운 한국어 구어체. 적당히 감정 표현.'

    const model = getModelWithConfig({ maxOutputTokens: 2000 })

    const result = await model.generateContent(`다음 상품에 대한 실제 구매자 리뷰 ${count}개를 JSON 배열로 생성해줘.

상품: ${programLabel}

조건:
- ${styleGuide}
- 각 리뷰는 1~3문장으로 자연스럽게
- 별점은 4~5점 사이 (가끔 3점도 OK)
- 리뷰어 이름은 한국식 성+이름 2~3글자 (예: 김민지, 이서준, 박하늘)
- idol_image 상품인 경우 idol_name에 실제 K-pop 아이돌 이름 포함 (다양하게)
- 내용은 향, 패키징, 만족도, 재구매 의향 등 다양한 관점

JSON 형식:
[
  {
    "reviewer_name": "김민지",
    "rating": 5,
    "content": "리뷰 내용",
    "idol_name": "아이돌이름 또는 null"
  }
]

JSON 배열만 반환해. 다른 텍스트 없이.`)

    const responseText = result.response.text()
    if (!responseText) {
      return NextResponse.json({ error: 'AI 응답 없음' }, { status: 500 })
    }

    // JSON 파싱 (코드블록 제거)
    let jsonStr = responseText.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const reviews = JSON.parse(jsonStr)
    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('[Admin Reviews Generate] Error:', error)
    return NextResponse.json(
      { error: '리뷰 생성 실패' },
      { status: 500 }
    )
  }
}
