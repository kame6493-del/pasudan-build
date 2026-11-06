/**
 * ダンジョンのしかけ(2026-10-18 追加)。バトルの数字の動きはすべてここの純粋な関数で決め、画面(Battle.tsx)は結果を見せるだけ。
 *
 * 守ること(テスト src/test/gimmick.test.ts で確かめる)
 * - 敵を倒せるのは「問題に正解した時」だけ。相棒の技・アイテム・しかけで問題を飛ばしたり、答えずに敵を倒したりはできない
 *   (技やわなのダメージは敵の HP を 1 より下げない)
 * - HP・コイン・経験値は NaN や負にならず、HP は 0〜最大の中
 * - 毒・わななど「答えと関係なく減る」ダメージでは倒れない(HP 1 で止まる)。倒れるのはまちがえて敵に攻撃された時だけ
 * - どの階も、正解し続ければ必ずクリアできる(逃げる敵・分かれ道・マスで止まらない)
 */
import type { AppData, Field } from './types';
import { art, DUNGEONS, EXAM_BOSS, type Enemy } from './world';

// ------------------------------------------------------------------ 敵の特性

export type Trait = 'hard' | 'regen' | 'swift' | 'poison' | 'blind' | 'shield' | 'thief' | 'rage' | 'gold';

export const TRAIT_INFO: Record<Trait, { name: string; note: string }> = {
  hard: { name: 'かたい', note: 'ふつうの攻撃は効きにくい。弱点はクリティカル(早押し)' },
  regen: { name: '再生', note: 'まちがえると HP が回復する。弱点はコンボ' },
  swift: { name: 'すばやい', note: 'HP は少ないが攻撃が強い' },
  poison: { name: '毒', note: 'まちがえると毒になる(3問のあいだ HP が少しずつ減る)' },
  blind: { name: '目くらまし', note: 'まちがえると次の問題のクリティカル時間が半分' },
  shield: { name: '盾', note: '最初の1撃は盾で半分になる' },
  thief: { name: 'にげあし', note: '3問のうちに倒さないと逃げる(コインはもらえない)' },
  rage: { name: 'いかり', note: 'HP が半分を切ると攻撃が強くなる' },
  gold: { name: 'おたから', note: '倒すとコインがたくさん。2問で逃げる' },
};

/** 敵ごとの特性 */
export const TRAITS: Record<string, Trait[]> = {
  mon_mushroom: ['poison'],
  mon_stump: ['regen'],
  mon_woodgolem: ['hard'],
  mon_bat: ['swift', 'thief'],
  mon_slime: ['regen'],
  mon_poisonflower: ['poison'],
  mon_thorn: ['rage'],
  mon_armor: ['hard'],
  mon_gear: ['shield'],
  mon_mechabit: ['swift'],
  mon_ghostknight: ['shield', 'rage'],
  mon_magicbook: ['blind'],
  mon_cannon: ['rage', 'hard'],
  mon_robot: ['blind'],
  mon_virus: ['regen', 'poison'],
  mon_bug: ['swift', 'regen'],
  mon_spam: ['thief', 'blind'],
  mon_firewall: ['hard', 'shield'],
  mon_goldslime: ['gold'],
  // 2026-11-04 足した敵(今の敵と同じ特性の組み合わせの幅に合わせる)
  mon_compla: ['blind'],
  mon_copyweasel: ['swift', 'thief'],
  mon_redfrog: ['rage', 'hard'],
  mon_flameimp: ['swift', 'rage'],
  mon_hourglass: ['hard'],
  mon_blackbox: ['shield', 'blind'],
  mon_phishslime: ['thief', 'blind'],
  mon_bruteforce: ['hard', 'rage'],
  mon_chainsnake: ['shield', 'regen'],
};
export const traitsOf = (e: Enemy | undefined): Trait[] => (e ? TRAITS[e.key] ?? [] : []);

export const GOLD_SLIME: Enemy = { key: 'mon_goldslime', name: 'ゴールドスライム', img: art('mon_goldslime') };

