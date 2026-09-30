'use client'

import { useState } from 'react'
import { boothText, type BoothLang } from '@/lib/booth/i18n'

interface FrameOption {
  id: string
  title: string
  image_url: string
  thumbnail_url?: string
  category?: string
}

// 분류 값(내부 키) — 화면에는 사전 frameAll·frameUploaded 로 보인다. 관리자 분류 이름은 데이터 그대로
const ALL = '전체'
const UPLOADED = '직접 등록'

/**
 * 부스 편집 화면의 프레임 고르기 — 기본 56종 + 관리자 업로드분.
 *
 * 분류로 거르고, 썸네일 4열 격자를 고정 높이 안에서 스크롤한다(50종이 넘어도 아래 조정·완성 버튼을
 * 밀어내지 않게). 레트로·기존 두 디자인이 같이 쓰므로 모양만 `variant` 로 갈라 각 화면의 선택 버튼과
 * 맞춘다 — 레트로는 입체 선택 버튼(눌리면 체크), 기존은 둥근 카드(현재 글자색 테두리).
 */
export function FramePicker<T extends FrameOption>({
  frames,
  selected,
  onSelect,
  variant,
  lang,
}: {
  frames: T[]
  selected: T | null
  onSelect: (frame: T | null) => void
  variant: 'retro' | 'classic'
  lang: BoothLang
}) {
  const t = boothText(lang)
  const categoryLabel = (name: string) => (name === UPLOADED ? t.frameUploaded : t.frameCategories[name] ?? name)
  const [category, setCategory] = useState(ALL)
  const categories = Array.from(new Set(frames.map((frame) => frame.category || UPLOADED)))
  // 고른 분류가 관리자 변경으로 사라지면 전체로 돌아간다
  const activeCategory = category === ALL || categories.includes(category) ? category : ALL
  const visible = frames.filter(
    (frame) => activeCategory === ALL || (frame.category || UPLOADED) === activeCategory
  )
  const retro = variant === 'retro'

  const tile = (pressed: boolean) =>
    retro
      ? 'rt-choice bth-frame-btn'
      : `relative aspect-[2/3] min-w-0 overflow-hidden rounded-xl border-2 p-1 transition-colors ${
          pressed
            ? 'border-current ring-2 ring-current'
            : 'border-[color:color-mix(in_srgb,currentColor_22%,transparent)] hover:border-[color:color-mix(in_srgb,currentColor_55%,transparent)]'
        }`

  return (
    <div className={retro ? 'bth-frame-picker' : 'flex flex-col gap-3'}>
      <label className={retro ? 'bth-frame-filter' : 'flex items-center gap-3 text-sm font-semibold'}>
        <span>{t.frameCategory}</span>
        <select
          aria-label={t.frameCategoryAria}
          value={activeCategory}
          onChange={(event) => setCategory(event.target.value)}
          className={
            retro
              ? undefined
              : 'min-h-11 min-w-0 flex-1 rounded-xl border-2 border-[color:color-mix(in_srgb,currentColor_25%,transparent)] bg-white/70 px-3 text-base text-neutral-900'
          }
        >
          <option value={ALL}>
            {t.frameAll} ({frames.length})
          </option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {categoryLabel(name)} ({frames.filter((frame) => (frame.category || UPLOADED) === name).length})
            </option>
          ))}
        </select>
      </label>
      <p className={retro ? 'bth-group-text' : 'text-sm opacity-70'} aria-live="polite">
        {t.frameSelected(selected?.title || t.frameNone)}
      </p>
      <div
        className={retro ? 'bth-frame-grid' : 'grid max-h-[15rem] grid-cols-4 gap-2 overflow-y-auto overscroll-contain p-1'}
        aria-label={t.frameListAria}
      >
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={!selected}
          className={`${tile(!selected)} flex items-center justify-center text-sm font-bold`}
        >
          {t.frameNoneButton}
        </button>
        {visible.map((frame) => {
          const pressed = selected?.id === frame.id
          return (
            <button
              key={frame.id}
              type="button"
              onClick={() => onSelect(frame)}
              aria-pressed={pressed}
              aria-label={frame.title}
              title={frame.title}
              className={tile(pressed)}
            >
              {/* 목록에는 200x300 썸네일 — 1200x1800 원본은 고를 때 합성에서만 받는다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frame.thumbnail_url || frame.image_url}
                alt=""
                loading="lazy"
                decoding="async"
                className={retro ? undefined : 'h-full w-full rounded-lg bg-black/10 object-contain'}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
