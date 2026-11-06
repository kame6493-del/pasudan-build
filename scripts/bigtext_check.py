"""端末の文字サイズ最大(Android の textZoom 200% 相当)と表示サイズ最大(幅 300〜320)で、主な画面のはみ出しを調べて撮る。
ヘッドレスの Edge(共有の Chrome は使わない)。先に npm run build と npm run preview(http://127.0.0.1:4350)。
python scripts/bigtext_check.py [倍率=2.0] → ../shots_1024_bigtext/幅_画面.png と、はみ出した要素の一覧
textZoom はページ内の文字の大きさだけを倍にする(px 指定も含む)。ここでは CSS の font-size と style の fontSize を全部倍にして近づける。"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

import random
from datetime import date, timedelta

sys.stdout.reconfigure(encoding="utf-8")
APP = Path(__file__).resolve().parent.parent
OUT = APP.parent / "shots_1024_bigtext"
OUT.mkdir(exist_ok=True)
import os
for _f in OUT.glob("*.png"):
    _f.unlink()
ONLYW = os.environ.get("BT_W")
URL = "http://127.0.0.1:4350/?mockbuy=1"
# seeded / init は shots.py と同じ(shots.py は読み込むと撮影を始めるので写している)
QS = json.load(open(APP / "src/data/questions.json", encoding="utf-8"))
TERMS = json.load(open(APP / "src/data/terms.json", encoding="utf-8"))
BY_TEXT = {q["q"]: q for q in QS}


def seeded(full=True, fresh=False):
    if fresh:
        return None
    rnd = random.Random(7)
    today = date.today()
    qs, weak = {}, {}
    for q in QS:
        if rnd.random() < 0.55:
            n = rnd.randint(1, 3)
            p = {"strategy": 0.72, "management": 0.66, "technology": 0.6}[q["field"]]
            c = sum(rnd.random() < p for _ in range(n))
            last = 1 if rnd.random() < p else 0
            qs[q["id"]] = {"n": n, "c": max(c, last), "last": last, "at": 0}
            if not last and len(weak) < 18:
                weak[q["id"]] = rnd.choice([0, 0, 1])
    cards = {t["id"]: (2 if rnd.random() < 0.3 else 1) for t in TERMS if rnd.random() < 0.45}
    days = {}
    for i in range(7):
        k = (today - timedelta(days=6 - i)).isoformat()
        n = [12, 18, 20, 16, 24, 22, 8][i]
        days[k] = {"n": n, "c": int(n * 0.7), "counted": n, "maxCombo": 3 if i == 6 else 6, "weakCleared": 1 if i == 6 else 3, "dungeon": 0, "chest": False, "score": 560 + i * 20}
    return {
        "v": 1, "onboarded": True, "examDate": (today + timedelta(days=102)).isoformat(), "hero": "hood", "pet": "cat",
        "coins": 1250, "xp": 420, "cleared": {"strategy": 3, "management": 1, "technology": 0}, "bossDown": False,
        "qs": qs, "weak": weak, "cards": cards, "termStreak": {}, "days": days, "streak": 3, "lastDay": today.isoformat(),
        "bestCombo": 12, "weakClearedTotal": 18, "exams": [], "ghost": {"correct": 7, "splits": [9000 * (i + 1) for i in range(10)]},
        "unlocked": [], "owned": {"full": full, "looks": False}, "sound": False,
    }


def init(page_ctx, data, full=True):
    js = "localStorage.clear();"
    if data is not None:
        js += f"localStorage.setItem('CapacitorStorage.pasudan.data.v1', {json.dumps(json.dumps(data, ensure_ascii=False))});"
    if full:
        js += "localStorage.setItem('pasudan.mockOwned', JSON.stringify({full:true}));"
    page_ctx.add_init_script(f"if(!sessionStorage.getItem('seeded')){{{js} sessionStorage.setItem('seeded','1');}}")



ZOOM = float(sys.argv[1]) if len(sys.argv) > 1 else 2.0

ZOOM_JS = """
(z) => {
  window.__tz = z;
  const scaleRules = (rules) => {
    for (const r of rules) {
      if (r.cssRules) scaleRules(r.cssRules);
      const s = r.style; if (!s) continue;
      const fs = s.getPropertyValue('font-size');
      if (fs && /^[\\d.]+px$/.test(fs.trim())) s.setProperty('font-size', parseFloat(fs) * z + 'px', s.getPropertyPriority('font-size'));
      for (const name of Array.from(s)) {
        if (name.startsWith('--fs')) { const v = s.getPropertyValue(name).trim(); if (/^[\\d.]+px$/.test(v)) s.setProperty(name, parseFloat(v) * z + 'px'); }
      }
    }
  };
  const done = new WeakSet();
  const scaleSheets = () => { for (const sh of document.styleSheets) { if (done.has(sh)) continue; try { scaleRules(sh.cssRules); done.add(sh); } catch (e) {} } };
  const scaleInline = (el) => {
    if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return;
    const v = el.style && el.style.fontSize;
    if (v && /px$/.test(v) && el.dataset.tz !== v) { el.style.fontSize = (Math.round(parseFloat(v) * z * 100) / 100) + 'px'; el.dataset.tz = el.style.fontSize; }
  };
  scaleSheets();
  document.querySelectorAll('[style]').forEach(scaleInline);
  new MutationObserver((ms) => {
    scaleSheets();
    for (const m of ms) {
      if (m.type === 'attributes') scaleInline(m.target);
      m.addedNodes.forEach((n) => { if (n.nodeType === 1) { scaleInline(n); n.querySelectorAll && n.querySelectorAll('[style]').forEach(scaleInline); } });
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
}
"""

# 文字が自分の箱からあふれている要素と、画面の横からはみ出した要素を数える。
# 横スクロールの帯(overflow-x: auto/scroll)の中は、はみ出しではないので数えない。
FIND_JS = """
() => {
  const W = innerWidth, out = [];
  const scroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return p; } return null; };
  const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '');
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('svg') && el.tagName !== 'svg') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const sc = scroller(el);
    const txt = (el.innerText || '').trim().slice(0, 24);
    if (!sc && (r.right > W + 1 || r.left < -1)) out.push({ k: 'screen', el: name(el), txt, l: Math.round(r.left), r: Math.round(r.right) });
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll' && el.clientWidth > 0 && cs.display !== 'inline' && cs.textOverflow !== 'ellipsis')
      out.push({ k: 'box', el: name(el), txt, sw: el.scrollWidth, cw: el.clientWidth });
  }
  return out;
}
"""

total = 0


def check(pg, w, name, scroll_all=True):
    global total
    pg.wait_for_timeout(350)
    found = pg.evaluate(FIND_JS)
    # 中の縦スクロールを下まで送りながら撮る
    pg.screenshot(path=str(OUT / f"{w}_{name}.png"))
    if scroll_all:
        h = pg.evaluate("() => { const s = document.querySelector('.scroll'); return s ? s.scrollHeight - s.clientHeight : 0 }")
        step, i = 600, 1
        y = step
        while h > 0 and y - step < h and i < 12:
            pg.evaluate(f"() => document.querySelector('.scroll').scrollTo(0, {y})")
            pg.wait_for_timeout(200)
            found += pg.evaluate(FIND_JS)
            pg.screenshot(path=str(OUT / f"{w}_{name}_{i}.png"))
            y += step
            i += 1
        pg.evaluate("() => { const s = document.querySelector('.scroll'); s && s.scrollTo(0, 0) }")
    uniq = {json.dumps(f, ensure_ascii=False) for f in found}
    total += len(uniq)
    print(f"{w} {name}: はみ出し {len(uniq)}")
    for u in sorted(uniq)[:12]:
        print("   ", u)


def tab(pg, label):
    pg.get_by_role("button", name=label).last.click()
    pg.wait_for_timeout(500)


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    for vw, vh in [(300, 640), (320, 640), (360, 740), (390, 844), (844, 390)]:
        if ONLYW and str(vw) != ONLYW:
            continue
        for full in (True, False):
            ctx = b.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=2, locale="ja-JP", timezone_id="Asia/Tokyo")
            init(ctx, seeded(full=full), full)
            ctx.add_init_script(f"document.addEventListener('DOMContentLoaded', () => ({ZOOM_JS})({ZOOM}))")
            pg = ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(URL)
            pg.wait_for_timeout(1200)
            tag = f"{vw}x{vh}{'' if full else '_free'}"
            pg.get_by_role("button", name="つづきから").click()
            pg.wait_for_timeout(600)
            check(pg, tag, "home")
            tab(pg, "ショップ")
            check(pg, tag, "shop")
            if full:
                for t in ("ダンジョン", "図鑑", "苦手", "成績"):
                    if pg.get_by_role("button", name=t).count():
                        tab(pg, t)
                        check(pg, tag, t)
            if full:
                tab(pg, "ダンジョン")
                pg.get_by_role("button", name="設定").click()
                pg.wait_for_timeout(500)
                check(pg, tag, "settings")
                pg.goto(URL)
                pg.wait_for_timeout(1000)
                pg.get_by_role("button", name="つづきから").click()
                pg.wait_for_timeout(600)
                pg.get_by_role("button", name="ダンジョンをはじめる").click()
                pg.wait_for_timeout(1500)
                check(pg, tag, "battle", scroll_all=False)
                pg.locator(".choice").first.click()
                pg.wait_for_timeout(900)
                check(pg, tag, "battle_answer", scroll_all=False)
            else:
                tab(pg, "ダンジョン")
                pg.locator(".upsell").first.click()
                pg.wait_for_timeout(600)
                check(pg, tag, "paywall")
            if errs:
                print("errors", errs[:3])
            ctx.close()
    b.close()
print("合計", total)
