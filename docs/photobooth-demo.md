# 포토부스 영업용 데모 (/booth-demo)

2026-10-15. 키오스크 데모(`/kiosk-demo`, docs/kiosk-modes.md '영업용 데모')와 같은 방식의 포토부스 랜딩.

## 구성
- 랜딩 `src/app/booth-demo/`(page.tsx · booth-demo.css). 로케일 라우팅 밖(`middleware.ts`), `robots: noindex`.
- 목록·주소 규칙 `src/lib/booth/demo.ts`(`BOOTH_DEMOS`): AI 사진 프로그램 12종 + 영상 프로그램 2종(docs/photobooth-programs.md) + AI 아이돌 4종(컨셉별) + 매장 프로그램 4종(최애와 찍기 · 포카 직찍 합성 · 일반 촬영 · 포토카드 QR). 랜딩 위 분류 탭으로 이동.
- 카드를 누르면 새 창으로 `/booth?mode=<운영 모드>&demo=1[&concept=…|&program=…]`.
- 그림 `public/assets/booth-demo/` — 부스 화면은 데모 주소를 1280×720 으로 찍어 960×540 webp(워터마크·개발 표시를 걷고), AI 아이돌은 예시 인화물(design-review/kwave-idol-examples-4). 화면이 바뀌면 다시 찍는다.
- 부스 그림(`.bd-booth`)은 그림 파일 없이 CSS 로 — 가로 모니터 위에 DSLR, 아래 받침대.

## 데모로 연 부스(`?demo=1`)
- 매장 기기 설정(운영 모드·이용권·화면 디자인)을 건드리지 않고 주소의 모드로 돈다. 화면 디자인은 매장과 같은 맥(BoothScreen), 디자인 설정이 바뀌어도 새로고침하지 않는다.
- 이용권 없이, 촬영 기록(매장 통계 `photobooth_shots`)을 남기지 않는다. STORE ADMIN 은 열리지 않는다(설정이 매장 기기에 바로 적용되므로).
- `concept` 는 첫 화면에서 미리 고르고, `program` 은 첫 화면을 건너뛰고 바로 연다(처음 한 번).
- NEANDER 워터마크(`BoothWatermark`, 키오스크와 같은 CSS) — 화면에만, 인화물·받는 사진에는 없다.

## 데모 표와 비용 상한 (`src/lib/booth/demo-server.ts`)
- `POST /api/photobooth/demo/ticket` → 데모 표(생성 표와 같은 서명, 주인 `demo`). 같은 사이트 요청만, 1분 10장.
- AI 아이돌 생성(`/api/photobooth/idol`)과 프로그램 생성(`/api/photobooth/program`)에서 데모 표는 합쳐서 **1분 3장 · 하루(KST) 40장**(장당 약 $0.14 → 하루 최대 약 7,800원). 하루 수는 비공개 버킷 `screen-background-settings/booth-demo/usage-YYYY-MM-DD.json` 에 적는다(인스턴스가 여러 개여도 맞게, 동시에 몰리면 한두 장 넘을 수 있음). 생성 전에 세므로 실패한 생성도 센다.
- 넘으면 "오늘 데모 횟수를 다 썼어요" → 찍은 사진으로 인화 디자인만.
- 폰으로 받기·인화물 QR(`/api/photobooth/result`)은 촬영 기록 대신 `demoTicket` 으로 올린다(1분 10장). 사진은 매장과 같이 7일 보관.
- 포카·직찍 합성은 폰 업로드 세션을 매장과 같이 만든다(15분).
