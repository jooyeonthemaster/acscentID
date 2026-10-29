'use client'

// SCENT! AI 조향사 — 촬영(카메라 기본) · 카운트다운 · 사진 확인 · 휴대폰 QR 올리기 (목업 03 · 04 · 07)
// 카메라 스트림·카운트다운·QR 세션·폴링은 셸(KioskClassic)이 그대로 돌린다. 액자 크기는 useCamFrame 의 약속을 따른다 —
// 찍기 전과 찍은 뒤 액자 크기·구도가 같다(촬영 사진은 3:4, 폰 사진은 그 비율).

import type { ReactNode } from 'react'
import { ArrowRight, Camera, CameraOff, Check, LoaderCircle, Smartphone, Upload } from 'lucide-react'
import { BottomBar, Btn, StepDots, StepHead } from './ui'
import { PERFUMER_ART } from '@/lib/kiosk/perfumer-art'
import type { PerfumerCtx } from './types'

/** 액자 자리 + 3:4 액자 — 크기는 셸의 useCamFrame 이 잰다 */
function CamSlot({ slotRef, size, photo, children }: {
  slotRef: PerfumerCtx['frame']['slotRef']
  size: PerfumerCtx['frame']['size']
  photo?: boolean
  children: ReactNode
}) {
  return (
    <div className="pf-cam-slot" ref={slotRef}>
      <div className="pf-cam" style={size ?? undefined} data-photo={photo || undefined}>{children}</div>
    </div>
  )
}

/** 카메라 영상 — 셸의 스트림이 이 요소에 붙는다(콜백 ref) */
function LiveVideo({ bind }: { bind: PerfumerCtx['videoRef'] }) {
  return <video ref={bind} playsInline muted />
}

export function CaptureScreen({ ctx }: { ctx: PerfumerCtx }) {
  if (ctx.photo) return <ConfirmView ctx={ctx} />
  if (ctx.photoSource === 'qr') return <QrView ctx={ctx} />
  return <CameraView ctx={ctx} />
}

function CameraView({ ctx }: { ctx: PerfumerCtx }) {
  const { p, t } = ctx
  const counting = ctx.countdown !== null
  return (
    <section className="pf-screen pf-capture">
      <StepDots ctx={ctx} />
      <StepHead ctx={ctx} step="capture" />
      <h1 className="pf-title pf-title--capture">{counting ? p.countdownTitle : t.captureCamTitle}</h1>
      <p className="pf-desc">{counting ? p.countdownDesc : p.camDesc}</p>

      <CamSlot slotRef={ctx.frame.slotRef} size={ctx.frame.size}>
          <LiveVideo bind={ctx.videoRef} />
          {!counting && ctx.camReady && !ctx.camError && (
            <svg className="pf-cam-guide" viewBox="0 0 300 400" aria-hidden="true">
              <ellipse cx="150" cy="186" rx="80" ry="108" />
            </svg>
          )}
          {counting && (
            <div className="pf-count" role="timer" aria-live="assertive">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className="pf-count-track" cx="60" cy="60" r="52" />
                {/* 1초마다 한 칸 — 3 → 2 → 1 */}
                <circle className="pf-count-arc" cx="60" cy="60" r="52" key={ctx.countdown} />
              </svg>
              <span>{ctx.countdown}</span>
            </div>
          )}
          {!ctx.camReady && !ctx.camError && (
            <div className="pf-cam-state" role="status">
              <LoaderCircle className="pf-spin" size={40} strokeWidth={1.4} aria-hidden="true" />
              <p>{p.camPreparing}</p>
            </div>
          )}
          {ctx.camError && (
            <div className="pf-cam-state" data-error="true" role="alert">
              <CameraOff size={40} strokeWidth={1.4} aria-hidden="true" />
              <b>{ctx.camError === 'denied' ? p.camDeniedTitle : p.camFailTitle}</b>
              <p>{ctx.camError === 'denied' ? p.camDeniedDesc : p.camFailDesc}</p>
              {ctx.camError === 'unavailable' && (
                <span className="pf-cam-retry"><LoaderCircle className="pf-spin" size={16} strokeWidth={2} aria-hidden="true" />{p.camRetrying}</span>
              )}
              {/* 파일 선택은 OS 탐색기를 연다 — 잠긴 키오스크에서는 노출하지 않는다(웹 미리보기 전용) */}
              {ctx.inShell ? (
                <span className="pf-cam-staff">{t.callStaff}</span>
              ) : (
                <label className="pf-btn pf-cam-file" data-variant="outline">
                  <span>{t.useFile}</span>
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && ctx.onFile(e.target.files[0])} />
                </label>
              )}
            </div>
          )}
      </CamSlot>

      {/* 액자 아래 자리 — 카운트다운 중에도 높이를 그대로 잡아 둔다(숨기기만). 자리가 비면 액자가 커져
          찍기 직전에 사진이 확대되어 보인다(useCamFrame 의 약속: 찍기 전후 액자 크기·구도 동일) */}
      <div className="pf-cam-alt" data-hidden={counting || undefined} aria-hidden={counting || undefined}>
        <p>{p.camNote}</p>
        <Btn wide icon={<Upload size={22} strokeWidth={1.6} aria-hidden="true" />} onClick={ctx.useQr} disabled={counting} tabIndex={counting ? -1 : undefined}>{p.phoneUpload}</Btn>
      </div>

      {counting ? (
        <BottomBar single>
          <Btn variant="primary" wide disabled>{p.countdownBtn}</Btn>
        </BottomBar>
      ) : (
        <BottomBar>
          <Btn onClick={ctx.prev}>{t.prev}</Btn>
          <Btn
            variant="primary"
            icon={<Camera size={24} strokeWidth={1.6} aria-hidden="true" />}
            disabled={Boolean(ctx.camError) || !ctx.camReady}
            onClick={ctx.shoot}
          >
            {t.shoot}
          </Btn>
        </BottomBar>
      )}
    </section>
  )
}

