import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../domain/data';
import { comboRows, easeScore, figLen, formatQuestion, needsCalc, splitBlanks } from '../domain/format';
import { CALC_BONUS, critWindow, easeOf, enemyHit, enemyHp, floorQuestions, floorPool, heroHp, timeLimit } from '../domain/game';
import { emptyData } from '../domain/data';
import { DUNGEONS, FIELDS } from '../domain/world';

const joined = (s: string) =>
  formatQuestion(s)
    .map((b) => ('label' in b ? b.label + b.text : b.text))
    .join('')
    .replace(/[\s　]/g, '');

describe('問題文の区切り', () => {
  it('全問で文字を落とさない・足さない(空白と改行を除いて元と同じ)', () => {
    for (const q of QUESTIONS) expect(joined(q.q)).toBe(q.q.replace(/<br\s*\/?>/gi, '').replace(/[\s　]/g, ''));
  });
  it('「。」で文を分け、長い文の問いかけを次の行へ送る', () => {
    const b = formatQuestion('店舗の運営戦略を検討することにした。各店舗の三つの要素を，一つの図表で全店舗分可視化するときに用いる図表として，最も適切なものはどれか。');
    expect(b.map((x) => x.kind)).toEqual(['p', 'p', 'ask']);
    expect(b[2].text).toBe('最も適切なものはどれか。');
  });
  it('短い問題は1行のまま', () => {
    expect(formatQuestion('次のうち，無線LANで使用される暗号化規格はどれか。')).toHaveLength(1);
  });
  it('a〜c・①・(1) は箇条に、かっこの中の「。」では分けない', () => {
    const b = formatQuestion('次の記述のうち，適切なものはどれか。\na　氏名が掲載された。\n(2)　手順を定める。\n① 「終わり。次へ」と言う。');
    expect(b.filter((x) => x.kind === 'item').map((x) => ('label' in x ? x.label : ''))).toEqual(['a', '(2)', '①']);
    expect(formatQuestion('彼は「終わり。次へ」と言った。')).toHaveLength(1);
  });
  it('空欄と組合せの選択肢', () => {
    expect(splitBlanks('通信範囲が［ a ］，電力が［ b ］。').filter((p) => p.blank).map((p) => p.t)).toEqual(['a', 'b']);
    expect(comboRows('a: 高く / b: 低く')).toEqual([
      { label: 'a', text: '高く' },
      { label: 'b', text: '低く' },
    ]);
    expect(comboRows('ガントチャート')).toBeNull();
  });
});

describe('序盤のゆるさ', () => {
  it('用語を問う短い問題は、計算や a〜c の組合せの問題より易しい目安になる', () => {
    const word = { q: '次のうち，無線LANで使用される暗号化規格はどれか。', choices: ['cookie', 'ESSID', 'MIME', 'WPA2'] };
    const calc = { q: '売上高が1,000万円，変動費が600万円，固定費が300万円のとき，利益は幾らか。', choices: ['100', '300', '400', '700'] };
    const combo = { q: '次の記述a〜cのうち，適切なものだけを全て挙げたものはどれか。\na　x\nb　y\nc　z', choices: ['a', 'a，b', 'a，b，c', 'b，c'] };
    expect(easeScore(word)).toBeLessThan(easeScore(calc));
    expect(easeScore(word)).toBeLessThan(easeScore(combo));
  });
  it('1階の出題は、その階の問題の平均より易しく、最初の5問は特に易しい', () => {
    const d = emptyData();
    for (const f of FIELDS) {
      const pool = floorPool(f, 0);
      const avg = pool.reduce((s, q) => s + easeOf(q), 0) / pool.length;
      const qs = floorQuestions(d, f, 0);
      expect(qs).toHaveLength(24);
      const first5 = qs.slice(0, 5).reduce((s, q) => s + easeOf(q), 0) / 5;
      expect(first5).toBeLessThan(avg * 0.75);
      expect(qs.slice(0, 5).map(easeOf)).toEqual([...qs.slice(0, 5).map(easeOf)].sort((a, b) => a - b));
    }
  });
  it('4階からは元の強さ・元の出し方', () => {
    expect(enemyHit(1, false, 3)).toBe(Math.round(heroHp(1) * 0.24));
    expect(enemyHit(1, false, 0)).toBeLessThan(enemyHit(1, false, 3));
    expect(enemyHp(1, true, 0)).toBeLessThan(enemyHp(1, true, 3));
    expect(enemyHp(1, false, 0)).toBe(Math.round(24 * 1.9));
    const q = QUESTIONS[0];
    expect(critWindow(q, 0)).toBeGreaterThan(critWindow(q, 3));
    expect(critWindow(q, 3)).toBe(critWindow(q));
    expect(DUNGEONS.strategy.floors).toHaveLength(10);
  });
  it('1階は7回まちがえても倒れない', () => {
    expect(enemyHit(1, false, 0) * 7).toBeLessThan(heroHp(1));
  });
});

