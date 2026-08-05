import { SAJU_ELEMENT_INFO, type SajuElement } from '@/types/analysis'

/** analysis_data에서 제작 기준 용신 오행을 안전하게 읽는다. */
export function getSajuYongsinElement(analysisData: unknown): SajuElement | null {
  if (!analysisData || typeof analysisData !== 'object' || !('sajuChart' in analysisData)) return null

  const chart = (analysisData as { sajuChart?: { yongsin?: { element?: unknown } } }).sajuChart
  const element = chart?.yongsin?.element
  if (typeof element !== 'string' || !(element in SAJU_ELEMENT_INFO)) return null

  return element as SajuElement
}
