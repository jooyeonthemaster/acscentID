'use client'

// 키오스크 체험 모드의 화면 틀 — 네일·명함·스킨케어·캐리커처·보이스·직업 탐색·메이크업이 이 안에서 돈다.
// 기존 화면 셸(기존·레트로·맥)과 따로다: 화면 디자인·글꼴·배경 설정을 쓰지 않고 모드마다 제 디자인을 쓴다.
// 틀이 맡는 것: 기기 설정 따라가기(운영 모드가 바뀌면 새로고침), 관리자 창(우측 상단 모서리), 언어, 처음으로, 무입력 안내.
// 모드는 kx.tsx 의 문맥(useKx)으로 그것들을 쓰고, 제 단계와 결과만 책임진다. docs/kiosk-experiences.md

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import { KioskAdminPanel } from '@/components/kiosk-admin/KioskAdminPanel'
import type { ExperienceId } from '@/lib/kiosk/experience'
import { KIOSK_LANGS, isCjkLang, kioskText, type KioskLang } from '@/lib/kiosk/i18n'
import { IDLE_WARN_S } from '@/lib/kiosk/idle'
import { getKioskBridge } from '@/lib/kiosk/kiosk-bridge'
import { useScreenBackgrounds } from '@/lib/screen-backgrounds/use-screen-backgrounds'
import { CJK_FONT_STACK, KIOSK_FONT_CLASS } from '../fonts'
import { KX_COMMON } from './kx-i18n'
import { KxContext, KxIdleDialog, type KxContextValue, type KxScreenKind } from './kx'
import { uploadShare, type KxShare, type KxShareFile } from './kx-share'
import { useExperienceSwitch } from './useExperienceSwitch'
import { usePcFit } from '../pc/usePcFit'
import { PcHubBack, PcHubFooter, usePcHub } from '../pc/PcHub'
import './experience.css'
import './experience-pc.css'
import { EXPANSION_META, isExpansionId } from '@/lib/kiosk/expansion/types'

// 모드 화면은 그 모드일 때만 싣는다(인식 엔진·그림이 모드마다 다르다)
const MODES: Partial<Record<ExperienceId, ComponentType>> = {
  nail: dynamic(() => import('./nail/NailMode'), { ssr: false }),
  card: dynamic(() => import('./card/CardMode'), { ssr: false }),
  skin: dynamic(() => import('./skin/SkinMode'), { ssr: false }),
  draw: dynamic(() => import('./draw/DrawMode'), { ssr: false }),
  voice: dynamic(() => import('./voice/VoiceMode'), { ssr: false }),
  career: dynamic(() => import('./career/CareerMode'), { ssr: false }),
  makeup: dynamic(() => import('./makeup/MakeupMode'), { ssr: false }),
}
const ExpansionMode = dynamic(() => import('./expansion/ExpansionMode'), { ssr:false })

/**
 * pc: 노트북 가로 화면(/kiosk/pc/…) — 가로 두 칸 배치·창 크기 맞추기. 링크가 모드를 정하므로 기기 설정을 따라 갈아타지 않고,
 * 관리자 창을 열지 않는다(docs/kiosk-pc.md)
 */
