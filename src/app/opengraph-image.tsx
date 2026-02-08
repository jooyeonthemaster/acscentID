import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = "AC'SCENT IDENTITY - AI 맞춤 퍼퓸 추천 서비스"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
          background: 'linear-gradient(135deg, #FEF9E7 0%, #FCD34D 50%, #F59E0B 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 상단 장식 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: '#1a1a1a',
            display: 'flex',
          }}
        />

        {/* 메인 카드 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            borderRadius: '24px',
            padding: '60px 80px',
            boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
            border: '4px solid #1a1a1a',
            maxWidth: '900px',
          }}
        >
          {/* 브랜드명 */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              color: '#1a1a1a',
              letterSpacing: '-2px',
              display: 'flex',
            }}
          >
            AC&apos;SCENT IDENTITY
          </div>

          {/* 구분선 */}
          <div
            style={{
              width: '120px',
              height: '4px',
              background: '#FCD34D',
              margin: '20px 0',
              borderRadius: '2px',
              display: 'flex',
            }}
          />

          {/* 태그라인 */}
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#64748b',
              display: 'flex',
            }}
          >
            AI 이미지 분석 맞춤 퍼퓸 추천 서비스
          </div>

          {/* 키워드 태그 */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '32px',
            }}
          >
            {['이미지 분석 퍼퓸', '피규어 디퓨저', '졸업 기념 퍼퓸'].map((tag) => (
              <div
                key={tag}
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: 700,
                  border: '2px solid #F59E0B',
                  display: 'flex',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            fontSize: '20px',
            color: '#92400E',
            fontWeight: 600,
            display: 'flex',
          }}
        >
          www.acscent.co.kr
        </div>
      </div>
    ),
    { ...size }
  )
}
