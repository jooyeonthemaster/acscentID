# 검증 · 마이그레이션 · 배포 플레이북

## 1. Phase C 검증 루프 (major 0까지, 최대 3라운드)

### 준비
- `npx next build` 통과 확인 (백그라운드).
- dev 서버: 포트 점유 확인(`netstat -ano | grep :<port>`) 후 기동. 로그인 테스트가 필요하면 **Supabase uri_allow_list에 등록된 포트** 사용 (pitfalls §13).
- 최장 텍스트 픽스처 `scripts/fixtures/<x>-sample.json` 준비 (모든 서사 필드를 클램프 예산 최대치로 — 오버플로 검수의 핵심 자산).

### 라운드 구조 (브라우저는 싱글턴 — QA는 순차, 픽서는 병렬)
1. **QA(브라우저)**: 모바일 390×844 + PC 1440×900. 랜딩(`?adminPreview=1`, ko+en) → 위저드 전 페이즈(제출 직전 봉인까지 — **실제 Gemini 제출 금지**, 쿼터 보호) → 결과(localStorage 픽스처 주입, ui-conventions §6) 전 섹션 스크롤 15스텝 스크린샷 → 인쇄 하네스 2변형. 콘솔 에러(hydration/key 경고 포함) = 결함. UI-SPEC 대조로 severity(major/minor/polish) 판정.
2. **정적 무결성(병렬, 무편집)**: integration-checklist §18 그렙 + 핸드오프 잔여물 + TODO/placeholder 스캔 + tsc.
3. **픽서(영역별 병렬, 파일 소유권 분리)**: 결함 목록 배분. UI-SPEC 방향으로만 수정.
4. **재검증**: 이전 결함 하나씩 확인 + 회귀 스윕. 잔여가 문서 불일치 수준이면 SSOT(UI-SPEC) 갱신도 유효한 수정.

### DB e2e 스모크 (마이그레이션 적용 후)
```
POST /api/results (픽스처 analysis_data, productType=<ptype>, serviceMode='online' ← offline은 재고차감 발동!)
→ id 확보 → GET /api/results/{id} 로 스냅샷/서사 필드 무결 왕복 확인
→ 테스트 행 삭제 (Management API DELETE ... RETURNING id)
```

## 2. Supabase 마이그레이션 적용 (라이브)

토큰: 메모리 `supabase-access-token.md` (만료 시 사용자에게 재발급 요청). 프로젝트 ref: `ivcjjrzvmmtwkvxcajrg`.

**절차 (순서 엄수)**:
1. **라이브 제약 사전 조회** — 저장소 마이그레이션 파일을 믿지 말 것 (드리프트 실존, pitfalls §4):
```sql
SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint WHERE conname IN (
 'analysis_results_product_type_check','cart_items_product_type_check',
 'order_items_product_type_check','qr_codes_product_type_check',
 'cart_items_product_ref_check','order_items_product_ref_check',
 'orders_product_ref_check','reviews_program_type_check');
```
(Management API: `POST https://api.supabase.com/v1/projects/<ref>/database/query`, Bearer 토큰, body `{"query":"..."}`)
2. 시드 대상 스키마·현황 조회: admin_products 컬럼/현재 display_order max, admin_product_pricing PK(=product_type,size)/CHECK(original_price>=price — 시드에 NULL 권장).
3. **"라이브 현재값 + 새 값"으로 SQL 재작성** (라이브에 없는 값을 마이그레이션 파일에서 가져와 섞지 말 것) → 적용 → 검증 쿼리(`def LIKE '%<ptype>%'` 5/5 + 시드 SELECT).
4. 저장소 마이그레이션 파일을 **실제 적용본과 동일하게 교체** (드리프트 경고 주석 포함).

## 3. 커밋 · 배포

- 커밋: feature 브랜치, `[ADD]: <프로그램명> 전체 구현` — **선별 스테이징** (스크린샷/.playwright-mcp/임시 로그/타 작업 잔여물 제외; `git add -u -- . ':(exclude)hwp_mcp.log'` + 신규 경로 명시). CHANGELOG.md 엔트리 추가.
- 푸시: `git push -u origin feature/<x>-program`.
- **Vercel CLI 배포** (GitHub↔Vercel 계정 불일치와 무관 — 로컬 파일 직접 업로드):
```bash
TOK=$(python -c "import json,io;print(json.load(io.open(r'C:\Users\jooye\AppData\Roaming\com.vercel.cli\Data\auth.json',encoding='utf-8'))['token'])")
npx -y vercel whoami --token "$TOK"          # jooyeonthemaster 확인
npx -y vercel deploy --prod --yes --token "$TOK"
```
(xdg.data 쪽 vca_ 토큰은 단기 만료 — 구 저장소 토큰이 장수명. 둘 다 죽으면 `vercel login`.)
- 배포 검증: `vercel inspect <deployment-url> --token` 으로 `target: production` + Aliases에 www.acscent.co.kr 확인, 프로덕션에서 새 라우트 200 + 경량 API 응답 확인.
- **머지 리마인드**: CLI 배포는 git과 무관하므로, feature 브랜치를 main에 머지하지 않은 채 나중에 main 기준 재배포하면 **롤백된다** — PR 머지를 사용자에게 상기.

## 4. 활성화 가이드 (사용자 전달용)

1. 관리자 → 프로그램: `<프로그램명>` is_active 켜기 (이 순간부터 홈/네비/메뉴 노출)
2. 관리자 → 상품 이미지: slug 썸네일 업로드 (홈 카드/바텀시트/메뉴 이미지 소스)
3. (선택) 관리자 → 상품 상세: custom 상세 HTML / 가격 조정(admin_product_pricing)
4. 오프라인 운영 시: 관리자 → QR에서 product_type 선택 발급
5. 실제 Gemini 제출 1회 테스트 (QA 미커버 구간): 로그인 → `/input?type=<x>&mode=online&adminPreview=1` → 제출 → 로딩 연출 → 결과 서사 → 마이페이지 재열람 → (관리자) 인쇄 미리보기
