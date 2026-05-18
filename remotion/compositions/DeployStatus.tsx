import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const FONT_MONO = '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_DISPLAY = '"Space Grotesk", "IBM Plex Sans", system-ui, sans-serif';

const COLOR_BG = '#0B0D10';
const COLOR_INK = '#F5F7FA';
const COLOR_MUTED = '#6B7480';
const COLOR_OK = '#7FFFB3';
const COLOR_WARN = '#FFD166';
const COLOR_ALERT = '#FF6B6B';
const COLOR_ACCENT = '#5CE1FF';

const Grain: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      mixBlendMode: 'overlay',
      opacity: 0.06,
      backgroundImage:
        'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)',
      backgroundSize: '3px 3px',
    }}
  />
);

const Frame: React.FC<{ label: string; index: string }> = ({ label, index }) => {
  const frame = useCurrentFrame();
  const lineWidth = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 48,
          left: 64,
          right: 64,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: FONT_MONO,
          fontSize: 18,
          letterSpacing: 2,
          color: COLOR_MUTED,
        }}
      >
        <span>{index}</span>
        <span>{label}</span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 82,
          left: 64,
          right: 64,
          height: 2,
          background: COLOR_MUTED,
          opacity: 0.3,
          transform: `scaleX(${lineWidth})`,
          transformOrigin: 'left center',
        }}
      />
    </>
  );
};

const Footer: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      bottom: 48,
      left: 64,
      right: 64,
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: FONT_MONO,
      fontSize: 16,
      color: COLOR_MUTED,
      letterSpacing: 2,
    }}
  >
    <span>www.acscent.co.kr</span>
    <span>DEPLOY · 2026-05-15</span>
  </div>
);

const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const t2 = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 90 } });
  const cursor = Math.floor(frame / 15) % 2 === 0 ? '█' : ' ';

  return (
    <AbsoluteFill style={{ background: COLOR_BG, color: COLOR_INK }}>
      <Frame index="01 / 06" label="STATUS · DEPLOY REPORT" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: 96,
          paddingRight: 96,
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 22,
            color: COLOR_ACCENT,
            letterSpacing: 4,
            opacity: t1,
            transform: `translateY(${interpolate(t1, [0, 1], [20, 0])}px)`,
          }}
        >
          $ vercel --prod ✓
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 152,
            lineHeight: 1.02,
            letterSpacing: -3,
            marginTop: 28,
            opacity: t1,
            transform: `translateY(${interpolate(t1, [0, 1], [30, 0])}px)`,
          }}
        >
          앱은 배포됐다.
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 152,
            lineHeight: 1.02,
            letterSpacing: -3,
            color: COLOR_WARN,
            opacity: t2,
            transform: `translateY(${interpolate(t2, [0, 1], [30, 0])}px)`,
          }}
        >
          DB는 아직.{cursor}
        </div>
      </div>
      <Footer />
    </AbsoluteFill>
  );
};

type CheckItem = { label: string; ok: boolean };

const SceneVercelDone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items: CheckItem[] = [
    { label: 'GitHub push', ok: true },
    { label: 'Vercel production deploy', ok: true },
    { label: 'www.acscent.co.kr alias 연결', ok: true },
    { label: 'production 페이지 200 응답', ok: true },
  ];

  return (
    <AbsoluteFill style={{ background: COLOR_BG, color: COLOR_INK }}>
      <Frame index="02 / 06" label="VERCEL · COMPLETE" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: 96,
          paddingRight: 96,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 96,
            letterSpacing: -2,
            marginBottom: 56,
          }}
        >
          <span style={{ color: COLOR_OK }}>✓</span> Vercel 배포 완료
        </div>
        {items.map((item, i) => {
          const start = i * 10;
          const s = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 90 } });
          return (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 32,
                marginTop: 24,
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 28,
                  color: COLOR_OK,
                  width: 60,
                }}
              >
                [✓]
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 500,
                  fontSize: 48,
                  color: COLOR_INK,
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      <Footer />
    </AbsoluteFill>
  );
};

