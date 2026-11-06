/**
 * ゼロから学ぶ道の進み方と、覚えるカードの山(2026-11-04)。
 * 単元の段: 1=説明を読んだ 2=用語カードを見た 3=確かめの問題を解いた。3で単元クリア。
 * 分野のまとめのテストを解いたら course['test:<分野>'] = 3。
 */
import { PATH, UNITS, type Unit } from '../data/course';
import { Q_BY_ID, QUESTIONS, TERMS, TERMS_OF_Q, TERM_BY_ID } from './data';
import { FREE_UNITS } from './game';
import type { AppData, Field, Question, Term } from './types';

export const unitIndexInField = (u: Unit) => UNITS.filter((x) => x.field === u.field).indexOf(u);

/** 単元が開いているか。各分野の最初の FREE_UNITS 単元は無料 */
export const unitOpen = (d: AppData, u: Unit) => d.owned.full || unitIndexInField(u) < FREE_UNITS;

export const unitStep = (d: AppData, u: Unit) => d.course[u.id] ?? 0;
export const unitDone = (d: AppData, u: Unit) => unitStep(d, u) >= 3;

/** その単元の確かめの問題(単元ごとに選んだ過去問。易しい順) */
export const unitQuiz = (u: Unit): Question[] => u.qs.map((id) => Q_BY_ID.get(id)).filter((q): q is Question => !!q);
/** 用語カードの元にする問題(確かめの問題) */
const unitQuestions = unitQuiz;

/** 単元の大事な用語を、めくるカードの形に */
export const unitCards = (u: Unit): Term[] =>
  u.words.map(([name, desc], i) => ({ id: `${u.id}-w${i}`, name, full: '', field: u.field, desc, art: '', q: [] }) as unknown as Term);

/** その単元の用語カード(その単元の問題によく出る順) */
export function unitTerms(u: Unit, n = 6): Term[] {
  // 単元の問題に結びついた図鑑の用語(覚えるカードの山に入る)
  const count = new Map<string, number>();
  for (const q of unitQuestions(u)) for (const id of TERMS_OF_Q.get(q.id) ?? []) count.set(id, (count.get(id) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => TERM_BY_ID.get(id))
    .filter((t): t is Term => !!t)
    .slice(0, n);
}

/**
 * 「次はこれ」: 道すじの順で、まだ終えていない開いた単元。
 * 開いた単元を全部終えたら、まだの単元(鍵つき)。全部終わっていたら null。
 */
export function nextUnit(d: AppData): Unit | null {
  const left = PATH.map((id) => UNITS.find((x) => x.id === id)!).filter((u) => !unitDone(d, u));
  return left.find((u) => unitOpen(d, u)) ?? left[0] ?? null;
}

/** 道すじの何番目か(1から) */
export const pathNo = (u: Unit) => PATH.indexOf(u.id) + 1;

/** 分野のまとめのテスト: その分野の単元の確かめの問題から、まだの問題を中心に 20 問 */
export const TEST_N = 20;
export const testKey = (f: Field) => `test:${f}`;
export const testDone = (d: AppData, f: Field) => (d.course[testKey(f)] ?? 0) >= 3;
export function fieldTest(d: AppData, f: Field, rnd = Math.random): string[] {
  const pool = UNITS.filter((u) => u.field === f).flatMap((u) => u.qs);
  const ids = new Set(pool);
  // 単元で使っていない同じ分野の問題も混ぜる(初めて見る問題で力を確かめる)
  const others = QUESTIONS.filter((q) => q.field === f && !ids.has(q.id)).map((q) => q.id);
  const shuffle = (xs: string[]) => xs.map((x) => [rnd(), x] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const fromUnits = shuffle(pool).slice(0, TEST_N / 2);
  const fresh = shuffle(others.filter((id) => !d.qs[id])).concat(shuffle(others.filter((id) => !!d.qs[id])));
  return shuffle([...fromUnits, ...fresh.slice(0, TEST_N - fromUnits.length)]);
}

/** 合格までの道(%): 単元 = 1、まとめのテスト = 単元3つぶん */
export function passRoad(d: AppData): number {
  const fs: Field[] = ['strategy', 'management', 'technology'];
  const all = UNITS.length + fs.length * 3;
  const got = courseDone(d) + fs.filter((f) => testDone(d, f)).length * 3;
  return Math.round((got / all) * 100);
}

/** 分野ごとの単元の達成(クリアした数 / 全部) */
export function fieldCourse(d: AppData, f: Field): { done: number; total: number } {
  const us = UNITS.filter((u) => u.field === f);
  return { done: us.filter((u) => unitDone(d, u)).length, total: us.length };
}

export const courseDone = (d: AppData) => UNITS.filter((u) => unitDone(d, u)).length;

/** 無料で覚えるカードに入れられる枚数 */
export const FREE_DECK = 10;

/**
 * 覚えるカードの山: まちがえた問題に出た用語(自動) → 学んだ単元の用語 の順。「覚えた」にした物は除く。
 * 無料は FREE_DECK 枚まで(残りは完全版)。
 */
export function studyDeck(d: AppData): { cards: Term[]; fromWrong: number; locked: number } {
  const seen = new Set<string>();
  const out: Term[] = [];
  let fromWrong = 0;
  const add = (id: string, wrong: boolean) => {
    if (seen.has(id) || d.known[id]) return;
    const t = TERM_BY_ID.get(id);
    if (!t) return;
    seen.add(id);
    out.push(t);
    if (wrong) fromWrong++;
  };
  // 新しくまちがえた順
  const wrongQs = Object.entries(d.qs)
    .filter(([, s]) => s.last === 0)
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id]) => id);
  for (const id of wrongQs) for (const t of TERMS_OF_Q.get(id) ?? []) add(t, true);
  for (const u of UNITS) if (unitStep(d, u) >= 1) for (const t of unitTerms(u)) add(t.id, false);
  if (d.owned.full) return { cards: out, fromWrong, locked: 0 };
  return { cards: out.slice(0, FREE_DECK), fromWrong: Math.min(fromWrong, FREE_DECK), locked: Math.max(0, out.length - FREE_DECK) };
}

export const allTermsCount = TERMS.length;
