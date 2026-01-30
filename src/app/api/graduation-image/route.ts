import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ===== 과거 스타일 → 배경 스타일/질감 매핑 =====
const PAST_STYLE_BACKGROUNDS: Record<string, string> = {
  'active': 'vibrant outdoor sports field with blue sky, dynamic energy, morning sunlight',
  'quiet': 'cozy library corner with warm wooden shelves, soft natural light through windows',
  'diligent': 'classic study room with neat bookshelves, clean desk, organized atmosphere',
  'artistic': 'creative art studio with colorful paint splashes, canvas and brushes visible in background',
  'athletic': 'sunny athletics track or gymnasium, energetic and sporty atmosphere',
  'bookworm': 'grand vintage library with tall bookshelves, leather chairs, warm lamp light',
  'social': 'lively campus courtyard with trees and benches, friendly gathering space',
  'unique': 'abstract artistic background with geometric patterns, creative and unconventional'
}

// ===== 현재 감정 → 조명/분위기 매핑 =====
const CURRENT_FEELING_LIGHTING: Record<string, string> = {
  'excited': 'bright golden hour lighting, warm and hopeful, sparkling highlights',
  'nostalgic': 'soft sepia-toned vintage lighting, gentle and dreamy, film-like quality',
  'proud': 'dramatic studio lighting with golden accents, triumphant and glorious',
  'anxious': 'soft diffused lighting with cool undertones, gentle and reassuring',
  'grateful': 'warm sunset lighting with amber tones, peaceful and heartfelt',
  'hopeful': 'bright morning light with rainbow prism effects, optimistic and fresh',
  'bittersweet': 'soft pink and lavender twilight lighting, romantic and wistful',
  'determined': 'strong directional lighting with bold contrast, confident and powerful'
}

// ===== 미래 꿈 → 배경 요소/소품 매핑 =====
const FUTURE_DREAM_ELEMENTS: Record<string, string> = {
  'career': 'modern city skyline silhouette in background, professional achievement symbols',
  'startup': 'futuristic tech office elements, innovation and creativity symbols',
  'study_abroad': 'world map or globe subtly visible, international landmark silhouettes',
  'travel': 'adventure elements like compass, distant mountains, open horizons',
  'self_improvement': 'ascending stairs or mountain peak symbolism, growth elements',
  'volunteer': 'nature elements with helping hands motif, community and warmth',
  'relationship': 'soft romantic elements, flowers and hearts subtly incorporated',
  'challenge': 'dynamic upward movement elements, stars and achievement symbols'
}

// 사용자 응답 기반 맞춤 프롬프트 생성
interface GraduationPromptData {
  graduationType: string
  pastStyles?: string[]
  currentFeeling?: string
  futureDreams?: string[]
  gender?: string
}

