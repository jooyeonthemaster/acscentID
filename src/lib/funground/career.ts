// 펀그라운드 별내 B안 미래 직업 탐색(NEXT!) — 키오스크 studio-career(src/app/kiosk/experience/career)를 고쳐 쓴 질문 여덟 개.
// 바뀐 점: 관상 사진 단계를 뺐다(카메라를 켜지 않는다) · 그 자리에 청소년 상황 질문 하나를 더 둔다 · AI 풀이 대신 미리 쓴 축 조합 풀이(career-combos.ts).
// 직업 셋은 기존 규칙표(data.ts 의 16개 직업 · exploreCareers)가 그대로 고른다 — 같은 답이면 늘 같은 결과. 외부 서비스를 부르지 않는다.
//
// 여덟 질문: ① 마음이 가는 활동(여럿) ② MBTI(건너뛸 수 있다) ③~⑦ 기존 상황 질문 다섯 ⑧ 새 상황 질문(자유 시간)
// 새 질문의 균형: 기존 다섯 질문의 보기는 만들기 4 · 문제 풀기 4 · 사람 돕기 3 · 이야기하기 4번 나온다.
//   새 질문은 네 축에 보기 하나씩을 둬서 이 질문만으로는 어느 축에도 치우치지 않게 했다(합계 5 · 5 · 4 · 5 — 기존과 같은 모양).
//   점수는 기존 상황 질문과 같은 2점(exploreCareers 의 extra).
//   모든 답을 똑같이 고른다고 칠 때(활동 1~2개 × 상황 질문 답 전부, MBTI 없음) 1위 축 비율(2026-11-14 계산):
//     질문 다섯(키오스크)  만들기 30.9% · 문제 풀기 28.4% · 사람 돕기 17.3% · 이야기하기 23.4%
//     질문 여섯(이 판)     만들기 30.1% · 문제 풀기 27.9% · 사람 돕기 17.8% · 이야기하기 24.3%
//   사람 돕기가 낮은 것은 기존 질문의 보기 수와 동점 순서(활동을 안 고른 축은 만들기→문제 풀기→사람 돕기→이야기하기) 때문이다 — 새 질문은 조금 고르게 만들 뿐 기울이지 않는다.

import { CAREER_QUESTIONS, exploreCareers, type CareerAxis, type CareerInterest, type CareerResult, type MbtiType } from '@/app/kiosk/experience/career/data'

export interface FgCareerOption { axis: CareerAxis; label: string; icon: string }

/** ⑧ 새 상황 질문 — 보기 넷, 축마다 하나 */
export const FG_CAREER_EXTRA_QUESTION: { title: [string, string]; options: FgCareerOption[] } = {
  title: ['자유 시간 한 시간이 생겼어요!', '무엇부터 할까요?'],
  options: [
    { axis: 'make', label: '공방에서 나만의 작품 만들기', icon: 'scissors' },
    { axis: 'solve', label: '방탈출 · 보드게임 도전하기', icon: 'gamepad' },
    { axis: 'help', label: '처음 온 친구 챙겨서 같이 놀기', icon: 'handheart' },
    { axis: 'talk', label: '친구들 앞에서 노래 · 춤 · 장기 자랑', icon: 'mic' },
  ],
}

/** 상황 질문 수 — 기존 다섯 + 새 질문 하나 */
export const FG_CAREER_QUESTION_COUNT = CAREER_QUESTIONS.length + 1
/** 단계 수 — 활동 고르기 · MBTI · 상황 질문 여섯 = 8 */
export const FG_CAREER_TOTAL = 2 + FG_CAREER_QUESTION_COUNT

/**
 * 여덟 질문의 답으로 탐색해 볼 직업 셋을 고른다.
 * answers: 상황 질문 여섯의 보기 번호(앞 다섯 = 기존 질문 순서, 여섯째 = 새 질문). 답이 없으면(null) 그 질문은 점수를 주지 않는다.
 */
export function exploreFgCareers(interests: CareerInterest[], mbti: MbtiType | null, answers: (number | null)[]): CareerResult {
  // 기존 질문 다섯 — exploreCareers 는 범위 밖 보기 번호를 건너뛴다(-1 = 답 없음)
  const base = CAREER_QUESTIONS.map((_, i) => answers[i] ?? -1)
  const last = answers[CAREER_QUESTIONS.length]
  const extraAxis = last === null || last === undefined ? undefined : FG_CAREER_EXTRA_QUESTION.options[last]?.axis
  return exploreCareers(interests, base, mbti, [], extraAxis ? [extraAxis] : [])
}
