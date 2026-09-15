# 포토부스 디자인 업그레이드 — 코덱스 작업 프롬프트

아래 내용을 그대로 코덱스에 붙여넣으세요.

---

## 역할

너는 AC'SCENT WOW(홍대 향수 매장)의 오프라인 포토부스 웹앱을 **시각적으로 끌어올리는 프로덕트 디자이너 겸 프론트엔드 엔지니어**다. 기능 추가가 아니라 **보이는 품질**이 목표다. 필요한 이미지 에셋은 직접 생성해서 저장소에 넣어라.

## 이 프로그램이 뭔지 (취지를 반드시 이해하고 시작할 것)

홍대 매장에서 열리는 **생카(생일카페)** 를 겨냥한 부스다. 생카는 팬(총대)이 카페를 대관해 최애의 생일을 축하하는 행사고, 방문 팬은 음료·상품을 사면 **특전**(컵홀더·포토카드 등)을 받고 포토존에서 인증샷을 찍어 X(트위터)에 해시태그와 함께 올린다.

이 부스의 포지션은 **"특전으로 주는 4x6인치 인화사진"** 이다. 즉 화면 UI보다 **손에 남는 인화물이 최종 제품**이다. 두 가지를 동시에 만족해야 한다.

1. **인화물이 굿즈처럼 예뻐야 한다** — 팬이 소장하고 SNS에 올릴 만한 결과물
2. **부스 화면이 매장에서 눈에 띄어야 한다** — 손님이 지나가다 "저거 뭐지?" 하고 다가오게

