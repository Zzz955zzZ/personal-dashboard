"""
Generate PWA icons from user's reference image.
Source: user-provided olive-green squircle + "955" text icon.
Output: icon-192.png, icon-512.png, favicon.ico
"""
import os
from PIL import Image

SRC = r"E:\Usuario\Downloads\App icon with rounded square shape, olive green background color, white bold text _955_ in center, minimalist design style, same visual style as the reference image.jpg"
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
FAV_PATH = os.path.join(os.path.dirname(OUT_DIR), 'favicon.ico')

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # Open source — it's already a nice square icon
    img = Image.open(SRC).convert('RGBA')

    # If not square, crop to square from center
    w, h = img.size
    if w != h:
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        img = img.crop((left, top, left + side, top + side))

    # Generate sizes
    for size in (192, 512):
        resized = img.resize((size, size), Image.LANCZOS)
        path = os.path.join(OUT_DIR, f'icon-{size}.png')
        resized.save(path, 'PNG')
        print(f'  {size}x{size} -> {path} ({os.path.getsize(path)} bytes)')

    # Favicon ICO (multi-size for best quality across contexts)
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = [img.resize(s, Image.LANCZOS) for s in ico_sizes]
    ico_images.append(img.resize((512, 512), Image.LANCZOS))
    # Save as ICO
    ico_base = ico_images[0]  # use first as base
    ico_base.save(
        FAV_PATH,
        format='ICO',
        sizes=[(i.width, i.height) for i in ico_images],
    )
    print(f'  favicon   -> {FAV_PATH} ({os.path.getsize(FAV_PATH)} bytes)')
    print('Done!')

if __name__ == '__main__':
    main()
