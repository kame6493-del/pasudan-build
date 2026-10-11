"""主な画面を 390x844 で撮る(ヘッドレスの Chromium。共有の Chrome は使わない)。
先に npm run build と npm run preview(http://127.0.0.1:4350)。
python scripts/shots.py [名前...] → ../shots/NN_名前.png"""
import json
import random
import sys
import time
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
APP = Path(__file__).resolve().parent.parent
OUT = APP.parent / "shots"
OUT.mkdir(exist_ok=True)
URL = "http://127.0.0.1:4350/?mockbuy=1"
QS = json.load(open(APP / "src/data/questions.json", encoding="utf-8"))
TERMS = json.load(open(APP / "src/data/terms.json", encoding="utf-8"))
BY_TEXT = {q["q"]: q for q in QS}
ONLY = sys.argv[1:]


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


def answer_of(pg):
    t = pg.locator(".qtext").first.inner_text()
    q = BY_TEXT.get(t)
    if not q:  # 改行の違いなど
        q = next((x for x in QS if x["q"].replace("\n", "") == t.replace("\n", "")), None)
    return q["answer"] if q else 0


def click_choice(pg, k):
    pg.locator(".choice").nth(k).click()


def shot(pg, name, full=False):
    pg.wait_for_timeout(250)
    pg.screenshot(path=str(OUT / f"{name}.png"), full_page=full)
    print("shot", name)


def want(n):
    return not ONLY or n in ONLY


