// K-POP 아이돌 컨셉 사진 — 포토부스 행사 모드(K-WAVE)에서 손님이 컨셉을 고르고 한 컷 찍으면,
// 찍은 사람의 얼굴은 그대로 두고 헤어·무대 메이크업·의상·조명·배경만 그 컨셉의 아이돌 사진으로 새로 만든다
// (서버 src/lib/booth/idol-generate.ts, 전용 키 OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY).
// 인화물은 BEFORE(실물) / ON STAGE(생성) — 닮음이 조금 어긋나도 '나'가 분명하다. docs/kiosk-modes.md '포토부스'
//
// 컨셉마다 무대 메이크업 룩(stage-makeup.ts)이 짝으로 붙는다 — 촬영 화면 실시간 메이크업 미리보기와,
// AI 를 못 쓸 때(키 없음·실패·동의 안 함·얼굴 0명 또는 4명 이상) 얼굴 인식 메이크업 사진으로 대신할 때 쓴다.

export interface IdolConcept {
  id: string
  name: { ko: string; en: string }
  desc: { ko: string; en: string }
  /** 짝이 되는 무대 메이크업 룩(STAGE_LOOKS id) */
  lookId: string
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
    lookId: 'glitter-eye',
    prompt: {
      scene: "the famous 'ending fairy' close-up at the very end of a K-pop music show performance: a confident, slightly breathless gaze straight into the camera, colorful stage lights and LED-wall bokeh behind, a few pieces of glittering confetti floating in the air, Korean music broadcast TV look",
      groupScene: "the group 'ending fairy' moment at the very end of a K-pop music show performance: all members posing together shoulder to shoulder in one single camera shot, confident slightly breathless gazes into the camera, colorful stage lights and LED-wall bokeh behind, glittering confetti in the air, Korean music broadcast TV look",
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
    lookId: 'glass-skin',
    prompt: {
      scene: 'an official K-pop album jacket / concept photo shot in a high-end studio: clean seamless pastel backdrop, soft diffused key light, calm elegant pose, fashion magazine editorial mood',
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
    lookId: 'cherry-lip',
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
    lookId: 'neon-liner',
    prompt: {
      scene: 'a still frame from a K-pop music video: a neon-lit night set with cyan and magenta neon lights, reflective glossy surfaces, dreamy cinematic atmosphere',
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

/** AI 로 만들 수 있는 인원(컷 안 얼굴 수) — 넘으면 닮음이 크게 떨어져 얼굴 인식 메이크업으로 대신한다 */
export const IDOL_MAX_PEOPLE = 3

/**
 * 생성 프롬프트 — 얼굴(정체성)을 가장 먼저 못 박고, 그 위에 컨셉·스타일·사진 품질, 마지막에 금지 사항.
 * 외국인 손님이 많아 '한국 사람처럼' 바꾸는 일(피부 밝히기·눈매 바꾸기)을 특히 막는다.
 * 실존 연예인 닮게·로고·그룹명·노출 의상은 넣지 않는다(초상권·어린 손님).
 */
export function buildIdolPrompt(concept: IdolConcept, people: number): string {
  const p = concept.prompt
  const many = people > 1
  return [
    `Transform this photo into an official K-pop idol concept photo of the SAME real ${many ? `${people} people` : 'person'} in it.`,
    '',
    'IDENTITY LOCK — the most important rule:',
    `- Keep ${many ? "every person's" : "the person's"} own face exactly: face shape, eye shape and eyelids, eyebrows, nose, lips, jawline, moles and marks, skin tone, ethnicity, age and gender presentation.`,
    '- They must be instantly recognizable as themselves to their friends and family.',
    '- Do NOT swap or replace faces, do not beautify into a different face, do not slim the face, enlarge the eyes, change the eye shape, or lighten/darken the skin. Do not make anyone look younger or older.',
    `- Keep the same number of people (${people}), the same left-to-right order, and a similar pose and expression.${many ? ' Each person keeps their own face — never blend or copy faces between people.' : ''}`,
    ...(many
      ? [
          `- The result MUST show all ${people} people together in ONE scene, standing side by side like an idol group photo — never drop, merge or duplicate anyone. If the input looks like separate photos or tiles, bring everyone into one shared scene.`,
        ]
      : []),
    '',
    // 여럿일 때 '클로즈업' 컨셉이 인원수를 이겨 한 명으로 줄어드는 일이 있어, 단체 컷으로 바꿔 말한다
    `CONCEPT — ${concept.name.en}${many ? ' (group version: all members in one shot)' : ''}: ${many ? p.groupScene ?? p.scene : p.scene}.`,
    '',
    'IDOL STYLING (applied to them, not replacing them):',
    `- Hair: ${p.hair}; keep ${many ? "each person's" : 'their'} exact hair color from the photo (brown stays brown, blond stays blond — do not turn it black) and roughly the same length.`,
    `- Stage makeup: ${p.makeup}.`,
    `- Outfit: ${p.outfit}; modest, age-appropriate and fully covered.`,
    '',
    `PHOTOGRAPHY: ${p.camera}. Professional entertainment-agency quality, sharp focus on the eyes, natural skin texture (not plastic), vertical 2:3 portrait that fills the entire frame edge to edge (no borders, white bars, frames, split panels or collage), ${many ? 'group framing from the chest up with all faces clearly visible' : 'upper-body framing'} with the face${many ? 's' : ''} in the upper-middle of the frame.`,
    '',
    'DO NOT add any text, captions, logos, watermarks, group names or signatures. Do not make anyone resemble a real celebrity or existing idol. Do not change body shape.',
  ].join('\n')
}
