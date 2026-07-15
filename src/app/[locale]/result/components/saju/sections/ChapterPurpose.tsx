'use client';

// ============================================================
// 四章 — 소망의 운 (UI-SPEC §5.5 / §5.5-B)
// 공통(종합/연애/재물/직업): 목적 낙관 + AI 타이틀 + 서사 전문 +
//   keyInsights 3카드 + 때(時)의 조언 한지 카드
// 궁합(§5.5-B): 두 원국 마주보기(GanjiTile sm 미니 그리드 ×2) +
//   합충 연결선 SVG(sajuCompatibility.relations) + 점수 낙관 카운트업 +
//   관계 서사 / 어울리는 결 / 부딪히는 결 / 조언 한지 카드
// 텍스트 허용치: §5.9 (title 28자 slice, keyInsights 90자, points 70자×4)
// 서사(narrative)는 클램프 없이 전문 노출 — break-keep 전면.
// ============================================================

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type {
  SajuChartSnapshot,
  SajuPairRelation,
  SajuPillarSnapshot,
} from '@/types/analysis';
import { SAJU_PURPOSES } from '@/types/analysis';
import {
  BrushDivider,
  GanjiTile,
  HanjiCard,
  SealStamp,
  VerticalLabel,
  SAJU_EASE_BRUSH,
  SAJU_EASE_INK,
  SAJU_VIEWPORT,
  sajuClip,
} from '@/components/saju';

// 섹션 prop 계약 SSOT — sections/types.ts
import type { ChapterPurposeProps } from './types';

export type { ChapterPurposeProps };

const hasText = (s?: string | null): s is string => !!s && s.trim().length > 0;

// ---------- 공통 마이크로 컴포넌트 (파일 자립 — 동시 작업 충돌 방지) ----------

