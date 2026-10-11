"""参考画像(ref_01〜10)から部品を切り出して public/art へ。python scripts/cut_assets.py [名前...]"""
import sys
from pathlib import Path
from PIL import Image
import cutlib as C

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "public/art"
OUT.mkdir(parents=True, exist_ok=True)
CHK = HERE / "cut_out"
R = {i: Image.open(HERE.parents[1] / f"ref/ref_{i:02d}.png").convert("RGB") for i in range(1, 11)}
PAPER = (242, 234, 218)
ONLY = set(sys.argv[1:])
done = {}

def save(name, im, maxw=None):
    if ONLY and name not in ONLY:
        return
    if maxw and im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=88, method=6)
    done[name] = im

def key(n, box, k=PAPER, tol=22, **kw):
    return C.cut_key(R[n], box, k, tol=tol, beige=True, **kw)

def outline(n, box, **kw):
    return C.cut_outline(R[n], box, **kw)

def grab(n, box, **kw):
    return C.cut_grab(R[n], box, **kw)

def rect(n, box):
    return R[n].crop(box)

# ---- モンスター(ref_10 の素材シート) ----
save("mon_woodgolem", key(10, (34, 1244, 190, 1372)))
save("mon_mushroom", key(10, (198, 1284, 284, 1366)))
save("mon_gearknight", key(10, (320, 1250, 460, 1372)))
save("mon_mechabit", key(10, (466, 1266, 556, 1372)))
save("mon_virus", key(10, (676, 1288, 764, 1368)))
save("mon_icedragon", key(10, (764, 1242, 924, 1372)))

# ---- 部品(ref_10) ----
save("ui_heart", key(10, (30, 668, 92, 726)))
save("ui_devil", key(10, (324, 668, 373, 723)))
save("combo_1", key(10, (584, 636, 648, 738)))
save("combo_3", key(10, (650, 636, 719, 738)))
save("combo_5", key(10, (720, 630, 805, 738)))
save("combo_10", key(10, (806, 606, 914, 738)))
save("chest_wood", key(10, (34, 812, 128, 900)))
save("chest_silver", key(10, (134, 812, 230, 900)))
save("chest_gold", key(10, (230, 790, 338, 900)))
save("chest_open", key(10, (344, 788, 452, 900)))
save("coin", key(10, (494, 822, 563, 887)))
save("coin_shine", key(10, (584, 812, 660, 887)))
save("flame", key(10, (698, 798, 770, 887)))
save("xp", key(10, (819, 806, 899, 887)))
NAVY = [(20, 27, 48), (24, 32, 56), (30, 38, 64)]
save("tab_book", key(10, (114, 1018, 176, 1082), k=NAVY, tol=40))
save("tab_nigate", key(10, (186, 1018, 240, 1082), k=NAVY, tol=40))
save("tab_chart", key(10, (258, 1018, 308, 1082), k=NAVY, tol=40))
save("tab_shop", key(10, (328, 1018, 390, 1082), k=NAVY, tol=40))
save("tab_dungeon", grab(10, (40, 1020, 104, 1080), margin=6))
save("logo", key(10, (698, 82, 920, 292)))
save("hourglass", key(10, (435, 1456, 486, 1522)))
save("crown", key(10, (660, 1472, 698, 1506), k=[(28, 30, 40), (34, 36, 48), (48, 53, 64), (62, 64, 71)], tol=30))
save("lv_badge", key(10, (853, 1500, 929, 1572)))

# ---- 主人公・相棒(ref_02 C の選択カード) ----
CARD = [(246, 249, 253), (254, 254, 254), (253, 246, 234), (254, 249, 236), (250, 242, 227)]
save("hero_hood", key(2, (646, 586, 768, 706), k=CARD, tol=16))
save("hero_fox", key(2, (788, 584, 898, 706), k=CARD, tol=16))
save("hero_catmage", key(2, (654, 784, 770, 913), k=CARD, tol=16))
save("hero_knight", key(2, (788, 786, 901, 913), k=CARD, tol=16))
save("pet_owl", key(2, (750, 1054, 806, 1111), k=CARD + [(233, 228, 226)], tol=16))
save("pet_dragon", key(2, (834, 1042, 902, 1111), k=CARD, tol=16))

