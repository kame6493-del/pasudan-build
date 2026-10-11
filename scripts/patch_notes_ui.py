"""要点ノートの画面をつなぐ一度きりの修正(store / App / Zukan / MapScreen / css)"""
from pathlib import Path

APP = Path(__file__).resolve().parent.parent


def edit(p, pairs):
    f = APP / p
    s = f.read_text(encoding="utf-8")
    for a, b in pairs:
        if b in s:
            continue
        assert a in s, (p, a[:60])
        s = s.replace(a, b)
    f.write_text(s, encoding="utf-8")


edit("src/ui/store.tsx", [("  | { name: 'term'; id: string; back: Route };", "  | { name: 'term'; id: string; back: Route }\n  | { name: 'notes'; field: Field }\n  | { name: 'note'; field: Field; topic: string; back: Route };")])
edit("src/ui/App.tsx", [
    ("  if (r.name === 'zukanList' || r.name === 'term') return 'zukan';", "  if (r.name === 'zukanList' || r.name === 'term' || r.name === 'notes' || r.name === 'note') return 'zukan';"),
    ("              {route.name === 'term' && <TermDetail id={route.id} back={route.back} />}", "              {route.name === 'term' && <TermDetail id={route.id} back={route.back} />}\n              {route.name === 'notes' && <NotesList field={route.field} />}\n              {route.name === 'note' && <NoteView field={route.field} topic={route.topic} back={route.back} />}"),
    ("import { Onboarding } from './Onboarding';", "import { NoteView, NotesList } from './Notes';\nimport { Onboarding } from './Onboarding';"),
])
edit("src/ui/Zukan.tsx", [("""      <div className="panel">
        <div className="row">
          <b className="grow">全体の収集率</b>""", """      <button className="panel upsell notes-entry" onClick={() => go({ name: 'notes', field: 'strategy' })}>
        <img src={DUNGEONS.technology.book} alt="" />
        <div className="grow">
          <b>要点ノート（30テーマ）</b>
          <div className="small">各階のテーマを短くまとめた教科書。読んでから解こう</div>
        </div>
        <span className="chev">›</span>
      </button>
      <div className="panel">
        <div className="row">
          <b className="grow">全体の収集率</b>""")])
edit("src/ui/MapScreen.tsx", [("""          <button className="btn" style={{ marginTop: 8 }} onClick={() => enter(now)}>
            挑戦する ›
          </button>""", """          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn paper" style={{ flex: '0 0 42%' }} onClick={() => go({ name: 'note', field, topic: dn.floors[now], back: { name: 'map', field } })}>
              ノートを読む
            </button>
            <button className="btn" onClick={() => enter(now)}>
              挑戦する ›
            </button>
          </div>""")])

css = """
/* ---------- 要点ノート ---------- */
.notes-entry {
  background: linear-gradient(180deg, #eef4ff, #d6e6ff);
  border-color: #5a8de0;
}
.note-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 4px;
  border-bottom: 1.5px solid #ecdcb9;
  text-align: left;
}
.note-row b {
  display: block;
  font-size: 15px;
}
.note-row .chev {
  font-size: 20px;
  font-weight: 800;
  color: var(--ink2);
}
.num-badge {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
}
.note h3 {
  margin: 16px 0 4px;
  padding-left: 10px;
  border-left: 4px solid var(--edge);
}
.note-lead {
  margin: 4px 0 0;
  color: var(--ink2);
  font-weight: 700;
  line-height: 1.7;
}
.note-body {
  margin: 0;
  line-height: 1.85;
  white-space: pre-wrap;
  user-select: text;
  -webkit-user-select: text;
}
.note-list {
  margin: 0;
  padding-left: 1.4em;
  line-height: 1.75;
}
.note-list li {
  margin: 4px 0;
}
.note-list.trap li::marker {
  color: var(--red);
}
.formula {
  margin: 6px 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: #23314f;
  color: #fff;
  font-weight: 700;
}
.note-lock {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 10px;
  border-radius: 12px;
  background: #fff4d8;
  border: 1.5px dashed #d29a1e;
  font-size: 13px;
}
"""
f = APP / "src/index.css"
s = f.read_text(encoding="utf-8")
if ".note-row" not in s:
    f.write_text(s + css, encoding="utf-8")
print("ok")
