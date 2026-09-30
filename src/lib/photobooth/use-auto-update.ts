'use client'

import { useEffect } from 'react'

/** 새 배포 확인 주기 */
const CHECK_MS = 5 * 60 * 1000
/**
 * 이만큼 아무도 만지지 않았으면 손님이 없다고 본다 — 모든 단계가 이보다 짧게 처음 화면으로 돌아간다
 * (가장 긴 폰 사진 업로드 대기도 120초 + 안내 10초)
 */
const IDLE_MS = 3 * 60 * 1000

/**
 * 매장 기기 자동 업데이트 — 기기는 화면을 한 번 열면 며칠씩 켜 두므로, 새 배포를 올려도 매장에서 앱을
 * 다시 켜기 전엔 옛 화면 그대로다. 새 버전이 보이면 손님이 없을 때(3분 무입력) 새로고침한다.
 */
export function useAutoUpdate() {
  useEffect(() => {
    let loaded: string | null = null
    let pending = false
    let lastInput = Date.now()
    const touch = () => {
      lastInput = Date.now()
    }

    const check = async () => {
      try {
        const res = await fetch('/api/photobooth/version', { cache: 'no-store' })
        const { version } = (await res.json()) as { version?: string }
        if (!version || version === 'dev') return
        if (loaded === null) loaded = version
        else if (version !== loaded) pending = true
      } catch {
        // 인터넷이 잠깐 끊겨도 다음 확인에서 다시
      }
    }
    const maybeReload = () => {
      if (pending && Date.now() - lastInput >= IDLE_MS && !document.hidden) window.location.reload()
    }

    void check()
    const checkTimer = window.setInterval(check, CHECK_MS)
    const idleTimer = window.setInterval(maybeReload, 30_000)
    window.addEventListener('pointerdown', touch, true)
    window.addEventListener('keydown', touch, true)
    return () => {
      window.clearInterval(checkTimer)
      window.clearInterval(idleTimer)
      window.removeEventListener('pointerdown', touch, true)
      window.removeEventListener('keydown', touch, true)
    }
  }, [])
}
