# 화면 글꼴 (포토부스·키오스크)

관리자가 기기 관리자 패널(우측 하단 → PIN) 또는 관리자 웹의 화면 배경 관리에서 고르는 글꼴 목록입니다. 목록 코드는 `src/lib/screen-fonts/catalog.ts`, 파일은 `public/fonts/ui/<id>/<굵기>.woff2`입니다. 설정 방식은 [screen-backgrounds.md](screen-backgrounds.md)의 '화면 디자인과 글꼴'을 보세요.

- 모두 무료이며 상업적 이용이 가능한 글꼴입니다(OFL, 네이버 나눔, 배달의민족, 넥슨, 학교안심 라이선스). 글꼴 파일 자체를 판매·재배포하지 않는 조건입니다. 각 라이선스 원문은 출처에서 확인하세요.
- 파일은 한글 상용 2,350자(KS X 1001) + 영문·라틴-1·호환 자모·자주 쓰는 기호로 줄였습니다. 가변 글꼴은 400/700 두 굵기로 고정했습니다. 목록에 없는 드문 글자는 뒤따르는 에스코어드림(없으면 시스템 고딕)으로 보입니다.
- 기기는 고른 글꼴의 파일만 내려받습니다(대부분 100~400KB).
- 명조·붓글씨 계열은 일부러 넣지 않았습니다.
- 기본 제공 2종 `score-dream`(에스코어드림, 레트로 기본)·`wanted-sans`(원티드 산스)는 사이트 전역에 이미 실린 글꼴이라 파일이 없습니다.

## 다시 만들기

`scripts/build-screen-fonts.py`가 출처에서 받아 줄이고(fontTools) 한글 누락을 검사합니다. 글꼴을 더하려면 스크립트 목록과 `catalog.ts`를 함께 고치세요.

## 목록

