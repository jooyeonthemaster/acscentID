// ============================================================
// 사주 결과 페이지 배럴 — /result?type=saju (UI-SPEC §5)
// SajuResultPage가 유일한 외부 진입점이다(ChemistryResultRouter가 렌더).
// 섹션 prop 계약은 sections/types.ts (SSOT).
// ============================================================

export { default as SajuResultPage } from './SajuResultPage';
export { GoldDust } from './GoldDust';
export * from './sections/types';
