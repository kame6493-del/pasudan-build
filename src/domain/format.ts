/**
 * 問題文を読みやすい塊に分ける(表示用)。元の文字は1文字も変えず、区切りだけを決める。
 * - 元データの改行(と <br>)はそのまま区切りにする
 * - 「。」で文を分ける(かっこの中の「。」では分けない)
 * - 長い文は、最後の「，」のあとの「〜はどれか。」を次の行に送る
 * - a　〜 / ①　〜 / (1)　〜 の箇条は、頭の記号と本文に分けてぶら下げ字下げにする
 * - 〔条件〕などの見出し、(図: …) の説明は別の見た目にする
 */
import type { Fig } from './types';

export type QBlock =
  | { kind: 'p'; text: string; gap: boolean }
  | { kind: 'ask'; text: string }
  | { kind: 'item'; label: string; text: string; gap: boolean }
  | { kind: 'head'; text: string; gap: boolean }
  | { kind: 'note'; text: string; gap: boolean };

const ITEM = /^([a-eａ-ｅ]|[①-⑳]|[(（][0-9０-９]{1,2}[)）])[\s　]+(\S.*)$/;
const HEAD = /^〔[^〕]{1,14}〕$/;
const NOTE = /^[(（]図[:：]/;
const OPEN = '「『（(“［【〔';
const CLOSE = '」』）)”］】〕';
/** 長い文の最後の問いかけ(「，」のあと)を次の行へ送る */
const ASK = /，([^，。]{2,28}(?:どれか|幾らか|いくらか|いくつか|何回か|何か|何個か|何日か|何人か|何通りか|何件か|何時間か|何分か|何秒か|何円か|何%か|何％か|何ビットか|何バイトか)。)$/;
const ASK_MIN = 44;

export function sentences(line: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of line) {
    cur += ch;
    if (OPEN.includes(ch)) depth++;
    else if (CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    else if (ch === '。' && depth === 0) {
      out.push(cur);
      cur = '';
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export function splitAsk(s: string): [string, string | null] {
  if (s.length < ASK_MIN) return [s, null];
  const m = ASK.exec(s);
  if (!m) return [s, null];
  const body = s.slice(0, m.index + 1);
  if (body.length < 14) return [s, null];
  // 「〜だけを，全て挙げたものは」のように前とつながる句は分けない
  if (/を，$/.test(body) || /^全て/.test(m[1])) return [s, null];
  // 「A，B ともう一つはどれか」のような並べ立ての途中では分けない(問いかけらしい句だけ送る)
  if (!/もの|適切|組合せ|正しい/.test(m[1])) return [s, null];
  return [body, m[1]];
}

export function formatQuestion(src: string): QBlock[] {
  const out: QBlock[] = [];
  let gap = false;
  for (const raw of src.replace(/<br\s*\/?>/gi, '\n').split('\n')) {
    const line = raw.replace(/^[\s　]+|[\s　]+$/g, '');
    if (!line) {
      gap = out.length > 0;
      continue;
    }
    const m = ITEM.exec(line);
    if (m) {
      out.push({ kind: 'item', label: m[1], text: m[2], gap });
    } else if (HEAD.test(line)) {
      out.push({ kind: 'head', text: line, gap });
    } else if (NOTE.test(line)) {
      out.push({ kind: 'note', text: line, gap });
    } else {
      let first = true;
      for (const s of sentences(line)) {
        const [body, ask] = splitAsk(s);
        out.push({ kind: 'p', text: body, gap: first && gap });
        if (ask) out.push({ kind: 'ask', text: ask });
        first = false;
      }
    }
    gap = false;
  }
  return out;
}

/** 「［ a ］」の空欄を取り出す(表示で枠を付ける) */
export function splitBlanks(text: string): { t: string; blank: boolean }[] {
  return text
    .split(/(［\s*[a-eａ-ｅ]\s*］)/)
    .filter((t) => t !== '')
    .map((t) => (/^［\s*[a-eａ-ｅ]\s*］$/.test(t) ? { t: t.replace(/[［］\s]/g, ''), blank: true } : { t, blank: false }));
}

/** 「a: X / b: Y」の組合せの選択肢を行に分ける。そうでなければ null */
export function comboRows(choice: string): { label: string; text: string }[] | null {
  const parts = choice.split(' / ');
  if (parts.length < 2) return null;
  const rows = parts.map((p) => /^([a-e])[:：]\s*(.+)$/.exec(p));
  if (rows.some((r) => !r)) return null;
  return rows.map((r) => ({ label: r![1], text: r![2] }));
}

// ---------- 易しさの目安 ----------
/** 2枚目以降の表の字数と、図を読む手間(図1枚を 60 字ぶんとみる)。早押しの持ち時間に足す */
export function figLen(q: { figs?: Fig[] }): number {
  return (q.figs ?? []).reduce((n, f) => n + (f.t === 'table' ? f.rows.flat().join('').length : 60), 0);
}

/** 計算が要りそうな問題(数値の条件・計算の語・表・プログラム) */
export function needsCalc(q: { q: string; choices: string[]; table?: string[][]; code?: string }): boolean {
  if (q.code) return true;
  const nums = (q.q.match(/[0-9０-９]+(?:[.,，][0-9]+)*/g) ?? []).length;
  if (/計算|求め|幾らか|何回|何通り|何ビット|何バイト|何日|稼働率|期待値|損益分岐|利益|進数/.test(q.q) && nums >= 1) return true;
  if (nums >= 3) return true;
  return q.choices.every((c) => /^[0-9０-９.,，%％円万千億日時間分秒回個人件台ビットバイト\s]+$/.test(c));
}

/**
 * 易しさの目安(小さいほど易しい)。公式の正答率は無いので、文の長さ・選択肢の長さ・
 * 計算の有無・記述の組合せ(a〜c のうち…)・否定の問い・表やプログラムの有無から作る。
 * 「〜はどれか」で用語を選ぶ短い問題がいちばん小さくなる。
 */
export function easeScore(q: { q: string; choices: string[]; table?: string[][]; code?: string; figs?: Fig[] }): number {
  const avgChoice = q.choices.reduce((s, c) => s + c.length, 0) / Math.max(1, q.choices.length);
  let s = q.q.length + avgChoice * 1.6;
  if (needsCalc(q)) s += 150;
  if (q.table || q.figs?.length) s += 120;
  if (q.code) s += 200;
  if (q.choices.every((c) => /^[a-eａ-ｅ](?:[，,、\s]+[a-eａ-ｅ])*$/.test(c))) s += 110; // a，b，c の組合せ
  if (q.choices.some((c) => / \/ /.test(c))) s += 70; // 空欄の組合せ
  if (/適切でない|誤って|含まれない|該当しない|ないものはどれか/.test(q.q)) s += 40;
  return Math.round(s);
}