| id | 이름 | 종류 | 굵기 | 크기 | 라이선스 | 출처 |
|---|---|---|---|---|---|---|
| `pretendard` | 프리텐다드 | 고딕 | 400·700 | 391KB | OFL-1.1 | pretendard@1.3.9 |
| `suit` | SUIT | 고딕 | 400·700 | 316KB | OFL-1.1 | @sun-typeface/suit@2.0.5 |
| `noto-sans-kr` | 본고딕 (Noto Sans KR) | 고딕 | 400·700 | 348KB | OFL-1.1 | notosanskr |
| `nanum-gothic` | 나눔고딕 | 고딕 | 400·700 | 319KB | OFL-1.1 | nanumgothic |
| `gothic-a1` | Gothic A1 | 고딕 | 400·700 | 250KB | OFL-1.1 | gothica1 |
| `ibm-plex-sans-kr` | IBM Plex Sans KR | 고딕 | 400·700 | 245KB | OFL-1.1 | ibmplexsanskr |
| `gowun-dodum` | 고운돋움 | 고딕 | 400 | 159KB | OFL-1.1 | gowundodum |
| `sunflower` | 선플라워 | 고딕 | 400·700 | 115KB | OFL-1.1 | sunflower |
| `dongle` | 동글 | 둥근 | 400·700 | 127KB | OFL-1.1 | dongle |
| `black-han-sans` | 검은고딕 | 제목용 | 400 | 79KB | OFL-1.1 | blackhansans |
| `gugi` | 구기 | 제목용 | 400 | 91KB | OFL-1.1 | gugi |
| `orbit` | 오빗 | 제목용 | 400 | 106KB | OFL-1.1 | orbit |
| `bagel-fat-one` | 베이글 팻 원 | 제목용 | 400 | 221KB | OFL-1.1 | bagelfatone |
| `gasoek-one` | 가속 원 | 제목용 | 400 | 131KB | OFL-1.1 | gasoekone |
| `stylish` | 스타일리시 | 귀여운 | 400 | 101KB | OFL-1.1 | stylish |
| `poor-story` | 푸어 스토리 | 귀여운 | 400 | 61KB | OFL-1.1 | poorstory |
| `single-day` | 싱글데이 | 귀여운 | 400 | 46KB | OFL-1.1 | singleday |
| `cute-font` | 큐트 폰트 | 귀여운 | 400 | 67KB | OFL-1.1 | cutefont |
| `gaegu` | 개구 | 귀여운 | 400·700 | 296KB | OFL-1.1 | gaegu |
| `gamja-flower` | 감자꽃 | 귀여운 | 400 | 105KB | OFL-1.1 | gamjaflower |
| `hi-melody` | 하이멜로디 | 귀여운 | 400 | 90KB | OFL-1.1 | himelody |
| `galmuri11` | 갈무리11 (픽셀) | 픽셀·코딩 | 400·700 | 90KB | OFL-1.1 | galmuri@2.40.3 |
| `galmuri14` | 갈무리14 (픽셀) | 픽셀·코딩 | 400 | 54KB | OFL-1.1 | galmuri@2.40.3 |
| `nanum-gothic-coding` | 나눔고딕코딩 | 픽셀·코딩 | 400·700 | 322KB | OFL-1.1 | nanumgothiccoding |
| `nanum-barun-gothic` | 나눔바른고딕 | 고딕 | 400·700 | 272KB | 네이버 나눔글꼴 라이선스안내 | nanum-barun-gothic |
| `nanum-square` | 나눔스퀘어 | 고딕 | 400 | 125KB | 네이버 나눔글꼴 라이선스안내 | nanum-square |
| `nanum-square-ac` | 나눔스퀘어 ac | 고딕 | 400 | 137KB | 네이버 나눔글꼴 라이선스안내 | nanum-square-ac |
| `line-seed` | LINE Seed Sans KR | 고딕 | 400 | 147KB | OFL-1.1 | line-seed-sans-kr |
| `nexon-lv1` | 넥슨 Lv.1 고딕 | 고딕 | 400·700 | 218KB | 넥슨 폰트 사용정책 | nexon-lv1-gothic |
| `nexon-lv2` | 넥슨 Lv.2 고딕 | 고딕 | 400·700 | 207KB | 넥슨 폰트 사용정책 | nexon-lv2-gothic |
| `hakgyo-bareon-dotum` | 학교안심 바른돋움 | 고딕 | 400 | 142KB | 학교 안심폰트 | hakgyoansim-bareondotum |
| `hakgyo-santteut-dotum` | 학교안심 산뜻돋움 | 고딕 | 400 | 101KB | 학교 안심폰트 | hakgyoansim-santteutdotum |
| `nanum-square-round` | 나눔스퀘어라운드 | 둥근 | 400 | 126KB | 네이버 나눔글꼴 라이선스안내 | nanum-square-round |
| `bm-jua` | 배민 주아 | 둥근 | 400 | 188KB | 배달의민족 글꼴 라이센스 정책 | bm-jua |
| `bm-hanna-pro` | 배민 한나체 Pro | 둥근 | 400 | 109KB | 배달의민족 글꼴 라이센스 정책 | bm-hanna-pro |
| `bm-hanna-air` | 배민 한나체 Air | 둥근 | 400 | 114KB | 배달의민족 글꼴 라이센스 정책 | bm-hanna-air |
| `bm-hanna-11` | 배민 한나는 열한살 | 둥근 | 400 | 111KB | 배달의민족 글꼴 라이센스 정책 | bm-hanna-11yrs |
| `nexon-maplestory` | 메이플스토리 | 둥근 | 400·700 | 330KB | 넥슨 폰트 사용정책 | nexon-maplestory |
| `nexon-bazzi` | 넥슨 배찌체 | 둥근 | 400 | 193KB | 넥슨 폰트 사용정책 | nexon-bazzi |
| `hakgyo-monggeul` | 학교안심 몽글몽글 | 둥근 | 400 | 88KB | 학교 안심폰트 | hakgyoansim-monggeulmonggeul |
| `hakgyo-gureum` | 학교안심 구름 | 둥근 | 400 | 119KB | 학교 안심폰트 | hakgyoansim-gureum |
| `bm-dohyeon` | 배민 도현 | 제목용 | 400 | 90KB | 배달의민족 글꼴 라이센스 정책 | bm-dohyeon |
| `bm-yeonsung` | 배민 연성 | 제목용 | 400 | 326KB | 배달의민족 글꼴 라이센스 정책 | bm-yeonsung |
| `bm-euljiro` | 배민 을지로 | 제목용 | 400 | 371KB | 배달의민족 글꼴 라이센스 정책 | bm-euljiro |
| `bm-euljiro-10` | 배민 을지로 10년후 | 제목용 | 400 | 2338KB | 배달의민족 글꼴 라이센스 정책 | bm-euljiro-10years-later |
| `hakgyo-godeun` | 학교안심 고든제목 | 제목용 | 400 | 138KB | 학교 안심폰트 | hakgyoansim-godeunjemok |
| `hakgyo-undongjang` | 학교안심 운동장 | 제목용 | 400 | 71KB | 학교 안심폰트 | hakgyoansim-undongjang |
| `bm-kirang` | 배민 기랑해랑 | 귀여운 | 400 | 380KB | 배달의민족 글꼴 라이센스 정책 | bm-kiranghaerang |
| `hakgyo-kkokkoma` | 학교안심 꼬꼬마 | 귀여운 | 400 | 124KB | 학교 안심폰트 | hakgyoansim-kkokkoma |
| `hakgyo-jiugae` | 학교안심 지우개 | 귀여운 | 400 | 92KB | 학교 안심폰트 | hakgyoansim-jiugae |
| `nanum-pen` | 나눔손글씨 펜 | 귀여운 | 400 | 420KB | 네이버 나눔글꼴 라이선스안내 | nanum-pen |
| `neodgm` | 네오둥근모 (픽셀) | 픽셀·코딩 | 400 | 15KB | OFL-1.1 | neodgm |
| `d2coding` | D2Coding | 픽셀·코딩 | 400·700 | 270KB | OFL-1.1 | d2coding |
