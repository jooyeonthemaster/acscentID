# 맥 스타일 화면 테마

`/booth`와 `/kiosk`의 세 번째 디자인 `mac`. 기존 `classic`, `retro` 설정과 기본값은 유지한다.

## 디자인 기준

사용자가 제공한 Apple 공식 페이지 https://developer.apple.com/kr/macos/ 의 ‘플랫폼 디자인 및 Liquid Glass’ 설명을 참고했다. 콘텐츠 우선, 밝은 소재, 반투명 툴바와 부드러운 그림자, 정돈된 서체·선형 아이콘으로 표현한다. 웹 CSS로 구현한 맥 스타일이며 Apple 네이티브 Liquid Glass API를 사용하는 것은 아니다.

- 설정 위치: `/admin/backgrounds`, `/admin/photobooth`, `/admin/kiosk`의 화면 관리, 기기 내 PIN 관리자 패널. 기존 / 레트로 / 맥 중 선택.
- 기존 설정 저장소와 기기 종류별 공유 방식을 사용한다. DB 마이그레이션은 없다.
- 테마 전환은 기존처럼 대기 화면 또는 기기 관리자 패널에서 새로고침으로 적용한다. 촬영·입력 중에는 현재 테마를 유지한다.
- 포토부스·키오스크 동작과 사진·인화·보고서 합성 로직은 변경하지 않는다. 레트로 화면의 상태·레이아웃을 공유하고 scoped CSS와 아이콘만 전환한다.
- 모든 스타일은 `.rt[data-ui='mac']` 아래에 한정한다. 기존·레트로와 일반 웹에 적용되지 않는다.
- 기본 서체는 운영체제 시스템 글꼴. 관리자가 고른 서체와 키오스크 한자권 언어 서체는 우선 적용한다. SF Pro나 SF Symbols 파일을 별도로 포함하지 않는다. 선형 아이콘은 기존 lucide-react를 사용한다.
- 타이틀바의 세 색 점은 장식이며 클릭 영역이 아니다. 실제 닫기·이전·다음 동작은 충분한 터치 크기를 유지한다.
- 반투명 효과 미지원 또는 투명도 감소·대비 향상 설정에서는 불투명 소재로 표시한다. 모션 감소 설정을 존중한다.
- 배경 카탈로그와 선택은 유지하며, 맥 테마에서만 옅은 색 레이어를 얹어 가독성을 높인다. 카메라·사진·인화물에는 이 효과를 적용하지 않는다.

## 주요 구현

- `src/components/mac/mac.css`: 공통 소재·창·버튼·입력·키보드·진행 표시 및 두 화면 전용 스타일
- `src/components/mac/MacIcon.tsx`, `design-context.tsx`: 테마별 아이콘
- `src/components/mac/theme.ts`: 시스템 서체 및 사용자/언어 서체 우선 처리
- `src/lib/screen-backgrounds/types.ts`, `ui-switch.tsx`: mac 설정 허용 및 화면 전달
- `src/components/admin/ScreenBackgroundManager.tsx`, `src/components/screen/DeviceDesignControls.tsx`: 세 가지 테마 선택
- `src/app/booth/BoothClient.tsx`, `src/app/kiosk/KioskClient.tsx`: design prop, 테마 범위·서체·안전한 전환 연결

## 검토 자료와 검증

`design-review/mac-theme/`에 포토부스 홈·이용권 입력, 키오스크 대기·입력 화면 스크린샷을 저장한다. 이 폴더는 Git에서 제외될 수 있고 실행에 필요하지 않다.

`node scripts/verify-screen-backgrounds.mjs`: 맥 설정 저장/조회, 다른 기기 설정 보존, 서체 우선 적용 등 포함.
브라우저 검토에서는 설정 API 응답만 가상으로 mac으로 바꾸고 운영 설정을 저장하지 않았다.

운영 배포 및 실제 매장 장비 검증은 별도다. 코드와 스타일을 함께 배포한 뒤 관리자에서 맥을 선택하면 된다.

검증 완료: 설정 관련 테스트 26개, TypeScript, 변경 공통 모듈의 ESLint, 프로덕션 빌드 통과. 브라우저에서 1920×1080 포토부스와 560×996 CSS 뷰포트 키오스크의 홈·입력·터치 키보드를 확인했다. 운영 설정은 변경하지 않았다.
