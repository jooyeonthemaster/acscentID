'use client'

import { Player } from '@remotion/player'
import { AnalysisPreview } from '../../../remotion/compositions/AnalysisPreview'

interface AnalysisPreviewPlayerProps {
  colors?: string[]
  keywords?: string[]
  moodScore?: number
  perfumeName?: string
  topNotes?: string
  middleNotes?: string
  baseNotes?: string
  className?: string
}

export function AnalysisPreviewPlayer({
  colors = ['#9F9F9F', '#C0C0C0', '#292929'],
  keywords = ['시크', '달콤', '카리스마'],
  moodScore = 87,
  perfumeName = "AC'SCENT 27\n스모키 블랜드 우드",
  topNotes = '베르가못, 블랙커런트',
  middleNotes = '다마스크 로즈, 피오니',
  baseNotes = '머스크, 샌달우드',
  className = '',
}: AnalysisPreviewPlayerProps) {
  return (
    <div
      data-admin-lock-region="analysis-preview-animation"
      className={`relative rounded-[12px] overflow-hidden border-2 border-[#262A38] ${className}`}
    >
      <Player
        component={AnalysisPreview}
        inputProps={{
          colors,
          keywords,
          moodScore,
          perfumeName,
          topNotes,
          middleNotes,
          baseNotes,
        }}
        durationInFrames={180}
        fps={30}
        compositionWidth={400}
        compositionHeight={500}
        style={{
          width: '100%',
          aspectRatio: '4/5',
        }}
        controls={false}
        loop
        autoPlay
      />
      {/* 재생 인디케이터 */}
      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-[#E9E2D0] text-xs lg:text-sm font-bold rounded-full flex items-center gap-1">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        LIVE PREVIEW
      </div>
    </div>
  )
}
