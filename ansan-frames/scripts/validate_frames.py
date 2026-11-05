#!/usr/bin/env python3
"""Validate the exact ANSAN overlay contract and save validation-report.json.

Pixel rectangles use half-open coordinates [x0:x1, y0:y1], matching image
compositing code. Manual illustration, copyright, text and 72px bleed checks
cannot be inferred from alpha values and are recorded separately.
Requires Pillow and numpy.
"""
from __future__ import annotations

import argparse
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms


EXPECTED_SIZE = (1200, 3600)
WINDOW_YS = (120, 826, 1532, 2238)
WINDOWS = [(92, y, 1108, y + 678) for y in WINDOW_YS]
SAFE_RECTS = [(132, y + 40, 1068, y + 638) for y in WINDOW_YS]
FOOTER = (160, 2970, 1040, 3470)
REQUIRED_COLORS = ("title", "sub", "foot", "footSub", "pill", "pillText", "pillYear")
MAX_FILE_BYTES = 2 * 1024 * 1024


def image_record(path: Path, expected_format: str, expected_size: tuple | None = None) -> dict:
    result = {"exists": path.is_file()}
    if not result["exists"]:
        return result
    try:
        with Image.open(path) as im:
            result.update(format=im.format, mode=im.mode, size=list(im.size))
            result["format_ok"] = im.format == expected_format
            if expected_size is not None:
                result["size_ok"] = im.size == expected_size
            im.verify()
        result["decodes"] = True
    except Exception as exc:
        result["decodes"] = False
        result["error"] = str(exc)
    return result