// ------------------------------------------------------------------ ボスの行動

/** ボスごとの技(どのボスも「ため攻撃」と「本気モード」を持つ) */
export type BossMove = 'roots' | 'stance' | 'breath';
export const BOSS_MOVE: Record<string, BossMove> = { boss_ent: 'roots', mon_gearknight: 'stance', mon_icedragon: 'breath' };
export const BOSS_MOVE_INFO: Record<BossMove, { name: string; note: string }> = {
  roots: { name: '根っこの回復', note: '本気モードになった時に1回だけ HP を回復する' },
  stance: { name: '鉄壁のかまえ', note: '4問ごとにかまえる。かまえ中はクリティカルでないとダメージ半分' },
  breath: { name: 'こおりの息', note: '4問ごとに息をはく。2問のあいだクリティカル時間が半分' },
};
/** ため攻撃: 3問ごとに力をためる。ため中に正解するとカウンター(1.5倍)、まちがえると 1.5 倍の一撃 */
export const CHARGE_EVERY = 3;

// ------------------------------------------------------------------ 階のしかけ・日替わり

export type FloorMod = 'none' | 'fog' | 'fire' | 'wind' | 'quiet' | 'dark';
export const FLOOR_MOD_INFO: Record<Exclude<FloorMod, 'none'>, { name: string; note: string }> = {
  fog: { name: '霧の階', note: '敵の HP が見えない' },
  fire: { name: '炎の床', note: '正解の攻撃が1.15倍。まちがえると床でやけど(HP が少し減る)' },
  wind: { name: '追い風の階', note: '正解するとコンボが2つ増える' },
  quiet: { name: '静けさの階', note: '相棒の技が使えない。かわりに経験値1.5倍' },
  dark: { name: '暗やみの階', note: 'クリティカル時間が短い。かわりにクリティカルのダメージが大きい' },
};
/** 4階から、階ごとに決まったしかけ(1〜3階は慣れるための階なので無し) */
const MOD_ORDER: FloorMod[] = ['fog', 'fire', 'none', 'wind', 'dark', 'quiet', 'fire'];
const FIELD_SHIFT: Record<Field, number> = { strategy: 0, management: 2, technology: 4 };
export function floorMod(field: Field, floor: number): FloorMod {
  if (floor < 3) return 'none';
  return MOD_ORDER[(floor - 3 + FIELD_SHIFT[field]) % MOD_ORDER.length];
}

export type DayEvent = 'coin' | 'quick' | 'weak' | 'xp' | 'card' | 'treasure' | 'gold';
/** 曜日(0=日)ごとのイベント */
export const DAY_EVENTS: DayEvent[] = ['gold', 'coin', 'quick', 'weak', 'xp', 'card', 'treasure'];
export const DAY_EVENT_INFO: Record<DayEvent, { name: string; note: string; img: string }> = {
  coin: { name: 'コインの日', note: '敵とクリアのコインが2倍', img: 'coin' },
  quick: { name: '早押しの日', note: 'クリティカル時間が3秒のびる', img: 'hourglass' },
  weak: { name: 'ニガテ退治の日', note: '今日のダンジョンに苦手が多めに出る。苦手を消すと経験値+10', img: 'tab_nigate' },
  xp: { name: '経験値の日', note: '経験値が1.5倍', img: 'xp' },
  card: { name: 'カードの日', note: '敵が用語カードを落としやすい', img: 'card_books' },
  treasure: { name: '宝さがしの日', note: '分かれ道に宝箱が必ず出る', img: 'chest_gold' },
  gold: { name: 'ゴールドスライムの日', note: '今日のダンジョンにゴールドスライムが出る', img: 'mon_goldslime' },
};
export const dayEvent = (date = new Date()): DayEvent => DAY_EVENTS[date.getDay()];

