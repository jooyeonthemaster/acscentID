/**
 * 재고 자동 차감 유틸리티
 * 주문 결제 시 또는 오프라인 분석 완료 시 자동으로 재고를 차감합니다.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { GeneratedRecipe } from '@/types/feedback'
import {
  ExtractedGranule,
  extractGranulesFromRecipe,
  createSinglePerfumeRecipe,
  getFragranceVolume,
} from '@/lib/fragrance-usage'

// ============================================
// 타입 정의
// ============================================

export interface DeductionItem {
  fragranceId: string
  fragranceName: string
  category: string
  amountMl: number
}

export interface DeductionResult {
  success: boolean
  deducted: DeductionItem[]
  errors: string[]
}

export interface DeductionInput {
  finalRecipe: GeneratedRecipe | null
  perfumeName: string | null
  productType: string
  size: string
  quantity: number
}

// ============================================
// 향료 사용량 계산
// ============================================

/**
 * 레시피 또는 향수 이름에서 향료별 사용량 계산
 */
export function calculateFragranceUsage(input: DeductionInput): DeductionItem[] {
  const { finalRecipe, perfumeName, productType, size, quantity } = input

  // 레시피에서 향료 추출
  let granules: ExtractedGranule[] = extractGranulesFromRecipe(finalRecipe)

  // 레시피가 없으면 단일 향수로 처리
  if (granules.length === 0 && perfumeName) {
    granules = createSinglePerfumeRecipe(perfumeName)
  }

  if (granules.length === 0) {
    return []
  }

  // 제품 용량 계산
  const fragranceVolumeMl = getFragranceVolume(productType, size)

  // 향료별 사용량 계산
  const usageItems: DeductionItem[] = []

  for (const granule of granules) {
    const usageMl = (granule.ratio / 100) * fragranceVolumeMl * quantity
    usageItems.push({
      fragranceId: granule.id,
      fragranceName: granule.name,
      category: granule.category,
      amountMl: Math.round(usageMl * 100) / 100,
    })
  }

  return usageItems
}

// ============================================
// 재고 차감 실행
// ============================================

/**
 * 재고에서 향료 사용량 차감
 */
export async function deductFromInventory(
  supabase: SupabaseClient,
  items: DeductionItem[],
  source: 'online' | 'offline',
  referenceType: 'order' | 'analysis' | 'manual',
  referenceId: string,
  createdBy?: string
): Promise<DeductionResult> {
  const deducted: DeductionItem[] = []
  const errors: string[] = []

  if (items.length === 0) {
    return { success: true, deducted, errors }
  }

  // 각 향료별로 재고 차감
  for (const item of items) {
    if (item.amountMl <= 0) continue

    try {
      // 현재 재고 조회
      const { data: inventory, error: fetchError } = await supabase
        .from('fragrance_inventory')
        .select('*')
        .eq('fragrance_id', item.fragranceId)
        .single()

      if (fetchError) {
        // 재고 레코드가 없으면 생성
        if (fetchError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('fragrance_inventory')
            .insert({
              fragrance_id: item.fragranceId,
              fragrance_name: item.fragranceName,
              category: item.category,
              online_stock_ml: 0,
              offline_stock_ml: 0,
              min_threshold_ml: 50,
            })

          if (insertError) {
            errors.push(`${item.fragranceName}: 재고 생성 실패 - ${insertError.message}`)
            continue
          }
        } else {
          errors.push(`${item.fragranceName}: 재고 조회 실패 - ${fetchError.message}`)
          continue
        }
      }

      // 재고 차감 (음수가 될 수 있음 - 경고만 표시)
      const currentStock = source === 'online'
        ? Number(inventory?.online_stock_ml) || 0
        : Number(inventory?.offline_stock_ml) || 0
      const newStock = Math.round((currentStock - item.amountMl) * 100) / 100

      const updateData = source === 'online'
        ? { online_stock_ml: newStock, updated_at: new Date().toISOString(), updated_by: createdBy }
        : { offline_stock_ml: newStock, updated_at: new Date().toISOString(), updated_by: createdBy }

      const { error: updateError } = await supabase
        .from('fragrance_inventory')
        .update(updateData)
        .eq('fragrance_id', item.fragranceId)

      if (updateError) {
        errors.push(`${item.fragranceName}: 재고 업데이트 실패 - ${updateError.message}`)
        continue
      }

      // 변동 이력 기록
      await supabase
        .from('fragrance_inventory_logs')
        .insert({
          fragrance_id: item.fragranceId,
          change_type: 'deduct',
          source,
          change_amount_ml: -item.amountMl,
          resulting_stock_ml: newStock,
          reference_type: referenceType,
          reference_id: referenceId,
          note: `자동 차감 (${source === 'online' ? '온라인 주문' : '오프라인 분석'})`,
          created_by: createdBy,
        })

      deducted.push(item)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '알 수 없는 오류'
      errors.push(`${item.fragranceName}: ${errMsg}`)
    }
  }

  return {
    success: errors.length === 0,
    deducted,
    errors,
  }
}

