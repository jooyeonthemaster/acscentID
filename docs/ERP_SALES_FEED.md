# 본사 ERP 매출 피드

본사 ERP(NEANDER)가 이 사이트의 온라인 주문을 **자동으로** 가져갑니다.
관리자 주문 화면에서 「페이히어 온라인」 엑셀을 내려받아 ERP 에 올리던 일이
없어집니다.

전체 설계·켜는 순서는 ERP 저장소의 `docs/sales-auto-sync.md` 에 있습니다.
이 문서는 **이 사이트 쪽에서 알아야 할 것**만 적습니다.

## 추가된 것

| 파일 | 하는 일 |
| --- | --- |
| `src/app/api/erp/feed/route.ts` | 읽기 전용 피드. 주문 + 품목을 내보낸다 |
| `src/lib/erp/feed-auth.ts` | Bearer 토큰 검사 (기계용 통로) |
| `src/lib/erp/feed-contract.ts` | ERP 와의 계약 사본 |
| `src/lib/erp/signal.ts` | 결제 확정·환불 직후 ERP 에 빈 신호 |

신호를 보내는 자리:

- `src/app/api/payments/verify/route.ts` — 결제 확정
- `src/app/api/payments/webhook/route.ts` — 웹훅 결제 확정 · 웹훅 취소
- `src/app/api/admin/orders/refund/route.ts` — 관리자 환불
- `src/app/api/admin/orders/refund/manual/route.ts` — 무통장 환불
- `src/app/api/admin/orders/route.ts` — 주문 상태 변경 · 인플루언서 설정 · **주문 삭제**
  (삭제는 `reconcile` 을 실어 보낸다 — 지운 주문은 피드에 다시 오지 않으므로
  ERP 가 「아직 있나」를 되물어야 한다)

## 함께 고친 것

- **무통장 입금 확인 때 `paid_at` 을 채운다** (`admin/orders/route.ts` PATCH,
  `pending → paid`). 전에는 비어 있어 매출일이 주문일로 잡혔다.

## 피드 부르는 법

```
GET /api/erp/feed?after=<cursorKey>&limit=300   바뀐 주문 (커서는 updated_at 원문|id)
GET /api/erp/feed?from=YYYY-MM-DD&to=YYYY-MM-DD&offset=0   그 기간에 들어온 주문
GET /api/erp/feed?ids=<주문id,…>                 그 주문들이 아직 있는지 (100개까지)
```

## 환경변수

```
ERP_FEED_TOKEN       ERP 가 피드를 읽을 때 제시하는 토큰 (비우면 피드가 닫힘)
ERP_SYNC_SIGNAL_URL  https://<ERP 도메인>/api/neander/sync/signal
ERP_SIGNAL_TOKEN     신호에 붙이는 토큰
```

## 지키는 것

- **읽기 전용.** 피드 라우트는 아무것도 쓰지 않는다.
- **개인정보 없음.** 수령인·전화·주소·메모를 `select` 하지 않는다.
- **매출 판정은 원가계산 화면을 바탕으로 한다.** `paid · preparing · shipping ·
  delivered`, 인플루언서 제외. 이 규칙을 바꾸면 `feed-contract.ts` 의
  `REVENUE_STATUSES` 와 `src/app/api/admin/cost-analysis/finance/route.ts` 의
  `PAID_STATUSES` 를 함께 고친다.
- **한 가지는 일부러 다르다 — 부분 환불.** 환불 라우트는 금액이 일부여도
  `status='cancelled'` 로 바꾼다. 피드는 상태가 아니라 금액으로 판정해서, 돌려준
  돈이 결제액보다 적으면 매출로 보낸다. **원가계산 화면은 이 주문을 통째로 빼고
  있다** (기존 동작, 이번에 고치지 않았다).
- **신호는 결제를 막지 않는다.** await 하지 않고, 실패해도 throw 하지 않는다.

## 주의

`orders` 테이블에는 `updated_at` 을 자동으로 올리는 트리거가 없다. 결제·환불·
상태변경 라우트가 손으로 넣고 있다. **주문 금액이나 상태를 바꾸는 새 코드를 쓸
때는 `updated_at` 도 함께 갱신해야** ERP 가 그 변화를 가져간다. (Supabase
콘솔에서 직접 고친 것은 ERP 의 정기 전체 확인이 메운다.)

## 계약을 바꿀 때

`FEED_VERSION` 을 올리고 ERP 쪽 `lib/neander/sync/contract.ts` 를 **함께** 고쳐
배포한다. 판이 어긋나면 ERP 가 동기화를 멈추고 화면에 붉게 띄운다 — 조용히
틀린 숫자를 쌓는 것보다 낫다.
