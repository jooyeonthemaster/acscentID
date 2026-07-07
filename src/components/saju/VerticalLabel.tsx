// ============================================================
// VerticalLabel — 세로쓰기 라벨 (UI-SPEC §2.6)
// 용도: 장 번호(一章), 카드 옆 주석(命式單子), 인쇄 보고서 패널 라벨
// ============================================================

export interface VerticalLabelProps {
  text: string;
  tone?: 'gold' | 'muted' | 'ink';
  /** 폰트 크기 px, 기본 11 */
  size?: number;
  className?: string;
}

const TONE_COLOR: Record<NonNullable<VerticalLabelProps['tone']>, string> = {
  gold: '#C9A227', // 다크 위
  muted: '#A69F8D',
  ink: '#5C564A', // 크림 위
};

export function VerticalLabel({ text, tone = 'gold', size = 11, className }: VerticalLabelProps) {
  return (
    <span
      className={`font-serif-kr break-keep select-none ${className ?? ''}`}
      style={{
        writingMode: 'vertical-rl',
        textOrientation: 'upright',
        letterSpacing: '0.35em',
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1,
        color: TONE_COLOR[tone],
      }}
    >
      {text}
    </span>
  );
}
