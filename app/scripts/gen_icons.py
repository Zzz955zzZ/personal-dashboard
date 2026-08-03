"""
Generate PWA icons (192 & 512 px) — brand: coral bg + white plate + green leaf.
Pure Python, no third-party deps. Output: public/icons/icon-{size}.png
"""
import zlib, struct, math, random

def png(w, h, pixels):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw.extend(pixels[y])
    def chunk(typ, data):
        c = struct.pack('>I', len(data)) + typ + data
        c += struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)
        return c
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

def lerp(a, b, t): return a + (b - a) * t
def clamp(v, lo=0, hi=255): return max(lo, min(hi, int(v)))

# Brand palette
CORAL      = (242, 163, 156)   # #F2A39C
CORAL_DARK = (220, 120, 114)   # darker edge
LEAF       = (79, 166, 107)    # #4FA66B
LEAF_DARK  = (56, 138, 80)     # shadow
WHITE      = (255, 255, 255)
SHADOW     = (180, 150, 140)

def make(size):
    cx, cy = size / 2.0, size / 2.0
    # Rounded rect mask
    rr = size * 0.18  # corner radius

    def in_roundrect(x, y):
        # distance to nearest edge, with corner rounding
        dx = abs(x - cx) - (size / 2.0 - rr)
        dy = abs(y - cy) - (size / 2.0 - rr)
        if dx > 0 and dy > 0:
            return math.hypot(dx, dy) <= rr
        return (abs(x - cx) <= size / 2.0) and (abs(y - cy) <= size / 2.0)

    # Sub-pixel antialiasing: sample 2x2 per pixel
    px = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            r, g, b, a = 0, 0, 0, 0
            for sy in (0.25, 0.75):
                for sx in (0.25, 0.75):
                    px_ = x + sx
                    py_ = y + sy
                    inside = in_roundrect(px_, py_)
                    if not inside:
                        continue
                    d = math.hypot(px_ - cx, py_ - cy)
                    max_r = size * 0.46

                    # Background: radial gradient coral -> slightly darker at edges
                    t_edge = min(1, d / max_r)
                    bg_r = lerp(CORAL[0], CORAL_DARK[0], t_edge ** 1.5)
                    bg_g = lerp(CORAL[1], CORAL_DARK[1], t_edge ** 1.5)
                    bg_b = lerp(CORAL[2], CORAL_DARK[2], t_edge ** 1.5)

                    cr, cg, cb = bg_r, bg_g, bg_b

                    # White plate (circle, offset slightly up-center)
                    plate_cx = cx
                    plate_cy = cy - size * 0.04
                    plate_r = size * 0.28
                    dp = math.hypot(px_ - plate_cx, py_ - plate_cy)
                    if dp <= plate_r:
                        # Plate shadow (inner bottom-right)
                        shadow_off_x = size * 0.015
                        shadow_off_y = size * 0.02
                        ds = math.hypot((px_ - plate_cx) - shadow_off_x, (py_ - plate_cy) - shadow_off_y)
                        in_shadow = (plate_r * 0.6 < ds <= plate_r)
                        # Plate edge highlight
                        edge_t = dp / plate_r
                        highlight = 0.85 + 0.15 * math.cos(edge_t * math.pi)  # brighter near center
                        cr = WHITE[0] * highlight
                        cg = WHITE[1] * highlight
                        cb = WHITE[2] * highlight
                        if in_shadow:
                            cr *= 0.92; cg *= 0.90; cb *= 0.88

                    # Leaf (ellipse rotated ~35deg, sitting on the plate)
                    leaf_cx = cx + size * 0.01
                    leaf_cy = cy - size * 0.03
                    # Rotate point into leaf-local coords
                    angle = math.radians(-35)
                    lx = (px_ - leaf_cx) * math.cos(angle) - (py_ - leaf_cy) * math.sin(angle)
                    ly = (px_ - leaf_cx) * math.sin(angle) + (py_ - leaf_cy) * math.cos(angle)
                    leaf_rx = size * 0.16
                    leaf_ry = size * 0.10
                    if (lx * lx) / (leaf_rx * leaf_rx) + (ly * ly) / (leaf_ry * leaf_ry) <= 1:
                        # Leaf gradient: lighter top-left, darker bottom-right
                        lt = clamp(0.5 + (lx / leaf_rx) * 0.35 - (ly / leaf_ry) * 0.3)
                        cr = lerp(LEAF_DARK[0], LEAF[0], lt)
                        cg = lerp(LEAF_DARK[1], LEAF[1], lt)
                        cb = lerp(LEAF_DARK[2], LEAF[2], lt)
                        # Leaf vein (center line)
                        if abs(lx) < size * 0.012:
                            vein_t = 1 - abs(lx) / (size * 0.012)
                            cr = lerp(cr, LEAF_DARK[0], vein_t * 0.5)
                            cg = lerp(cg, LEAF_DARK[1], vein_t * 0.5)
                            cb = lerp(cb, LEAF_DARK[2], vein_t * 0.5)

                    # Fork (two thin lines crossing the plate area, right side)
                    fork_cx = cx + size * 0.10
                    fork_cy = cy + size * 0.04
                    # Transform to fork-local (rotated ~20deg)
                    fa = math.radians(18)
                    fx = (px_ - fork_cx) * math.cos(fa) - (py_ - fork_cy) * math.sin(fa)
                    fy = (px_ - fork_cx) * math.sin(fa) + (py_ - fork_cy) * math.cos(fa)
                    fork_thick = size * 0.022
                    fork_len = size * 0.17
                    # Handle (vertical-ish in local coords)
                    if abs(fx) < fork_thick * 0.55 and -fork_len * 0.1 <= fy <= fork_len * 0.95:
                        ft = 0.7 + 0.3 * (fy / fork_len)  # gradient along handle
                        cr = lerp(cr, SHADOW[0] * ft, 0.75)
                        cg = lerp(cg, SHADOW[1] * ft, 0.75)
                        cb = lerp(cb, SHADOW[2] * ft, 0.75)
                    # Tines (3 prongs at top of handle)
                    tine_base_y = fork_len * 0.65
                    tine_w = fork_thick * 0.45
                    for ti, tine_angle in enumerate([-28, 0, 28]):
                        ta = math.radians(tine_angle)
                        tx = fx - (tine_base_y - fy) * math.sin(ta) * 0.38
                        ty_abs = fy - tine_base_y
                        if ty_abs > 0 and ty_abs < fork_len * 0.35:
                            spread = ty_abs / (fork_len * 0.35)
                            tx_centered = tx - math.tan(ta) * (tine_base_y - fy) * 0.38
                            if abs(tx_centered) < tine_w * (1 - spread * 0.4):
                                cr = lerp(cr, SHADOW[0], 0.65)
                                cg = lerp(cg, SHADOW[1], 0.65)
                                cb = lerp(cb, SHADOW[2], 0.65)

                    r += cr; g += cg; b += cb; a += 255
                row += bytes((
                    clamp(r / 4), clamp(g / 4), clamp(b / 4),
                    255 if a > 127 else 0,
                ))
        px.append(row)
    return png(size, size, px)

for s in (192, 512):
    path = 'E:/955_WorkSpace/app/public/icons/icon-%d.png' % s
    with open(path, 'wb') as f:
        f.write(make(s))
    import os
    print('wrote', s, os.path.getsize(path), 'bytes')
