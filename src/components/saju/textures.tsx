// ============================================================
// 사주 월드 텍스처 — 외부 에셋 0, 전부 코드 (UI-SPEC §1.3)
// CSS 유틸리티(.saju-hanji / .saju-ink-grain)와 동일한 파라미터를
// 컴포넌트/인라인 SVG에서 재사용할 수 있게 노출한다.
// ============================================================

import { SAJU_GOLD_STOPS } from './tokens';

/** 한지 섬유결 레이어 (baseFrequency 0.012 0.28 = 가로로 긴 섬유결) */
export const SAJU_HANJI_FIBER_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cfilter id='h'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012 0.28' numOctaves='2' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23h)' opacity='0.5'/%3E%3C/svg%3E";

/** 한지 반점 레이어 */
export const SAJU_HANJI_SPECKLE_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='s'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='11' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23s)' opacity='0.35'/%3E%3C/svg%3E";

/** 먹지 입자 레이어 (정적 — 기존 .bg-noise의 무한 이동 버전 사용 금지) */
export const SAJU_INK_GRAIN_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E";

const OVERLAY_BASE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  borderRadius: 'inherit',
};

/**
 * 한지 질감 오버레이 — `.saju-hanji` 클래스를 쓸 수 없는 맥락
 * (인라인 스타일 강제 슬롯, portal 등)에서 동일 질감을 재현한다.
 * 부모는 position: relative + 크림 배경(#F5EFE2)이어야 한다.
 */
export function HanjiOverlay({ className }: { className?: string }) {
  return (
    <>
      <div
        aria-hidden
        className={className}
        style={{
          ...OVERLAY_BASE,
          backgroundImage: `url("${SAJU_HANJI_FIBER_URI}")`,
          opacity: 0.05,
          mixBlendMode: 'multiply',
        }}
      />
      <div
        aria-hidden
        className={className}
        style={{
          ...OVERLAY_BASE,
          backgroundImage: `url("${SAJU_HANJI_SPECKLE_URI}")`,
          opacity: 0.04,
          mixBlendMode: 'multiply',
        }}
      />
    </>
  );
}

/**
 * 먹지 입자 오버레이 — `.saju-ink-grain` 의 컴포넌트 버전.
 * 부모는 position: relative + 다크 배경(#0C0E16)이어야 한다.
 */
export function InkGrainOverlay({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        ...OVERLAY_BASE,
        backgroundImage: `url("${SAJU_INK_GRAIN_URI}")`,
        opacity: 0.05,
        mixBlendMode: 'overlay',
      }}
    />
  );
}

/**
 * 인라인 SVG용 한지 feTurbulence 필터 정의(2겹 — 섬유 + 반점).
 * 사용: <svg><defs><HanjiFilterDefs fiberId="f" speckleId="s"/></defs>
 *       <rect filter="url(#f)" opacity="0.05" style={{mixBlendMode:'multiply'}}/> …
 * 인쇄 배경 SVG(§7.1)가 동일 파라미터를 재사용한다.
 */
export function HanjiFilterDefs({
  fiberId = 'saju-hanji-fiber',
  speckleId = 'saju-hanji-speckle',
}: {
  fiberId?: string;
  speckleId?: string;
}) {
  return (
    <>
      <filter id={fiberId} x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.28"
          numOctaves={2}
          seed={7}
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <filter id={speckleId} x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves={2}
          seed={11}
          stitchTiles="stitch"
        />
      </filter>
    </>
  );
}

/**
 * 인라인 SVG용 먹지 입자 필터 정의.
 */
export function InkGrainFilterDef({ id = 'saju-ink-grain-filter' }: { id?: string }) {
  return (
    <filter id={id} x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={3} stitchTiles="stitch" />
    </filter>
  );
}

/**
 * 금박 그라데이션 <linearGradient> 정의 (SSOT 스탑 — §1.1).
 * 기본 방향은 CSS 105deg 근사(가로 + 약간 아래). 수직이 필요하면
 * x2="0%" y2="100%" 로 오버라이드한다.
 * 사용: <defs><GoldGradientDef id={uid}/></defs> → stroke/fill=`url(#${uid})`
 */
export function GoldGradientDef({
  id,
  x1 = '0%',
  y1 = '0%',
  x2 = '100%',
  y2 = '26.8%',
}: {
  id: string;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
}) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {SAJU_GOLD_STOPS.map((s) => (
        <stop key={s.offset} offset={s.offset} stopColor={s.color} />
      ))}
    </linearGradient>
  );
}
