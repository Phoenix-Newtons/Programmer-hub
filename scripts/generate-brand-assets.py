#!/usr/bin/env python3
"""
Generates the raster brand assets (app icons + social card) from the same
geometry the SVG in docs/brand/ uses.

    python3 scripts/generate-brand-assets.py     # requires Pillow

Outputs: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png,
         public/og-image.png  (and docs/brand/og-preview.png for review)
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
BRAND = os.path.join(ROOT, "docs", "brand")

BG = (7, 11, 24)
INK = (238, 242, 255)
MUTED = (143, 154, 194)
BRAND_500 = (129, 140, 248)
BRAND_700 = (99, 102, 241)
ACCENT = (34, 211, 238)
GRAPE = (168, 85, 247)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, start, mid, end):
    """Diagonal three-stop gradient."""
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            t = (x / max(width - 1, 1) + y / max(height - 1, 1)) / 2
            pixels[x, y] = lerp(start, mid, t / 0.5) if t < 0.5 else lerp(mid, end, (t - 0.5) / 0.5)
    return image


def glyph_mask(size, scale=1.0):
    """The `</>` mark drawn as a rounded-stroke mask."""
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    s = size[0] * scale
    stroke = int(s * 0.093)
    left = (int(s * 0.216), int(s * 0.344))
    left_mid = (int(s * 0.146), int(s * 0.5))
    left_end = (int(s * 0.216), int(s * 0.656))
    right = (int(s * 0.784), int(s * 0.344))
    right_mid = (int(s * 0.854), int(s * 0.5))
    right_end = (int(s * 0.784), int(s * 0.656))
    draw.line([left, left_mid, left_end], fill=255, width=stroke, joint="curve")
    draw.line([right, right_mid, right_end], fill=255, width=stroke, joint="curve")
    for point in (left, left_mid, left_end, right, right_mid, right_end):
        r = stroke / 2
        draw.ellipse([point[0] - r, point[1] - r, point[0] + r, point[1] + r], fill=255)

    slash = Image.new("L", size, 0)
    slash_draw = ImageDraw.Draw(slash)
    slash_width = int(s * 0.078)
    slash_draw.line(
        [(int(s * 0.547), int(s * 0.281)), (int(s * 0.453), int(s * 0.719))],
        fill=255,
        width=slash_width,
    )
    for point in ((int(s * 0.547), int(s * 0.281)), (int(s * 0.453), int(s * 0.719))):
        r = slash_width / 2
        slash_draw.ellipse([point[0] - r, point[1] - r, point[0] + r, point[1] + r], fill=255)

    mask.paste(slash, (0, 0), slash)
    return mask, slash


def rounded_mask(size, radius, inset=0):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        [inset, inset, size[0] - 1 - inset, size[1] - 1 - inset], radius=radius, fill=255
    )
    return mask


def build_icon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG + (255,))
    canvas.paste(Image.new("RGBA", (size, size), BG + (255,)), (0, 0), rounded_mask((size, size), int(size * 0.219)))

    mark_mask, slash_mask = glyph_mask((size, size))

    gradient_layer = gradient((size, size), BRAND_500, GRAPE, ACCENT).convert("RGBA")
    canvas.paste(gradient_layer, (0, 0), mark_mask)

    slash_layer = Image.new("RGBA", (size, size), (226, 232, 240, 255))
    canvas.paste(slash_layer, (0, 0), slash_mask)

    # subtle inner hairline
    hairline = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(hairline).rounded_rectangle(
        [size * 0.047, size * 0.047, size * 0.953, size * 0.953],
        radius=int(size * 0.187),
        outline=BRAND_500 + (70,),
        width=max(2, size // 84),
    )
    canvas.alpha_composite(hairline)
    return canvas


def build_og(width=1200, height=630) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), BG + (255,))

    glows = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glows)
    glow_draw.ellipse([-220, -280, 520, 460], fill=BRAND_700 + (150,))
    glow_draw.ellipse([760, -190, 1420, 470], fill=ACCENT + (110,))
    glow_draw.ellipse([700, 300, 1360, 900], fill=GRAPE + (90,))
    glows = glows.filter(ImageFilter.GaussianBlur(130))
    canvas.alpha_composite(glows)

    icon = build_icon(112)
    canvas.alpha_composite(icon, (88, 92))

    title_font = ImageFont.truetype(FONT_BOLD, 70)
    tagline_font = ImageFont.truetype(FONT_REGULAR, 33)
    body_font = ImageFont.truetype(FONT_REGULAR, 26)
    pill_font = ImageFont.truetype(FONT_BOLD, 23)

    draw = ImageDraw.Draw(canvas)
    draw.text((88, 236), "Programmer's Hub", font=title_font, fill=INK)
    draw.text((88, 330), "Find talent. Ship projects. Get hired.", font=tagline_font, fill=(165, 180, 252))

    draw.text((88, 424), "Publish a real profile. Show the work you've shipped.", font=body_font, fill=MUTED)
    draw.text((88, 462), "Get contacted by clients in one click — no fees, no gatekeepers.", font=body_font, fill=MUTED)

    pill_text = "React 19 · Vite · Tailwind v4 · Supabase"
    pill_width = int(draw.textlength(pill_text, font=pill_font)) + 64
    draw.rounded_rectangle(
        [88, 518, 88 + pill_width, 578], radius=30, fill=BRAND_700 + (60,), outline=BRAND_500 + (140,), width=2
    )
    draw.text((120, 537), pill_text, font=pill_font, fill=(199, 210, 254))

    # corner mark
    draw.line([(0, 0), (width, 0), (width, height), (0, height), (0, 0)], fill=BRAND_500 + (46,), width=4)
    return canvas


def main() -> None:
    os.makedirs(PUBLIC, exist_ok=True)
    os.makedirs(BRAND, exist_ok=True)

    build_icon(512).save(os.path.join(PUBLIC, "icon-512.png"))
    build_icon(192).save(os.path.join(PUBLIC, "icon-192.png"))
    build_icon(180).save(os.path.join(PUBLIC, "apple-touch-icon.png"))
    og = build_og()
    og.convert("RGB").save(os.path.join(PUBLIC, "og-image.png"), optimize=True)
    og.convert("RGB").save(os.path.join(BRAND, "og-preview.png"), optimize=True)
    print("brand assets written to public/ and docs/brand/")


if __name__ == "__main__":
    main()
