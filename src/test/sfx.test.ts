import { describe, expect, it } from 'vitest';
import credits from '../../public/CREDITS.txt?raw';
import recipe from '../../scripts/build_sfx.py?raw';
import soundSrc from '../platform/sound.ts?raw';

/** public/sfx にある音のファイルの名前 */
const FILES = new Set(Object.keys(import.meta.glob('../../public/sfx/*.mp3')).map((k) => k.replace('../../public/sfx/', '').replace('.mp3', '')));
/** sound.ts の Sfx 型に並んだ名前 */
const TYPE = [...(soundSrc.match(/export type Sfx = ([^;]+);/)?.[1].matchAll(/'(\w+)'/g) ?? [])].map((m) => m[1]);
/** 画面のコードから play('名前') で鳴らしている名前 */
const SRC = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const PLAYED = new Set<string>();
for (const [path, code] of Object.entries(SRC)) {
  if (path.includes('/test/')) continue;
  for (const m of code.matchAll(/play\(([^)]*)\)/g)) for (const s of m[1].matchAll(/'(\w+)'/g)) PLAYED.add(s[1]);
}

describe('効果音のファイル', () => {
  it('Sfx の名前とファイルが 1 対 1 でそろう(使わない音のファイルが残っていない)', () => {
    expect(TYPE.length).toBeGreaterThan(10);
    expect([...FILES].sort()).toEqual([...TYPE].sort());
  });
  it('画面で鳴らしている音は、どれもファイルがある', () => {
    expect(PLAYED.size).toBeGreaterThan(5);
    for (const s of PLAYED) expect(FILES.has(s), s).toBe(true);
  });
  it('どの音も作り方(build_sfx.py)と出典(CREDITS.txt)に書いてある', () => {
    for (const s of FILES) {
      expect(recipe, s).toMatch(new RegExp(`'${s}':\\s+\\('`));
      expect(credits, s).toMatch(new RegExp(`^  ${s}: `, 'm'));
    }
  });
  it('決定の音は短い素材(効果音ラボ「決定ボタンを押す35」・0.3 秒まで)で、前のゲームスタートの音は使っていない', () => {
    const m = recipe.match(/'decide':\s+\('([^']+)', \[\], ([\d.]+),/);
    expect(m?.[1]).toBe('lab/decision35');
    expect(Number(m?.[2])).toBeLessThanOrEqual(0.3);
    expect(credits).toContain('決定ボタンを押す35');
    expect(recipe).not.toContain('decision18');
    expect(credits).not.toContain('決定ボタンを押す18');
  });
});
