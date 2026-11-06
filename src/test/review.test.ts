import { describe, expect, it } from 'vitest';
import { lastReviewable, lookBack, lookForward, stepsBack } from '../domain/review';

describe('クエスト中の見返し(前の問題)', () => {
  it('まだ1問も答えていなければ戻れない', () => {
    expect(lastReviewable(0, false)).toBe(-1);
    expect(lookBack(null, 0, false)).toBeNull();
  });
  it('いまの問題に答えた直後は、その1つ前から見返す(いまの問題は画面に出ている)', () => {
    // 1問目に答えただけ → 見返す物はない
    expect(lookBack(null, 1, true)).toBeNull();
    // 3問答えて3問目の解説を見ている → 2問目(番号1)へ
    expect(lookBack(null, 3, true)).toBe(1);
    expect(stepsBack(1, 3, true)).toBe(1);
  });
  it('次の問題を解いている途中は、直前に答えた問題へ戻る', () => {
    expect(lookBack(null, 3, false)).toBe(2);
    expect(stepsBack(2, 3, false)).toBe(1);
    expect(stepsBack(0, 3, false)).toBe(3);
  });
  it('さかのぼりは最初の問題で止まる', () => {
    expect(lookBack(2, 3, false)).toBe(1);
    expect(lookBack(1, 3, false)).toBe(0);
    expect(lookBack(0, 3, false)).toBe(0);
  });
  it('「次」でいちばん新しい記録を越えると、いまの問題へ戻る', () => {
    expect(lookForward(0, 3, false)).toBe(1);
    expect(lookForward(2, 3, false)).toBeNull();
    expect(lookForward(1, 3, true)).toBeNull();
    expect(lookForward(null, 3, false)).toBeNull();
  });
});
