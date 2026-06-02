import { serializeProductPageContentConfig } from './page-content'

interface ProductDetailTemplateInput {
  slug: string
  name: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/\n/g, '&#10;')
}

function linesToHtml(value: string) {
  return escapeHtml(value)
    .split('\n')
    .map((line) => line || '&nbsp;')
    .join('<br />')
}

function jsonAttr(value: unknown) {
  return escapeAttr(JSON.stringify(value))
}

function blockId(slug: string, suffix: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'product'
  return `template-${safeSlug}-${suffix}`
}

function heroBlock(id: string, title: string, subtitle: string) {
  return `
    <section data-ac-block="hero" data-ac-block-id="${id}" data-title="${escapeAttr(title)}" data-subtitle="${escapeAttr(subtitle)}" data-align="center" data-bg="#FFF7ED" data-accent="#FACC15" style="margin: 0 0 28px; padding: 34px 24px; border-radius: 22px; background: #FFF7ED; text-align: center; border: 2px solid #111827; box-shadow: 4px 4px 0 #111827;">
      <div style="width: 44px; height: 6px; border-radius: 999px; background: #FACC15; margin: 0 auto 16px;"></div>
      <h2 style="margin: 0 0 10px; font-size: 28px; line-height: 1.2; font-weight: 900; color: #111827;">${escapeHtml(title)}</h2>
      <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569;">${linesToHtml(subtitle)}</p>
    </section>
  `
}

function headingBlock(id: string, text: string) {
  return `
    <section data-ac-block="heading" data-ac-block-id="${id}" data-text="${escapeAttr(text)}" data-level="h2" data-align="left" data-color="#111827" style="margin: 28px 0 12px; text-align: left;">
      <h2 style="margin: 0; font-size: 24px; line-height: 1.28; font-weight: 900; color: #111827;">${escapeHtml(text)}</h2>
    </section>
  `
}

function textBlock(id: string, text: string) {
  return `
    <section data-ac-block="text" data-ac-block-id="${id}" data-text="${escapeAttr(text)}" data-align="left" style="margin: 14px 0; text-align: left;">
      <p style="margin: 0; font-size: 15px; line-height: 1.82; color: #334155;">${linesToHtml(text)}</p>
    </section>
  `
}

function imageBlock(id: string, caption: string) {
  return `
    <figure data-ac-block="image" data-ac-block-id="${id}" data-src="" data-alt="" data-caption="${escapeAttr(caption)}" data-fit="cover" data-radius="16" style="margin: 22px 0;">
      <div style="height: 220px; display: flex; align-items: center; justify-content: center; border-radius: 16px; border: 2px dashed #cbd5e1; color: #94a3b8; font-weight: 800;">이미지를 추가하세요</div>
      <figcaption style="margin-top: 8px; font-size: 12px; line-height: 1.5; text-align: center; color: #64748b;">${escapeHtml(caption)}</figcaption>
    </figure>
  `
}

function featuresBlock(id: string, title: string, items: string[], accentColor = '#8B5CF6') {
  return `
    <section data-ac-block="features" data-ac-block-id="${id}" data-title="${escapeAttr(title)}" data-items="${jsonAttr(items)}" data-accent="${escapeAttr(accentColor)}" style="margin: 22px 0; padding: 18px; border-radius: 18px; background: #ffffff; border: 2px solid #111827; box-shadow: 3px 3px 0 #111827;">
      <h3 style="margin: 0 0 12px; font-size: 17px; font-weight: 900; color: #111827;">${escapeHtml(title)}</h3>
      <ul style="margin: 0; padding: 0; list-style: none;">
        ${items.map((item) => `<li style="display: flex; gap: 10px; align-items: flex-start; margin: 10px 0; font-size: 14px; line-height: 1.62; color: #334155;"><span style="margin-top: 7px; width: 8px; height: 8px; border-radius: 999px; background: ${escapeAttr(accentColor)}; flex: 0 0 auto;"></span><span>${escapeHtml(item)}</span></li>`).join('')}
      </ul>
    </section>
  `
}

