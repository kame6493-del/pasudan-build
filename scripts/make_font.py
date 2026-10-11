"""アプリの書体(M PLUS Rounded 1c, SIL OFL 1.1)を、使う字だけに絞って woff2 にする。python scripts/make_font.py
元: scripts/fonts/MPLUSRounded1c-*.ttf(google/fonts の ofl/mplusrounded1c)。
絞る字: ASCII・かな・記号・JIS第1水準の漢字・アプリ内の文字(問題と用語の JSON を含む)。"""
from pathlib import Path
from fontTools import subset

APP = Path(__file__).resolve().parent.parent
chars = set(chr(c) for c in range(0x20, 0x7F))
chars |= set(chr(c) for c in range(0x3000, 0x30FF + 1))
chars |= set(chr(c) for c in range(0xFF01, 0xFF5F))
chars |= set("・〜～…‥―ー々〆〇℃％￥×÷±←→↑↓○●◎◇◆□■△▲▽▼☆★♪①②③④⑤⑥⑦⑧⑨⑩")
for hi in range(0x88, 0x99):
    for lo in list(range(0x40, 0x7F)) + list(range(0x80, 0xFD)):
        try:
            chars.add(bytes([hi, lo]).decode("shift_jis"))
        except UnicodeDecodeError:
            pass
for f in list((APP / "src").rglob("*.ts*")) + list((APP / "src").rglob("*.json")):
    chars |= set(f.read_text(encoding="utf-8"))
text = "".join(sorted(c for c in chars if c.isprintable()))
out = APP / "public/fonts"
out.mkdir(parents=True, exist_ok=True)
for w, name in [(500, "Medium"), (700, "Bold"), (800, "ExtraBold")]:
    opt = subset.Options()
    opt.flavor = "woff2"
    opt.layout_features = ["*"]
    opt.name_IDs = ["*"]
    f = subset.load_font(str(APP / f"scripts/fonts/MPLUSRounded1c-{name}.ttf"), opt)
    s = subset.Subsetter(opt)
    s.populate(text=text)
    s.subset(f)
    subset.save_font(f, str(out / f"pd-{w}.woff2"), opt)
    print(w, (out / f"pd-{w}.woff2").stat().st_size)
(out / "OFL.txt").write_text(
    "M PLUS Rounded 1c\nCopyright 2016 The Rounded M+ Project Authors.\n"
    "This Font Software is licensed under the SIL Open Font License, Version 1.1.\n"
    "http://scripts.sil.org/OFL\n", encoding="utf-8")
