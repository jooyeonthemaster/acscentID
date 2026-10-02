'use client'

import { useEffect, useState } from 'react'

const TEXT_ENTRY_SELECTOR = [
  'textarea',
  'select',
  '[contenteditable="true"]',
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"]):not([type="range"]):not([type="color"])',
].join(',')

function isTextEntry(element: Element | null) {
  return element instanceof HTMLElement && element.matches(TEXT_ENTRY_SELECTOR)
}

/**
 * 터치 기기에서 텍스트 입력에 포커스가 있는 동안(= 화면 키보드가 떠 있는 동안) true.
 * 하단 고정 바가 키보드 위로 밀려 올라와 입력창을 가리는 문제를 막는 데 쓴다.
 */
export function useSoftKeyboardOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return

    let timer: number | undefined
    // focusout 직후에는 activeElement가 body라서, 다음 입력칸으로 포커스가 옮겨갈 시간을 준다
    const sync = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setOpen(isTextEntry(document.activeElement)), 50)
    }

    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', sync)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', sync)
    }
  }, [])

  return open
}
