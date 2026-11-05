'use client'

// 포토부스 STORE ADMIN 창 — 매장 화면(레트로·맥, BoothClient)과 프로그램 전용 화면(ANSAN 등, ProgramApp)이 같은 창을 쓴다.
// 2026-11-04 '모드마다 관리자 창 디자인이 다르다' → 매장 모드의 창을 기준으로 통일(이 파일로 옮김, 동작·모양은 매장 창 그대로).
//   비밀번호 6자리 키패드(서버 확인, 물리 키보드 숫자키도) → 왼쪽: 화면별 설정(extra) · 운영 모드 · 화면 크기 · 디자인 + 앱 종료·닫기,
//   오른쪽: 화면 배경 목록(이벤트 배경·포토카드 QR·새로고침).
// 매장 화면은 자기 바깥 틀(.bth-root.rt) 안에 그대로 넣고, 프로그램 화면은 standalone — 같은 .rt 틀·색·글꼴 변수를 이 창이 직접 깐다
// (rt-desktop 은 붙이지 않아 바탕화면 그림은 그리지 않는다). 창은 화면 기준(position: fixed)이라 프로그램 화면의 확대(transform) 밖에 둔다.

import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { PixelIcon, RETRO_FONT_CLASS, RetroWindow } from '@/components/retro'
import { macFontVars } from '@/components/mac/theme'
import { ScreenDesignContext } from '@/components/mac/design-context'
import { BoothModeControls } from '@/components/screen/BoothModeControls'
import { DeviceAdminTools } from '@/components/screen/DeviceAdminTools'
import { DeviceDesignControls } from '@/components/screen/DeviceDesignControls'
import { useQuitConfirm } from '@/components/screen/QuitConfirm'
import { KIOSK_FONT_CLASS } from '@/app/kiosk/fonts'
import { getBoothShell } from '@/lib/photobooth/booth-shell'
import { retroDesktopVars, toBoothTheme, toRetroDesktop } from '@/lib/screen-backgrounds/theme'
import type { useScreenBackgrounds } from '@/lib/screen-backgrounds/use-screen-backgrounds'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import '@/components/retro/retro.css'
import '@/components/mac/mac.css'
import './booth.css'

/** 부스 앱 화면 배율 선택지 — 큰 모니터일수록 키운다 (매장 1920x1080 모니터는 150%) */
const SCREEN_ZOOM_OPTIONS = [1, 1.25, 1.5, 1.75] as const

type ScreenSettings = ReturnType<typeof useScreenBackgrounds>

