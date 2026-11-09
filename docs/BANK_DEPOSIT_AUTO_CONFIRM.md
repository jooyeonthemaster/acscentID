# 무통장입금 자동 확인 (우리은행 입금 문자)

계좌이체 주문을 사람이 은행 앱을 보고 `입금대기 → 입금완료`로 바꾸던 일을 자동으로 한다.
SMOAT(크레딧 무통장 충전)에서 쓰는 방식과 같다.

```
손님 입금 → 우리은행 입금 알림 문자 → 전용 안드로이드 폰(MacroDroid)
  → POST https://www.acscent.co.kr/api/payments/bank-notify   (Bearer 토큰, 문자 원문 그대로)
  → 금액·입금자명·주문 시각이 맞는 입금대기 무통장 주문이 정확히 1건이면 입금완료
     (재고 차감·쿠폰 사용 확정·재구매 쿠폰·ERP 매출 신호 — 관리자 수동 확인과 같은 처리, paid_at = 문자 시각)
  → 못 고르면 bank_deposit_notifications 에 남기고 관리자 메일 → /admin/bank-deposits 에서 주문을 골라 처리
```

## 맞추는 규칙

자동 입금완료는 아래를 **모두** 만족하는 주문이 **딱 1건**일 때만 한다.

- 주문 상태 `pending`, 결제수단 `bank_transfer`
- 입금액 = 주문 `final_price` (정확히)
- 입금자명 = 주문의 입금자명(주문서에서 손님이 적은 값, 기본은 받는 분 이름) — 공백·기호·대소문자 무시
- 주문을 만든 때가 입금 시각 기준 7일(`BANK_DEPOSIT_MATCH_WINDOW_HOURS`) 안 (주문보다 입금이 10분 먼저 찍힌 것까지 봐줌)

같은 금액 주문이 흔해서(48,000원·24,000원) **이름이 다르면 금액이 같아도 자동으로 붙이지 않는다.**

| 결과 | 상태 | 하는 일 |
|---|---|---|
| 1건 | `matched` | 입금완료 + 관리자 메일(✅) |
| 0건 | `unmatched` | 관리자 메일(⚠️) — 이름·금액이 다른 입금 |
| 2건 이상 | `ambiguous` | 관리자 메일(⚠️) — 어느 주문인지 골라야 함 |
| 다른 계좌·출금·이자(`예금결산`)·지정한 이름 | `ignored` | 아무것도 안 함 |
| 처리 중 오류 | `failed` | 관리자 메일(⚠️) |

관리자 화면(`/admin/bank-deposits`)에서 확인이 필요한 입금마다 금액·이름이 비슷한 입금대기 주문을 보여 준다.
`이 주문 입금 확인`(→ `linked`) 또는 `주문 아님 — 넘기기`(→ `dismissed`)를 누르면 된다.
같은 문자가 1분 안에 다시 오면(폰 재전송) 한 번만 처리한다.

## 켜는 순서

1. **DB** — Supabase SQL Editor 에서 `supabase/migrations/20261109_bank_deposit_auto_confirm.sql` 실행
   (`orders.depositor_name` 열, `bank_deposit_notifications` 표). 실행 전에 배포돼도 주문은 그대로 만들어진다(입금자명만 빠짐).
2. **토큰** — `openssl rand -hex 24` 로 만든 값을 Vercel(acscent, Production) 환경변수 `BANK_NOTIFY_INGEST_TOKEN` 에 넣고 다시 배포.
   SMOAT 토큰과 **다른 값**으로 한다. 이 값이 없으면 받는 곳이 503 으로 닫혀 있다.
3. **폰** — 아래 「폰 설정」.
4. **시험** — 소액(예: 100원)으로 실제 입금 → `/admin/bank-deposits` 「전체 기록」에 `주문 못 찾음`으로 들어오는지 확인(주문이 없으니 정상) → `주문 아님 — 넘기기`.
   이어서 실제 무통장 주문 하나를 넣고 그 금액·이름으로 입금해 `자동 확인`이 되는지 본다.
5. **안내 문구** — 확인되면 Vercel 환경변수 `NEXT_PUBLIC_BANK_DEPOSIT_AUTO_CONFIRM=true` 를 넣고 다시 배포.
   주문서의 "입금 확인은 수동이라 1~2시간" 안내가 "보통 몇 분 안에 자동 확인"으로 바뀐다.