톤: 팬덤 이벤트 특유의 화사함과 매장(AC'SCENT)의 절제된 무드 사이. 유치한 클립아트 금지, 그렇다고 차갑기만 해도 안 됨.

## 현재 코드 맵

- 부스 화면: `src/app/booth/page.tsx`, `src/app/booth/BoothClient.tsx` (다크 테마, 매장 태블릿/PC 전체화면)
- 손님 폰 업로드: `src/app/booth/upload/[code]/BoothUploadClient.tsx`
- 관리자: `src/app/admin/photobooth/page.tsx` (라이트 slate 테마)
- 합성 엔진: `src/lib/photobooth/compose.ts` (캔버스 합성·인화 레이아웃), `src/lib/photobooth/templates.ts` (템플릿 기하)
- 이벤트/이용권: `src/lib/photobooth/current-event.ts`, `src/lib/photobooth/master-pass.ts`
- API: `src/app/api/photobooth/{config,session,upload,pass}`, `src/app/api/admin/photobooth/{,events,passes}`
- 기존 에셋: `public/assets/photobooth/templates/*.png` (주인공 컷 3종, 1200x900)

스택: Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, framer-motion, lucide-react, qrcode. **새 npm 패키지는 추가하지 마라** (이미 있는 것으로 해결). 폰트는 `public/fonts/pretendard/PretendardVariable.woff2` 로 self-host 중.

부스 3가지 체험:
- **최애와 찍기**: 템플릿(인물이 한쪽에 치우친 4:3 이미지)의 빈 배경에 손님을 페더 블렌딩 → 옆에 나란히 선 합성
- **내 포카·직찍과 찍기**: 손님 폰 사진을 QR로 받아 폴라로이드처럼 얹기
- **일반 촬영**: 1컷 또는 네컷(2x2)

## 절대 깨뜨리면 안 되는 계약

1. **인화 규격**: 최종 캔버스는 1200x1800px(4x6인치 @300dpi 세로). `PRINT`/`TEMPLATE_LAYOUT` 상수(margin 36, gap 18, footerH 200, radius 24 → contentW 1128, 합성컷 y36 h846, 단독컷 y900 h646, 푸터 y1564)를 바꾸려면 **프리뷰와 인화 양쪽이 같은 값을 쓰도록** 반드시 함께 수정할 것.
2. **WYSIWYG**: 촬영 화면의 실시간 프리뷰와 최종 인화는 **반드시 같은 `renderTogetherBand()` 를 호출**해야 한다. 프리뷰용 별도 렌더 경로를 만들지 마라.
3. **캔버스 오염 금지**: 합성 캔버스에 그리는 모든 이미지는 same-origin(`/public`) 또는 CORS 허용 Supabase 퍼블릭 버킷이어야 한다. 외부 CDN 이미지를 그리면 `toDataURL()` 이 throw 하고 인화가 통째로 실패한다. **생성한 에셋은 전부 `public/` 에 둘 것.**
4. **인쇄 CSS**: `@page { size: 4in 6in; margin: 0 }` 와 `.booth-print-area` 규칙을 건드리지 마라. 인쇄 시 결과 이미지 1장만 전체 지면에 나와야 한다.
5. **라우팅**: `/booth` 는 로케일 라우팅 제외(`src/middleware.ts`) + robots 차단 상태다. 유지할 것.
6. **API 응답 스키마** 변경 금지 (`/api/photobooth/config` 의 `{ event, frames, templates }` 등).
7. **`<img>` 사용 유지**: 부스에서는 `next/image` 대신 `<img>` + `eslint-disable-next-line @next/next/no-img-element` 패턴을 쓴다. 이 패턴을 따라라.
8. **라이브 프리뷰 성능**: 촬영 화면은 `requestAnimationFrame` 루프에서 배경 키잉(`getImageData` 픽셀 순회)까지 돌린다. 프레임마다 도는 코드에 무거운 작업을 더하지 마라.
9. **DB 없이도 동작**: Supabase 미연결 환경에서 `/api/photobooth/config` 는 500을 반환하고, 부스는 번들 템플릿으로 폴백한다. **디자인 작업은 DB 없이 검증 가능해야 한다.** 이 폴백을 망가뜨리지 마라.
10. 모든 사용자 문구는 **한국어**.

## 과제 A — 이미지 에셋 생성 (최우선)

### A-1. 기본 프레임 세트 (가장 큰 공백)

지금 `frames` 는 관리자가 올리기 전까지 **비어 있다**. 즉 기본 상태의 인화물에 아무 장식이 없다. 번들 기본 프레임을 만들어 채워라.

- 규격: **1200x1800 PNG, 투명 배경**. 사진이 보일 영역은 반드시 완전 투명(alpha 0).
- 합성 맨 마지막에 **전체 화면 오버레이로** 덮인다. 따라서 장식은 **바깥 테두리 약 60~90px과 모서리**에 두고 가운데는 비워라.
- **하단 236px(푸터 밴드 영역)을 불투명하게 덮지 마라.** 최애와 찍기 모드에서 이벤트 정보 텍스트가 그 자리에 찍힌다.
- 네컷(2x2 그리드) 전용 변형도 만들어라 — 가로/세로 중앙 분할선에 얇은 여백 선이 들어가는 형태.
- 최소 4~6종, 서로 다른 무드(모노톤 미니멀 / 생일 파티 / 파스텔 하트 / 별·반짝이 / 리본 등).
- `public/assets/photobooth/frames/` 에 저장하고, `src/lib/photobooth/templates.ts` 의 `BUNDLED_TEMPLATES` 패턴을 그대로 따라 **`BUNDLED_FRAMES` 를 만들어** `BoothClient.tsx` 의 `frames` 초기값·폴백에 연결해라 (관리자가 올린 프레임이 있으면 그것을 앞에 두고 번들은 뒤에 붙이는 방식, 템플릿과 동일하게).

### A-2. 어트랙트(대기) 화면 배경

아무도 안 쓸 때 부스가 혼자 돌리는 화면용 배경/모션 소재. 매장에서 시선을 끄는 게 목적이다. 정적 PNG 여러 장 + CSS/framer-motion 모션 조합을 권장(무거운 동영상 파일 금지).

### A-3. 장식 요소

- 반짝이·꽃잎·색종이 같은 파티클용 **SVG 스프라이트**(인라인 SVG 권장, 파일이면 `public/assets/photobooth/decor/`)
- 부스 전용 워드마크 락업 (AC'SCENT WOW PHOTO)
- 빈 상태(등록된 프레임/템플릿 없음)용 일러스트

### A-4. (여력 되면) 스티커 세트

편집 단계에서 손님이 인화물에 올릴 수 있는 스티커 — 생일 모자, 말풍선("생일 축하해"), 하트, 케이크 등 투명 PNG. 얹기 로직은 `together` 모드의 폴라로이드 레이어 구현을 참고하면 된다. **이건 선택 과제이므로 A-1~A-3을 끝낸 뒤에 손대라.**

## 과제 B — 부스 화면 UI/모션

`BoothClient.tsx`는 기능은 다 돌지만 시각적으로 밋밋하다. **키오스크 기준**으로 올려라 — 서서 1~2m 거리에서 보고 손가락으로 누른다.

- 터치 타깃 최소 56px, 본문 글자 최소 18px
- 단계 전환에 framer-motion 모션 (지금은 조건부 렌더만 있음)
- 촬영 순간 **플래시 효과**, 카운트다운 숫자 모션 (지금은 그냥 숫자)
- 네컷 촬영 중 **찍은 컷이 옆에 쌓이는** 피드백
- 완성 화면: 인화물이 실제 사진처럼 등장하는 연출, 해시태그 안내를 지금보다 눈에 띄게
- **어트랙트 화면 추가**: 홈에서 60초 이상 입력이 없으면 전환, 아무 곳이나 터치하면 홈 복귀. 진행 중 생카가 있으면 그 테마(`event.theme_color`, `cover_image_url`, `greeting`)로 보여줄 것
- 이벤트 테마 컬러가 지금은 포인트로만 쓰인다. 배경 그라디언트·버튼 등으로 더 과감하게 반영하되, 어떤 색이 와도 **대비(가독성)가 무너지지 않도록** 처리할 것

## 과제 C — 손님 폰 업로드 화면

`BoothUploadClient.tsx`는 지금 거의 무지 화면이다. 손님이 QR을 찍고 처음 보는 매장의 인상이므로, 부스 화면과 같은 세계관으로 맞춰라. 진행 중 생카 정보(주인공·해시태그)를 보여주면 더 좋다. **세로 모바일 기준**, iOS 입력 확대 방지(16px 이상) 유지.

## 과제 D — 인화물 타이포그래피

- `compose.ts` 의 `drawEventFooter()` 이벤트 밴드 디자인을 끌어올려라. 지금은 제목/부제/해시태그 3줄 텍스트뿐이다. 구분선·작은 로고·날짜 스탬프 등으로 굿즈처럼.
- **버그 하나 고칠 것**: `FONT_STACK` 이 `"Pretendard"` 를 지정하는데, 이 프로젝트는 `next/font/local` 로 폰트를 불러와 **실제 CSS family 이름이 "Pretendard"가 아니다.** 즉 캔버스 텍스트가 폰백으로 렌더되고 있다. `/booth` 에서 `@font-face { font-family: 'Pretendard'; src: url('/fonts/pretendard/PretendardVariable.woff2') }` 를 직접 선언하거나 동등한 방법으로 캔버스에서 프리텐다드가 실제로 쓰이게 하고, **`document.fonts.ready` 를 기다린 뒤 텍스트를 그려라** (안 그러면 첫 렌더에서 폰백으로 찍힌다).

## 과제 E — 관리자 페이지 (우선순위 낮음)

`src/app/admin/photobooth/page.tsx` 는 기능 위주다. 소재 카드 썸네일 품질, 진행 중 이벤트 강조, 이용권 섹션 정도만 다듬어라. 여기에 시간을 많이 쓰지 마라.

## 검증 (반드시 수행하고 결과를 보고할 것)

1. `npx tsc --noEmit` — 통과
2. `npx eslint "src/app/booth/**/*.tsx" "src/app/admin/photobooth/page.tsx" "src/lib/photobooth/*.ts"` — 통과
3. `npm run dev` 후 `/booth`, `/booth/upload/PB-ABC234`, `/admin/photobooth` 가 200 응답하는지 확인
4. **합성 결과를 눈으로 확인할 것.** 브라우저 자동화 도구는 없지만 `sharp` 가 (Next의 전이 의존성으로) 설치되어 있다. `NODE_PATH=./node_modules node <스크립트>` 로 캔버스 합성 로직과 동일한 수식을 재현해 1200x1800 인화 원판 PNG를 뽑고, 실제 이미지를 열어 확인해라. 특히 **새로 만든 프레임 PNG를 얹었을 때 사진이 가려지지 않는지, 푸터 텍스트가 살아 있는지** 확인할 것.
5. 다크/라이트, 좁은 화면에서 깨지지 않는지 확인.

## 보고 형식

작업이 끝나면 다음을 알려라.

- 생성한 에셋 목록 (경로·규격·용도)
- 변경한 파일과 이유
- 검증 결과 (위 1~5, 실제로 돌린 명령과 결과)
- 의도적으로 하지 않은 것과 그 이유
- 렌더해서 확인한 인화물 이미지 (경로)

**디자인 의사결정은 스스로 내려라.** 색·레이아웃·모션을 나에게 되묻지 말고, 위의 취지에 맞춰 판단한 뒤 그 근거를 보고에 적어라.
