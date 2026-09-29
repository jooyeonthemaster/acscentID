'use client'

// 편집 화면 '무대 메이크업 룩' 고르기 — 포토부스 행사 모드(K-WAVE)에서만 보인다(src/lib/booth/modes.ts stageMakeup).
// 룩을 고르면 사진 색 보정·스티커·인화물 하단 '오늘의 무대 메이크업'이 바로 미리보기에 입혀진다(src/lib/booth/stage-makeup.ts).
// 외국인 손님이 많아 한국어·영어를 함께 쓴다. 레트로·맥은 입체 선택 버튼, 기존 디자인은 둥근 카드.

import { STAGE_LOOKS, findStageLook } from '@/lib/booth/stage-makeup'

export function StageLookPicker({ value, onChange, variant }: {
  value: string | null
  onChange: (id: string | null) => void
  variant: 'retro' | 'classic'
}) {
  const retro = variant === 'retro'
  const current = findStageLook(value)
  const options = [{ id: null as string | null, name: { ko: '원본', en: 'Original' }, swatch: ['#ffffff', '#d9dde6'] as [string, string] }, ...STAGE_LOOKS]
  return (
    <div className={retro ? 'bth-look-picker' : 'flex flex-col gap-3'}>
      <div className={retro ? 'bth-look-grid' : 'grid grid-cols-2 gap-2'} role="radiogroup" aria-label="무대 메이크업 룩 · Stage makeup look">
        {options.map((look) => {
          const on = (value ?? null) === look.id
          return (
            <button
              key={look.id ?? 'original'}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(look.id)}
              className={retro
                ? 'rt-choice bth-look-btn'
                : `flex min-h-[4.5rem] items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-left transition-colors ${on ? 'border-current ring-2 ring-current' : 'border-[color:color-mix(in_srgb,currentColor_22%,transparent)]'}`}
              data-on={on ? "true" : "false"}
            >
              <span className={retro ? 'bth-look-swatch' : 'h-9 w-9 shrink-0 rounded-full border border-black/10 shadow-inner'}
                style={{ background: `linear-gradient(135deg, ${look.swatch[0]}, ${look.swatch[1]})` }} aria-hidden="true" />
              <span className={retro ? 'bth-look-name' : 'flex min-w-0 flex-col leading-tight'}>
                <b className={retro ? undefined : 'line-clamp-2 break-keep text-sm font-bold'}>{look.name.ko}</b>
                <em className={retro ? undefined : 'truncate text-[11px] not-italic opacity-70'}>{look.name.en}</em>
              </span>
            </button>
          )
        })}
      </div>
      <p className={retro ? 'bth-group-text bth-look-desc' : 'text-sm leading-snug opacity-75'} aria-live="polite">
        {current ? <>{current.desc.ko}<br /><span>{current.desc.en}</span></> : <>룩을 고르면 사진 색·스티커·인화물 문구가 바뀌어요<br /><span>Pick a look to style your photo and print</span></>}
      </p>
    </div>
  )
}
