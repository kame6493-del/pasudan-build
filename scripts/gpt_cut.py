"""ChatGPT で作った透過のまとめ絵(格子に並んだ部品)を1つずつ切り出して public/art へ。
python scripts/gpt_cut.py <sheet.png> <cols> <rows> name1 name2 ...  (左上から行ごと。'-' は捨てる)
- 部品は alpha>12 の連結成分を、重心が入るマスごとにまとめる(炎や紙片などの離れた小片も同じマスなら同じ部品)
- 切り出しは外周に余白をつけ、外周1pxに色が残っていないか(端の欠け)を機械で確かめる。欠けがあれば止まる
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = Path(__file__).resolve().parent.parent / "public/art"
PAD = 8
MAXW = 240


def cut(sheet, cols, rows, names, out=OUT, maxw=MAXW):
    im = Image.open(sheet).convert("RGBA")
    a = np.array(im)[:, :, 3]
    H, W = a.shape
    lab, n = ndimage.label(a > 12)
    objs = ndimage.find_objects(lab)
    sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
    cells = {}
    for i, sl in enumerate(objs):
        if sizes[i] < 30:  # ちりは捨てる
            continue
        ys, xs = sl
        cy, cx = (ys.start + ys.stop) / 2, (xs.start + xs.stop) / 2
        c = (min(rows - 1, int(cy / H * rows)), min(cols - 1, int(cx / W * cols)))
        b = cells.get(c)
        bb = (xs.start, ys.start, xs.stop, ys.stop)
        cells[c] = bb if not b else (min(b[0], bb[0]), min(b[1], bb[1]), max(b[2], bb[2]), max(b[3], bb[3]))
    res = []
    for k, name in enumerate(names):
        c = (k // cols, k % cols)
        if name == "-" or c not in cells:
            if name != "-":
                raise SystemExit(f"{name}: マス {c} に絵が無い")
            continue
        x0, y0, x1, y1 = cells[c]
        touch = x0 <= 0 or y0 <= 0 or x1 >= W or y1 >= H
        if touch:
            raise SystemExit(f"{name}: 元の絵の端に触れている(欠けの恐れ) {cells[c]}")
        part = im.crop((x0, y0, x1, y1))
        # 他のマスの部品が入り込んでいたら消す(このマスの成分だけ残す)
        sub = lab[y0:y1, x0:x1]
        keep = np.zeros_like(sub, bool)
        for i in np.unique(sub):
            if i == 0:
                continue
            sl = objs[i - 1]
            cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
            if (min(rows - 1, int(cy / H * rows)), min(cols - 1, int(cx / W * cols))) == c:
                keep |= sub == i
        arr = np.array(part)
        arr[:, :, 3] = np.where(keep | (arr[:, :, 3] <= 12), arr[:, :, 3], 0) * (keep | (arr[:, :, 3] <= 12))
        part = Image.fromarray(arr)
        w, h = part.size
        canvas = Image.new("RGBA", (w + PAD * 2, h + PAD * 2), (0, 0, 0, 0))
        canvas.paste(part, (PAD, PAD))
        if canvas.width > maxw:
            canvas = canvas.resize((maxw, round(canvas.height * maxw / canvas.width)), Image.LANCZOS)
        A = np.array(canvas)[:, :, 3]
        edge = max(A[0].max(), A[-1].max(), A[:, 0].max(), A[:, -1].max())
        if edge > 8:
            raise SystemExit(f"{name}: 切り出しの外周に色が残る(欠け) edge={edge}")
        canvas.save(out / f"{name}.webp", quality=90, method=6)
        res.append((name, canvas.size))
        print(f"{name}: {canvas.size} 元 {x1-x0}x{y1-y0} 外周OK")
    return res


if __name__ == "__main__":
    s, cols, rows, *names = sys.argv[1:]
    cut(s, int(cols), int(rows), names)