## 폰 설정 (MacroDroid)

쇼핑몰 계좌 **우리 1005-204-549279** 의 입금 알림 문자가 오는 안드로이드 폰에서 한다.
(우리은행 앱/고객센터에서 그 계좌의 입출금 SMS 알림을 그 폰 번호로 신청)

- 트리거: `SMS 수신` — 내용 포함 `*549279` (이 계좌 문자만)
- 액션: `HTTP 요청`
  - 방식 `POST`, URL `https://www.acscent.co.kr/api/payments/bank-notify`
  - 헤더 `Authorization` = `Bearer <BANK_NOTIFY_INGEST_TOKEN>`
  - 본문 `{sms_message}` (매직텍스트 → SMS → 메시지 내용) — JSON 으로 감싸지 않는다
  - Content-Type 은 `text/plain` 또는 비움 (`application/json` 이면 안 됨)
- MacroDroid 배터리 최적화 제외, 폰은 충전기에 꽂아 두고 와이파이/데이터 유지.

**SMOAT 계좌(우리 1006-301-573695)와 같은 폰이면** SMOAT 매크로의 내용 필터를 `*573695` 로 좁혀,
쇼핑몰 입금 문자가 SMOAT 로 가지 않게 한다(반대로 SMOAT 문자가 여기 와도 다른 계좌라 `ignored` 로 넘긴다).

수동 시험:

```bash
curl -X POST https://www.acscent.co.kr/api/payments/bank-notify \
  -H "Authorization: Bearer $BANK_NOTIFY_INGEST_TOKEN" -H "Content-Type: text/plain" \
  --data $'[Web발신]\n우리 11/09 14:23\n*549279\n입금 100원\n시험\n잔액 1원'
```

## 환경변수

| 이름 | 기본값 | 뜻 |
|---|---|---|
| `BANK_NOTIFY_INGEST_TOKEN` | (없음 = 꺼짐) | 폰이 보내는 Bearer 토큰 |
| `BANK_DEPOSIT_ACCOUNT_SUFFIX` | `549279` | 이 계좌 끝자리 문자만 처리 |
| `BANK_DEPOSIT_MATCH_WINDOW_HOURS` | `168` | 주문 후 몇 시간 안의 입금까지 자동으로 붙일지 |
| `BANK_DEPOSIT_IGNORED_DEPOSITORS` | (없음) | 주문이 아닌 입금자명, 쉼표 구분 (예: PG 정산 법인명). `예금결산`은 항상 제외 |
| `NEXT_PUBLIC_BANK_DEPOSIT_AUTO_CONFIRM` | (없음) | `true` 면 주문서 안내를 자동 확인 문구로 |

## 운영 주의

- 폰이 꺼지거나 문자가 늦으면 자동 확인도 늦다(SMOAT 실측: 문자 시각 → 서버 도착 중간값 38초, 가장 늦은 것 약 1시간).
  확인이 안 된 주문은 지금처럼 관리자 주문 화면에서 수동으로 입금완료 처리하면 된다 — 두 길은 같은 처리를 하고, 이미 입금완료인 주문은 다시 바꾸지 않는다.
- 토큰이 새면 누구든 "입금 문자"를 꾸며 보낼 수 있다(이름·금액이 맞는 입금대기 주문이 있어야 하긴 하다). 의심되면 Vercel 에서 토큰을 바꾸고 폰에도 새 값을 넣는다.
- 문자 원문(입금자명·잔액)은 `bank_deposit_notifications` 에 남는다. RLS 로 막혀 있어 관리자 API 로만 본다.

## 코드

- 문자 읽기·주문 고르기(순수 함수): `src/lib/bank-deposit/alert.ts` — 테스트 `npm run test:bank-deposit`
- 설정·주문 확정: `src/lib/bank-deposit/server.ts`, 확정 후속 처리(관리자 수동 확인과 공용): `src/lib/orders/paid-effects.ts`
- 받는 곳: `src/app/api/payments/bank-notify/route.ts`
- 관리자: `src/app/admin/bank-deposits/page.tsx`, `src/app/api/admin/bank-deposits/`
- 주문서 입금자명: `src/app/[locale]/checkout/page.tsx` → `src/app/api/orders/route.ts` (`orders.depositor_name`)
