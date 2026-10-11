"""収録した全問の正解番号が IPA の公式解答と一致するかを確かめる。python scripts/check_answers.py
公式解答の PDF(https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/pdf/questions/<年>_ip_ans.pdf)を
../ipa に無ければ取得し、表の「問N」と同じ行の右の カナ を読む。src/data/questions.json の answer(0〜3=ア〜エ)と突き合わせる。"""
import json
import sys
import urllib.request
from pathlib import Path

import pymupdf

sys.stdout.reconfigure(encoding="utf-8")
APP = Path(__file__).resolve().parent.parent
IPA = APP.parent / "ipa"
YEARS = {"r08": "2026r08", "r07": "2025r07", "r06": "2024r06", "r05": "2023r05", "r04": "2022r04", "r03": "2021r03",
         "r02": "2020r02o", "r01a": "2019r01a", "h31": "2019h31h", "h30a": "2018h30a"}
KANA = "アイウエ"


def official(code: str) -> dict[int, str]:
    pdf = IPA / f"{code}_ans.pdf"
    if not pdf.exists():
        IPA.mkdir(exist_ok=True)
        url = f"https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/pdf/questions/{code}_ip_ans.pdf"
        urllib.request.urlretrieve(url, pdf)
    words = pymupdf.open(pdf)[0].get_text("words")
    # 「問12」が1語の版と、「問」「12」が別の語の版がある。どちらも (x0, y0, x1, y1, "問12") の形にそろえる
    qs = [w for w in words if w[4].startswith("問") and w[4][1:].isdigit()]
    for w in words:
        if w[4] == "問":
            nxt = [n for n in words if n[4].isdigit() and abs(n[1] - w[1]) < 2 and 0 <= n[0] - w[2] < 12]
            if nxt:
                n = nxt[0]
                qs.append((w[0], w[1], n[2], n[3], "問" + n[4]))
    ks = [w for w in words if len(w[4]) == 1 and w[4] in KANA]
    out = {}
    for q in qs:
        cy = (q[1] + q[3]) / 2
        row = sorted((k for k in ks if abs((k[1] + k[3]) / 2 - cy) < 4 and k[0] > q[2] - 1), key=lambda k: k[0] - q[2])
        out[int(q[4][1:])] = row[0][4] if row else None
    assert sorted(out) == list(range(1, 101)) and all(out.values()), f"{code}: 解答表が読めない"
    return out


qs = json.load(open(APP / "src/data/questions.json", encoding="utf-8"))
bad = 0
per = {}
for y, code in YEARS.items():
    key = official(code)
    mine = [q for q in qs if q["id"].startswith(y + "-")]
    per[y] = len(mine)
    for q in mine:
        want = key[q["no"]]
        got = KANA[q["answer"]]
        if want != got:
            bad += 1
            print(f"不一致 {q['id']}: 収録={got} 公式={want}")
    missing = sorted(set(range(1, 101)) - {q["no"] for q in mine})
    print(f"{code}: 収録 {len(mine)}問 / 公式 100問  未収録(図が必要など) {missing}")
print(f"合計 {len(qs)}問  不一致 {bad}問")
sys.exit(1 if bad else 0)