/** コイン・経験値の倍率(日替わり・階のしかけ) */
export const coinMul = (ev: DayEvent | null) => (ev === 'coin' ? 2 : 1);
export const xpMul = (ev: DayEvent | null, mod: FloorMod) => (ev === 'xp' ? 1.5 : 1) * (mod === 'quiet' ? 1.5 : 1);
export const cardRate = (ev: DayEvent | null) => (ev === 'card' ? 0.7 : 0.4);

// ------------------------------------------------------------------ 相棒の技となかよし度

export type PetSkill = 'heal' | 'sage' | 'fire' | 'guard' | 'cheer' | 'night' | 'power' | 'swift' | 'luck' | 'study';
export const PET_SKILL: Record<string, PetSkill> = {
  cat: 'heal',
  owl: 'sage',
  dragon: 'fire',
  brown: 'guard',
  orange: 'cheer',
  black: 'night',
  dragon2: 'power',
  rabbit: 'swift',
  penguin: 'luck',
  tanuki: 'study',
};
export const SKILL_INFO: Record<PetSkill, { name: string; note: (bond: number) => string }> = {
  heal: { name: 'いやしの毛づくろい', note: (b) => `HP を ${healPct(b)}% 回復` },
  sage: { name: 'ものしりの目', note: (b) => `いまの問題のクリティカル時間 +${8 + 2 * b}秒` },
  fire: { name: 'ちびほのお', note: () => '敵にほのおのダメージ(とどめは刺せない)' },
  guard: { name: 'まもりのしっぽ', note: () => '次にまちがえた時のダメージを0に' },
  cheer: { name: 'げんきのおうえん', note: (b) => `コンボ +${b >= 3 ? 3 : 2}` },
  night: { name: 'よるのめ', note: () => '次に倒した敵が用語カードを必ず落とす' },
  power: { name: 'もえる応援', note: (b) => `次の正解のダメージ ${b >= 3 ? 2.5 : 2}倍` },
  swift: { name: 'はやてのステップ', note: () => 'いまの問題は正解すればクリティカル' },
  luck: { name: 'おたからさがし', note: () => 'この冒険でもらうコインが1.5倍' },
  study: { name: 'まなびの葉', note: () => 'この冒険でもらう経験値が1.5倍' },
};
const healPct = (bond: number) => 30 + 5 * (bond - 1);

/** なかよし度: 相棒をつれて正解するたびに1たまる。レベル1〜5 */
export const BOND_STEPS = [0, 20, 60, 120, 200];
export function bondLevel(pts: number): number {
  let lv = 1;
  for (let i = 1; i < BOND_STEPS.length; i++) if (pts >= BOND_STEPS[i]) lv = i + 1;
  return lv;
}
/** 技のゲージがたまるのに要る正解の数(なかよしレベルが上がると少なくなる) */
export const gaugeNeed = (bond: number) => [5, 5, 4, 4, 3][Math.min(5, Math.max(1, bond)) - 1];

// ------------------------------------------------------------------ アイテム

export type ItemId = 'herb' | 'sand' | 'charm' | 'potion';
export const ITEMS: ItemId[] = ['herb', 'sand', 'charm', 'potion'];
export const ITEM_INFO: Record<ItemId, { name: string; note: string; img: string }> = {
  herb: { name: 'やくそう', note: 'HP を40%回復', img: 'item_herb' },
  sand: { name: '時の砂', note: 'いまの問題のクリティカル時間 +8秒', img: 'item_sand' },
  charm: { name: '守りの札', note: '次にまちがえた時のダメージを0に', img: 'item_charm' },
  potion: { name: '力の薬', note: '次の正解のダメージ1.5倍', img: 'item_potion' },
};
export const ITEM_MAX = 3;
export function addItem(d: AppData, id: ItemId, n = 1): AppData {
  const now = d.items?.[id] ?? 0;
  return { ...d, items: { ...d.items, [id]: Math.min(ITEM_MAX, Math.max(0, now + n)) } };
}

// ------------------------------------------------------------------ 分かれ道のマス

