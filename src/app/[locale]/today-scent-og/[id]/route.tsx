import { ImageResponse } from 'next/og'
import { getScentById } from '@/lib/today-scent/scents'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 }

/**
 * Google Fonts 에서 필요한 글자(text)만 TTF 서브셋으로 받아온다.
 * (브라우저 UA를 주지 않으면 Google이 truetype/opentype 를 반환 → Satori 호환)
 */
async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@800&text=${encodeURIComponent(text)}`
    const css = await (await fetch(url)).text()
    const resource = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(opentype|truetype)['"]?\)/)
    if (!resource) return null
    const res = await fetch(resource[1])
    if (res.status !== 200) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string; id: string }> }
) {
  const { id } = await params
  const scent = getScentById(id)

  // 폰트 서브셋에 들어갈 모든 글자 모으기
  const baseText = "오늘의 향 탑 미들 베이스 AC'SCENT www.acscent.co.kr ·/,"
  const scentText = scent
    ? `${scent.name}${scent.vibe}${scent.notes.top}${scent.notes.mid}${scent.notes.base}${scent.keywords.join('')}`
    : ''
  const fontData = await loadKoreanFont(baseText + scentText)
  const fontFamily = fontData ? 'NotoSansKR' : 'sans-serif'
  const fonts = fontData
    ? [{ name: 'NotoSansKR', data: fontData, weight: 800 as const, style: 'normal' as const }]
    : []

  const theme = scent?.theme ?? { bg: '#FCD34D', accent: '#F59E0B', ink: '#1a1a1a' }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.bg,
          color: theme.ink,
          fontFamily,
          fontWeight: 800,
          position: 'relative',
        }}
      >
        {/* 상단 바 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: '#0f172a', display: 'flex' }} />

        {/* 카드 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.92)',
            borderRadius: '36px',
            padding: '56px 72px',
            border: '6px solid #0f172a',
            boxShadow: '14px 14px 0px 0px #0f172a',
            width: '1000px',
          }}
        >
          {/* 라벨 */}
          <div
            style={{
              display: 'flex',
              background: theme.accent,
              color: '#ffffff',
              fontSize: '26px',
              padding: '8px 24px',
              borderRadius: '999px',
              border: '3px solid #0f172a',
            }}
          >
            오늘의 향
          </div>

          {/* 이모지 */}
          <div style={{ display: 'flex', fontSize: '150px', marginTop: '18px', lineHeight: 1 }}>
            {scent?.emoji ?? '🎁'}
          </div>

          {/* 이름 */}
          <div style={{ display: 'flex', fontSize: '80px', marginTop: '12px', textAlign: 'center' }}>
            {scent?.name ?? "AC'SCENT"}
          </div>

          {/* 노트 */}
          {scent && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '36px' }}>
              {[
                { k: '탑', v: scent.notes.top },
                { k: '미들', v: scent.notes.mid },
                { k: '베이스', v: scent.notes.base },
              ].map((n) => (
                <div
                  key={n.k}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: '#ffffff',
                    border: '3px solid #0f172a',
                    borderRadius: '20px',
                    padding: '16px 28px',
                    boxShadow: '4px 4px 0px 0px #0f172a',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: '22px', color: theme.accent }}>{n.k}</div>
                  <div style={{ display: 'flex', fontSize: '34px', marginTop: '6px', color: '#0f172a' }}>{n.v}</div>
                </div>
              ))}
            </div>
          )}

          {/* 푸터 */}
          <div style={{ display: 'flex', marginTop: '34px', fontSize: '24px', color: '#0f172a', opacity: 0.7 }}>
            AC&apos;SCENT · www.acscent.co.kr
          </div>
        </div>
      </div>
    ),
    { ...SIZE, fonts, emoji: 'twemoji' }
  )
}
