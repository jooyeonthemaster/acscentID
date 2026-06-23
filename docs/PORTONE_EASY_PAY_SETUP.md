# PortOne 간편결제 적용 체크리스트

## 현재 코드 상태

- 브라우저 SDK: `@portone/browser-sdk` V2 사용 (`@portone/browser-sdk/v2`)
- 결제 요청 전 서버 준비 API: `POST /api/payments/prepare`
- 결제 완료 검증 API: `POST /api/payments/verify`
- 웹훅 수신 API: `POST /api/payments/webhook`
- 지원 결제수단: 카드, 카카오페이, 네이버페이, 무통장입금

## 환경변수

필수:

```bash
NEXT_PUBLIC_PORTONE_STORE_ID=
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=
PORTONE_API_SECRET=
```

카카오페이/네이버페이 전용 채널을 각각 쓰는 경우:

```bash
NEXT_PUBLIC_PORTONE_KAKAOPAY_CHANNEL_KEY=
NEXT_PUBLIC_PORTONE_NAVERPAY_CHANNEL_KEY=
```

기본 채널이 포트원 EASY_PAY를 함께 지원하고, 별도 전용 채널 없이 열어도 되는 경우:

```bash
NEXT_PUBLIC_PORTONE_ENABLE_EASY_PAY=true
```

## 포트원 콘솔 작업

1. 포트원 관리자 콘솔의 결제 연동 페이지에서 Store ID와 채널 키를 확인한다.
2. 카카오페이/네이버페이 채널을 추가하거나, 기본 채널에서 `EASY_PAY` 지원 여부를 확인한다.
3. 웹훅 URL을 운영 도메인 기준으로 등록한다.

```text
https://{운영도메인}/api/payments/webhook
```

4. 테스트 채널로 1,000원 결제 테스트 상품을 먼저 결제한다.
5. 관리자 주문 상태가 `paid`로 전환되고 `payment_id`, `pg_provider`, `pg_tx_id`, `paid_at`이 저장되는지 확인한다.
6. 환불 테스트 후 `refund_amount`, `refunded_at`, `cancellation_id`가 저장되는지 확인한다.

## 구현 메모

- 결제창 호출 전 `/api/payments/prepare`에서 주문 금액을 서버 기준으로 재검증하고 포트원 사전등록 API를 호출한다.
- 브라우저 결제 요청의 `customData.orderId`와 서버 주문 ID가 일치하는지 완료 검증에서 확인한다.
- 웹훅은 `payment_id`로 주문을 찾고, 구버전/예외 흐름에서는 `customData.orderId`로 한 번 더 찾는다.
- 카카오페이는 PC `IFRAME`, 모바일 `REDIRECTION` 조합을 사용한다.
- 네이버페이는 PC `POPUP`, 모바일 `REDIRECTION` 조합을 사용한다.
