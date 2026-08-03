"""
Generate PWA icons (192 & 512 px) — style: rounded square bg + white "955" text.
Reference: green squircle with white character (like 胡楚靓工作台 app icon).
Uses Pillow. Output: public/icons/icon-{size}.png + favicon.ico
"""
import math, os

from PIL import Image, ImageDraw, ImageFont


# ── Config ──────────────────────────────────────────────────────────────
BG_COLOR       = (45, 125, 95)    # deep teal-green (#2D7D5F)
TEXT_COLOR     = (255, 255, 255)  # white
CORNER_RATIO   = 0.22             # corner radius as fraction of size
TEXT_RATIO     = 0.52             # text height as fraction of size
ICON_SIZES     = (192, 512)
OUT_DIR        = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')


def make_icon(size: int) -> Image.Image:
    """Draw a rounded-square icon with centered '955' text."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cr = int(size * CORNER_RATIO)  # corner radius

    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=cr,
        fill=(*BG_COLOR, 255),
    )

    # Load font — try bold system fonts, fall back to default
    font = _load_font(size)

    text = '955'
    # Center text
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2
    y = (size - th) / 2 + size * 0.02  # slight visual center adjustment

    draw.text((x, y), text, fill=(*TEXT_COLOR, 255), font=font)

    return img


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    """Load a suitable bold font; scale with icon size."""
    target_px = int(size * TEXT_RATIO)

    # Try common Windows/fonts in order of preference
    font_candidates = [
        # Full paths for Windows
        ('C:/Windows/Fonts/arialbd.ttf', 'Arial Bold'),
        ('C:/Windows/Fonts/arial.ttf',  'Arial'),
        ('C:/Windows/Fonts/ahronbd.ttf', 'Aharoni Bold'),
        ('C:/Windows/Fonts/tahomabd.ttf', 'Tahoma Bold'),
        # Generic names (works on some systems)
        (None, 'DejaVuSans-Bold'),
        (None, 'FreeSansBold'),
    ]

    errors = []
    for path, name in font_candidates:
        try:
            if path and os.path.exists(path):
                return ImageFont.truetype(path, target_px)
            else:
                return ImageFont.truetype(name, target_px)
        except (IOError, OSError) as e:
            errors.append(f'{name}: {e}')

    # Absolute fallback
    try:
        return ImageFont.load_default()
    except Exception:
        pass

    raise RuntimeError(f'No usable font found: {errors}')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    for s in ICON_SIZES:
        img = make_icon(s)
        path = os.path.join(OUT_DIR, f'icon-{s}.png')
        img.save(path, 'PNG')
        print(f'wrote {s}x{s} -> {path} ({os.path.getsize(path)} bytes)')

    # Also save a copy at 512 for favicon conversion
    img512 = make_icon(512)
    fav_path = os.path.join(os.path.dirname(OUT_DIR), 'favicon.ico')
    # ICO needs multi-size; we embed 16,32,48,64 from the 512 source
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    ico_images = [img512.resize(s, Image.LANCZOS) for s in ico_sizes]
    ico_images.append(img512)  # also include full 512
    img512.save(fav_path, format='ICO', sizes=[(i.width, i.height) for i in ico_images])
    print(f'wrote favicon -> {fav_path} ({os.path.getsize(fav_path)} bytes)')


if __name__ == '__main__':
    main()
