import questionsJson from '../data/questions.json';
import termsJson from '../data/terms.json';
import type { AppData, DayLog, ExamDraft, Field, Question, Term } from './types';

export const QUESTIONS = questionsJson as Question[];
export const TERMS = (termsJson as Term[]).map((t) => ({ ...t, q: t.q.filter((id) => QUESTIONS.some((q) => q.id === id)) }));
export const Q_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const TERM_BY_ID = new Map(TERMS.map((t) => [t.id, t]));
/** 問題 id → その問題が中心の用語 id */
export const TERMS_OF_Q = new Map<string, string[]>();
for (const t of TERMS) for (const id of t.q) TERMS_OF_Q.set(id, [...(TERMS_OF_Q.get(id) ?? []), t.id]);

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
  };
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