export function BoothAdminDialog({ screen, design, onClose, extra, standalone = false }: {
  screen: ScreenSettings
  design: 'retro' | 'mac'
  onClose: () => void
  /** 화면별 추가 설정 — 왼쪽 칸 맨 위(예: ANSAN 사진 인화 최대 장수) */
  extra?: ReactNode
  /** 매장 화면 밖(프로그램 화면)에서 열 때 — .rt 틀·색·글꼴 변수를 이 창이 깐다 */
  standalone?: boolean
}) {
  const {
    backgrounds, activeBackground, selectedId: backgroundId, settings, baseSettings, liveEvent, loading, error,
    refresh, selectBackground, saveSettings, unlock, sharedMode, deviceMode,
  } = screen
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [exitNotice, setExitNotice] = useState<string | null>(null)
  /** 부스 앱의 현재 화면 배율 (브라우저에서 열면 null — 선택지를 숨긴다) */
  const [screenZoom, setScreenZoom] = useState<number | null>(null)
  const authRequest = useRef(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  // 배경 목록 견본 글자 — 지금 바탕화면의 제목 글꼴
  const desk = toRetroDesktop(activeBackground, settings.font)

  // 열 때 배경 목록을 새로 받는다. 닫히면(사라지면) 진행 중인 비밀번호 확인 결과를 버린다
  useEffect(() => {
    void refresh()
    const requests = authRequest
    return () => { requests.current += 1 }
  }, [refresh])

  const chooseBackground = useCallback(async (id: string) => {
    if (!unlocked || saving) return
    setSaving(id)
    setActionError('')
    try {
      await selectBackground(id)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '배경을 저장하지 못했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(null)
    }
  }, [unlocked, saving, selectBackground])

  /** 비밀번호 키패드 — 터치 부스엔 물리 키보드가 없다. 6자리가 차면 바로 확인 */
  const pressKey = useCallback(async (key: string) => {
    if (unlocking) return
    const next = key === 'back' ? password.slice(0, -1) : (password + key).slice(0, 6)
    if (next.length < 6) {
      setPassword(next)
      setPasswordError('')
      return
    }
    setPassword('')
    setUnlocking(true)
    const requestId = ++authRequest.current
    try {
      const ok = await unlock(next)
      if (requestId !== authRequest.current) return
      if (ok) {
        setUnlocked(true)
        setPasswordError('')
        getBoothShell()
          ?.info()
          .then((info) => setScreenZoom(info.zoomFactor ?? 1))
          .catch(() => setScreenZoom(null))
      } else {
        setPasswordError('비밀번호가 올바르지 않습니다')
      }
    } catch (cause) {
      if (requestId === authRequest.current) {
        setPasswordError(cause instanceof Error ? cause.message : '관리자 인증에 실패했습니다. 연결을 확인해주세요.')
      }
    } finally {
      if (requestId === authRequest.current) setUnlocking(false)
    }
  }, [password, unlocking, unlock])

  // 키보드가 꽂혀 있으면 숫자키로도 입력
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (!unlocked && (/^[0-9]$/.test(event.key) || event.key === 'Backspace')) {
        event.preventDefault()
        void pressKey(event.key === 'Backspace' ? 'back' : event.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [unlocked, pressKey, onClose])

  // 창 안에서만 Tab 이 돈다 — 닫으면 원래 자리로
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    dialog?.querySelector<HTMLButtonElement>('button')?.focus()
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog) return
      const controls = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    dialog?.addEventListener('keydown', keepFocus)
    return () => {
      dialog?.removeEventListener('keydown', keepFocus)
      previous?.focus()
    }
  }, [])

  const selectScreenZoom = useCallback(async (factor: number) => {
    const shell = getBoothShell()
    if (!shell) return
    const result = await shell.setZoom(factor).catch(() => null)
    if (result?.ok) setScreenZoom(result.zoomFactor)
  }, [])

  /** 앱 종료 — 부스 앱(exe)은 카메라를 놓고 꺼진다. 브라우저는 스스로 닫을 수 없는 경우가 많다 */
  const quitBooth = useCallback(async () => {
    const shell = getBoothShell()
    if (shell) {
      setExitNotice('카메라 연결을 풀고 종료합니다')
      await shell.quit().catch(() => {})
      return
    }
    window.close()
    window.setTimeout(
      () => setExitNotice('브라우저에서는 여기서 닫을 수 없어요. 키보드 Alt+F4 로 닫아주세요'),
      400
    )
  }, [])
  // 앱 종료는 한 번 더 묻는다(QuitConfirm)
  const [askQuit, quitConfirmNode] = useQuitConfirm(quitBooth)

  const dialog = (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="포토부스 매장 관리자"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="rt-scrim"
      style={{ zIndex: 70 }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        ref={dialogRef}
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        exit={{ y: 20 }}
        className={`bth-dialog ${unlocked ? 'bth-dialog--admin' : ''}`}
      >
        <RetroWindow
          icon="lock"
          title="STORE ADMIN"
          onClose={onClose}
          closeLabel="닫기"
          bodyClassName="bth-admin-body"
        >
          {/* 잠금 해제 후엔 창 제목(STORE ADMIN)으로 충분 — 제목 줄 높이를 목록에 준다 */}
          <h2 className={unlocked ? 'sr-only' : 'bth-h2'}>{unlocked ? '부스 설정' : '비밀번호 입력'}</h2>

          {!unlocked ? (
            <div className="bth-pin">
              <p className="bth-sub">관리자 비밀번호 6자리를 눌러주세요</p>
              <div
                className="bth-pin-dots rt-field"
                aria-label={`${password.length}자리 입력됨`}
                style={{ marginTop: 14 }}
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <i key={i} data-filled={i < password.length} />
                ))}
              </div>
              <p className="bth-error" role="status">
                {unlocking ? '인증 확인 중…' : passwordError}
              </p>
              <div className="bth-keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={unlocking}
                    onClick={() => pressKey(digit)}
                    className="rt-btn"
                  >
                    {digit}
                  </button>
                ))}
                <div />
                <button
                  type="button"
                  disabled={unlocking}
                  onClick={() => pressKey('0')}
                  className="rt-btn"
                >
                  0
                </button>
                <button
                  type="button"
                  aria-label="지우기"
                  disabled={unlocking}
                  onClick={() => pressKey('back')}
                  className="rt-btn"
                >
                  <PixelIcon name="backspace" size={40} />
                </button>
              </div>
            </div>
          ) : (
            // 가로 화면이라 좌우 2분할 — 왼쪽: 화면 크기·디자인(넘치면 스크롤) + 앱 종료·닫기(항상 보임),
            // 오른쪽: 화면 배경 제목 줄(이벤트 배경·포토카드 QR·새로고침) + 목록이 창 높이를 다 쓴다(줌 150~175% 에서 위아래로 쌓으면 목록이 한 줄도 안 보였다)
            <div className="bth-admin-split">
              <div className="bth-admin-main">
                <div className="bth-admin-settings rt-scroll">
                  {extra}
                  <BoothModeControls value={baseSettings.mode} sharedMode={sharedMode} deviceMode={deviceMode} pass={baseSettings.pass} onSave={saveSettings} onSelectBackground={selectBackground} disabled={!!saving} />
                  {screenZoom !== null && (
                    <div className="bth-zoom">
                      <b>화면 크기</b>
                      <div className="bth-zoom-opts">
                        {SCREEN_ZOOM_OPTIONS.map((factor) => (
                          <button
                            key={factor}
                            type="button"
                            onClick={() => selectScreenZoom(factor)}
                            aria-pressed={Math.abs(screenZoom - factor) < 0.01}
                            className="rt-choice"
                          >
                            {Math.round(factor * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <DeviceDesignControls
                    settings={baseSettings}
                    onSave={saveSettings}
                    disabled={!!saving}
                    sample="어떤 사진을 찍을까요? ACSCENT PHOTO"
                    compact
                    eventFont={liveEvent?.font ? { title: liveEvent.title, font: liveEvent.font } : null}
                  />
                </div>
                <div className="bth-admin-actions">
                  <button type="button" onClick={askQuit} className="rt-btn rt-btn--danger">
                    <PixelIcon name="close" size={28} /> 앱 종료
                  </button>
                  <button type="button" onClick={onClose} className="rt-btn rt-btn--primary">
                    닫기
                  </button>
                </div>
                {exitNotice && <p className="bth-admin-note" role="status">{exitNotice}</p>}
              </div>
              <section className="bth-admin-bgs" aria-label="화면 배경">
                <div className="bth-admin-toolbar">
                  <b>
                    화면 배경 · {backgrounds.length}개
                    <em role="status">
                      {saving ? '서버에 저장하는 중…' : loading ? '불러오는 중…' : ''}
                    </em>
                  </b>
                  {/* 이벤트 배경·포토카드 QR — 제목과 새로고침 사이 */}
                  <DeviceAdminTools target="booth" onApplied={() => void refresh()} liveTitle={liveEvent?.title} />
                  <button
                    type="button"
                    className="rt-btn"
                    disabled={loading || !!saving}
                    onClick={() => void refresh()}
                  >
                    새로고침
                  </button>
                </div>
                {(actionError || error) && (
                  <p role="alert" className="bth-admin-error">
                    {actionError || error}
                  </p>
                )}
                <div className="bth-bg-grid rt-scroll">
                  {backgrounds.map((record) => {
                    const background = toBoothTheme(record)
                    return (
                      <button
                        key={background.id}
                        type="button"
                        disabled={!!saving}
                        aria-pressed={backgroundId === background.id}
                        onClick={() => void chooseBackground(background.id)}
                        className="rt-choice bth-bg-tile"
                      >
                        <span className="bth-bg-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={record.thumbnail_url || background.image}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                          <span
                            className="bth-bg-sample"
                            style={{
                              fontFamily: desk.displayFont,
                              fontWeight: desk.displayWeight,
                              letterSpacing: desk.displayTracking,
                            }}
                          >
                            어떤 사진을 찍을까요?
                          </span>
                        </span>
                        <span className="bth-bg-name">
                          <b>{background.title}</b>
                          <em>{background.id === backgroundId ? '적용 중' : '선택'}</em>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>
          )}
        </RetroWindow>
      </motion.div>
    </motion.div>
  )

  if (!standalone) {
    return (
      <>
        {dialog}
        {quitConfirmNode}
      </>
    )
  }
  // 프로그램 화면 — 매장 화면 바깥 틀과 같은 .rt 틀·색·글꼴 변수(바탕화면 그림 없이) + 디자인 값(맥이면 아이콘도 맥 모양 — PixelIcon 이 읽는다)
  const vars = { ...retroDesktopVars(desk), ...(design === 'mac' ? macFontVars(settings.font ? desk.bodyFont : undefined) : {}) } as CSSProperties
  return (
    <ScreenDesignContext.Provider value={design}>
      <div className={`rt rt--booth ${RETRO_FONT_CLASS} ${KIOSK_FONT_CLASS}`} data-ui={design} data-tone={desk.tone} style={vars}>
        <ScreenFontFace ids={[desk.fontId]} />
        {dialog}
        {quitConfirmNode}
      </div>
    </ScreenDesignContext.Provider>
  )
}
