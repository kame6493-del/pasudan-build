import { addDays, emptyData, emptyDay, Q_BY_ID, QUESTIONS, TERMS_OF_Q, todayKey } from './data';
import type { AppData, DayLog, Field, Question } from './types';
import { DUNGEONS, EXAM_MIX, FIELD_LABEL, FIELDS } from './world';
import { easeScore, figLen, needsCalc } from './format';

// ---------- レベル・強さ ----------
/** レベル n から n+1 に上がるのに要る経験値 */
export const xpNeed = (lv: number) => 30 + lv * 20;

export function levelOf(xp: number): { lv: number; into: number; need: number } {
  let lv = 1;
  let rest = xp;
  while (rest >= xpNeed(lv)) {
    rest -= xpNeed(lv);
    lv++;
  }
  return { lv, into: rest, need: xpNeed(lv) };
}

export const heroHp = (lv: number) => 80 + (lv - 1) * 10;
export const heroAtk = (lv: number) => 24 + (lv - 1) * 4;

/**
 * 序盤のゆるさ(0=ふつう〜1=いちばんゆるい)。各ダンジョンの1〜3階を、慣れるまでの階としてゆるくする。
 * 4階からは元の強さ。
 */
export const EASY_FLOORS = 3;
export const earlyEase = (floor: number) => (floor < 0 ? 0 : Math.max(0, (EASY_FLOORS - floor) / EASY_FLOORS));

/** 敵の HP。ふつうの敵はおよそ2回、中ボスは4〜5回(1階は3〜4回)の正解で倒れる */
export const enemyHp = (lv: number, boss: boolean, floor: number) =>
  Math.round(heroAtk(lv) * (boss ? 4.4 - 1.1 * earlyEase(floor) : 1.9) * (1 + floor * 0.02));

/**
 * 計算の問題に足す早押しの持ち時間(秒)。文字数だけで決めると、短い文で計算をさせる問題
 * (稼働率・損益分岐点・転送時間・表計算・擬似言語など)は読み終えてから手を動かす時間が足りない。
 * 見分け方は needsCalc(数値の条件と計算の語・数値が3つ以上・答えが数値だけ・プログラム)。
 */
export const CALC_BONUS = 15;
/** 計算の問題の早押しの最短(秒) */
export const CALC_MIN = 30;
/** 早押しクリティカルの持ち時間(秒)。問題文が長いほど長い。計算の問題は CALC_BONUS 秒のばす */
export function critWindow(q: Question, floor = -1): number {
  const len = q.q.length + q.choices.join('').length + (q.table ? q.table.flat().join('').length : 0) + (q.code?.length ?? 0) + figLen(q);
  const calc = needsCalc(q);
  // 序盤の階は早押しの持ち時間を長めに(1階 +6秒)
  const t = Math.round(8 + len / 9 + 6 * earlyEase(floor) + (calc ? CALC_BONUS : 0));
  // 計算の問題は短い文でも 30 秒はとる(サイコロの確率など、文は短いが手を動かす問題)
  return calc ? Math.min(51 + CALC_BONUS, Math.max(CALC_MIN, t)) : Math.min(51, t);
}
/** 1問の制限時間(秒)。過ぎても負けにはならず、クリティカルが出ないだけ */
export const timeLimit = (q: Question, floor = -1) => critWindow(q, floor) + 30;

export function damage(lv: number, combo: number, crit: boolean, rand = Math.random()): number {
  const base = heroAtk(lv) * (1 + Math.min(combo, 10) * 0.08) * (crit ? 1.7 : 1);
  return Math.round(base * (0.92 + rand * 0.16));
}
/** 敵の攻撃(まちがえた時に受けるダメージ)。1階はふつうの敵で HP の 14%(7回まちがえても倒れない)、4階から 24% */
export const enemyHit = (lv: number, boss: boolean, floor = -1) => Math.round(heroHp(lv) * ((boss ? 0.3 : 0.24) - 0.1 * earlyEase(floor)));

// ---------- 出題 ----------
function shuffle<T>(a: T[], rnd = Math.random): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** まだ解いていない → 苦手 → 前に間違えた → 古い順 の優先で並べる */
function priority(d: AppData, q: Question): number {
  const s = d.qs[q.id];
  if (!s) return 0;
  if (q.id in d.weak) return 1;
  if (s.last === 0) return 2;
  return 3 + s.c / Math.max(1, s.n);
}

