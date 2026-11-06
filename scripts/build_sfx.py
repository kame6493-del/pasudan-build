"""
効果音 23 個を、ダウンロードした素材(効果音ラボ・魔王魂)から作る。

    python scripts/build_sfx.py           # public/sfx/*.mp3 を書き出す
    python scripts/build_sfx.py --check   # あわせて ../sfx_check/ に波形の絵・数値・試聴ページを出す

素材の置き場所はリポジトリの外(../sfx_src/lab, ../sfx_src/maou)。素材そのものはリポジトリに入れない。
規約のメモは ../sfx_src/LICENSE_NOTES.md、出典は public/CREDITS.txt。

加工は規約で許された範囲(音量・長さの調整、2 つの素材を重ねる)だけ:
- 頭の無音を削る(押した瞬間に鳴る)
- 長すぎる尾を切って、短くフェードアウト
- 「いちばん大きい 120ms」の RMS で聞こえの大きさをそろえ、ピークは -1dBFS 以下
- モノラル 44.1kHz の mp3
"""
from __future__ import annotations

import json
import math
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / 'sfx_src'
OUT = ROOT / 'public' / 'sfx'
CHECK = ROOT.parent / 'sfx_check'
PEAK = 10 ** (-1.0 / 20)

# name: (素材, [重ねる素材(秒)], 最大の長さ(秒), 目標の大きさ dBFS, 説明)
RECIPE = {
    # 2026-11-04 決定の音を差し替え(持ち主「決定ボタン音ちょっとおかしい」。前の「決定ボタンを押す18」は 0.8 秒のゲームスタートの音で、毎回のボタンには重かった)
    'decide':  ('lab/decision35', [], 0.3, -17, '効果音ラボ「決定ボタンを押す35」(ポピッ)'),
    'select':  ('maou/maou_se_8bit04', [], None, -17, '魔王魂「レトロ04」(メニュー音)'),
    'tap':     ('lab/cursor1', [], None, -19, '効果音ラボ「カーソル移動1」'),
    # 2026-11-04 攻撃の音を差し替え(持ち主「攻撃の効果音が気になる」。前の「剣で斬る2」は 5kHz より上が6割の高い音だった)
    'slash':   ('lab/sword-gesture3', [], 0.3, -17, '効果音ラボ「剣の素振り3」(小剣を振る)'),
    'hit':     ('maou/maou_se_battle03', [], 0.5, -14, '魔王魂「戦闘03」(斬る音)'),
    'crit':    ('maou/maou_se_battle06', [('lab/punch-high2', 0.0, 0.55)], 0.8, -12,
                '魔王魂「戦闘06」(深く斬る音)+効果音ラボ「大パンチ」を重ねる(クリティカル)'),
    # 魔法で戦う見た目(ネコの魔法使い)の攻撃
    'mslash':  ('lab/magic-wind1', [], 0.35, -18, '効果音ラボ「風魔法1」(杖を振る)'),
    'mhit':    ('lab/magic-flame1', [], 0.6, -14, '効果音ラボ「火炎魔法1」(火の球)'),
    'mcrit':   ('lab/magic-flame1', [('lab/punch-high2', 0.05, 0.5)], 0.8, -12,
                '効果音ラボ「火炎魔法1」+「大パンチ」を重ねる(魔法のクリティカル)'),
    'damage':  ('lab/blow2', [], None, -14, '効果音ラボ「打撃2」'),
    'wrong':   ('maou/maou_se_onepoint33', [], None, -17, '魔王魂「ワンポイント33」(ハズレ)'),
    'defeat':  ('maou/maou_se_8bit12', [], None, -14, '魔王魂「レトロ12」(消滅音)'),
    'levelup': ('lab/levelup1', [], None, -13, '効果音ラボ「レベルアップ」'),
    'coin':    ('lab/item-get1', [], 1.3, -16, '効果音ラボ「アイテムを入手1」(お金)'),
    'chest':   ('lab/treasure-chest1', [('lab/kira2', 0.22, 0.8)], 1.6, -14,
                '効果音ラボ「宝箱を開ける」+「キラッ2」を重ねる'),
    'evolve':  ('lab/magic-statusup1', [], None, -14, '効果音ラボ「ステータス上昇魔法1」'),
    'combo':   ('lab/shakin3', [], 1.3, -15, '効果音ラボ「シャキーン3」'),
    'pass':    ('lab/trumpet1', [], None, -13, '効果音ラボ「ラッパのファンファーレ」'),
    'fail':    ('maou/maou_se_onepoint29', [], 1.8, -16, '魔王魂「ワンポイント29」(あちゃー)'),
    # 2026-10-18 ダンジョンのしかけ用
    'heal':    ('lab/magic-cure2', [], 1.4, -15, '効果音ラボ「回復魔法2」(中回復)'),
    'charge':  ('maou/maou_se_magical10', [], 1.4, -16, '魔王魂「マジカル10」(オーラをまとう)'),
    'escape':  ('lab/stupid5', [], 1.2, -17, '効果音ラボ「間抜け5」(気の抜ける音)'),
    'skill':   ('lab/magic-statusup2', [], 1.4, -14, '効果音ラボ「ステータス上昇魔法2」'),
}


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(path), '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, '<i2').astype(float) / 32768


