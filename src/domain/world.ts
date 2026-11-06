import type { Field } from './types';

export const art = (name: string) => `./art/${name}.webp`;

export interface Enemy {
  key: string;
  name: string;
  img: string;
  boss?: boolean;
  /** 出る階(0から数えて、はじめ〜おわり)。ない時は全部の階 */
  floors?: [number, number];
}

export interface Dungeon {
  field: Field;
  name: string;
  short: string;
  sub: string;
  color: string;
  bg: string; // マップ・選択の絵
  stage: string; // バトルの背景
  book: string;
  floors: string[]; // 1階から順に小テーマ
  enemies: Enemy[];
  boss: Enemy;
}

const e = (key: string, name: string, boss = false): Enemy => ({ key, name, img: art(key), boss });
/** ふつうの敵: from〜to 階に出る(浅い階は弱い顔ぶれ、深い階ほど新しい敵) */
const f = (key: string, name: string, from: number, to: number): Enemy => ({ key, name, img: art(key), floors: [from, to] });

export const DUNGEONS: Record<Field, Dungeon> = {
  strategy: {
    field: 'strategy',
    name: 'ストラテジの森',
    short: 'ストラテジ',
    sub: '経営・法務・会計',
    color: '#3f9d3a',
    bg: art('bg_forest'),
    stage: art('bg_forest_b'),
    book: art('book_strategy'),
    floors: ['企業と組織', '会計・財務', '知的財産権', '法律・標準化', '経営戦略', 'マーケティング', '技術戦略', 'ビジネスインダストリ', 'システム戦略', 'システム企画'],
    enemies: [
      f('mon_slime', 'もりスライム', 0, 4),
      f('mon_mushroom', 'マッシュルーム', 0, 4),
      f('mon_stump', 'ゲンカキリカブ', 0, 5),
      f('mon_compla', 'コンプラおばけ', 1, 6),
      f('mon_poisonflower', 'ドクバナ', 2, 6),
      f('mon_copyweasel', 'コピーいたち', 3, 7),
      f('mon_thorn', 'いばらん', 4, 9),
      f('mon_woodgolem', 'ウッドゴーレム', 5, 9),
      f('mon_redfrog', 'あかじガエル', 6, 9),
    ],
    boss: e('boss_ent', '森の守護者 エント', true),
  },
  management: {
    field: 'management',
    name: 'マネジメントの城',
    short: 'マネジメント',
    sub: 'プロジェクト・サービス・監査',
    color: '#e0761f',
    bg: art('bg_castle'),
    stage: art('bg_castle_b'),
    book: art('book_management'),
    floors: ['システム開発', '開発手法', 'プロジェクトの計画', 'スケジュールとコスト', '品質・リスク・人', 'サービスマネジメント', '運用とサービスデスク', 'ファシリティと可用性', 'システム監査', '内部統制・ガバナンス'],
    enemies: [
      f('mon_armor', 'レガシーよろい', 0, 4),
      f('mon_gear', 'ボトルネックギア', 0, 5),
      f('mon_magicbook', 'ようけん魔導書', 0, 6),
      f('mon_flameimp', 'えんじょうインプ', 2, 7),
      f('mon_ghostknight', 'ゆうれい騎士', 3, 8),
      f('mon_hourglass', 'すなどけいゴーレム', 4, 9),
      f('mon_cannon', 'たいほうゴーレム', 5, 9),
      f('mon_blackbox', 'ブラックボックス', 6, 9),
    ],
    boss: e('mon_gearknight', '城の番人 ギアナイト', true),
  },
  technology: {
    field: 'technology',
    name: 'テクノロジの塔',
    short: 'テクノロジ',
    sub: 'ネットワーク・セキュリティ・DB',
    color: '#7a56d8',
    bg: art('bg_tower'),
    stage: art('bg_tower_b'),
    book: art('book_technology'),
    floors: ['基礎理論・AI', 'アルゴリズム・プログラミング', 'コンピュータ構成', 'システム構成・信頼性', 'ソフトウェア・OS', '情報デザイン・メディア', 'データベース', 'ネットワーク', 'セキュリティの脅威', 'セキュリティ対策'],
    enemies: [
      f('mon_mechabit', 'メカビット', 0, 3),
      f('mon_robot', 'ボットくん', 0, 4),
      f('mon_bug', 'バグビートル', 0, 5),
      f('mon_virus', 'ウイルスくん', 2, 6),
      f('mon_spam', 'スパムメール', 3, 7),
      f('mon_phishslime', 'フィッシングスライム', 3, 8),
      f('mon_bat', 'DDoSバット', 4, 8),
      f('mon_bruteforce', 'ブルートフォースゴーレム', 5, 9),
      f('mon_firewall', 'ファイアウォール', 6, 9),
      f('mon_chainsnake', 'ブロックチェーンスネーク', 6, 9),
    ],
    boss: e('mon_icedragon', '電脳竜 クラウドドラゴン', true),
  },
};

