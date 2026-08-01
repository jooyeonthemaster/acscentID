'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { UserRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * 오프라인(QR/매장) 모드에서 이미 로그인된 세션이 있으면 어떤 계정으로
 * 진행 중인지 보여주고 즉시 계정을 바꿀 수 있게 한다.
 *
 * 매장 공용 태블릿에서 앞 손님이 로그아웃하지 않은 채 다음 손님이 분석을
 * 시작하면 결과가 앞 손님 계정으로 저장되는 사고를 막기 위한 장치.
 * 로그아웃하면 QR 로그인 게이트가 다시 열리고 기기 fingerprint도 재발급된다.
 */
export function OfflineAccountBanner() {
  const searchParams = useSearchParams()
  const t = useTranslations()
  const { unifiedUser, signOut } = useAuth()

  // useInputForm의 오프라인 판정과 동일한 신호
  const isOffline =
    searchParams.get('mode') === 'qr' ||
    searchParams.get('service_mode') === 'offline' ||
    Boolean(searchParams.get('qr'))

  if (!isOffline || !unifiedUser) return null

  const name = unifiedUser.name || unifiedUser.email || t('auth.defaultUser')

  return (
    <div className="mx-auto mb-4 flex w-full max-w-[640px] items-center justify-between gap-3 rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2 text-[13px] text-[var(--muted-ink)]">
        <UserRound size={15} className="flex-shrink-0" />
        <span className="truncate">{t('auth.offlineAccountNotice', { name })}</span>
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        className="flex-shrink-0 text-[13px] font-semibold text-[var(--ink)] underline underline-offset-2 hover:opacity-70"
      >
        {t('auth.offlineSwitchAccount')}
      </button>
    </div>
  )
}
