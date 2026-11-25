// 영업용 데모 랜딩 — 같은 프로그램의 다른 판(영상판)을 기본판 바로 옆에 나란히 놓는 묶음(2026-11-25 사용자 지시).
// 한 묶음 = [기본판, …그 판들]. 판(variantOf)의 기본판이 같은 목록에 없으면 혼자 한 묶음.

export function withVariants<T extends { variantOf?: string }>(list: T[], key: (demo: T) => string): T[][] {
  const units = list.filter((demo) => !demo.variantOf).map((base) => [base, ...list.filter((demo) => demo.variantOf === key(base))])
  const placed = new Set(units.flat())
  for (const demo of list) if (!placed.has(demo)) units.push([demo])
  return units
}
