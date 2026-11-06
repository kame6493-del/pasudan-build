"""選択肢ごとの解説 src/data/choiceExplain.json を確かめる。python scripts/check_choice_explain.py
全 id がそろう・長さが choices と同じ・正解の位置が空・まちがいの選択肢に空欄なし。"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
APP = Path(__file__).resolve().parent.parent
qs = json.loads((APP / "src/data/questions.json").read_text(encoding="utf-8"))
cx = json.loads((APP / "src/data/choiceExplain.json").read_text(encoding="utf-8"))
bad = []
ids = {q["id"] for q in qs}
bad += [f"余分な id {k}" for k in cx if k not in ids]
for q in qs:
    v = cx.get(q["id"])
    if v is None:
        bad.append(f"無い {q['id']}")
        continue
    if len(v) != len(q["choices"]):
        bad.append(f"長さ {q['id']} {len(v)}≠{len(q['choices'])}")
        continue
    for i, e in enumerate(v):
        if i == q["answer"] and e != "":
            bad.append(f"正解の位置が空でない {q['id']} {i}")
        if i != q["answer"] and (not isinstance(e, str) or len(e.strip()) < 10):
            bad.append(f"空欄 {q['id']} {i}")
print(f"{len(qs)}問 / 解説 {len(cx)}問 / 問題 {len(bad)}件")
for b in bad:
    print(" ", b)
sys.exit(1 if bad else 0)
