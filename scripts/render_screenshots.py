"""Render dev/test_v2 messages as phone-style chat screenshots for OCR testing (T13).

Writes data/images/screenshots/<id>_<style>.png (light and dark) and manifest.csv.
These are synthetic renders, not real phone screenshots; see data/images/CAPTURE-CHECKLIST.md.

Run from the repo root (laptop only):
    pip install -r scripts/requirements.txt
    python scripts/render_screenshots.py
"""

import csv
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "images" / "screenshots"
W, H = 720, 1280

# 10 scam + 10 legit, fixed so reruns produce the same files.
PICK = [
    "dev-s001", "dev-s005", "dev-s007", "dev-s011", "dev-s012",
    "tv2-s002", "tv2-s006", "tv2-s009", "tv2-s014", "tv2-s018",
    "dev-l001", "dev-l004", "dev-l007", "dev-l010", "dev-l013",
    "tv2-l001", "tv2-l005", "tv2-l013", "tv2-l021", "tv2-l032",
]

STYLES = {
    "light": {"bg": "#FFFFFF", "bar": "#F2F2F2", "text": "#111111", "muted": "#6B6B6B",
              "bubble": "#E9E9EB", "accent": "#1A73E8"},
    "dark": {"bg": "#121212", "bar": "#1E1E1E", "text": "#EDEDED", "muted": "#9A9A9A",
             "bubble": "#2C2C2E", "accent": "#8AB4F8"},
}

FONT_CANDIDATES = [
    "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf",
]


def font(size: int):
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def load_rows():
    rows = {}
    for path in [ROOT / "data" / "dev" / "dev.csv", ROOT / "data" / "test_v2" / "test_v2.csv"]:
        with open(path, encoding="utf-8", newline="") as f:
            for r in csv.DictReader(f):
                rows[r["id"]] = r
    return rows


def sender_for(row) -> str:
    m = re.match(r"^([A-Za-z0-9&\-. ]{2,24}):", row["text"])
    if m and row["channel"] == "sms":
        return m.group(1).strip()
    if row["channel"] in ("messenger", "marketplace"):
        return "Juan Dela Cruz"
    return "+63 9XX XXX XXXX"


def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=fnt) <= width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def render(row, style_name):
    s = STYLES[style_name]
    img = Image.new("RGB", (W, H), s["bg"])
    d = ImageDraw.Draw(img)
    small, body, title = font(22), font(30), font(32)

    # Status bar and header.
    d.text((28, 14), "9:41", font=small, fill=s["text"])
    d.text((W - 120, 14), "4G  85%", font=small, fill=s["text"])
    d.rectangle([0, 56, W, 156], fill=s["bar"])
    d.text((28, 82), "‹", font=title, fill=s["accent"])
    d.ellipse([70, 76, 122, 128], fill=s["accent"])
    name = sender_for(row)
    d.text((86, 86), name[:1].upper(), font=title, fill=s["bg"])
    d.text((140, 88), name, font=title, fill=s["text"])

    # Incoming bubble.
    d.text((W // 2 - 60, 190), "Today 9:38 AM", font=small, fill=s["muted"])
    lines = wrap(d, row["text"], body, W - 200)
    line_h = 40
    top, left = 240, 28
    bubble_w = max(d.textlength(line, font=body) for line in lines) + 48
    bubble_h = line_h * len(lines) + 36
    d.rounded_rectangle([left, top, left + bubble_w, top + bubble_h], radius=28, fill=s["bubble"])
    for i, line in enumerate(lines):
        d.text((left + 24, top + 18 + i * line_h), line, font=body, fill=s["text"])

    # Composer bar.
    d.rounded_rectangle([24, H - 110, W - 24, H - 40], radius=35, outline=s["muted"], width=2)
    d.text((56, H - 92), "Text message", font=body, fill=s["muted"])
    return img


def main():
    rows = load_rows()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for rid in PICK:
        row = rows[rid]
        for style in STYLES:
            name = f"{rid}_{style}.png"
            render(row, style).save(OUT / name, optimize=True)
            manifest.append({"file": name, "text": row["text"], "label": row["label"],
                             "category": row["category"], "split": row["split"], "style": style})
    with open(OUT / "manifest.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "text", "label", "category", "split", "style"],
                           quoting=csv.QUOTE_ALL, lineterminator="\n")
        w.writeheader()
        w.writerows(manifest)
    print(f"Wrote {len(manifest)} images to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
