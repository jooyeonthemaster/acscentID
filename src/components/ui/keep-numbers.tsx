import { Fragment, type ReactNode } from 'react'

// 사업자번호·계좌번호·전화번호처럼 숫자와 하이픈이 이어진 덩어리 (예: 683-86-02812, 02-336-3368)
const NUMBER_RUN = /(\d+(?:-\d+)+)/

/**
 * 문장 속 번호 덩어리가 하이픈에서 줄바꿈되지 않도록 nowrap span으로 감싼다.
 * 복사 시 원문 그대로 복사되도록 보이지 않는 문자를 끼워 넣지 않는다.
 */
export function keepNumbers(text: string): ReactNode {
  const parts = text.split(NUMBER_RUN)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="whitespace-nowrap">{part}</span>
      : <Fragment key={i}>{part}</Fragment>,
  )
}
