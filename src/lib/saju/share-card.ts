// ============================================================
// 사주 공유 카드 — 운문(雲紋) PNG 생성 (실물 상품 아트 재현: 달 + 겹구름 + 명패)
// 외부 의존성 없이 Canvas 2D로 그린다. 구름 패스는 clouds.tsx SSOT를 Path2D로 재사용.
// SAJU_CLOUDS 플래그가 꺼져 있으면 null을 반환한다(호출부에서 버튼 자체를 숨김).
// ============================================================

import {
  CLOUD_RIDGE_D,
  CLOUD_RIDGE_TOP_D,
  RIDGE_CURL_DS,
  SAJU_CLOUDS,
} from '@/components/saju/clouds';

export interface SajuShareCardOptions {
  /** 향수명 (명패에 크게) */
  perfumeName: string;
  /** 프로그램명 (예: 사주 분석 퍼퓸) */
  programName: string;
  /** 하단 브랜드 라인 (예: AC'SCENT 04) */
  brandLine?: string;
}

const W = 1080;
const H = 1350;
const SERIF = '"Noto Serif KR", serif';

/** 인덱스 기반 결정적 의사난수 — GoldDust와 동일 기법 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** 능선 한 겹 — clouds.tsx 패스를 스케일해 그린다 (viewBox 800×140) */
function drawRidge(
  ctx: CanvasRenderingContext2D,
  opts: { y: number; scaleX: number; scaleY: number; offsetX: number; fill: string; strokeAlpha: number }
) {
  const { y, scaleX, scaleY, offsetX, fill, strokeAlpha } = opts;
  ctx.save();
  ctx.translate(offsetX, y);
  ctx.scale(scaleX, scaleY);
  const fillPath = new Path2D(CLOUD_RIDGE_D);
  ctx.fillStyle = fill;
  ctx.fill(fillPath);
  // 능선을 캔버스 하단까지 연장 (패스 높이 140 아래 여백 메움)
  ctx.fillRect(0, 138, 800, (H - y) / scaleY);
  ctx.strokeStyle = `rgba(201,162,39,${strokeAlpha})`;
  ctx.lineWidth = 1.4 / scaleX;
  ctx.stroke(new Path2D(CLOUD_RIDGE_TOP_D));
  ctx.lineWidth = 1.1 / scaleX;
  ctx.strokeStyle = `rgba(201,162,39,${strokeAlpha * 0.8})`;
  RIDGE_CURL_DS.forEach((d) => ctx.stroke(new Path2D(d)));
  ctx.restore();
}