function ConfirmView({ ctx }: { ctx: PerfumerCtx }) {
  const { p, t } = ctx
  const chips = Array.from(new Set([...ctx.picks.style, ...ctx.picks.personality, ...ctx.picks.charm])).slice(0, 6)
  const labelOf = (value: string) => ctx.pickLabels.style[value] ?? ctx.pickLabels.personality[value] ?? ctx.pickLabels.charm[value] ?? value
  return (
    <section className="pf-screen pf-capture">
      <StepDots ctx={ctx} />
      <StepHead ctx={ctx} step="capture" />
      <h1 className="pf-title pf-title--capture">{t.captureConfirm}</h1>
      <p className="pf-ready"><span className="pf-check" aria-hidden="true"><Check size={18} strokeWidth={3} /></span>{p.confirmReady}</p>

      <CamSlot slotRef={ctx.frame.slotRef} size={ctx.frame.size} photo>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ctx.photo ?? ''} alt={t.selectedPhotoAlt} onLoad={ctx.frame.onPhotoLoad} />
      </CamSlot>

      {/* 촬영 화면의 '휴대폰 사진 올리기' 자리와 같은 높이 — 찍은 사진의 액자가 그대로 맞는다 */}
      <div className="pf-cam-alt">
        {chips.length > 0 && (
          <ul className="pf-chips pf-chips--center" aria-label={p.myPicks}>
            {chips.map((value) => <li key={value}>{labelOf(value)}</li>)}
          </ul>
        )}
      </div>

      <BottomBar>
        <Btn onClick={ctx.retake}>{ctx.photoSource === 'qr' ? p.otherPhoto : p.retake}</Btn>
        <Btn variant="primary" arrow onClick={ctx.analyze}>{t.analyzeStart}</Btn>
      </BottomBar>
    </section>
  )
}

function QrView({ ctx }: { ctx: PerfumerCtx }) {
  const { p, t } = ctx
  const { state, dataUrl, code, unreachable } = ctx.qr
  return (
    <section className="pf-screen pf-qr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pf-qr-bg" src={PERFUMER_ART.qr} alt="" aria-hidden="true" />
      <StepDots ctx={ctx} />
      <StepHead ctx={ctx} step="capture" />
      <h1 className="pf-title pf-title--capture">{p.qrTitle}</h1>
      <p className="pf-qr-scan"><Smartphone size={44} strokeWidth={1.2} aria-hidden="true" />{p.qrScan}</p>

      <div className="pf-qr-card" data-state={state}>
        {(state === 'creating' || state === 'idle') && (
          <div className="pf-qr-wait" role="status">
            <LoaderCircle className="pf-spin" size={40} strokeWidth={1.4} aria-hidden="true" />
            <span>{t.qrCreating}</span>
          </div>
        )}
        {state === 'failed' && (
          <div className="pf-qr-wait" role="alert">
            <b>{p.qrFailTitle}</b>
            <span>{t.qrFailed[0]} {t.qrFailed[1]}</span>
          </div>
        )}
        {(state === 'waiting' || state === 'expired') && dataUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt={t.qrAlt} />
            {code && <span className="pf-qr-code">{code}</span>}
          </>
        )}
      </div>
      {unreachable && (
        <p className="pf-qr-warn" role="alert">
          설정 오류: QR이 이 기기의 로컬 주소를 가리켜 폰에서 열리지 않습니다. NEXT_PUBLIC_SITE_URL을 설정해 주세요. (직원 확인 필요)
        </p>
      )}

      <ol className="pf-qr-steps">
        {p.qrSteps.map((label, i) => (
          <li key={label}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            {label}
            {i < p.qrSteps.length - 1 && <ArrowRight className="pf-qr-arrow" size={18} strokeWidth={1.2} aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <p className="pf-note">{p.qrNote}</p>
      <Btn variant="outline" wide className="pf-qr-regen" disabled={state === 'creating'} onClick={ctx.regenQr}>{t.regenQr}</Btn>

      <BottomBar>
        <Btn onClick={ctx.backFromQr}>{t.prev}</Btn>
        <Btn variant="primary" arrow onClick={ctx.useCamera}>{t.useCamera}</Btn>
      </BottomBar>
    </section>
  )
}

