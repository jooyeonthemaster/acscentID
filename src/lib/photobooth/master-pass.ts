/**
 * 마스터 이용권 — 직원·테스트용 고정 번호.
 *
 * 일반 이용권(photobooth_passes)과 달리 DB에 기록하거나 사용 처리하지 않고 항상 통과한다.
 * 손님에게 노출되면 누구나 무료로 부스를 쓸 수 있으므로 매장 내부에서만 공유할 것.
 * 번호를 바꾸려면 PHOTOBOOTH_MASTER_CODE 환경변수를 6자리 숫자로 설정한다.
 */
export const MASTER_PASS_CODE = (process.env.PHOTOBOOTH_MASTER_CODE || '110619').replace(/\D/g, '')

export function isMasterPass(code: string): boolean {
  return MASTER_PASS_CODE.length === 6 && code === MASTER_PASS_CODE
}
