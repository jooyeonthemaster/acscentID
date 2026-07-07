# 함정 전수 (사주 개발에서 실제로 밟았거나 발견한 것)

Phase A 전에 통독. 디버깅 중 증상이 익숙하면 여기부터.

## 1. CSS: 비레이어 커스텀 클래스가 Tailwind 유틸리티를 덮어쓴다 (실제 major 사고)

globals.css의 커스텀 클래스(예: `.saju-ink-grain { position: relative }`)는 **레이어 밖**이라 레이어드 유틸리티(`.absolute`)보다 우선한다. → `absolute inset-0` 캔버스가 relative로 강등되어 콘텐츠 높이로 접힘(오버레이 붕괴). **해법**: position 같은 충돌 속성은 `:where(:not(.absolute):not(.fixed):not(.sticky))` 가드로 선언. 새 커스텀 클래스 추가 시 항상 이 가드 검토.

## 2. 스태킹 컨텍스트: 레이아웃 main이 `relative z-10`

오버레이 `z-[99999]`도 main 서브트리에 갇혀 main의 형제(BottomNav z-40)를 못 이긴다. 실플로우 `/input`/`/result`에서는 BottomNav가 미렌더(`isFocusedExperiencePath`)라 무해하지만, **다른 경로에 풀스크린 오버레이를 만들면 portal(document.body) 필요**.

## 3. SSR/CSR hydration mismatch: 난수 기반 파티클 (실제 major 사고)

시드 난수여도 소수점 문자열 포맷 정밀도가 서버/클라 미세하게 달라 hydration 에러. **수치는 toFixed(2~4)로 고정 포맷**. 그리고 같은 컴포넌트를 두 곳에 중복 구현하지 말 것 (GoldDust가 입력/결과에 따로 있다가 한쪽만 고쳐지는 사고 — `src/components/<x>/`로 단일화).

## 4. DB: 저장소 마이그레이션 ≠ 라이브 DB (드리프트 실존)

20260605 store_product 마이그레이션이 라이브에 미적용된 채 발견됨. **마이그레이션 파일 기반으로 제약을 재작성해 적용하면 라이브 값을 좁혀 기존 기능을 깨뜨릴 수 있다.** 반드시 적용 전 라이브 정의 조회(launch-verification.md의 pg_constraint 쿼리) → "라이브 현재값 + 새 값"으로 작성.

## 5. 컴파일 강제 vs 침묵 열화

Record 타입(PRODUCT_PRICING/PRODUCT_TYPE_BADGES/PRODUCT_TYPE_LABELS/PROGRAM_SEO)은 빠지면 tsc가 잡아준다. 그러나 **switch/객체 리터럴/배열 열거는 침묵**: INPUT_TYPE_TO_SLUG(미등록 → idol-image로 조용히 폴백!), QR 리다이렉트 switch, 관리자 필터 option, cost-analysis 분류(→'standard' 오분류), AuthModal redirectPath(→/mypage), 알림 라벨(→raw slug), useAutoSave(→image_analysis 오저장). integration-checklist의 [침묵열화] 표기 전수 확인.

## 6. reviews_program_type_check는 DB 하드 게이트

TS 유니온 6곳만 고치면 UI는 제출을 허용하고 **DB가 거부**한다. 마이그레이션에 반드시 포함.

## 7. serviceMode 기본값 불일치

API 저장 기본 'online' vs 결과 페이지 클라 기본 'offline'. 핸드오프에서 serviceMode를 빠뜨리면 온라인 유저에게 구매 버튼 대신 피드백 버튼이 뜬다.

## 8. localStorage는 프로그램 간 공유 전역

`analysisResult/productType/programType/userImage/savedResultId...` — 이전 프로그램의 스테일 키가 다음 결과에 누출될 수 있음. 핸드오프 시 관련 키 전부 명시적으로 세팅/제거.

## 9. analysis_data에 유니버설 코어가 없으면

인쇄가 '데이터 부족' 폴백으로 떨어지고, 오프라인 재고 차감(matchingPerfumes[0]/finalRecipe 기반)이 에러 로그를 남긴다. traits 등 코어 필드는 프로그램이 아무리 특수해도 유지.

## 10. Gemini 관련

- 일일 한도는 **호출 전에 소모** — 실패해도 1회 차감. offline 우회는 클라이언트 플래그(스푸핑 가능함을 인지).
- maxOutputTokens 8192 기본은 대형 스키마에서 JSON 절단 → 파싱 실패 → mock 폴백. 12288+ 사용.
- 기본 safety 필터가 운세/관계 서사를 빈 응답으로 만들 수 있음 → 라우트 한정 BLOCK_ONLY_HIGH.
- parseGeminiResponse는 raw JSON.parse(코드펜스 미처리) — responseMimeType json이라 동작. 커스텀 파서는 균형 괄호 스캐너 복제.
- traits/scentCategories에 0이 오면 하드 실패 — 프롬프트에 "1-10 정수" 유지.
- GEMINI_API_KEY의 GCP 프로젝트에 결제 활성화 필수 — 아니면 60초 타임아웃 (코드 버그처럼 보이는 인프라 문제, MEMORY 참조).
- mock 폴백은 프로그램 전용으로 — 기본 mock은 아이돌 주접 톤이라 세계관 프로그램에서 톤 붕괴.

## 11. 로케일

- locale-prompt-wrapper FINAL CHECK 4개 문자열에 새 필드 미추가 → 비ko 출력에 한국어 누출.
- 번역 라우트에 계산 스냅샷 미보호 → 한자/enum이 번역기를 통과하며 파괴. 구조분해로 물리 제거 후 재부착.
- next-intl은 누락 키에서 render throw — 5로케일 키 구조 동일성 set-diff 검증.
- messages/*.json은 병렬 에이전트 공유 금지 (단일 소유자 + 최종 리컨실).

## 12. 죽은 코드를 템플릿 삼지 말 것

`input/figure/`(채팅 위저드, page.tsx 없음 — 도달 불가), GraduationStep6(미사용), chemistry scentDirection(상태만 있고 UI 카드 없음), ShareCard/ShareCardNew(고아), modern-screenshot(주석만). StepHeader는 TOTAL_STEPS=5 하드코딩이라 스텝 수 다르면 자체 헤더.

## 13. 로컬 개발 OAuth

localhost 포트가 등록돼 있어야 로그인 가능: Supabase `uri_allow_list`(Management API로 추가 가능 — 토큰은 메모리), Kakao는 개발자 콘솔 Redirect URI(`http://localhost:<port>/api/auth/kakao`) — 미등록 포트는 배포 환경으로 리다이렉트. 3000은 다른 프로젝트가 점유 중일 수 있음.

## 14. 기타 운영

- `supabase/migrations/`에 `nul` 파일 존재 — Windows에서 supabase db push를 깨뜨릴 수 있는 기존 지뢰.
- 결과는 UUID만 알면 공개 접근(`/api/results/[id]` 무인증) — analysis_data에 민감정보 금지.
- 테스트 계정/행은 만들면 반드시 정리 (QA가 auto-save로 실DB에 행을 남김).
- 세션 사용량 한도로 서브에이전트가 죽을 수 있음 — 상태를 디스크(문서/저널)에 남기며 진행하면 재개 가능. 워크플로우는 resumeFromRunId로 캐시 재개.
- dev 서버 고아 프로세스가 포트를 점유한 채 무응답일 수 있음 — netstat로 PID 확인 후 정리.