def trim_head(x: np.ndarray, db: float = -40) -> np.ndarray:
    thr = np.max(np.abs(x)) * 10 ** (db / 20)
    i = int(np.argmax(np.abs(x) > thr))
    i = max(0, i - int(0.002 * SR))  # 立ち上がりを潰さないよう 2ms 残す
    return x[i:]


def trim_tail(x: np.ndarray, db: float = -55) -> np.ndarray:
    thr = np.max(np.abs(x)) * 10 ** (db / 20)
    nz = np.nonzero(np.abs(x) > thr)[0]
    return x[: nz[-1] + 1]


def fade_out(x: np.ndarray, sec: float) -> np.ndarray:
    n = min(len(x), int(sec * SR))
    x = x.copy()
    x[-n:] *= np.linspace(1, 0, n) ** 2
    return x


def loudness(x: np.ndarray) -> float:
    w = int(0.12 * SR)
    c = np.convolve(x ** 2, np.ones(w) / w, 'valid') if len(x) > w else np.array([np.mean(x ** 2)])
    return 10 * math.log10(c.max() + 1e-12)


def build(name: str) -> np.ndarray:
    src, layers, max_len, target, _ = RECIPE[name]
    x = trim_head(decode(SRC / f'{src}.mp3'))
    for lsrc, at, gain in layers:
        y = trim_head(decode(SRC / f'{lsrc}.mp3'))
        i = int(at * SR)
        if len(x) < i + len(y):
            x = np.concatenate([x, np.zeros(i + len(y) - len(x))])
        x[i:i + len(y)] += y * gain
    x = trim_tail(x)
    if max_len and len(x) > max_len * SR:
        x = fade_out(x[: int(max_len * SR)], 0.25)
    else:
        x = fade_out(x, 0.02)
    x = x * 10 ** ((target - loudness(x)) / 20)
    pk = np.max(np.abs(x))
    if pk > PEAK:
        x *= PEAK / pk
    return x


def write_mp3(y: np.ndarray, path: Path):
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / 'a.wav'
        with wave.open(str(wav), 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-ac', '1', '-ar', str(SR),
                        '-c:a', 'libmp3lame', '-b:a', '96k', '-map_metadata', '-1', str(path)], check=True)


def main():
    check = '--check' in sys.argv
    rows = []
    for name in RECIPE:
        p = OUT / f'{name}.mp3'
        write_mp3(build(name), p)
        if check:
            d = decode(p)
            a = np.abs(d)
            rows.append({'name': name, 'src': RECIPE[name][4], 'sec': round(len(d) / SR, 3),
                         'kb': round(p.stat().st_size / 1024, 1), 'peak_db': round(20 * math.log10(a.max()), 2),
                         'loud_db': round(loudness(d), 2),
                         'lead_ms': round(int(np.argmax(a > a.max() * 0.01)) / SR * 1000, 1),
                         'clip': int(np.sum(a >= 0.999)), 'data': d})
    if check:
        report(rows)


