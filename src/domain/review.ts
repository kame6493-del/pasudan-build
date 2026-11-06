import type { Question } from './types';

/** クエスト中に答えた問題の記録(見返し用。答えは変えられない) */
export interface Answered {
  q: Question;
  picked: number;
  ok: boolean;
}

/**
 * 見返せるいちばん新しい記録の番号。いまの問題に答え終えていれば、その問題は画面に出ているので数えない。
 * 見返せる物が無ければ -1。
 */
export function lastReviewable(len: number, currentAnswered: boolean): number {
  return len - 1 - (currentAnswered ? 1 : 0);
}

/** 「前の問題」を押した時の行き先。null = いまの問題(見返していない) */
export function lookBack(view: number | null, len: number, currentAnswered: boolean): number | null {
  const last = lastReviewable(len, currentAnswered);
  if (last < 0) return null;
  if (view === null) return last;
  return Math.max(0, Math.min(view, last) - 1);
}

/** 「次」を押した時の行き先。いちばん新しい記録の次は、いまの問題へ戻る(null) */
export function lookForward(view: number | null, len: number, currentAnswered: boolean): number | null {
  if (view === null) return null;
  const last = lastReviewable(len, currentAnswered);
  return view + 1 > last ? null : view + 1;
}

/** 見返している問題が、いまの問題から何問前か(1 = ひとつ前) */
export function stepsBack(view: number, len: number, currentAnswered: boolean): number {
  return lastReviewable(len, currentAnswered) - view + 1;
}

/**
 * いまの問題の時計(秒)。見返している間は止め、戻ったら続きから進める(2026-10-18 efukan さんの要望)。
 * since = 動いている時はその区切りの開始時刻(ms)、止まっている時は null
 */
export interface QClock {
  base: number;
  since: number | null;
}

export function clockStart(now: number): QClock {
  return { base: 0, since: now };
}

export function clockPause(c: QClock, now: number): QClock {
  return c.since === null ? c : { base: c.base + Math.max(0, now - c.since) / 1000, since: null };
}

export function clockResume(c: QClock, now: number): QClock {
  return c.since !== null ? c : { base: c.base, since: now };
}

export function clockRead(c: QClock, now: number): number {
  return c.base + (c.since === null ? 0 : Math.max(0, now - c.since) / 1000);
}