const SceneGap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const t2 = spring({ frame: frame - 18, fps, config: { damping: 18, stiffness: 90 } });
  const t3 = spring({ frame: frame - 40, fps, config: { damping: 18, stiffness: 90 } });

  return (
    <AbsoluteFill style={{ background: COLOR_BG, color: COLOR_INK }}>
      <Frame index="03 / 06" label="GAP · WHY DB IS SEPARATE" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: 96,
          paddingRight: 96,
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 22,
            letterSpacing: 4,
            color: COLOR_ALERT,
            opacity: t1,
          }}
        >
          ! 자동 실행 안 됨
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 84,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            marginTop: 28,
            opacity: t1,
            transform: `translateY(${interpolate(t1, [0, 1], [20, 0])}px)`,
          }}
        >
          Vercel은{' '}
          <span style={{ color: COLOR_ACCENT }}>migrations/*.sql</span>
          <br />
          파일을 업로드는 한다.
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 84,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            marginTop: 24,
            color: COLOR_WARN,
            opacity: t2,
            transform: `translateY(${interpolate(t2, [0, 1], [20, 0])}px)`,
          }}
        >
          그런데 운영 DB에 실행은 안 한다.
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 24,
            color: COLOR_MUTED,
            marginTop: 40,
            opacity: t3,
            letterSpacing: 1,
          }}
        >
          → 앱 배포 ≠ 스키마 반영
        </div>
      </div>
      <Footer />
    </AbsoluteFill>
  );
};

const SceneFile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ background: COLOR_BG, color: COLOR_INK }}>
      <Frame index="04 / 06" label="MIGRATION · ONE FILE" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: 96,
          paddingRight: 96,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            fontSize: 64,
            letterSpacing: -1,
            color: COLOR_MUTED,
            marginBottom: 32,
            opacity: t,
          }}
        >
          적용해야 하는 파일은 단{' '}
          <span style={{ color: COLOR_INK }}>1개</span>
        </div>

        <div
          style={{
            border: `2px solid ${COLOR_ACCENT}`,
            borderRadius: 4,
            padding: '32px 40px',
            background: 'rgba(92, 225, 255, 0.06)',
            opacity: t,
            transform: `translateY(${interpolate(t, [0, 1], [40, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 20,
              color: COLOR_ACCENT,
              letterSpacing: 3,
              marginBottom: 16,
            }}
          >
            supabase/migrations/
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 56,
              fontWeight: 700,
              color: COLOR_INK,
              letterSpacing: -1,
              wordBreak: 'break-all',
            }}
          >
            20260515_daily_analysis_limit
            <span style={{ color: COLOR_WARN }}>_and_</span>
            cancel_reason.sql
          </div>
        </div>
      </div>
      <Footer />
    </AbsoluteFill>
  );
};

type Change = { kind: string; name: string; note: string };

const SceneChanges: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const changes: Change[] = [
    { kind: 'TABLE', name: 'analysis_daily_usage', note: '일일 사용량 카운터' },
    { kind: 'TABLE', name: 'analysis_usage_events', note: '사용 이벤트 로그' },
    { kind: 'RPC', name: 'consume_daily_analysis_usage()', note: 'KST 자정 기준 3회 제한' },
    { kind: 'COLUMN', name: 'orders.cancel_reason', note: '환불 사유 컬럼' },
    { kind: 'CHECK', name: 'refund_reason · refund_logs.reason', note: '환불 시 필수' },
  ];

  return (
    <AbsoluteFill style={{ background: COLOR_BG, color: COLOR_INK }}>
      <Frame index="05 / 06" label="DIFF · 5 CHANGES" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: 96,
          paddingRight: 96,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 72,
            letterSpacing: -1.5,
            marginBottom: 40,
          }}
        >
          이 SQL이 만드는 변화
        </div>
        {changes.map((c, i) => {
          const s = spring({ frame: frame - i * 8, fps, config: { damping: 18, stiffness: 90 } });
          const kindColor =
            c.kind === 'TABLE' ? COLOR_ACCENT : c.kind === 'RPC' ? COLOR_OK : c.kind === 'COLUMN' ? COLOR_WARN : COLOR_ALERT;
          return (
            <div
              key={c.name}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 24,
                marginTop: 16,
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-20, 0])}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 18,
                  fontWeight: 700,
                  color: kindColor,
                  letterSpacing: 2,
                  width: 110,
                }}
              >
                {c.kind}
              </span>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 32,
                  fontWeight: 600,
                  color: COLOR_INK,
                }}
              >
                {c.name}
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 24,
                  color: COLOR_MUTED,
                  marginLeft: 12,
                }}
              >
                {c.note}
              </span>
            </div>
          );
        })}
      </div>
      <Footer />
    </AbsoluteFill>
  );
};

const SceneAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const t2 = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 90 } });
  const cursor = Math.floor(frame / 12) % 2 === 0 ? '▌' : ' ';

  return (
    <AbsoluteFill style={{ background: COLOR_BG, color: COLOR_INK }}>
      <Frame index="06 / 06" label="ACTION · RUN IT" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: 96,
          paddingRight: 96,
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 24,
            letterSpacing: 4,
            color: COLOR_OK,
            opacity: t1,
          }}
        >
          NEXT STEP
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 132,
            lineHeight: 1.02,
            letterSpacing: -2.5,
            marginTop: 24,
            opacity: t1,
            transform: `translateY(${interpolate(t1, [0, 1], [30, 0])}px)`,
          }}
        >
          Supabase
          <br />
          <span style={{ color: COLOR_ACCENT }}>SQL Editor</span>에서
          <br />
          파일 전체 실행.
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 28,
            color: COLOR_WARN,
            marginTop: 40,
            opacity: t2,
            letterSpacing: 1,
          }}
        >
          $ paste &amp; run → 일일 3회 제한 · 환불 사유 저장 ON{cursor}
        </div>
      </div>
      <Footer />
    </AbsoluteFill>
  );
};

export const DeployStatus: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLOR_BG }}>
      <Sequence from={0} durationInFrames={90}>
        <SceneTitle />
      </Sequence>
      <Sequence from={90} durationInFrames={100}>
        <SceneVercelDone />
      </Sequence>
      <Sequence from={190} durationInFrames={100}>
        <SceneGap />
      </Sequence>
      <Sequence from={290} durationInFrames={90}>
        <SceneFile />
      </Sequence>
      <Sequence from={380} durationInFrames={110}>
        <SceneChanges />
      </Sequence>
      <Sequence from={490} durationInFrames={110}>
        <SceneAction />
      </Sequence>
      <Grain />
    </AbsoluteFill>
  );
};
