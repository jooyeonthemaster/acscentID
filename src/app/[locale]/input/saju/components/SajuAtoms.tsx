'use client'

// ============================================================
// 사주 문진 위저드 — 공용 아톰 (UI-SPEC §3.1 폼 문법)
// 밑줄 필기 입력 / 성별 필 / 헬퍼 노트 / 페이즈 헤더 / 금 파티클(GoldDust §2.7)
// ============================================================

import type { ReactNode } from 'react'

// ---------- 페이즈 헤더 ----------

export function PhaseHeader({ title, sub }: { title: string; sub: string }) {
    return (
        <div className="mb-8">
            <h1 className="font-serif-kr break-keep text-[24px] font-semibold leading-[1.45] text-[#E9E2D0]">
                {title}
            </h1>
            <p className="font-serif-kr break-keep mt-3 text-[12px] leading-[1.6] text-[#A69F8D]">
                {sub}
            </p>
        </div>
    )
}

// ---------- 폼 라벨 (label 스케일 — 11px/600/tracking 0.14em) ----------

export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={`font-serif-kr block text-[11px] font-semibold leading-[1.4] tracking-[0.14em] text-[#A69F8D] ${className ?? ''}`}
        >
            {children}
        </span>
    )
}

// ---------- 밑줄 필기 입력 (박스 입력 금지 — §3.1) ----------

interface UnderlineFieldProps {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder: string
    maxLength?: number
    name?: string
}

export function UnderlineField({ label, value, onChange, placeholder, maxLength, name }: UnderlineFieldProps) {
    return (
        <div className="space-y-1.5">
            <FieldLabel>{label}</FieldLabel>
            <input
                type="text"
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                className="font-serif-kr h-12 w-full rounded-none border-0 border-b border-[#262A38] bg-transparent px-1 text-[17px] text-[#E9E2D0] outline-none transition-colors placeholder:text-[#3A3E4C] focus:border-[#C9A227]"
            />
        </div>
    )
}

// ---------- 성별 필 [乾 남성][坤 여성][기타] ----------

export interface GenderOptionLabels {
    male: string
    female: string
    other: string
}

interface GenderPillsProps {
    value: 'male' | 'female' | 'other' | ''
    onChange: (value: 'male' | 'female' | 'other') => void
    labels: GenderOptionLabels
    label: string
}

const GENDER_HANJA: Record<'male' | 'female' | 'other', string | null> = {
    male: '乾',
    female: '坤',
    other: null,
}

export function GenderPills({ value, onChange, labels, label }: GenderPillsProps) {
    return (
        <div className="space-y-1.5">
            <FieldLabel>{label}</FieldLabel>
            <div className="flex gap-2">
                {(['male', 'female', 'other'] as const).map((key) => {
                    const isActive = value === key
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onChange(key)}
                            className={`font-serif-kr h-11 flex-1 rounded-md border text-[14px] transition-colors duration-300 ${
                                isActive
                                    ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#E9E2D0]'
                                    : 'border-[#262A38] bg-transparent text-[#A69F8D]'
                            }`}
                        >
                            {GENDER_HANJA[key] ? (
                                <span>
                                    <span className="mr-1.5">{GENDER_HANJA[key]}</span>
                                    {labels[key]}
                                </span>
                            ) : (
                                labels[key]
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ---------- 헬퍼 노트 (얇은 금 세로바 2px + caption) ----------

export function HelperNote({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'cinnabar' }) {
    return (
        <div className="flex gap-2.5">
            <div
                aria-hidden
                className="mt-0.5 w-[2px] flex-shrink-0 self-stretch"
                style={{ background: tone === 'gold' ? '#C9A227' : '#C0392B' }}
            />
            <p className="font-serif-kr break-keep text-[12px] leading-[1.6] text-[#5C564A]">
                {children}
            </p>
        </div>
    )
}

// ---------- GoldDust — 금 파티클 (UI-SPEC §2.7) ----------
// 구현은 스펙 정위치인 src/components/saju/GoldDust.tsx 로 공통화되었다
// (수치 toFixed 고정 포맷 → SSR/CSR hydration 동일). 여기는 재-export만.

export { GoldDust, type GoldDustProps } from '@/components/saju/GoldDust'