function getGraduationStylePrompt(data: GraduationPromptData): string {
  const { graduationType, pastStyles = [], currentFeeling = '', futureDreams = [], gender = '' } = data

  // 졸업 유형별 기본 스타일
  const graduationTypeMap: Record<string, string> = {
    '초등학교': 'elementary',
    '중학교': 'middle',
    '고등학교': 'high',
    '대학교': 'university',
    '대학원': 'graduate'
  }
  const typeKey = graduationTypeMap[graduationType] || 'university'

  // 과거 스타일 → 배경 결정 (첫 번째 선택 우선)
  const pastStyle = pastStyles[0] || 'diligent'
  const backgroundStyle = PAST_STYLE_BACKGROUNDS[pastStyle] || PAST_STYLE_BACKGROUNDS['diligent']

  // 현재 감정 → 조명 결정
  const lightingStyle = CURRENT_FEELING_LIGHTING[currentFeeling] || CURRENT_FEELING_LIGHTING['proud']

  // 미래 꿈 → 배경 요소 결정 (첫 번째 선택 우선)
  const futureDream = futureDreams[0] || 'career'
  const backgroundElements = FUTURE_DREAM_ELEMENTS[futureDream] || FUTURE_DREAM_ELEMENTS['career']

  // 졸업 유형별 의상
  const gownStyles: Record<string, string> = {
    'elementary': 'cute elementary graduation outfit with small cap',
    'middle': 'smart middle school graduation attire',
    'high': 'classic high school graduation gown with honors',
    'university': 'elegant university graduation gown with mortarboard cap and tassel',
    'graduate': 'distinguished doctoral or masters gown with hood'
  }
  const gownStyle = gownStyles[typeKey]

  // 성별에 따른 미세 조정
  const genderHint = gender === 'Female' ? 'feminine elegance' : gender === 'Male' ? 'masculine confidence' : 'balanced elegance'

  const prompt = `Create a stunning Korean graduation portrait photo of this exact person.

=== ABSOLUTE REQUIREMENTS (DO NOT VIOLATE) ===
- PRESERVE THE EXACT FACE: Keep their face shape, eyes, nose, mouth, eyebrows, skin tone, and hair style EXACTLY THE SAME as the reference image.
- The person MUST be 100% recognizable as the same person in the reference image.
- DO NOT alter, modify, or "improve" any facial features whatsoever.
- DO NOT change the person's ethnicity, age appearance, or fundamental look.

=== CUSTOM BACKGROUND (Based on their school life) ===
${backgroundStyle}

=== LIGHTING & MOOD (Based on their current feelings) ===
${lightingStyle}

=== BACKGROUND ELEMENTS (Based on their future dreams) ===
${backgroundElements}

=== GRADUATION ATTIRE ===
${gownStyle}
Style hint: ${genderHint}

=== COMPOSITION ===
- Professional portrait composition (head and shoulders or 3/4 body)
- 3:4 portrait aspect ratio
- High quality, celebratory graduation photo
- The background should be clearly visible and meaningful
- Harmonious blend of all elements creating a unique, personalized graduation portrait

=== IMPORTANT ===
This graduation photo should tell THEIR story - their past school life reflected in the background atmosphere, their current emotions in the lighting, and their future dreams in the symbolic elements. Each combination should produce a distinctly different result.`

  return prompt
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      originalImageBase64,
      graduationType = '대학교',
      pastStyles = [],
      currentFeeling = '',
      futureDreams = [],
      gender = ''
    } = body

    if (!originalImageBase64) {
      return NextResponse.json(
        { success: false, error: '이미지가 필요합니다.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[Graduation Image] GEMINI_API_KEY not set')
      return NextResponse.json(
        { success: false, error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    // Gemini 3 Pro Image Preview 모델 사용 (참조 이미지 기반 이미지 생성)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        // @ts-expect-error - Gemini 3 Pro Image 설정
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '3:4',
          imageSize: '1K'
        }
      },
    })

    // base64에서 데이터 부분만 추출
    const base64Data = originalImageBase64.replace(/^data:image\/\w+;base64,/, '')

    // 사용자 응답 기반 맞춤 프롬프트 생성
    const prompt = getGraduationStylePrompt({
      graduationType,
      pastStyles,
      currentFeeling,
      futureDreams,
      gender
    })

    console.log(`[Graduation Image] Processing with personalized prompt`)
    console.log(`[Graduation Image] Past: ${pastStyles.join(', ')} | Feeling: ${currentFeeling} | Future: ${futureDreams.join(', ')}`)

    // Gemini 3 Pro에 참조 이미지와 프롬프트 전송
    // 참조 이미지 기능을 활용하여 인물의 얼굴을 유지
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      },
    ])

    const response = await result.response

    // candidates에서 이미지 데이터 확인
    const candidates = response.candidates
    let generatedImageBase64: string | null = null

    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts || []
      for (const part of parts) {
        // inline_data가 있는 경우 (이미지 생성됨)
        if ('inlineData' in part && part.inlineData?.data) {
          generatedImageBase64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
          console.log('[Graduation Image] Successfully generated transformed image with Gemini 3 Pro')
          break
        }
      }
    }

    if (generatedImageBase64) {
      return NextResponse.json({
        success: true,
        transformedImageBase64: generatedImageBase64,
        message: '졸업사진 스타일로 변환되었습니다!'
      })
    }

    // 텍스트 응답 확인 (이미지가 생성되지 않은 경우)
    let textResponse = ''
    try {
      textResponse = response.text()
    } catch {
      textResponse = ''
    }

    // 이미지가 생성되지 않은 경우
    console.log('[Graduation Image] No image generated, text response:', textResponse)
    return NextResponse.json({
      success: false,
      error: '이미지 생성에 실패했습니다.',
      analysis: textResponse,
      message: '현재 이미지 변환 기능이 제한되어 있습니다. 원본 이미지로 진행합니다.'
    })

  } catch (error) {
    console.error('[Graduation Image] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '이미지 변환 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
