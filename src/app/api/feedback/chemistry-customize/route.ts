import { NextRequest, NextResponse } from 'next/server'
import { getModelWithConfig, withTimeout } from '@/lib/gemini/client'
import { buildChemistryTastePrompt } from '@/lib/gemini/chemistry-feedback-prompt'
import { getApiLocale } from '@/lib/api-locale'
import type { ChemistryTasteData, ChemistryRecipeResult, GeneratedRecipe } from '@/types/feedback'

interface RequestBody {
  taste: ChemistryTasteData & { satisfied?: boolean; retention?: number }
  tasteB?: ChemistryTasteData & { satisfied?: boolean; retention?: number }
  perfumeA: { id: string; name: string; characteristics: Record<string, number> }
  perfumeB: { id: string; name: string; characteristics: Record<string, number> }
  characterAName: string
  characterBName: string
}

// 레시피 보정 (drops=10, ratio=100, 원본 유지율 강제)
function correctRecipe(
  recipe: GeneratedRecipe,
  originalPerfumeId?: string,
  originalDrops?: number
): GeneratedRecipe {
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

  // 원본 향수 유지율 강제: 원본이 포함되어 있으면 drops를 originalDrops로 고정
  if (originalPerfumeId && typeof originalDrops === 'number' && originalDrops > 0 && originalDrops < 10) {
    const originalIdx = recipe.granules.findIndex(g => g.id === originalPerfumeId)
    if (originalIdx >= 0) {
      recipe.granules[originalIdx].drops = originalDrops
    }
  }

  // drops 합계를 10으로 맞춤 — 원본은 고정, 나머지만 조정
  const totalDrops = recipe.granules.reduce((s, g) => s + g.drops, 0)
  if (totalDrops !== 10) {
    if (originalPerfumeId && typeof originalDrops === 'number') {
      // 원본은 고정, 나머지 향료들만 조정
      const others = recipe.granules.filter(g => g.id !== originalPerfumeId)
      const remainingTarget = 10 - originalDrops
      const othersSum = others.reduce((s, g) => s + g.drops, 0)
      if (othersSum > 0 && others.length > 0) {
        const scale = remainingTarget / othersSum
        let remaining = remainingTarget
        others.forEach((g, i) => {
          if (i < others.length - 1) { g.drops = Math.max(1, Math.round(g.drops * scale)); remaining -= g.drops }
          else g.drops = Math.max(1, remaining)
        })
      }
    } else {
      const scale = 10 / totalDrops
      let remaining = 10
      recipe.granules.forEach((g, i) => {
        if (i < recipe.granules.length - 1) { g.drops = Math.max(1, Math.round(g.drops * scale)); remaining -= g.drops }
        else g.drops = Math.max(1, remaining)
      })
    }
  }

  // ratio = drops * 10 (비례) 재계산 후 100으로 정규화
  const finalDropsSum = recipe.granules.reduce((s, g) => s + g.drops, 0) || 10
  let remainingRatio = 100
  recipe.granules.forEach((g, i) => {
    if (i < recipe.granules.length - 1) {
      g.ratio = Math.round((g.drops / finalDropsSum) * 100)
      remainingRatio -= g.ratio
    } else {
      g.ratio = Math.max(1, remainingRatio)
    }
  })

  recipe.totalDrops = 10
  recipe.estimatedStrength = recipe.estimatedStrength || 'medium'
  recipe.overallExplanation = recipe.overallExplanation || ''
  recipe.fanMessage = recipe.fanMessage || ''
  recipe.categoryChanges = recipe.categoryChanges || []
  recipe.testingInstructions = recipe.testingInstructions || { step1: '', step2: '', step3: '', caution: '' }
  return recipe
}

// retention → drops 변환 (10방울 기준)
function retentionToDrops(retention: number): number {
  const clamped = Math.max(10, Math.min(90, retention))
  return Math.max(1, Math.min(9, Math.round(clamped / 10)))
}

export async function POST(request: NextRequest) {
  const requestId = `CHEM-TASTE-${Date.now()}`

  try {
    const locale = getApiLocale(request)
    const body: RequestBody = await request.json()
    const { taste, tasteB, perfumeA, perfumeB, characterAName, characterBName } = body

    if (!taste || !perfumeA || !perfumeB) {
      return NextResponse.json({ success: false, error: '필수 데이터 누락' }, { status: 400 })
    }

    console.log(`[${requestId}] 케미 취향 레시피 생성 시작`)

    const prompt = buildChemistryTastePrompt(
      taste,
      tasteB || taste,
      perfumeA,
      perfumeB,
      characterAName,
      characterBName,
      locale
    )
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

    // 원본 유지율 drops 계산
    const retentionA = typeof taste.retention === 'number' ? taste.retention : 70
    const retentionB = typeof (tasteB?.retention) === 'number' ? tasteB!.retention! : 70
    const dropsA = retentionToDrops(retentionA)
    const dropsB = retentionToDrops(retentionB)

    // 4개 레시피 파싱 (A1, A2, B1, B2) — 원본 유지율 강제 적용
    const recipeA1 = correctRecipe(parsed.recipeA1, perfumeA.id, dropsA)
    const recipeA2 = correctRecipe(parsed.recipeA2, perfumeA.id, dropsA)
    const recipeB1 = correctRecipe(parsed.recipeB1, perfumeB.id, dropsB)
    const recipeB2 = correctRecipe(parsed.recipeB2, perfumeB.id, dropsB)

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