/** 카드 PNG Blob 생성 — 폰트 로드 후 그린다 */
export async function generateSajuShareCard(options: SajuShareCardOptions): Promise<Blob | null> {
  if (!SAJU_CLOUDS) return null;
  if (typeof document === 'undefined') return null;

  // 명조 글리프가 캔버스에서 폴백으로 그려지지 않게 로드를 기다린다
  try {
    await Promise.all([
      document.fonts.load(`900 72px ${SERIF}`),
      document.fonts.load(`700 34px ${SERIF}`),
      document.fonts.ready,
    ]);
  } catch {
    /* 폰트 로드 실패 시 폴백 세리프로 진행 */
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // ---------- 1. 자정 하늘 ----------
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0A0C12');
  sky.addColorStop(0.62, '#0C0E16');
  sky.addColorStop(1, '#10141F');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 배경별 — 상단 2/3 영역에만
  for (let i = 0; i < 46; i += 1) {
    const x = seededRandom(i * 7 + 11) * W;
    const y = seededRandom(i * 7 + 13) * H * 0.6;
    const r = 1 + seededRandom(i * 7 + 17) * 1.6;
    ctx.fillStyle = `rgba(233,226,208,${0.25 + seededRandom(i * 7 + 19) * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------- 2. 보름달 ----------
  const moonX = W / 2;
  const moonY = 465;
  const moonR = 132;
  const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * 2.4);
  halo.addColorStop(0, 'rgba(240,240,250,0.16)');
  halo.addColorStop(0.5, 'rgba(240,240,250,0.05)');
  halo.addColorStop(1, 'rgba(240,240,250,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(moonX - moonR * 2.4, moonY - moonR * 2.4, moonR * 4.8, moonR * 4.8);
  const moon = ctx.createRadialGradient(
    moonX - moonR * 0.2, moonY - moonR * 0.25, moonR * 0.1,
    moonX, moonY, moonR
  );
  moon.addColorStop(0, '#FBFAFF');
  moon.addColorStop(0.55, '#EEEDF6');
  moon.addColorStop(1, '#D9D8E6');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  // ---------- 3. 겹구름 (뒤 → 앞) ----------
  const sx = (W / 800) * 1.3; // 화폭보다 넓게 깔아 좌우가 잘리게
  drawRidge(ctx, { y: H - 620, scaleX: sx, scaleY: 1.9, offsetX: -180, fill: '#141A26', strokeAlpha: 0.24 });
  drawRidge(ctx, { y: H - 470, scaleX: sx, scaleY: 2.1, offsetX: -60, fill: '#1B2334', strokeAlpha: 0.3 });
  drawRidge(ctx, { y: H - 320, scaleX: sx, scaleY: 2.2, offsetX: -260, fill: '#232C42', strokeAlpha: 0.36 });

  // ---------- 4. 명패(두루마리) ----------
  const plateW = 660;
  const plateH = 130;
  const plateX = (W - plateW) / 2;
  const plateY = H - 265;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 8;
  const plate = ctx.createLinearGradient(0, plateY, 0, plateY + plateH);
  plate.addColorStop(0, '#F5EFE2');
  plate.addColorStop(1, '#EDE5D2');
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.roundRect(plateX, plateY, plateW, plateH, 8);
  ctx.fill();
  ctx.restore();

  // 양끝 금 축
  (['left', 'right'] as const).forEach((side) => {
    const cx = side === 'left' ? plateX - 4 : plateX + plateW + 4;
    const rod = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
    rod.addColorStop(0, '#8A6D1F');
    rod.addColorStop(0.5, '#F2DA8A');
    rod.addColorStop(1, '#8A6D1F');
    ctx.fillStyle = rod;
    ctx.beginPath();
    ctx.roundRect(cx - 11, plateY - 10, 22, plateH + 20, 11);
    ctx.fill();
  });

  // 명패 텍스트 — 향수명 (폭 안에 들어올 때까지 축소)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1A1610';
  let nameSize = 64;
  const name = options.perfumeName.trim();
  do {
    ctx.font = `900 ${nameSize}px ${SERIF}`;
    if (ctx.measureText(name).width <= plateW - 90) break;
    nameSize -= 2;
  } while (nameSize > 30);
  ctx.fillText(name, W / 2, plateY + plateH / 2 + 3);

  // ---------- 5. 타이포 ----------
  // 상단 브랜드
  ctx.fillStyle = '#A69F8D';
  ctx.font = '600 30px Outfit, sans-serif';
  ctx.save();
  ctx.letterSpacing = '10px';
  ctx.fillText("AC'SCENT IDENTITY", W / 2, 96);
  ctx.restore();

  // 프로그램명 — 명패 위 금색
  ctx.fillStyle = '#C9A227';
  ctx.font = `700 34px ${SERIF}`;
  ctx.save();
  ctx.letterSpacing = '6px';
  ctx.fillText(options.programName, W / 2, plateY - 44);
  ctx.restore();

  // 하단 브랜드 라인 (perfume id)
  if (options.brandLine) {
    ctx.fillStyle = '#A69F8D';
    ctx.font = '600 26px Outfit, sans-serif';
    ctx.save();
    ctx.letterSpacing = '6px';
    ctx.fillText(options.brandLine.toUpperCase(), W / 2, plateY + plateH + 52);
    ctx.restore();
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** 생성 → 기기 공유(가능하면) 또는 다운로드 */
export async function shareSajuCard(options: SajuShareCardOptions): Promise<boolean> {
  const blob = await generateSajuShareCard(options);
  if (!blob) return false;

  const file = new File([blob], 'saju-scent-card.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: options.perfumeName });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return true;
      /* 공유 실패 → 다운로드 폴백 */
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'saju-scent-card.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
