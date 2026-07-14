'use client';

// ============================================================
// 처방전 — 리츄얼 (UI-SPEC §5.8, S7)
// 배경 반전 섹션: full-bleed 크림(.saju-hanji) — 두루마리의 마지막.
// 위 경계 = 족자 봉 모티프(§4.5 봉 재사용, 정적).
// 처방 항목(세로 리스트, 한자 불릿):
//   時 뿌리는 때(ritualGuide 전문) / 景 향이 놓이는 장면(wearingMoment)
//   季 어울리는 계절·시간(칩 — 이모지 금지) / 流 올해의 흐름(yearlyFlow, 인용 스타일)
// 키워드 낙관 칩(matchingKeywords ≤4) + 공유 넛지 + 마무리 사주 분석 로고.
// ※ SajuResultPage는 이 섹션을 가로 패딩 래퍼 없이(full-bleed) 렌더할 것.
// ============================================================

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Image from 'next/image';
import type { BestSeasonType, BestTimeType } from '@/types/analysis';
import { BEST_SEASON_LABELS, BEST_TIME_LABELS } from '@/types/analysis';
import {
  BrushDivider,
  CloudPuff,
  VerticalLabel,
  SAJU_EASE_INK,
  SAJU_VIEWPORT,
} from '@/components/saju';

// 섹션 prop 계약 SSOT — sections/types.ts (+ 공유 넛지용 optional 콜백 확장)
import type { PrescriptionProps as PrescriptionBaseProps } from './types';

export interface PrescriptionProps extends PrescriptionBaseProps {
  /** 공유 넛지 탭 시 호출 — SajuResultPage의 handleShare 재사용(미전달 시 넛지 텍스트만 노출) */
  onShare?: () => void;
}

const hasText = (s?: string | null): s is string => !!s && s.trim().length > 0;

const SEASON_KEYS: BestSeasonType[] = ['spring', 'summer', 'autumn', 'winter'];
const TIME_KEYS: BestTimeType[] = ['morning', 'afternoon', 'evening', 'night'];

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

/** 크림 지면 위 서사 전문 — \n\n 문단 분할, break-keep */
function CreamNarrative({ text }: { text: string }) {
  const paras = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="space-y-3">
      {paras.map((para, i) => (
        <p
          key={i}
          className="break-keep font-serif-kr text-[15px] leading-[1.85] text-[#1A1610]"
        >
          {para}
        </p>
      ))}
    </div>
  );
}

/** 족자 봉 모티프 — §4.5 봉의 정적 재사용 (위 경계) */
function ScrollRod() {
  return (
    <div aria-hidden className="relative h-[18px] w-full">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #2A2416 0%, #4A3F22 50%, #2A2416 100%)' }}
      />
      {/* 양끝 금 마구리 — 셸 밖으로 6px 돌출 */}
      {(['left', 'right'] as const).map((side) => (
        <div
          key={side}
          className="absolute top-1/2 h-[26px] w-[26px] -translate-y-1/2 rounded-full"
          style={{
            [side]: -6,
            background:
              'linear-gradient(105deg, #8A6D1F 0%, #C9A227 22%, #F2DA8A 50%, #E8C766 62%, #C9A227 80%, #8A6D1F 100%)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
          }}
        />
      ))}
    </div>
  );
}

