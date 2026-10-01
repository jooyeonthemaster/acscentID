// K-POP 아이돌 컨셉 사진 — 포토부스 행사 모드(K-WAVE)에서 손님이 컨셉을 고르고 한 컷 찍으면,
// 찍은 사람의 얼굴은 그대로 두고 헤어·무대 메이크업·의상·조명·배경만 그 컨셉의 아이돌 사진으로 새로 만든다
// (서버 src/lib/booth/idol-generate.ts, 전용 키 OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY).
// 인화물은 BEFORE(실물) / ON STAGE(생성) — 닮음이 조금 어긋나도 '나'가 분명하다. docs/kiosk-modes.md '포토부스'
//
// AI 를 못 쓸 때(키 없음·실패·얼굴 0명 또는 4명 이상)는 찍은 원본을 그대로 인화 디자인에 넣는다(메이크업 필터는 없앴다).

export interface IdolConcept {
  id: string
  name: { ko: string; en: string }
  desc: { ko: string; en: string }
  /** 생성 프롬프트 조각(영어) — 서버가 id 로 찾아 쓴다(화면에서 온 문장은 쓰지 않는다) */
  prompt: {
    scene: string
    /** 여럿이 찍었을 때의 장면(한 사람 클로즈업이 본질인 컨셉은 단체 장면으로 바꿔 쓴다 — 없으면 scene) */
    groupScene?: string
    hair: string
    makeup: string
    outfit: string
    camera: string
  }
}

export const IDOL_CONCEPTS: IdolConcept[] = [
  {
    id: 'ending-fairy',
    name: { ko: '음방 엔딩요정', en: 'Ending Fairy' },
    desc: { ko: '음악방송 무대가 끝난 순간, 카메라를 바라보는 엔딩 클로즈업', en: 'The music-show ending close-up, right after the stage' },
    prompt: {
      scene: "the famous 'ending fairy' close-up at the very end of a K-pop music show performance: a confident, slightly breathless gaze straight into the camera, colorful stage lights and abstract LED-wall bokeh behind, a few pieces of glittering confetti floating in the air, Korean music broadcast TV look",
      groupScene: "the group 'ending fairy' moment at the very end of a K-pop music show performance: all members posing together shoulder to shoulder in one single camera shot, confident slightly breathless gazes into the camera, colorful stage lights and abstract LED-wall bokeh behind, glittering confetti in the air, Korean music broadcast TV look",
      hair: 'freshly styled stage hair with a little natural movement',
      makeup: 'shimmering pearl glitter eyeshadow in lilac and soft gold, fine eyeliner, dewy radiant skin, soft rosy-pink lip',
      outfit: 'sparkly embellished stage costume with crystals',
      camera: 'broadcast camera close-up with a telephoto lens, colored rim lights, crisp and vivid',
    },
  },
  {
    id: 'album-jacket',
    name: { ko: '앨범 재킷', en: 'Album Jacket' },
    desc: { ko: '스튜디오에서 찍은 공식 컨셉 포토, 맑고 고급스럽게', en: 'An official concept photo from a high-end studio' },
    prompt: {
      scene: 'an official K-pop album jacket / concept photo shot in a high-end studio: clean seamless pastel backdrop, soft diffused key light, elegant pose that keeps their natural expression (a smile stays a smile), fashion magazine editorial mood',
      hair: 'sleek, polished editorial hair styling',
      makeup: 'luminous glass-skin base with highlighter on the cheekbones and nose bridge, soft brown eyeshadow, glossy coral-pink lip',
      outfit: 'chic designer concept outfit in soft pastel tones',
      camera: '85mm portrait lens, medium-format studio photography, soft and clean',
    },
  },
  {
    id: 'stage-fancam',
    name: { ko: '무대 직캠', en: 'Stage Fancam' },
    desc: { ko: '콘서트 무대 위 카리스마, 조명과 응원봉 사이에서', en: 'Charisma on a concert stage, among lights and lightsticks' },
    prompt: {
      scene: 'a fancam still from a live K-pop concert: a big stage with dramatic backlights, haze and light beams, powerful confident performance energy, audience lightsticks glowing as bokeh in the dark',
      hair: 'voluminous performance hair styling',
      makeup: 'sharp black winged eyeliner, smoky warm-brown eyeshadow, bold cherry-red lip',
      outfit: 'charismatic black-and-red performance outfit with metallic details',
      camera: 'telephoto concert photography, high contrast, cinematic stage lighting',
    },
  },
  {
    id: 'mv-still',
    name: { ko: '뮤비 스틸', en: 'MV Still' },
    desc: { ko: '네온 불빛 가득한 뮤직비디오의 한 장면처럼', en: 'Like a frame from a neon-lit music video' },
    prompt: {
      scene: 'a still frame from a K-pop music video: a neon-lit night set with abstract cyan and magenta neon light shapes (tubes and glows, no lettering), reflective glossy surfaces, dreamy cinematic atmosphere',
      hair: 'trendy textured styling with a slight wet-look finish',
      makeup: 'graphic neon-cyan eyeliner with a magenta lower line, violet eyeshadow, berry lip',
      outfit: 'Y2K-inspired trendy stage outfit',
      camera: 'anamorphic cinematic lens, subtle film grain, music-video color grading',
    },
  },
]

export const DEFAULT_IDOL_CONCEPT = IDOL_CONCEPTS[0]

export function findIdolConcept(id: string | null | undefined): IdolConcept | null {
  return IDOL_CONCEPTS.find((c) => c.id === id) ?? null
}