function quoteBlock(id: string, text: string) {
  return `
    <section data-ac-block="quote" data-ac-block-id="${id}" data-text="${escapeAttr(text)}" data-author="" style="margin: 24px 0; padding: 20px; border-left: 5px solid #111827; background: #f8fafc; border-radius: 0 18px 18px 0;">
      <p style="margin: 0; font-size: 18px; line-height: 1.65; font-weight: 800; color: #111827;">${linesToHtml(text)}</p>
    </section>
  `
}

function buttonBlock(id: string, label: string) {
  return `
    <section data-ac-block="button" data-ac-block-id="${id}" data-label="${escapeAttr(label)}" data-href="#" data-align="center" data-bg="#111827" data-color="#FFFFFF" style="margin: 24px 0; text-align: center;">
      <a href="#" style="display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 22px; border-radius: 14px; background: #111827; color: #FFFFFF; border: 2px solid #111827; box-shadow: 3px 3px 0 #111827; font-size: 15px; font-weight: 900; text-decoration: none;">${escapeHtml(label)}</a>
    </section>
  `
}

function dividerBlock(id: string, label: string) {
  return `
    <section data-ac-block="divider" data-ac-block-id="${id}" data-label="${escapeAttr(label)}" style="margin: 28px 0; display: flex; align-items: center; gap: 12px;">
      <div style="height: 2px; flex: 1; background: #111827;"></div>
      <span style="font-size: 12px; font-weight: 900; color: #64748b;">${escapeHtml(label)}</span>
      <div style="height: 2px; flex: 1; background: #111827;"></div>
    </section>
  `
}

export function buildDefaultProductDetailTemplate({ slug, name }: ProductDetailTemplateInput) {
  const productName = name.trim() || '새 상품'

  return `${serializeProductPageContentConfig({})}
  <div data-ac-detail-builder="1" style="position: relative; width: 100%; max-width: 455px; margin: 0 auto;">
    ${heroBlock(
      blockId(slug, 'hero'),
      `${productName}의 핵심 매력을 소개해주세요`,
      '고객이 첫 화면에서 바로 이해할 수 있도록 상품의 한 줄 설명과 주요 가치를 적어주세요.',
    )}
    ${headingBlock(blockId(slug, 'intro-heading'), '이 상품은 어떤 상품인가요?')}
    ${textBlock(
      blockId(slug, 'intro-text'),
      '상품의 콘셉트, 추천 대상, 사용 장면을 설명해주세요.\n관리자는 이 문장을 클릭해서 실제 판매 문구로 바꿀 수 있습니다.',
    )}
    ${imageBlock(blockId(slug, 'main-image'), '대표 이미지, 구성품 이미지, 사용 예시 등을 넣어주세요.')}
    ${featuresBlock(blockId(slug, 'features'), '구성 및 특징', [
      '가장 중요한 상품 특징을 입력하세요.',
      '구성품, 용량, 옵션 등 구매 전에 알아야 할 정보를 입력하세요.',
      '배송, 제작 기간, 이용 방법처럼 고객 문의가 많은 내용을 입력하세요.',
    ])}
    ${dividerBlock(blockId(slug, 'process-divider'), 'PROCESS')}
    ${headingBlock(blockId(slug, 'process-heading'), '어떻게 진행되나요?')}
    ${featuresBlock(blockId(slug, 'process'), '진행 방식', [
      '1단계: 고객이 선택하거나 입력해야 하는 내용을 적어주세요.',
      '2단계: 제작, 분석, 준비 등 내부 진행 과정을 적어주세요.',
      '3단계: 결과 확인, 배송, 수령 등 마지막 단계를 적어주세요.',
    ], '#22D3EE')}
    ${quoteBlock(blockId(slug, 'message'), '고객이 기억했으면 하는 핵심 문장을 입력하세요.')}
    ${buttonBlock(blockId(slug, 'cta'), '버튼 문구를 입력하세요')}
  </div>`
}