// ============================================
// 주문 기반 재고 차감
// ============================================

/**
 * 주문의 모든 아이템에 대해 재고 차감
 */
export async function deductInventoryForOrder(
  supabase: SupabaseClient,
  orderId: string,
  createdBy?: string
): Promise<DeductionResult> {
  const allDeducted: DeductionItem[] = []
  const allErrors: string[] = []

  try {
    // 주문 아이템 조회
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*, analysis_id')
      .eq('order_id', orderId)

    if (itemsError) {
      return {
        success: false,
        deducted: [],
        errors: [`주문 아이템 조회 실패: ${itemsError.message}`],
      }
    }

    if (!orderItems || orderItems.length === 0) {
      // order_items가 없으면 orders 테이블에서 직접 조회 (단일 주문 호환)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        return {
          success: false,
          deducted: [],
          errors: ['주문 정보를 찾을 수 없습니다'],
        }
      }

      // 단일 주문 처리: analysis_data에서 final_recipe 추출
      const analysisData = order.analysis_data
      const finalRecipe = analysisData?.finalRecipe || analysisData?.final_recipe || null

      const usageItems = calculateFragranceUsage({
        finalRecipe,
        perfumeName: order.perfume_name,
        productType: order.product_type || 'image_analysis',
        size: order.size || '10ml',
        quantity: 1,
      })

      if (usageItems.length > 0) {
        const result = await deductFromInventory(
          supabase,
          usageItems,
          'online',
          'order',
          orderId,
          createdBy
        )
        allDeducted.push(...result.deducted)
        allErrors.push(...result.errors)
      }

      return {
        success: allErrors.length === 0,
        deducted: allDeducted,
        errors: allErrors,
      }
    }

    // 각 주문 아이템 처리
    for (const item of orderItems) {
      // analysis_id가 있으면 분석 결과에서 레시피 조회
      let finalRecipe = null
      if (item.analysis_id) {
        const { data: analysis } = await supabase
          .from('analysis_results')
          .select('final_recipe')
          .eq('id', item.analysis_id)
          .single()

        finalRecipe = analysis?.final_recipe
      }

      // analysis_data에서 레시피 찾기
      if (!finalRecipe && item.analysis_data) {
        finalRecipe = item.analysis_data.finalRecipe || item.analysis_data.final_recipe
      }

      const usageItems = calculateFragranceUsage({
        finalRecipe,
        perfumeName: item.perfume_name,
        productType: item.product_type || 'image_analysis',
        size: item.size || '10ml',
        quantity: item.quantity || 1,
      })

      if (usageItems.length > 0) {
        const result = await deductFromInventory(
          supabase,
          usageItems,
          'online',
          'order',
          orderId,
          createdBy
        )
        allDeducted.push(...result.deducted)
        allErrors.push(...result.errors)
      }
    }

    return {
      success: allErrors.length === 0,
      deducted: allDeducted,
      errors: allErrors,
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '알 수 없는 오류'
    return {
      success: false,
      deducted: allDeducted,
      errors: [...allErrors, `주문 처리 실패: ${errMsg}`],
    }
  }
}

// ============================================
// 분석 결과 기반 재고 차감
// ============================================

/**
 * 오프라인 분석 결과에 대해 재고 차감
 */
export async function deductInventoryForAnalysis(
  supabase: SupabaseClient,
  analysisId: string,
  analysisData: {
    finalRecipe?: GeneratedRecipe | null
    perfumeName?: string
    productType?: string
  },
  createdBy?: string
): Promise<DeductionResult> {
  const finalRecipe = analysisData.finalRecipe || null

  const usageItems = calculateFragranceUsage({
    finalRecipe,
    perfumeName: analysisData.perfumeName || null,
    productType: analysisData.productType || 'image_analysis',
    size: '10ml', // 오프라인은 기본 10ml 퍼퓸
    quantity: 1,
  })

  if (usageItems.length === 0) {
    return { success: true, deducted: [], errors: [] }
  }

  return deductFromInventory(
    supabase,
    usageItems,
    'offline',
    'analysis',
    analysisId,
    createdBy
  )
}
