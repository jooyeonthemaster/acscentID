"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Droplets } from 'lucide-react'
import { PerfumePersona } from '@/types/analysis'

interface PerfumeNotesProps {
  persona?: PerfumePersona
}

export function PerfumeNotes({ persona }: PerfumeNotesProps) {
  const notes = [
    {
      type: '탑노트',
      name: persona?.mainScent?.name || '시트러스',
      // AI 생성 주접 멘트가 있으면 사용, 없으면 기본 설명
      description: persona?.mainScent?.fanComment || '첫 인상을 결정하는 가벼운 향 ✨',
      time: '0-30분',
      gradient: 'from-yellow-400 to-amber-400',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200'
    },
    {
      type: '미들노트',
      name: persona?.subScent1?.name || '플로럴',
      description: persona?.subScent1?.fanComment || '향수의 핵심이 되는 중심 향 💕',
      time: '30분-2시간',
      gradient: 'from-amber-400 to-orange-400',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    },
    {
      type: '베이스노트',
      name: persona?.subScent2?.name || '우디',
      description: persona?.subScent2?.fanComment || '오래 지속되는 깊은 향 🌙',
      time: '2-6시간',
      gradient: 'from-orange-400 to-rose-400',
      bg: 'bg-orange-50',
      border: 'border-orange-200'
    }
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-yellow-400 flex items-center justify-center text-white">
          <Droplets size={14} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">향 노트</h3>
          <p className="text-[10px] text-slate-400">시간에 따른 향의 변화</p>
        </div>
      </div>

      {/* 노트 카드들 */}
      <div className="space-y-2">
        {notes.map((note, index) => (
          <motion.div
            key={note.type}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative rounded-xl p-3 ${note.bg} border ${note.border} overflow-hidden`}
          >
            {/* 그라디언트 라인 */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${note.gradient}`} />

            <div className="flex gap-3 pl-2">
              {/* 메인 콘텐츠 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {note.type}
                  </span>
                  <span className="text-[9px] text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">
                    {note.time}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {note.name}
                </h4>
                <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                  {note.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 타임라인 */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-500 mb-2">향 발현 타임라인</p>
        <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute inset-0 flex"
          >
            <div className="h-full w-[15%] bg-gradient-to-r from-yellow-400 to-amber-400" />
            <div className="h-full w-[50%] bg-gradient-to-r from-amber-400 to-orange-400" />
            <div className="h-full w-[35%] bg-gradient-to-r from-orange-400 to-rose-400" />
          </motion.div>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] text-slate-400">탑 (0-30분)</span>
          <span className="text-[9px] text-slate-400">미들 (30분-2시간)</span>
          <span className="text-[9px] text-slate-400">베이스 (2-6시간)</span>
        </div>
      </div>
    </div>
  )
}
