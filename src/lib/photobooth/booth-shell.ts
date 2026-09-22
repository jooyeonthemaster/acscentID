/**
 * 매장 부스 exe(tools/booth-app) 가 preload 로 넣어주는 기능.
 * 브라우저에서 열면 없다 — 그때는 window.print() 등 웹 방식으로 폴백한다.
 */
export interface BoothShell {
  isShell: true
  info(): Promise<{
    shell: string
    version: string
    appUrl: string
    printerName: string | null
    zoomFactor: number
  }>
  /** 대화상자 없이 바로 인화 — 완성 원판(JPEG data URL)을 넘긴다 */
  print(imageDataUrl?: string): Promise<{ ok: boolean; error: string | null; printer: string | null }>
  /** 카메라를 놓고 앱 종료 */
  quit(): Promise<{ ok: boolean }>
  reload(): Promise<{ ok: boolean }>
  /** 화면 배율 (1 = 100%) — 모니터 크기에 맞춰 매장에서 고른다. exe 옆 config.json 에 저장 */
  setZoom(factor: number): Promise<{ ok: boolean; zoomFactor: number }>
}

export function getBoothShell(): BoothShell | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { boothShell?: BoothShell }).boothShell ?? null
}
