// 스킨케어 — 자가 체크(세안 뒤 느낌 · 관심 있는 관리)로 아침·저녁 루틴 순서를 정리한다.
// 사진으로 피부를 재거나 진단하지 않는다. 제품을 권하지 않는다 — 순서와 사용감만 정리해 준다.

export type SkinFeel = 'tight' | 'oily' | 'both' | 'calm'
export type SkinCare = 'moisture' | 'simple' | 'texture'
export type SkinTexture = 'light' | 'rich'
export type SkinStep = 'cleanse' | 'tone' | 'moisturize' | 'sunscreen' | 'soothe'
export type SkinTime = 'am' | 'pm'

export const SKIN_FEELS: SkinFeel[] = ['tight', 'oily', 'both', 'calm']
export const SKIN_CARES: SkinCare[] = ['moisture', 'simple', 'texture']

export interface SkinRoutine {
  steps: Record<SkinTime, SkinStep[]>
  texture: Record<SkinTime, SkinTexture>
  /** 루틴의 중심 — 결과 머리표에 쓴다 */
  focus: 'moisture' | 'balance' | 'keep'
  simple: boolean
}

export function buildRoutine(feel: SkinFeel, cares: SkinCare[]): SkinRoutine {
  const simple = cares.includes('simple')
  const moisture = cares.includes('moisture') || feel === 'tight'
  const am: SkinStep[] = simple ? ['cleanse', 'moisturize', 'sunscreen'] : ['cleanse', 'tone', 'moisturize', 'sunscreen']
  const pm: SkinStep[] = simple ? ['cleanse', 'moisturize'] : ['cleanse', 'tone', 'moisturize']
  // 당김이 있거나 보습에 관심이 있으면 저녁에 여유 있는 날의 단계를 하나 더한다(간단한 루틴을 고르면 뺀다)
  if (!simple && (moisture || feel === 'both')) pm.push('soothe')
  const texture: Record<SkinTime, SkinTexture> =
    feel === 'tight' ? { am: 'rich', pm: 'rich' }
      : feel === 'oily' ? { am: 'light', pm: 'light' }
        : feel === 'both' ? { am: 'light', pm: 'rich' }
          : { am: 'light', pm: moisture ? 'rich' : 'light' }
  return { steps: { am, pm }, texture, focus: moisture ? 'moisture' : feel === 'calm' ? 'keep' : 'balance', simple }
}
