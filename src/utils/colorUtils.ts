/**
 * 색상 유틸리티 함수
 * 배경색 밝기 기반 텍스트 색상 자동 선택
 */

/**
 * HEX 색상을 RGB로 변환
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * WCAG 표준에 따른 Relative Luminance 계산
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function calculateLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * 배경색에 따라 적절한 텍스트 색상 반환
 * 밝은 배경 → 어두운 텍스트, 어두운 배경 → 흰색 텍스트
 */
export function getContrastTextColor(bgColor: string): string {
  const luminance = calculateLuminance(bgColor);
  return luminance > 0.5 ? '#1E293B' : '#FFFFFF'; // slate-800 : white
}
