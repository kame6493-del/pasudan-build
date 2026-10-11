import type { Field } from './types';

export const art = (name: string) => `./art/${name}.webp`;

export interface Enemy {
  key: string;
  name: string;
  img: string;
  boss?: boolean;
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
    enemies: [e('mon_mushroom', 'マッシュルーム'), e('mon_stump', 'きりかぶん'), e('mon_woodgolem', 'ウッドゴーレム'), e('mon_bat', 'ダークバット')],
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
    enemies: [e('mon_armor', 'よろい兵'), e('mon_gear', 'ギアコア'), e('mon_mechabit', 'メカビット'), e('mon_bat', 'ダークバット')],
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
    enemies: [e('mon_robot', 'ボットくん'), e('mon_virus', 'ウイルス君'), e('mon_mechabit', 'メカビット'), e('mon_gear', 'ギアコア')],
    boss: e('mon_icedragon', '電脳竜 アイスドラゴン', true),
  },
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
  { id: 'fox', name: 'キツネの冒険者', img: art('hero_fox'), battle: art('hero_fox'), price: 300, note: 'すばやくて身軽' },
  { id: 'catmage', name: 'ネコの魔法使い', img: art('hero_catmage'), battle: art('hero_catmage'), price: 0, looks: true, note: '魔法でじっくり学ぶ' },
  { id: 'knight', name: 'フードの騎士', img: art('hero_knight'), battle: art('hero_knight'), price: 0, looks: true, note: 'まじめでコツコツ' },
];
export const PETS: Look[] = [
  { id: 'cat', name: 'しろねこ', img: art('pet_cat'), battle: art('pet_cat'), price: 0, note: 'いつもそばにいる相棒' },
  { id: 'owl', name: 'フクロウ', img: art('pet_owl'), battle: art('pet_owl'), price: 0, note: '知識で導くものしり' },
  { id: 'dragon', name: 'ちびりゅう', img: art('pet_dragon'), battle: art('pet_dragon'), price: 200, note: 'やる気をくれる' },
  { id: 'brown', name: 'みけ', img: art('pet_brown'), battle: art('pet_brown'), price: 0, looks: true, note: 'のんびり屋' },
  { id: 'orange', name: 'ちゃとら', img: art('pet_orange'), battle: art('pet_orange'), price: 0, looks: true, note: '元気いっぱい' },
  { id: 'black', name: 'くろねこ', img: art('pet_black'), battle: art('pet_black'), price: 0, looks: true, note: '夜型の相棒' },
  { id: 'dragon2', name: 'あかりゅう', img: art('pet_dragon2'), battle: art('pet_dragon2'), price: 0, looks: true, note: '燃える応援' },
];
