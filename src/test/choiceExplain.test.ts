import { describe, expect, it } from 'vitest';
import { CHOICE_EXPLAIN, choiceExplain, QUESTIONS } from '../domain/data';

describe('選択肢ごとの解説', () => {
  it('全問の id がそろい、余分な id が無い', () => {
    const ids = new Set(QUESTIONS.map((q) => q.id));
    expect(Object.keys(CHOICE_EXPLAIN).length).toBe(QUESTIONS.length);
    for (const id of Object.keys(CHOICE_EXPLAIN)) expect(ids.has(id)).toBe(true);
  });
  it('長さが選択肢と同じ・正解の位置は空・まちがいの選択肢は空欄なし', () => {
    for (const q of QUESTIONS) {
      const cx = choiceExplain(q);
      expect(cx, q.id).toHaveLength(q.choices.length);
      cx.forEach((e, i) => {
        if (i === q.answer) expect(e, `${q.id} ${i}`).toBe('');
        else expect(e.trim().length, `${q.id} ${i}`).toBeGreaterThanOrEqual(10);
      });
    }
  });
  it('無い問題は空の配列(画面は開閉の欄を出さない)', () => {
    const q = { ...QUESTIONS[0], id: 'no-such-id' };
    expect(choiceExplain(q)).toEqual([]);
  });
});
