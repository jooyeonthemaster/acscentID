import { useCallback } from "react"
import type { PaymentMethod } from "@/types/cart"
import type { PaymentPayMethod } from "@portone/browser-sdk/v2"

interface PaymentParams {
  orderId: string
  orderName: string
  totalAmount: number
  paymentMethod: PaymentMethod
  customerName: string
  customerPhone: string
}

interface PaymentResult {
  success: boolean
  cancelled?: boolean
  error?: string
}

const PAY_METHOD_MAP: Record<string, PaymentPayMethod> = {
  card: "CARD",
  kakao_pay: "EASY_PAY",
  naver_pay: "EASY_PAY",
}

/**
 * 결제 수단별 채널키 반환
 * - card: KCP 채널 (기본)
 * - kakao_pay: 카카오페이 전용 채널 (없으면 기본 채널)
 * - naver_pay: 네이버페이 전용 채널 (없으면 기본 채널)
 */
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

export function usePortonePayment() {
  const initiatePayment = useCallback(
    async (params: PaymentParams): Promise<PaymentResult> => {
      // bank_transfer is handled outside of PortOne SDK
      if (params.paymentMethod === "bank_transfer") {
        return {
          success: false,
          error: "계좌이체(무통장입금)는 별도 처리가 필요합니다.",
        }
      }

      try {
        // Dynamic import to avoid SSR issues.
        const PortOne = await import("@portone/browser-sdk/v2")

        // paymentId: KCP 최대 40자 제한, 영숫자+하이픈만 허용
        // orderId(UUID 36자) + timestamp를 합치면 초과하므로 짧게 생성
        const shortId = params.orderId.replace(/-/g, "").substring(0, 20)
        const ts = Date.now().toString(36) // base36으로 짧게
        const paymentId = `pay${shortId}${ts}`

        const payMethod = PAY_METHOD_MAP[params.paymentMethod] ?? "CARD"
        const channelKey = getChannelKeyForMethod(params.paymentMethod)

        // 주문명: KCP 최대 100Byte, 특수문자 정리
        const cleanOrderName = params.orderName
          .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣()./,-]/g, "")
          .substring(0, 40) || "뿌덕퍼퓸 주문"

        // 간편결제별 easyPay provider 설정
        const easyPayProvider =
          params.paymentMethod === "kakao_pay"
            ? "KAKAOPAY"
            : params.paymentMethod === "naver_pay"
              ? "NAVERPAY"
              : undefined

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestParams: any = {
          storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
          channelKey,
          paymentId,
          orderName: cleanOrderName,
          totalAmount: params.totalAmount,
          currency: "CURRENCY_KRW",
          payMethod,
          customer: {
            fullName: params.customerName,
            phoneNumber: params.customerPhone,
            email: "order@ppuduck.com",
          },
        }

        // 간편결제 provider 설정 (카카오/네이버)
        if (easyPayProvider) {
          requestParams.easyPay = { easyPayProvider }
        }

        console.log("[PortOne] requestPayment params:", {
          paymentId,
          paymentIdLength: paymentId.length,
          payMethod,
          totalAmount: params.totalAmount,
          channelKey: channelKey?.substring(0, 15) + "...",
        })

        const response = await PortOne.requestPayment(requestParams)

        // `requestPayment` can return `undefined` when the PG redirects
        // instead of resolving the promise (e.g. mobile environments).
        if (!response) {
          return { success: false, error: "결제 응답을 받지 못했습니다." }
        }

        // The response carries a `code` field only when something went wrong.
        if (response.code) {
          if (response.code === "USER_CANCEL") {
            return { success: false, cancelled: true }
          }
          console.error("[PortOne] Payment error:", response.code, response.message)
          return {
            success: false,
            error: response.message || "결제에 실패했습니다.",
          }
        }

        // Server-side verification of the completed payment
        const verifyResponse = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, orderId: params.orderId }),
        })

        if (!verifyResponse.ok) {
          const verifyResult = await verifyResponse.json()
          return {
            success: false,
            error: verifyResult.error || "결제 검증에 실패했습니다.",
          }
        }

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
      }
    },
    []
  )

  return { initiatePayment }
}
