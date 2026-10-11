"""ネイティブのアイコンと起動画面。npx cap add の後に流す。python scripts/native_assets.py
- アイコン: scripts/icon_out/icon-1024.png(make_icons.py が作る)から Android の mipmap(通常・丸・アダプティブ前景)と iOS の AppIcon
- 起動画面: アプリの地と同じ紺に、角丸のアイコンを真ん中に(Capacitor のロゴを残さない)
何度流しても同じ結果になる。
Android の画像は WebP(品質90)で書く。PNG だと AAB が 10MB を超えて、ブラウザから Play へ上げられないため。"""
from pathlib import Path
from PIL import Image, ImageDraw

APP = Path(__file__).resolve().parent.parent
icon = Image.open(APP / "scripts/icon_out/icon-1024.png").convert("RGB")
NAVY = (22, 34, 63)
RES = APP / "android/app/src/main/res"

def save_android(im, png_path):
    """Android の res には WebP で書き、同じ名前の PNG があれば消す(同名の資源が2つあると組み立てが止まる)"""
    png_path = Path(png_path)
    im.save(png_path.with_suffix(".webp"), "WEBP", quality=90, method=6)
    if png_path.exists():
        png_path.unlink()

def rounded(im, r):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=r, fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0), m)
    return out

for d, k in {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}.items():
    n = round(48 * k)
    sq = icon.resize((n, n), Image.LANCZOS)
    save_android(rounded(sq, round(n * 0.18)), RES / f"mipmap-{d}/ic_launcher.png")
    m = Image.new("L", (n, n), 0)
    ImageDraw.Draw(m).ellipse([0, 0, n - 1, n - 1], fill=255)
    rd = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    rd.paste(sq, (0, 0), m)
    save_android(rd, RES / f"mipmap-{d}/ic_launcher_round.png")
    # アダプティブ前景: 108dp のうち中央 72dp が見える。絵は全面に敷き、見える範囲に収まるよう少し縮める
    f = round(108 * k)
    inner = round(f * 80 / 108)
    fg = Image.new("RGBA", (f, f), NAVY + (255,))
    fg.paste(icon.resize((inner, inner), Image.LANCZOS), ((f - inner) // 2, (f - inner) // 2))
    save_android(fg, RES / f"mipmap-{d}/ic_launcher_foreground.png")
(RES / "values/ic_launcher_background.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % NAVY, encoding="utf-8")
v24 = RES / "drawable-v24/ic_launcher_foreground.xml"
if v24.exists():
    v24.unlink()

def splash(w, h):
    im = Image.new("RGB", (w, h), NAVY)
    s = round(min(w, h) * 0.32)
    ic = rounded(icon.resize((s, s), Image.LANCZOS), round(s * 0.22))
    im.paste(ic, ((w - s) // 2, (h - s) // 2), ic)
    return im

n = 0
for p in list(RES.glob("drawable*/splash.png")) + list(RES.glob("drawable*/splash.webp")):
    w, h = Image.open(p).size
    save_android(splash(w, h), p.with_suffix(".png"))
    n += 1
for p in (APP / "ios/App/App/Assets.xcassets/Splash.imageset").glob("*.png"):
    splash(2732, 2732).save(p)
    n += 1
icon.save(APP / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
print("splash", n, "ok")
