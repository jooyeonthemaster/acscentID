# 재생기 — 조각 영상을 끊김 없이 잇는 React 구조

실제로 돌아가는 본보기: `src/app/kiosk/experience/expansion/SipMotion.tsx`(키오스크 SIP! 영상판, 2026-11-18). 새 프로그램은 이 파일을 복사해 표(조각 이름 · 이동 · 차례)만 바꾸는 것이 가장 빠르다. 아래는 그 구조와 왜 그렇게 했는지.

## 목차
1. 겹 세 개 — 앞 · 지금 · 다음
2. 다음 조각 고르기(after)
3. Film — 영상 한 겹
4. 도착 알리기(onSettle)와 화면 글자
5. 함정(실제로 밟은 것)

## 1. 겹 세 개 — 앞 · 지금 · 다음

```tsx
const [st, setSt] = useState({ prev: null as Clip | null, cur: hi(scene, 0), pick: roll(), on: false })
const next = after(st.cur, scene, st.pick)          // 렌더마다 다시 고른다 — 버튼을 누르면 대기 → 이동으로 바뀐다

<div className="world">
  <img className="plate" src={그 장소 그림} />                                     // 영상이 안 될 때만 보인다(첫 · 끝 프레임과 같은 그림)
  {prev && <Film key={key(prev)} src={prev.src} play move={prev.move} />}         // 지금 조각이 그려질 때까지 마지막 프레임을 붙든다
  <Film key={key(cur)} src={cur.src} play move={cur.move} finish={!cur.move && cur.at !== scene}
        onShown={() => shown(cur.id)} onEnd={() => ended(cur.id, next)} />
  <Film key={key(next)} src={next.src} play={false} />                            // 미리 받아 첫 프레임에 멈춰 둔다(보이지 않음)
</div>
```

- `ended(id, n)`: 지금 조각이 끝나면 `{ prev: cur, cur: n, pick: roll(), on: false }`. **다음 조각으로 미리 만들어 둔 그 겹(같은 key)** 이 그대로 '지금'이 되어 재생만 시작한다 — 새로 만들지 않으니 받는 시간 · 빈 화면이 없다.
- `shown(id)`: 지금 조각의 첫 프레임이 실제로 그려지면 앞 조각을 치운다(`prev: null, on: true`).
- 둘 다 `x.cur.id === id` 일 때만 바꾼다 — 영상 끝(ended) · 안전 타이머가 겹쳐도 한 번만.
- key = `${src}#${id}`, id 는 틀어 온 차례(cur.id + 1 = 다음). 같은 대기 조각을 두 번 연달아 틀어도 key 가 다르다.
- 겹 순서는 늘 [앞, 지금, 다음] 이라 넘길 때 DOM 이 움직이지 않는다(앞이 빠지고 끝에 새 다음이 붙을 뿐). 영상 요소를 DOM 에서 옮기면 멈출 수 있다.
- 나중 겹이 위에 그려진다. 다음 겹은 투명(`opacity: 0`)이라 지금 겹을 가리지 않는다.

## 2. 다음 조각 고르기(after)

```ts
function after(cur: Clip, target: Scene, pick: number): Clip {
  const id = cur.id + 1
  if (cur.at !== target) {                                         // 가야 할 곳이 바뀌었다
    const m = MOVE[target]
    return m && 차례(target) === 차례(cur.at) + 1 ? { src: m.src, at: target, move: m, id } : hi(target, id)   // 바로 다음 장소가 아니면 이음매 없는 길이 없다 — 인사로 바로(컷)
  }
  return cur.move ? hi(cur.at, id) : idle(cur.at, pick, id)        // 막 도착했으면 인사, 아니면 대기(무작위)
}
```

- `at` = 이 조각이 **끝나는** 장소(이동 영상이면 도착 장소). 이음매 규칙(끝 프레임 = 그 장소 그림)과 같은 뜻이라 판단이 단순하다.
- 이동 중에 목적지가 또 바뀌면(예: 저장고로 가는 동안 AI 가 끝나 시음실로) 이동 영상 끝 = 저장고 그림 = 다음 이동 영상 첫 프레임이라 인사 없이 바로 이어 간다.
- 연출이 갈라지는 프로그램(되돌아가기 · 건너뛰기)이면 MOVE 를 `떠나는>도착` 짝으로 두고 그 짝이 없을 때만 컷.

## 3. Film — 영상 한 겹