/** AI 로 만들 수 있는 인원(컷 안 얼굴 수) — 넘으면 닮음이 크게 떨어져 찍은 원본으로 인화한다 */
export const IDOL_MAX_PEOPLE = 3

/**
 * 생성 프롬프트 — '새 사진을 만들어라'가 아니라 '이 사진을 고쳐라'(편집)로 말한다. 새로 만들라고 하면 모델이 얼굴까지 다시 그려
 * 현장에서 '완전히 다른 사람'이 됐다. 얼굴(정체성)을 가장 먼저 못 박고, 바꿀 것(조명·배경·의상·메이크업)만 좁게 허락한다.
 * 헤어스타일을 바꾸면 알아보기 힘들어져 머리는 본인 그대로 손질만 한다.
 * faceRefs: 본 사진 뒤에 붙는 얼굴 클로즈업 수(부스가 사람 순서대로 자른 것, 0 이면 본 사진만).
 * 외국인 손님이 많아 '한국 사람처럼' 바꾸는 일(피부 밝히기·눈매 바꾸기)을 특히 막는다.
 * 실존 연예인 닮게·로고·그룹명·노출 의상은 넣지 않는다(초상권·어린 손님).
 */
export function buildIdolPrompt(concept: IdolConcept, people: number, faceRefs = 0): string {
  const p = concept.prompt
  const many = people > 1
  const who = many ? `${people} people` : 'person'
  return [
    `EDIT the first image (IMAGE 1) into an official K-pop idol concept photo of the SAME real ${who}. This is a photo edit of real people, not a new portrait: their faces must come from IMAGE 1.`,
    ...(faceRefs
      ? [
          `The next ${faceRefs === 1 ? 'image is a close-up' : `${faceRefs} images are close-ups`} of ${faceRefs === 1 && !many ? "this person's face" : "each person's face, in left-to-right order"} from the same photo — use ${faceRefs === 1 ? 'it' : 'them'} only as the identity reference for exact facial details. Do not place ${faceRefs === 1 ? 'it' : 'them'} in the result.`,
        ]
      : []),
    '',
    'IDENTITY LOCK — the most important rule, above the concept:',
    `- Preserve ${many ? "every person's" : "the person's"} real face exactly as in the photo: face shape and width, eye shape, eyelids and eye size, eyebrow shape, nose, lips and mouth width, jawline and chin, cheeks, moles, freckles and marks, skin tone, ethnicity, age and gender presentation.`,
    '- Keep the same head angle, gaze direction and facial expression, and the face at a similar size in the frame.',
    '- They must be instantly recognizable as themselves to their friends and family — the result should look like a professional photographer shot THIS person, not a lookalike.',
    '- Do NOT regenerate, swap, idealize or beautify the face into a different face. Do not enlarge the eyes, add double eyelids, change the nose or lips, smooth away features, or lighten/darken the skin. Do not make anyone look younger or older.',
    // 현장 피드백(2026-10-01): 이목구비는 잘 닮지만 얼굴이 통통해 보인다 — 윤곽 전체를 바꾸게 하면 다른 사람이 됐다.
    // 턱선만 살짝 다듬게 하는 한 줄만 둔다
    '- One small refinement only: make the jawline slightly slimmer and more defined (a gentle V-line, as in idol photos). Everything else about the face stays exactly the same.',
    '- If there is any conflict between the concept and the likeness, keep the likeness.',
    `- Keep the same number of people (${people}), the same left-to-right order, and a similar pose.${many ? ' Each person keeps their own face — never blend or copy faces between people.' : ''}`,
    ...(many
      ? [
          `- The result MUST show all ${people} people together in ONE scene, standing side by side like an idol group photo — never drop, merge or duplicate anyone. If the input looks like separate photos or tiles, bring everyone into one shared scene.`,
        ]
      : []),
    '',
    'WHAT YOU MAY CHANGE: background, lighting, outfit, hair finish and makeup only.',
    `CONCEPT — ${concept.name.en}${many ? ' (group version: all members in one shot)' : ''}: ${many ? p.groupScene ?? p.scene : p.scene}.`,
    '',
    'IDOL STYLING (applied on top of them, never reshaping them):',
    `- Hair: keep ${many ? "each person's" : 'their'} own hairstyle — same cut, length, parting, bangs and exact hair color (brown stays brown, blond stays blond, never turned black) — only neatly styled with ${p.hair}.`,
    `- Stage makeup: ${p.makeup}. Makeup is color on the skin only; it must not change the shape of the eyes, brows, nose or lips.`,
    `- Outfit: ${p.outfit}; modest, age-appropriate and fully covered.`,
    '',
    `PHOTOGRAPHY: ${p.camera}. Professional entertainment-agency quality, sharp focus on the eyes, natural skin texture with real pores (not plastic or airbrushed), vertical 2:3 portrait that fills the entire frame edge to edge (no borders, white bars, frames, split panels or collage), ${many ? 'group framing from the chest up with all faces clearly visible' : 'upper-body framing'} with the face${many ? 's' : ''} in the upper-middle of the frame.`,
    '',
    'DO NOT add any text, captions, logos, watermarks, group names or signatures, and no readable letters, numbers or symbols anywhere in the scene — including neon signs, LED screens, banners and clothing (keep any signs abstract and blurred). Do not make anyone resemble a real celebrity or existing idol. Do not change body shape.',
  ].join('\n')
}