export function ExperienceApp({ id, pc = false }: { id: ExperienceId; pc?: boolean }) {
  const screen = useScreenBackgrounds('kiosk')
  const fit = usePcFit(pc)
  const kiosk = typeof window !== 'undefined' ? getKioskBridge() : undefined
  const [lang, setLang] = useState<KioskLang>('ko')
  /** 처음으로 돌아갈 때마다 올린다 — 모드 화면을 통째로 새로 그려 상태를 비운다 */
  const [session, setSession] = useState(0)
  const [kind, setKind] = useState<KxScreenKind>('start')
  const [adminOpen, setAdminOpen] = useState(false)
  const [idleLeft, setIdleLeft] = useState<number | null>(null)

  // 올린 결과(받는 주소·QR) — 같은 결과는 한 번만 올린다. 처음으로 돌아가면 비운다
  const [shares] = useState(() => new Map<string, KxShare>())
  const shareEpoch = useRef(0)
  const share = useCallback(async (cacheKey: string, build: () => Promise<KxShareFile[]>) => {
    const kept = shares.get(cacheKey)
    if (kept && kept.expiresAt > Date.now() + 60000) return kept
    const epoch = shareEpoch.current
    const made = await uploadShare(id, lang, await build())
    if (shareEpoch.current === epoch) shares.set(cacheKey, made)
    return made
  }, [id, lang, shares])

  const home = useCallback(() => {
    shareEpoch.current++
    shares.clear()
    setSession((n) => n + 1)
    setLang('ko')
    setKind('start')
    setIdleLeft(null)
  }, [shares])

  // 문서 언어 — 화면 낭독기·글꼴 선택이 화면 언어를 따르게
  const htmlLang = KIOSK_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'
  useEffect(() => {
    const root = document.documentElement
    const prev = root.lang
    root.lang = htmlLang
    return () => { root.lang = prev }
  }, [htmlLang])

  // 무입력 — 모드가 알려 준 시간(초) 동안 조용하면 10초 안내를 띄우고, 끝나면 처음으로
  const silent = typeof kind === 'number' ? kind : null
  useEffect(() => {
    if (silent === null || adminOpen) return
    let deadline = Date.now() + (silent + IDLE_WARN_S) * 1000
    const bump = () => { deadline = Date.now() + (silent + IDLE_WARN_S) * 1000; setIdleLeft(null) }
    const timer = window.setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000)
      if (left <= 0) home()
      else setIdleLeft(left <= IDLE_WARN_S ? left : null)
    }, 400)
    window.addEventListener('pointerdown', bump, true)
    window.addEventListener('keydown', bump, true)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pointerdown', bump, true)
      window.removeEventListener('keydown', bump, true)
      // 단계가 바뀌거나 관리자 창이 열리면 안내를 거둔다
      setIdleLeft(null)
    }
  }, [silent, adminOpen, home])

  // 행사 랜딩에서 열었으면(?hub=) 체험을 마치고 첫 화면으로 돌아오는 순간 랜딩으로
  const hub = usePcHub(pc, kind === 'start')

  // 운영 모드가 바뀌면(다른 체험·매장·사주…) 손님이 없을 때 새로고침해 갈아탄다
  useExperienceSwitch(id, screen.baseSettings.mode, screen.synced && !pc, kind === 'start', adminOpen)

  // 관리자 핫스팟 — 짧게 누르거나 1.5초 누르면 인증창(다른 모드와 같은 자리)
  const hold = useRef<number | undefined>(undefined)
  const held = useRef(false)
  const openAdmin = useCallback(() => { setAdminOpen(true); void screen.refresh() }, [screen])
  const holdDown = () => {
    held.current = false
    window.clearTimeout(hold.current)
    hold.current = window.setTimeout(() => { held.current = true; openAdmin() }, 1500)
  }
  const holdUp = () => { window.clearTimeout(hold.current); hold.current = undefined }
  useEffect(() => () => window.clearTimeout(hold.current), [])

  const context = useMemo<KxContextValue>(() => ({ id, lang, setLang, t: kioskText(lang), c: KX_COMMON[lang], home, setScreen: setKind, share, pc }), [id, lang, home, share, pc])
  const expanded = isExpansionId(id)
  const Mode = expanded ? ExpansionMode : MODES[id]

  return (
    <div
      className={`kx-root ${KIOSK_FONT_CLASS}`}
      data-x={id}
      data-lang={lang}
      data-expansion={expanded ? id : undefined}
      data-layout={pc ? 'pc' : undefined}
      data-hub-foot={hub?.footerLogos?.length ? '' : undefined}
      style={{ ...fit, ...(isCjkLang(lang) ? { '--kx-font': CJK_FONT_STACK[lang] } : {}), ...(expanded ? { '--kx-accent': EXPANSION_META[id].color } : {}) } as CSSProperties}
    >
      <KxContext.Provider value={context}>
        <div className="kx-stage">
          {Mode && <Mode key={`${id}-${session}`} />}
        </div>
        {idleLeft !== null && <KxIdleDialog left={idleLeft} total={IDLE_WARN_S} />}
        {hub && kind === 'start' && <PcHubBack hub={hub} />}
        {hub && <PcHubFooter hub={hub} />}
      </KxContext.Provider>
      {/* 처리·카운트다운 중이 아니면 우측 상단 모서리에서 관리자 인증창을 연다(언어 버튼 위의 얇은 띠) */}
      {!pc && !adminOpen && kind !== 'busy' && (
        <button
          type="button"
          aria-label="매장 관리자 설정 열기"
          className="kx-hotspot"
          onPointerDown={holdDown}
          onPointerUp={holdUp}
          onPointerLeave={holdUp}
          onPointerCancel={holdUp}
          onClick={() => { if (!held.current) openAdmin(); held.current = false }}
        />
      )}
      {!pc && <KioskAdminPanel open={adminOpen} onOpen={openAdmin} onClose={() => setAdminOpen(false)} screen={screen} kiosk={kiosk} />}
    </div>
  )
}
