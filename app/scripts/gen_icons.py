import zlib, struct, math

def png(width, height, pixels):
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y])
    def chunk(typ, data):
        c = struct.pack('>I', len(data)) + typ + data
        c += struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)
        return c
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

def make(size):
    bg = (0xF2, 0xA3, 0x9C)      # brand coral
    white = (255, 255, 255)
    leaf = (0x4F, 0xA6, 0x6B)
    px = []
    r_leaf = size * 0.30
    for y in range(size):
        row = bytearray()
        for x in range(size):
            dx = x - size / 2.0
            dy = y - size / 2.0
            c = bg
            d = math.hypot(dx, dy)
            if d <= size * 0.34:
                c = white
                a = math.radians(40)
                lx = (dx * math.cos(a) + dy * math.sin(a))
                ly = (-dx * math.sin(a) + dy * math.cos(a))
                if (lx * lx) / (r_leaf * r_leaf) + (ly * ly) / ((r_leaf * 0.62) * (r_leaf * 0.62)) <= 1:
                    c = leaf
            row += bytes((c[0], c[1], c[2], 255))
        px.append(row)
    return png(size, size, px)

for s in (192, 512):
    with open('E:/955_WorkSpace/app/public/icons/icon-%d.png' % s, 'wb') as f:
        f.write(make(s))
    print('wrote', s)
