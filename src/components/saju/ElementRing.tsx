'use client';

// ============================================================
// ElementRing — 오행 상생 고리 (UI-SPEC §2.2, §5.6 controlled 모드)
// - viewBox 300×300, 木이 12시 방향, 시계방향 木→火→土→金→水 (상생 순)
// - 원호(.ring-arcs)만 120s 앰비언트 회전(CSS), 노드는 글자 정립 유지
// - 부족/공망(count 0) = 꺼진 고리(#1E2129, 글자 0.35, 점선 링)
// - 점화(ignite): 2.4s 3단계 — ①원호 재드로잉+유성 헤드(0–1.2s)
//   ②노드 fill 크로스페이드+scale 1.12+글로우(1.2–1.8s) ③글자 점등+파티클(1.8–2.4s)
// - progress={{arc, ignite}} MotionValue 주입 시 스크롤 연동 controlled 모드(§5.6)
// ============================================================

import {
  animate,
  cubicBezier,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useEffect, useId, useRef } from 'react';
import type { SajuElement } from '@/types/analysis';
import {
  ELEMENT_META,
  SAJU_EASE_BRUSH,
  SAJU_EASE_INK,
  SAJU_ELEMENTS,
  SAJU_VIEWPORT,
} from './tokens';
import { GoldGradientDef } from './textures';

export interface ElementRingProgress {
  /** 0→1: 용신으로 들어오는 원호 재드로잉 + 유성 헤드 */
  arc: MotionValue<number>;
  /** 0→1: 노드 점화(fill 크로스페이드→글자 점등→파티클) */
  ignite: MotionValue<number>;
}

export interface ElementRingProps {
  /** elementCount */
  counts: Record<SajuElement, number>;
  /** 용신 (있으면 점화 대상) */
  yongsin?: SajuElement;
  /** true가 되는 순간 점화 시퀀스 재생 (2.4s) */
  ignite?: boolean;
  /** 렌더 px (기본 300) */
  size?: number;
  /** 노드 옆 개수 뱃지 */
  showCounts?: boolean;
  /** 뷰포트 진입 시 원호 드로잉(1.6s) + 노드 스태거(0.12s) — 기본 true */
  drawOnView?: boolean;
  /** 스크롤 연동 controlled 모드 (§5.6) — 있으면 ignite prop 무시 */
  progress?: ElementRingProgress;
  className?: string;
}

// ---------- 지오메트리 (모듈 스코프) ----------

const CX = 150;
const CY = 150;
const ORBIT = 110;
const NODE_R = 28;
const RING_R = 32;
const GAP_DEG = 17; // 노드 반경 32 바깥에서 원호 시작/끝

const rad = (deg: number) => (deg * Math.PI) / 180;
const angleOf = (i: number) => -90 + 72 * i; // 木=12시, 시계방향
const posAt = (deg: number) => ({
  x: CX + ORBIT * Math.cos(rad(deg)),
  y: CY + ORBIT * Math.sin(rad(deg)),
});

const NODE_POS = SAJU_ELEMENTS.map((_, i) => posAt(angleOf(i)));

interface ArcGeom {
  d: string;
  a0: number;
  a1: number;
}

