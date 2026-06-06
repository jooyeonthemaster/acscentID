'use client'

const MOBILE_OVERLAY_EVENT = 'acscent-mobile-overlay-change'

type OverlayWindow = Window & {
  __acscentMobileOverlayKeys?: Set<string>
}

function getOverlayKeys() {
  if (typeof window === 'undefined') return null
  const overlayWindow = window as OverlayWindow
  if (!overlayWindow.__acscentMobileOverlayKeys) {
    overlayWindow.__acscentMobileOverlayKeys = new Set<string>()
  }
  return overlayWindow.__acscentMobileOverlayKeys
}

export function setMobileOverlayOpen(key: string, isOpen: boolean) {
  if (typeof window === 'undefined') return

  const keys = getOverlayKeys()
  if (!keys) return

  if (isOpen) {
    keys.add(key)
  } else {
    keys.delete(key)
  }

  const hasOpenOverlay = keys.size > 0
  if (hasOpenOverlay) {
    document.body.dataset.acscentMobileOverlayOpen = 'true'
  } else {
    delete document.body.dataset.acscentMobileOverlayOpen
  }

  window.dispatchEvent(
    new CustomEvent(MOBILE_OVERLAY_EVENT, {
      detail: { isOpen: hasOpenOverlay },
    })
  )
}

export function isMobileOverlayOpen() {
  if (typeof document === 'undefined') return false
  return document.body.dataset.acscentMobileOverlayOpen === 'true'
}

export function subscribeMobileOverlayChange(callback: (isOpen: boolean) => void) {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ isOpen: boolean }>).detail
    callback(detail?.isOpen ?? isMobileOverlayOpen())
  }

  window.addEventListener(MOBILE_OVERLAY_EVENT, handler)
  callback(isMobileOverlayOpen())

  return () => window.removeEventListener(MOBILE_OVERLAY_EVENT, handler)
}
