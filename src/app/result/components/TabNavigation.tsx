"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Scan, FlaskConical, GitCompare } from 'lucide-react'

interface TabNavigationProps {
  activeTab: 'analysis' | 'perfume' | 'comparison'
  onTabChange: (tab: 'analysis' | 'perfume' | 'comparison') => void
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'perfume' as const, label: '향수 추천', icon: FlaskConical },
    { id: 'analysis' as const, label: '분석 결과', icon: Scan },
    { id: 'comparison' as const, label: '비교 분석', icon: GitCompare }
  ]

  return (
    <div className="relative bg-slate-100/80 p-1.5 rounded-t-3xl">
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-colors rounded-2xl ${
                isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white shadow-sm rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={16} className={isActive ? 'text-yellow-500' : ''} />
                {tab.label}
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
              className={`relative w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-colors rounded-2xl ${
                isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white shadow-sm rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={16} className={isActive ? 'text-yellow-500' : ''} />
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
