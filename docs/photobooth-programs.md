# 포토부스 프로그램 14종

2026-10-15. 목업 `design-review/photobooth-program-flows-20261015`(로컬 전용, 저장소에 넣지 않음)을 실제 부스 앱으로 옮겼다.
운영 모드 하나가 프로그램 하나다 — STORE ADMIN '운영 모드'에서 고르면 모든 포토부스가 그 프로그램 전용 화면으로 돈다.
영업용 데모는 `/booth?mode=<id>&demo=1`(랜딩 `/booth-demo`).

| id | 워드마크 | 종류 | 입력 | 비고 |
|---|---|---|---|---|
| runway | WALK! | AI 사진 | 1인 촬영 | 룩 3 · 배경 2 |
| fashion-time | ERA! | AI 사진 | 1인 | 1970s/1990s/2000s · 필름 톤 |
| idol-makeup | IDOL! | AI 사진 | 1인 | 기존 AI 아이돌 컨셉 4종(idol-concepts.ts) + 메이크업 강도 |
| fan-card | WITH! | AI 보정 + 카드 | 1인 | 내 사진을 포토카드로 — 프레임·스티커·문구는 부스에서 그린다 |
| graduation | GRAD! | AI 사진 | 1인 | 가운 · 학사모 · 배경 |
| history | TIME! | AI 상상화 | 1인 | "역사에서 영감을 받은 상상화" 안내 |
| timecapsule | LATER! | AI 창작 | 1인 | "실제 미래 모습과 다를 수 있어요" 안내 |
| brand-avatar | AVATAR! | AI 캐릭터 | 1인 | 카메라는 실제 사람, 결과는 아바타 |
| hanbok | HANBOK! | AI 사진 | 1인 | 한복 3 · 배경 3 |
| traditional | INK! | AI 초상화 | 1인 | 동양화 · 민화 · 수묵화 |
| wedding | VOW! | AI 사진 | 2인 한 컷 | 얼굴 수 확인(2명 미만이면 다시 찍기 권유) |
| future-family | FAMILY! | AI 창작 | 2인 따로 두 장 | "재미로 보는 가족 상상 · 창작 이미지" 안내 |
| music-video | MV! | 편집 영상 | 15초 녹화(카메라+마이크) | AI 영상 아님 — 색감·빛 효과 + 부스가 연주한 음악 |
| memory-movie | REPLAY! | 편집 영상 | 휴대폰 사진 5~20장 | 순서 · 음악 · 제목 · 15/30초 |

## 코드
- 목록·문구·옵션: `src/lib/booth/programs/catalog.ts` (화면·서버·데모·운영 모드가 같이 읽는다)
- 생성 프롬프트(서버): `src/lib/booth/programs/prompts.ts` — 프로그램마다 따로, 옵션 id 로만 조각을 고른다(화면 문장은 쓰지 않음)
- 생성 API: `POST /api/photobooth/program` — AI 아이돌과 같은 생성 표·같은 전용 키(`OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY`)·같은 모델 순서(`generateBoothImage`)
- 화면: `src/app/booth/programs/` — `ProgramApp`(틀·이용권·무입력·종료 확인·STORE ADMIN), `PhotoFlow`, `MvFlow`, `MovieFlow`, `SavePanel`(QR·인쇄), `print-designs.ts`(4×6 원판 2종씩), `video.ts`·`music.ts`(브라우저 영상 만들기·음악 연주), `programs.css`(1280×720 기준 화면 + 프로그램별 테마)
- 진입: `BoothScreen` — 데모 주소의 모드가 프로그램이면 바로, 매장은 `ScreenUiGate` 의 `special`(클래식·레트로·맥 설정과 상관없이). 레트로·맥·클래식 화면은 운영 모드가 프로그램으로 바뀌면 손님이 없을 때 새로고침(`useScreenUiSwitch` leave)
- 운영 모드: `modes.ts` 에 14개 자동 추가(`program` 필드). 이용권 기본값은 14종 모두 **필요**(`pass-policy.ts`), STORE ADMIN 에서 모드별로 바꾼다. 이용권 설정 저장 개수 제한을 10 → 64 로(모드가 16개라 예전 제한이면 저장값 전체가 버려졌다)

