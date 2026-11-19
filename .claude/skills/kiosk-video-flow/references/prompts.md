# 영상 만들기 — 모델 · 프롬프트 · 비용

## 모델(2026-11 오픈라우터 영상 API 기준)

| 모델 | 길이 | 첫 · 끝 프레임 | 단가(목록) | 실제 | 비고 |
|---|---|---|---|---|---|
| `alibaba/wan-3.0` | 2~30초 | 둘 다 | 720p $0.10/초 | 4초 $0.30, 8초 $0.48 · 약 104초 걸림 | **기본.** 이음매 평균 1.3~3.0/255 |
| `alibaba/wan-3.0-prime` | 2~30초 | 둘 다 | 720p $0.14/초 | — | 빠른 판 |
| `bytedance/seedance-2.5` | 4~10초 | 둘 다 | — | 8초 $1.86 · 5분 반 | 동작이 덜 분명했다(수장고 비교) |

- 모델 목록 · 단가 · 길이는 바뀐다 — `wan-clips.mjs --dry` 가 `/api/v1/videos/models` 를 읽어 확인하고 어림 비용을 찍는다.
- `generate_audio: false` 여도 소리 트랙이 붙어 나온다 → `encode.sh` 가 뺀다.
- 키: 프로젝트가 정해진 일은 그 프로젝트 키, 실험은 R&D 키(`OPENROUTER_KEY_RND`). 고객 행사 키 규칙(B2B_ …)은 메모리를 따른다. 키 값은 출력하지 않는다.

## 이음매가 생기는 원리

모든 조각의 **첫 프레임과 끝 프레임에 같은 그림(그 장소 그림)** 을 넣는다. 이동 영상은 첫 프레임 = 떠나는 장소 그림, 끝 프레임 = 도착 장소 그림. 그러면 어느 조각이 끝나도 다음 조각의 첫 프레임과 같은 그림이라 이어 붙인 자리가 보이지 않는다. 장소 그림은 화면 해상도(예 720×1280)보다 큰 원본(1080×1920)을 넣는다.

옛 방식(장소마다 8초 반복 영상 하나)은 가운데에서 큰 동작을 해 첫 프레임과 15~34/255 까지 멀어져 중간에 끊고 나갈 수 없었다 — `check-video.cjs profile` 로 확인할 수 있다. 수장고처럼 내내 첫 프레임 근처(6 이하)인 영상만 아무 데서나 끊을 수 있다.

## 프롬프트 틀

공통 꼬리(spec 의 `look`) — 화풍은 그림과 똑같이, 한 컷, 카메라 고정, 처음과 끝이 같은 자세, 글자 없음:

```
Stylized high-end 3D game render look, exactly the same as the image. One continuous shot, no cuts. The camera stays still. The video starts and ends on exactly the same pose as the image. No text, no labels, no logos, no subtitles.
```

(실사 · 수묵 · 일러스트 등 화풍이 다르면 첫 문장만 그 화풍으로.)

인물 지칭: `The <역할> (same <man|woman>, same face and outfit as the image)` 로 시작해 얼굴 · 옷이 바뀌지 않게.

**인사 동작 `hi-<장소>` (4초, 한 번)** — 그 장소에서 할 일을 보여 주는 동작 하나 + 반드시 '그림과 똑같은 자세로 돌아온다'로 끝맺기:
- `with her right hand raised, waves it a few times in a warm friendly welcome and smiles brightly, then holds the hand raised again exactly as in the image.`
- `lifts the instant camera up to her eye as if taking a photo of the viewer, then lowers it back to her chest with a cheerful smile, exactly as in the image.`
- `runs her fingertips along the bottles on the rack, pulls one bottle halfway out to read its label, slides it back in, and returns her hand to exactly the position in the image.`

**대기 `idle-<장소>-1|2` (4초, 두 가지)** — 아주 작은 움직임만. 한 가지만 돌리면 4초마다 같은 움직임이 보인다:
- 1: `stays in her pose and looks at the viewer with a soft smile, breathes calmly, blinks naturally, and tilts her head very slightly. Very subtle, gentle motion only.`
- 2: `keeps her pose, glances briefly to the side as if noticing something, then looks back at the viewer with a small friendly nod. Gentle, small motion only.`

각 프롬프트 뒤에 장소 배경 움직임 한 문장(바람 · 촛불 · 구름 · 반짝임) — 인물이 가만있어도 화면이 살아 있다.

**이동 `move-<도착>` (8초)** — 인물이 사라지지 않게 걸어 나가고 걸어 들어온다(사용자 지시 2026-11-17):

```
IMPORTANT: the <역할> never fades, dissolves, teleports or pops in or out — she only leaves and enters by physically walking on foot across the edge of the frame. She is the same woman in the same outfit throughout.
At the start she smiles at the viewer, turns and walks on foot out of the frame past the right edge. Then the first-person camera walks forward quickly <길 묘사>, with a slight walking bob. At the end, she walks on foot into the frame from the left edge, <도착 자세의 소품>, and stops in her place facing the viewer <도착 그림의 표정 · 자세>.
```

만든 뒤 0.5초 간격 프레임(`sheet.sh`)으로 out(다 나간 초) · in(들어오기 시작한 초)을 재서 재생기 MOVE 표에 넣는다.

## 인물이 없는 프로그램

제품 · 공간만 나오는 화면도 같은 원리다: 장소 = 화면 상태(예: 병이 닫힘 / 열림 / 잔에 따름), 인사 = 그 상태로 들어선 뒤 한 번 보여 주는 움직임(병이 반 바퀴 돎), 대기 = 아주 작은 움직임(빛 반사가 흐름 · 김이 오름), 이동 = 한 상태에서 다음 상태로 가는 영상(첫 프레임 = 앞 상태 그림, 끝 = 다음 상태 그림).

## 다시 만들기

이음매가 5 이상이거나 얼굴 · 소품이 바뀌었으면 그 조각만 지우고 `--only 이름` 으로 다시 만든다(하나 $0.30 안팎). 프롬프트에서 동작을 줄이거나('small', 'gentle') 끝 자세 문장을 더 구체적으로.
