#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_stickers.py — builds ANIMATED webp stickers into public/assets/stickers/.
- processes the 2 new raw stickers (letter, roses): black-bg → alpha → crop
- animates all 8 stickers (~30 frames @ 70ms, seamless loop):
    nervous  : shy sway + breathe + blink of sweat drop glow
    happy    : bounce + squash + twinkling sparkles
    celebrate: bigger bounce + orbiting confetti + glow pulse
    confused : slow tilt + occasional shake
    date     : together-sway + pulsing little heart
    sparkles : star twinkle phases + slow rotate
    letter   : float + envelope wiggle + heart pop
    roses    : gentle sway + glow breathe
Run: python3 scripts/make_stickers.py      (from project root, needs Pillow)
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = "/home/user/rol-invite/public-assets"          # static transparent sources (6)
RAW_NEW = os.path.join(ROOT, "raw-assets-new")       # black-bg new art (2)
OUT = os.path.join(ROOT, "public", "assets", "stickers")
os.makedirs(OUT, exist_ok=True)

DARK = 62
SIDE = 400  # canvas (sticker ≈ up to 330)


def flood_cut_black(im):
    im = im.convert("RGB")
    w, h = im.size
    rgba = im.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda v: 255)
    px = im.load()
    visited = bytearray(w * h)
    stack = []

    def push(x, y):
        i = y * w + x
        if visited[i]:
            return
        r, g, b = px[x, y]
        if r < DARK and g < DARK and b < DARK:
            visited[i] = 1
            stack.append((x, y))

    for x in range(w):
        push(x, 0); push(x, h - 1)
    for y in range(h):
        push(0, y); push(w - 1, y)
    while stack:
        x, y = stack.pop()
        alpha.putpixel((x, y), 0)
        if x > 0: push(x - 1, y)
        if x < w - 1: push(x + 1, y)
        if y > 0: push(x, y - 1)
        if y < h - 1: push(x, y + 1)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    rgba.putalpha(alpha)
    return rgba


def autocrop(im, pad=0.05):
    bb = im.getchannel("A").getbbox()
    if not bb:
        return im
    p = int(max(im.size) * pad)
    return im.crop((max(0, bb[0] - p), max(0, bb[1] - p),
                    min(im.width, bb[2] + p), min(im.height, bb[3] + p)))


def fit(im, target=330):
    s = min(1.0, target / max(im.size))
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)


def star(d, cx, cy, r, color, rot=0.0):
    pts = []
    for i in range(8):
        ang = rot + i * math.pi / 4
        rad = r if i % 2 == 0 else r * 0.38
        pts.append((cx + rad * math.sin(ang), cy - rad * math.cos(ang)))
    d.polygon(pts, fill=color)


def glow_ellipse(size, alpha):
    g = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(g)
    d.ellipse([size * 0.18, size * 0.38, size * 0.82, size * 0.66], fill=alpha)
    g = g.filter(ImageFilter.GaussianBlur(size * 0.07))
    pink = Image.new("RGBA", (size, size), (255, 92, 150, 255))
    pink.putalpha(g)
    return pink


