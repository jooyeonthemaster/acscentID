// 블록형 진행 표시 — 칸칸이 채워진다.
// 실제 진행률이 있으면 value(0~1)를 넘긴다. 모르는 작업은 value 를 비워 두면
// 블록 묶음이 움직이고, 퍼센트는 절대 보여 주지 않는다(가짜 숫자를 만들지 않는다).

interface ProgressProps {
  /** 0~1. 없으면 진행률을 모르는 작업 */
  value?: number | null
  /** 칸 수 */
  blocks?: number
  /** 스크린 리더용 이름 (예: '분석 진행') */
  label: string
  className?: string
}

export function RetroProgress({ value, blocks = 16, label, className }: ProgressProps) {
  const known = typeof value === 'number' && Number.isFinite(value)
  if (!known) {
    return (
      <div
        className={`rt-progress rt-progress--busy${className ? ` ${className}` : ''}`}
        role="progressbar"
        aria-label={label}
        aria-busy="true"
      >
        <span className="rt-progress-run" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      </div>
    )
  }
  const ratio = Math.max(0, Math.min(1, value as number))
  const filled = Math.round(ratio * blocks)
  return (
    <div
      className={`rt-progress${className ? ` ${className}` : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={blocks}
      aria-valuenow={filled}
    >
      <span className="rt-progress-cells" aria-hidden="true">
        {Array.from({ length: blocks }, (_, i) => (
          <i key={i} data-on={i < filled} />
        ))}
      </span>
    </div>
  )
}

interface StepsProps {
  /** 0부터 */
  current: number
  total: number
  label: string
  className?: string
}

/** 단계 표시 — 지난 단계는 채우고 지금 단계는 한 번 더 강조한다(색에만 기대지 않게 모양도 다르다) */
export function RetroSteps({ current, total, label, className }: StepsProps) {
  return (
    <ol className={`rt-steps${className ? ` ${className}` : ''}`} aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          data-state={i < current ? 'done' : i === current ? 'now' : 'todo'}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className="rt-sr">{`${i + 1}/${total}`}</span>
        </li>
      ))}
    </ol>
  )
}
