/**
 * 격언·인용문 줄바꿈 정책 (분석 대기 오버레이 4종 공통).
 *
 * 393px 뷰포트 · 실제 웹폰트 기준으로 5개 로케일 245개 격언을 전수 계측해 정한 규칙이다.
 *
 * 공통 `text-balance`
 *   줄 길이를 고르게 나눠 "…타고난 기질의 / 지도입니다." 처럼 마지막 줄에 한 어절만
 *   남는 orphan을 없앤다. 계측상 67건 → 0건.
 *
 * ko `break-keep` (word-break: keep-all)
 *   한국어 어절 중간 끊김 방지. 일본어·중국어 격언은 공백이 하나도 없어(최대 35자 연속)
 *   keep-all을 걸면 줄바꿈 지점 자체가 사라져 문장이 가로로 넘친다. 그래서 ko 전용이다.
 *
 * ja·zh `line-break: strict`
 *   기본값(auto)은 장음부(ー)·요음(ュ) 앞 줄바꿈을 허용해 "シナジ / ーを計算" 처럼
 *   금칙 위반이 생긴다. strict가 이를 금지한다.
 *
 * en·es 는 추가 규칙 없음 (keep-all은 CJK에만 적용돼 무의미, 금칙 개념도 없음).
 */
export function quoteWrapClass(locale: string): string {
    if (locale === 'ko') return 'text-balance break-keep'
    if (locale === 'ja' || locale === 'zh') return 'text-balance [line-break:strict]'
    return 'text-balance'
}

const WORD_JOINER = '⁠'

/**
 * 한자 병기 뒤 조사가 다음 줄로 끊기는 것을 막는다.
 * word-break: keep-all 은 닫는 괄호 뒤 줄바꿈까지는 막지 못해서,
 * text-balance 가 "…시(時) / 가 다르면…" 처럼 조사를 떼어내는 경우가 있었다.
 * 매칭이 없으면 원문 그대로 반환하므로 전 로케일에 안전하게 적용된다.
 */
export function quoteText(text: string): string {
    return text.replace(/([)）])(?=[가-힣])/g, `$1${WORD_JOINER}`)
}
