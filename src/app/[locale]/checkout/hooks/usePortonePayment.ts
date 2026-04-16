import { useCallback, useRef } from "react"
import type { PaymentMethod } from "@/types/cart"
import type { PaymentPayMethod } from "@portone/browser-sdk/v2"
import { detectInAppBrowser, isMobileDevice } from "@/lib/mobile/inAppBrowser"

interface PaymentParams {
  orderId: string
  orderName: string
  totalAmount: number
  paymentMethod: PaymentMethod
  customerName: string
  customerPhone: string
  customerEmail?: string
  // locale을 포함한 완료 페이지 경로 ("/ko/checkout/complete" 등).
  // 넘기지 않으면 현재 window.location.pathname에서 유추한다.
  completePath?: string
}

interface PaymentResult {
  success: boolean
  cancelled?: boolean
  // 모바일 리디렉션 방식에서는 페이지가 떠나므로 resolve되지 않는다.
  // 이 값이 true이면 호출자는 추가 처리 없이 페이지 이탈을 기다려야 한다.
  redirecting?: boolean
  error?: string
  errorCode?: string
}

const PAY_METHOD_MAP: Record<string, PaymentPayMethod> = {
  card: "CARD",
  kakao_pay: "EASY_PAY",
  naver_pay: "EASY_PAY",
}

// iOS ISP/앱카드 결제 후 원래 앱으로 복귀하기 위한 URL scheme.
// 별도 네이티브 앱이 없으므로 Safari 복귀용으로만 쓰이지만,
// PortOne/KCP가 WebView 검출 시 이 값을 요구할 수 있어 안전하게 설정한다.
const APP_SCHEME = "acscent://payment/return"

function getChannelKeyForMethod(method: PaymentMethod): string {
  switch (method) {
    case "kakao_pay":
      return (
        process.env.NEXT_PUBLIC_PORTONE_KAKAOPAY_CHANNEL_KEY ||
        process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ||
        ""
      )
    case "naver_pay":
      return (
        process.env.NEXT_PUBLIC_PORTONE_NAVERPAY_CHANNEL_KEY ||
        process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ||
        ""
      )
    case "card":
    default:
      return process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || ""
  }
}

/**
 * locale prefix를 포함한 현재 경로 유추.
 * next-intl localePrefix: 'as-needed' 설정이라 ko는 prefix 없음.
 */
function inferLocaleBasePath(): string {
  if (typeof window === "undefined") return ""
  const segments = window.location.pathname.split("/").filter(Boolean)
  const KNOWN_LOCALES = ["ko", "en", "ja", "zh", "es"]
  if (segments.length > 0 && KNOWN_LOCALES.includes(segments[0])) {
    return "/" + segments[0]
  }
  return ""
}

/**
 * 고유한 paymentId 생성.
 * - KCP 최대 40자, 영숫자+하이픈만 허용
 * - 동일 paymentId 재사용 시 PortOne API가 거부하므로 timestamp + random 조합
 */
function generatePaymentId(orderId: string): string {
  const shortId = orderId.replace(/-/g, "").substring(0, 15)
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 7)
  // 최대 길이: 3(pay) + 15 + ~8(ts) + 5(rand) = 31자 — 40자 제한 안쪽
  return `pay${shortId}${ts}${rand}`
}

/**
 * KCP 주문명 100Byte 제한 준수.
 * 한글은 UTF-8 3byte이므로 단순 substring이 아닌 byte 단위로 자른다.
 */
function truncateOrderNameByBytes(name: string, maxBytes = 80): string {
  const cleaned = name.replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣()./,-]/g, "").trim()
  const encoder = new TextEncoder()
  const encoded = encoder.encode(cleaned)
  if (encoded.length <= maxBytes) return cleaned || "뿌덕퍼퓸 주문"

  // byte 기준으로 잘라낸 뒤 디코딩 시 깨지는 글자 제거
  let lo = 0
  let hi = cleaned.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    const slice = cleaned.substring(0, mid)
    if (encoder.encode(slice).length <= maxBytes) lo = mid
    else hi = mid - 1
  }
  return cleaned.substring(0, lo) || "뿌덕퍼퓸 주문"
}