export type Tile = 'chest' | 'trap' | 'spring' | 'shrine' | 'merchant' | 'camp' | 'stone';
export const TILE_INFO: Record<Tile, { name: string; note: string; img: string; quiz: boolean }> = {
  chest: { name: '宝箱', note: '1問に正解すると開く(たまにミミック)', img: 'chest_wood', quiz: true },
  trap: { name: 'わなの通路', note: '1問。正解で通りぬけてコイン、まちがえるとトゲのわな', img: 'tile_trap', quiz: true },
  spring: { name: '回復の泉', note: 'HP が半分回復する', img: 'tile_spring', quiz: false },
  shrine: { name: 'ほこら', note: '1問。正解するとこの冒険のあいだ攻撃1.2倍の加護', img: 'tile_shrine', quiz: true },
  merchant: { name: '行商ネコ', note: 'コイン30でアイテムを1つ買える', img: 'tile_merchant', quiz: false },
  camp: { name: 'たき火', note: 'HP を少し回復して、相棒となかよくなる', img: 'tile_camp', quiz: false },
  stone: { name: '知識の石版', note: '1問。正解すると用語カードがもらえる', img: 'tile_stone', quiz: true },
};
export const TILES: Tile[] = ['chest', 'trap', 'spring', 'shrine', 'merchant', 'camp', 'stone'];
export const MERCHANT_PRICE = 30;
export const MIMIC: Enemy = { key: 'tile_mimic', name: 'ランサムミミック', img: art('tile_mimic') };

/** 分かれ道の2つの道。宝さがしの日は片方が必ず宝箱 */
export function branchOptions(ev: DayEvent | null, rnd = Math.random): [Tile, Tile] {
  const pool = [...TILES];
  const a = ev === 'treasure' ? 'chest' : pool[Math.floor(rnd() * pool.length)];
  const rest = pool.filter((t) => t !== a);
  const b = rest[Math.floor(rnd() * rest.length)];
  return [a, b];
}

// ------------------------------------------------------------------ 冒険の道のり

export type Step = { t: 'foe'; foe: Enemy } | { t: 'branch'; opts: [Tile, Tile] };

/** 階の道のり: ふつうの敵5体と中ボスの間に分かれ道を2つ(2体目と4体目のあと) */
export function floorPlan(normals: Enemy[], boss: Enemy, ev: DayEvent | null, rnd = Math.random): Step[] {
  const f = (e: Enemy): Step => ({ t: 'foe', foe: e });
  const [a, b, c, d, e] = normals;
  return [f(a), f(b), { t: 'branch', opts: branchOptions(ev, rnd) }, f(c), f(d), { t: 'branch', opts: branchOptions(ev, rnd) }, f(e), f(boss)];
}
/** 今日のダンジョン: 5体のあいだに分かれ道を1つ。ゴールドスライムの日は1体目がゴールドスライム */
export function dailyPlan(foes: Enemy[], ev: DayEvent | null, rnd = Math.random): Step[] {
  const list = ev === 'gold' ? [GOLD_SLIME, ...foes.slice(1)] : foes;
  const out: Step[] = list.map((foe) => ({ t: 'foe', foe }));
  out.splice(2, 0, { t: 'branch', opts: branchOptions(ev, rnd) });
  return out;
}
export const foeCount = (plan: Step[]) => plan.filter((s) => s.t === 'foe').length;

// ------------------------------------------------------------------ バトルの状態

export interface Status {
  poison: number; // のこりの問題数
  blind: number; // のこりの問題数(クリティカル時間が半分)
  frost: number; // こおりの息(のこりの問題数)
  guard: boolean; // 次のミスのダメージ 0
  power: number; // 次の正解のダメージ倍率(1=なし)
  bless: boolean; // ほこらの加護(攻撃1.2倍)
  cardSure: boolean; // 次の撃破でカード確定
  sure: boolean; // いまの問題は正解ならクリティカル
  critPlus: number; // いまの問題のクリティカル時間の追加(秒)
  coinMul: number; // おたからさがし
  xpMul: number; // まなびの葉
}
export const emptyStatus = (): Status => ({ poison: 0, blind: 0, frost: 0, guard: false, power: 1, bless: false, cardSure: false, sure: false, critPlus: 0, coinMul: 1, xpMul: 1 });