## 흐름 공통
시작 → (이용권) → 촬영/휴대폰 사진 → 옵션 → 생성 → 결과(디자인 2종) → 저장(QR · 인쇄)
- 촬영: 대기 / 카운트다운(3·5초, 그동안 버튼 잠금) / 찰칵 / 완료(다시 촬영). 동의 체크를 해야 촬영. 카메라 실패 → 다시 연결 · 휴대폰 사진 · 처음으로
- 생성 진행은 실제 단계(사진 준비 → 요청 중 → 원판 그리기)와 지난 초만 보여 준다(가짜 % 없음). 영상은 그린 시간 / 전체 길이(실제 값)
- 실패: 찍은 사진·옵션 그대로 [다시 만들기] [스타일 바꾸기] [체험 마치기]. 표 하나로 2번(첫 생성 + 재시도)
- 저장: 원판을 올려(7일) QR — 화면 표시 2분(파일 보관 7일과 따로 안내). 2분이 지나면 흐려지고 [QR 다시 받기](파일 확인 후 같은 주소, 없으면 다시 올림)
- 인쇄: 화면 미리보기 = 폰 저장 = 인쇄 원판(같은 JPEG, QR 없음). 부스 앱이면 프린터로 바로, 한 번 보내면 잠금. "프린터로 보냈어요"까지만 말한다(실제로 뽑혔는지는 부스가 모름). 실패 → "QR로 저장해 주세요"
- 무입력 45초 → "계속 이용하고 계신가요?" 30초 → 처음으로. 생성·녹화·업로드 중에는 묻지 않음
- 처음으로: 결과가 있거나 만드는 중이면 확인 창. 세션마다 흐름을 새로 싣는다(카메라·마이크·타이머·영상 주소·받은 사진 정리)

## 영상
- 녹화 `MediaRecorder` — mp4(H.264/AAC)를 먼저, 안 되면 webm. 1280×720, 약 3.5Mbps
- 저장: `POST /api/photobooth/media` 가 한 번 쓰는 업로드 주소(`createSignedUploadUrl`)를 주고 부스가 저장소로 바로 PUT(Vercel 4.5MB 요청 제한을 거치지 않음, 진행률은 실제 보낸 바이트). 폰은 `/booth/video/<token>` → `/api/photobooth/media/<token>`(서명 주소로 넘김, `?download=1` 저장)
- 저장소: **비공개 버킷 `photobooth-media`(mp4·webm, 40MB)** — `supabase/migrations/20261015_photobooth_programs.sql` 을 SQL 에디터에서 실행해야 한다. 실행 전에는 영상 저장에서 "영상 보관 저장소가 아직 준비되지 않았어요"(503)
- 음악은 음원 파일 없이 브라우저가 연주(Web Audio) — 신스팝 · 로파이 · 어쿠스틱 · 피아노 · 시네마틱

## 휴대폰 사진 받기(추억 무비 · '휴대폰 사진 가져오기')
- `POST /api/photobooth/album {ticket}` → 서명 세션(30분, DB 표 없음) → QR `/booth/album/<token>?n=&for=`
- 폰은 사진을 긴 변 1600px JPEG 로 줄여 한 장씩 보낸다(장마다 진행·실패·다시 보내기, 지우기). 부스는 2.5초마다 목록을 가져온다
- 저장 위치 `analysis-images/photobooth/album/<세션>/`. 화면을 떠나면 부스가 지우고, 남은 것은 새 세션을 만들 때 만료분을 지운다

## 매장 통계
- 결과가 나오면 `photobooth_shots` 에 mode `program`, frame_title = 프로그램 id. **같은 SQL 파일의 mode 검사 변경을 실행해야 기록된다**(전에는 기록만 빠지고 손님 흐름은 그대로). 데모는 남기지 않는다

## 데모
- `/booth?mode=<id>&demo=1` — 이용권·통계·STORE ADMIN 없이, 데모 표로만 생성·저장. 생성 상한은 AI 아이돌과 **합쳐서** 1분 3장 · 하루 40장(프로그램별로 따로 늘지 않는다)
- 랜딩 카드 그림은 데모 시작 화면 캡처(`public/assets/booth-demo/program-<id>.webp`, 워터마크 없이 1280×720 → 960×540)

## 화면
- 1280×720 기준 화면을 창 크기에 맞춰 키운다(1280×720 · 1366×768 · 1920×1080 같은 배치, 남는 곳은 테마 바탕색). 누르는 곳 56px 이상
- 목업 예시 인물은 시작 화면 소개 그림에만("예시 이미지" 표시). 촬영 뒤에는 손님 사진과 실제 결과만
- 화면·인화물에 AC'SCENT 표기 없음(서비스 워드마크만). 폰 사진 페이지는 `?plain=1` 로 매장 표기를 뺀다
- 화면 언어는 한국어만(기존 AI 아이돌·매장 프로그램의 5개 언어와 다름)
