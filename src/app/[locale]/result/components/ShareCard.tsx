"use client"

import React, { forwardRef } from 'react'
import { ImageAnalysisResult } from '@/types/analysis'

interface ShareCardProps {
  userImage?: string
  twitterName: string
  userName: string
  userGender: string
  perfumeName: string
  perfumeBrand: string
  analysisData: ImageAnalysisResult
}

/**
 * 공유용 카드 컴포넌트
 * Design: Maison Margiela Style (Final Layout)
 * Structure:
 * 1. Image (Left) | Perfume Notes (Right)
 * 2. Basic Info (Middle)
 * 3. Jujeop (Bottom)
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ userImage, twitterName, userName, userGender, perfumeName, perfumeBrand, analysisData }, ref) {

    // YYYY.MM.DD
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: '2-digit', month: '2-digit', day: '2-digit'
    }).replace(/\//g, '.')

    // Perfume Logic
    const persona = analysisData.matchingPerfumes?.[0]?.persona
    const notes = [
      { type: 'TOP', data: persona?.mainScent, no: '(02)' },
      { type: 'MID', data: persona?.subScent1, no: '(03)' },
      { type: 'BASE', data: persona?.subScent2, no: '(04)' }
    ]

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          height: 800,
          backgroundColor: '#ffffff',
          color: '#111',
          fontFamily: "'Courier New', Courier, monospace",
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #000',
        }}
      >
        {/* === HEADER (01) === */}
        <div style={{
          height: 48,
          borderBottom: '1px solid #000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: '#000',
          color: '#fff'
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1px' }}>(01) AC'SCENT IDENTITY</span>
          <span style={{ fontSize: 13, fontWeight: 400 }}>NO. 5291</span>
        </div>

        {/* === MAIN SECTION (Image | Notes) === */}
        <div style={{
          flex: 1, // Takes up remaining space but limited by bottom sections
          display: 'flex',
          borderBottom: '1px solid #000',
          minHeight: 0 // Allow flex shrink
        }}>
          {/* LEFT: IMAGE (55%) */}
          <div style={{
            flex: '0 0 55%',
            position: 'relative',
            borderRight: '1px solid #000',
            overflow: 'hidden'
          }}>
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt="Analyzed"
                crossOrigin="anonymous"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'grayscale(10%) contrast(105%)'
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#eee' }} />
            )}
            <div style={{
              position: 'absolute',
              top: 16, right: 16,
              background: '#FCD34D', color: '#000',
              fontSize: 10, padding: '4px 8px', fontWeight: 700,
              boxShadow: '3px 3px 0px #000',
              transform: 'rotate(5deg)'
            }}>
              ORIGINAL IMAGE
            </div>
          </div>

          {/* RIGHT: PERFUME NOTES (45%) */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Perfume Header */}
            <div style={{ padding: 16, borderBottom: '1px solid #000', background: '#fafafa' }}>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>RECOMMENDED SCENT</div>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 2 }}>{perfumeName}</div>
              <div style={{
                fontSize: 11,
                textDecoration: 'none', // Removed underline for cleaner look on multiline
                opacity: 0.8,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 1, // Strict 1 line
                WebkitBoxOrient: 'vertical'
              }}>
                {perfumeBrand}
              </div>
            </div>

            {/* Notes Stack */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {notes.map((note, idx) => (
                <div key={note.type} style={{
                  flex: 1,
                  borderBottom: idx < 2 ? '1px solid #000' : 'none',
                  padding: '12px 16px', // Reduced padding
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{note.type}</span>
                    <span style={{ fontSize: 10, opacity: 0.4 }}>{note.no}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>
                    {note.data?.name || 'Musk'}
                  </div>
                  <div style={{
                    fontSize: 10,
                    opacity: 0.6,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 1, // Strict 1 line
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {note.data?.description || note.data?.fanComment || "부드럽고 은은한 향이 감돕니다."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === INFO ROW (05) === */}
        <div style={{
          height: 90,
          borderBottom: '1px solid #000',
          display: 'flex'
        }}>
          {/* Name */}
          <div style={{ flex: 1.5, borderRight: '1px solid #000', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>(05) NAME</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{userName}</span>
          </div>
          {/* Gender */}
          <div style={{ flex: 1, borderRight: '1px solid #000', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>(06) GENDER</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{userGender}</span>
          </div>
          {/* Date */}
          <div style={{ flex: 1.2, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#fafafa' }}>
            <span style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>(07) DATE</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.5px' }}>{currentDate}</span>
          </div>
        </div>

        {/* === HEADER: JUJEOP === */}
        <div style={{
          height: 140,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          background: '#FCD34D', // Yellow highlight for Jujeop
          justifyContent: 'center'
        }}>
          <span style={{
            position: 'absolute',
            top: 12, left: 16,
            fontSize: 10, fontWeight: 700, opacity: 0.6
          }}>
            (08) FINAL VERDICT
          </span>

          <p style={{
            fontFamily: "'Pretendard', sans-serif",
            fontSize: 22,
            fontWeight: 900,
            lineHeight: 1.3,
            color: '#000',
            wordBreak: 'keep-all',
            textAlign: 'center'
          }}>
            "{twitterName}"
          </p>
        </div>
      </div>
    )
  }
)
