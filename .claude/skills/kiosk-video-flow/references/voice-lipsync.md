# 목소리 · 립싱크 — ElevenLabs + Sync.so

길잡이 인물이 **말하는** 영상(대사 조각)을 만들 때 쓴다. 순서: 대사 → ElevenLabs 목소리(mp3) → Sync.so 로 그 영상의 입 모양을 소리에 맞춤 → 소리 들어간 mp4.
도구: `scripts/voice-sync.mjs` (2026-11-19 tts · stt · lipsync 모두 실제로 돌려 확인).

## 키 — 이 저장소 `.env.local`

| 이름 | 어디서 온 키 | 비고 |
|---|---|---|
| `ELEVENLABS_API_KEY` | smoat 저장소 `.env` 키를 복사 | 요금제 starter, 매달 글자 약 5.3만 자 |
| `SYNC_API_KEY` | ERP(`~/Developer/acscenterp/acscenterp/.env.local`) 키를 복사 | 같은 Sync 계정 — ERP 쪽 11/05 sync-3 작업 기록이 같이 보인다 |

- 스크립트가 `.env.local` 을 스스로 읽는다. 셸에서 쓰려면 `set -a; . ./.env.local; set +a`.
- 키 값은 찍지 않는다(보여야 하면 앞 12자 · 끝 3자). Vercel 에는 아직 안 넣었다 — 운영 화면이 직접 부르게 되면 사용자에게 묻고 넣는다.
- 두 키 모두 다른 프로젝트 것이라 쓴 만큼 그쪽 사용량으로 잡힌다. 큰 묶음(수십 개)을 돌리기 전에는 개수 · 길이를 사용자에게 보이고 정한다.

## 명령

```bash
S=.claude/skills/kiosk-video-flow/scripts/voice-sync.mjs
node $S voices ko                                   # 한국어 목소리 목록
node $S tts "대사" out.mp3 --voice <id> --model eleven_v3 --timestamps out-ts.json
node $S stt out.mp3 out-stt.json --lang kor         # 받아쓰기로 발음 · 길이 확인(낱말마다 시작 · 끝 초)
node $S lipsync 영상.mp4 out.mp3 talk.mp4 --model lipsync-2 --dry   # 확인만
node $S lipsync 영상.mp4 out.mp3 talk.mp4 --model lipsync-2         # 실제(2.7초 짜리 약 1분)
```

결과마다 출력 폴더 `_voice-log.jsonl` 에 한 줄(글자 수 · 모델 · 작업 id · 걸린 시간).

## ElevenLabs

- 목소리 모델(한국어 됨): `eleven_v3`(기본, 감정 표현 좋음) · `eleven_v4` · `eleven_v4_turbo` · `eleven_multilingual_v2` · `eleven_flash_v2_5`(빠름 · 쌈).
- 계정에 있는 한국어 목소리: Yooni(여, 기본값 `n2fbxG88jqAoaVPUy3IG`) · Chaemong(여) · JY(여, 발랄) · Jaewon(남) · Taek(남, 따뜻) · JunHo(남, 연기톤) · 오리 목소리 2개(만든 것). 인물마다 하나 정해 문서에 적고 계속 같은 것을 쓴다.
- `--timestamps` 는 글자마다 시작 · 끝 초를 준다 — 자막 · 대사판을 소리에 맞춰 띄울 때 쓴다.
- 받아쓰기(`stt`, scribe_v1)로 고유명사 · 브랜드 이름이 제대로 읽혔는지 확인하고, 틀리면 띄어쓰기 · 소리 나는 대로 적어 다시 만든다.

## Sync.so 립싱크

- 모델: `lipsync-2`(빠르고 쌈, 기본) · `lipsync-2-pro`(더 섬세) · `sync-3`(최고 품질 · 얼굴 표정까지) · `react-1`(감정 지시).
- `--mode`(소리와 영상 길이가 다를 때): `cut_off`(짧은 쪽에 맞춰 자름, 기본) · `loop` · `bounce`(영상을 앞뒤로 왕복) · `silence` · `remap`. 대사가 영상보다 길면 `bounce` 나 `loop`, 같은 길이로 만들 수 있으면 그게 가장 좋다.
- 화면에 사람이 여럿이거나 얼굴을 잘못 잡으면 `--speaker x,y,frame`(말하는 사람 얼굴 좌표와 그 프레임 번호).
- 파일을 그대로 올린다(multipart, URL 필요 없음). 결과는 `outputUrl`(토큰 붙음)에서 받는다.
- **결과에는 소리가 들어 있다.** `scripts/encode.sh` 는 소리를 빼므로 대사 조각에 쓰지 않는다. 다시 줄여야 하면 `-c:a aac -b:a 128k` 로 소리를 살려 인코딩.

## 밟은 함정

- 이 저장소 일부 화면 영상은 **위 · 아래로 쌓인 투명 영상**이다(예 `public/assets/kiosk-video/makeup/*.mp4` 720×2560 — 위 절반 그림, 아래 절반 흰 실루엣). 그대로 넣어도 위 절반 입은 맞춰지지만 아래 투명 틀은 안 바뀐다. 원본(쌓기 전 720×1280)으로 립싱크한 뒤 다시 쌓는다.
- 립싱크용 영상은 얼굴이 정면 · 입이 가려지지 않고 · 고개를 크게 돌리지 않는 조각이 잘 된다. 대기(idle) 조각을 바탕으로 쓰면 끝 프레임이 첫 프레임과 같아 이음매도 유지된다 — 단, 입 모양이 바뀌어 마지막 몇 프레임이 달라질 수 있으니 `check-video.cjs seams` 로 다시 잰다.
- 하린(ai-perfumer-harin) 대사 영상은 HeyGen Avatar 6 Turbo 로 만든 것이다(`src/app/kiosk/perfumer/date/harin-plan.ts`). 새 작업은 이 도구를 기본으로 쓴다.
