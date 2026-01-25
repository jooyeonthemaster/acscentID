"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Scan, FlaskConical, GitCompare, Camera, Palette } from 'lucide-react'

// 일반 모드 탭 타입
type DefaultTabType = 'analysis' | 'perfume' | 'comparison'
// 피규어 모드 탭 타입
type FigureTabType = 'memory' | 'perfume' | 'figure' | 'analysis'
// 통합 탭 타입
type TabType = DefaultTabType | FigureTabType

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  isDesktop?: boolean
  isFigureMode?: boolean
}

export function TabNavigation({ activeTab, onTabChange, isDesktop = false, isFigureMode = false }: TabNavigationProps) {
  // 피규어 모드 탭
  const figureTabs = [
    { id: 'memory' as const, label: '기억의 순간', icon: Camera, emoji: '📸' },
    { id: 'perfume' as const, label: '맞춤 향수', icon: FlaskConical, emoji: '💎' },
    { id: 'figure' as const, label: '피규어', icon: Palette, emoji: '🎨' },
    { id: 'analysis' as const, label: '분석 결과', icon: Scan, emoji: '🔍' }
  ]

  // 일반 모드 탭
  const defaultTabs = [
    { id: 'perfume' as const, label: '향수 추천', icon: FlaskConical, emoji: '💎' },
    { id: 'analysis' as const, label: '분석 결과', icon: Scan, emoji: '🔍' },
    { id: 'comparison' as const, label: '비교 분석', icon: GitCompare, emoji: '⚡' }
  ]

  const tabs = isFigureMode ? figureTabs : defaultTabs

  // PC 레이아웃: 가로 배치 (키치 스타일)
  // 피규어 모드: 4열, 일반 모드: 3열
  if (isDesktop) {
    return (
      <div className="relative bg-[#FEF9C3] p-2.5 rounded-t-2xl border-b-2 border-slate-900">
        <div className={`grid gap-2 ${isFigureMode ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center justify-center gap-2.5 py-3 px-5 text-sm font-bold transition-all rounded-xl border-2 ${
                  isActive
                    ? 'text-slate-900 bg-white border-slate-900 shadow-[3px_3px_0px_#000]'
                    : 'text-slate-500 bg-white/50 border-transparent hover:bg-white/80 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{tab.emoji}</span>
                  <span className="font-black">{tab.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 모바일 레이아웃 (키치 스타일)
  // 피규어 모드: 4개 탭을 2x2 그리드로 표시
  if (isFigureMode) {
    return (
      <div className="relative bg-[#FEF9C3] p-2 rounded-t-2xl border-b-2 border-slate-900">
        <div className="grid grid-cols-2 gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center justify-center gap-2 py-2.5 px-3 text-sm transition-all rounded-xl border-2 ${
                  isActive
                    ? 'text-slate-900 bg-white border-slate-900 shadow-[2px_2px_0px_#000]'
                    : 'text-slate-500 bg-white/50 border-transparent hover:bg-white/80'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-sm">{tab.emoji}</span>
                  <span className="font-bold text-xs">{tab.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 일반 모드: 기존 레이아웃
  return (
    <div className="relative bg-[#FEF9C3] p-2 rounded-t-2xl border-b-2 border-slate-900">
      <div className="grid grid-cols-2 gap-2 mb-2">
        {tabs.slice(0, 2).map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center justify-center gap-2 py-2.5 px-3 text-sm transition-all rounded-xl border-2 ${
                isActive
                  ? 'text-slate-900 bg-white border-slate-900 shadow-[2px_2px_0px_#000]'
                  : 'text-slate-500 bg-white/50 border-transparent hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm">{tab.emoji}</span>
                <span className="font-bold text-xs">{tab.label}</span>
              </span>
            </button>
          )
        })}
      </div>
      <div>
        {tabs.slice(2).map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative w-full flex items-center justify-center gap-2 py-2.5 px-3 text-sm transition-all rounded-xl border-2 ${
                isActive
                  ? 'text-slate-900 bg-white border-slate-900 shadow-[2px_2px_0px_#000]'
                  : 'text-slate-500 bg-white/50 border-transparent hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm">{tab.emoji}</span>
                <span className="font-bold text-xs">{tab.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