export interface FoeState {
  hp: number;
  max: number;
  turn: number; // この敵に答えた数
  shield: boolean;
  charging: boolean;
  enraged: boolean;
  healed: boolean;
  stance: boolean;
  gone: boolean; // 倒した・逃げた
  escaped: boolean;
}
export interface BState {
  hp: number;
  maxHp: number;
  combo: number;
  gauge: number;
  st: Status;
  foe: FoeState;
}

export interface Ctx {
  /** 主人公の攻撃力 */
  atk: number;
  /** ふつうの敵の攻撃 */
  hit: number;
  foe: Enemy;
  mod: FloorMod;
  ev: DayEvent | null;
  bond: number;
  /** 敵との戦いか(false = マスの1問・HP の無い場面) */
  fight: boolean;
}

export type Ev =
  | { k: 'dmg'; n: number; crit: boolean; note?: string }
  | { k: 'hurt'; n: number; note?: string }
  | { k: 'heal'; n: number; who: 'me' | 'foe'; note: string }
  | { k: 'info'; note: string }
  | { k: 'defeat' }
  | { k: 'escape'; note: string };

export function newFoe(e: Enemy, maxHp: number): FoeState {
  const t = traitsOf(e);
  const max = Math.max(1, Math.round(maxHp * (t.includes('swift') ? 0.7 : 1) * (t.includes('gold') ? 0.8 : 1)));
  return { hp: max, max, turn: 0, shield: t.includes('shield'), charging: false, enraged: false, healed: false, stance: false, gone: false, escaped: false };
}

/** クリティカルの持ち時間(秒)にしかけを当てる */
export function critTime(base: number, s: BState, c: Pick<Ctx, 'mod' | 'ev'>): number {
  let t = base + s.st.critPlus + (c.ev === 'quick' ? 3 : 0);
  if (c.mod === 'dark') t *= 0.7;
  if (s.st.blind > 0) t *= 0.5;
  if (s.st.frost > 0) t *= 0.5;
  return Math.max(2, Math.round(t));
}

const clampHp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)));

/**
 * 1問答えた後の状態。dmgBase は damage() の値(コンボ・クリティカル込み)。
 * 敵の HP を 0 にできるのは ok のときだけ。
 */
