export type Field = 'strategy' | 'management' | 'technology';

export interface Question {
  id: string;
  year: string;
  no: number;
  field: Field;
  topic: string;
  q: string;
  choices: string[];
  /** 0〜3(ア〜エ) */
  answer: number;
  explain: string;
  terms: string[];
  table?: string[][];
  code?: string;
}

export type CardArt = 'doc' | 'robot' | 'chain' | 'shield' | 'chart' | 'books' | 'db';

export interface Term {
  id: string;
  name: string;
  full: string;
  field: Field;
  desc: string;
  art: CardArt;
  q: string[];
}

/** 1問ごとの記録 */
export interface QStat {
  n: number; // 解いた回数
  c: number; // 正解した回数
  last: 0 | 1; // 直近の正誤
  at: number; // 直近に解いた時刻
}

export interface DayLog {
  n: number; // 解いた数(全部)
  c: number; // 正解数
  counted: number; // 無料の上限に数える数
  maxCombo: number;
  weakCleared: number;
  dungeon: number; // 今日のダンジョンで解いた数
  chest: boolean; // 今日の宝箱を開けたか
  score?: number; // その日の予想点(記録用)
}

export interface ExamResult {
  at: number;
  /** 年度別の模試ならその年度 */
  year?: string;
  total: number;
  s: number;
  m: number;
  t: number;
  pass: boolean;
  correct: number;
  answered: number;
}

/** 途中の模擬試験(答えるたびに保存し、続きから再開できる) */
export interface ExamDraft {
  year?: string;
  ids: string[];
  ans: (number | null)[];
  /** 使った時間(ミリ秒) */
  elapsed: number;
  i: number;
}

export interface GhostRun {
  correct: number;
  /** 各問を答え終えた時点の経過ミリ秒 */
  splits: number[];
}

export interface AppData {
  v: 1;
  onboarded: boolean;
  examDate: string | null; // YYYY-MM-DD
  hero: string;
  pet: string;
  coins: number;
  xp: number;
  /** 各ダンジョンのクリアした階の数(0〜10) */
  cleared: Record<Field, number>;
  /** 模擬試験ボスを倒したことがあるか */
  bossDown: boolean;
  qs: Record<string, QStat>;
  /** 苦手: 問題 id → 連続正解の数(2 で消える) */
  weak: Record<string, number>;
  /** 用語カード: id → 1=銀 2=金 */
  cards: Record<string, 1 | 2>;
  /** 用語ごとの連続正解 */
  termStreak: Record<string, number>;
  days: Record<string, DayLog>;
  streak: number;
  lastDay: string | null;
  bestCombo: number;
  weakClearedTotal: number;
  exams: ExamResult[];
  ghost: GhostRun | null;
  /** コインで手に入れた見た目 */
  unlocked: string[];
  owned: { full: boolean; looks: boolean };
  /** 無料で使った模擬試験の回数(FREE_EXAMS 回まで無料) */
  freeExams: number;
  examDraft: ExamDraft | null;
  /** 効果音のオン/オフ */
  sound: boolean;
  /** BGM のオン/オフ */
  bgm: boolean;
  /** BGM の音量(0〜1) */
  bgmVol: number;
  /** 効果音の音量(0〜1) */
  sfxVol: number;
}
