"""
BGM を魔王魂の素材から作る(素材は ../sfx_src/bgm、リポジトリには入れない)。

    python scripts/build_bgm.py         # public/bgm/*.mp3 を書き出し、../sfx_check/bgm_stats.json に数値を出す

- ループ曲は魔王魂が配っている「ループ用」(maou_loop_…)を使う。配布の mp3 は両端に詰め物の無音(頭 約23ms・尾 10〜24ms)が
  あり、そのままだと継ぎ目で途切れるので、その無音だけを削る。ほかの加工は音量だけ。
- 聞こえの大きさは EBU R128 の積分ラウドネスで -18 LUFS にそろえ、真のピークは -1.5dBFS 以下。
- ステレオ 112kbps の mp3。
- ループの長さ(秒)は src/platform/sound.ts の BGM_LOOP に書く(mp3 の頭の詰め物があっても継ぎ目がずれないように)。
規約: 魔王魂は改変自由・商用可・著作表記が必要(「音楽：魔王魂」)。メモは ../sfx_src/LICENSE_NOTES.md。
"""
from __future__ import annotations

import json
import math
import re
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / 'sfx_src' / 'bgm'
OUT = ROOT / 'public' / 'bgm'
CHECK = ROOT.parent / 'sfx_check'
TARGET_LUFS = -18.0

# 場面: (素材, ループするか, 説明)
RECIPE = {
    'title':   ('maou_loop_bgm_8bit01', True, '魔王魂「8bit01」ループ版(城・タイトル)'),
    'dungeon': ('maou_loop_bgm_8bit04', True, '魔王魂「8bit04」ループ版(洞窟の探索)'),
    'battle':  ('maou_loop_bgm_8bit07', True, '魔王魂「8bit07」ループ版(戦闘曲)'),
    'boss':    ('maou_loop_bgm_8bit05', True, '魔王魂「8bit05」ループ版(戦闘曲・ボス/模擬試験)'),
    'victory': ('maou_game_jingle01', False, '魔王魂 旧ゲーム音楽「ジングル01」(勝利)'),
}


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(path), '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, '<i2').astype(float).reshape(-1, 2) / 32768


def lufs(path: Path) -> tuple[float, float]:
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True, encoding='utf-8', errors='ignore').stderr
    summ = err[err.rfind('Summary:'):]
    i = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
    tp = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
    return i, tp


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for name, (src, loop, desc) in RECIPE.items():
        sp = SRC / f'{src}.mp3'
        li, tp = lufs(sp)
        gain = TARGET_LUFS - li
        if tp + gain > -1.5:
            gain = -1.5 - tp
        d = decode(sp)
        m = np.abs(d).max(1)
        nz = np.nonzero(m > 1e-3)[0]
        d = d[nz[0]: nz[-1] + 1] if loop else d[max(0, nz[0] - int(0.002 * SR)):]  # ジングルは頭の無音だけ削る
        seam = float(np.max(np.abs(d[-1] - d[0]))) if loop else 0.0
        d = d * 10 ** (gain / 20)
        op = OUT / f'{name}.mp3'
        with tempfile.TemporaryDirectory() as td:
            wav = Path(td) / 'a.wav'
            with wave.open(str(wav), 'wb') as w:
                w.setnchannels(2)
                w.setsampwidth(2)
                w.setframerate(SR)
                w.writeframes((np.clip(d, -1, 1) * 32767).astype('<i2').tobytes())
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-c:a', 'libmp3lame', '-b:a', '112k',
                            '-map_metadata', '-1', str(op)], check=True)
        oi, otp = lufs(op)
        o = decode(op)
        head = int(np.argmax(np.abs(o).max(1) > 1e-3)) / SR * 1000
        rows.append({'name': name, 'src': desc, 'loop': loop, 'loop_sec': round(len(d) / SR, 4),
                     'sec': round(len(o) / SR, 3), 'kb': round(op.stat().st_size / 1024, 1),
                     'lufs': round(oi, 1), 'peak_db': round(otp, 1),
                     'loud_db': round(oi, 1), 'gain_db': round(gain, 1), 'seam_jump': round(seam, 4), 'head_ms': round(head, 1)})
        print(rows[-1])
    CHECK.mkdir(parents=True, exist_ok=True)
    (CHECK / 'bgm_stats.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    print('total KB', round(sum(r['kb'] for r in rows), 1))


if __name__ == '__main__':
    main()