export function pickQuestions(d: AppData, pool: Question[], count: number, fallback: Question[] = []): Question[] {
  const ordered = shuffle(pool).sort((a, b) => priority(d, a) - priority(d, b));
  const out = ordered.slice(0, count);
  if (out.length < count) {
    const extra = shuffle(fallback.filter((q) => !out.includes(q))).sort((a, b) => priority(d, a) - priority(d, b));
    out.push(...extra.slice(0, count - out.length));
  }
  // それでも足りなければくり返す
  let i = 0;
  while (out.length < count && ordered.length) out.push(ordered[i++ % ordered.length]);
  return out;
}

export function floorPool(field: Field, floor: number): Question[] {
  const topic = DUNGEONS[field].floors[floor];
  return QUESTIONS.filter((q) => q.field === field && q.topic === topic);
}

/** 1つの階: ふつうの敵5体と中ボス。1体に3問ぶん用意しておく(余れば次へ回す) */
export const FLOOR_ENEMIES = 6;

const EASE = new Map<string, number>();
export const easeOf = (q: Question) => {
  let v = EASE.get(q.id);
  if (v === undefined) EASE.set(q.id, (v = easeScore(q)));
  return v;
};
const byEase = (a: Question, b: Question) => easeOf(a) - easeOf(b);

/**
 * 序盤の階の出題: 易しい問題(短い・用語を問う・計算なし)から出す。
 * 1階は易しい方の半分から選んで易しい順に、2階・3階は少しずつ元の出し方に近づけ、4階からは元どおり。
 */
