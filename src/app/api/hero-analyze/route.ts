import { NextRequest, NextResponse } from 'next/server'
import { getModel, withTimeout } from '@/lib/gemini/client'
import { getApiLocale } from '@/lib/api-locale'
import { getHeroAnalyzeLocaleInstruction } from '@/lib/gemini/locale-prompt-wrapper'

const HERO_ANALYZE_PROMPT = `당신은 이미지를 분석하여 향수 레시피를 추천하는 전문가입니다.
사용자가 업로드한 이미지를 분석하고, 아래 형식의 JSON을 반환하세요.

**중요**: 이것은 티저/미리보기입니다. 최종 레시피는 알려주지 마세요!

규칙:
1. 이미지의 분위기, 색감, 느낌을 분석
2. 10가지 성격/매력 축에 대해 1-10 점수 부여
3. 이미지에서 느껴지는 키워드를 해시태그로 추출 (5-7개)
4. 어울리는 향료 계열을 힌트로 제공 (구체적 레시피 X)
5. 한국어로 작성

반환할 JSON:
{
  "radarScores": {
    "귀여움": 5,
    "섹시함": 3,
    "럭셔리함": 7,
    "순수함": 4,
    "자유로움": 8,
    "카리스마": 6,
    "다크함": 2,
    "우아함": 5,
    "청량함": 9,
    "독특함": 7
  },
  "hashtags": ["#여름감성", "#청량함", "#자유로움", "#레트로", "#활기참"],
  "fragranceHints": [
    { "name": "시트러스", "score": 8, "emoji": "🍋", "color": "yellow" },
    { "name": "프루티", "score": 6, "emoji": "🍎", "color": "red" },
    { "name": "플로럴", "score": 3, "emoji": "🌸", "color": "pink" },
    { "name": "우디", "score": 4, "emoji": "🌳", "color": "amber" },
    { "name": "머스크", "score": 2, "emoji": "✨", "color": "purple" },
    { "name": "스파이시", "score": 3, "emoji": "🌶️", "color": "orange" }
  ],
  "mainFragrance": { "name": "시트러스", "emoji": "🍋" },
  "teaser": "상큼하고 청량한 향이 어울리는 이미지네요!"
}

색상 옵션: yellow, red, pink, amber, purple, orange, green, blue, teal
향료는 점수 높은 순으로 정렬해서 반환하세요.`

export async function POST(request: NextRequest) {
    try {
        const locale = getApiLocale(request)
        const { imageBase64 } = await request.json()

        if (!imageBase64) {
            return NextResponse.json(
                { success: false, error: '이미지가 필요합니다.' },
                { status: 400 }
            )
        }

        const base64Data = imageBase64.includes(',')
            ? imageBase64.split(',')[1]
            : imageBase64

        const model = getModel()

        // Add locale-specific language instruction to prompt
        const localizedPrompt = HERO_ANALYZE_PROMPT + getHeroAnalyzeLocaleInstruction(locale)

        const result = await withTimeout(
            model.generateContent([
                { text: localizedPrompt },
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: base64Data
                    }
                }
            ]),
            20000,
            '분석 시간이 초과되었습니다.'
        )

        const response = result.response
        const text = response.text()

        let analysisResult
        try {
            analysisResult = JSON.parse(text)
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                analysisResult = JSON.parse(jsonMatch[0])
            } else {
                throw new Error('분석 결과를 파싱할 수 없습니다.')
            }
        }

        // fragranceHints를 점수순 정렬
        if (analysisResult.fragranceHints) {
            analysisResult.fragranceHints.sort((a: { score: number }, b: { score: number }) => b.score - a.score)
        }

        return NextResponse.json({
            success: true,
            data: analysisResult
        })

    } catch (error) {
        console.error('[hero-analyze] Error:', error)

        // 폴백 응답
        return NextResponse.json({
            success: true,
            data: {
                radarScores: {
                    "귀여움": 7,
                    "섹시함": 4,
                    "럭셔리함": 5,
                    "순수함": 6,
                    "자유로움": 8,
                    "카리스마": 5,
                    "다크함": 3,
                    "우아함": 6,
                    "청량함": 7,
                    "독특함": 6
                },
                hashtags: ["#매력적", "#자유로움", "#청량함", "#반전매력", "#특별함"],
                fragranceHints: [
                    { name: "시트러스", score: 7, emoji: "🍋", color: "yellow" },
                    { name: "프루티", score: 6, emoji: "🍎", color: "red" },
                    { name: "플로럴", score: 4, emoji: "🌸", color: "pink" },
                    { name: "우디", score: 4, emoji: "🌳", color: "amber" },
                    { name: "머스크", score: 3, emoji: "✨", color: "purple" },
                    { name: "스파이시", score: 2, emoji: "🌶️", color: "orange" }
                ],
                mainFragrance: { name: "시트러스", emoji: "🍋" },
                teaser: "이 이미지에 어울리는 특별한 향이 있어요! 💕"
            },
            fallback: true
        })
    }
}
