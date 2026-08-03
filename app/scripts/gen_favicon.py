"""Generate public/favicon.ico from the existing PNG icons.

ICO can store PNG-compressed images directly, so we wrap the 192px and 512px
PNGs (the latter marked as 256 in the 1-byte dimension field, with the real
size read from the PNG header by browsers). Pure stdlib, no third-party deps.
"""
import struct

ICONS_DIR = 'E:/955_WorkSpace/app/public/icons'
OUT = 'E:/955_WorkSpace/app/public/favicon.ico'


def read_png(name):
    with open(f'{ICONS_DIR}/{name}', 'rb') as f:
        return f.read()


def ico_directory_entry(png, width_field):
    # width_field: 0 means "read from PNG" (used for >=256); else the byte value
    w = width_field & 0xFF
    h = width_field & 0xFF
    return {
        'w': w,
        'h': h,
        'planes': 0,
        'bpp': 0,  # 0 signals PNG data
        'data': png,
    }


def build():
    png192 = read_png('icon-192.png')
    png512 = read_png('icon-512.png')

    entries = [
        ico_directory_entry(png192, 192),
        ico_directory_entry(png512, 0),  # 512 encoded as 256 sentinel; PNG header carries real size
    ]

    header = struct.pack('<HHH', 0, 1, len(entries))
    offset = 6 + 16 * len(entries)
    dir_bytes = bytearray()
    data_bytes = bytearray()
    for e in entries:
        dir_bytes += struct.pack(
            '<BBBBIH',
            e['w'],
            e['h'],
            e['planes'],
            e['bpp'],
            len(e['data']),
            offset + len(data_bytes),
        )
        data_bytes += e['data']

    with open(OUT, 'wb') as f:
        f.write(header + dir_bytes + data_bytes)
    print('wrote', OUT, len(header) + len(dir_bytes) + len(data_bytes), 'bytes')


if __name__ == '__main__':
    build()