- `play` 가 참이 되면 `v.play()`. 첫 프레임이 화면에 그려지면(`requestVideoFrameCallback`, 없으면 `playing` 뒤 두 rAF) `data-on` 을 켜 보이게 하고(CSS `opacity .15s`), 겹쳐 오는 시간(FADE_MS + 40ms) 뒤 `onShown`. 앞뒤 프레임은 같은 그림이라 0.15초 겹침은 압축 차이만 감춘다.
- `loop` 속성은 쓰지 않는다 — 조각은 한 번씩 틀고 `ended` 에서 다음으로 넘긴다(반복도 '같은 조각을 다음으로' 고르는 것).
- `finish`(가야 할 곳이 바뀐 동안의 장소 조각): **누른 순간** 남은 몫으로 빠르기를 한 번 정하고 끝까지 유지 — `min(2, max(1, 남은초 / 1.8))`, 0.2초쯤에 걸쳐 올린다. 4초 조각이면 길어도 2초.
- `move`: rAF 로 `currentTime` 을 보며 걷는 앞뒤(WALK_RATE 1.5)와 길(FAST_RATE 3.5) 빠르기를 바꾸고, 길 구간이면 `onFast(true)` → 속도선 켜기. out · in 초는 이동 영상을 0.5초 간격 프레임으로 보고 잰다(인물이 화면 밖으로 다 나간 초 · 들어오기 시작하는 초).
- `onError` 도 `onEnd` 로 — 영상이 깨지면 다음으로 넘어가고 아래 그림이 보인다.
- 안전 타이머(지금 조각마다): 장소 조각 4초 + 3초, 이동 영상은 계산 길이 + 3초. 영상이 멈췄을 때만 쓰인다 — **화면 넘김을 타이머로 하지 않는다.**
- 콜백은 ref 로(`cb.current = { onShown, onEnd, onFast }` 를 effect 에서) — 효과가 콜백 바뀜으로 다시 돌지 않게.

## 4. 도착 알리기(onSettle)와 화면 글자

- `useEffect(() => { if (on && !cur.move) onSettle(cur.at) }, [on, cur, onSettle])` — 도착 장소 인사 조각이 그려진 순간이 '도착'.
- 바깥 화면: `const [settled, setSettled] = useState(scene); const moving = settled !== scene`. 움직이는 동안(마저 틀기 + 이동)은 대사 · 장소 제목 · 결과 카드를 숨긴다.
- 대사판은 툭 사라지지 않게 — 떠나기 직전 단계를 기억해(`if (!moving && said !== step) setSaid(step)`) 그 대사를 `data-leave`(0.4초 가라앉으며 사라짐)로 한 번 더 그린다.
- 장소 도착에 걸린 타이머(예: 결과 카드 2.6초 뒤 결과 화면)는 `moving` 이 풀린 뒤부터 잰다 — 이동 시간이 버튼 누른 때에 따라 달라지기 때문.

## 5. 함정(실제로 밟은 것)

| 증상 | 까닭 | 고친 법 |
|---|---|---|
| 버튼 누르면 컷 | 반복 영상 아무 데서나 이동 영상을 덮음 | 지금 조각을 끝까지(빠르게) 틀고 ended 에서 넘김 |
| 이동 끝에 깜빡/튐 | 이동이 끝나는 때를 계산 시간(setTimeout)으로 정함 — 영상이 늦으면 중간에 잘림 | ended 로 넘김, 타이머는 안전장치만 |
| 도착 순간 빈 화면 | 도착 장소 영상을 그때 새로 만들어 받음 | 다음 조각을 미리 만들어 두고 첫 프레임이 그려진 뒤에 보임 |
| 앞 조각이 처음부터 다시 돎 | 끝난 영상에 `play()` 를 또 부름(효과 의존값이 바뀌어 다시 돎) | `if (v.ended) return`, 앞 겹에도 같은 props(move) |
| 넘길 때 화면이 살짝 커졌다 작아짐 | 겹마다 다른 CSS 카메라 흔들림 · 확대 | 영상판에는 카메라 효과를 넣지 않는다(영상 자체가 움직인다) |
| 기다림이 2초 넘음 | 남은 몫에 맞춰 빠르기를 계속 바꿔 끝에서 다시 느려짐 | 누른 순간 한 번 정한 빠르기로 끝까지 |
| "two children with the same key" | 같은 조각 안 형제 key 가 장소 이름 · 단계 이름으로 겹침(cellar) | key 앞에 종류를 붙인다(`a-${scene}`) |
| 이음매가 보임(차이 5 이상) | 끝 프레임을 다른 그림으로 줬거나 모델이 끝 자세를 못 맞춤 | 그 조각만 다시 만들기 — references/prompts.md |
| 시험 중 페이지가 새로 고쳐짐(NAV 여러 번) | 개발 서버가 파일 바뀜(다른 세션 작업 포함)을 보고 다시 그림 | 조용할 때 다시 돌린다. 키오스크 `?mode=` 미리보기는 스스로 새로 고치지 않는다 |
