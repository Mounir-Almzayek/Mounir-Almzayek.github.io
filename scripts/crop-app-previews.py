"""Trim only contiguous near-black outer screenshot bands; retain original files."""
from pathlib import Path
from PIL import Image, ImageOps
import json
import argparse

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "scripts/app-preview-sources.json").read_text())
TEMPLATE = ROOT / "src/templates/apps.html"

def band_length(image, bottom=False):
    width, height = image.size
    pixels = image.load()
    # Sample outer quarters and the whole row. The Android gesture pill may
    # occupy the center of an otherwise solid black navigation strip.
    xs = list(range(0, width, max(1, width // 160)))
    sides = [x for x in xs if x < width * .24 or x >= width * .76]
    limit = max(1, int(height * .09))
    def black(x, y):
        r, g, b = pixels[x, y]
        return max(r, g, b) <= 35 and max(r, g, b) - min(r, g, b) <= 14
    count = 0
    for offset in range(limit):
        y = height - 1 - offset if bottom else offset
        if (sum(black(x, y) for x in sides) / len(sides) >= .97
                and sum(black(x, y) for x in xs) / len(xs) >= .62):
            count += 1
        else:
            break
    # A dark application screen is not a letterbox: reject very large runs.
    return count if 3 <= count < limit else 0

def process():
    report = []
    template = TEMPLATE.read_text()
    for item in MANIFEST:
        source, target = ROOT / item["source"], ROOT / item["output"]
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
        width, height = image.size
        top, bottom = band_length(image), band_length(image, True)
        cropped = image.crop((0, top, width, height - bottom))
        assert cropped.width == width and cropped.height >= height * .82
        target.parent.mkdir(parents=True, exist_ok=True)
        cropped.save(target, "WEBP", lossless=True, method=6)
        report.append({**item, "original": [width,height], "result": list(cropped.size),
                       "trim_top": top, "trim_bottom": bottom})
        old = 'src="{{@assetPrefix}}' + item["source"] + '"'
        new = 'src="{{@assetPrefix}}' + item["output"] + '"'
        if old not in template and new not in template:
            raise ValueError("Screenshot not found: " + item["source"])
        template = template.replace(old, new)
    if not any(row["trim_top"] or row["trim_bottom"] for row in report):
        raise RuntimeError("No black screenshot bands detected")
    TEMPLATE.write_text(template)
    (ROOT / "assets/previews/cropped/report.json").write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    process()
