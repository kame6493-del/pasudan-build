"""public/art の絵の画素不足を直す(2026-10-24 持ち主「画質が落ちている背景・モンスター」)。
- 背景: 参考画像から 1倍で切り直し(以前は LANCZOS で 1.2〜1.6倍に引き伸ばしていた)→ Real-ESRGAN 4倍 → 幅 1080 まで縮める
- ChatGPT のまとめ絵から切った部品: 元のまとめ絵から原寸で切り直し → ESRGAN → 元の2倍
- 参考画像から切った部品: いまの絵(=参考画像の原寸)を ESRGAN → 元の2〜3倍
ESRGAN はタイルで回す。透過は色と透明度を別々に拡大する。webp 品質 88。
python app/scripts/upscale_art.py  → work_upscale/out/*.webp (public/art へは別に写す)"""
import sys, re, io
from pathlib import Path
import numpy as np, cv2, torch
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "app"
ART = APP / "public/art"
OUT = ROOT / "work_upscale" / "out"
OUT.mkdir(exist_ok=True)
sys.path.insert(0, str(Path(r"C:\Users\yuichi1\Downloads\こぶんめくり_2026-10-03\work_redesign")))
sys.path.insert(0, str(APP / "scripts"))
import esrgan  # noqa

M = esrgan.model()


def esr4(im: Image.Image, tile=192, pad=16) -> Image.Image:
    a = np.asarray(im.convert("RGB")).astype(np.float32) / 255
    H, W, _ = a.shape
    out = np.zeros((H * 4, W * 4, 3), np.float32)
    for y in range(0, H, tile):
        for x in range(0, W, tile):
            y0, x0 = max(0, y - pad), max(0, x - pad)
            y1, x1 = min(H, y + tile + pad), min(W, x + tile + pad)
            t = torch.from_numpy(a[y0:y1, x0:x1]).permute(2, 0, 1)[None].cuda()
            with torch.no_grad():
                o = M(t).clamp(0, 1)[0].permute(1, 2, 0).cpu().numpy()
            ty, tx = (y - y0) * 4, (x - x0) * 4
            h, w = min(tile, H - y) * 4, min(tile, W - x) * 4
            out[y * 4:y * 4 + h, x * 4:x * 4 + w] = o[ty:ty + h, tx:tx + w]
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8))


def up_rgba(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    a = np.asarray(im)
    alpha = a[:, :, 3]
    rgb = a[:, :, :3].copy()
    # 透明な所の色を周りの色で埋めておく(縁に黒や地の色がにじまないように)
    hole = (alpha < 128).astype(np.uint8) * 255
    if hole.any() and (alpha >= 128).any():
        rgb = cv2.inpaint(rgb, hole, 3, cv2.INPAINT_TELEA)
    pad = 8
    rgbp = cv2.copyMakeBorder(rgb, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    alp = cv2.copyMakeBorder(alpha, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    big = np.asarray(esr4(Image.fromarray(rgbp)))
    abig = np.asarray(esr4(Image.fromarray(np.dstack([alp] * 3)))).mean(axis=2)
    p4 = pad * 4
    big = big[p4:-p4, p4:-p4]
    abig = abig[p4:-p4, p4:-p4]
    return Image.fromarray(np.dstack([big, np.clip(abig, 0, 255).astype(np.uint8)]), "RGBA")


def down(im, w, h):
    return im.resize((w, h), Image.LANCZOS)


def save(name, im):
    im.save(OUT / f"{name}.webp", quality=88, method=6)
    print(f"{name}: {Image.open(ART / f'{name}.webp').size} -> {im.size}")


done = set()
ONLY = set(sys.argv[1:])

# ---- 1. 背景(cut_assets.py の scene を倍率1で回す) ----
src = (APP / "scripts/cut_assets.py").read_text(encoding="utf-8")
lines = []
skip = False
for ln in src.splitlines():
    if ln.startswith("save(") or ln.startswith("    save(nm") or ln.startswith("if __name__"):
        skip = ln.startswith("if __name__")
        continue
    if skip:
        continue
    if ln.startswith("for nm, b in"):
        inloop = True
    if locals().get("inloop"):
        if ln.rstrip().endswith(".items():"):
            inloop = False
        continue
    lines.append(ln)
ns = {"__file__": str(APP / "scripts/cut_assets.py"), "__name__": "cutdefs"}
sys.argv_bak = sys.argv
sys.argv = ["x", "__none__"]
exec(compile("\n".join(lines), "cut_assets_defs", "exec"), ns)
sys.argv = sys.argv_bak
scene = ns["scene"]
BG = {}
for m in re.finditer(r'save\("(bg_\w+)", scene\((.*)\)\)\s*$', src, re.M):
    BG[m.group(1)] = m.group(2)
BGW = 1080
for name, args in BG.items():
    if ONLY and name not in ONLY:
        continue
    args1 = re.sub(r",\s*scale=[\d.]+", "", args)
    im = eval(f"scene({args1})", ns)
    big = esr4(im)
    w = min(big.width, BGW)
    save(name, down(big, w, round(big.height * w / big.width)))
    done.add(name)

# ---- 2. ChatGPT のまとめ絵(原寸で切り直して、いまの絵と見比べて名前を当てる) ----
import gpt_cut  # noqa
GRIDS = {"sheet1": (3, 3), "sheet2": (3, 3), "sheet3": (4, 3), "sheet4": (3, 2)}
tmp = ROOT / "work_upscale" / "gpt_native"
tmp.mkdir(exist_ok=True)
cands = {}
for sh, (c, r) in GRIDS.items():
    names = [f"{sh}_{k}" for k in range(c * r)]
    try:
        gpt_cut.cut(ROOT / "gpt_gimmick" / f"{sh}.png", c, r, names, out=tmp, maxw=100000)
    except SystemExit as e:
        print("cut", sh, e)
    for n in names:
        p = tmp / f"{n}.webp"
        if p.exists():
            cands[n] = Image.open(p).convert("RGBA")
cur240 = {p.stem: Image.open(p).convert("RGBA") for p in ART.glob("*.webp") if Image.open(p).width == 240}
used = {}
for name, im in cur240.items():
    best = None
    for n, c in cands.items():
        h = round(c.height * 240 / c.width)
        if abs(h - im.height) > 2:
            continue
        a = np.asarray(c.resize((240, im.height), Image.LANCZOS)).astype(np.float32)
        b = np.asarray(im).astype(np.float32)
        e = float(((a - b) ** 2).mean())
        if best is None or e < best[0]:
            best = (e, n)
    if best and best[0] < 600:
        used[name] = best[1]
    else:
        print("見つからない", name, best)
for name, n in used.items():
    if ONLY and name not in ONLY:
        continue
    nat = Image.open(tmp / f"{n}.webp").convert("RGBA")
    big = up_rgba(nat)
    w = min(480, big.width)
    save(name, down(big, w, round(big.height * w / big.width)))
    done.add(name)

# ---- 3. 残り(参考画像の原寸で切った部品) ----
for p in sorted(ART.glob("*.webp")):
    name = p.stem
    if name in done or name == "icon_src" or (ONLY and name not in ONLY):
        continue
    im = Image.open(p)
    k = 3 if max(im.size) <= 128 else 2
    if im.mode == "RGBA":
        big = up_rgba(im)
    else:
        big = esr4(im)
    save(name, down(big, im.width * k, im.height * k))
print(len(list(OUT.glob("*.webp"))), "files")