export function answerStep(s0: BState, c: Ctx, ok: boolean, crit0: boolean, dmgBase: number): { s: BState; ev: Ev[] } {
  const s: BState = { ...s0, st: { ...s0.st }, foe: { ...s0.foe } };
  const ev: Ev[] = [];
  const t = traitsOf(c.foe);
  const boss = !!c.foe.boss && c.fight;
  const move = boss ? BOSS_MOVE[c.foe.key] : undefined;
  const crit = ok && (crit0 || s.st.sure);
  const f = s.foe;
  if (c.fight) f.turn += 1;

  if (ok) {
    s.combo += c.mod === 'wind' ? 2 : 1;
    if (c.mod !== 'quiet') s.gauge = Math.min(gaugeNeed(c.bond), s.gauge + 1);
    if (c.fight) {
      let mul = 1;
      const notes: string[] = [];
      if (t.includes('hard')) {
        mul *= crit ? 1.5 : 0.6;
        notes.push(crit ? '弱点をついた！' : 'かたい…');
      }
      if (t.includes('regen') && s.combo >= 2) {
        mul *= 1.3;
        notes.push('コンボが弱点！');
      }
      if (f.shield) {
        mul *= 0.5;
        f.shield = false;
        notes.push('盾がこわれた');
      }
      if (move === 'stance' && f.stance) {
        if (!crit) {
          mul *= 0.5;
          notes.push('鉄壁のかまえ…');
        } else notes.push('かまえをくずした！');
        f.stance = false;
      }
      if (boss && f.charging) {
        mul *= 1.5;
        f.charging = false;
        notes.push('カウンター！');
      }
      if (c.mod === 'fire') mul *= 1.15;
      if (c.mod === 'dark' && crit) mul *= 1.3;
      if (s.st.bless) mul *= 1.2;
      if (s.st.power > 1) {
        mul *= s.st.power;
        s.st.power = 1;
      }
      const n = Math.max(1, Math.round(dmgBase * mul));
      f.hp = clampHp(f.hp - n, f.max);
      ev.push({ k: 'dmg', n, crit, note: notes.join(' ') || undefined });
    }
  } else {
    s.combo = 0;
    if (c.fight) {
      let n = c.hit;
      const notes: string[] = [];
      if (t.includes('swift')) n *= 1.3;
      if (t.includes('rage') && f.hp * 2 <= f.max) n *= 1.5;
      if (boss && f.enraged) n *= 1.15;
      if (boss && f.charging) {
        n *= 1.5;
        f.charging = false;
        notes.push('ためた一撃！');
      }
      if (s.st.guard) {
        s.st.guard = false;
        n = 0;
        notes.push('攻撃をふせいだ！');
      }
      n = Math.round(n);
      s.hp = clampHp(s.hp - n, s.maxHp);
      ev.push({ k: 'hurt', n, note: notes.join(' ') || undefined });
      if (t.includes('regen') && f.hp > 0) {
        const h = Math.min(f.max - f.hp, Math.round(f.max * 0.25));
        if (h > 0) {
          f.hp += h;
          ev.push({ k: 'heal', n: h, who: 'foe', note: `${c.foe.name}は再生した` });
        }
      }
      if (t.includes('poison') && s.st.poison <= 0) {
        s.st.poison = 3;
        ev.push({ k: 'info', note: '毒をうけた！' });
      }
      if (t.includes('blind')) {
        s.st.blind = 2; // この問題のぶんを下で1つ減らすので、次の問題が半分になる
        ev.push({ k: 'info', note: '目くらまし！ 次の問題はクリティカル時間が半分' });
      }
      if (c.mod === 'fire' && s.hp > 1) {
        const burn = Math.min(s.hp - 1, Math.round(s.maxHp * 0.05));
        if (burn > 0) {
          s.hp -= burn;
          ev.push({ k: 'hurt', n: burn, note: '炎の床でやけど' });
        }
      }
    }
  }

  // 毒: 答えるたびに少し減る(倒れはしない)
  if (s.st.poison > 0 && c.fight) {
    const p = Math.min(Math.max(0, s.hp - 1), Math.round(s.maxHp * 0.05));
    if (p > 0) {
      s.hp -= p;
      ev.push({ k: 'hurt', n: p, note: '毒' });
    }
    s.st.poison -= 1;
  }
  // この問題だけの効果を消す
  s.st.sure = false;
  s.st.critPlus = 0;
  if (s.st.blind > 0) s.st.blind -= 1;
  if (s.st.frost > 0) s.st.frost -= 1;

  if (c.fight && f.hp <= 0) {
    f.gone = true;
    ev.push({ k: 'defeat' });
    return { s, ev };
  }

  if (boss && f.hp > 0) {
    // 本気モード(HP 半分以下で1回)
    if (!f.enraged && f.hp * 2 <= f.max) {
      f.enraged = true;
      ev.push({ k: 'info', note: `${c.foe.name}が本気になった！` });
      if (move === 'roots' && !f.healed) {
        f.healed = true;
        const h = Math.round(f.max * 0.15);
        f.hp = clampHp(f.hp + h, f.max);
        ev.push({ k: 'heal', n: h, who: 'foe', note: '根っこから力をすいあげた' });
      }
    }
    if (f.turn % CHARGE_EVERY === 0 && !f.charging) {
      f.charging = true;
      ev.push({ k: 'info', note: '力をためている！ 次に正解すればカウンター' });
    }
    if (move === 'stance' && f.turn % 4 === 0) {
      f.stance = true;
      ev.push({ k: 'info', note: '鉄壁のかまえ！ クリティカルでないと効きにくい' });
    }
    if (move === 'breath' && f.turn % 4 === 0) {
      s.st.frost = 2;
      ev.push({ k: 'info', note: 'こおりの息！ 2問のあいだクリティカル時間が半分' });
    }
  }

  // 逃げる敵
  if (c.fight && f.hp > 0) {
    const limit = t.includes('gold') ? 2 : t.includes('thief') ? 3 : 0;
    if (limit && f.turn >= limit) {
      f.gone = true;
      f.escaped = true;
      ev.push({ k: 'escape', note: `${c.foe.name}は逃げていった…` });
    }
  }
  return { s, ev };
}

