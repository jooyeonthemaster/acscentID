'use client';

// ============================================================
// 終章 — 운명의 향 공개 (UI-SPEC §5.7) ※ 의식(儀式)
// sticky 아님 — whileInView(once) 트리거의 고정 타임라인 시퀀스.
// 타임라인(트리거 후):
//   0.0s   방사광 페이드인(1.2s) + 국소 GoldDust 8개(전역 14 + 8 ≤ 24 상한)
//   0.3s   SajuBottle 'outline' — 금실이 병을 그린다 (2.2s)
//   2.5s   'filling' — 액체 상승(1.4s) + 어깨 오행 인장 stamped
//   3.9s   'complete' — 향수명 scale 1.12→1 (easeSettle) + 브랜드 라인
//   4.5s~  노트 3단(겉기운/중심기운/뿌리기운) 스태거 0.3s
// 이후: 調香記 한지 카드 — elementBridge + whyNarrative(3단 논법 센터피스, 전문)
// reduced-motion: 시퀀스 생략, 완성 상태 정적 렌더 + 순차 fade 0.6s.
// ============================================================

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  BrushDivider,
  HanjiCard,
  SajuBottle,
  VerticalLabel,
  SAJU_EASE_INK,
  SAJU_EASE_SETTLE,
  SAJU_VIEWPORT,
  sajuClip,
  type SajuBottlePhase,
} from '@/components/saju';

// 섹션 prop 계약 SSOT — sections/types.ts
import type { ChapterRevealProps } from './types';
// 국소 금 파티클 — 결과 셸의 GoldDust 재사용 (§2.7 구현체)
import { GoldDust } from '../GoldDust';

export type { ChapterRevealProps };

const hasText = (s?: string | null): s is string => !!s && s.trim().length > 0;

// ---------- 병 지오메트리 (SajuBottle viewBox 200×320 기준) ----------
const BOTTLE_SIZE = 240; // 렌더 폭 → scale 1.2
const BOTTLE_SCALE = BOTTLE_SIZE / 200;
// 라벨지 rect (70, 150, 60, 80) — 향수명 HTML 레이어 좌표
const LABEL_TOP = 150 * BOTTLE_SCALE; // 180
const LABEL_H = 80 * BOTTLE_SCALE; // 96
const NAME_W = 104; // 라벨보다 살짝 넓게 — 오버플로 방어와 가독의 절충