/** その階に出るふつうの敵 */
export const enemiesAt = (dn: Dungeon, floor: number): Enemy[] => {
  const xs = dn.enemies.filter((x) => !x.floors || (floor >= x.floors[0] && floor <= x.floors[1]));
  return xs.length ? xs : dn.enemies;
};

export const FIELDS: Field[] = ['strategy', 'management', 'technology'];
export const FIELD_LABEL: Record<Field, string> = { strategy: 'ストラテジ', management: 'マネジメント', technology: 'テクノロジ' };
/** 本番の出題数(ストラテジ35・マネジメント20・テクノロジ45) */
export const EXAM_MIX: Record<Field, number> = { strategy: 35, management: 20, technology: 45 };

export const EXAM_BOSS: Enemy = { key: 'boss_celes', name: '試練の守護者 セレスタス', img: art('boss_celes'), boss: true };
export const GHOST: Enemy = { key: 'boss_hood', name: 'きのうの自分(ゴースト)', img: art('boss_hood') };
export const WEAK_SHADOW: Enemy = { key: 'tab_nigate', name: 'ニガテのかげ', img: art('tab_nigate') };

/** 主人公の見た目。price=コインで解放 / looks=見た目セット */
export interface Look {
  id: string;
  name: string;
  img: string;
  battle: string; // バトルで使う絵
  price: number;
  looks?: boolean;
  note: string;
}
export const HEROES: Look[] = [
  { id: 'hood', name: 'フードの冒険者', img: art('hero_hood'), battle: art('hero_back'), price: 0, note: 'バランスのよいスタンダードな姿' },
  { id: 'fox', name: 'キツネの冒険者', img: art('hero_fox'), battle: art('hero_fox_back'), price: 300, note: 'すばやくて身軽' },
  { id: 'catmage', name: 'ネコの魔法使い', img: art('hero_catmage'), battle: art('hero_catmage_back'), price: 0, looks: true, note: '魔法でじっくり学ぶ' },
  { id: 'knight', name: 'フードの騎士', img: art('hero_knight'), battle: art('hero_knight_back'), price: 0, looks: true, note: 'まじめでコツコツ' },
];
export const PETS: Look[] = [
  { id: 'cat', name: 'しろねこ', img: art('pet_cat'), battle: art('pet_cat_back'), price: 0, note: 'いつもそばにいる相棒' },
  { id: 'owl', name: 'フクロウ', img: art('pet_owl'), battle: art('pet_owl_back'), price: 0, note: '知識で導くものしり' },
  { id: 'dragon', name: 'ちびりゅう', img: art('pet_dragon'), battle: art('pet_dragon_back'), price: 200, note: 'やる気をくれる' },
  { id: 'brown', name: 'みけ', img: art('pet_brown'), battle: art('pet_brown_back'), price: 0, looks: true, note: 'のんびり屋' },
  { id: 'orange', name: 'ちゃとら', img: art('pet_orange'), battle: art('pet_orange_back'), price: 0, looks: true, note: '元気いっぱい' },
  { id: 'black', name: 'くろねこ', img: art('pet_black'), battle: art('pet_black_back'), price: 0, looks: true, note: '夜型の相棒' },
  { id: 'dragon2', name: 'あかりゅう', img: art('pet_dragon2'), battle: art('pet_dragon2_back'), price: 0, looks: true, note: '燃える応援' },
  { id: 'rabbit', name: 'うさぎ', img: art('pet_rabbit'), battle: art('pet_rabbit_back'), price: 250, note: 'はやての足' },
  { id: 'penguin', name: 'ペンギン', img: art('pet_penguin'), battle: art('pet_penguin_back'), price: 250, note: 'おたからさがしが得意' },
  { id: 'tanuki', name: 'こだぬき', img: art('pet_tanuki'), battle: art('pet_tanuki_back'), price: 250, note: 'まなびの葉で経験値アップ' },
];

/**
 * 着がえ画面の札。free=はじめから無料 / coin=コインで解放できる(まだ) / paid=見た目セット(課金)が要る / owned=解放・購入ずみ
 * 2026-10-19 Discord の HZK さん: 見た目セットが課金の物だと画面から分からなかった
 */
export type LookState = 'free' | 'coin' | 'paid' | 'owned';
export function lookState(l: Look, ownedLooks: boolean, unlocked: readonly string[]): LookState {
  if (l.looks) return ownedLooks ? 'owned' : 'paid';
  if (l.price === 0) return 'free';
  return unlocked.includes(l.id) ? 'owned' : 'coin';
}
