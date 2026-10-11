"""アプリアイコン。参考画像のメインアイコン(ref_10)を切り出した public/art/icon_src.webp を拡大して使う。
python scripts/make_icons.py → public/icon.png(512)と scripts/icon_out/icon-1024.png"""
from pathlib import Path
from PIL import Image, ImageFilter

APP = Path(__file__).resolve().parent.parent
src = Image.open(APP / "public/art/icon_src.webp").convert("RGB")
s = min(src.size)
src = src.crop(((src.width - s) // 2, (src.height - s) // 2, (src.width + s) // 2, (src.height + s) // 2))
big = src.resize((1024, 1024), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
out = APP / "scripts/icon_out"
out.mkdir(exist_ok=True)
big.save(out / "icon-1024.png")
big.resize((512, 512), Image.LANCZOS).save(APP / "public/icon.png")
print("ok")