export function usePortonePayment() {
  // 이중 호출 방지: 결제 요청 진행 중 플래그
  const inFlightRef = useRef(false)

  const initiatePayment = useCallback(
    async (params: PaymentParams): Promise<PaymentResult> => {
      // 계좌이체는 PortOne 미사용
      if (params.paymentMethod === "bank_transfer") {
        return {
          success: false,
          error: "계좌이체(무통장입금)는 별도 처리가 필요합니다.",
        }
      }

      if (inFlightRef.current) {
        return {
          success: false,
          error: "결제 요청이 이미 진행 중입니다. 잠시만 기다려주세요.",
        }
      }
      inFlightRef.current = true

      try {
        // 인앱브라우저 프리체크: 결제 호출 전 차단 (checkout 페이지에서
        // 배너로도 안내하지만 최종 방어선으로 한번 더 검사)
        const inAppInfo = detectInAppBrowser()
        if (inAppInfo.isInApp) {
          return {
            success: false,
            error: `${inAppInfo.displayName}에서는 결제가 제한됩니다. 외부 브라우저(Safari·Chrome)에서 다시 시도해 주세요.`,
            errorCode: "IN_APP_BROWSER",
          }
        }

        const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
        const channelKey = getChannelKeyForMethod(params.paymentMethod)
        if (!storeId || !channelKey) {
          return {
            success: false,
            error: "결제 환경 설정이 누락되었습니다. 관리자에게 문의해 주세요.",
            errorCode: "PG_ENV_MISSING",
          }
        }

        // SSR 보호 — 이 hook은 client component에서만 호출된다고 가정하지만
        // dynamic import 직전 안전 체크
        if (typeof window === "undefined") {
          return { success: false, error: "브라우저 환경이 아닙니다." }
        }

        const PortOne = await import("@portone/browser-sdk/v2")

        const paymentId = generatePaymentId(params.orderId)
        const payMethod = PAY_METHOD_MAP[params.paymentMethod] ?? "CARD"
        const orderName = truncateOrderNameByBytes(params.orderName)

        // 완료 페이지 URL 구성 — locale prefix 유지
        const basePath = inferLocaleBasePath()
        const completePath =
          params.completePath ?? `${basePath}/checkout/complete`
        const redirectUrl = new URL(completePath, window.location.origin)
        redirectUrl.searchParams.set("orderId", params.orderId)
        redirectUrl.searchParams.set("paymentMethod", params.paymentMethod)

        const easyPayProvider =
          params.paymentMethod === "kakao_pay"
            ? "KAKAOPAY"
            : params.paymentMethod === "naver_pay"
              ? "NAVERPAY"
              : undefined

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestParams: any = {
          storeId,
          channelKey,
          paymentId,
          orderName,
          totalAmount: params.totalAmount,
          currency: "CURRENCY_KRW",
          payMethod,
          customer: {
            fullName: params.customerName,
            phoneNumber: params.customerPhone,
            email: params.customerEmail || "order@acscent.co.kr",
          },
          // 모바일 리디렉션 필수 URL
          redirectUrl: redirectUrl.toString(),
          // WebView/앱카드 복귀 scheme
          appScheme: APP_SCHEME,
          // PC는 팝업, 모바일은 리디렉션으로 명시
          windowType: {
            pc: "POPUP",
            mobile: "REDIRECTION",
          },
          // 주문 식별자 — verify 단계에서 교차검증 가능
          customData: JSON.stringify({ orderId: params.orderId }),
        }

        if (easyPayProvider) {
          requestParams.easyPay = { easyPayProvider }
        }

        // 모바일은 아래 호출이 페이지 이탈로 resolve되지 않는다.
        // 그 전에 로컬 저장소에 결제 컨텍스트를 남겨 complete 페이지가
        // 복원할 수 있게 한다.
        try {
          sessionStorage.setItem(
            `portone:pending:${params.orderId}`,
            JSON.stringify({
              paymentId,
              orderId: params.orderId,
              paymentMethod: params.paymentMethod,
              totalAmount: params.totalAmount,
              startedAt: Date.now(),
            })
          )
        } catch {
          // sessionStorage 미지원/용량초과 환경은 무시
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("[PortOne] requestPayment", {
            paymentId,
            payMethod,
            totalAmount: params.totalAmount,
            isMobile: isMobileDevice(),
            redirectUrl: requestParams.redirectUrl,
            channelKey: channelKey.substring(0, 15) + "...",
          })
        }

        const response = await PortOne.requestPayment(requestParams)

        // 모바일 REDIRECTION 방식에서는 페이지가 PG로 이동하여 resolve되지 않는다.
        // 실제로 이 코드에 도달하는 건 PC POPUP 경로 또는 시작 전 에러 케이스.
        if (!response) {
          // 매우 드문 경우지만, 모바일에서 PG 호출 직후 페이지가 아직
          // 이탈하지 않은 상태로 undefined가 나올 수 있다. 리디렉션 진행 중으로 간주.
          return { success: false, redirecting: true }
        }

        if (response.code) {
          if (response.code === "USER_CANCEL") {
            return { success: false, cancelled: true, errorCode: response.code }
          }
          console.error("[PortOne] Payment error:", response.code, response.message)
          return {
            success: false,
            error: response.message || "결제에 실패했습니다.",
            errorCode: response.code,
          }
        }

        // PC 팝업 경로: 결제 서버 검증
        const verifyResponse = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, orderId: params.orderId }),
        })

        if (!verifyResponse.ok) {
          const verifyResult = await verifyResponse.json().catch(() => ({}))
          return {
            success: false,
            error: verifyResult.error || "결제 검증에 실패했습니다.",
          }
        }

        // 검증 성공 시 세션 컨텍스트 정리
        try {
          sessionStorage.removeItem(`portone:pending:${params.orderId}`)
        } catch {}

        return { success: true }
      } catch (error: unknown) {
        console.error("[PortOne] Payment exception:", error)
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "결제 처리 중 오류가 발생했습니다.",
        }
      } finally {
        inFlightRef.current = false
      }
    },
    []
  )

  return { initiatePayment }
}