/** 처방 행 — 한자 불릿 + 제목 + 내용 (아이콘 없이, §5.8) */
function PrescriptionRow({
  hanja,
  title,
  children,
}: {
  hanja: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span
        aria-hidden
        className="w-8 shrink-0 pt-[2px] text-center font-serif-kr text-[19px] font-black leading-[1.5] text-[#A93226]"
      >
        {hanja}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 break-keep font-serif-kr text-[13px] font-semibold leading-[1.5] text-[#5C564A]">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

function Chip({ label, selected }: { label: string; selected: boolean }) {
  return (
    <span
      className={`inline-flex h-9 items-center rounded border px-3 font-serif-kr text-[13px] leading-none ${
        selected
          ? 'border-transparent bg-[#C0392B] text-[#F5EFE2]'
          : 'border-[#1A1610]/25 text-[#1A1610]'
      }`}
    >
      {label}
    </span>
  );
}

export function Prescription({ result, targetType, onShare }: PrescriptionProps) {
  const t = useTranslations('saju.result');
  const tt = (key: string, fallback: string) => (t.has(key) ? t(key) : fallback);
  const reduce = useReducedMotion();
  const [sealStamped, setSealStamped] = useState(false);

  const destiny = result.sajuAnalysis?.scentDestiny;
  const yearly = result.sajuAnalysis?.yearlyFlow;
  const rec = result.scentRecommendation;
  const keywords = (result.matchingKeywords ?? []).filter(hasText).slice(0, 4);

  const ritualGuide = destiny?.ritualGuide;
  const wearingMoment = destiny?.wearingMoment;

  return (
    <section className="saju-hanji relative overflow-x-clip bg-[#F5EFE2]">
      <ScrollRod />

      {/* 운문 워터마크 — 실물 패키지와 같은 무늬를 처방전 여백에 (먹 저농도, SAJU_CLOUDS) */}
      <CloudPuff
        tone="cream"
        width={160}
        fillOpacity={0.03}
        strokeOpacity={0.12}
        className="absolute -right-6 top-14"
      />
      <CloudPuff
        tone="cream"
        width={130}
        flip
        fillOpacity={0.03}
        strokeOpacity={0.12}
        className="absolute -left-5 bottom-28"
      />

      <div className="relative px-6 pt-8 pb-8">
        {/* 오프너 — 크림 지면: ink 톤 */}
        <div className="relative">
          <div className="mb-3">
            <VerticalLabel text="處方" tone="ink" />
          </div>
          <div className="mb-10 flex justify-center">
            <BrushDivider width={200} tone="ink-on-cream" />
          </div>
          <p className="break-keep text-center font-serif-kr text-[11px] font-semibold leading-[1.4] tracking-[0.14em] text-[#7A5C14]">
            {t('s7.kicker')}
          </p>
          <FadeIn delay={0.1}>
            <h2 className="mt-3 break-keep text-center font-serif-kr text-[34px] font-black leading-[1.35] tracking-[-0.01em] text-[#1A1610]">
              {t('s7.headline')}
            </h2>
          </FadeIn>
        </div>

        <div className="mt-12 flex flex-col gap-10">
          {/* 時 — 뿌리는 때 */}
          {hasText(ritualGuide) && (
            <FadeIn>
              <PrescriptionRow hanja="時" title={t('s7.rows.time')}>
                <CreamNarrative text={ritualGuide} />
              </PrescriptionRow>
            </FadeIn>
          )}

          {/* 景 — 향이 놓이는 장면 (wearingMoment) */}
          {hasText(wearingMoment) && (
            <FadeIn delay={0.1}>
              <PrescriptionRow hanja="景" title={tt('s7.rows.moment', '향이 놓이는 장면')}>
                <CreamNarrative text={wearingMoment} />
              </PrescriptionRow>
            </FadeIn>
          )}

          {/* 季 — 어울리는 계절/시간 (칩 — 이모지 금지, §5.8) */}
          {rec && (
            <FadeIn delay={0.1}>
              <PrescriptionRow hanja="季" title={t('s7.rows.season')}>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="mb-1.5 font-sans text-[8px] font-semibold tracking-[0.3em] text-[#5C564A]">
                      BEST SEASON
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SEASON_KEYS.map((key) => (
                        <Chip
                          key={key}
                          label={BEST_SEASON_LABELS[key].label}
                          selected={rec.best_season === key}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 font-sans text-[8px] font-semibold tracking-[0.3em] text-[#5C564A]">
                      BEST TIME
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TIME_KEYS.map((key) => (
                        <Chip
                          key={key}
                          label={BEST_TIME_LABELS[key].label}
                          selected={rec.best_time === key}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </PrescriptionRow>
            </FadeIn>
          )}

          {/* 流 — 올해의 흐름 (좌측 주사 세로바 인용 스타일) */}
          {yearly && (hasText(yearly.yearTitle) || hasText(yearly.narrative)) && (
            <FadeIn delay={0.1}>
              <PrescriptionRow hanja="流" title={t('s7.rows.flow')}>
                <div className="border-l-2 border-[#C0392B] pl-3">
                  {hasText(yearly.yearTitle) && (
                    <p className="mb-1 break-keep font-serif-kr text-[15px] font-semibold leading-[1.85] text-[#1A1610]">
                      {yearly.yearTitle}
                    </p>
                  )}
                  {hasText(yearly.narrative) && <CreamNarrative text={yearly.narrative} />}
                </div>
              </PrescriptionRow>
            </FadeIn>
          )}
        </div>

        {/* 키워드 낙관 칩 — matchingKeywords ≤4 */}
        {keywords.length > 0 && (
          <FadeIn delay={0.1} className="mt-14">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {keywords.map((keyword, i) => (
                <span
                  key={`${keyword}-${i}`}
                  className="inline-flex items-center rounded-[6px] border-[1.5px] border-[#A93226] px-2.5 py-1.5 font-serif-kr text-[12px] font-semibold leading-none text-[#A93226]"
                  style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </FadeIn>
        )}

        {/* 공유 넛지 */}
        <FadeIn delay={0.15} className="mt-10">
          <div className="text-center">
            <p className="break-keep font-serif-kr text-[12px] leading-[1.6] text-[#5C564A]">
              {tt('s7.shareNudge', '이 단자를 아끼는 사람에게도 보여 주세요.')}
            </p>
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="mt-2 break-keep font-serif-kr text-[12px] font-semibold leading-[1.6] text-[#A93226] underline underline-offset-4"
              >
                {tt('s7.shareAction', '단자 공유하기')}
              </button>
            )}
          </div>
        </FadeIn>

        {/* 마무리 낙관 */}
        <motion.div
          className="mt-14 flex flex-col items-center gap-4"
          viewport={SAJU_VIEWPORT}
          onViewportEnter={() => setSealStamped(true)}
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 1.12 }}
            animate={sealStamped ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.7, ease: SAJU_EASE_INK }}
          >
            <Image
              src="/images/saju/saju-logo.png"
              alt={tt('s7.closingSealAlt', '사주 분석 퍼퓸')}
              width={72}
              height={72}
              className="h-[72px] w-[72px] select-none object-contain"
            />
          </motion.div>
          <p className="max-w-[300px] break-keep text-center font-serif-kr text-[12px] leading-[1.6] text-[#5C564A]">
            {targetType === 'idol' ? t('s7.closingIdol') : t('s7.closing')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
