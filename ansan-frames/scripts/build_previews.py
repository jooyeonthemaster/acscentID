#!/usr/bin/env python3
"""Build review-only examples and overlay thumbnails from the final frame PNGs.

The frame artwork is never modified. Text and neutral, fictional family
silhouettes appear only in previews. Run from any directory:
    python3 ansan-frames/scripts/build_previews.py
Requires Pillow and numpy.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageColor, ImageCms, ImageDraw, ImageFont


SIZE = (1200, 3600)
WINDOW_X, WINDOW_W, WINDOW_H = 92, 1016, 678
WINDOW_YS = (120, 826, 1532, 2238)
RESAMPLE = Image.Resampling.LANCZOS
KOREAN_FONTS = (
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
)
LATIN_FONTS = (
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
)


def load_manifest(root: Path) -> list[dict]:
    data = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    frames = data if isinstance(data, list) else data.get("frames", [])
    if not frames:
        raise ValueError("manifest.json must contain a nonempty array, or a frames array")
    return frames


def color(value: str | tuple) -> tuple[int, int, int, int]:
    if isinstance(value, (list, tuple)):
        return tuple(value) if len(value) == 4 else (*value, 255)
    match = re.fullmatch(r"rgba?\(([^)]+)\)", value.strip(), re.IGNORECASE)
    if match:
        channels = [part.strip() for part in match[1].split(",")]
        rgb = tuple(round(float(ch)) for ch in channels[:3])
        alpha = round(float(channels[3]) * 255) if len(channels) == 4 else 255
        return (*rgb, alpha)
    return ImageColor.getcolor(value, "RGBA")


def font(size: int, korean: bool = False) -> ImageFont.FreeTypeFont:
    paths = KOREAN_FONTS if korean else LATIN_FONTS
    for path in paths:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    raise RuntimeError(f"No suitable {'Korean' if korean else 'Latin'} font found: {paths}")


def fit_font(text: str, width: int, size: int, korean: bool = False) -> ImageFont.FreeTypeFont:
    result = font(size, korean)
    while result.getlength(text) > width and size > 12:
        size -= 1
        result = font(size, korean)
    return result


def neutral_family(index: int) -> Image.Image:
    """A deliberately abstract greyscale placement sample, not a real person."""
    yy, xx = np.mgrid[0:WINDOW_H, 0:WINDOW_W]
    light = 226 + 13 * (1 - yy / WINDOW_H) - 10 * ((xx / WINDOW_W - 0.5) ** 2)
    light -= index * 2
    grey = np.clip(light, 0, 255).astype(np.uint8)
    picture = Image.fromarray(np.repeat(grey[:, :, None], 3, axis=2), mode="RGB").convert("RGBA")
    draw = ImageDraw.Draw(picture)
    # Quiet studio setting; no visual cues imply an actual AI-generated age result.
    draw.ellipse((90, 35, 925, 890), fill=(235 - index * 2,) * 3 + (255,))
    draw.ellipse((175, 575, 875, 735), fill=(195, 195, 195, 255))
    # Two adult busts and one child, intentionally without facial features.
    for cx, cy, radius, torso, shade in (
        (345, 252, 101, (160, 345, 535, 810), 165),
        (690, 250, 101, (510, 345, 880, 810), 183),
        (520, 368, 78, (375, 440, 675, 790), 142),
    ):
        draw.rounded_rectangle(torso, radius=165, fill=(shade, shade, shade, 255))
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(shade + 14,) * 3 + (255,))
    return picture


def add_preview_text(preview: Image.Image, colors: dict) -> Image.Image:
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for y, year, label in zip(WINDOW_YS, ("2026", "2036", "2046", "2056"), ("지금", "10년 후", "20년 후", "30년 후")):
        bottom = y + WINDOW_H
        # Every label stays wholly inside x132:560, bottom-140:bottom-40.
        draw.rounded_rectangle((132, bottom - 140, 559, bottom - 41), radius=25, fill=color(colors["pill"]))
        draw.text((160, bottom - 90), year, font=font(43), fill=color(colors["pillYear"]), anchor="lm")
        draw.text((295, bottom - 90), label, font=font(36, True), fill=color(colors["pillText"]), anchor="lm")
    lines = (
        ("LATER!", 3072, 170, "title", False),
        ("AI 포토존 · 미래로 가는 타임캡슐", 3200, 42, "sub", True),
        ("2026 안산사이언스밸리 과학축제", 3290, 40, "foot", True),
        ("AI가 만든 재미로 보는 상상 사진이에요", 3360, 35, "footSub", True),
        ("2026.11.7–8", 3432, 36, "footSub", False),
    )
    for text, y, size, key, korean in lines:
        typeface = fit_font(text, 860, size, korean)
        bounds = draw.textbbox((600, y), text, font=typeface, anchor="mm")
        if not (160 <= bounds[0] and bounds[2] <= 1040 and 2970 <= bounds[1] and bounds[3] <= 3470):
            raise ValueError(f"Preview footer text lies outside reserved bounds: {text!r}, {bounds}")
        draw.text((600, y), text, font=typeface, fill=color(colors[key]), anchor="mm")
    return Image.alpha_composite(preview, layer)


def output_paths(root: Path, entry: dict) -> tuple[Path, Path]:
    stem = Path(entry["file"]).stem
    thumbnail = root / entry.get("thumb", entry.get("thumbnail", f"thumbs/{stem}.webp"))
    preview = root / entry.get("preview", f"previews/{stem}.jpg")
    return thumbnail, preview


def build_contact_sheet(root: Path, entries: list[dict], previews: list[Path], icc: bytes) -> None:
    columns = 5
    rows = (len(entries) + columns - 1) // columns
    width, height = 3000, 3900 if rows == 2 else 420 + rows * 1740
    sheet = Image.new("RGB", (width, height), "#edece9")
    draw = ImageDraw.Draw(sheet)
    draw.text((80, 80), "LATER! FRAME COLLECTION", font=font(83), fill="#20262a")
    draw.text((85, 188), "안산사이언스밸리 과학축제 · 오리지널 포토 프레임 10종", font=font(42, True), fill="#626a6d")
    for i, (entry, path) in enumerate(zip(entries, previews)):
        x, y = 75 + (i % columns) * 580, 300 + (i // columns) * 1740
        draw.rounded_rectangle((x + 6, y + 10, x + 536, y + 1640), radius=20, fill="#dcdad6")
        draw.rounded_rectangle((x, y, x + 530, y + 1630), radius=20, fill="#ffffff")
        with Image.open(path) as source:
            sample = source.convert("RGB").resize((480, 1440), RESAMPLE)
        sheet.paste(sample, (x + 25, y + 25))
        title = f"{i + 1:02d}  {entry['name']}"
        draw.text((x + 25, y + 1508), title, font=fit_font(title, 480, 39, True), fill="#20262a", anchor="lm")
        identifier = entry["id"].replace("-", " ").upper()
        draw.text((x + 25, y + 1567), identifier, font=fit_font(identifier, 480, 25), fill="#85898a", anchor="lm")
    draw.text((85, height - 95), "회색 가족 도형과 글자는 확인용 미리보기에만 표시됩니다. 실제 PNG는 사진 창이 투명한 무문자 프레임입니다.", font=font(32, True), fill="#626a6d")
    sheet.save(root / "contact-sheet.jpg", "JPEG", quality=94, subsampling=0, optimize=True, icc_profile=icc)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    entries = load_manifest(root)
    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    sample_photos = [neutral_family(i) for i in range(4)]
    preview_paths = []
    for entry in entries:
        frame_path = root / entry["file"]
        with Image.open(frame_path) as source:
            if source.size != SIZE or source.mode != "RGBA":
                raise ValueError(f"Expected a 1200×3600 RGBA final frame: {frame_path}")
            frame = source.copy()
        thumbnail_path, preview_path = output_paths(root, entry)
        thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        # Thumbnails retain the actual overlay's alpha; samples never enter these.
        frame.resize((240, 720), RESAMPLE).save(thumbnail_path, "WEBP", lossless=True, method=6, icc_profile=icc)
        example = Image.new("RGBA", SIZE, "#d5d5d5")
        for y, photo in zip(WINDOW_YS, sample_photos):
            example.paste(photo, (WINDOW_X, y))
        example = Image.alpha_composite(example, frame)
        example = add_preview_text(example, entry["colors"])
        example.convert("RGB").save(preview_path, "JPEG", quality=93, subsampling=0, optimize=True, dpi=(600, 600), icc_profile=icc)
        preview_paths.append(preview_path)
        print(f"Built {preview_path.relative_to(root)} and {thumbnail_path.relative_to(root)}")
    build_contact_sheet(root, entries, preview_paths, icc)
    print(f"Built contact-sheet.jpg with {len(entries)} frames")


if __name__ == "__main__":
    main()