# ---- 場面の上のキャラ(輪郭で抜く) ----
def grab(n, box, **kw):
    return C.cut_grab(R[n], box, **kw)

save("hero_back", grab(5, (34, 608, 226, 818), bg=[("rect", (184, 128, 192, 210))], fg=[("ellipse", (60, 20, 130, 100)), ("rect", (50, 110, 110, 160)), ("poly", [(183, 90), (189, 94), (146, 150), (140, 146)])]))
save("pet_cat", grab(8, (186, 754, 256, 832), fg=[("ellipse", (15, 25, 55, 60))]))
save("owl_teacher", grab(1, (768, 328, 918, 428), fg=[("ellipse", (50, 30, 110, 90))], bg=[("poly", [(10, 12), (60, 12), (60, 60), (30, 40), (10, 30)])]))

# ---- ボス・場面のモンスター(GrabCut) ----
save("boss_ent", grab(6, (36, 418, 304, 652), fg=[("ellipse", (70, 30, 200, 200))]))
save("boss_celes", grab(6, (330, 436, 604, 652), fg=[("ellipse", (90, 30, 190, 200))], bg=[("rect", (0, 0, 30, 24)), ("rect", (236, 0, 274, 60))]))
save("boss_hood", grab(4, (688, 396, 852, 536), fg=[("ellipse", (50, 20, 115, 110))]))
save("mon_robot", grab(4, (48, 1278, 168, 1404), fg=[("ellipse", (30, 20, 90, 90))]))
save("mon_bat", grab(1, (448, 552, 612, 742), fg=[("ellipse", (60, 40, 130, 130))]))
save("mon_armor", grab(4, (44, 950, 152, 1082), fg=[("ellipse", (25, 20, 80, 100))]))
save("mon_gear", grab(4, (188, 992, 276, 1072), fg=[("ellipse", (25, 20, 60, 55))]))
save("mon_stump", grab(3, (262, 1392, 350, 1528), fg=[("ellipse", (20, 30, 70, 110))]))

# ---- 演出の文字(GrabCut) ----
save("fx_seikai", grab(1, (30, 466, 300, 676), fg=[("rect", (40, 60, 230, 160))]))
save("fx_oshii", grab(1, (346, 428, 604, 548), fg=[("rect", (40, 30, 220, 90))]))
save("fx_combo10", grab(5, (508, 296, 776, 412), fg=[("rect", (20, 30, 160, 90))], bg=[("rect", (168, 78, 268, 116))]))
save("fx_critical", grab(5, (742, 450, 916, 548), fg=[("rect", (20, 25, 160, 70))]))
save("fx_levelup", grab(9, (540, 216, 836, 300), fg=[("rect", (30, 25, 260, 60))], bg=[("rect", (0, 76, 296, 84))]))
save("fx_chest", grab(9, (90, 222, 420, 300), fg=[("rect", (60, 20, 270, 60))]))
save("fx_evolve", grab(9, (110, 1048, 400, 1132), fg=[("rect", (30, 20, 260, 70))]))

# ---- 背景(場面をそのまま。スライムは消して相棒に置きかえる) ----
import numpy as np, cv2

