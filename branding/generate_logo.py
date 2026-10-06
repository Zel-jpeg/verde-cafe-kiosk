"""Generate Verde Café logo assets and PNG review previews."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


OUT = Path(__file__).resolve().parent
FOREST = "#173F35"
BROWN = "#8A6247"
CREAM = "#F7F3E9"

GEORGIA = Path(r"C:\Windows\Fonts\georgiab.ttf")
SEGOE = Path(r"C:\Windows\Fonts\segoeuib.ttf")


def svg(monochrome: bool) -> str:
    accent = FOREST if monochrome else BROWN
    leaf_vein = "" if monochrome else f'<path d="M 368 105 C 387 90 408 77 429 65" fill="none" stroke="{CREAM}" stroke-width="5" stroke-linecap="round"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420" viewBox="0 0 1200 420" role="img" aria-label="Verde Café logo">
  <title>Verde Café</title>
  <desc>A V-shaped coffee cup with a leaf and a curl of steam beside the Verde Café wordmark.</desc>
  <g fill="none" stroke="{FOREST}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 86 105 L 228 325 L 366 105" stroke-width="38"/>
    <path d="M 354 98 C 372 60 412 49 439 58 C 435 95 410 119 374 119 C 365 119 358 112 354 98 Z" fill="{FOREST}" stroke="none"/>
  </g>
  {leaf_vein}
  <path d="M 226 105 C 205 130 244 144 223 172 C 211 188 211 203 223 216" fill="none" stroke="{accent}" stroke-width="11" stroke-linecap="round"/>
  <text x="490" y="239" fill="{FOREST}" font-family="Georgia, 'Times New Roman', serif" font-size="150" font-weight="700" letter-spacing="-6">Verde</text>
  <path d="M 496 271 H 1012" stroke="{accent}" stroke-width="4"/>
  <text x="497" y="340" fill="{accent}" font-family="'Segoe UI', Arial, sans-serif" font-size="52" font-weight="700" letter-spacing="19">CAFÉ</text>
</svg>
'''


def bezier(p0, p1, p2, p3, count=30):
    points = []
    for i in range(count + 1):
        t = i / count
        u = 1 - t
        points.append((
            u**3 * p0[0] + 3 * u*u*t * p1[0] + 3 * u*t*t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u*u*t * p1[1] + 3 * u*t*t * p2[1] + t**3 * p3[1],
        ))
    return points


def png(monochrome: bool) -> Image.Image:
    scale = 2
    image = Image.new("RGB", (1200 * scale, 420 * scale), CREAM)
    draw = ImageDraw.Draw(image)
    forest = FOREST
    accent = FOREST if monochrome else BROWN

    def xy(points):
        return [(round(x * scale), round(y * scale)) for x, y in points]

    draw.line(xy([(86, 105), (228, 325), (366, 105)]), fill=forest, width=38 * scale, joint="curve")
    radius = 19 * scale
    for x, y in [(86, 105), (228, 325), (366, 105)]:
        draw.ellipse((x*scale-radius, y*scale-radius, x*scale+radius, y*scale+radius), fill=forest)

    leaf = (bezier((354, 98), (372, 60), (412, 49), (439, 58))
            + bezier((439, 58), (435, 95), (410, 119), (374, 119))
            + bezier((374, 119), (365, 119), (358, 112), (354, 98)))
    draw.polygon(xy(leaf), fill=forest)
    if not monochrome:
        midrib = bezier((368, 105), (387, 90), (408, 77), (429, 65))
        draw.line(xy(midrib), fill=CREAM, width=5 * scale, joint="curve")

    steam = (bezier((226, 105), (205, 130), (244, 144), (223, 172))
             + bezier((223, 172), (211, 188), (211, 203), (223, 216)))
    draw.line(xy(steam), fill=accent, width=11 * scale, joint="curve")
    r = 5.5 * scale
    for x, y in [steam[0], steam[-1]]:
        draw.ellipse((x*scale-r, y*scale-r, x*scale+r, y*scale+r), fill=accent)

    font_main = ImageFont.truetype(str(GEORGIA), 150 * scale)
    font_sub = ImageFont.truetype(str(SEGOE), 52 * scale)
    draw.text((490 * scale, 89 * scale), "Verde", font=font_main, fill=forest, stroke_width=0)
    draw.line(xy([(496, 271), (1012, 271)]), fill=accent, width=4 * scale)
    x = 497 * scale
    for letter in "CAFÉ":
        draw.text((x, 286 * scale), letter, font=font_sub, fill=accent)
        x += draw.textlength(letter, font=font_sub) + 19 * scale
    return image


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, mono in [("verde-cafe-logo", False), ("verde-cafe-logo-one-color", True)]:
        (OUT / f"{name}.svg").write_text(svg(mono), encoding="utf-8")
        png(mono).save(OUT / f"{name}-preview.png")


if __name__ == "__main__":
    main()