export function easyFirst(d: AppData, pool: Question[], count: number, ease: number, fallback: Question[]): Question[] {
  if (ease <= 0) return pickQuestions(d, pool, count, fallback);
  const sorted = [...pool].sort(byEase);
  const keep = Math.max(1, Math.ceil(sorted.length * (1 - 0.5 * ease)));
  const easy = sorted.slice(0, keep);
  const rest = sorted.slice(keep);
  const head = pickQuestions(d, easy, Math.min(count, easy.length));
  const more = pickQuestions(d, rest, Math.min(count - head.length, rest.length));
  let out = [...head, ...more];
  if (out.length < count) {
    const need = count - out.length;
    const fb = fallback.filter((q) => !out.includes(q)).sort(byEase);
    out = [...out, ...pickQuestions(d, fb.slice(0, need * 3), need, fb)];
  }
  // 並べ方: 易しさの順と元の並びを ease の割合でまぜる(1階はほぼ易しい順)
  const rank = new Map([...out].sort(byEase).map((q, i) => [q, i]));
  const keyOf = (q: Question, i: number) => (rank.get(q) ?? i) * ease + i * (1 - ease) + Math.random() * 2 * (1 - ease);
  return out
    .map((q, i) => ({ q, k: keyOf(q, i) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.q)
    .slice(0, count);
}

export function floorQuestions(d: AppData, field: Field, floor: number): Question[] {
  // 足りない分は同じ分野の「入れる階」の問題で埋める(無料のお試し階から鍵の階の問題が出ないように)
  return easyFirst(d, floorPool(field, floor), 24, earlyEase(floor), QUESTIONS.filter((q) => q.field === field && questionOpen(d, q)));
}

/** 解いた数が少ないうちは「今日のダンジョン」も易しい問題から(30問まで1階なみ、90問で元どおり) */
export const beginnerEase = (d: AppData) => {
  const n = Object.keys(d.qs).length;
  return n >= 90 ? 0 : n < 30 ? 1 : (90 - n) / 60;
};

/**
 * 無料と完全版の線引き(2026-11-04 見直し。購入画面に当たる所を前に出し、最初の数階の楽しさは残す)
 * - 過去問道場(年度別・分野別): 解説つきで全問解けるが、無料は1日 FREE_DAILY 問まで(苦手の復習・ダンジョンは数えない)
 * - ダンジョン: ストラテジの森は FREE_FOREST_FLOORS 階、城と塔は FREE_TRIAL_FLOORS 階まで無料
 * - 模擬試験ボス: 無料で FREE_EXAMS 回。完全版は何回でも
 * - ゼロから学ぶ道: 各分野の最初の FREE_UNITS 単元まで無料
 * - 完全版だけ: 残りの階・模擬試験何回でも・分野別の集中・分野別の予想点と推移・テーマ別の全分析・用語カードの金進化・学ぶ道の続き
 */
export const FREE_FOREST_FLOORS = 5;
export const FREE_TRIAL_FLOORS = 2;
export const FREE_EXAMS = 1;
export const FREE_DAILY = 30;
export const FREE_UNITS = 3;
export const freeFloorsOf = (field: Field) => (field === 'strategy' ? FREE_FOREST_FLOORS : FREE_TRIAL_FLOORS);
export function floorOpen(d: AppData, field: Field, floor: number): boolean {
  return d.owned.full || floor < freeFloorsOf(field);
}
export const freeExamsLeft = (d: AppData) => (d.owned.full ? Infinity : Math.max(0, FREE_EXAMS - d.freeExams));
export const canTakeExam = (d: AppData) => freeExamsLeft(d) > 0;
/** 過去問道場の、今日の無料のこり問数(完全版は Infinity) */
export const practiceLeft = (d: AppData, key: string) => (d.owned.full ? Infinity : Math.max(0, FREE_DAILY - (d.days[key]?.counted ?? 0)));
/** 用語カードの金進化は完全版で */
export const canEvolve = (d: AppData) => d.owned.full;

/** その問題のテーマの階に入れるか(ダンジョンの出題の範囲。過去問モードはこれに関係なく全問解ける) */
export function questionOpen(d: AppData, q: Question): boolean {
  if (d.owned.full) return true;
  const floor = DUNGEONS[q.field].floors.indexOf(q.topic);
  if (floor < 0) return false;
  return floorOpen(d, q.field, floor);
}

const FREE: AppData = { ...emptyData() };

/** 無料で冒険できる階の数 */
export function freeFloorCount(): number {
  return FIELDS.reduce((s, f) => s + DUNGEONS[f].floors.filter((_, i) => floorOpen(FREE, f, i)).length, 0);
}

/** 無料で全文を読める要点ノートのテーマ数(城と塔はお試しの階のぶん) */
export function freeNoteCount(): number {
  return freeFloorCount();
}

export function availableFields(d: AppData): Field[] {
  return FIELDS.filter((f) => d.owned.full || freeFloorsOf(f) > 0);
}

/** ダンジョン(今日のダンジョン・ゴースト)に出せる問題: 入れる階のテーマの問題 */
export const dungeonPool = (d: AppData) => QUESTIONS.filter((q) => questionOpen(d, q));

/** weakMax = 苦手から出す数の上限(ニガテ退治の日は 6) */
export function dailyQuestions(d: AppData, weakMax = 4): Question[] {
  const pool = dungeonPool(d);
  const weak = pool.filter((q) => q.id in d.weak);
  const ease = beginnerEase(d);
  if (ease > 0) {
    const easyPool = [...pool.filter((q) => !(q.id in d.weak))].sort(byEase).slice(0, Math.ceil(pool.length * (1 - 0.6 * ease)));
    const w = shuffle(weak).slice(0, weakMax);
    return [...w, ...easyFirst(d, easyPool, 10 - w.length, ease, pool)].slice(0, 10);
  }
  return pickQuestions(d, [...shuffle(weak).slice(0, weakMax), ...shuffle(pool.filter((q) => !(q.id in d.weak)))].slice(0, 60), 10, pool).slice(0, 10);
}

/** 模擬試験の制限時間(秒)。本番は100問120分。問題数に合わせて分単位で決める(選ぶ画面と時計の表示をそろえる) */
export const examLimitMin = (n: number) => Math.round((120 * n) / 100);
export const examLimitSec = (n: number) => examLimitMin(n) * 60;

/** 年度別: その年度の収録問題を問番号順に。year が無ければ本番の配分でランダムに100問 */
export function examQuestions(d: AppData, year?: string): Question[] {
  if (year) return QUESTIONS.filter((q) => q.year === year).sort((a, b) => a.no - b.no);
  const out: Question[] = [];
  for (const f of FIELDS) {
    const pool = QUESTIONS.filter((q) => q.field === f);
    out.push(...shuffle(pool).slice(0, EXAM_MIX[f]));
  }
  void d;
  return shuffle(out);
}

export function weakQuestions(d: AppData, count = 10): Question[] {
  const ids = Object.keys(d.weak).filter((id) => Q_BY_ID.has(id));
  return shuffle(ids.map((id) => Q_BY_ID.get(id)!)).slice(0, count);
}

// ---------- 記録 ----------
export function day(d: AppData, key = todayKey()): DayLog {
  return { ...emptyDay(), ...(d.days[key] ?? {}) };
}

/** 年度の一覧(新しい順に並んだ収録順) */
export const YEARS = [...new Set(QUESTIONS.map((q) => q.year))];
export const yearQuestions = (year: string) => QUESTIONS.filter((q) => q.year === year).sort((a, b) => a.no - b.no);
export const topicQuestions = (field: Field, topic: string) => QUESTIONS.filter((q) => q.field === field && q.topic === topic).sort((a, b) => (a.year === b.year ? a.no - b.no : YEARS.indexOf(a.year) - YEARS.indexOf(b.year)));

/** 過去問の進み具合: 解いた数・直近の正解の数 */
export function progressOf(d: AppData, qs: Question[]): { done: number; ok: number; total: number } {
  let done = 0;
  let ok = 0;
  for (const q of qs) {
    const s = d.qs[q.id];
    if (!s) continue;
    done += 1;
    ok += s.last;
  }
  return { done, ok, total: qs.length };
}

export interface AnswerEffect {
  data: AppData;
  weakAdded: boolean;
  weakCleared: boolean;
  evolved: string[]; // 金になった用語
}

/** 1問答えた結果を記録に入れる。counted=無料の上限に数えるか */
export function recordAnswer(d0: AppData, q: Question, ok: boolean, opts: { counted: boolean; daily?: boolean; combo: number }): AnswerEffect {
  const key = todayKey();
  const d: AppData = { ...d0, qs: { ...d0.qs }, weak: { ...d0.weak }, cards: { ...d0.cards }, termStreak: { ...d0.termStreak }, days: { ...d0.days } };
  const prev = d.qs[q.id] ?? { n: 0, c: 0, last: 0, at: 0 };
  d.qs[q.id] = { n: prev.n + 1, c: prev.c + (ok ? 1 : 0), last: ok ? 1 : 0, at: Date.now() };

  const dl = day(d, key);
  dl.n += 1;
  dl.c += ok ? 1 : 0;
  if (opts.counted) dl.counted += 1;
  if (opts.daily) dl.dungeon += 1;
  dl.maxCombo = Math.max(dl.maxCombo, opts.combo);

  let weakAdded = false;
  let weakCleared = false;
  if (!ok) {
    weakAdded = !(q.id in d.weak);
    d.weak[q.id] = 0;
  } else if (q.id in d.weak) {
    const s = d.weak[q.id] + 1;
    if (s >= 2) {
      delete d.weak[q.id];
      weakCleared = true;
      dl.weakCleared += 1;
      d.weakClearedTotal += 1;
    } else d.weak[q.id] = s;
  }

  const evolved: string[] = [];
  for (const t of TERMS_OF_Q.get(q.id) ?? []) {
    const s = ok ? (d.termStreak[t] ?? 0) + 1 : 0;
    d.termStreak[t] = s;
    if (ok && s >= 2 && d.cards[t] === 1 && canEvolve(d)) {
      d.cards[t] = 2;
      evolved.push(t);
    }
  }

  // 連続日数
  if (d.lastDay !== key) {
    d.streak = d.lastDay === addDays(key, -1) ? d.streak + 1 : 1;
    d.lastDay = key;
  }
  d.bestCombo = Math.max(d.bestCombo, opts.combo);
  d.days[key] = dl;
  return { data: d, weakAdded, weakCleared, evolved };
}

/** 連続日数が途切れていたら 0 に見せる */
export function liveStreak(d: AppData): number {
  const key = todayKey();
  if (!d.lastDay) return 0;
  if (d.lastDay === key || d.lastDay === addDays(key, -1)) return d.streak;
  return 0;
}

// ---------- 予想点 ----------
export interface Prediction {
  total: number | null;
  by: Record<Field, number | null>;
  answered: Record<Field, number>;
}

/** 各問の直近の正誤から分野ごとの正答率を出し、1000点満点に直す。IRT ではないので「予想点」 */
export function predict(d: AppData): Prediction {
  const by = {} as Record<Field, number | null>;
  const answered = {} as Record<Field, number>;
  for (const f of FIELDS) {
    const stats = QUESTIONS.filter((q) => q.field === f && d.qs[q.id]).map((q) => d.qs[q.id]);
    answered[f] = stats.length;
    if (stats.length < 5) {
      by[f] = null;
      continue;
    }
    // 直近の正誤を重く、通算も少し見る。解いた数が少ないうちは 0.4 に引き寄せる
    const recent = stats.reduce((s, x) => s + x.last, 0);
    const total = stats.reduce((s, x) => s + x.c / x.n, 0);
    const acc = (recent * 0.7 + total * 0.3 + 0.4 * 6) / (stats.length + 6);
    by[f] = Math.round(acc * 1000);
  }
  const ok = FIELDS.every((f) => by[f] !== null);
  const total = ok ? Math.round(FIELDS.reduce((s, f) => s + (by[f] as number) * EXAM_MIX[f], 0) / 100) : null;
  return { total, by, answered };
}

export const PASS_TOTAL = 600;
export const PASS_FIELD = 300;

export function judge(total: number, s: number, m: number, t: number): boolean {
  return total >= PASS_TOTAL && s >= PASS_FIELD && m >= PASS_FIELD && t >= PASS_FIELD;
}

/** 不合格の時の案内。総合点が足りないのか、分野の足切り(300点未満)なのかを分けて言う */
export function failNote(r: { total: number; s: number; m: number; t: number }): string {
  const low = FIELDS.filter((f) => r[KEY[f]] < PASS_FIELD).map((f) => `${FIELD_LABEL[f]} ${r[KEY[f]]}点`);
  const parts: string[] = [];
  if (r.total < PASS_TOTAL) parts.push(`総合はあと ${PASS_TOTAL - r.total} 点で合格ラインです。`);
  if (low.length) parts.push(`${r.total >= PASS_TOTAL ? '総合は合格ラインを超えましたが、' : ''}${low.join('・')}が分野の基準（各 ${PASS_FIELD} 点）に届いていません。`);
  return parts.join('');
}
const KEY: Record<Field, 's' | 'm' | 't'> = { strategy: 's', management: 'm', technology: 't' };


// ---------- 今日の目標 ----------
export interface Goal {
  key: string;
  label: string;
  now: number;
  target: number;
}
export function goals(d: AppData): Goal[] {
  const dl = day(d);
  return [
    { key: 'solve', label: '20問解く', now: Math.min(dl.n, 20), target: 20 },
    { key: 'combo', label: '5コンボを出す', now: Math.min(dl.maxCombo, 5), target: 5 },
    { key: 'weak', label: '苦手を3つ消す', now: Math.min(dl.weakCleared, 3), target: 3 },
  ];
}

/** 連続日数で宝箱の大きさが変わる */
export function chestKind(streak: number): { img: string; name: string; coins: number; xp: number } {
  if (streak >= 7) return { img: 'chest_gold', name: '金の宝箱', coins: 120, xp: 35 };
  if (streak >= 3) return { img: 'chest_silver', name: '銀の宝箱', coins: 60, xp: 20 };
  return { img: 'chest_wood', name: '木の宝箱', coins: 30, xp: 10 };
}

/** 小テーマごとの正答率。解いた数が少ない物は null */
export interface TopicStat {
  field: Field;
  topic: string;
  floor: number;
  n: number;
  c: number;
  total: number;
}
export function topicStats(d: AppData): TopicStat[] {
  const out: TopicStat[] = [];
  for (const f of FIELDS) {
    DUNGEONS[f].floors.forEach((topic, floor) => {
      let n = 0;
      let c = 0;
      const qs = QUESTIONS.filter((q) => q.field === f && q.topic === topic);
      for (const q of qs) {
        const s = d.qs[q.id];
        if (!s) continue;
        n += s.n;
        c += s.c;
      }
      out.push({ field: f, topic, floor, n, c, total: qs.length });
    });
  }
  return out;
}

/** 分野ごとの正答率(解いた問題の通算) */
export function accuracy(d: AppData, f: Field): { n: number; c: number } {
  let n = 0;
  let c = 0;
  for (const q of QUESTIONS) {
    if (q.field !== f) continue;
    const s = d.qs[q.id];
    if (!s) continue;
    n += s.n;
    c += s.c;
  }
  return { n, c };
}

/**
 * 分野別の集中(完全版): その分野で正答率の低いテーマから、まだ正解していない問題を n 問。
 * まだ解いていないテーマは正答率 0 とみなして先に出す。
 */
export function focusQuestions(d: AppData, f: Field, n = 10): Question[] {
  const rate = new Map(topicStats(d).filter((t) => t.field === f).map((t) => [t.topic, t.n ? t.c / t.n : 0]));
  const notYet = QUESTIONS.filter((q) => q.field === f && !(d.qs[q.id]?.last === 1));
  return shuffle(notYet)
    .sort((a, b) => (rate.get(a.topic) ?? 0) - (rate.get(b.topic) ?? 0))
    .slice(0, n);
}

/** 分野の弱いテーマ(正答率の低い順、解いた物だけ) */
export function weakTopics(d: AppData, f: Field, n = 3): { topic: string; pct: number }[] {
  return topicStats(d)
    .filter((t) => t.field === f && t.n > 0)
    .map((t) => ({ topic: t.topic, pct: Math.round((t.c / t.n) * 100) }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, n);
}