function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={SAJU_VIEWPORT}
      transition={{ duration: 0.8, ease: SAJU_EASE_INK, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** 서사 전문 렌더 — \n\n 문단 분할, 스태거 등장, 클램프 없음 */
function Narrative({ text, onCream = false }: { text: string; onCream?: boolean }) {
  const paras = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="space-y-4">
      {paras.map((para, i) => (
        <FadeIn key={i} delay={i * 0.12}>
          <p
            className="break-keep text-left font-serif-kr text-[15px] font-normal leading-[1.85]"
            style={{ color: onCream ? 'rgba(26,22,16,0.9)' : 'rgba(233,226,208,0.88)' }}
          >
            {para}
          </p>
        </FadeIn>
      ))}
    </div>
  );
}

/** 장 오프너 — VerticalLabel 장 번호 + BrushDivider + 킥커 (§5.0, 형제 섹션과 동일 문법) */
function ChapterOpener({ chapter, kicker }: { chapter: string; kicker: string }) {
  return (
    <div>
      <div className="mb-3">
        <VerticalLabel text={chapter} tone="gold" />
      </div>
      <div className="mb-10 flex justify-center">
        <BrushDivider width={200} tone="gold" />
      </div>
      <p className="break-keep text-center font-serif-kr text-[11px] font-semibold leading-[1.4] tracking-[0.14em] text-[#C9A227]">
        {kicker}
      </p>
    </div>
  );
}

// ---------- 궁합 — 마주보는 미니 원국 스테이지 지오메트리 ----------

const TILE_W = 40;
const TILE_H = 56;
const GAP_X = 2;
const GAP_Y = 4;
const GRID_W = TILE_W * 4 + GAP_X * 3; // 166
const PILL_H = 32; // 이름 pill(24) + 여백(8)
const GRID_BOTTOM = PILL_H + TILE_H * 2 + GAP_Y; // 148
const STAGE_W = 356;
const RIGHT_X0 = STAGE_W - GRID_W; // 190
const BAND_H = 88; // 연결선 밴드(그리드 아래) — 곡선 4개가 포개지지 않는 깊이 확보
const STAGE_H = GRID_BOTTOM + BAND_H;
/** 합충 라벨(9px)의 곡선 위 배치 지점(t) — 선마다 어긋나게 놓아 라벨 겹침 방지 */
const RELATION_LABEL_T = [0.5, 0.3, 0.7, 0.42] as const;

/** 내 원국 표기 순서(좌→우): 時 日 月 年 — §5.2 만세력 관례 */
const MY_COL: Record<string, number> = { 시: 0, 일: 1, 월: 2, 년: 3 };
/** 상대 원국은 미러(年 月 日 時) — 마주보는 단자 */
const PARTNER_COL: Record<string, number> = { 년: 0, 월: 1, 일: 2, 시: 3 };

const KIND_PRIORITY: Record<SajuPairRelation['kind'], number> = {
  합: 0,
  충: 1,
  형: 2,
  해: 3,
  파: 4,
};

const KIND_STYLE: Record<
  SajuPairRelation['kind'],
  { color: string; dash?: string; zigzag: boolean }
> = {
  합: { color: '#C9A227', zigzag: false },
  충: { color: '#E2604E', zigzag: true },
  형: { color: '#A69F8D', dash: '3 4', zigzag: false },
  해: { color: '#A69F8D', dash: '3 4', zigzag: false },
  파: { color: '#A69F8D', dash: '3 4', zigzag: false },
};

function parsePosition(position: string): { my: string; partner: string } {
  const m = position.match(/^([년월일시])[간지]?-([년월일시])[간지]?$/);
  if (m) return { my: m[1], partner: m[2] };
  return { my: '일', partner: '일' };
}

/** 그리드 아래 밴드를 지나는 활 모양 곡선 */
function bowPath(x1: number, x2: number, y: number, depth: number): string {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y} Q ${cx} ${y + depth} ${x2} ${y}`;
}

/** 충(沖) — 활 곡선을 따라 지그재그 */
function zigzagBowPath(x1: number, x2: number, y: number, depth: number): string {
  const N = 14;
  const cx = (x1 + x2) / 2;
  const cy = y + depth;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 1 - t;
    const px = u * u * x1 + 2 * u * t * cx + t * t * x2;
    const py = u * u * y + 2 * u * t * cy + t * t * y;
    const dx = 2 * u * (cx - x1) + 2 * t * (x2 - cx);
    const dy = 2 * u * (cy - y) + 2 * t * (y - cy);
    const len = Math.hypot(dx, dy) || 1;
    const off = i === 0 || i === N ? 0 : i % 2 === 0 ? 2.5 : -2.5;
    pts.push(`${(px + (-dy / len) * off).toFixed(1)} ${(py + (dx / len) * off).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
}

function MiniChart({
  chart,
  name,
  accent,
}: {
  chart: SajuChartSnapshot;
  name: string;
  accent?: boolean;
}) {
  // accent=false(나): 時日月年 / accent=true(상대, 미러): 年月日時
  const ordered: (SajuPillarSnapshot | null)[] = accent
    ? [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
    : [chart.pillars.hour, chart.pillars.day, chart.pillars.month, chart.pillars.year];

  const renderTile = (p: SajuPillarSnapshot | null, row: 'gan' | 'ji', key: string) => {
    if (!p) {
      return (
        <GanjiTile key={key} hanja="時" reading="" element="토" size="sm" state="unknown" />
      );
    }
    return row === 'gan' ? (
      <GanjiTile key={key} hanja={p.ganHanja} reading={p.gan} element={p.ganElement} size="sm" />
    ) : (
      <GanjiTile key={key} hanja={p.jiHanja} reading={p.ji} element={p.jiElement} size="sm" />
    );
  };

  return (
    <div style={{ width: GRID_W }}>
      <div className="mb-2 flex justify-center">
        <span
          className={`flex h-6 max-w-full items-center truncate rounded-full border bg-[#12141D] px-3 font-serif-kr text-[11px] font-semibold text-[#E9E2D0] ${
            accent ? 'border-[#C9A227]/40' : 'border-[#262A38]'
          }`}
        >
          {name}
        </span>
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(4, ${TILE_W}px)`,
          columnGap: GAP_X,
          rowGap: GAP_Y,
        }}
        role="img"
        aria-label={`${name}의 명식`}
      >
        {ordered.map((p, i) => renderTile(p, 'gan', `g${i}`))}
        {ordered.map((p, i) => renderTile(p, 'ji', `j${i}`))}
      </div>
    </div>
  );
}

function RelationLines({ relations }: { relations: SajuPairRelation[] }) {
  const reduce = useReducedMotion();
  const shown = [...relations]
    .sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])
    .slice(0, 4);
  if (shown.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={STAGE_W}
      height={STAGE_H}
      viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
      aria-hidden
    >
      {shown.map((rel, i) => {
        const { my, partner } = parsePosition(rel.position);
        const myC = MY_COL[my] ?? 1;
        const pC = PARTNER_COL[partner] ?? 2;
        const x1 = myC * (TILE_W + GAP_X) + TILE_W / 2;
        const x2 = RIGHT_X0 + pC * (TILE_W + GAP_X) + TILE_W / 2;
        // 깊이 간격을 넓혀 곡선들이 좁은 밴드에 포개지지 않게 (BAND_H 88 내)
        const depth = 26 + i * 18;
        const style = KIND_STYLE[rel.kind];
        const d = style.zigzag
          ? zigzagBowPath(x1, x2, GRID_BOTTOM, depth)
          : bowPath(x1, x2, GRID_BOTTOM, depth);
        // 라벨 — 각 곡선 위 서로 다른 지점(t)의 좌표(2차 베지어), 라벨끼리 겹침 방지
        const lt = RELATION_LABEL_T[i % RELATION_LABEL_T.length];
        const lu = 1 - lt;
        const ctrlX = (x1 + x2) / 2;
        const ctrlY = GRID_BOTTOM + depth;
        const labelX = lu * lu * x1 + 2 * lu * lt * ctrlX + lt * lt * x2;
        const labelY = lu * lu * GRID_BOTTOM + 2 * lu * lt * ctrlY + lt * lt * GRID_BOTTOM;
        const drawProps = reduce
          ? { initial: false as const }
          : {
              initial: { pathLength: 0, opacity: 0 },
              whileInView: { pathLength: 1, opacity: 1 },
              viewport: SAJU_VIEWPORT,
              transition: { duration: 0.8, ease: SAJU_EASE_BRUSH, delay: 0.6 + i * 0.3 },
            };
        return (
          <g key={`${rel.position}-${rel.kind}-${i}`}>
            <motion.path
              d={d}
              stroke={style.color}
              strokeWidth={1.2}
              strokeDasharray={style.dash}
              strokeLinecap="round"
              fill="none"
              {...drawProps}
            />
            <motion.text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fontWeight={600}
              fill={style.color}
              stroke="#0C0E16"
              strokeWidth={3}
              paintOrder="stroke"
              style={{ fontFamily: "var(--font-noto-serif-kr), 'Noto Serif KR', serif" }}
              {...(reduce
                ? { initial: false as const }
                : {
                    initial: { opacity: 0 },
                    whileInView: { opacity: 1 },
                    viewport: SAJU_VIEWPORT,
                    transition: { duration: 0.4, delay: 1.2 + i * 0.3 },
                  })}
            >
              {rel.hanja}
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
}

/** 점수 카운트업 — 0→score 1.2s easeBrush (§5.5-B) */
function ScoreCounter({ score }: { score: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => String(Math.round(v)));
  return (
    <motion.span
      viewport={SAJU_VIEWPORT}
      onViewportEnter={() => {
        if (reduce) {
          mv.set(score);
          return;
        }
        animate(mv, score, { duration: 1.2, ease: SAJU_EASE_BRUSH });
      }}
      className="saju-gold-foil font-sans text-[44px] font-black leading-none"
    >
      {rounded}
    </motion.span>
  );
}

// ---------- 메인 ----------

export function ChapterPurpose({ result, targetType, userName }: ChapterPurposeProps) {
  const t = useTranslations('saju.result');
  const tt = (key: string, fallback: string) => (t.has(key) ? t(key) : fallback);
  const [sealStamped, setSealStamped] = useState(false);

  const reading = result.sajuAnalysis?.purposeReading;
  const compat = result.sajuAnalysis?.compatibilityReading;
  const compatSnapshot = result.sajuCompatibility;
  const isCompat =
    result.sajuPurpose === 'compatibility' && !!compat && !!compatSnapshot;

  // ===================== 궁합 모드 (§5.5-B) =====================
  if (isCompat && compat && compatSnapshot) {
    const score = Math.min(99, Math.max(0, compat.score ?? compatSnapshot.complementScore));
    const ownerName = userName?.trim();
    const myLabel = ownerName || (targetType === 'self' ? '나의 명식' : '최애의 명식');

    return (
      <section className="px-6 py-24">
        <ChapterOpener chapter="四章" kicker={t('s4.compat.kicker')} />

        {/* 두 원국 마주보기 + 합충 연결선 */}
        <div className="-mx-6 mt-10 flex justify-center overflow-x-clip">
          <div
            className="relative origin-top max-[350px]:scale-[0.85]"
            style={{ width: STAGE_W, height: STAGE_H }}
          >
            <motion.div
              className="absolute left-0 top-0"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={SAJU_VIEWPORT}
              transition={{ duration: 1.2, ease: SAJU_EASE_INK }}
            >
              <MiniChart chart={result.sajuChart} name={myLabel} />
            </motion.div>
            <motion.div
              className="absolute right-0 top-0"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={SAJU_VIEWPORT}
              transition={{ duration: 1.2, ease: SAJU_EASE_INK }}
            >
              <MiniChart
                chart={compatSnapshot.partnerChart}
                name={compatSnapshot.partnerName}
                accent
              />
            </motion.div>
            <RelationLines relations={compatSnapshot.relations ?? []} />
          </div>
        </div>

        {/* 점수 낙관 */}
        <FadeIn delay={0.2} className="mt-8 flex items-end justify-center gap-4">
          <motion.div
            viewport={SAJU_VIEWPORT}
            onViewportEnter={() => setSealStamped(true)}
          >
            <SealStamp chars="合" size="lg" tone="cinnabar" stamped={sealStamped} />
          </motion.div>
          <div className="flex items-baseline gap-1 pb-1">
            <ScoreCounter score={score} />
            <span className="font-sans text-[12px] leading-[1.6] text-[#A69F8D]">
              {t('s4.compat.scoreSuffix')}
            </span>
          </div>
        </FadeIn>

        {/* 두 일간의 자연물 관계 — 타이틀 */}
        {hasText(compat.title) && (
          <FadeIn delay={0.1}>
            <h3
              className="mt-10 break-keep text-center font-serif-kr text-[24px] font-semibold leading-[1.45] text-[#E9E2D0]"
              style={{ textWrap: 'balance' }}
            >
              {sajuClip(compat.title, 40)}
            </h3>
          </FadeIn>
        )}

        {/* 관계 서사 전문 */}
        {hasText(compat.dynamicNarrative) && (
          <div className="mt-8">
            <Narrative text={compat.dynamicNarrative} />
          </div>
        )}

        {/* 어울리는 결 */}
        {(compat.harmonyPoints?.length ?? 0) > 0 && (
          <div className="mt-12">
            <FadeIn className="flex justify-center">
              <BrushDivider width={200} label={t('s4.compat.harmonyTitle')} tone="gold" />
            </FadeIn>
            <ul className="mt-6 space-y-4">
              {compat.harmonyPoints.slice(0, 4).map((point, i) => (
                <FadeIn key={i} delay={i * 0.15}>
                  <li className="flex items-start gap-3">
                    <span aria-hidden className="pt-[2px] text-[15px] font-black leading-[1.85] text-[#C9A227]">
                      ·
                    </span>
                    <span className="break-keep font-serif-kr text-[15px] leading-[1.85] text-[#E9E2D0]">
                      {sajuClip(point, 70)}
                    </span>
                  </li>
                </FadeIn>
              ))}
            </ul>
          </div>
        )}

        {/* 부딪히는 결 */}
        {(compat.frictionPoints?.length ?? 0) > 0 && (
          <div className="mt-12">
            <FadeIn className="flex justify-center">
              <BrushDivider width={200} label={t('s4.compat.frictionTitle')} tone="gold" />
            </FadeIn>
            <ul className="mt-6 space-y-4">
              {compat.frictionPoints.slice(0, 4).map((point, i) => (
                <FadeIn key={i} delay={i * 0.15}>
                  <li className="flex items-start gap-3">
                    <span aria-hidden className="pt-[2px] text-[15px] font-black leading-[1.85] text-[#E2604E]">
                      ·
                    </span>
                    <span className="break-keep font-serif-kr text-[15px] leading-[1.85] text-[#E9E2D0]">
                      {sajuClip(point, 70)}
                    </span>
                  </li>
                </FadeIn>
              ))}
            </ul>
          </div>
        )}

        {/* 조언 + 두 사람 사이에 놓이는 향 — 한지 카드 */}
        {(hasText(compat.adviceNarrative) || hasText(compat.sharedScentNarrative)) && (
          <FadeIn delay={0.1} className="mt-12">
            <HanjiCard padding="lg" seal="合">
              {hasText(compat.adviceNarrative) && (
                <Narrative text={compat.adviceNarrative} onCream />
              )}
              {hasText(compat.adviceNarrative) && hasText(compat.sharedScentNarrative) && (
                <div className="my-5 flex justify-center">
                  <BrushDivider width={160} tone="ink-on-cream" />
                </div>
              )}
              {hasText(compat.sharedScentNarrative) && (
                <Narrative text={compat.sharedScentNarrative} onCream />
              )}
            </HanjiCard>
          </FadeIn>
        )}

        {/* 五章 이후 처방 기준 고지 (§5.5-B) */}
        <FadeIn delay={0.15}>
          <p className="mt-8 break-keep text-center font-serif-kr text-[12px] leading-[1.6] text-[#A69F8D]">
            {ownerName
              ? t('s4.compat.perfumeBasisNote', { name: ownerName })
              : tt(
                  's4.compat.perfumeBasisNoteNoName',
                  '향은 단자의 주인의 용신을 따라 처방합니다.'
                )}
          </p>
        </FadeIn>
      </section>
    );
  }

  // ===================== 공통 모드 (종합/연애/재물/직업) =====================
  if (!reading) return null;

  const purposeMeta =
    SAJU_PURPOSES.find((p) => p.id === reading.purpose) ??
    SAJU_PURPOSES.find((p) => p.id === result.sajuPurpose);
  const hanjaNumbers = ['一', '二', '三'];

  return (
    <section className="px-6 py-24">
      <ChapterOpener chapter="四章" kicker={t('s4.kicker')} />

      {/* 목적 낙관 */}
      <motion.div
        className="mt-10 flex justify-center"
        viewport={SAJU_VIEWPORT}
        onViewportEnter={() => setSealStamped(true)}
      >
        <SealStamp
          chars={purposeMeta?.hanja ?? '命'}
          size="md"
          tone="cinnabar"
          stamped={sealStamped}
        />
      </motion.div>

      {/* 헤드라인 — AI 필드 (최대 2줄, 28자 slice — §5.9) */}
      {hasText(reading.title) && (
        <FadeIn delay={0.1}>
          <h2
            className="mt-6 break-keep text-center font-serif-kr text-[34px] font-black leading-[1.35] tracking-[-0.01em] text-[#E9E2D0]"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              // 마지막 어절 하나만 다음 줄로 떨어지는 고아 줄바꿈 방지 (예: "…내는 / 법")
              textWrap: 'balance',
            }}
          >
            {sajuClip(reading.title, 28)}
          </h2>
        </FadeIn>
      )}

      {/* 서사 전문 */}
      {hasText(reading.narrative) && (
        <div className="mt-10">
          <Narrative text={reading.narrative} />
        </div>
      )}

      {/* keyInsights ×3 */}
      {(reading.keyInsights?.length ?? 0) > 0 && (
        <div className="mt-12 flex flex-col gap-3">
          {reading.keyInsights.slice(0, 3).map((insight, i) => (
            <FadeIn key={i} delay={i * 0.15}>
              <div className="flex items-start gap-3 rounded-lg border border-[#262A38] border-l-2 border-l-[#C9A227] bg-[#12141D] p-4">
                <span
                  aria-hidden
                  className="pt-[3px] font-serif-kr text-[15px] font-black leading-none text-[#C9A227]"
                >
                  {hanjaNumbers[i]}
                </span>
                <p className="break-keep font-serif-kr text-[15px] font-semibold leading-[1.85] text-[#E9E2D0]">
                  {sajuClip(insight, 90)}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      {/* 때(時)의 조언 — 한지 카드 */}
      {hasText(reading.timingAdvice) && (
        <FadeIn delay={0.1} className="mt-12">
          <HanjiCard padding="md" seal="時">
            <p className="mb-2 break-keep font-serif-kr text-[11px] font-semibold leading-[1.4] tracking-[0.14em] text-[#7A5C14]">
              {t('s4.timingLabel')}
            </p>
            <Narrative text={reading.timingAdvice} onCream />
          </HanjiCard>
        </FadeIn>
      )}
    </section>
  );
}