describe('計算の問題の制限時間(10/28 テスターの指摘)', () => {
  const calc = QUESTIONS.filter((q) => needsCalc(q));
  const plain = QUESTIONS.filter((q) => !needsCalc(q));
  const same = (q: (typeof QUESTIONS)[number]) => ({ ...q, q: q.q.replace(/[0-9０-９]/g, 'x').replace(/計算|求め|稼働率|利益/g, '〇'), choices: q.choices.map((c) => c + '語'), code: undefined });
  it('計算の問題は全体の一部(用語の問題まで長くしない)', () => {
    expect(calc.length).toBeGreaterThan(60);
    expect(calc.length).toBeLessThan(QUESTIONS.length * 0.15);
  });
  it('稼働率・転送時間・損益分岐点・プログラムの問題は計算の問題と見なす', () => {
    expect(needsCalc({ q: '稼働率0.9の装置を2台直列につないだときの稼働率は幾らか。', choices: ['0.81', '0.9', '0.95', '0.99'] })).toBe(true);
    expect(needsCalc({ q: '伝送速度20Mbps，伝送効率80%の回線で1Gバイトを送る時間は何秒か。', choices: ['0.625', '50', '62.5', '500'] })).toBe(true);
    expect(needsCalc({ q: '次のプログラムの出力はどれか。', choices: ['ア', 'イ', 'ウ', 'エ'], code: 'x ← 1' })).toBe(true);
    expect(needsCalc({ q: '情報セキュリティの機密性を説明したものはどれか。', choices: ['許可された者だけ', '正確さ', '使いたい時に使える', '否認できない'] })).toBe(false);
  });
  it('同じ長さなら計算の問題は早押しの時間が CALC_BONUS 秒長い(どの階でも)', () => {
    for (const q of calc.slice(0, 40)) {
      const s = same(q);
      expect(needsCalc(s)).toBe(false);
      const len = (x: typeof q) => x.q.length + x.choices.join('').length + (x.table ? x.table.flat().join('').length : 0) + (x.code?.length ?? 0);
      if (len(s) !== len(q)) continue;
      for (const f of [0, 1, 5]) expect(critWindow(q, f) - critWindow(s, f)).toBeGreaterThanOrEqual(Math.min(CALC_BONUS, 51 + CALC_BONUS - critWindow(s, f)));
    }
  });
  it('計算の問題の早押しは最低でも 30 秒、1問の時間は早押し+30 秒', () => {
    for (const q of calc) {
      expect(critWindow(q, 5)).toBeGreaterThanOrEqual(30);
      expect(critWindow(q, 5)).toBeLessThanOrEqual(51 + CALC_BONUS);
      expect(timeLimit(q, 5)).toBe(critWindow(q, 5) + 30);
    }
  });
  it('計算でない問題の時間は前と同じ(上限 51 秒)', () => {
    for (const q of plain) {
      // 11/5 から、2枚目以降の表と図の分(figLen)も足す
      const len = q.q.length + q.choices.join('').length + (q.table ? q.table.flat().join('').length : 0) + (q.code?.length ?? 0) + figLen(q);
      expect(critWindow(q, 5)).toBe(Math.min(51, Math.round(8 + len / 9)));
    }
  });
});
