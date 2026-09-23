// 작은 시스템 대화상자 — 화면을 옅게 가리고 가운데 창 하나를 띄운다.
// 배경을 흐리게 하지 않는다(본문·사진·카메라에 흐림 금지).

import { useId, type ReactNode } from 'react'
import { RetroWindow } from './RetroWindow'
import type { PixelIconName } from './pixel-icons'

interface Props {
  title: ReactNode
  icon?: PixelIconName
  /** 주면 타이틀바 닫기 버튼 + 바깥 누르기로 닫힘 */
  onClose?: () => void
  closeLabel?: string
  /** 경고처럼 바로 응답이 필요한 대화상자 */
  alert?: boolean
  className?: string
  bodyClassName?: string
  children: ReactNode
  /** 대화상자 뒤 레이어 z-index 를 화면별로 맞출 때 */
  zIndex?: number
}

export function RetroDialog({
  title,
  icon,
  onClose,
  closeLabel,
  alert = false,
  className,
  bodyClassName,
  children,
  zIndex,
}: Props) {
  const titleId = useId()
  return (
    <div
      className="rt-scrim"
      style={zIndex ? { zIndex } : undefined}
      onClick={(event) => {
        if (onClose && event.target === event.currentTarget) onClose()
      }}
    >
      <div role={alert ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={titleId} className="rt-dialog-wrap">
        <RetroWindow
          title={title}
          titleId={titleId}
          icon={icon}
          onClose={onClose}
          closeLabel={closeLabel}
          className={`rt-dialog${className ? ` ${className}` : ''}`}
          bodyClassName={bodyClassName}
        >
          {children}
        </RetroWindow>
      </div>
    </div>
  )
}
