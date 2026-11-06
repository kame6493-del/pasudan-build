"""過去問をさがす: python scripts/find_q.py <分野> <言葉> [言葉...]   (言葉はすべて含む物。問題文・選択肢・解説・用語を見る)
python scripts/find_q.py show <id> [id...]   で全文を出す
"""
import json, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
APP = Path(__file__).resolve().parent.parent
QS = json.loads((APP / "src/data/questions.json").read_text(encoding="utf-8"))

if sys.argv[1] == "show":
    by = {q["id"]: q for q in QS}
    for i in sys.argv[2:]:
        q = by[i]
        print(f"== {i} [{q['field']}/{q['topic']}] {q['year']} 問{q['no']}")
        print(q["q"])
        for k, c in enumerate(q["choices"]):
            print(("*" if k == q["answer"] else " ") + "アイウエ"[k] + " " + c)
        print("解説:", q["explain"])
        print()
    sys.exit()

field, words = sys.argv[1], sys.argv[2:]
for q in QS:
    if field != "all" and q["field"] != field:
        continue
    text = q["q"] + " ".join(q["choices"]) + q["explain"] + " ".join(q.get("terms", []))
    if all(w in text for w in words):
        print(f"{q['id']} [{q['topic']}] len={len(q['q'])} {q['q'][:70].replace(chr(10), ' ')} => {q['choices'][q['answer']][:30]}")