def inspect_frame(root: Path, entry: dict) -> dict:
    record = {"id": entry.get("id"), "name": entry.get("name"), "file": entry.get("file"), "errors": [], "warnings": []}
    errors = record["errors"]
    missing = [key for key in ("id", "name", "file", "reference", "tone", "colors") if key not in entry]
    if missing:
        errors.append(f"Missing manifest keys: {missing}")
    for key in REQUIRED_COLORS:
        if key not in entry.get("colors", {}):
            errors.append(f"Missing manifest colors.{key}")
    path = root / entry.get("file", "__missing__")
    if not path.is_file():
        errors.append("Final frame file is missing")
        record["passed"] = False
        return record
    record["file_bytes"] = path.stat().st_size
    record["max_file_bytes"] = MAX_FILE_BYTES
    record["file_size_ok"] = record["file_bytes"] <= MAX_FILE_BYTES
    if not record["file_size_ok"]:
        errors.append("RGBA PNG exceeds 2 MiB")
    try:
        with Image.open(path) as source:
            source.load()
            record.update(format=source.format, mode=source.mode, size=list(source.size))
            record["size_ok"] = source.size == EXPECTED_SIZE
            record["mode_ok"] = source.mode == "RGBA"
            if source.format != "PNG":
                errors.append("Final frame is not PNG")
            if not record["size_ok"]:
                errors.append("Final frame must be exactly 1200×3600")
            if not record["mode_ok"]:
                errors.append("Final frame mode must be RGBA")
            dpi = source.info.get("dpi")
            record["dpi"] = list(dpi) if dpi else None
            record["dpi_600_ok"] = bool(dpi and all(abs(v - 600) < 0.1 for v in dpi))
            if not record["dpi_600_ok"]:
                errors.append("600 dpi PNG metadata is absent or incorrect")
            profile = source.info.get("icc_profile")
            record["icc_profile_bytes"] = len(profile) if profile else 0
            record["srgb_ok"] = False
            if profile:
                try:
                    parsed = ImageCms.ImageCmsProfile(io.BytesIO(profile))
                    description = ImageCms.getProfileDescription(parsed).strip()
                    record["icc_description"] = description
                    record["srgb_ok"] = "srgb" in description.lower()
                except Exception as exc:
                    record["icc_error"] = str(exc)
            if not record["srgb_ok"]:
                errors.append("A valid embedded sRGB ICC profile is required")
            if record["size_ok"] and record["mode_ok"]:
                pixels = np.asarray(source)
                alpha = pixels[:, :, 3]
                outside_mask = np.ones(alpha.shape, dtype=bool)
                windows = []
                for index, (window, safe) in enumerate(zip(WINDOWS, SAFE_RECTS), 1):
                    x0, y0, x1, y1 = window
                    sx0, sy0, sx1, sy1 = safe
                    outside_mask[y0:y1, x0:x1] = False
                    safe_alpha = alpha[sy0:sy1, sx0:sx1]
                    violations = int(np.count_nonzero(safe_alpha))
                    local_nonopaque = alpha[y0:y1, x0:x1] < 255
                    coords = np.argwhere(local_nonopaque)
                    observed = None
                    if len(coords):
                        observed = [int(coords[:, 1].min()) + x0, int(coords[:, 0].min()) + y0,
                                    int(coords[:, 1].max()) + x0 + 1, int(coords[:, 0].max()) + y0 + 1]
                    windows.append({"number": index, "rectangle": list(window), "safe_rectangle": list(safe),
                                    "default_corner_radius": 28, "safe_alpha_min": int(safe_alpha.min()),
                                    "safe_alpha_max": int(safe_alpha.max()), "safe_nonzero_pixels": violations,
                                    "safe_fully_transparent": violations == 0, "observed_nonopaque_bounds": observed})
                    if violations:
                        errors.append(f"Window {index}: {violations} safe-rectangle pixels have nonzero alpha")
                record["windows"] = windows
                outside_alpha = alpha[outside_mask]
                outside_violations = int(np.count_nonzero(outside_alpha != 255))
                record["outside_window_nonopaque_pixels"] = outside_violations
                record["outside_windows_fully_opaque"] = outside_violations == 0
                if outside_violations:
                    errors.append(f"{outside_violations} pixels outside the four windows are not alpha 255")
                fx0, fy0, fx1, fy1 = FOOTER
                footer = pixels[fy0:fy1, fx0:fx1, :3].astype(np.float64)
                luminance = footer @ np.array([0.2126, 0.7152, 0.0722])
                footer_std = float(luminance.std())
                record["footer"] = {"rectangle": list(FOOTER), "rgb_mean": footer.mean(axis=(0, 1)).round(4).tolist(),
                                    "rgb_std": footer.std(axis=(0, 1)).round(4).tolist(),
                                    "luminance_mean": round(float(luminance.mean()), 6),
                                    "luminance_std": round(footer_std, 6), "advisory_std_threshold": 12,
                                    "quiet_background_advisory_pass": footer_std <= 12}
                if footer_std > 12:
                    record["warnings"].append("Footer luminance standard deviation exceeds advisory value 12; review text readability visually. The brief supplies no numeric cutoff.")
    except Exception as exc:
        errors.append(f"Unable to inspect final PNG: {type(exc).__name__}: {exc}")
    stem = path.stem
    thumb_path = root / entry.get("thumb", entry.get("thumbnail", f"thumbs/{stem}.webp"))
    preview_path = root / entry.get("preview", f"previews/{stem}.jpg")
    record["thumbnail"] = {"file": str(thumb_path.relative_to(root)), **image_record(thumb_path, "WEBP", (240, 720))}
    record["preview"] = {"file": str(preview_path.relative_to(root)), **image_record(preview_path, "JPEG")}
    for key in ("thumbnail", "preview"):
        asset = record[key]
        if not asset.get("exists") or not asset.get("decodes") or not asset.get("format_ok") or asset.get("size_ok") is False:
            errors.append(f"{key.capitalize()} is missing, unreadable, or has the wrong format/dimensions")
    record["manual_review"] = {
        "status": "required",
        "outer_bleed_px": 72,
        "checks": [
            "No important illustration lies in the outer 72px trim band; background patterns may bleed.",
            "No letters, digits, logos, signatures, watermarks, recognizable protected characters or branded symbols in final frame artwork.",
            "At most three overlapping stickers per photo window; each is at most 120×120px and stays outside the safe rectangle.",
            "Footer is visually quiet and the suggested manifest text colors remain legible.",
            "Illustration line weights and details remain readable at final printed size.",
        ],
    }
    record["passed"] = not errors
    return record


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    report = {"generated_at": datetime.now(timezone.utc).isoformat(), "root": str(root),
              "contract": {"size": list(EXPECTED_SIZE), "mode": "RGBA", "windows": [list(rect) for rect in WINDOWS],
                           "safe_rectangles": [list(rect) for rect in SAFE_RECTS], "coordinates": "half-open", "default_corner_radius": 28},
              "errors": [], "frames": []}
    try:
        data = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
        entries = data if isinstance(data, list) else data.get("frames", [])
        if len(entries) != 10:
            report["errors"].append(f"Expected exactly 10 manifest entries, found {len(entries)}")
        ids = [entry.get("id") for entry in entries]
        if len(set(ids)) != len(ids):
            report["errors"].append("Manifest frame IDs are not unique")
        files = [entry.get("file") for entry in entries]
        if len(set(files)) != len(files):
            report["errors"].append("Manifest frame filenames are not unique")
        for entry in entries:
            record = inspect_frame(root, entry)
            report["frames"].append(record)
            status = "PASS" if record["passed"] else "FAIL"
            std = record.get("footer", {}).get("luminance_std", "n/a")
            print(f"{status} {record['id']}: {record.get('file_bytes', 0):,} bytes; footer luminance std={std}")
            for error in record["errors"]:
                print(f"  ERROR: {error}")
        report["contact_sheet"] = image_record(root / "contact-sheet.jpg", "JPEG")
        if not all(report["contact_sheet"].get(key) for key in ("exists", "decodes", "format_ok")):
            report["errors"].append("contact-sheet.jpg is missing or unreadable")
    except Exception as exc:
        report["errors"].append(f"Validation failed: {type(exc).__name__}: {exc}")
    report["automatic_pass"] = not report["errors"] and bool(report["frames"]) and all(frame["passed"] for frame in report["frames"])
    report["manual_review_status"] = "required; record the visual review in README.md"
    report["summary"] = {"total": len(report["frames"]), "passed": sum(frame["passed"] for frame in report["frames"]),
                         "failed": sum(not frame["passed"] for frame in report["frames"]),
                         "warning_count": sum(len(frame["warnings"]) for frame in report["frames"])}
    destination = root / "validation-report.json"
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Report: {destination}")
    for error in report["errors"]:
        print(f"ERROR: {error}")
    print("Automatic contract validation passed; manual visual review remains required." if report["automatic_pass"] else "Automatic contract validation FAILED.")
    return 0 if report["automatic_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