/** 相棒の技を使う(答える前)。敵の HP は 1 より下がらない */
export function castSkill(s0: BState, c: Ctx, skill: PetSkill): { s: BState; ev: Ev[] } | null {
  if (s0.gauge < gaugeNeed(c.bond) || c.mod === 'quiet') return null;
  const s: BState = { ...s0, gauge: 0, st: { ...s0.st }, foe: { ...s0.foe } };
  const ev: Ev[] = [];
  const name = SKILL_INFO[skill].name;
  switch (skill) {
    case 'heal': {
      const h = Math.min(s.maxHp - s.hp, Math.round((s.maxHp * healPct(c.bond)) / 100));
      s.hp += h;
      ev.push({ k: 'heal', n: h, who: 'me', note: name });
      break;
    }
    case 'sage':
      s.st.critPlus += 8 + 2 * c.bond;
      ev.push({ k: 'info', note: `${name}: クリティカル時間がのびた` });
      break;
    case 'fire': {
      if (c.fight) {
        const want = Math.round(c.atk * (0.8 + 0.1 * c.bond));
        const n = Math.max(0, Math.min(want, s.foe.hp - 1));
        s.foe.hp -= n;
        ev.push({ k: 'dmg', n, crit: false, note: name });
      } else ev.push({ k: 'info', note: name });
      break;
    }
    case 'guard':
      s.st.guard = true;
      ev.push({ k: 'info', note: `${name}: 次のミスをふせぐ` });
      break;
    case 'cheer':
      s.combo += c.bond >= 3 ? 3 : 2;
      ev.push({ k: 'info', note: `${name}: コンボ +${c.bond >= 3 ? 3 : 2}` });
      break;
    case 'night':
      s.st.cardSure = true;
      ev.push({ k: 'info', note: `${name}: 次の敵はカードを落とす` });
      break;
    case 'power':
      s.st.power = Math.max(s.st.power, c.bond >= 3 ? 2.5 : 2);
      ev.push({ k: 'info', note: `${name}: 次の正解が強くなる` });
      break;
    case 'swift':
      s.st.sure = true;
      ev.push({ k: 'info', note: `${name}: 正解すればクリティカル` });
      break;
    case 'luck':
      s.st.coinMul = 1.5;
      ev.push({ k: 'info', note: `${name}: コイン1.5倍` });
      break;
    case 'study':
      s.st.xpMul = 1.5;
      ev.push({ k: 'info', note: `${name}: 経験値1.5倍` });
      break;
  }
  return { s, ev };
}

/** アイテムを使う(答える前)。持っていなければ null */
export function spendItem(s0: BState, have: number, id: ItemId): { s: BState; ev: Ev[] } | null {
  if (have <= 0) return null;
  const s: BState = { ...s0, st: { ...s0.st } };
  const name = ITEM_INFO[id].name;
  if (id === 'herb') {
    if (s.hp >= s.maxHp) return null;
    const h = Math.min(s.maxHp - s.hp, Math.round(s.maxHp * 0.4));
    s.hp += h;
    return { s, ev: [{ k: 'heal', n: h, who: 'me', note: name }] };
  }
  if (id === 'sand') {
    s.st.critPlus += 8;
    return { s, ev: [{ k: 'info', note: `${name}: クリティカル時間 +8秒` }] };
  }
  if (id === 'charm') {
    if (s.st.guard) return null;
    s.st.guard = true;
    return { s, ev: [{ k: 'info', note: `${name}: 次のミスをふせぐ` }] };
  }
  if (s.st.power >= 1.5) return null;
  s.st.power = 1.5;
  return { s, ev: [{ k: 'info', note: `${name}: 次の正解のダメージ1.5倍` }] };
}

