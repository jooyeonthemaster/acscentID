// ============================================================
// HanjiCard — 한지 카드 (UI-SPEC §2.5)
// 다크 배경 위의 크림 지면. 부드러운 심도 그림자(하드 오프셋 금지 — §1.0).
// ============================================================

import type { ReactNode } from 'react';
import { SAJU_GOLD_GRADIENT } from './tokens';
import { SealStamp } from './SealStamp';
import { VerticalLabel } from './VerticalLabel';

export interface HanjiCardProps {
  children: ReactNode;
  /** 우측 변 세로 라벨 (예: '四柱單子') */
  verticalLabel?: string;
  /** 우하단 낙관 한자 (sm 사이즈) */
  seal?: string;
  /** 20px | 28px */
  padding?: 'md' | 'lg';
  /** 족자(두루마리) 지면 — 모서리 라운드·자체 그림자 제거(상하 축이 프레임 역할) */
  scroll?: boolean;
  className?: string;
}

export function HanjiCard({
  children,
  verticalLabel,
  seal,
  padding = 'md',
  scroll = false,
  className,
}: HanjiCardProps) {
  return (
    <div
      className={`saju-hanji relative border-x border-[#D8CFBB] ${
        scroll ? 'rounded-none border-y-0' : 'rounded-lg border-y'
      } ${padding === 'lg' ? 'p-7' : 'p-5'} ${className ?? ''}`}
      style={scroll ? undefined : { boxShadow: '0 16px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)' }}
    >
      {/* 상단 금 괘선 — border-image는 radius와 충돌하므로 내부 첫 요소로 */}
      <div aria-hidden className="mb-4 h-[2px] w-12" style={{ background: SAJU_GOLD_GRADIENT }} />

      {/* 낙관(sm 36px, bottom-3.5 right-4)이 있으면 본문 아래에 낙관 높이만큼 여백을 둬
          마지막 줄이 도장에 가리지 않게 한다. cardPadding(p-5 20 / p-7 28)을 감안해 필요분만 확보. */}
      <div
        className="relative break-keep text-[#1A1610]"
        style={seal ? { paddingBottom: 14 + 36 + 6 - (padding === 'lg' ? 28 : 20) } : undefined}
      >
        {children}
      </div>

      {verticalLabel && (
        <div className="absolute right-3 top-5">
          <VerticalLabel text={verticalLabel} tone="ink" />
        </div>
      )}
      {seal && (
        <div className="absolute bottom-3.5 right-4">
          <SealStamp chars={seal} size="sm" />
        </div>
      )}
    </div>
  );
}