def scene(n, box, erase=(), pets=(), blur=0, scale=1, rects=()):
    """box を切り出し、erase の各 box(切り抜き内座標)を GrabCut で抜いて周りの色で埋め、pets を貼る"""
    im = R[n].crop(box)
    a = np.asarray(im).copy()
    for eb in erase:
        part = C.cut_grab(R[n], (box[0] + eb[0], box[1] + eb[1], box[0] + eb[2], box[1] + eb[3]), margin=2)
        m = np.zeros(a.shape[:2], np.uint8)
        al = np.asarray(part.getchannel("A")) > 20
        ox, oy = part.info.get("off", (0, 0))
        m[eb[1] + oy: eb[1] + oy + al.shape[0], eb[0] + ox: eb[0] + ox + al.shape[1]] = al * 255
        m = cv2.dilate(m, np.ones((7, 7), np.uint8))
        a = cv2.inpaint(a, m, 9, cv2.INPAINT_TELEA)
    for rb in rects:
        m = np.zeros(a.shape[:2], np.uint8)
        cv2.ellipse(m, ((rb[0] + rb[2]) // 2, (rb[1] + rb[3]) // 2), ((rb[2] - rb[0]) // 2, (rb[3] - rb[1]) // 2), 0, 0, 360, 255, -1)
        a = cv2.inpaint(a, m, 15, cv2.INPAINT_TELEA)
    out = Image.fromarray(a).convert("RGBA")
    for name, (x, y, w) in pets:
        p = done.get(name) or Image.open(OUT / f"{name}.webp")
        p = p.convert("RGBA").resize((w, round(p.height * w / p.width)), Image.LANCZOS)
        out.alpha_composite(p, (x, y - p.height))
    out = out.convert("RGB")
    if scale != 1:
        out = out.resize((round(out.width * scale), round(out.height * scale)), Image.LANCZOS)
    if blur:
        from PIL import ImageFilter
        out = out.filter(ImageFilter.GaussianBlur(blur))
    return out

save("bg_title", scene(2, (22, 250, 312, 1192), erase=[(196, 732, 284, 822)], pets=[("pet_owl", (206, 820, 64))], scale=1.5))
save("bg_home", scene(3, (22, 352, 456, 628), erase=[(292, 128, 380, 214)], pets=[("pet_owl", (302, 212, 70))], scale=1.2))
save("bg_forest", scene(4, (25, 418, 306, 660), rects=[(172, 176, 264, 246), (228, 122, 282, 176)], pets=[("pet_cat", (180, 244, 78))], scale=1.4))
save("bg_castle", scene(4, (25, 780, 252, 1080), scale=1.6))
save("bg_tower", scene(4, (25, 1190, 306, 1430), scale=1.4))
save("bg_forest_b", scene(4, (25, 418, 306, 548), rects=[(228, 122, 282, 140)], scale=1.4))
save("bg_castle_b", scene(4, (25, 786, 306, 950), scale=1.4))
save("bg_tower_b", scene(4, (25, 1190, 306, 1282), scale=1.4))
save("bg_pass", scene(6, (642, 540, 908, 726), scale=1.4))

# ---- 相棒(ref_09 D の見た目セット。動物だけ) ----
save("pet_brown", key(9, (598, 1444, 646, 1500), k=[(250, 243, 228), (248, 240, 222)], tol=18))
save("pet_orange", key(9, (666, 1444, 714, 1500), k=[(250, 243, 228), (248, 240, 222)], tol=18))
save("pet_black", key(9, (732, 1444, 782, 1500), k=[(250, 243, 228), (248, 240, 222)], tol=18))
save("pet_dragon2", key(9, (798, 1440, 858, 1500), k=[(250, 243, 228), (248, 240, 222)], tol=18))

# ---- 用語カードの絵(ref_07 B。カードの窓をそのまま) ----
for nm, b in {"card_doc": (353, 668, 459, 774), "card_robot": (490, 668, 594, 774), "card_chain": (353, 876, 459, 982),
              "card_shield": (490, 876, 594, 982), "card_chart": (353, 1088, 459, 1192), "card_books": (490, 1088, 594, 1192),
              "card_db": (353, 1297, 459, 1403)}.items():
    save(nm, rect(7, b))
# ---- 分野の本(ref_07 A) ----
save("book_strategy", grab(7, (22, 830, 140, 1009), margin=3, fg=[("rect", (14, 12, 108, 166))]))
save("book_management", grab(7, (22, 1014, 140, 1193), margin=3, fg=[("rect", (14, 12, 108, 166))]))
save("book_technology", grab(7, (22, 1197, 140, 1376), margin=3, fg=[("rect", (14, 12, 108, 166))]))
# ---- アプリアイコンの元 ----
save("icon_src", rect(10, (44, 108, 258, 322)))

if __name__ == "__main__":
    C.check_sheet(done, CHK / ("check_" + ("_".join(sorted(ONLY))[:40] if ONLY else "all") + ".png"))
    print(len(done), "saved")
