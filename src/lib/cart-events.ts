'use client'

// 장바구니 변경(담기/삭제/수량변경)을 헤더 배지 등 UI에 즉시 알리기 위한 전역 이벤트 버스.
// 담기 호출 지점이 여러 곳에 흩어져 있어, 성공 시 emitCartChanged()를 호출하면
// Header 등 구독자가 개수를 다시 불러온다.

export const CART_CHANGED_EVENT = 'cart:changed'

export function emitCartChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT))
}

export function onCartChanged(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CART_CHANGED_EVENT, callback)
  return () => window.removeEventListener(CART_CHANGED_EVENT, callback)
}
