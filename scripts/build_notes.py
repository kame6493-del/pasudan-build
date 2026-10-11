"""../notes/<field>.json(要点ノート)をまとめて src/data/notes.json へ。無い分野は飛ばす。"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
APP = Path(__file__).resolve().parent.parent
out = []
for f in ["strategy", "management", "technology"]:
    p = APP.parent / "notes" / f"{f}.json"
    if p.exists():
        xs = json.loads(p.read_text(encoding="utf-8"))
        for x in xs:
            x["field"] = f
        out += xs
        print(f, len(xs))
(APP / "src/data/notes.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
print("notes", len(out))