with sync_playwright() as p:
    b = p.chromium.launch()

    def new(data, full=True):
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="ja-JP", timezone_id="Asia/Tokyo")
        init(ctx, data, full)
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(URL)
        pg.wait_for_timeout(900)
        info = pg.evaluate("""() => ({
            loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight),
            check: ['500','700','800'].map(w => document.fonts.check(w + ' 16px PD', 'あ亜A')),
            body: getComputedStyle(document.body).fontFamily.split(',')[0],
        })""")
        print('fonts', info)
        return ctx, pg, errs

    if want("title") or want("onboard"):
        ctx, pg, errs = new(None, full=False)
        shot(pg, "01_title")
        pg.get_by_role("button", name="はじめる").click()
        pg.wait_for_timeout(500)
        shot(pg, "02_onboard_date")
        pg.get_by_role("button", name="つぎへ ›").click()
        pg.wait_for_timeout(300)
        shot(pg, "02b_onboard_hero")
        print(errs[:3])
        ctx.close()

    ctx, pg, errs = new(seeded())
    pg.get_by_role("button", name="つづきから").click()
    pg.wait_for_timeout(700)
    if want("home"):
        shot(pg, "03_home")
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 820)")
        shot(pg, "03b_home_meter")
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 1500)")
        shot(pg, "03c_home_dungeons")
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 0)")
    if want("map"):
        pg.locator(".dungeon-card").first.click()
        pg.wait_for_timeout(500)
        shot(pg, "04_map")
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 600)")
        shot(pg, "04b_map_lower")
    if want("battle"):
        pg.get_by_role("button", name="挑戦する ›").click()
        pg.wait_for_timeout(1200)
        shot(pg, "05_battle")
        click_choice(pg, answer_of(pg))
        pg.wait_for_timeout(260)
        shot(pg, "06_correct_fx")
        pg.wait_for_timeout(900)
        pg.locator(".qpanel").evaluate("e => e.scrollTo(0, 400)")
        shot(pg, "06b_correct_explain")
        pg.locator(".qpanel button.btn").last.click()
        pg.wait_for_timeout(600)
        k = answer_of(pg)
        click_choice(pg, (k + 1) % 4)
        pg.wait_for_timeout(300)
        shot(pg, "07_wrong_fx")
        pg.wait_for_timeout(900)
        pg.locator(".qpanel").evaluate("e => e.scrollTo(0, 500)")
        shot(pg, "07b_wrong_explain")
        # ボスまで正解で進む
        for _ in range(30):
            pg.locator(".qpanel button.btn").last.click()
            pg.wait_for_timeout(350)
            if pg.locator(".enemy.boss").count():
                break
            click_choice(pg, answer_of(pg))
            pg.wait_for_timeout(500)
        pg.wait_for_timeout(500)
        shot(pg, "08_midboss")
        for i in range(12):
            if pg.locator(".overlay").count():
                break
            if pg.locator(".choice:not([disabled])").count():
                click_choice(pg, answer_of(pg))
                pg.wait_for_timeout(400)
                if i == 2:
                    shot(pg, "08b_midboss_combo")
                pg.wait_for_timeout(700)
            pg.locator(".qpanel button.btn").last.click()
            pg.wait_for_timeout(500)
        pg.wait_for_timeout(500)
        shot(pg, "09_clear")
        for _ in range(12):
            if pg.locator(".overlay").count():
                pg.locator(".overlay .btn").last.click()
                pg.wait_for_timeout(400)
                if pg.locator(".overlay").count():
                    shot(pg, "09b_reward_next")
    if want("daily"):
        pg.get_by_role("button", name="ダンジョン").last.click()
        pg.wait_for_timeout(400)
        pg.get_by_role("button", name="ダンジョンをはじめる").click()
        pg.wait_for_timeout(900)
        for i in range(10):
            click_choice(pg, answer_of(pg))
            pg.wait_for_timeout(1000 if i == 9 else 450)
            pg.locator(".qpanel button.btn").last.click()
            pg.wait_for_timeout(450)
        pg.wait_for_timeout(600)
        shot(pg, "10_chest")
        while pg.locator(".overlay").count():
            pg.locator(".overlay .btn").last.click()
            pg.wait_for_timeout(500)
            if pg.locator(".overlay").count():
                shot(pg, "10b_after_chest")
    if want("zukan"):
        pg.get_by_role("button", name="図鑑").click()
        pg.wait_for_timeout(500)
        shot(pg, "11_zukan")
        pg.get_by_role("button", name="すべてのカードを見る").click()
        pg.wait_for_timeout(500)
        shot(pg, "12_zukan_list")
        pg.locator(".tcard:not(.none)").first.click()
        pg.wait_for_timeout(500)
        shot(pg, "13_term")
    if want("nigate"):
        pg.get_by_role("button", name="苦手").click()
        pg.wait_for_timeout(500)
        shot(pg, "14_nigate")
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 700)")
        shot(pg, "14b_nigate_list")
    if want("stats"):
        pg.get_by_role("button", name="成績").click()
        pg.wait_for_timeout(500)
        shot(pg, "15_stats")
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 700)")
        shot(pg, "15b_stats_lower")
    if want("kakomon"):
        pg.get_by_role("button", name="ダンジョン").last.click()
        pg.wait_for_timeout(400)
        pg.locator(".kk-entry").click()
        pg.wait_for_timeout(500)
        shot(pg, "26_kakomon")
        pg.get_by_role("button", name="分野別").click()
        pg.wait_for_timeout(300)
        pg.locator(".kk-main").nth(12).click()
        pg.wait_for_timeout(1200)
        shot(pg, "27_kakomon_q")
        click_choice(pg, answer_of(pg))
        pg.wait_for_timeout(1100)
        shot(pg, "27b_kakomon_correct")
        pg.locator(".qpanel").evaluate("e => e.scrollTo(0, 400)")
        shot(pg, "27c_kakomon_explain")
        pg.goto(URL)  # 途中でやめる確認を挟まずに戻る(記録はそのまま)
        pg.wait_for_timeout(900)
        pg.get_by_role("button", name="つづきから").click()
        pg.wait_for_timeout(600)
    if want("notes"):
        pg.get_by_role("button", name="図鑑").click()
        pg.wait_for_timeout(300)
        pg.locator(".notes-entry").click()
        pg.wait_for_timeout(500)
        pg.get_by_role("button", name="テクノロジ").click()
        pg.wait_for_timeout(300)
        pg.locator(".note-row").nth(9).click()
        pg.wait_for_timeout(600)
        shot(pg, "25_note_full")
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 99999)")
        shot(pg, "25b_note_full_lower")
    if want("shop"):
        pg.get_by_role("button", name="ショップ").click()
        pg.wait_for_timeout(500)
        shot(pg, "16_shop")
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 600)")
        shot(pg, "16b_shop_lower")
    if want("exam"):
        pg.get_by_role("button", name="ダンジョン").last.click()
        pg.wait_for_timeout(400)
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 99999)")
        pg.get_by_role("button", name="模擬試験に挑戦する").click()
        pg.wait_for_timeout(800)
        shot(pg, "17_exam")
        rnd = random.Random(3)
        for i in range(100):
            k = answer_of(pg)
            click_choice(pg, k if rnd.random() < 0.74 else (k + 1) % 4)
            if i < 99:
                pg.get_by_role("button", name="つぎ ›").click()
            pg.wait_for_timeout(30)
        pg.once("dialog", lambda d: d.accept())
        pg.get_by_role("button", name="採点").click()
        pg.wait_for_timeout(900)
        shot(pg, "18_exam_result")
        pg.locator(".qpanel").evaluate("e => e.scrollTo(0, 500)")
        shot(pg, "18b_exam_result_lower")
    print("errors:", errs[:5])
    ctx.close()

    if want("free"):
        ctx, pg, errs = new(seeded(full=False), full=False)
        pg.get_by_role("button", name="つづきから").click()
        pg.wait_for_timeout(600)
        pg.locator(".dungeon-card").nth(1).click()
        pg.wait_for_timeout(500)
        shot(pg, "19_free_locked_map")
        pg.get_by_role("button", name="ショップ").click()
        pg.wait_for_timeout(500)
        shot(pg, "20_free_shop")
        pg.get_by_role("button", name="ダンジョン").last.click()
        pg.wait_for_timeout(400)
        pg.locator(".upsell").first.click()
        pg.wait_for_timeout(500)
        shot(pg, "21_paywall")
        pg.locator(".sheet").evaluate("e => e.scrollTo(0, 9999)")
        shot(pg, "21b_paywall_lower")
        pg.get_by_role("button", name="あとで").click()
        pg.get_by_role("button", name="図鑑").click()
        pg.wait_for_timeout(300)
        pg.locator(".notes-entry").click()
        pg.wait_for_timeout(500)
        pg.get_by_role("button", name="マネジメント").click()
        pg.wait_for_timeout(300)
        shot(pg, "22_notes_list")
        pg.locator(".note-row").nth(1).click()
        pg.wait_for_timeout(500)
        shot(pg, "23_note_locked", full=False)
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 9999)")
        shot(pg, "23b_note_locked_lower")
        pg.get_by_role("button", name="ダンジョン").last.click()
        pg.wait_for_timeout(300)
        pg.locator(".scroll").evaluate("e => e.scrollTo(0, 99999)")
        pg.get_by_role("button", name="模擬試験に1回だけ無料で挑戦").click()
        pg.wait_for_timeout(400)
        shot(pg, "24_exam_picker")
        print("errors:", errs[:5])
        ctx.close()
    b.close()
