import { describe, expect, it } from 'vitest';
import css from '../index.css?raw';
import { calmOn, emptyData, normalize } from '../domain/data';


describe('動きを少なく', () => {
  it('はじめは未選択(null)で、端末の設定に合わせる', () => {
    const d = emptyData();
    expect(d.calm).toBeNull();
    expect(calmOn(d, false)).toBe(false);
    expect(calmOn(d, true)).toBe(true);
  });
  it('自分で選んだら端末の設定より優先する', () => {
    expect(calmOn({ calm: true }, false)).toBe(true);
    expect(calmOn({ calm: false }, true)).toBe(false);
  });
  it('保存した値を読み直しても保たれ、壊れた値・前の版の記録は未選択になる', () => {
    expect(normalize(JSON.parse(JSON.stringify({ ...emptyData(), calm: true }))).calm).toBe(true);
    expect(normalize(JSON.parse(JSON.stringify({ ...emptyData(), calm: false }))).calm).toBe(false);
    expect(normalize({ ...emptyData(), calm: 'yes' } as never).calm).toBeNull();
    const old = { ...emptyData() } as Record<string, unknown>;
    delete old.calm;
    expect(normalize(old as never).calm).toBeNull();
  });
  it('オンの時は全部のアニメを止め、光る演出は出さず、文字の演出は短く消す', () => {
    expect(css).toMatch(/\.calm \*,\s*\.calm \*::before,\s*\.calm \*::after \{\s*animation: none !important;/);
    expect(css).toMatch(/\.calm \.flash \{\s*display: none;/);
    expect(css).toMatch(/\.calm \.dmg \{\s*animation: calm-out 0\.8s forwards !important;/);
    // calm-out は動かさない(透明度だけ)
    const kf = css.slice(css.indexOf('@keyframes calm-out'));
    expect(kf.slice(0, kf.indexOf('\n}\n'))).not.toMatch(/transform/);
    // 前の「端末の設定でアニメを一瞬で終わらせる」規則は残っていない(ダメージの数字などが見えなくなっていた)
    expect(css).not.toMatch(/@media \(prefers-reduced-motion/);
  });
});
