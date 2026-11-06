"""学ぶ道の単元(src/data/units/<分野>*.json)を点検する: python scripts/check_units.py [strategy|management|technology]
- 形: id・mid・topic・title・mins・pages(2〜4枚)・fig(単元で1つ以上)・words(3〜5)・qs(3〜5)・exam
- qs は questions.json にある同じ分野の問題か、重複がないか
- 1枚の文字数(本文 160 字まで、図のある枚は 110 字まで)
"""
import json, sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
Q = {q["id"]: q for q in json.loads((APP / "src/data/questions.json").read_text(encoding="utf-8"))}
FLOORS = {
    "strategy": ['企業と組織', '会計・財務', '知的財産権', '法律・標準化', '経営戦略', 'マーケティング', '技術戦略', 'ビジネスインダストリ', 'システム戦略', 'システム企画'],
    "management": ['システム開発', '開発手法', 'プロジェクトの計画', 'スケジュールとコスト', '品質・リスク・人', 'サービスマネジメント', '運用とサービスデスク', 'ファシリティと可用性', 'システム監査', '内部統制・ガバナンス'],
    "technology": ['基礎理論・AI', 'アルゴリズム・プログラミング', 'コンピュータ構成', 'システム構成・信頼性', 'ソフトウェア・OS', '情報デザイン・メディア', 'データベース', 'ネットワーク', 'セキュリティの脅威', 'セキュリティ対策'],
}


def check(field):
    files = sorted((APP / "src/data/units").glob(f"{field}*.json"))
    if not files:
        return [f"{field}: ファイルがない"]
    units = [u for p in files for u in json.loads(p.read_text(encoding="utf-8"))]
    errs, ids, used = [], set(), {}
    for u in units:
        uid = u.get("id", "?")
        e = lambda m: errs.append(f"{uid}: {m}")
        for k in ("id", "mid", "topic", "title", "mins", "pages", "words", "qs", "exam"):
            if k not in u:
                e(f"{k} がない")
        if uid in ids:
            e("id の重複")
        ids.add(uid)
        if u.get("topic") not in FLOORS[field]:
            e(f"topic が階の名前でない: {u.get('topic')}")
        pages = u.get("pages", [])
        if not 2 <= len(pages) <= 4:
            e(f"pages が {len(pages)} 枚")
        figs = 0
        for i, pg in enumerate(pages):
            n = sum(len(x) for x in pg.get("p", []))
            if not pg.get("h"):
                e(f"{i+1}枚目に h がない")
            if not pg.get("p"):
                e(f"{i+1}枚目に p がない")
            if pg.get("fig"):
                figs += 1
                f = pg["fig"]
                if f.get("type") == "table":
                    if not f.get("rows"):
                        e(f"{i+1}枚目の表に rows がない")
                    w = len(f.get("head") or f["rows"][0])
                    if any(len(r) != w for r in f["rows"]):
                        e(f"{i+1}枚目の表の列の数がそろっていない")
                elif f.get("type") == "flow":
                    if not 2 <= len(f.get("items", [])) <= 6:
                        e(f"{i+1}枚目の流れの図は 2〜6 個")
                else:
                    e(f"{i+1}枚目の fig.type が table/flow でない")
            lim = 110 if pg.get("fig") else 160
            if n > lim:
                e(f"{i+1}枚目の本文が {n} 字(上限 {lim})")
        if figs < 1:
            e("図か表がない")
        if not 3 <= len(u.get("words", [])) <= 5:
            e(f"words が {len(u.get('words', []))} 個")
        qs = u.get("qs", [])
        if not 3 <= len(qs) <= 5:
            e(f"qs が {len(qs)} 問")
        for q in qs:
            if q not in Q:
                e(f"問題 {q} がない")
            elif Q[q]["field"] != field:
                e(f"問題 {q} は別の分野({Q[q]['field']})")
            if q in used:
                e(f"問題 {q} は {used[q]} と重複")
            used[q] = uid
        if len(u.get("exam", "")) > 70:
            e("exam が長い(70字まで)")
    return errs


if __name__ == "__main__":
    fields = sys.argv[1:] or list(FLOORS)
    bad = [x for f in fields for x in check(f)]
    print("\n".join(bad) if bad else "OK")
    sys.exit(1 if bad else 0)
