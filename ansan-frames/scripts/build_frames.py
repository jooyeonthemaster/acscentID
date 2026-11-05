#!/usr/bin/env python3
"""Build the ten exact-coordinate, print-ready ANSAN photo overlays.

Run from any directory: python3 ansan-frames/scripts/build_frames.py
The script consumes manifest.json and the original transparent illustrations in
assets/. It writes only final frames, never previews or application source.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import random

from PIL import Image, ImageChops, ImageCms, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
W, H = 1200, 3600
WINDOWS = [(92, y, 1108, y + 678) for y in (120, 826, 1532, 2238)]
TEXT_REGION = (160, 2970, 1040, 3470)
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
RESAMPLE = Image.Resampling.LANCZOS

THEMES = {
    "laser-lab": {"bg": "#C33B7C", "foot": "#A82969", "ink": "#252231", "accent": "#DCEB8E", "soft": "#E79ABD"},
    "robot-friends": {"bg": "#FCFBF5", "foot": "#FCFBF5", "ink": "#586D72", "accent": "#9CCFC9", "soft": "#EDCFDC"},
    "science-doodles": {"bg": "#FAF0D9", "foot": "#FAF0D9", "ink": "#536657", "accent": "#D89E5C", "soft": "#E0D3B8"},
    "space-explorer": {"bg": "#B9D9EB", "foot": "#263B66", "ink": "#304E70", "accent": "#F3D6A0", "soft": "#E4EDDB"},
    "lab-stripes": {"bg": "#FFF4CE", "foot": "#FFF4CE", "ink": "#596C59", "accent": "#E9BC68", "soft": "#F3DF9E"},
    "green-earth": {"bg": "#CEECE9", "foot": "#D9EEDF", "ink": "#477565", "accent": "#91BE90", "soft": "#F6F8E8"},
    "drone-garden": {"bg": "#F1D578", "foot": "#F1D578", "ink": "#383E38", "accent": "#DCA857", "soft": "#F8E6A7"},
    "time-capsule-film": {"bg": "#1D1E27", "foot": "#1D1E27", "ink": "#D9D3C5", "accent": "#D79A73", "soft": "#757680"},
    "starlight-observatory": {"bg": "#D1C4E4", "foot": "#443B6F", "ink": "#665582", "accent": "#F0DAAB", "soft": "#E1D6EE"},
    "anniversary-party": {"bg": "#FCFAF3", "foot": "#FCFAF3", "ink": "#647582", "accent": "#DE9AA9", "soft": "#BFDAD0"},
}

ASSETS = {
    "robot-friends": ["robot-wave", "robot-peek", "robot-heart", "robot-sprout"],
    "science-doodles": ["science-kid"],
    "space-explorer": ["astronaut"],
    "lab-stripes": ["flask"],
    "green-earth": ["earth"],
    "drone-garden": ["garden-drone"],
    "starlight-observatory": ["observatory"],
    "anniversary-party": ["celebration"],
}


def rgb(color: str):
    color = color.lstrip("#")
    return tuple(int(color[k:k + 2], 16) for k in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(x * (1 - t) + y * t) for x, y in zip(a, b))


def gradient(top, bottom):
    image = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(image)
    a, b = rgb(top), rgb(bottom)
    for y in range(H):
        draw.line((0, y, W, y), fill=(*mix(a, b, (y / (H - 1)) ** 0.9), 255))
    return image


def icon(kind, size=60, ink="#536657", accent="#D89E5C", paper=None):
    """Original small print-safe symbols, rendered at their actual output size."""
    im = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(im)
    s = size / 100
    stroke = max(3, round(5 * s))

    def pts(points):
        return [(round(x * s), round(y * s)) for x, y in points]

    def line(points, fill=ink, width=stroke):
        d.line(pts(points), fill=fill, width=width, joint="curve")

    def ellipse(box, fill=None, outline=ink, width=stroke):
        d.ellipse(tuple(round(v * s) for v in box), fill=fill, outline=outline, width=width)

    def rect(box, radius=0, fill=None, outline=ink):
        box = tuple(round(v * s) for v in box)
        # Pillow 9.x needs a nonnegative central span even on tiny round-ended tubes.
        maximum_radius = max(0, (min(box[2] - box[0], box[3] - box[1]) - 2) // 2)
        d.rounded_rectangle(box, radius=min(round(radius * s), maximum_radius), fill=fill, outline=outline, width=stroke)

    def poly(points, fill=None, outline=ink):
        points = pts(points)
        d.polygon(points, fill=fill)
        if outline:
            d.line(points + points[:1], fill=outline, width=stroke, joint="curve")

    if kind == "star":
        points = []
        for i in range(10):
            r = 42 if i % 2 == 0 else 20
            a = i * math.pi / 5 - math.pi / 2
            points.append((50 + math.cos(a) * r, 50 + math.sin(a) * r))
        poly(points, fill=accent)
    elif kind == "sparkle":
        poly([(50, 4), (60, 38), (94, 50), (60, 62), (50, 96), (40, 62), (6, 50), (40, 38)], fill=accent)
    elif kind == "bolt":
        poly([(57, 5), (22, 57), (46, 57), (38, 95), (80, 40), (55, 40)], fill=accent)
    elif kind == "gear":
        points = []
        for i in range(32):
            radius = 43 if i % 4 in (1, 2) else 33
            a = i * math.tau / 32
            points.append((50 + math.cos(a) * radius, 50 + math.sin(a) * radius))
        poly(points, fill=accent)
        ellipse((34, 34, 66, 66), fill=paper)
    elif kind == "atom":
        for angle in (0, 60, 120):
            ring = Image.new("RGBA", (size, size))
            rd = ImageDraw.Draw(ring)
            rd.ellipse((round(9 * s), round(34 * s), round(91 * s), round(66 * s)), outline=ink, width=stroke)
            im.alpha_composite(ring.rotate(angle, resample=Image.Resampling.BICUBIC))
        d = ImageDraw.Draw(im)
        ellipse((42, 42, 58, 58), fill=accent, outline=None)
    elif kind == "flask":
        poly([(38, 11), (62, 11), (62, 40), (86, 79), (82, 89), (18, 89), (14, 79), (38, 40)], fill=paper)
        poly([(29, 61), (71, 61), (82, 82), (18, 82)], fill=accent, outline=None)
        line([(32, 11), (68, 11)])
        ellipse((47, 69, 54, 76), fill=ink, outline=None)
        ellipse((40, 48, 46, 54), fill=accent, outline=None)
    elif kind == "tube":
        rect((32, 9, 66, 89), 15, fill=paper)
        rect((38, 46, 60, 82), 9, fill=accent, outline=None)
        line([(25, 10), (73, 10)])
        line([(45, 32), (60, 32)])
    elif kind == "magnet":
        line([(24, 15), (24, 60), (29, 75), (43, 83), (57, 83), (71, 75), (76, 60), (76, 15)], fill=ink, width=max(12, round(20 * s)))
        line([(24, 14), (24, 33)], fill=accent, width=max(7, round(11 * s)))
        line([(76, 14), (76, 33)], fill=accent, width=max(7, round(11 * s)))
    elif kind == "bulb":
        ellipse((23, 9, 77, 66), fill=accent)
        rect((36, 61, 64, 82), 5, fill=paper)
        line([(40, 91), (60, 91)])
        line([(50, 61), (40, 39), (51, 47), (61, 38)])
    elif kind == "magnifier":
        ellipse((10, 9, 66, 65), fill=paper)
        line([(59, 59), (88, 88)], width=max(6, round(13 * s)))
        line([(24, 28), (35, 20)], fill=accent)
    elif kind == "microscope":
        poly([(43, 12), (58, 5), (76, 42), (61, 50)], fill=accent)
        line([(36, 16), (59, 5)])
        line([(64, 49), (73, 57), (73, 74), (62, 85), (31, 85)], width=max(4, stroke))
        line([(26, 64), (57, 64)])
        line([(35, 64), (35, 85)])
        line([(21, 92), (82, 92)], width=max(4, stroke))
        ellipse((62, 47, 76, 61), fill=paper)
    elif kind == "bubble":
        poly([(13, 17), (87, 17), (87, 65), (51, 65), (29, 87), (29, 65), (13, 65)], fill=paper)
    elif kind == "rocket":
        poly([(50, 7), (67, 27), (67, 68), (50, 80), (33, 68), (33, 27)], fill=paper)
        poly([(33, 47), (16, 72), (33, 68)], fill=accent)
        poly([(67, 47), (84, 72), (67, 68)], fill=accent)
        ellipse((40, 30, 60, 50), fill=accent)
        line([(42, 83), (38, 94)], fill=accent)
        line([(57, 83), (61, 94)], fill=accent)
    elif kind == "drone":
        line([(34, 48), (20, 28), (8, 28)])
        line([(66, 48), (80, 28), (92, 28)])
        ellipse((4, 17, 36, 33), fill=paper)
        ellipse((64, 17, 96, 33), fill=paper)
        rect((27, 40, 73, 69), 11, fill=accent)
        line([(33, 71), (29, 83), (40, 83)])
        line([(67, 71), (71, 83), (60, 83)])
        ellipse((44, 48, 57, 61), fill=paper)
    elif kind == "leaf":
        poly([(18, 76), (18, 46), (38, 23), (83, 13), (81, 54), (59, 78), (18, 76)], fill=accent)
        line([(12, 91), (67, 31)])
        line([(37, 64), (37, 45)])
    elif kind == "sprout":
        line([(50, 93), (50, 43)])
        ellipse((13, 23, 50, 51), fill=accent)
        ellipse((50, 10, 89, 43), fill=accent)
        line([(25, 83), (74, 83)])
    elif kind == "flower":
        for i in range(5):
            a = -math.pi / 2 + i * math.tau / 5
            x, y = 50 + 23 * math.cos(a), 39 + 23 * math.sin(a)
            ellipse((x - 15, y - 15, x + 15, y + 15), fill=paper)
        ellipse((37, 26, 63, 52), fill=accent)
        line([(50, 65), (50, 96)])
        line([(50, 81), (69, 69)])
    elif kind == "cloud":
        # A closed cloud contour avoids seams between overlapping circle outlines.
        poly([(9, 68), (9, 50), (21, 40), (33, 41), (40, 23), (60, 20), (75, 37), (86, 40), (94, 54), (90, 68)], fill=paper or accent)
    elif kind == "wind":
        line([(50, 44), (50, 94)])
        line([(50, 44), (39, 7)])
        line([(50, 44), (88, 50)])
        line([(50, 44), (23, 74)])
        ellipse((44, 38, 56, 50), fill=accent)
        line([(34, 94), (66, 94)])
    elif kind == "solar":
        poly([(20, 21), (87, 21), (76, 67), (9, 67)], fill=accent)
        line([(16, 44), (81, 44)])
        line([(42, 24), (32, 66)])
        line([(64, 24), (54, 66)])
        line([(43, 70), (43, 90)])
        line([(26, 90), (60, 90)])
    elif kind == "planet":
        ellipse((23, 22, 77, 77), fill=accent)
        line([(4, 65), (28, 66), (64, 47), (93, 27)])
        line([(4, 65), (9, 47), (23, 39)])
        line([(77, 40), (93, 27), (91, 44)])
    elif kind == "heart":
        poly([(50, 86), (12, 48), (10, 29), (25, 15), (40, 16), (50, 29), (60, 16), (75, 15), (90, 29), (88, 48)], fill=accent)
    elif kind == "telescope":
        poly([(15, 37), (69, 12), (82, 42), (28, 66)], fill=accent)
        line([(24, 35), (36, 62)])
        line([(77, 16), (90, 44)], width=max(5, stroke))
        line([(47, 59), (47, 80), (25, 96)])
        line([(47, 80), (72, 96)])
        line([(47, 80), (47, 97)])
    elif kind == "balloon":
        ellipse((22, 7, 78, 68), fill=accent)
        poly([(50, 68), (44, 77), (57, 77)], fill=accent)
        line([(50, 77), (56, 88), (47, 97)])
    elif kind == "cake":
        rect((18, 36, 82, 83), 7, fill=paper)
        line([(18, 54), (32, 61), (45, 53), (58, 61), (70, 54), (81, 58)], fill=accent)
        line([(10, 88), (90, 88)])
        line([(50, 17), (50, 36)], fill=accent)
        ellipse((45, 5, 55, 15), fill=accent, outline=None)
    elif kind == "ribbon":
        line([(13, 15), (24, 34), (48, 22), (73, 38), (61, 60), (81, 83)], fill=accent, width=max(5, stroke))
    elif kind == "bee":
        ellipse((20, 15, 48, 45), fill=paper)
        ellipse((45, 13, 72, 42), fill=paper)
        ellipse((16, 38, 80, 77), fill=accent)
        line([(39, 40), (39, 73)])
        line([(58, 40), (58, 73)])
        line([(81, 55), (95, 59)])
    else:
        raise ValueError(f"Unknown original motif: {kind}")
    return im


def motif(image, kind, x, y, size, colors, angle=0, mono=False):
    ink = colors["ink"]
    accent = colors["bg"] if mono else colors["accent"]
    art = icon(kind, size, ink, accent, colors["bg"])
    if angle:
        art = art.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    image.alpha_composite(art, (round(x - art.width / 2), round(y - art.height / 2)))


def background_columns(image, kinds, colors, seed, step=180, mono=False):
    """Repeated edge ornament is expendable bleed, not a principal character."""
    rng = random.Random(seed)
    for side, x in enumerate((40, 1160)):
        for index, y in enumerate(range(110, 3590, step)):
            if 2960 < y < 3490:
                continue
            kind = kinds[(index + side * 3) % len(kinds)]
            motif(image, kind, x, y + rng.randint(-13, 13), rng.choice((38, 44, 50)), colors, rng.choice((-14, 0, 12)), mono)


def scatter_sparkles(image, colors, seed, count=80):
    rng = random.Random(seed)
    d = ImageDraw.Draw(image)
    for _ in range(count):
        x = rng.choice((rng.randint(12, 78), rng.randint(1122, 1188)))
        y = rng.randint(60, 3530)
        if 2960 < y < 3490:
            continue
        r = rng.randint(3, 6)
        d.ellipse((x - r, y - r, x + r, y + r), fill=colors["accent"])


def footer_field(image, color, fade=False):
    """Leave the whole 880 × 500 application text field exactly constant."""
    d = ImageDraw.Draw(image)
    if fade:
        destination = rgb(color)
        for y in range(2920, 2970):
            source = image.getpixel((600, y))[:3]
            d.line((0, y, W, y), fill=(*mix(source, destination, (y - 2920) / 49), 255))
        for y in range(3470, 3550):
            source = image.getpixel((600, y))[:3]
            d.line((0, y, W, y), fill=(*mix(destination, source, (y - 3470) / 79), 255))
    d.rectangle((0, 2970, W - 1, 3469), fill=color)


def draw_background(slug):
    c = THEMES[slug]
    if slug == "space-explorer":
        im = gradient(c["bg"], "#263B66")
    elif slug == "starlight-observatory":
        im = gradient(c["bg"], "#403664")
    elif slug == "green-earth":
        im = gradient(c["bg"], "#D9EEDF")
    else:
        im = Image.new("RGBA", (W, H), c["bg"])
    d = ImageDraw.Draw(im)

    if slug == "laser-lab":
        # Continuous slanted beams remain visible in the gutters and separators.
        for index, y in enumerate((56, 807, 1513, 2219, 2925, 3504)):
            skew = 50 if index % 2 == 0 else -50
            d.polygon([(0, y - 34), (W, y + skew - 34), (W, y + skew + 28), (0, y + 28)], fill=c["ink"])
            d.line((0, y - 6, W, y + skew - 6), fill="#93A771", width=15)
            d.line((0, y - 6, W, y + skew - 6), fill=c["accent"], width=7)
        for side in (0, 1):
            x = 22 if side == 0 else 1178
            for y in range(210, 2910, 245):
                direction = 1 if side == 0 else -1
                d.line([(x, y), (x + direction * 20, y), (x + direction * 20, y + 47), (x + direction * 42, y + 47)], fill=c["soft"], width=4)
                d.ellipse((x - 5, y - 5, x + 5, y + 5), outline=c["soft"], width=3)
        background_columns(im, ["gear", "bolt"], c, 11, 330)

    elif slug == "robot-friends":
        # Long pastel ribbon gestures, balanced by clean white space.
        for side in (0, 1):
            pts = []
            for y in range(30, 2930, 8):
                x = 39 + 18 * math.sin(y / 94)
                pts.append((round(x if side == 0 else W - x), y))
            d.line(pts, fill=c["soft"] if side else "#CFE3DA", width=6, joint="curve")
        background_columns(im, ["sprout", "star", "gear", "heart"], c, 22, 250)

    elif slug == "science-doodles":
        for x in range(0, W, 36):
            d.line((x, 0, x, H), fill="#E6DCC3", width=3)
        for y in range(0, H, 36):
            d.line((0, y, W, y), fill="#E6DCC3", width=3)
        background_columns(im, ["atom", "flask", "bubble", "rocket", "bulb", "microscope", "magnet", "magnifier"], c, 33, 178)
        for x, y in ((73, 430), (1124, 1890)):
            d.rounded_rectangle((x - 15, y - 26, x + 15, y + 26), radius=5, fill="#F0D998", outline=c["ink"], width=3)
        # Empty notebook page tabs, with no writing or branded symbols.
        for y, fill in ((805, "#D5E3CA"), (1511, "#E5C3B0"), (2217, "#EED693")):
            d.rounded_rectangle((539, y, 662, y + 12), radius=5, fill=fill)

    elif slug == "space-explorer":
        background_columns(im, ["planet", "star", "rocket", "sparkle"], {**c, "ink": "#DDE9E7"}, 44, 235)
        scatter_sparkles(im, c, 45, 100)
        for y in (430, 1750, 2460):
            side = 1 if y == 1750 else 0
            x = 1116 if side else 15
            d.line((x, y + 42, x + 57, y), fill="#CADDE5", width=5)
            d.ellipse((x + 51, y - 5, x + 61, y + 5), fill=c["accent"])

    elif slug == "lab-stripes":
        for x in range(-18, W, 68):
            d.rectangle((x, 0, x + 25, H), fill=c["soft"])
        background_columns(im, ["tube", "flask", "magnifier", "magnet", "drone"], c, 55, 226)
        for y in (811, 1517, 2223):
            for x in (405, 600, 795):
                d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=c["ink"])

    elif slug == "green-earth":
        background_columns(im, ["cloud", "leaf", "wind", "heart", "solar", "sprout"], c, 66, 190)
        for y in (290, 960, 1650, 2370):
            for x in (4, 1152):
                d.arc((x, y, x + 44, y + 84), 270, 100, fill="#AFD4C2", width=4)

    elif slug == "drone-garden":
        background_columns(im, ["flower", "leaf", "drone", "sprout", "bee"], c, 77, 165, mono=True)
        for side, x in enumerate((73, 1127)):
            pts = [(round(x + 4 * math.sin(y / 48)), y) for y in range(0, H, 8)]
            d.line(pts, fill=c["ink"], width=3)
            for y in range(230, 2920, 150):
                k = 1 if side == 0 else -1
                d.line((x, y, x - k * 15, y - 15), fill=c["ink"], width=3)

    elif slug == "time-capsule-film":
        # Sprocket slots are printed cream, never transparent extra photo holes.
        for x in (24, 1144):
            for y in range(37, 3590, 91):
                d.rounded_rectangle((x, y, x + 31, y + 47), radius=7, fill="#C8C2B5")
        for x in (74, 1126):
            d.line((x, 0, x, H), fill="#5A5960", width=3)
        # Low-amplitude analogue light leaks, entirely outside the text field.
        for side in (0, 1):
            for y in range(220, 2920):
                strength = max(0, 1 - abs(y - (470 if side == 0 else 2490)) / 580)
                if not strength:
                    continue
                for x in range(12):
                    t = strength * (1 - x / 12) * 0.35
                    col = (*mix(rgb(c["bg"]), rgb(c["accent"]), t), 255)
                    im.putpixel((x if side == 0 else W - 1 - x, y), col)
        for y in (810, 1516, 2222):
            d.polygon([(584, y - 7), (600, y + 7), (616, y - 7)], fill="#C3B7A5")

    elif slug == "starlight-observatory":
        light = {**c, "ink": "#E6DDEE"}
        background_columns(im, ["sparkle", "planet", "star"], light, 99, 225)
        scatter_sparkles(im, c, 98, 95)
        for side in (0, 1):
            for base in (270, 970, 1670, 2370):
                points = [(25, base), (64, base + 44), (36, base + 108), (67, base + 149)]
                if side:
                    points = [(W - x, y + 100) for x, y in points]
                d.line(points, fill="#B8AAD1", width=3)
                for x, y in points:
                    d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=c["accent"])

    elif slug == "anniversary-party":
        background_columns(im, ["balloon", "ribbon", "rocket", "star", "cake"], c, 110, 226)
        rng = random.Random(111)
        for _ in range(160):
            x = rng.choice((rng.randint(5, 79), rng.randint(1121, 1195)))
            y = rng.randint(25, 3570)
            if 2960 < y < 3490:
                continue
            fill = rng.choice(("#DFA8AD", "#A8C7D0", "#E3C77E", "#B8CEB5"))
            if rng.random() < 0.5:
                d.line((x, y, x + 8, y + 13), fill=fill, width=5)
            else:
                d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=fill)

    footer_field(im, c["foot"], fade=slug in ("space-explorer", "starlight-observatory", "green-earth"))
    # A small centered ornament above/below the reserved footer, not inside it.
    ornament = {
        "laser-lab": "bolt", "robot-friends": "sparkle", "science-doodles": "atom",
        "space-explorer": "planet", "lab-stripes": "flask", "green-earth": "sprout",
        "drone-garden": "flower", "time-capsule-film": None,
        "starlight-observatory": "sparkle", "anniversary-party": "ribbon",
    }[slug]
    if ornament:
        footer_colors = {**c, "bg": c["foot"]}
        if slug in ("space-explorer", "starlight-observatory", "laser-lab"):
            footer_colors["ink"] = c["accent"]
        motif(im, ornament, 600, 3500, 42, footer_colors)
        d = ImageDraw.Draw(im)
        for a, b in ((344, 545), (655, 856)):
            d.line((a, 3500, b, 3500), fill=footer_colors["ink"], width=3)
    return im


def border_and_mask(image, slug):
    d = ImageDraw.Draw(image)
    c = THEMES[slug]
    mask = Image.new("L", (W, H), 255)
    md = ImageDraw.Draw(mask)
    for index, (x0, y0, x1, y1) in enumerate(WINDOWS):
        border = c["ink"]
        width = 4
        if slug in ("space-explorer", "starlight-observatory"):
            border = "#DDE0EE"
        elif slug == "laser-lab":
            border = c["ink"]
            width = 7
        elif slug == "robot-friends":
            border = ("#BED6CC", "#D8C9DC", "#D9CDAD", "#BED7E3")[index]
            width = 5
        elif slug == "time-capsule-film":
            border = "#89858B"
            width = 3
        elif slug == "lab-stripes":
            border = "#C5A763"
        d.rounded_rectangle((x0 - width, y0 - width, x1 + width - 1, y1 + width - 1), radius=28 + width, fill=border)
        md.rounded_rectangle((x0, y0, x1 - 1, y1 - 1), radius=28, fill=0)
        if slug == "robot-friends":
            # Gentle scallops occupy at most 10 pixels of the permitted 40px ring.
            for y in range(y0 + 38, y1 - 28, 56):
                for x in (x0 - 12, x1 + 11):
                    box = (x - 22, y - 22, x + 22, y + 22)
                    d.ellipse(box, fill=border)
                    md.ellipse(box, fill=255)
            for x in range(x0 + 42, x1 - 28, 56):
                for y in (y0 - 12, y1 + 11):
                    box = (x - 22, y - 22, x + 22, y + 22)
                    d.ellipse(box, fill=border)
                    md.ellipse(box, fill=255)
    image.putalpha(mask)


def load_asset(name, root):
    path = root / "assets" / f"{name}.png"
    if not path.is_file():
        raise FileNotFoundError(f"Required original illustration is missing: {path}")
    with Image.open(path) as source:
        source.load()
        if "A" not in source.getbands():
            raise ValueError(f"Asset must have real transparency, not a white/checkerboard background: {path}")
        asset = source.convert("RGBA")
    alpha = asset.getchannel("A")
    if alpha.getextrema()[0] == 255:
        raise ValueError(f"Asset has no transparent pixels: {path}")
    bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        raise ValueError(f"Asset is completely transparent: {path}")
    return asset.crop(bbox)


def fit_asset(asset, width, height):
    copy = asset.copy()
    copy.thumbnail((width, height), RESAMPLE)
    return copy


def composite_art(image, asset, box, bottom=False):
    x0, y0, x1, y1 = box
    copy = fit_asset(asset, x1 - x0, y1 - y0)
    x = x0 + (x1 - x0 - copy.width) // 2
    y = y1 - copy.height if bottom else y0 + (y1 - y0 - copy.height) // 2
    image.alpha_composite(copy, (x, y))


def add_illustrations(image, slug, assets):
    """Intact mascots: narrow window-edge stickers and the two footer gutters."""
    c = THEMES[slug]
    names = ASSETS.get(slug, [])
    if names:
        first = assets[names[0]]
        composite_art(image, first, (74, 3070, 156, 3260))
        other = assets[names[-1]]
        composite_art(image, other, (1044, 3220, 1126, 3400))
        # Every sticker is ≤56 ×112, and stays left of x132 or right of x1068.
        if slug == "robot-friends":
            placements = [(72, 408, 128, 520), (1072, 1112, 1128, 1224), (72, 1818, 128, 1930), (1072, 2524, 1128, 2636)]
            for name, box in zip(names, placements):
                composite_art(image, assets[name], box)
        elif slug in ("science-doodles", "lab-stripes", "green-earth", "drone-garden", "anniversary-party"):
            composite_art(image, first, (1072, 1804, 1128, 1916))
        elif slug == "space-explorer":
            composite_art(image, first, (72, 2494, 128, 2606))
        elif slug == "starlight-observatory":
            composite_art(image, first, (1072, 2520, 1128, 2632))

    # Secondary footer symbols stay wholly inside the 72px print-safe boundary.
    footer_colors = {**c, "bg": c["foot"]}
    if slug in ("space-explorer", "starlight-observatory", "laser-lab"):
        footer_colors["ink"] = c["accent"]
    if slug == "laser-lab":
        motif(image, "gear", 114, 3150, 78, footer_colors)
        motif(image, "bolt", 1086, 3310, 74, footer_colors)
    elif slug == "science-doodles":
        motif(image, "flask", 1086, 3075, 64, footer_colors, -8)
    elif slug == "space-explorer":
        motif(image, "rocket", 1086, 3080, 66, footer_colors)
        motif(image, "planet", 114, 3390, 62, footer_colors)
    elif slug == "lab-stripes":
        motif(image, "tube", 1086, 3070, 64, footer_colors, 6)
    elif slug == "green-earth":
        motif(image, "wind", 1086, 3095, 68, footer_colors)
        motif(image, "sprout", 114, 3380, 64, footer_colors)
    elif slug == "drone-garden":
        motif(image, "flower", 1086, 3070, 72, footer_colors, mono=True)
        motif(image, "sprout", 114, 3380, 60, footer_colors, mono=True)
    elif slug == "starlight-observatory":
        motif(image, "telescope", 1086, 3075, 72, footer_colors)
    elif slug == "anniversary-party":
        motif(image, "balloon", 1086, 3070, 70, footer_colors)
        motif(image, "ribbon", 114, 3390, 64, footer_colors)


def assert_contract(image, slug):
    if image.mode != "RGBA" or image.size != (W, H):
        raise AssertionError(f"{slug}: wrong mode or dimensions")
    alpha = image.getchannel("A")
    outside = Image.new("L", (W, H), 255)
    od = ImageDraw.Draw(outside)
    for x0, y0, x1, y1 in WINDOWS:
        safe = alpha.crop((x0 + 40, y0 + 40, x1 - 40, y1 - 40))
        if safe.getextrema() != (0, 0):
            raise AssertionError(f"{slug}: a decoration entered a photo safety rectangle")
        od.rectangle((x0, y0, x1 - 1, y1 - 1), fill=0)
    outside_alpha = ImageChops.multiply(alpha, outside)
    if ImageChops.difference(outside_alpha, outside).getbbox():
        raise AssertionError(f"{slug}: transparency exists outside a photo rectangle")
    for lo, hi in image.crop(TEXT_REGION).convert("RGB").getextrema():
        if lo != hi:
            raise AssertionError(f"{slug}: the reserved footer text field is not perfectly calm")


def read_manifest(root):
    path = root / "manifest.json"
    with path.open(encoding="utf-8") as stream:
        manifest = json.load(stream)
    if isinstance(manifest, dict):
        manifest = manifest.get("frames")
    if not isinstance(manifest, list):
        raise ValueError("manifest.json must be an array, or an object with a frames array")
    entries = {entry["id"]: entry for entry in manifest}
    missing = set(THEMES) - entries.keys()
    if missing:
        raise ValueError(f"manifest.json is missing frame IDs: {sorted(missing)}")
    return entries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--only", nargs="+", choices=list(THEMES), help="Build selected frame IDs only")
    args = parser.parse_args()
    root = args.root.resolve()
    manifest = read_manifest(root)
    selected = args.only or list(THEMES)
    # Validate all selected inputs before writing any output.
    needed = {name for slug in selected for name in ASSETS.get(slug, [])}
    assets = {name: load_asset(name, root) for name in sorted(needed)}
    for slug in selected:
        # The application palette is authoritative for the reserved text field.
        THEMES[slug]["foot"] = manifest[slug]["background"]
        image = draw_background(slug)
        border_and_mask(image, slug)
        add_illustrations(image, slug, assets)
        assert_contract(image, slug)
        destination = root / manifest[slug]["file"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, format="PNG", optimize=True, compress_level=9, icc_profile=SRGB, dpi=(600, 600))
        size = destination.stat().st_size
        fallback = ""
        if size > 2 * 1024 * 1024:
            webp = destination.with_suffix(".webp")
            image.save(webp, format="WEBP", lossless=True, quality=100, method=6, icc_profile=SRGB, exact=True)
            fallback = f"; lossless alternative: {webp.name}"
        print(f"{destination.relative_to(root)}: 1200×3600 RGBA, {size / 1024:.1f} KiB, contract PASS{fallback}")


if __name__ == "__main__":
    main()
