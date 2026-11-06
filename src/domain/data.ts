import questionsJson from '../data/questions.json';
import termsJson from '../data/terms.json';
import choiceExplainJson from '../data/choiceExplain.json';
import type { AppData, DayLog, ExamDraft, Field, Question, Term } from './types';

export const QUESTIONS = questionsJson as Question[];
export const TERMS = (termsJson as Term[]).map((t) => ({ ...t, q: t.q.filter((id) => QUESTIONS.some((q) => q.id === id)) }));
export const Q_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const TERM_BY_ID = new Map(TERMS.map((t) => [t.id, t]));
/** 問題 id → その問題が中心の用語 id */
export const TERMS_OF_Q = new Map<string, string[]>();
for (const t of TERMS) for (const id of t.q) TERMS_OF_Q.set(id, [...(TERMS_OF_Q.get(id) ?? []), t.id]);

/** 問題 id → 選択肢ごとの解説(正解の位置は空文字)。2026-10-16 テスターの要望で足した */
export const CHOICE_EXPLAIN = choiceExplainJson as Record<string, string[]>;
/** その問題の選択肢ごとの解説。無ければ空の配列 */
export const choiceExplain = (q: Question): string[] => {
  const v = CHOICE_EXPLAIN[q.id];
  return Array.isArray(v) && v.length === q.choices.length ? v : [];
};

export const source = (q: Question) => `出典: 独立行政法人情報処理推進機構 ITパスポート試験 ${q.year} 問${q.no}`;

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + n));
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export const emptyDay = (): DayLog => ({ n: 0, c: 0, counted: 0, maxCombo: 0, weakCleared: 0, dungeon: 0, chest: false });

export function emptyData(): AppData {
  return {
    v: 1,
    onboarded: false,
    examDate: null,
    hero: 'hood',
    pet: 'cat',
    coins: 0,
    xp: 0,
    cleared: { strategy: 0, management: 0, technology: 0 },
    bossDown: false,
    qs: {},
    weak: {},
    cards: {},
    termStreak: {},
    days: {},
    streak: 0,
    lastDay: null,
    bestCombo: 0,
    weakClearedTotal: 0,
    exams: [],
    ghost: null,
    unlocked: [],
    owned: { full: false, looks: false },
    freeExams: 0,
    examDraft: null,
    sound: true,
    bgm: true,
    bgmVol: 0.5,
    sfxVol: 1,
    calm: null,
    items: {},
    petBond: {},
    stars: {},
    foes: {},
    level: null,
    tutorialDone: false,
    guided: false,
    course: {},
    known: {},
    learnTip: false,
  };
}

/** 読み込んだ記録の形をそろえる(古い版や壊れた値でも落ちないように) */
export function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppData>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const obj = <T>(v: unknown, d: T): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : d);
  return {
    ...base,
    onboarded: r.onboarded === true,
    examDate: typeof r.examDate === 'string' ? r.examDate : null,
    hero: typeof r.hero === 'string' ? r.hero : base.hero,
    pet: typeof r.pet === 'string' ? r.pet : base.pet,
    coins: Math.max(0, num(r.coins, 0)),
    xp: Math.max(0, num(r.xp, 0)),
    cleared: { ...base.cleared, ...obj(r.cleared, {}) },
    bossDown: r.bossDown === true,
    qs: obj(r.qs, {}),
    weak: obj(r.weak, {}),
    cards: obj(r.cards, {}),
    termStreak: obj(r.termStreak, {}),
    days: obj(r.days, {}),
    streak: num(r.streak, 0),
    lastDay: typeof r.lastDay === 'string' ? r.lastDay : null,
    bestCombo: num(r.bestCombo, 0),
    weakClearedTotal: num(r.weakClearedTotal, 0),
    exams: Array.isArray(r.exams) ? r.exams : [],
    ghost: r.ghost && Array.isArray(r.ghost.splits) ? r.ghost : null,
    unlocked: Array.isArray(r.unlocked) ? r.unlocked.filter((x) => typeof x === 'string') : [],
    owned: { full: r.owned?.full === true, looks: r.owned?.looks === true },
    // 前の版は「使ったか」だけを持っていた
    freeExams: Math.max(0, Math.floor(num(r.freeExams, (r as { freeExamUsed?: boolean }).freeExamUsed === true ? 1 : 0))),
    examDraft: normalizeDraft(r.examDraft),
    sound: r.sound !== false,
    bgm: r.bgm !== false,
    bgmVol: Math.min(1, Math.max(0, num(r.bgmVol, base.bgmVol))),
    sfxVol: Math.min(1, Math.max(0, num(r.sfxVol, base.sfxVol))),
    calm: typeof r.calm === 'boolean' ? r.calm : null,
    items: numMap(r.items, 0, 3),
    petBond: numMap(r.petBond, 0, 1e6),
    stars: numMap(r.stars, 0, 3),
    foes: numMap(r.foes, 0, 1e9),
    level: r.level === 'new' || r.level === 'some' || r.level === 'past' ? r.level : null,
    // 前の版から使っている人は、案内とガイドを見終えたことにする
    tutorialDone: r.tutorialDone === true || (r.tutorialDone === undefined && r.onboarded === true),
    guided: r.guided === true || (r.guided === undefined && r.onboarded === true),
    course: numMap(r.course, 0, 3),
    known: numMap(r.known, 0, 1),
    learnTip: r.learnTip === true,
  };
}

/** 数の表(壊れた値・範囲外は捨てる・丸める) */
function numMap(v: unknown, lo: number, hi: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (typeof x === 'number' && Number.isFinite(x)) out[k] = Math.min(hi, Math.max(lo, Math.floor(x)));
  }
  return out;
}

function normalizeDraft(v: unknown): ExamDraft | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Partial<ExamDraft>;
  if (!Array.isArray(r.ids) || !Array.isArray(r.ans) || r.ids.length === 0 || r.ids.length !== r.ans.length) return null;
  const ids = r.ids.filter((id) => typeof id === 'string' && Q_BY_ID.has(id));
  if (ids.length !== r.ids.length) return null;
  const ans = r.ans.map((a) => (typeof a === 'number' && a >= 0 && a <= 3 ? a : null));
  const elapsed = typeof r.elapsed === 'number' && Number.isFinite(r.elapsed) ? Math.max(0, r.elapsed) : 0;
  const i = typeof r.i === 'number' && r.i >= 0 && r.i < ids.length ? Math.floor(r.i) : 0;
  return { year: typeof r.year === 'string' ? r.year : undefined, ids, ans, elapsed, i };
}

export const questionsOf = (field: Field) => QUESTIONS.filter((q) => q.field === field);

/**
 * 「動きを少なく」が効いているか。自分で選んでいればそれ、まだなら端末の設定(prefers-reduced-motion)に合わせる。
 * 初めはオフ(ゲームの演出が売りのため)。端末で動きを減らしている人だけ初めからオン。
 */
export function calmOn(d: Pick<AppData, 'calm'>, osReduce: boolean): boolean {
  return d.calm ?? osReduce;
}
