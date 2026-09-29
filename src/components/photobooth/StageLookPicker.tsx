'use client'

// 편집 화면 '무대 메이크업 룩' 고르기 — 포토부스 행사 모드(K-WAVE)에서만 보인다(src/lib/booth/modes.ts stageMakeup).
// 룩을 고르면 사진 색 보정·스티커·인화물 하단 '오늘의 무대 메이크업'이 바로 미리보기에 입혀진다(src/lib/booth/stage-makeup.ts).
// 외국인 손님이 많아 한국어·영어를 함께 쓴다. 레트로·맥은 입체 선택 버튼, 기존 디자인은 둥근 카드.
// size='home' 은 행사 모드 첫 화면(촬영 방식 타일 대신 룩부터 고른다) — 3열로 크게.

import { STAGE_LOOKS, findStageLook, type StageLook } from '@/lib/booth/stage-makeup'

export function StageLookPicker({ value, onChange, variant, size }: {
  value: string | null
  onChange: (id: string | null) => void
  variant: 'retro' | 'classic'
  size?: 'home'
}) {
  const retro = variant === 'retro'
  const home = size === 'home'
  const current = findStageLook(value)
  const options = [{ id: null as string | null, name: { ko: '원본', en: 'Original' }, swatch: ['#ffffff', '#d9dde6'] as [string, string] }, ...STAGE_LOOKS]
  return (
    <div className={retro ? `bth-look-picker${home ? ' bth-look-picker--home' : ''}` : `flex flex-col gap-3${home ? ' w-full text-center' : ''}`}>
      <div className={retro ? 'bth-look-grid' : home ? 'grid grid-cols-2 gap-3 md:grid-cols-3 text-left' : 'grid grid-cols-2 gap-2'} role="radiogroup" aria-label="무대 메이크업 룩 · Stage makeup look">
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
                : `flex ${home ? 'min-h-24 gap-3 rounded-2xl px-4 py-3' : 'min-h-[4.5rem] gap-2 rounded-xl px-2.5 py-2'} items-center border-2 text-left transition-colors ${on ? 'border-current ring-2 ring-current' : 'border-[color:color-mix(in_srgb,currentColor_22%,transparent)]'}`}
              data-on={on ? "true" : "false"}
            >
              <span className={retro ? 'bth-look-swatch' : `${home ? 'h-12 w-12' : 'h-9 w-9'} shrink-0 rounded-full border border-black/10 shadow-inner`}
                style={{ background: `linear-gradient(135deg, ${look.swatch[0]}, ${look.swatch[1]})` }} aria-hidden="true" />
              <span className={retro ? 'bth-look-name' : 'flex min-w-0 flex-col leading-tight'}>
                <b className={retro ? undefined : `line-clamp-2 break-keep font-bold ${home ? 'text-lg' : 'text-sm'}`}>{look.name.ko}</b>
                <em className={retro ? undefined : `truncate not-italic opacity-70 ${home ? 'text-sm' : 'text-[11px]'}`}>{look.name.en}</em>
              </span>
            </button>
          )
        })}
      </div>
      <p className={retro ? 'bth-group-text bth-look-desc' : `leading-snug opacity-75 ${home ? 'text-lg' : 'text-sm'}`} aria-live="polite">
        {current ? <>{current.desc.ko}<br /><span>{current.desc.en}</span></> : <>룩을 고르면 사진 색·스티커·인화물 문구가 바뀌어요<br /><span>Pick a look to style your photo and print</span></>}
      </p>
    </div>
  )
}

/** 촬영 화면 실시간 미리보기 위에 룩 색을 살짝 덧입힌다(인화물 soft-light 틴트와 같은 색) — 카메라 칸 안에 absolute 로 둔다 */
export function StageLookLiveTint({ look }: { look: StageLook | null }) {
  if (!look) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ background: look.grade.tint, mixBlendMode: 'soft-light', opacity: look.grade.tintAlpha }}
    />
  )
}
