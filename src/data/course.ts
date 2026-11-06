/**
 * ゼロから学ぶ道(2026-11-04 持ち主「完全初心者から合格まで行けるくらい」)。
 * IPA の ITパスポート試験シラバス Ver.6.5 の大分類・中分類をすべて単元にした(units/*.json)。
 * 1単元 = やさしい説明 2〜4枚 → 用語カード → 確かめの過去問 3〜5問 → ここが試験に出る。
 */
import type { Field } from '../domain/types';
import strategyA from './units/strategy_a.json';
import strategyB from './units/strategy_b.json';
import management from './units/management.json';
import technologyA from './units/technology_a.json';
import technologyB from './units/technology_b.json';

/** 単元の中の図: 表 か 流れ */
export type Fig = { type: 'table'; cap?: string; head?: string[]; rows: string[][] } | { type: 'flow'; cap?: string; items: string[] };

/** 単元の1枚(スマホ1画面で読める量) */
export interface Page {
  h: string;
  p: string[];
  fig?: Fig;
  /** 身近なたとえ */
  like?: string;
}

export interface Unit {
  id: string;
  field: Field;
  /** シラバスの中分類 */
  mid: string;
  /** ダンジョンの階のテーマ(notes.json・questions.json の topic と同じ名前) */
  topic: string;
  /** やさしい呼び名 */
  title: string;
  /** 目安の分 */
  mins: number;
  /** 説明 2〜4枚 */
  pages: Page[];
  /** 大事な用語(用語カードになる) */
  words: [string, string][];
  /** 確かめの過去問(易しい順) */
  qs: string[];
  /** ここが試験に出る */
  exam: string;
}

/** 最初の1画面「ITパスポートってどんな試験?」(IPA の試験要綱・公式サイトの内容) */
export const ABOUT = {
  lead: 'ITパスポート試験は、ITを使って働くすべての人に向けた国の試験です。IT企業の人だけでなく、学生や事務・営業の人もたくさん受けています。',
  facts: [
    ['実施', '情報処理推進機構(IPA)。国家試験の「情報処理技術者試験」の1つ'],
    ['受け方', 'テストセンターのパソコンで解く(CBT方式)。日程は自分で選べる'],
    ['問題', '4択で100問・120分'],
    ['合格の線', '総合で1000点中600点以上、かつ3分野それぞれ1000点中300点以上'],
  ] as [string, string][],
  fields: [
    { field: 'strategy' as Field, name: 'ストラテジ系', what: '会社のしくみ・法律・お金・ITの活かし方', n: '約35問' },
    { field: 'management' as Field, name: 'マネジメント系', what: 'システムの作り方・進め方・運用と監査', n: '約20問' },
    { field: 'technology' as Field, name: 'テクノロジ系', what: 'コンピュータ・ネットワーク・セキュリティ', n: '約45問' },
  ],
  tip: '3分野のどれか1つでも300点に届かないと不合格です。得意な分野だけでなく、全部を少しずつ進めましょう。',
};

type RawUnit = Omit<Unit, 'field' | 'words'> & { words: string[][] };
const load = (field: Field, xs: RawUnit[]): Unit[] => xs.map((u) => ({ ...u, field, words: u.words.map((w) => [w[0], w[1]] as [string, string]) }));

export const UNITS: Unit[] = [
  ...load('strategy', strategyA as RawUnit[]),
  ...load('strategy', strategyB as RawUnit[]),
  ...load('management', management as RawUnit[]),
  ...load('technology', technologyA as RawUnit[]),
  ...load('technology', technologyB as RawUnit[]),
];

/** シラバスの大分類(分野ごと) */
export const MAJOR: Record<Field, string[]> = {
  strategy: ['企業と法務', '経営戦略', 'システム戦略'],
  management: ['開発技術', 'プロジェクトマネジメント', 'サービスマネジメント'],
  technology: ['基礎理論', 'コンピュータシステム', '技術要素'],
};

/**
 * はじめての人の道すじ: 3分野を、進み具合の割合がそろうようにまぜて進む
 * (どれか1分野でも300点に届かないと不合格のため。単元の多い分野は多めに出る)。
 * 最初は各分野の入門(無料の3単元)を1つずつ順に。
 */
export const PATH: string[] = (() => {
  const by = (f: Field) => UNITS.filter((u) => u.field === f).map((u) => u.id);
  const lists: [Field, string[]][] = [
    ['strategy', by('strategy')],
    ['technology', by('technology')],
    ['management', by('management')],
  ];
  const INTRO = 3;
  const out: string[] = [];
  for (let i = 0; i < INTRO; i++) for (const [, ids] of lists) out.push(ids[i]);
  const at = new Map<Field, number>(lists.map(([f]) => [f, INTRO]));
  while (out.length < UNITS.length) {
    let best: [Field, string[]] | null = null;
    let bestRate = Infinity;
    for (const l of lists) {
      const i = at.get(l[0])!;
      if (i >= l[1].length) continue;
      const rate = i / l[1].length;
      if (rate < bestRate - 1e-9) {
        best = l;
        bestRate = rate;
      }
    }
    const [f, ids] = best!;
    out.push(ids[at.get(f)!]);
    at.set(f, at.get(f)! + 1);
  }
  return out;
})();

export const unitById = (id: string) => UNITS.find((u) => u.id === id);
