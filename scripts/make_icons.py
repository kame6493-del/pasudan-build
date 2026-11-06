"""アプリアイコン。2026-11-04 に ChatGPT の画像生成で今のアイコン(ref_10 を切り出した 214px を拡大した物)を同じ構図・絵柄で描き直した
scripts/icon_out/icon_src_gpt.png(1254px)を元にする(持ち主「もっと高画質にして」)。
文字・冒険者・剣は中心から幅の 60% の円の中に寄せてある(アダプティブアイコンの丸い切り抜きでも欠けないように)。
python scripts/make_icons.py → public/icon.png(512)と scripts/icon_out/icon-1024.png"""
from pathlib import Path
from PIL import Image

APP = Path(__file__).resolve().parent.parent
src = Image.open(APP / "scripts/icon_out/icon_src_gpt.png").convert("RGB")
s = min(src.size)
src = src.crop(((src.width - s) // 2, (src.height - s) // 2, (src.width + s) // 2, (src.height + s) // 2))
big = src.resize((1024, 1024), Image.LANCZOS)
out = APP / "scripts/icon_out"
out.mkdir(exist_ok=True)
big.save(out / "icon-1024.png")
big.resize((512, 512), Image.LANCZOS).save(APP / "public/icon.png")
print("ok")
