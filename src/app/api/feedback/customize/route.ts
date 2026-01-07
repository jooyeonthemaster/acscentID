import { NextRequest, NextResponse } from 'next/server'
import { getModel, withTimeout } from '@/lib/gemini/client'
import {
  buildRecipePrompt,
  buildRetryPrompt,
  extractJsonFromResponse,
  validatePerfumeIds,
  validateRecipe,
} from '@/lib/gemini/feedback-prompt'
import { PerfumeFeedback, GeneratedRecipe, RecipeGranule } from '@/types/feedback'
import { perfumes, getPerfumeById } from '@/data/perfumes'

const MAX_RETRIES = 1
const TIMEOUT_MS = 60000 // 60초

interface RecipeRequest {
  feedback: PerfumeFeedback
  originalPerfume: {
    id: string
    name: string
    characteristics: Record<string, number>
    category: string
  }
  characterName?: string // 분석된 캐릭터 이름
  naturalLanguageFeedback?: string // 자연어 피드백 (Step 3)
}

export async function POST(request: NextRequest) {
  const requestId = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`[${requestId}] Recipe generation request received`)

  try {
    const body = (await request.json()) as RecipeRequest
    const { feedback, originalPerfume, characterName, naturalLanguageFeedback } = body

    // 유효성 검사
    if (!feedback || !originalPerfume) {
      console.log(`[${requestId}] Validation failed: missing data`)
      return NextResponse.json(
        { success: false, error: '피드백 데이터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    if (!feedback.perfumeId || !feedback.perfumeName) {
      console.log(`[${requestId}] Validation failed: missing perfume info`)
      return NextResponse.json(
        { success: false, error: '향수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 100% 잔향률인 경우 원본 그대로 반환 (레시피 생성 불필요)
    if (feedback.retentionPercentage === 100) {
      console.log(`[${requestId}] 100% retention - returning original perfume`)
      const originalData = getPerfumeById(originalPerfume.id)

      const recipe: GeneratedRecipe = {
        granules: [
          {
            id: originalPerfume.id,
            name: originalPerfume.name,
            mainCategory: originalPerfume.category,
            drops: 10,
            ratio: 100,
            reason: `원래 향수가 완벽해서 그대로 유지! 💯 ${originalPerfume.name} 진짜 갓벽이라 건들 게 없어요 ㄹㅇ... ✨`,
            fanComment: `이미 완벽한 향수를 가지고 계시네요?! 진짜 실화냐... 😭💕`,
          },
        ],
        overallExplanation: `헐 잔향률 100%라고요?? 😍🔥 ${originalPerfume.name} 향수 진짜 찐으로 마음에 드셨나봐요! 완벽한 조합은 건들 필요 없죠 ㄹㅇ... 그대로 사용하시면 됩니다! 💯✨`,
        categoryChanges: [],
        testingInstructions: {
          step1: '🌸 원래 향수 그대로 사용하시면 됩니다!',
          step2: '✨ 손목이나 귀 뒤에 살짝 뿌려주세요',
          step3: '💕 나가서 모두의 시선을 사로잡으세요!',
          caution: '이미 갓벽인데 뭘 조심해요 ㅋㅋ 자신감만 챙기세요! 😎',
        },
        fanMessage: `우와 진짜 취향 갓벽이시다... 🫠💀 ${originalPerfume.name} 선택하신 센스 레전드예요!! 우리 애한테 이 향 뿌리면 입덕 각 바로 나옵니다 ㄹㅇ 💯🔥✨`,
        totalDrops: 10,
        estimatedStrength: 'strong',
      }

      return NextResponse.json({ success: true, recipe })
    }

    // 프롬프트 생성 (캐릭터 이름 + 자연어 피드백 포함)
    let prompt = buildRecipePrompt(feedback, originalPerfume, characterName, naturalLanguageFeedback)
    console.log(`[${requestId}] Prompt built, calling Gemini API...`)

    let recipe: GeneratedRecipe | null = null
    let lastError: string = ''
    let retryCount = 0

    while (retryCount <= MAX_RETRIES && !recipe) {
      try {
        const model = getModel()
        const result = await withTimeout(
          model.generateContent(prompt),
          TIMEOUT_MS,
          '레시피 생성 시간이 초과되었습니다.'
        )

        const responseText = result.response.text()
        console.log(`[${requestId}] Gemini response received (attempt ${retryCount + 1})`)

        // JSON 추출
        const jsonStr = extractJsonFromResponse(responseText)
        let parsed: unknown

        try {
          parsed = JSON.parse(jsonStr)
        } catch (parseError) {
          console.error(`[${requestId}] JSON parse error:`, parseError)
          lastError = 'JSON 파싱 실패'
          retryCount++
          prompt = buildRetryPrompt(prompt, 'JSON 형식이 올바르지 않습니다.', [])
          continue
        }

        // 레시피 유효성 검사
        const recipeValidation = validateRecipe(parsed)
        if (!recipeValidation.valid) {
          console.error(`[${requestId}] Recipe validation failed:`, recipeValidation.errors)
          lastError = recipeValidation.errors.join(', ')
          retryCount++
          prompt = buildRetryPrompt(prompt, lastError, [])
          continue
        }

        const parsedRecipe = parsed as GeneratedRecipe

        // 향수 ID 유효성 검사
        const granuleIds = parsedRecipe.granules.map((g) => g.id)
        const idValidation = validatePerfumeIds(granuleIds)

        if (!idValidation.valid) {
          console.error(`[${requestId}] Invalid perfume IDs:`, idValidation.invalidIds)
          lastError = `잘못된 향수 ID: ${idValidation.invalidIds.join(', ')}`
          retryCount++
          prompt = buildRetryPrompt(prompt, lastError, idValidation.invalidIds)
          continue
        }

        // 향수 이름 검증 및 수정
        parsedRecipe.granules = parsedRecipe.granules.map((granule) => {
          const perfumeData = getPerfumeById(granule.id)
          if (perfumeData) {
            return {
              ...granule,
              name: perfumeData.name, // 정확한 이름으로 교정
              mainCategory: perfumeData.category,
            }
          }
          return granule
        })

        // 🚨 drops 합계를 정확히 10으로 보정
        const TARGET_DROPS = 10
        let currentDropsTotal = parsedRecipe.granules.reduce(
          (sum, g) => sum + (g.drops || 0),
          0
        )

        if (currentDropsTotal !== TARGET_DROPS && currentDropsTotal > 0) {
          // 비율에 맞게 재분배
          const sortedByRatio = [...parsedRecipe.granules].sort((a, b) => b.ratio - a.ratio)

          // 1차: floor로 재계산
          parsedRecipe.granules = parsedRecipe.granules.map(g => ({
            ...g,
            drops: Math.max(1, Math.floor((g.ratio / 100) * TARGET_DROPS))
          }))

          // 2차: 나머지 분배
          currentDropsTotal = parsedRecipe.granules.reduce((sum, g) => sum + g.drops, 0)
          const remaining = TARGET_DROPS - currentDropsTotal

          if (remaining > 0) {
            for (let i = 0; i < remaining; i++) {
              const targetId = sortedByRatio[i % sortedByRatio.length].id
              const granule = parsedRecipe.granules.find(g => g.id === targetId)
              if (granule) granule.drops += 1
            }
          } else if (remaining < 0) {
            // 초과 시 가장 큰 것에서 빼기
            for (let i = 0; i < Math.abs(remaining); i++) {
              const targetId = sortedByRatio[i % sortedByRatio.length].id
              const granule = parsedRecipe.granules.find(g => g.id === targetId)
              if (granule && granule.drops > 1) granule.drops -= 1
            }
          }
        }

        // 총 drops 계산
        parsedRecipe.totalDrops = TARGET_DROPS

        // 강도 추정 (10방울은 medium)
        parsedRecipe.estimatedStrength = 'medium'

        recipe = parsedRecipe
        console.log(`[${requestId}] Recipe generated successfully with ${recipe.granules.length} granules`)
      } catch (error) {
        console.error(`[${requestId}] Gemini API error (attempt ${retryCount + 1}):`, error)
        lastError = error instanceof Error ? error.message : 'API 호출 실패'
        retryCount++

        if (retryCount <= MAX_RETRIES) {
          prompt = buildRetryPrompt(prompt, lastError, [])
        }
      }
    }

    if (!recipe) {
      console.error(`[${requestId}] Recipe generation failed after ${MAX_RETRIES + 1} attempts`)
      return NextResponse.json(
        {
          success: false,
          error: `레시피 생성에 실패했습니다: ${lastError}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, recipe })
  } catch (error) {
    console.error(`[${requestId}] API error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