export function ChapterReveal({ result }: ChapterRevealProps) {
  const t = useTranslations('saju.result');
  const reduce = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<SajuBottlePhase | 'idle'>('idle');

  // 고정 타임라인 — 스크롤 속도와 무관하게 의식은 일정한 속도로 (§5.7)
  useEffect(() => {
    if (!started) return;
    if (reduce) {
      const t0 = setTimeout(() => setPhase('complete'), 0);
      return () => clearTimeout(t0);
    }
    const t1 = setTimeout(() => setPhase('outline'), 300);
    const t2 = setTimeout(() => setPhase('filling'), 2500);
    const t3 = setTimeout(() => setPhase('complete'), 3900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [started, reduce]);

  const chart = result.sajuChart;
  const destiny = result.sajuAnalysis?.scentDestiny;
  if (!chart) return null;

  const top = result.matchingPerfumes?.[0];
  const persona = top?.persona;
  const liquidColors: [string, string] = [
    persona?.primaryColor ?? '#C9A227',
    persona?.secondaryColor ?? '#2C3E60',
  ];
  const perfumeName = persona?.name;
  const bridge = destiny?.elementBridge;
  const why = destiny?.whyNarrative;
  const revealed = phase === 'complete';

  // 향수명 — 24자 slice + 2줄 클램프 (§5.7/§7.3 R3 이중 방어)
  const displayName = hasText(perfumeName) ? sajuClip(perfumeName, 24) : null;
  // 라벨지 폭 안에서의 오버플로 방어 — 길이에 따라 단계적으로 축소 (§5.9 원칙)
  const nameLen = displayName?.length ?? 0;
  const nameFontSize = nameLen <= 6 ? 22 : nameLen <= 9 ? 18 : nameLen <= 14 ? 15 : 13;
  // 받침 세로 클리핑 방지 — 행간을 px로 고정하고 클램프 높이를 정확히 2줄에 맞춘다
  const nameLineHeight = Math.round(nameFontSize * 1.4);

  // 브랜드 라인 — perfumeId가 이미 "AC'SCENT ##" 형태면 접두어 중복 금지
  const rawPerfumeId = top?.perfumeId?.trim();
  const brandLine = rawPerfumeId
    ? /ac.?scent/i.test(rawPerfumeId)
      ? rawPerfumeId
      : `AC'SCENT ${rawPerfumeId}`
    : null;

  const notes = [
    {
      key: 'top',
      ko: t('s6.noteTiers.top'),
      latin: 'TOP',
      name: persona?.mainScent?.name,
      meaning: destiny?.topMeaning,
    },
    {
      key: 'middle',
      ko: t('s6.noteTiers.middle'),
      latin: 'MIDDLE',
      name: persona?.subScent1?.name,
      meaning: destiny?.middleMeaning,
    },
    {
      key: 'base',
      ko: t('s6.noteTiers.base'),
      latin: 'BASE',
      name: persona?.subScent2?.name,
      meaning: destiny?.baseMeaning,
    },
  ].filter((n) => hasText(n.name));

  return (
    <motion.section
      className="relative px-6 py-28"
      viewport={{ once: true, margin: '-15% 0px' }}
      onViewportEnter={() => setStarted(true)}
    >
      {/* 방사광 — 지름 320px, rgba(201,162,39,0.08), 1.2s 페이드인 */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[220px] -translate-x-1/2"
        style={{
          width: 320,
          height: 320,
          borderRadius: '9999px',
          background: 'radial-gradient(circle, rgba(201,162,39,0.08), transparent 70%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: started ? 1 : 0 }}
        transition={{ duration: 1.2 }}
      />
      {/* 국소 금 파티클 8개 — 이 섹션 한정 (§5.7, 전역 14 + 8 ≤ 24 상한) */}
      {started && <GoldDust count={8} className="absolute inset-0" />}

      <div className="relative">
        <div className="mb-3">
          <VerticalLabel text="終章" tone="gold" />
        </div>
        <div className="mb-10 flex justify-center">
          <BrushDivider width={200} tone="gold" />
        </div>
        <p className="break-keep text-center font-serif-kr text-[11px] font-semibold leading-[1.4] tracking-[0.14em] text-[#C9A227]">
          {t('s6.kicker')}
        </p>
      </div>

      {/* 병 + 향수명 레이어 — 헤드라인 없음(향수명이 헤드라인, §5.7) */}
      <div
        className="relative mx-auto mt-10"
        style={{ width: BOTTLE_SIZE, height: BOTTLE_SIZE * 1.6 }}
      >
        {phase !== 'idle' && (
          <SajuBottle
            liquidColors={liquidColors}
            element={chart.yongsin.element}
            phase={phase}
            size={BOTTLE_SIZE}
          />
        )}
        {/* 향수명 — 라벨지 위 HTML 레이어 (scale 1.12→1, easeSettle, 2줄 클램프 + 24자 slice) */}
        {displayName && (
          <motion.div
            className="absolute left-1/2 flex items-center justify-center"
            style={{
              top: LABEL_TOP,
              height: LABEL_H,
              width: NAME_W,
              marginLeft: -NAME_W / 2,
            }}
            initial={{ opacity: 0, scale: 1.12 }}
            animate={revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.12 }}
            transition={{ duration: 0.6, ease: SAJU_EASE_SETTLE }}
          >
            <h2
              className="break-keep text-center font-serif-kr font-black text-[#1A1610]"
              style={{
                fontSize: nameFontSize,
                lineHeight: `${nameLineHeight}px`,
                maxHeight: nameLineHeight * 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {displayName}
            </h2>
          </motion.div>
        )}
      </div>

      {/* 브랜드 라인 — perfumeId 그대로가 이미 브랜드 표기면 중복 접두 없이 */}
      {brandLine && (
        <motion.p
          className="mt-4 text-center font-sans text-[11px] font-semibold uppercase leading-[1.4] tracking-[0.14em] text-[#A69F8D]"
          initial={{ opacity: 0 }}
          animate={revealed ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {brandLine}
        </motion.p>
      )}

      {/* 노트 3단 — 기운의 3층 구조 (병 아래 세로 스택, 스태거 0.3s) */}
      {notes.length > 0 && (
        <div className="mt-10 flex flex-col gap-3">
          {notes.map((note, i) => (
            <motion.div
              key={note.key}
              className="flex items-start gap-3 rounded-lg border border-[#262A38] bg-[#12141D] p-4"
              initial={{ opacity: 0, y: 16 }}
              animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.8, ease: SAJU_EASE_INK, delay: 0.6 + i * 0.3 }}
            >
              {/* 층위 칩 — 금색 상단 헤어라인 + 한글/라틴 (§5.7) */}
              <div className="w-[76px] shrink-0">
                <div aria-hidden className="mb-1.5 h-px w-8 bg-[#C9A227]" />
                <p className="break-keep font-serif-kr text-[11px] font-semibold leading-[1.4] text-[#E9E2D0]">
                  {note.ko}
                </p>
                <p className="font-sans text-[8px] font-semibold tracking-[0.14em] text-[#A69F8D]">
                  {note.latin}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif-kr text-[16px] font-semibold leading-[1.6] text-[#E9E2D0]">
                  {note.name}
                </p>
                {hasText(note.meaning) && (
                  <p
                    className="mt-1 break-keep font-serif-kr text-[12px] leading-[1.6] text-[#A69F8D]"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {note.meaning}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 왜 이 향인가 — 의식의 핵심, 3단 논법 센터피스 (전문 노출, 클램프 금지) */}
      {(hasText(bridge) || hasText(why)) && (
        <motion.div
          className="mt-12"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={SAJU_VIEWPORT}
          transition={{ duration: 0.8, ease: SAJU_EASE_INK }}
        >
          <HanjiCard padding="lg" verticalLabel="調香記" seal="香">
            <p className="mb-3 break-keep font-serif-kr text-[11px] font-semibold leading-[1.4] tracking-[0.14em] text-[#7A5C14]">
              {t('s6.whyTitle')}
            </p>
            {hasText(bridge) && (
              <p className="break-keep font-serif-kr text-[15px] font-semibold leading-[1.85] text-[#1A1610]">
                {bridge}
              </p>
            )}
            {hasText(bridge) && hasText(why) && (
              <div className="my-5 flex justify-center">
                <BrushDivider width={160} tone="ink-on-cream" />
              </div>
            )}
            {hasText(why) && (
              <div className="space-y-4 pr-6">
                {why
                  .split(/\n{2,}/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((para, i) => (
                    <p
                      key={i}
                      className="break-keep font-serif-kr text-[15px] leading-[1.85]"
                      style={{ color: 'rgba(26,22,16,0.85)' }}
                    >
                      {para}
                    </p>
                  ))}
              </div>
            )}
          </HanjiCard>
        </motion.div>
      )}
    </motion.section>
  );
}
