// 레트로 프로그램 창 — 파란 그라데이션 타이틀바 + 입체 테두리 + 밝은 본문.
// 타이틀바 버튼은 실제로 하는 일이 있을 때만(onClose 등) 그린다 — 장식용 _ □ × 는 두지 않는다.

import type { CSSProperties, ReactNode } from 'react'
import { PixelIcon } from './PixelIcon'
import type { PixelIconName } from './pixel-icons'

interface Props {
  /** 타이틀바 글자 — 짧은 영문은 픽셀 서체, 한글은 본문 서체로 자연스럽게 떨어진다 */
  title: ReactNode
  icon?: PixelIconName
  /** 타이틀바 오른쪽 — 단계 표시처럼 읽기만 하는 정보 */
  titleExtra?: ReactNode
  /** 주면 타이틀바에 닫기 버튼이 생긴다 (48px 이상 터치 영역) */
  onClose?: () => void
  closeLabel?: string
  /** 창 뒤로 살짝 겹쳐 보이는 창 — 장식이라 터치를 받지 않는다 */
  ghosts?: boolean
  className?: string
  bodyClassName?: string
  style?: CSSProperties
  /** 대화상자에서 제목을 aria-labelledby 로 잇기 위한 id */
  titleId?: string
  children: ReactNode
  /** 본문 아래 상태 표시줄 */
  status?: ReactNode
}

export function RetroWindow({
  title,
  icon,
  titleExtra,
  onClose,
  closeLabel = '닫기',
  ghosts = false,
  className,
  bodyClassName,
  style,
  titleId,
  children,
  status,
}: Props) {
  const win = (
    <section className={`rt-win${ghosts ? '' : ` ${className ?? ''}`}`} style={ghosts ? undefined : style}>
      <header className="rt-win-title">
        {icon && <PixelIcon name={icon} size={20} className="rt-win-title-icon" />}
        <span className="rt-win-title-text" id={titleId}>
          {title}
        </span>
        {titleExtra && <span className="rt-win-title-extra">{titleExtra}</span>}
        {onClose && (
          <button type="button" className="rt-win-close" aria-label={closeLabel} onClick={onClose}>
            <PixelIcon name="close" size={20} />
          </button>
        )}
      </header>
      <div className={`rt-win-body${bodyClassName ? ` ${bodyClassName}` : ''}`}>{children}</div>
      {status && <footer className="rt-win-status">{status}</footer>}
    </section>
  )
  if (!ghosts) return win
  return (
    <div className={`rt-stack ${className ?? ''}`} style={style}>
      <span className="rt-ghost rt-ghost-1" aria-hidden="true" />
      <span className="rt-ghost rt-ghost-2" aria-hidden="true" />
      {win}
    </div>
  )
}
