#!/usr/bin/env python3
"""서브셋 폰트의 거짓 cmap 정리.

에스코어드림 .woff는 한글 11,172자를 전부 cmap에 선언해 놓고 실제 외곽선은 KS X 1001
상용 2,350자에만 있다. 브라우저는 cmap을 믿고 "글리프가 있다"고 판단해 다음 폰트로
폴백하지 않으므로, 상용 외 음절(읻·뷁·핳 등)이 **빈칸으로 렌더링**된다.

이 스크립트는 외곽선이 빈 글리프의 cmap 매핑을 제거해 브라우저가 정상적으로 폴백
(Apple SD Gothic Neo / 맑은 고딕)하게 만든다. 공백류는 원래 비어 있는 것이 정상이라 보존한다.

    python3 scripts/repair-subset-fonts.py            # 검사만
    python3 scripts/repair-subset-fonts.py --write    # 실제 수정 (.bak 백업 생성)
"""

import sys
import glob
import os
import shutil

from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen

# 외곽선이 없는 것이 정상인 코드포인트 (공백·제어문자)
BLANK_OK = set(
    [0x20, 0xA0, 0x1680, 0x202F, 0x205F, 0x3000, 0xFEFF]
    + list(range(0x00, 0x20))
    + list(range(0x2000, 0x2010))
    + list(range(0x200B, 0x2010))
)

FONT_GLOB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public/fonts/**/*.woff")


def empty_codepoints(font: TTFont) -> set:
    """외곽선이 비어 있는데 cmap에 매핑된 코드포인트"""
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    empty = set()
    for cp, name in cmap.items():
        if cp in BLANK_OK:
            continue
        pen = RecordingPen()
        try:
            glyphs[name].draw(pen)
        except Exception:
            continue
        if len(pen.value) == 0:
            empty.add(cp)
    return empty


def repair(path: str, write: bool) -> int:
    font = TTFont(path)
    empty = empty_codepoints(font)
    name = os.path.basename(path)
    if not empty:
        print(f"{name:38s} 정상 (빈 글리프 매핑 없음)")
        return 0

    hangul = sum(1 for cp in empty if 0xAC00 <= cp <= 0xD7A3)
    print(f"{name:38s} 빈 글리프 매핑 {len(empty):6d}개 (한글 음절 {hangul})")
    if not write:
        return len(empty)

    shutil.copy2(path, path + ".bak")
    removed = 0
    for table in font["cmap"].tables:
        for cp in list(table.cmap.keys()):
            if cp in empty:
                del table.cmap[cp]
                removed += 1
    font.save(path)
    print(f"{'':38s} → cmap 항목 {removed}개 제거, 백업 {name}.bak")
    return len(empty)


def main() -> int:
    write = "--write" in sys.argv
    paths = sorted(glob.glob(FONT_GLOB, recursive=True))
    if not paths:
        print("대상 폰트를 찾지 못했습니다")
        return 1
    total = sum(repair(p, write) for p in paths)
    if total and not write:
        print("\n--write 를 붙이면 실제로 수정합니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
