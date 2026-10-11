"""見本の絵から部品を切り出す道具。背景は「縁から塗りつぶして届いた所」を抜く。
- outline 方式: 濃い輪郭線で囲まれたキャラ(場面の上)。線以外を縁から塗り、届かなかった所が中身
- key 方式: 区画の地の色(手で決めた色)に近い所を縁から塗って抜く"""
import numpy as np
import cv2
from PIL import Image, ImageDraw
from pathlib import Path

HERE = Path(__file__).resolve().parent


def flood_bg(passable: np.ndarray) -> np.ndarray:
    """passable(True=塗れる)を縁から塗る。届いた所 True"""
    h, w = passable.shape
    lab = passable.astype(np.uint8)
    n, cc = cv2.connectedComponents(lab, connectivity=4)
    border = set(np.unique(np.concatenate([cc[0], cc[-1], cc[:, 0], cc[:, -1]]))) - {0}
    reached = np.isin(cc, list(border)) & passable
    return reached


def largest(mask: np.ndarray, keep=1, min_area=0) -> np.ndarray:
    n, cc, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n <= 1:
        return mask
    order = np.argsort(-st[1:, cv2.CC_STAT_AREA]) + 1
    out = np.zeros_like(mask, bool)
    for i in order[:keep]:
        if st[i, cv2.CC_STAT_AREA] >= min_area:
            out |= cc == i
    return out


def fill_holes(mask):
    return ~flood_bg(~mask)


def cut_outline(img: Image.Image, box, thr=120, close=2, keep=1, add=None, sub=None, restrict=None, holes=True, feather=0.6, seal=""):
    """濃い輪郭線の内側を取る。add/sub は (形, 座標) の手描きの足し引き(切り抜き内の座標)"""
    im = img.crop(box)
    a = np.asarray(im).astype(np.float32)
    lum = a @ np.array([0.299, 0.587, 0.114])
    dark = lum < thr
    if close:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close * 2 + 1, close * 2 + 1))
        dark = cv2.morphologyEx(dark.astype(np.uint8), cv2.MORPH_CLOSE, k).astype(bool)
    if restrict is not None:
        r = shapes(im.size, restrict)
        dark &= r
    # seal: 体が切り抜きの縁にかかる辺(b=下 t=上 l=左 r=右)は塗り始めにしない
    if "b" in seal:
        dark[-1, :] = True
    if "t" in seal:
        dark[0, :] = True
    if "l" in seal:
        dark[:, 0] = True
    if "r" in seal:
        dark[:, -1] = True
    bg = flood_bg(~dark)
    fg = ~bg
    if restrict is not None:
        fg &= shapes(im.size, restrict)
    fg = largest(fg, keep)
    if holes:
        fg = fill_holes(fg)
    if add:
        fg |= shapes(im.size, add)
    if sub:
        fg &= ~shapes(im.size, sub)
    return rgba(im, fg, feather)


def cut_key(img: Image.Image, box, key, tol=18, keep=1, add=None, sub=None, holes=True, soft=0, beige=False):
    """地の色 key(RGB) に近い所を縁から塗って抜く。beige=True なら影(淡い肌色)も地として抜く"""
    im = img.crop(box)
    a = np.asarray(im).astype(np.float32)
    keys = key if isinstance(key[0], (tuple, list)) else [key]
    near = np.zeros(a.shape[:2], bool)
    for k in keys:
        near |= np.sqrt(((a - np.array(k, np.float32)) ** 2).sum(2)) < tol
    if beige:
        mx, mn = a.max(2), a.min(2)
        sat = (mx - mn) / np.maximum(mx, 1)
        near |= (sat < 0.30) & (mx > 200) & (a[..., 0] - a[..., 2] > 14)
    bg = flood_bg(near)
    fg = ~bg
    fg = largest(fg, keep)
    if holes:
        fg = fill_holes(fg)
    if add:
        fg |= shapes(im.size, add)
    if sub:
        fg &= ~shapes(im.size, sub)
    return rgba(im, fg)


def shapes(size, items):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for kind, xy, *rest in items:
        if kind == "rect":
            d.rectangle(xy, fill=255)
        elif kind == "rrect":
            d.rounded_rectangle(xy, rest[0] if rest else 10, fill=255)
        elif kind == "ellipse":
            d.ellipse(xy, fill=255)
        elif kind == "poly":
            d.polygon(xy, fill=255)
    return np.asarray(m) > 0


def rgba(im: Image.Image, fg: np.ndarray, feather=0.6) -> Image.Image:
    a = (fg * 255).astype(np.uint8)
    if feather:
        # 縁を1px だけ柔らかく(ぎざぎざの白い縁が出ないよう、内側へ寄せてからぼかす)
        a = cv2.erode(a, np.ones((2, 2), np.uint8))
        a = cv2.GaussianBlur(a, (3, 3), feather)
    out = im.convert("RGBA")
    out.putalpha(Image.fromarray(a))
    return trim(out)


def trim(im: Image.Image, pad=2) -> Image.Image:
    bb = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    bx, by = max(0, x0 - pad), max(0, y0 - pad)
    out = im.crop((bx, by, min(im.width, x1 + pad), min(im.height, y1 + pad)))
    out.info["off"] = (bx, by)  # 切り抜きの中での左上(元の画像の座標へ戻すのに使う)
    return out


def check_sheet(items: dict, out: Path, zoom=2):
    """切り出した物を、緑・暗い茶・生成りの3つの地に置いて並べる(縁の汚れを見る)"""
    bgs = [(70, 140, 70), (60, 45, 35), (250, 243, 230)]
    tiles = []
    for name, im in items.items():
        im = im.convert("RGBA")
        row = Image.new("RGB", ((im.width + 8) * 3, im.height + 8), (255, 255, 255))
        for i, c in enumerate(bgs):
            t = Image.new("RGBA", im.size, c + (255,))
            t.alpha_composite(im)
            row.paste(t.convert("RGB"), (i * (im.width + 8), 4))
        tiles.append(row)
    W = max(t.width for t in tiles)
    H = sum(t.height for t in tiles)
    sheet = Image.new("RGB", (W, H), (255, 255, 255))
    y = 0
    for t in tiles:
        sheet.paste(t, (0, y))
        y += t.height
    sheet = sheet.resize((W * zoom, H * zoom), Image.NEAREST)
    sheet.save(out)


def cut_grab(img: Image.Image, box, margin=4, iters=8, fg=None, bg=None, keep=1, feather=0.6, holes=True):
    """GrabCut で場面の上のキャラを抜く。fg/bg は (形, 座標) の手描きヒント(切り抜き内の座標)"""
    im = img.crop(box)
    a = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
    h, w = a.shape[:2]
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    mask[margin:h - margin, margin:w - margin] = cv2.GC_PR_FGD
    mask[:2, :] = mask[-2:, :] = cv2.GC_BGD
    mask[:, :2] = mask[:, -2:] = cv2.GC_BGD
    if bg:
        mask[shapes(im.size, bg)] = cv2.GC_BGD
    if fg:
        mask[shapes(im.size, fg)] = cv2.GC_FGD
    bgm = np.zeros((1, 65), np.float64); fgm = np.zeros((1, 65), np.float64)
    cv2.grabCut(a, mask, None, bgm, fgm, iters, cv2.GC_INIT_WITH_MASK)
    m = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    m = largest(m, keep)
    if holes:
        m = fill_holes(m)
    return rgba(im, m, feather)
