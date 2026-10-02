import type { ReactNode } from 'react'
import { Link } from '@/i18n/routing'

/**
 * 카드 전체를 실제 링크로 — 새 탭 열기·키보드 포커스·스크린리더가 동작하도록
 * div onClick 대신 사용한다. 외부 URL은 <a>, 내부 경로는 로케일 Link.
 */
export function CardLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (/^https?:\/\//.test(href)) {
    return <a href={href} className={className}>{children}</a>
  }
  return <Link href={href} className={className}>{children}</Link>
}
