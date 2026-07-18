"use client"

import React from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Scan, FlaskConical, GitCompare, Camera } from 'lucide-react'

// 일반 모드 탭 타입
type DefaultTabType = 'analysis' | 'perfume' | 'comparison'
// 졸업 모드 탭 타입
type GraduationTabType = 'graduation' | 'perfume' | 'analysis'
// 통합 탭 타입
type TabType = DefaultTabType | GraduationTabType

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  isDesktop?: boolean
  isFigureMode?: boolean  // 더 이상 사용하지 않지만 호환성 유지
  isGraduationMode?: boolean
}

export function TabNavigation({ activeTab, onTabChange, isDesktop = false, isGraduationMode = false }: TabNavigationProps) {
  const t = useTranslations('tabs')

  // 졸업 모드 탭
  const graduationTabs = [
    { id: 'graduation' as const, label: t('graduationJourney'), icon: Camera, emoji: '🎓' },
    { id: 'perfume' as const, label: t('recommendedPerfume'), icon: FlaskConical, emoji: '💎' },
    { id: 'analysis' as const, label: t('analysisResult'), icon: Scan, emoji: '🔍' }
  ]

  // 일반 모드 탭 (피규어 모드 포함)
  const defaultTabs = [
    { id: 'perfume' as const, label: t('perfumeRecommend'), icon: FlaskConical, emoji: '💎' },
    { id: 'analysis' as const, label: t('analysisResult'), icon: Scan, emoji: '🔍' },
    { id: 'comparison' as const, label: t('comparison'), icon: GitCompare, emoji: '⚡' }
  ]

  const tabs = isGraduationMode ? graduationTabs : defaultTabs

  // PC 레이아웃: 가로 배치 (키치 스타일)
  if (isDesktop) {
    return (
      <div className="relative bg-[#EDE5D2] p-2.5 rounded-t-[12px] border-b-2 border-[#D8CFBB]">
        <div className="grid gap-2 grid-cols-3">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center justify-center gap-2.5 py-3 px-5 text-sm lg:text-base font-bold transition-all rounded-[12px] border ${
                  isActive
                    ? 'text-[#1A1610] bg-[#F5EFE2] border-[#A87B10]'
                    : 'text-[#6E6659] bg-transparent border-transparent hover:bg-[#F5EFE2]/70 hover:text-[#5C564A]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon size={15} strokeWidth={2} />
                  <span className="font-semibold">{tab.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 모바일 레이아웃 (키치 스타일)
  // 졸업 모드: 3개 탭을 한 줄에 표시
  if (isGraduationMode) {
    return (
      <div className="relative bg-[#EDE5D2] p-2 rounded-t-[12px] border-b-2 border-[#D8CFBB]">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center justify-center gap-1 py-2.5 px-2 text-sm lg:text-base transition-all rounded-[12px] border ${
                  isActive
                    ? 'text-[#1A1610] bg-[#F5EFE2] border-[#A87B10]'
                    : 'text-[#6E6659] bg-transparent border-transparent hover:bg-[#F5EFE2]/70'
                }`}
              >
                <span className="flex flex-col items-center gap-0.5">
                  <Icon size={14} strokeWidth={2} />
                  <span className="font-semibold text-[12px] lg:text-[12px]">{tab.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 일반 모드: 기존 레이아웃 (피규어 모드 포함)
  return (
    <div className="relative bg-[#EDE5D2] p-2 rounded-t-[12px] border-b-2 border-[#D8CFBB]">
      <div className="grid grid-cols-2 gap-2 mb-2">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center justify-center gap-2 py-2.5 px-3 text-sm lg:text-base transition-all rounded-[12px] border ${
                isActive
                  ? 'text-[#1A1610] bg-[#F5EFE2] border-[#A87B10]'
                  : 'text-[#6E6659] bg-transparent border-transparent hover:bg-[#F5EFE2]/70'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon size={14} strokeWidth={2} />
                <span className="font-semibold text-xs lg:text-sm">{tab.label}</span>
              </span>
            </button>
          )
        })}
      </div>
      <div>
        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative w-full flex items-center justify-center gap-2 py-2.5 px-3 text-sm lg:text-base transition-all rounded-[12px] border ${
                isActive
                  ? 'text-[#1A1610] bg-[#F5EFE2] border-[#A87B10]'
                  : 'text-[#6E6659] bg-transparent border-transparent hover:bg-[#F5EFE2]/70'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon size={14} strokeWidth={2} />
                <span className="font-semibold text-xs lg:text-sm">{tab.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