def report(rows):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    CHECK.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(12, 2, figsize=(14, 22))
    for ax, r in zip(axes.T.flat, rows):
        d = r['data']
        ax.plot(np.arange(len(d)) / SR, d, lw=0.4, color='#2b5fb4')
        for v in (1, -1):
            ax.axhline(v, color='#c33', lw=0.6)
        ax.set_ylim(-1.05, 1.05)
        ax.set_xlim(0, 2.5)
        ax.set_title(f"{r['name']}  {r['sec']}s  peak {r['peak_db']}dB  loud {r['loud_db']}dB  head {r['lead_ms']}ms",
                     fontsize=9, loc='left')
        ax.tick_params(labelsize=7)
    fig.tight_layout()
    fig.savefig(CHECK / 'waveforms.png', dpi=80)
    for r in rows:
        r.pop('data')
    (CHECK / 'stats.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    for r in rows:
        print(f"{r['name']:8} {r['sec']:6} {r['kb']:6}KB peak {r['peak_db']:6} loud {r['loud_db']:6} head {r['lead_ms']:5}ms clip {r['clip']}")
    print('total KB', round(sum(r['kb'] for r in rows), 1))
    write_preview(rows)


def write_preview(rows):
    """作業フォルダに試聴ページを出す(アプリには入れない。効果音ラボの規約で、効果音を自由に鳴らせる物は再配布扱いのため)"""
    sfx = '../app/public/sfx'
    trs = []
    for r in rows:
        trs.append(
            f"<tr><td><b>{r['name']}</b></td><td>{r['src']}</td>"
            f"<td><button onclick=\"p('{sfx}/{r['name']}.mp3')\">▶ 新</button> "
            f"<button class=o onclick=\"p('old/{r['name']}.mp3')\">前</button></td>"
            f"<td>{r['sec']}s</td><td>{r['peak_db']}</td><td>{r['loud_db']}</td><td>{r['lead_ms']}ms</td>"
            f"<td>{r['clip']}</td><td>{r['kb']}KB</td></tr>")
    bgm_rows = ''
    bgm_json = CHECK / 'bgm_stats.json'
    if bgm_json.exists():
        b = json.loads(bgm_json.read_text(encoding='utf-8'))
        bgm_rows = '<h2>BGM(ループで鳴らす。もう一度押すと止まる)</h2><table><tr><th>場面</th><th>曲</th><th></th><th>長さ</th><th>ピーク</th><th>大きさ</th><th>大きさ</th></tr>' + ''.join(
            f"<tr><td><b>{x['name']}</b></td><td>{x['src']}</td><td><button onclick=\"bg('../app/public/bgm/{x['name']}.mp3',{str(x['loop']).lower()})\">▶ / ■</button></td>"
            f"<td>{x['sec']}s</td><td>{x['peak_db']}</td><td>{x['loud_db']}</td><td>{x['kb']}KB</td></tr>" for x in b) + '</table>'
    html = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>パスダン 効果音の試聴</title>
<style>body{{font-family:sans-serif;margin:16px;background:#1d2233;color:#e8ecf6}}table{{border-collapse:collapse;font-size:14px}}
td,th{{border-bottom:1px solid #3a4260;padding:6px 8px;text-align:left}}button{{font-size:14px;padding:4px 10px;border-radius:6px;border:0;background:#f2c14e;cursor:pointer}}
button.o{{background:#8a93ad}}img{{max-width:100%;background:#fff;margin-top:12px}}</style></head><body>
<h1>パスダン 効果音の試聴</h1>
<p>「新」が今回の音、「前」が差し替え前の音。大きさ = いちばん大きい 120ms の RMS(dBFS)。アプリでは sound.ts の VOL を掛けて鳴る。</p>
<table><tr><th>名前</th><th>素材</th><th></th><th>長さ</th><th>ピーク</th><th>大きさ</th><th>頭の無音</th><th>クリップ</th><th>容量</th></tr>{''.join(trs)}</table>
{bgm_rows}
<img src="waveforms.png" alt="波形">
<script>
function p(u){{new Audio(u).play()}}
let cur=null,curU='';
function bg(u,loop){{if(cur){{cur.pause();if(curU===u){{cur=null;curU='';return}}}}cur=new Audio(u);cur.loop=loop;cur.volume=0.6;cur.play();curU=u}}
</script></body></html>"""
    (CHECK / 'preview.html').write_text(html, encoding='utf-8')


if __name__ == '__main__':
    main()
