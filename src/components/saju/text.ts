// ============================================================
// 사주 텍스트 유틸 — §5.9/§7 slice 상한의 공용 구현
// DESIGN.md §1 '문장 무결성': 상한 초과 텍스트를 글자 단위로 뚝 자르지 않고
// 어절 경계에서 자른 뒤 말줄임표(…)를 붙인다. 결과 길이는 항상 max 이하.
// 결과 섹션(§5.5/§5.7)과 인쇄 보고서(§7)가 함께 쓴다.
// ============================================================

/**
 * 상한(max자) 초과 텍스트를 어절 경계 우선으로 자르고 말줄임표를 붙인다.
 * - max 이하면 트림만 해서 그대로 반환(말줄임표 없음).
 * - 초과면 max-1자에서 자른 뒤, 마지막 공백(어절 경계)이 상한의 60% 이후에
 *   있으면 그 경계까지 되돌려 자른다. 꼬리 구두점/공백 제거 후 '…' 부착.
 */
export function sajuClip(text: string, max: number): string {
  const trimmed = text.trim();
  const chars = Array.from(trimmed);
  if (chars.length <= max) return trimmed;

  const hard = chars.slice(0, Math.max(1, max - 1)).join('');
  const lastSpace = hard.lastIndexOf(' ');
  const wordCut = lastSpace >= (max - 1) * 0.6 ? hard.slice(0, lastSpace) : hard;
  return `${wordCut.replace(/[\s,.·…:;-]+$/u, '')}…`;
}
