"""영업용 데모 랜딩(/kiosk-demo)의 키오스크 사진 썸네일을 만든다.

매장 키오스크 실물 사진(2026-09-18)에서 화면을 초록으로 바꾸고 배경을 지운 것(kiosk-base.webp — 이미지 모델 편집 두 번 + 테두리 반사 지우기)의
화면 자리(kiosk-screen.json 의 네 꼭짓점: 왼쪽 위 · 오른쪽 위 · 오른쪽 아래 · 왼쪽 아래)에 프로그램 첫 화면을 원근에 맞춰 넣는다.

실행: python3 scripts/kiosk-demo/compose.py <첫 화면 폴더>
  첫 화면 폴더에는 <모드 id>.png — /kiosk?mode=<모드 id> 첫 화면을 560×996 CSS 크기(1.5배 이상)로 찍은 것
  → public/assets/kiosk-demo/kiosk-<모드 id>.webp
필요한 것: Pillow 만(numpy·OpenCV 없이 돈다). 설명: docs/kiosk-modes.md '영업용 데모'
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
base = Image.open(f'{HERE}/kiosk-base.webp').convert('RGBA')
W, H = base.size
info = json.load(open(f'{HERE}/kiosk-screen.json'))
quad = [tuple(p) for p in info['screen']]  # tl, tr, br, bl

def solve(a, b):
    n = len(b); m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c])); m[c], m[p] = m[p], m[c]
        for r in range(n):
            if r != c:
                f = m[r][c] / m[c][c]
                for k in range(c, n + 1): m[r][k] -= f * m[c][k]
    return [m[i][n] / m[i][i] for i in range(n)]

def coeffs(dst, src):
    # 출력 좌표(dst) → 입력 좌표(src) 로 가는 원근 변환 계수(PIL PERSPECTIVE)
    a, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return solve(a, b)

def expand(q, d):
    cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
    out = []
    for x, y in q:
        dx, dy = x - cx, y - cy; L = (dx * dx + dy * dy) ** 0.5
        out.append((x + dx / L * d, y + dy / L * d))
    return out

S = 4  # 경계를 부드럽게 — 4배로 그려 줄인다
mask_big = Image.new('L', (W * S, H * S), 0)
ImageDraw.Draw(mask_big).polygon([(x * S, y * S) for x, y in expand(quad, 1.6)], fill=255)
mask = mask_big.resize((W, H), Image.LANCZOS)
# 화면 둘레에 남는 초록 번짐 지우기(테두리 쪽 띠)
green = Image.open(f'{HERE}/kiosk-screen-mask.png')
band = ImageChops.subtract(green.filter(ImageFilter.MaxFilter(9)), mask.point(lambda v: 255 if v > 250 else 0))
basepx = base.load(); bandpx = band.load()
for y in range(H):
    for x in range(W):
        if bandpx[x, y]:
            r, g, b, a = basepx[x, y]
            g2 = min(g, max(r, b) + 6)
            basepx[x, y] = (r, g2, b, a)
# 유리 느낌 — 왼쪽 위에서 비스듬히 옅은 빛, 화면 안에만
sheen = Image.new('RGBA', (W, H), (255, 255, 255, 0)); sp = ImageDraw.Draw(sheen)
x0, y0 = quad[0]
for i in range(140):
    t = i / 140
    sp.line([(x0 - 200 + i * 4, y0 - 40), (x0 - 500 + i * 4, y0 + 760)], fill=(255, 255, 255, int(22 * (1 - t) ** 2)), width=4)
sheen.putalpha(ImageChops.multiply(sheen.split()[3], mask))
# 아래쪽은 몸체가 계속 이어지므로 배경으로 흐리게 사라지게
fade = Image.new('L', (W, H), 255); fp = ImageDraw.Draw(fade)
start = int(max(p[1] for p in quad) + 70)
for y in range(start, H):
    fp.line([(0, y), (W, y)], fill=max(0, int(255 * (1 - (y - start) / (H - start)) ** 1.6)))

def compose(shot_path, out_path):
    shot = Image.open(shot_path).convert('RGB')
    tw = int(max(quad[1][0] - quad[0][0], quad[2][0] - quad[3][0]) * 1.15)
    th = int(tw * shot.height / shot.width)
    shot = shot.resize((tw, th), Image.LANCZOS)
    big = (W * 2, H * 2)
    c = coeffs([(x * 2, y * 2) for x, y in quad], [(0, 0), (tw, 0), (tw, th), (0, th)])
    warped = shot.transform(big, Image.PERSPECTIVE, c, Image.BICUBIC).resize((W, H), Image.LANCZOS).convert('RGBA')
    img = base.copy()
    img.paste(warped, (0, 0), mask)
    img = Image.alpha_composite(img, sheen)
    a = ImageChops.multiply(img.split()[3], fade); img.putalpha(a)
    bbox = a.point(lambda v: 255 if v > 8 else 0).getbbox()
    pad = 24
    img = img.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(W, bbox[2] + pad), min(H, bbox[3])))
    img.save(out_path, 'WEBP', quality=84, method=6)
    return img.size

# 데모 랜딩의 프로그램(src/lib/kiosk/demo.ts 의 KIOSK_DEMOS) — 폴더에 다른 그림이 섞여 있어도 이것만 만든다
MODES = ('kwave-2026', 'ai-color', 'ai-tarot', 'studio-nail', 'studio-card', 'studio-skin', 'studio-draw', 'studio-voice', 'studio-career', 'studio-makeup')
for mode in MODES:
    name = f'{mode}.png'
    if not os.path.exists(f'{SHOTS}/{name}'):
        print(mode, '— 첫 화면이 없어 건너뜀'); continue
    out = f'{ROOT}/public/assets/kiosk-demo/kiosk-{mode}.webp'
    print(mode, compose(f'{SHOTS}/{name}', out), os.path.getsize(out) // 1024, 'KB')
