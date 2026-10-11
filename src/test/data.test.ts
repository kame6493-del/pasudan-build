import { describe, expect, it } from 'vitest';
import { QUESTIONS, TERMS } from '../domain/data';
import { damage, emptyHelpers, judge, levelOf, predict } from './helpers';

describe('問題データ', () => {
  it('全問が4択で正解が0〜3', () => {
    expect(QUESTIONS.length).toBeGreaterThan(250);
    for (const q of QUESTIONS) {
      expect(q.choices).toHaveLength(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length).toBeGreaterThan(20);
    }
  });
  it('用語カードは100枚以上で、関連問題がある', () => {
    expect(TERMS.length).toBeGreaterThanOrEqual(100);
    for (const t of TERMS) expect(t.q.length).toBeGreaterThan(0);
  });
});

describe('ゲームの計算', () => {
  it('合否は総合600・各分野300', () => {
    expect(judge(600, 300, 300, 300)).toBe(true);
    expect(judge(700, 290, 800, 800)).toBe(false);
    expect(judge(599, 900, 900, 900)).toBe(false);
  });
  it('レベルと攻撃', () => {
    expect(levelOf(0).lv).toBe(1);
    expect(levelOf(50).lv).toBe(2);
    expect(damage(1, 10, true, 0.5)).toBeGreaterThan(damage(1, 0, false, 0.5));
  });
  it('解いていなければ予想点は出ない', () => {
    expect(predict(emptyHelpers()).total).toBeNull();
  });
});

import { emptyData, normalize } from '../domain/data';
import { canEvolve, canTakeExam, failNote, floorQuestions, freeExamsLeft, FREE_EXAMS, freeNoteCount, FREE_TRIAL_FLOORS, questionOpen, recordAnswer, examLimitMin } from '../domain/game';
import { DUNGEONS } from '../domain/world';
import type { AppData } from '../domain/types';

describe('無料と完全版の境目', () => {
  const free = emptyData();
  const full = { ...emptyData(), owned: { full: true, looks: false } };
  it('ダンジョンは森の全階と、城・塔の最初の3階が無料', () => {
    expect(FREE_TRIAL_FLOORS).toBe(3);
    for (const q of QUESTIONS) {
      const floor = DUNGEONS[q.field].floors.indexOf(q.topic);
      expect(questionOpen(free, q)).toBe(q.field === 'strategy' || floor < FREE_TRIAL_FLOORS);
      expect(questionOpen(full, q)).toBe(true);
    }
  });
  it('無料の階の問題が足りなくても、鍵の階の問題で埋めない', () => {
    for (let n = 0; n < 5; n++) {
      for (const f of ['management', 'technology'] as const) {
        for (let fl = 0; fl < FREE_TRIAL_FLOORS; fl++) for (const q of floorQuestions(free, f, fl)) expect(questionOpen(free, q)).toBe(true);
      }
    }
  });
  it('要点ノートの無料は16テーマ(森10・城3・塔3)', () => {
    expect(freeNoteCount()).toBe(16);
  });
  it('模擬試験は無料で2回、完全版は何回でも', () => {
    expect(FREE_EXAMS).toBe(2);
    expect(freeExamsLeft(free)).toBe(2);
    expect(canTakeExam({ ...free, freeExams: 1 })).toBe(true);
    expect(canTakeExam({ ...free, freeExams: 2 })).toBe(false);
    expect(canTakeExam({ ...full, freeExams: 9 })).toBe(true);
    // 前の版の「1回使った」は1回と数える
    const { freeExams: _x, ...old } = emptyData();
    void _x;
    expect(normalize({ ...old, freeExamUsed: true }).freeExams).toBe(1);
  });
  it('金への進化は完全版だけ。無料は銀のまま', () => {
    const t = TERMS[0];
    const q = QUESTIONS.find((x) => x.id === t.q[0])!;
    let d: AppData = { ...free, cards: { [t.id]: 1 } };
    d = recordAnswer(d, q, true, { counted: false, combo: 1 }).data;
    d = recordAnswer(d, q, true, { counted: false, combo: 2 }).data;
    expect(canEvolve(d)).toBe(false);
    expect(d.cards[t.id]).toBe(1);
    let e: AppData = { ...full, cards: { [t.id]: 1 } };
    e = recordAnswer(e, q, true, { counted: false, combo: 1 }).data;
    e = recordAnswer(e, q, true, { counted: false, combo: 2 }).data;
    expect(e.cards[t.id]).toBe(2);
  });
  it('模試の時間は分単位で、選ぶ画面と時計がそろう', () => {
    expect(examLimitMin(100)).toBe(120);
    expect(examLimitMin(98)).toBe(118);
  });
});

describe('模擬試験', () => {
  it('分野の足切りで落ちた時は「あと0点」ではなく足りない分野を言う', () => {
    const s = failNote({ total: 800, s: 1000, m: 0, t: 900 });
    expect(s).not.toContain('あと 0 点');
    expect(s).toContain('マネジメント 0点');
    expect(failNote({ total: 550, s: 700, m: 400, t: 500 })).toContain('あと 50 点');
  });
  it('途中の解答は読み込みで形をそろえ、壊れていれば捨てる', () => {
    const ids = QUESTIONS.slice(0, 3).map((q) => q.id);
    const d = normalize({ ...emptyData(), examDraft: { ids, ans: [1, null, 9], elapsed: 5000, i: 1 } });
    expect(d.examDraft?.ans).toEqual([1, null, null]);
    expect(d.examDraft?.i).toBe(1);
    expect(normalize({ ...emptyData(), examDraft: { ids: ['nai'], ans: [0], elapsed: 0, i: 0 } }).examDraft).toBeNull();
    expect(normalize({ ...emptyData(), examDraft: { ids, ans: [0], elapsed: 0, i: 0 } }).examDraft).toBeNull();
  });
});
