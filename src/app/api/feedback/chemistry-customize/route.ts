import { NextRequest, NextResponse } from 'next/server'
import { getModelWithConfig, withTimeout } from '@/lib/gemini/client'
import { buildChemistryTastePrompt } from '@/lib/gemini/chemistry-feedback-prompt'
import { getApiLocale } from '@/lib/api-locale'
import type { ChemistryTasteData, ChemistryRecipeResult, GeneratedRecipe } from '@/types/feedback'

interface RequestBody {
  taste: ChemistryTasteData
  perfumeA: { id: string; name: string; characteristics: Record<string, number> }
  perfumeB: { id: string; name: string; characteristics: Record<string, number> }
  characterAName: string
  characterBName: string
}

// 레시피 보정 (drops=10, ratio=100, 음수 방지)
function correctRecipe(recipe: GeneratedRecipe): GeneratedRecipe {
  if (!recipe?.granules?.length) {
    return { granules: [], overallExplanation: '', categoryChanges: [], testingInstructions: { step1: '', step2: '', step3: '', caution: '' }, fanMessage: '', totalDrops: 10, estimatedStrength: 'medium' }
  }

  recipe.granules = recipe.granules.map(g => ({
    ...g,
    id: g.id || '',
    name: g.name || '',
    mainCategory: g.mainCategory || '',
    drops: Math.max(1, Math.round(Number(g.drops) || 3)),
    ratio: Math.max(1, Math.round(Number(g.ratio) || 33)),
    reason: g.reason || '',
    fanComment: g.fanComment || '',
  }))

  // drops 비례 분배
  const totalDrops = recipe.granules.reduce((s, g) => s + g.drops, 0)
  if (totalDrops !== 10) {
    const scale = 10 / totalDrops
    let remaining = 10
    recipe.granules.forEach((g, i) => {
      if (i < recipe.granules.length - 1) { g.drops = Math.max(1, Math.round(g.drops * scale)); remaining -= g.drops }
      else g.drops = Math.max(1, remaining)
    })
  }

  // ratio 비례 분배
  const totalRatio = recipe.granules.reduce((s, g) => s + g.ratio, 0)
  if (totalRatio !== 100) {
    const scale = 100 / totalRatio
    let remaining = 100
    recipe.granules.forEach((g, i) => {
      if (i < recipe.granules.length - 1) { g.ratio = Math.max(1, Math.round(g.ratio * scale)); remaining -= g.ratio }
      else g.ratio = Math.max(1, remaining)
    })
  }

  recipe.totalDrops = 10
  recipe.estimatedStrength = recipe.estimatedStrength || 'medium'
  recipe.overallExplanation = recipe.overallExplanation || ''
  recipe.fanMessage = recipe.fanMessage || ''
  recipe.categoryChanges = recipe.categoryChanges || []
  recipe.testingInstructions = recipe.testingInstructions || { step1: '', step2: '', step3: '', caution: '' }
  return recipe
}

export async function POST(request: NextRequest) {
  const requestId = `CHEM-TASTE-${Date.now()}`

  try {
    const locale = getApiLocale(request)
    const body: RequestBody = await request.json()
    const { taste, perfumeA, perfumeB, characterAName, characterBName } = body

    if (!taste || !perfumeA || !perfumeB) {
      return NextResponse.json({ success: false, error: '필수 데이터 누락' }, { status: 400 })
    }

    console.log(`[${requestId}] 케미 취향 레시피 생성 시작`)

    const prompt = buildChemistryTastePrompt(taste, perfumeA, perfumeB, characterAName, characterBName, locale)
    const model = getModelWithConfig({ maxOutputTokens: 10240, temperature: 0.7 })

    const apiResult = await withTimeout(
      model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      60000,
      'Chemistry taste recipe generation timed out'
    )

    const responseText = apiResult.response.text()
    console.log(`[${requestId}] 응답 길이: ${responseText.length}`)

    // Balanced-braces JSON 추출
    let jsonStr = ''
    let braceCount = 0
    let started = false
    for (let i = 0; i < responseText.length; i++) {
      if (responseText[i] === '{') { started = true; braceCount++ }
      if (started) jsonStr += responseText[i]
      if (responseText[i] === '}') { braceCount--; if (braceCount === 0 && started) break }
    }
    if (!jsonStr) throw new Error('JSON not found in response')

    const parsed = JSON.parse(jsonStr)

    // 4개 레시피 파싱 (A1, A2, B1, B2)
    const recipeA1 = correctRecipe(parsed.recipeA1)
    const recipeA2 = correctRecipe(parsed.recipeA2)
    const recipeB1 = correctRecipe(parsed.recipeB1)
    const recipeB2 = correctRecipe(parsed.recipeB2)

    // ChemistryRecipeResult 형태로 반환 (1안 = recipeA/B, 2안은 별도)
    const result = {
      recipeA1,
      recipeA2,
      recipeB1,
      recipeB2,
      layeringNote: parsed.layeringNote || '',
      pairExplanation: parsed.pairExplanation || '',
    }

    console.log(`[${requestId}] 완료`)
    return NextResponse.json({ success: true, result })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[${requestId}] 에러:`, msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
