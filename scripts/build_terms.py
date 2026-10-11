"""用語カードの組み立て。既存の src/data/terms.json に scripts/terms_new_defs.py の NEW を足し、
各用語の関連問題(q)を questions.json から探して最大8問つける。python scripts/build_terms.py
探し方: 問題の terms に用語名・キーが一致 → 問題文に名前・キーが出る → 正解の選択肢に出る、の順で優先。
キーが "=" で始まる物は terms との完全一致だけで使う(短い語の誤検出を防ぐ)。"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
APP = Path(__file__).resolve().parent
ROOT = APP.parent
ns = {}
exec((APP / "terms_new_defs.py").read_text(encoding="utf-8"), ns)
NEW, OLD_KEYS, OLD_EXACT = ns["NEW"], ns["OLD_KEYS"], ns["OLD_EXACT"]
QS = json.loads((ROOT / "src/data/questions.json").read_text(encoding="utf-8"))
old = json.loads((ROOT / "src/data/terms.json").read_text(encoding="utf-8"))
old_ids = {t["id"] for t in old}


def find(name, keys, exact_only=False, field=None):
    exact = {name} | {k[1:] for k in keys if k.startswith("=")}
    loose = set() if exact_only else ({name} | {k for k in keys if not k.startswith("=")})
    loose = {k for k in loose if len(k) >= 3 or not k.isascii()}  # 2文字以下の英字は誤検出が多いので本文では探さない
    tiers = [[], [], []]
    for q in QS:
        ts = set(q.get("terms", []))
        if ts & (exact | loose):
            tiers[0].append(q)
        elif any(k in q["q"] for k in loose):
            tiers[1].append(q)
        elif any(k in q["choices"][q["answer"]] for k in loose):
            tiers[2].append(q)
    out = []
    for tier in tiers:
        # 同じ分野の問題を先に、新しい年度を先に(questions.json は新しい順)
        tier.sort(key=lambda q: (q["field"] != field,))
        for q in tier:
            if q["id"] not in out:
                out.append(q["id"])
    return out[:8]


terms = []
for t in old:
    keys = OLD_KEYS.get(t["id"], [])
    found = find(t["name"], keys, exact_only=t["id"] in OLD_EXACT, field=t["field"])
    merged = list(dict.fromkeys(t["q"] + found))[:8]
    terms.append({**t, "q": merged})
skipped = []
for (id_, name, full, field, art, desc, keys) in NEW:
    if id_ in old_ids:
        skipped.append(id_)
        continue
    q = find(name, keys, field=field)
    if not q:
        skipped.append(id_)
        continue
    terms.append({"id": id_, "name": name, "full": full, "field": field, "desc": desc, "art": art, "q": q})

(ROOT / "src/data/terms.json").write_text(json.dumps(terms, ensure_ascii=False, indent=1), encoding="utf-8")
from collections import Counter
print("terms", len(terms), Counter(t["field"] for t in terms))
print("skipped(関連問題なし・重複)", skipped)
