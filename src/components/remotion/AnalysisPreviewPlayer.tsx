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
  colors = ['#C084FC', '#F9A8D4', '#1E293B'],
  keywords = ['시크', '달콤', '카리스마'],
  moodScore = 87,
  perfumeName = 'Purple Dream',
  topNotes = '베르가못, 블랙커런트',
  middleNotes = '다마스크 로즈, 피오니',
  baseNotes = '머스크, 샌달우드',
  className = '',
}: AnalysisPreviewPlayerProps) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border-2 border-black shadow-[4px_4px_0_0_black] ${className}`}>
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
      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-white text-xs font-bold rounded-full flex items-center gap-1">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        LIVE PREVIEW
      </div>
    </div>
  )
}