function arcGeom(i: number): ArcGeom {
  const a0 = angleOf(i) + GAP_DEG;
  const a1 = angleOf(i + 1) - GAP_DEG;
  const p0 = posAt(a0);
  const p1 = posAt(a1);
  return {
    d: `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${ORBIT} ${ORBIT} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    a0,
    a1,
  };
}

const ARCS = SAJU_ELEMENTS.map((_, i) => arcGeom(i));

/** 원호 끝 상생 방향 화살촉(6px 셰브론) */
function arrowPath(a1: number): string {
  const tip = posAt(a1);
  const dirDeg = a1 + 90; // 시계방향 진행 접선
  const mk = (offsetDeg: number) => {
    const d = rad(dirDeg + offsetDeg);
    return { x: tip.x - Math.cos(d) * 6, y: tip.y - Math.sin(d) * 6 };
  };
  const b1 = mk(22);
  const b2 = mk(-22);
  return `M ${b1.x.toFixed(2)} ${b1.y.toFixed(2)} L ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${b2.x.toFixed(2)} ${b2.y.toFixed(2)}`;
}

const settleEase = cubicBezier(0.16, 1, 0.3, 1);

// ---------- 서브컴포넌트 ----------

/** 점화 원호 오버레이 + 유성 헤드 (회전 그룹 내부에 배치) */
function IgniteArc({
  geom,
  arcT,
  gradId,
}: {
  geom: ArcGeom;
  arcT: MotionValue<number>;
  gradId: string;
}) {
  const cx = useTransform(arcT, (t) => CX + ORBIT * Math.cos(rad(geom.a0 + (geom.a1 - geom.a0) * t)));
  const cy = useTransform(arcT, (t) => CY + ORBIT * Math.sin(rad(geom.a0 + (geom.a1 - geom.a0) * t)));
  const headOpacity = useTransform(arcT, [0, 0.03, 0.94, 1], [0, 1, 1, 0]);
  return (
    <g>
      <motion.path
        d={geom.d}
        stroke={`url(#${gradId})`}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
        style={{ pathLength: arcT }}
      />
      {/* 금색 4px 유성 헤드 */}
      <motion.circle
        r={2}
        fill="#F2DA8A"
        style={{ cx, cy, opacity: headOpacity, filter: 'drop-shadow(0 0 4px #E8C766)' }}
      />
    </g>
  );
}

/** 점화 파티클 1개 — 노드 위 8px 지점에서 짧게 상승 */
function IgniteParticle({
  igniteT,
  x,
  y,
  index,
}: {
  igniteT: MotionValue<number>;
  x: number;
  y: number;
  index: number;
}) {
  const offsetX = [-10, -6, -2, 2, 6, 10][index % 6];
  const startY = y - NODE_R - 8;
  const opacity = useTransform(igniteT, [0.5, 0.62, 0.9, 1], [0, 1, 0.8, 0]);
  const cy = useTransform(igniteT, [0.5, 1], [startY, startY - 12 - (index % 3) * 4]);
  return (
    <motion.circle
      cx={x + offsetX}
      r={1 + (index % 3) * 0.4}
      fill="#F2DA8A"
      style={{ cy, opacity }}
    />
  );
}

/** 오행 노드 1개 */
function RingNode({
  index,
  el,
  count,
  showCount,
  isIgniteTarget,
  igniteT,
  animateIn,
  entranceDelay,
}: {
  index: number;
  el: SajuElement;
  count: number;
  showCount: boolean;
  isIgniteTarget: boolean;
  igniteT: MotionValue<number>;
  animateIn: boolean;
  entranceDelay: number;
}) {
  const meta = ELEMENT_META[el];
  const { x, y } = NODE_POS[index];
  const dead = count === 0;
  const over = count >= 3;
  const glyphFill = el === '금' ? '#1A1610' : '#F5EFE2'; // 金 노드만 밝은 면 — 먹 글자

  // 점화 MotionValue 파생 (훅 순서 고정을 위해 항상 생성)
  const fillMV = useTransform(igniteT, [0, 0.5], [dead ? '#1E2129' : meta.fill, meta.fill]);
  const scaleMV = useTransform(igniteT, [0, 0.25, 0.5], [1, 1.12, 1], {
    ease: [settleEase, settleEase],
  });
  const glowBlur = useTransform(igniteT, [0, 0.5], [0, 24]);
  const glowMV = useMotionTemplate`drop-shadow(0 0 ${glowBlur}px ${meta.fill}AA)`;
  const glyphMV = useTransform(igniteT, [0.5, 1], [dead ? 0.35 : 1, 1]);
  const dashOpacity = useTransform(igniteT, [0, 0.5], [1, 0]);
  const solidOpacity = useTransform(igniteT, [0, 0.5], [0, 1]);

  const entrance = animateIn
    ? {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: SAJU_VIEWPORT,
        transition: { duration: 0.8, ease: SAJU_EASE_INK, delay: entranceDelay },
      }
    : { initial: false as const };

  return (
    <motion.g {...entrance}>
      {/* 과다 — 외곽 링 두 겹 */}
      {over && (
        <circle cx={x} cy={y} r={RING_R + 4} stroke="rgba(233,226,208,0.18)" strokeWidth={1} fill="none" />
      )}
      {/* 외곽 링 (부족 오행은 점선 — 점화 시 실선으로 크로스페이드) */}
      {dead && isIgniteTarget ? (
        <>
          <motion.circle
            cx={x}
            cy={y}
            r={RING_R}
            stroke="rgba(233,226,208,0.18)"
            strokeWidth={1}
            strokeDasharray="3 4"
            fill="none"
            style={{ opacity: dashOpacity }}
          />
          <motion.circle
            cx={x}
            cy={y}
            r={RING_R}
            stroke="rgba(233,226,208,0.18)"
            strokeWidth={1}
            fill="none"
            style={{ opacity: solidOpacity }}
          />
        </>
      ) : (
        <circle
          cx={x}
          cy={y}
          r={RING_R}
          stroke="rgba(233,226,208,0.18)"
          strokeWidth={1}
          strokeDasharray={dead ? '3 4' : undefined}
          fill="none"
        />
      )}

      {/* 노드 본체 */}
      <motion.g
        style={
          isIgniteTarget
            ? { scale: scaleMV, filter: glowMV, transformBox: 'fill-box', transformOrigin: 'center' }
            : over
              ? { filter: `drop-shadow(0 0 10px ${meta.fill}66)` }
              : undefined
        }
      >
        {isIgniteTarget ? (
          <motion.circle cx={x} cy={y} r={NODE_R} style={{ fill: fillMV }} />
        ) : (
          <circle cx={x} cy={y} r={NODE_R} fill={dead ? '#1E2129' : meta.fill} />
        )}
        <motion.text
          x={x}
          y={y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={26}
          fontWeight={900}
          fill={glyphFill}
          style={{
            fontFamily: "var(--font-noto-serif-kr), 'Noto Serif KR', serif",
            opacity: isIgniteTarget ? glyphMV : dead ? 0.35 : 1,
          }}
        >
          {meta.hanja}
        </motion.text>
      </motion.g>

      {/* 점화 파티클 6개 */}
      {isIgniteTarget &&
        Array.from({ length: 6 }, (_, j) => (
          <IgniteParticle key={j} igniteT={igniteT} x={x} y={y} index={j} />
        ))}

      {/* 개수 뱃지 */}
      {showCount && (
        <g>
          <circle cx={x + 22} cy={y + 22} r={7} fill="#12141D" stroke="#262A38" strokeWidth={0.5} />
          <text
            x={x + 22}
            y={y + 22.5}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fontWeight={600}
            fill="#C9A227"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            {count}
          </text>
        </g>
      )}
    </motion.g>
  );
}

// ---------- 메인 ----------

export function ElementRing({
  counts,
  yongsin,
  ignite = false,
  size = 300,
  showCounts = false,
  drawOnView = true,
  progress,
  className,
}: ElementRingProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const gradId = `saju-ring-gold-${uid}`;

  const yi = yongsin ? SAJU_ELEMENTS.indexOf(yongsin) : -1;
  // 용신으로 "들어오는" 원호 = 상생 순 이전 오행 → 용신
  const igniteArcIndex = yi >= 0 ? (yi + 4) % 5 : -1;

  // uncontrolled 모드용 로컬 MotionValue (훅 순서 고정을 위해 항상 생성)
  const localArc = useMotionValue(0);
  const localIgnite = useMotionValue(0);
  const arcT = progress?.arc ?? localArc;
  const igniteT = progress?.ignite ?? localIgnite;

  // uncontrolled 점화 트리거 — true가 되는 순간 1회 재생 (총 2.4s)
  const firedRef = useRef(false);
  useEffect(() => {
    if (progress || !ignite || yi < 0 || firedRef.current) return;
    firedRef.current = true;
    if (reduce) {
      localArc.set(1);
      localIgnite.set(1);
      return;
    }
    const c1 = animate(localArc, 1, { duration: 1.2, ease: SAJU_EASE_BRUSH });
    const c2 = animate(localIgnite, 1, { duration: 1.2, delay: 1.2, ease: 'linear' });
    return () => {
      c1.stop();
      c2.stop();
    };
  }, [ignite, progress, yi, reduce, localArc, localIgnite]);

  const animateIn = drawOnView && !reduce;

  const titleText = `오행 분포: 목 ${counts['목']}, 화 ${counts['화']}, 토 ${counts['토']}, 금 ${counts['금']}, 수 ${counts['수']}`;

  const arcDrawProps = animateIn
    ? {
        initial: { pathLength: 0 },
        whileInView: { pathLength: 1 },
        viewport: SAJU_VIEWPORT,
        transition: { duration: 1.6, ease: SAJU_EASE_BRUSH },
      }
    : { initial: false as const };

  const arrowDrawProps = animateIn
    ? {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: SAJU_VIEWPORT,
        transition: { delay: 1.4, duration: 0.4 },
      }
    : { initial: false as const };

  return (
    <div className={`relative ${className ?? ''}`} style={{ width: size, height: size }}>
      {/* 점화 알림 — aria-live */}
      <span className="sr-only" aria-live="polite">
        {ignite && yongsin ? `용신 ${yongsin}(${ELEMENT_META[yongsin].hanja}) 점화` : ''}
      </span>

      <style>{`@keyframes saju-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <svg viewBox="0 0 300 300" width={size} height={size} role="img" aria-label={titleText}>
        <title>{titleText}</title>
        <defs>
          <GoldGradientDef id={gradId} />
        </defs>

        {/* 원호만 앰비언트 회전 — 노드는 글자 정립 유지 */}
        <g
          className="ring-arcs"
          style={{
            transformOrigin: '150px 150px',
            animation: reduce ? undefined : 'saju-ring-spin 120s linear infinite',
          }}
        >
          {ARCS.map((a, i) => (
            <g key={i}>
              <motion.path
                d={a.d}
                stroke={`url(#${gradId})`}
                strokeWidth={1.5}
                strokeLinecap="round"
                fill="none"
                {...arcDrawProps}
              />
              <motion.path
                d={arrowPath(a.a1)}
                stroke={`url(#${gradId})`}
                strokeWidth={1.5}
                strokeLinecap="round"
                fill="none"
                {...arrowDrawProps}
              />
            </g>
          ))}
          {igniteArcIndex >= 0 && (
            <IgniteArc geom={ARCS[igniteArcIndex]} arcT={arcT} gradId={gradId} />
          )}
        </g>

        <g className="ring-nodes">
          {SAJU_ELEMENTS.map((el, i) => (
            <RingNode
              key={el}
              index={i}
              el={el}
              count={counts[el] ?? 0}
              showCount={showCounts}
              isIgniteTarget={i === yi}
              igniteT={igniteT}
              animateIn={animateIn}
              entranceDelay={1.6 + i * 0.12}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
