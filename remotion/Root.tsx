import React from 'react';
import { Composition } from 'remotion';
import { AnalysisPreview } from './compositions/AnalysisPreview';

const defaultProps = {
  colors: ['#C084FC', '#F9A8D4', '#1E293B'],
  keywords: ['시크', '달콤', '카리스마'],
  moodScore: 87,
  perfumeName: "AC'SCENT 27\n스모키 블랜드 우드",
  topNotes: '베르가못, 블랙커런트',
  middleNotes: '다마스크 로즈, 피오니',
  baseNotes: '머스크, 샌달우드',
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AnalysisPreview"
        component={AnalysisPreview}
        durationInFrames={180}
        fps={30}
        width={400}
        height={500}
        defaultProps={defaultProps}
      />
    </>
  );
};
