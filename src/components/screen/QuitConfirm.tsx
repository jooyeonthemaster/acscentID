'use client'

// 앱 종료 확인 — 관리자 창의 '앱 종료'를 실수로 누르면 매장 기기가 꺼진다. 한 번 더 묻는다.
// 브라우저 기본 confirm 은 전체 화면 키오스크·부스 셸에서 뒤로 숨거나 작게 떠서, 앱 안에 크게 띄운다(기존·레트로·맥 공통).
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './quit-confirm.css'

export function useQuitConfirm(onQuit: () => void | Promise<void>): [() => void, React.ReactNode] {
  const [open, setOpen] = useState(false)
  const ask = useCallback(() => setOpen(true), [])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])
  const node = open && typeof document !== 'undefined'
    ? createPortal(
      <div className="qcf-scrim" role="alertdialog" aria-modal="true" aria-labelledby="qcf-title" onClick={() => setOpen(false)}>
        <div className="qcf-box" onClick={event => event.stopPropagation()}>
          <p id="qcf-title" className="qcf-title">정말로 앱을 종료하시겠습니까?</p>
          <p className="qcf-desc">종료하면 손님이 이용할 수 없습니다. 다시 켜려면 바탕화면의 바로가기를 눌러 주세요.</p>
          <div className="qcf-actions">
            <button type="button" className="qcf-btn" onClick={() => setOpen(false)}>취소</button>
            <button type="button" className="qcf-btn qcf-btn--danger" onClick={() => { setOpen(false); void onQuit() }}>앱 종료</button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null
  return [ask, node]
}
