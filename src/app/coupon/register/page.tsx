import { NextIntlClientProvider } from 'next-intl'
import koMessages from '@/messages/ko.json'
import { CouponRegisterClient } from './CouponRegisterClient'

export const metadata = {
  title: '쿠폰 코드 등록 | AC\'SCENT IDENTITY',
  robots: { index: false, follow: false },
}

export default function CouponRegisterPage() {
  return (
    <NextIntlClientProvider locale="ko" messages={koMessages}>
      <CouponRegisterClient />
    </NextIntlClientProvider>
  )
}
