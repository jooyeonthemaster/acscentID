"use client"

import React, { forwardRef } from 'react'
import { ImageAnalysisResult } from '@/types/analysis'

interface ShareCardProps {
  userImage?: string
  twitterName: string
  perfumeName: string
  perfumeBrand: string
  analysisData: ImageAnalysisResult
}

/**
 * 공유용 카드 컴포넌트
 * 이미지로 캡처되어 공유됨 (400x500, 4:5 비율)
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ userImage, twitterName, perfumeName, perfumeBrand, analysisData }, ref) {
    // 상위 3개 키워드 추출
    const topKeywords = analysisData?.matchingKeywords?.slice(0, 3) || []

    return (
      <div
        ref={ref}
        style={{
          width: 400,
          height: 500,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {/* 배경 그라디언트 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 30%, #fbbf24 60%, #f59e0b 100%)'
          }}
        />

        {/* 장식 원들 */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            left: -40,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)'
          }}
        />

        {/* 메인 컨텐츠 */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            height: '100%',
            padding: 24,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* 헤더 */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#92400e',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: 4
              }}
            >
              AC&apos;SCENT IDENTITY
            </p>
          </div>

          {/* 이미지 영역 */}
          {userImage && (
            <div
              style={{
                flex: 1,
                maxHeight: 200,
                borderRadius: 16,
                overflow: 'hidden',
                background: '#f1f5f9',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={userImage}
                alt=""
                crossOrigin="anonymous"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}

          {/* 주접 텍스트 */}
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 12
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: '#1e293b',
                lineHeight: 1.4,
                textAlign: 'center',
                wordBreak: 'keep-all'
              }}
            >
              {twitterName}
            </p>
          </div>

          {/* 향수 정보 */}
          <div
            style={{
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 12,
              padding: 12,
              textAlign: 'center'
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#78716c',
                marginBottom: 4
              }}
            >
              추천 향수
            </p>
            <p
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#1e293b',
                marginBottom: 2
              }}
            >
              {perfumeName}
            </p>
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#64748b'
              }}
            >
              {perfumeBrand}
            </p>
          </div>

          {/* 키워드 태그 */}
          {topKeywords.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 6,
                marginTop: 12
              }}
            >
              {topKeywords.map((keyword, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#92400e',
                    background: 'rgba(255,255,255,0.8)',
                    padding: '4px 10px',
                    borderRadius: 12
                  }}
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}

          {/* 푸터 */}
          <div
            style={{
              marginTop: 'auto',
              textAlign: 'center',
              paddingTop: 12
            }}
          >
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: '#92400e',
                letterSpacing: '0.2em',
                opacity: 0.7
              }}
            >
              © 2025 AC&apos;SCENT IDENTITY
            </p>
          </div>
        </div>
      </div>
    )
  }
)
