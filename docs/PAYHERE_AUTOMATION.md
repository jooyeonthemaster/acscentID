# PAYHERE 매출 자동화 연결 체크리스트

관리자 원가계산 페이지에는 PAYHERE API 동기화 골격이 준비되어 있다. 아래 값이 환경변수에 들어가면 `/admin/cost-analysis`의 `PAYHERE 불러오기` 버튼으로 월별 매출 원장을 가져와 기존 재무 계산에 반영한다.

공식 확인 링크:

- 페이히어 엔터프라이즈: https://payhere.in/enterprise/
- 페이히어 엔터프라이즈 도입 문의: https://payhere.in/contact/enterprise/

## PAYHERE에 요청할 것

1. Open API 사용 권한 활성화
2. 결제/매출 목록 조회 API 문서
3. 인증 방식과 헤더 형식
4. 와우 매장, 아이디 매장, 온라인 판매처를 구분할 store id 또는 location id
5. 결제일, 결제금액, 결제상태, 상품명, 옵션, 수량, 결제수단, 고유 결제 id 필드 정의
6. 월별 조회 시 날짜 파라미터 형식, 페이지네이션 방식, 호출 제한

## 환경변수

```bash
PAYHERE_API_BASE_URL=
PAYHERE_SALES_ENDPOINT_TEMPLATE=
PAYHERE_API_KEY=
PAYHERE_AUTH_HEADER_NAME=Authorization
PAYHERE_AUTH_SCHEME=Bearer
PAYHERE_WOW_STORE_ID=
PAYHERE_ID_STORE_ID=
PAYHERE_ONLINE_STORE_ID=
PAYHERE_MAX_PAGES=5
```

`PAYHERE_SALES_ENDPOINT_TEMPLATE`에는 다음 플레이스홀더를 쓸 수 있다.

```text
{storeId}
{source}
{startDate}
{endDate}
{from}
{to}
{page}
```

예시는 실제 PAYHERE 문서를 받은 뒤에 맞춰 넣는다.

```bash
PAYHERE_API_BASE_URL=https://api.example-payhere.com
PAYHERE_SALES_ENDPOINT_TEMPLATE=/stores/{storeId}/sales?from={startDate}&to={endDate}&page={page}
```

인증 헤더가 `Authorization: Bearer <token>` 형태가 아니면 아래처럼 직접 지정할 수 있다.

```bash
PAYHERE_AUTH_HEADER_NAME=X-Api-Key
PAYHERE_AUTH_HEADER_VALUE=
```

## 구현된 동작

- 월별 시작일과 다음 달 시작일을 API 조회 범위로 보낸다.
- 와우, 아이디, 온라인 PAYHERE 매장을 각각 선택해서 동기화한다.
- 같은 월·매장 기존 원장을 교체할 수 있다.
- API 응답의 일반적인 목록 키(`data`, `items`, `sales`, `payments`, `transactions` 등)를 자동 탐색한다.
- 결제 고유 id가 없으면 매장, 일자, 금액, 상품 설명으로 안정적인 id를 만들어 저장한다.
- 가져온 원장은 기존 원가계산의 PAYHERE 재료비/수수료 추정 로직에 그대로 반영된다.

## 연결 후 첫 점검

1. `.env.local`에 PAYHERE 값을 넣는다.
2. 개발 서버를 재시작한다.
3. `/admin/cost-analysis`에서 원가 분석 잠금을 해제한다.
4. 대상 월을 선택하고 `PAYHERE 불러오기`를 누른다.
5. 매출원별 원장에서 PAYHERE 건수와 매출 합계가 PAYHERE 관리자 화면의 월 합계와 맞는지 확인한다.
