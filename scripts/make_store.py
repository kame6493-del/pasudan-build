"""ストアの画面写真・フィーチャー画像・アイコンを作る。先に python scripts/shots.py で ../shots を撮っておく。
python scripts/make_store.py → store/play/*.png(1080x1920)・store/ios/*.png(1290x2796)・store/play/feature_1024x500.png・アイコン
- 写すのはアプリの本物の画面(../shots)。値段・「無料」が映る画面(ショップ・購入・苦手の部屋)は使わない
- 地はダンジョンの絵をぼかして紺をかけた物(生成りの無地にしない)。見出しはアプリの書体(M PLUS Rounded 1c)を金の縁取りで
- 「公式」「IPA 公認」と取られる言葉は入れない"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.stdout.reconfigure(encoding="utf-8")
APP = Path(__file__).resolve().parent.parent
SHOTS = APP.parent / "shots"
ART = APP / "public/art"
XB = str(APP / "scripts/fonts/MPLUSRounded1c-ExtraBold.ttf")
MD = str(APP / "scripts/fonts/MPLUSRounded1c-Bold.ttf")
NAVY = (22, 34, 63)
OUT_PLAY = APP / "store/play"
OUT_IOS = APP / "store/ios"

# (撮った画面, 見出し, 添え書き, 地の絵)
PAGES = [
    ("06_correct_fx", "正解で攻撃!", "ITパスポートの過去問4択でモンスターを倒す", "bg_forest"),
    ("08_midboss", "階の最後は中ボス", "連続正解のコンボで ダメージが伸びる", "bg_forest"),
    ("27c_kakomon_explain", "過去問道場で990問", "年度別・分野別に 解説つきで何度でも", "bg_castle"),
    ("04_map", "テーマ別の階を下へ", "3分野30テーマのダンジョン", "bg_castle"),
    ("03b_home_meter", "本番の予想点", "合格ライン600点と 分野ごとの300点を確認", "bg_home"),
    ("11_zukan", "用語カードを集める", "330枚。2回続けて正解すると金に進化", "bg_title"),
    ("15_stats", "分野ごとの正答率", "ストラテジ・マネジメント・テクノロジ", "bg_tower"),
    ("25_note_full", "要点ノート30テーマ", "よく出る所を短くまとめた読み物", "bg_tower"),
]
BANNED = ["無料", "¥", "円", "公式", "公認", "絶対", "必ず"]


def font(path, size):
    return ImageFont.truetype(path, size)


def backdrop(W, H, art):
    src = Image.open(ART / f"{art}.webp").convert("RGB")
    s = max(W / src.width, H / src.height)
    src = src.resize((int(src.width * s) + 2, int(src.height * s) + 2), Image.LANCZOS)
    x, y = (src.width - W) // 2, (src.height - H) // 2
    im = src.crop((x, y, x + W, y + H)).filter(ImageFilter.GaussianBlur(W / 90))
    # 上ほど濃い紺をかけて、見出しを読みやすく
    shade = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(shade)
    for yy in range(H):
        t = yy / H
        a = int(225 - 120 * min(1, t / 0.45)) if t < 0.45 else int(105 + 60 * (t - 0.45))
        d.line([(0, yy), (W, yy)], fill=NAVY + (max(0, min(255, a)),))
    im = im.convert("RGBA")
    im.alpha_composite(shade)
    return im


def gold_text(base, xy_center, text, size, stroke):
    """金のグラデーションに こげ茶の縁取りと影(ゲームの題字の雰囲気)"""
    f = font(XB, size)
    W, H = base.size
    l, t, r, b = ImageDraw.Draw(base).textbbox((0, 0), text, font=f, stroke_width=stroke)
    tw, th = r - l, b - t
    x = xy_center[0] - tw // 2 - l
    y = xy_center[1] - t
    shadow = Image.new("RGBA", base.size)
    ImageDraw.Draw(shadow).text((x, y + size // 14), text, font=f, fill=(0, 0, 0, 170), stroke_width=stroke, stroke_fill=(0, 0, 0, 170))
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(size / 30)))
    ImageDraw.Draw(base).text((x, y), text, font=f, fill=(58, 30, 10), stroke_width=stroke, stroke_fill=(58, 30, 10))
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).text((x, y), text, font=f, fill=255)
    grad = Image.new("RGBA", base.size)
    gd = ImageDraw.Draw(grad)
    top, bot = y + t, y + b
    for yy in range(max(0, top), min(H, bot + 1)):
        k = (yy - top) / max(1, bot - top)
        c = (255, int(236 - 60 * k), int(120 - 90 * k))
        gd.line([(0, yy), (W, yy)], fill=c + (255,))
    base.paste(grad, (0, 0), mask)
    return th


def plain_text(base, xy_center, text, size, fill=(255, 255, 255)):
    f = font(MD, size)
    d = ImageDraw.Draw(base)
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    d.text((xy_center[0] - (r - l) // 2 - l, xy_center[1] - t), text, font=f, fill=fill)
    return b - t


def phone(shot, h):
    im = Image.open(SHOTS / f"{shot}.png").convert("RGB")
    w = round(im.width * h / im.height)
    im = im.resize((w, h), Image.LANCZOS)
    rad = round(w * 0.07)
    bw = max(8, round(w * 0.018))
    frame = Image.new("RGBA", (w + bw * 2, h + bw * 2), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle([0, 0, frame.width - 1, frame.height - 1], radius=rad + bw, fill=(12, 18, 36, 255))
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=rad, fill=255)
    frame.paste(im, (bw, bw), m)
    return frame


def page(W, H, shot, head, sub, art):
    im = backdrop(W, H, art)
    top = round(H * 0.045)
    hs = round(W * 0.088)
    th = gold_text(im, (W // 2, top), head, hs, max(6, hs // 9))
    sy = top + th + round(H * 0.022)
    sh = plain_text(im, (W // 2, sy), sub, round(W * 0.040))
    py = sy + sh + round(H * 0.035)
    ph = phone(shot, H - py + round(H * 0.06))  # 下は少しはみ出させる(画面の下端は切れてよい)
    sd = Image.new("RGBA", im.size)
    ImageDraw.Draw(sd).rounded_rectangle([(W - ph.width) // 2 + 6, py + 18, (W + ph.width) // 2 + 6, H + 200], radius=60, fill=(0, 0, 0, 150))
    im.alpha_composite(sd.filter(ImageFilter.GaussianBlur(24)))
    im.alpha_composite(ph, ((W - ph.width) // 2, py))
    return im.convert("RGB")


def feature():
    W, H = 1024, 500
    im = backdrop(W, H, "bg_title")
    logo = Image.open(ART / "logo.webp").convert("RGBA")
    lw = 300
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    im.alpha_composite(logo, (70, 40))
    cx = 70 + lw // 2
    y = 40 + logo.height + 16
    th = gold_text(im, (cx, y), "過去問ダンジョン", 44, 6)
    plain_text(im, (cx, y + th + 14), "ITパスポートの4択で進むRPG", 22)
    # 右: バトル画面の上半分(本物の画面)を2枚
    for i, (shot, x, rot) in enumerate([("08_midboss", 470, 4), ("06_correct_fx", 720, -4)]):
        s = Image.open(SHOTS / f"{shot}.png").convert("RGB")
        s = s.crop((0, 0, s.width, round(s.width * 1.45)))
        w = 250
        s = s.resize((w, round(s.height * w / s.width)), Image.LANCZOS)
        card = Image.new("RGBA", (w + 16, s.height + 16), (0, 0, 0, 0))
        ImageDraw.Draw(card).rounded_rectangle([0, 0, card.width - 1, card.height - 1], radius=26, fill=(12, 18, 36, 255))
        m = Image.new("L", s.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, s.width - 1, s.height - 1], radius=20, fill=255)
        card.paste(s, (8, 8), m)
        card = card.rotate(rot, expand=True, resample=Image.BICUBIC)
        im.alpha_composite(card, (x, 500 - card.height + 140 if i == 0 else 30))
    return im.convert("RGB")


def main():
    for t in [p[1] + p[2] for p in PAGES] + ["過去問ダンジョンITパスポートの4択で進むRPG"]:
        bad = [b for b in BANNED if b in t]
        assert not bad, (t, bad)
    OUT_PLAY.mkdir(parents=True, exist_ok=True)
    OUT_IOS.mkdir(parents=True, exist_ok=True)
    for i, (shot, head, sub, art) in enumerate(PAGES, 1):
        page(1080, 1920, shot, head, sub, art).save(OUT_PLAY / f"{i:02d}_{shot}.png")
        page(1290, 2796, shot, head, sub, art).save(OUT_IOS / f"{i:02d}_{shot}.png")
        print("ok", i, shot)
    feature().save(OUT_PLAY / "feature_1024x500.png")
    icon = Image.open(APP / "scripts/icon_out/icon-1024.png").convert("RGB")
    icon.save(APP / "store/icon_1024.png")
    icon.resize((512, 512), Image.LANCZOS).save(OUT_PLAY / "icon_512.png")
    print("feature / icon ok")


if __name__ == "__main__":
    main()