def paste_center(base, im, dy=0, rot=0.0, scale=1.0):
    if rot or scale != 1.0:
        w, h = im.size
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        if rot:
            im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    base.alpha_composite(im, ((base.width - im.width) // 2, (base.height - im.height) // 2 + dy))


GLOW = None


def frames_for(kind, src, n=14):
    out = []
    for f in range(n):
        ph = f / n * 2 * math.pi
        frame = Image.new("RGBA", (SIDE, SIDE), (0, 0, 0, 0))
        if kind == "nervous":
            dy = 6 * math.sin(ph)
            rot = 4 * math.sin(ph)
            paste_center(frame, src, dy=int(dy), rot=rot, scale=1.0 + 0.02 * math.sin(ph))
        elif kind == "happy":
            b = abs(math.sin(ph))
            dy = -46 * b
            sc = 1.0 + 0.04 * (1 - b) - 0.06 * max(0.0, math.sin(ph - 0.5))
            paste_center(frame, src, dy=int(dy), scale=sc)
            d = ImageDraw.Draw(frame)
            for i, (sx, sy, r, off) in enumerate([(74, 96, 11, 0), (492, 150, 8, 1.2), (110, 470, 7, 2.1), (470, 468, 10, 3.6)]):
                tw = 0.5 + 0.5 * math.sin(ph * 2 + off)
                star(d, sx, sy, r * (0.6 + 0.6 * tw), (255, 235, 160, int(255 * tw)), rot=ph + off)
        elif kind == "celebrate":
            b = math.sin(ph)
            dy = -60 * abs(b)
            rot = 7 * b
            paste_center(frame, src, dy=int(dy), rot=rot, scale=1.0 + 0.03 * math.sin(ph))
            d = ImageDraw.Draw(frame)
            cols = [(255, 92, 150), (255, 215, 110), (180, 120, 255), (255, 255, 255)]
            for i in range(10):
                ang = ph * (1 if i % 2 else -1) * 0.5 + i * math.pi / 5
                rad = 250 + 14 * math.sin(ph * 2 + i)
                x, y = SIDE / 2 + rad * math.cos(ang), SIDE / 2 - 40 + rad * 0.55 * math.sin(ang)
                if 8 < x < SIDE - 8 and 8 < y < SIDE - 8:
                    d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=cols[i % 4] + (int(200 * (0.5 + 0.5 * math.sin(ph + i))),))
        elif kind == "confused":
            rot = 6 * math.sin(ph)
            shake = 6 * math.sin(ph * 6) if 0.45 < (f / n % 1.0) < 0.55 else 0
            paste_center(frame, src, rot=rot)
            if shake:
                frame = frame.transform(frame.size, Image.AFFINE, (1, 0, shake, 0, 1, 0), resample=Image.BICUBIC)
        elif kind == "date":
            rot = 3.5 * math.sin(ph)
            paste_center(frame, src, dy=int(5 * math.sin(ph)), rot=rot)
            d = ImageDraw.Draw(frame)
            s = 16 + 5 * math.sin(ph * 2)
            d.ellipse([SIDE/2 - s, 468 - s*0.8, SIDE/2 + s, 468 + s*0.8], fill=(255, 70, 120, 235))
        elif kind == "sparkles":
            rot = math.degrees(ph) * 0.5
            im = src.rotate(rot, resample=Image.BICUBIC, expand=False)
            frame.alpha_composite(im, ((SIDE - im.width) // 2, (SIDE - im.height) // 2))
            d = ImageDraw.Draw(frame)
            for i, (sx, sy, r, off) in enumerate([(90, 120, 12, 0), (470, 170, 10, 1.1), (140, 460, 9, 2.2), (450, 450, 12, 3.3), (280, 70, 8, 4.4)]):
                tw = max(0.0, math.sin(ph + off))
                star(d, sx, sy, r * (0.5 + tw), (255, 240, 180, int(235 * tw)), rot=ph * 2 + off)
        elif kind == "letter":
            dy = -12 * math.sin(ph)
            rot = 5 * math.sin(ph)
            paste_center(frame, src, dy=int(dy), rot=rot, scale=1.0 + 0.015 * math.sin(ph * 2))
            d = ImageDraw.Draw(frame)
            s = 10 + 4 * math.sin(ph * 2)
            d.ellipse([SIDE/2 - s, 120 - s, SIDE/2 + s, 120 + s], fill=(255, 90, 140, 230))
        elif kind == "roses":
            rot = 4 * math.sin(ph)
            paste_center(frame, src, dy=int(4 * math.sin(ph)), rot=rot, scale=1.0 + 0.02 * math.sin(ph))
        out.append(frame)
    return out


def make_glow():
    return glow_ellipse(SIDE, 22)


def load_sources():
    srcs = {}
    for name in ["nervous", "happy", "celebrate", "confused", "date", "sparkles"]:
        srcs[name] = fit(autocrop(Image.open(os.path.join(OLD, f"sticker-{name}.webp"))), 470)
    for name in ["letter", "roses"]:
        srcs[name] = fit(autocrop(flood_cut_black(Image.open(os.path.join(RAW_NEW, f"sticker-{name}.png")))), 470)
        srcs[name].save(os.path.join(OUT, f"{name}-static.webp"), "WEBP", quality=85)  # spare static copy
    return srcs


def main():
    global GLOW
    GLOW = make_glow()
    srcs = load_sources()
    total = 0
    for kind, src in srcs.items():
        frames = frames_for(kind, src)
        path = os.path.join(OUT, f"{kind}.webp")
        frames[0].save(path, "WEBP", save_all=True, append_images=frames[1:],
                       duration=150, loop=0, quality=52, method=6)
        kb = os.path.getsize(path) / 1024
        total += kb
        im = Image.open(path)
        print(f"{kind:10s} → {kb:6.0f} KB  {im.size}  animated={im.is_animated} frames={getattr(im,'n_frames','?')}")
    print(f"total: {total:.0f} KB")


if __name__ == "__main__":
    main()