/** マスの1問の結果 */
export interface TileOutcome {
  coins: number;
  xp: number;
  item: ItemId | null;
  card: boolean;
  hurt: number;
  bless: boolean;
  note: string;
}
export function tileAnswer(tile: Tile, ok: boolean, s: BState, rnd = Math.random): TileOutcome {
  const o: TileOutcome = { coins: 0, xp: 0, item: null, card: false, hurt: 0, bless: false, note: '' };
  const randItem = () => ITEMS[Math.floor(rnd() * ITEMS.length)];
  if (tile === 'chest') {
    if (ok) {
      o.coins = 20;
      o.item = randItem();
      o.note = '宝箱が開いた！';
    } else o.note = '宝箱はかたく閉じたまま…';
  } else if (tile === 'trap') {
    if (ok) {
      o.coins = 15;
      o.xp = 5;
      o.note = 'わなを見やぶった！';
    } else {
      o.hurt = Math.min(Math.max(0, s.hp - 1), Math.round(s.maxHp * 0.2));
      o.note = 'トゲのわなにかかった！';
    }
  } else if (tile === 'shrine') {
    o.bless = ok;
    o.note = ok ? '加護をさずかった！ 攻撃1.2倍' : 'ほこらは静かなまま…';
  } else if (tile === 'stone') {
    o.card = ok;
    o.xp = ok ? 5 : 0;
    o.note = ok ? '石版の知識を読みといた！' : '石版の文字は読めなかった…';
  }
  return o;
}

/** 問題の無いマス(泉・たき火)。行商ネコは買う時に merchantBuy */
export function restTile(tile: 'spring' | 'camp', s0: BState): { s: BState; heal: number; bond: number } {
  const pct = tile === 'spring' ? 0.5 : 0.25;
  const heal = Math.min(s0.maxHp - s0.hp, Math.round(s0.maxHp * pct));
  return { s: { ...s0, hp: s0.hp + heal }, heal, bond: tile === 'camp' ? 3 : 0 };
}
export function merchantBuy(d: AppData, id: ItemId): AppData | null {
  if (d.coins < MERCHANT_PRICE || (d.items?.[id] ?? 0) >= ITEM_MAX) return null;
  return addItem({ ...d, coins: d.coins - MERCHANT_PRICE }, id);
}

/** はじめて倒した敵のおまけ(コイン) */
export const FIRST_DEFEAT_BONUS = 10;
/** モンスター図鑑に載る敵(ダンジョンの敵・中ボス・ゴールドスライム・ミミック) */
export function bestiary(): { field: Field | null; foes: Enemy[] }[] {
  // 2つのダンジョンに出る敵がいれば、先に出るダンジョンにだけ載せる
  const seen = new Set<string>();
  const uniq = (es: Enemy[]) => es.filter((e) => !seen.has(e.key) && (seen.add(e.key), true));
  return [
    ...(['strategy', 'management', 'technology'] as Field[]).map((f) => ({ field: f, foes: uniq([...DUNGEONS[f].enemies, DUNGEONS[f].boss]) })),
    { field: null, foes: uniq([GOLD_SLIME, MIMIC, EXAM_BOSS]) },
  ];
}

/** 階のクリアの星: ★1 クリア / ★2 まちがい2つ以下 / ★3 ノーミス */
export function floorStars(wrong: number): number {
  return wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
}
/** 星を初めて取った時のおまけ(コイン) */
export const STAR_BONUS = [0, 0, 20, 50];
