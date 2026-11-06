import { describe, expect, it } from 'vitest';
import { emptyData, normalize } from '../domain/data';
import { damage, enemyHit, enemyHp, heroAtk, heroHp } from '../domain/game';
import {
  addItem,
  bestiary,
  answerStep,
  BOSS_MOVE,
  bondLevel,
  BOND_STEPS,
  branchOptions,
  castSkill,
  critTime,
  dailyPlan,
  DAY_EVENT_INFO,
  DAY_EVENTS,
  dayEvent,
  emptyStatus,
  floorMod,
  FLOOR_MOD_INFO,
  floorPlan,
  floorStars,
  foeCount,
  gaugeNeed,
  GOLD_SLIME,
  ITEM_INFO,
  ITEM_MAX,
  ITEMS,
  merchantBuy,
  MERCHANT_PRICE,
  MIMIC,
  newFoe,
  PET_SKILL,
  restTile,
  spendItem,
  TILE_INFO,
  TILES,
  tileAnswer,
  TRAITS,
  type BState,
  type Ctx,
  type DayEvent,
  type FloorMod,
  type PetSkill,
  type Step,
} from '../domain/gimmick';
import type { Field } from '../domain/types';
import { DUNGEONS, FIELDS, PETS, type Enemy } from '../domain/world';

const ART = new Set(Object.keys(import.meta.glob('../../public/art/*.webp')).map((k) => k.replace('../../public/art/', '').replace('.webp', '')));
const hasArt = (name: string) => ART.has(name);

/** 決まった乱数(毎回同じ結果) */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const LV = 5;
const ALL_FOES: Enemy[] = FIELDS.flatMap((f) => [...DUNGEONS[f].enemies, DUNGEONS[f].boss]).concat([GOLD_SLIME, MIMIC]);
const MODS: FloorMod[] = ['none', 'fog', 'fire', 'wind', 'quiet', 'dark'];
const EVS: (DayEvent | null)[] = [null, ...DAY_EVENTS];

function start(foe: Enemy, floor = 5): BState {
  return { hp: heroHp(LV), maxHp: heroHp(LV), combo: 0, gauge: 0, st: emptyStatus(), foe: newFoe(foe, enemyHp(LV, !!foe.boss, floor)) };
}
function ctxOf(foe: Enemy, mod: FloorMod = 'none', ev: DayEvent | null = null, bond = 1, floor = 5): Ctx {
  return { atk: heroAtk(LV), hit: enemyHit(LV, !!foe.boss, floor), foe, mod, ev, bond, fight: true };
}
const ok = (s: BState) => Number.isFinite(s.hp) && s.hp >= 0 && s.hp <= s.maxHp && Number.isFinite(s.foe.hp) && s.foe.hp >= 0 && s.foe.hp <= s.foe.max && Number.isFinite(s.combo) && s.combo >= 0;

describe('しかけの絵がそろっている', () => {
  it('敵・マス・アイテム・状態・階のしかけ・日替わり・相棒の絵が public/art にある', () => {
    const names = [
      ...Object.keys(TRAITS),
      ...TILES.map((t) => TILE_INFO[t].img),
      'tile_mimic',
      'tile_branch',
      ...ITEMS.map((i) => ITEM_INFO[i].img),
      ...(Object.keys(FLOOR_MOD_INFO) as string[]).map((m) => `mod_${m}`),
      ...DAY_EVENTS.map((e) => DAY_EVENT_INFO[e].img),
      'st_poison',
      'st_blind',
      'st_frost',
      'st_guard',
      'st_bless',
      'star',
      ...PETS.map((p) => p.img.replace('./art/', '').replace('.webp', '')),
      ...ALL_FOES.map((e) => e.img.replace('./art/', '').replace('.webp', '')),
    ];
    expect(ART.size).toBeGreaterThan(100);
    const missing = [...new Set(names)].filter((n) => !hasArt(n));
    expect(missing).toEqual([]);
  });
  it('どの敵にも特性の表があり、どの相棒にも技がある', () => {
    for (const f of FIELDS) for (const e of DUNGEONS[f].enemies) expect(TRAITS[e.key], e.key).toBeDefined();
    for (const p of PETS) expect(PET_SKILL[p.id], p.id).toBeDefined();
  });
});

describe('数字が壊れない(全部の敵 × 階のしかけ × 日替わりを乱数で 300 問ずつ)', () => {
  it('HP・敵の HP・コンボは常に 0〜最大で有限。敵が倒れるのは正解した時だけ', () => {
    for (const foe of ALL_FOES)
      for (const mod of MODS)
        for (const ev of EVS) {
          const rnd = seeded(foe.key.length * 31 + mod.length * 7 + (ev?.length ?? 0));
          let s = start(foe);
          for (let i = 0; i < 300; i++) {
            if (s.hp <= 0 || s.foe.gone) s = { ...start(foe), gauge: s.gauge };
            const right = rnd() < 0.6;
            const crit = right && rnd() < 0.4;
            const before = s.foe.hp;
            const r = answerStep(s, ctxOf(foe, mod, ev), right, crit, damage(LV, s.combo + 1, crit, rnd()));
            expect(ok(r.s), `${foe.key} ${mod} ${ev} #${i}`).toBe(true);
            if (!right) expect(r.s.foe.hp, `${foe.key} まちがいで敵が倒れた`).toBeGreaterThan(0);
            if (r.s.foe.hp === 0) expect(right).toBe(true);
            if (right && !r.s.foe.gone) expect(r.s.foe.hp).toBeLessThan(before + 1);
            s = r.s;
          }
        }
  }, 30000); // 乱数で数千問を回すので、重い時は 5 秒を超える
});

describe('どの階も正解し続ければ必ず終わる(逃げる敵・分かれ道・マスで止まらない)', () => {
  it('全分野・全階・全日替わりで、道のりの敵を正解だけで最後まで進める', () => {
    for (const f of FIELDS as Field[])
      for (let floor = 0; floor < 10; floor++)
        for (const ev of EVS) {
          const rnd = seeded(floor * 13 + f.length);
          const dn = DUNGEONS[f];
          const normals = Array.from({ length: 5 }, (_, i) => dn.enemies[(i + floor) % dn.enemies.length]);
          const plan: Step[] = floorPlan(normals, dn.boss, ev, rnd);
          expect(foeCount(plan)).toBe(6);
          let answers = 0;
          let s = start(normals[0], floor);
          for (const step of plan) {
            if (step.t === 'branch') {
              expect(step.opts[0]).not.toBe(step.opts[1]);
              if (ev === 'treasure') expect(step.opts).toContain('chest');
              continue;
            }
            s = { ...s, foe: newFoe(step.foe, enemyHp(LV, !!step.foe.boss, floor)) };
            let n = 0;
            while (!s.foe.gone) {
              const r = answerStep(s, ctxOf(step.foe, floorMod(f, floor), ev, 1, floor), true, false, damage(LV, s.combo + 1, false, 0.5));
              s = r.s;
              n++;
              answers++;
              expect(n, `${f} ${floor} ${step.foe.key}`).toBeLessThan(40);
            }
          }
          expect(answers).toBeGreaterThan(0);
          expect(s.hp).toBe(s.maxHp); // 正解だけならダメージを受けない(毒もかからない)
        }
  });
  it('今日のダンジョン: ゴールドスライムの日は1体目がゴールドスライム、分かれ道は1つ', () => {
    const foes = Array.from({ length: 5 }, () => DUNGEONS.strategy.enemies[0]);
    const p = dailyPlan(foes, 'gold', seeded(1));
    expect((p[0] as { foe: Enemy }).foe.key).toBe('mon_goldslime');
    expect(p.filter((x) => x.t === 'branch').length).toBe(1);
    expect(foeCount(dailyPlan(foes, null, seeded(1)))).toBe(5);
  });
});

describe('敵の特性', () => {
  const mk = (key: string, boss = false): Enemy => ({ key, name: key, img: '', boss });
  it('かたい: ふつうは 0.6 倍、クリティカルは 1.5 倍', () => {
    const e = mk('mon_armor');
    const a = answerStep(start(e), ctxOf(e), true, false, 100);
    const b = answerStep(start(e), ctxOf(e), true, true, 100);
    expect(a.ev[0]).toMatchObject({ k: 'dmg', n: 60 });
    expect(b.ev[0]).toMatchObject({ k: 'dmg', n: 150 });
  });
  it('再生: まちがえると最大 HP の 25% 回復、2コンボ以上で 1.3 倍', () => {
    const e = mk('mon_stump');
    let s = start(e);
    s = { ...s, foe: { ...s.foe, hp: 10 } };
    const r = answerStep(s, ctxOf(e), false, false, 0);
    expect(r.s.foe.hp).toBe(10 + Math.round(s.foe.max * 0.25));
    const c = answerStep({ ...start(e), combo: 1 }, ctxOf(e), true, false, 100);
    expect(c.ev[0]).toMatchObject({ n: 130 });
  });
  it('盾: 最初の1撃だけ半分', () => {
    const e = mk('mon_gear');
    const r1 = answerStep(start(e), ctxOf(e), true, false, 10);
    const r2 = answerStep(r1.s, ctxOf(e), true, false, 10);
    expect(r1.ev[0]).toMatchObject({ n: 5 });
    expect(r2.ev[0]).toMatchObject({ n: 10 });
  });
  it('すばやい: HP 0.7 倍・攻撃 1.3 倍', () => {
    const e = mk('mon_mechabit');
    const s = start(e);
    expect(s.foe.max).toBe(Math.round(enemyHp(LV, false, 5) * 0.7));
    const r = answerStep(s, ctxOf(e), false, false, 0);
    expect(r.ev[0]).toMatchObject({ k: 'hurt', n: Math.round(enemyHit(LV, false, 5) * 1.3) });
  });
  it('毒: 3問のあいだ減るが、毒では倒れない', () => {
    const e = mk('mon_mushroom');
    let s = answerStep(start(e), ctxOf(e), false, false, 0).s;
    expect(s.st.poison).toBe(2);
    s = { ...s, hp: 1 };
    s = answerStep(s, ctxOf(e), true, false, 1).s;
    expect(s.hp).toBe(1);
    s = answerStep(s, ctxOf(e), true, false, 1).s;
    expect(s.st.poison).toBe(0);
  });
  it('目くらまし: まちがえた次の問題だけクリティカル時間が半分', () => {
    const e = mk('mon_robot');
    const s = answerStep(start(e), ctxOf(e), false, false, 0).s;
    expect(critTime(20, s, { mod: 'none', ev: null })).toBe(10);
    const s2 = answerStep(s, ctxOf(e), true, false, 1).s;
    expect(critTime(20, s2, { mod: 'none', ev: null })).toBe(20);
  });
  it('にげあし: 3問で逃げる / おたから: 2問で逃げる。逃げても先へ進める(gone)', () => {
    const bat = mk('mon_bat');
    let s = start(bat);
    for (let i = 0; i < 3; i++) s = answerStep(s, ctxOf(bat), false, false, 0).s;
    expect(s.foe.gone && s.foe.escaped).toBe(true);
    const g = GOLD_SLIME;
    let t = start(g);
    for (let i = 0; i < 2; i++) t = answerStep(t, ctxOf(g), false, false, 0).s;
    expect(t.foe.escaped).toBe(true);
  });
  it('いかり: HP 半分以下で攻撃 1.5 倍', () => {
    const e = mk('mon_thorn');
    let s = start(e);
    s = { ...s, foe: { ...s.foe, hp: Math.floor(s.foe.max / 2) } };
    const r = answerStep(s, ctxOf(e), false, false, 0);
    expect(r.ev[0]).toMatchObject({ n: Math.round(enemyHit(LV, false, 5) * 1.5) });
  });
});

describe('ボスの行動', () => {
  const boss = (key: string): Enemy => ({ key, name: key, img: '', boss: true });
  it('3問ごとに力をため、ため中の正解はカウンター 1.5 倍、まちがいは 1.5 倍', () => {
    const e = boss('mon_gearknight');
    let s = start(e);
    s = { ...s, foe: { ...s.foe, max: 100000, hp: 100000 } };
    for (let i = 0; i < 2; i++) s = answerStep(s, ctxOf(e), true, true, 10).s;
    const r3 = answerStep(s, ctxOf(e), true, true, 10);
    expect(r3.s.foe.charging).toBe(true);
    const counter = answerStep(r3.s, ctxOf(e), true, true, 100);
    expect(counter.ev[0]).toMatchObject({ k: 'dmg', n: 150 });
    expect(counter.s.foe.charging).toBe(false);
    const hit = answerStep(r3.s, ctxOf(e), false, false, 0);
    expect(hit.ev[0]).toMatchObject({ k: 'hurt', n: Math.round(enemyHit(LV, true, 5) * 1.5) });
  });
  it('本気モードは1回だけ。エントは本気の時に1回だけ回復', () => {
    const e = boss('boss_ent');
    let s = start(e);
    const half = Math.floor(s.foe.max / 2) + 1;
    s = { ...s, foe: { ...s.foe, hp: half + 5 } };
    const r = answerStep(s, ctxOf(e), true, false, 10);
    expect(r.s.foe.enraged).toBe(true);
    expect(r.s.foe.healed).toBe(true);
    const r2 = answerStep({ ...r.s, foe: { ...r.s.foe, hp: 10 } }, ctxOf(e), true, false, 1);
    expect(r2.ev.filter((x) => x.k === 'heal').length).toBe(0);
  });
  it('ギアナイトのかまえ中はクリティカルでないと半分。アイスドラゴンの息で2問クリティカル時間が半分', () => {
    const g = boss('mon_gearknight');
    let s = start(g);
    s = { ...s, foe: { ...s.foe, max: 100000, hp: 100000, stance: true } };
    expect(answerStep(s, ctxOf(g), true, false, 100).ev[0]).toMatchObject({ n: 50 });
    expect(answerStep(s, ctxOf(g), true, true, 100).ev[0]).toMatchObject({ n: 100 });
    const d = boss('mon_icedragon');
    let t = start(d);
    t = { ...t, foe: { ...t.foe, max: 100000, hp: 100000 } };
    for (let i = 0; i < 4; i++) t = answerStep(t, ctxOf(d), true, false, 1).s;
    expect(t.st.frost).toBe(2);
    expect(critTime(20, t, { mod: 'none', ev: null })).toBe(10);
  });
  it('3ダンジョンのボスに技がある', () => {
    for (const f of FIELDS) expect(BOSS_MOVE[DUNGEONS[f].boss.key]).toBeDefined();
  });
});

describe('相棒の技・なかよし', () => {
  const e: Enemy = { key: 'mon_slime', name: 's', img: '' };
  const skills: PetSkill[] = ['heal', 'sage', 'fire', 'guard', 'cheer', 'night', 'power', 'swift', 'luck', 'study'];
  it('ゲージがたまるまで使えない・静けさの階では使えない・使うとゲージは 0', () => {
    for (const k of skills) {
      expect(castSkill(start(e), ctxOf(e), k)).toBeNull();
      const full = { ...start(e), gauge: gaugeNeed(1) };
      expect(castSkill(full, ctxOf(e, 'quiet'), k)).toBeNull();
      const r = castSkill(full, ctxOf(e), k)!;
      expect(r.s.gauge).toBe(0);
      expect(ok(r.s)).toBe(true);
    }
  });
  it('ちびほのおは答えずに敵を倒せない(HP 1 で止まる)', () => {
    for (let hp = 1; hp < 60; hp++) {
      const s = { ...start(e), gauge: 5, foe: { ...start(e).foe, hp } };
      const r = castSkill(s, ctxOf(e, 'none', null, 5), 'fire')!;
      expect(r.s.foe.hp).toBeGreaterThanOrEqual(1);
      expect(r.s.foe.gone).toBe(false);
    }
  });
  it('はやて: 正解ならクリティカル、まちがいには効かない。まもり: 次のミスが 0', () => {
    const s = castSkill({ ...start(e), gauge: 5 }, ctxOf(e), 'swift')!.s;
    expect(answerStep(s, ctxOf(e), true, false, 100).ev[0]).toMatchObject({ crit: true });
    expect(answerStep(s, ctxOf(e), false, false, 0).s.foe.hp).toBe(s.foe.hp + 0);
    const g = castSkill({ ...start(e), gauge: 5 }, ctxOf(e), 'guard')!.s;
    expect(answerStep(g, ctxOf(e), false, false, 0).ev[0]).toMatchObject({ k: 'hurt', n: 0 });
  });
  it('なかよしレベルは 1〜5、上がるほどゲージが少なくてよい', () => {
    expect(bondLevel(0)).toBe(1);
    expect(bondLevel(BOND_STEPS[4])).toBe(5);
    expect(bondLevel(1e9)).toBe(5);
    for (let b = 1; b < 5; b++) expect(gaugeNeed(b + 1)).toBeLessThanOrEqual(gaugeNeed(b));
  });
  it('静けさの階では正解してもゲージがたまらない', () => {
    const r = answerStep(start(e), ctxOf(e, 'quiet'), true, false, 1);
    expect(r.s.gauge).toBe(0);
  });
});

describe('アイテム・マス・お店', () => {
  const e: Enemy = { key: 'mon_slime', name: 's', img: '' };
  it('持っていないアイテムは使えない。満タンでやくそうは使えない', () => {
    for (const id of ITEMS) expect(spendItem(start(e), 0, id)).toBeNull();
    expect(spendItem(start(e), 1, 'herb')).toBeNull();
    const hurt = { ...start(e), hp: 10 };
    expect(spendItem(hurt, 1, 'herb')!.s.hp).toBe(10 + Math.round(hurt.maxHp * 0.4));
  });
  it('アイテムは 0〜最大の個数におさまる', () => {
    let d = emptyData();
    for (let i = 0; i < 10; i++) d = addItem(d, 'herb');
    expect(d.items.herb).toBe(ITEM_MAX);
    for (let i = 0; i < 10; i++) d = addItem(d, 'herb', -1);
    expect(d.items.herb).toBe(0);
  });
  it('わなでは倒れない。宝箱はまちがえても何も起きない', () => {
    for (let hp = 1; hp < 30; hp++) {
      const o = tileAnswer('trap', false, { ...start(e), hp });
      expect(hp - o.hurt).toBeGreaterThanOrEqual(1);
    }
    expect(tileAnswer('chest', false, start(e))).toMatchObject({ coins: 0, item: null, hurt: 0 });
    expect(tileAnswer('chest', true, start(e), seeded(3)).item).not.toBeNull();
    expect(tileAnswer('shrine', true, start(e)).bless).toBe(true);
    expect(tileAnswer('stone', true, start(e)).card).toBe(true);
  });
  it('泉・たき火は HP を超えて回復しない', () => {
    const r = restTile('spring', start(e));
    expect(r.s.hp).toBe(r.s.maxHp);
    expect(r.heal).toBe(0);
    const c = restTile('camp', { ...start(e), hp: 1 });
    expect(c.s.hp).toBe(1 + Math.round(c.s.maxHp * 0.25));
    expect(c.bond).toBeGreaterThan(0);
  });
  it('行商ネコ: コインが足りない・持ちきれない時は買えず、コインは負にならない', () => {
    const d = { ...emptyData(), coins: MERCHANT_PRICE - 1 };
    expect(merchantBuy(d, 'herb')).toBeNull();
    const rich = { ...emptyData(), coins: MERCHANT_PRICE * 10 };
    let x = rich;
    for (let i = 0; i < ITEM_MAX; i++) x = merchantBuy(x, 'herb')!;
    expect(x.items.herb).toBe(ITEM_MAX);
    expect(merchantBuy(x, 'herb')).toBeNull();
    expect(x.coins).toBe(MERCHANT_PRICE * 10 - MERCHANT_PRICE * ITEM_MAX);
  });
  it('分かれ道の2つは別のマス、宝さがしの日は宝箱が入る', () => {
    for (let i = 0; i < 200; i++) {
      const [a, b] = branchOptions(i % 2 ? 'treasure' : null, seeded(i));
      expect(a).not.toBe(b);
      if (i % 2) expect([a, b]).toContain('chest');
    }
  });
});

describe('階のしかけ・日替わり・星', () => {
  it('1〜3階はしかけ無し、4階からはしかけがあり、3分野で並びが違う', () => {
    for (const f of FIELDS) {
      for (let i = 0; i < 3; i++) expect(floorMod(f, i)).toBe('none');
      const mods = Array.from({ length: 7 }, (_, i) => floorMod(f, i + 3));
      expect(mods.filter((m) => m !== 'none').length).toBeGreaterThanOrEqual(5);
    }
    expect(floorMod('strategy', 3)).not.toBe(floorMod('technology', 3));
  });
  it('曜日ごとに7種類の日替わりがある', () => {
    expect(new Set(DAY_EVENTS).size).toBe(7);
    expect(dayEvent(new Date(2026, 9, 18))).toBe('gold'); // 日曜
    expect(dayEvent(new Date(2026, 9, 19))).toBe('coin');
  });
  it('早押しの日はクリティカル時間 +3秒、暗やみは 0.7 倍、2秒より短くならない', () => {
    const s = start({ key: 'x', name: 'x', img: '' });
    expect(critTime(10, s, { mod: 'none', ev: 'quick' })).toBe(13);
    expect(critTime(10, s, { mod: 'dark', ev: null })).toBe(7);
    expect(critTime(1, { ...s, st: { ...s.st, blind: 1, frost: 1 } }, { mod: 'dark', ev: null })).toBe(2);
  });
  it('星: ノーミス 3・2つまで 2・それ以上 1', () => {
    expect(floorStars(0)).toBe(3);
    expect(floorStars(2)).toBe(2);
    expect(floorStars(3)).toBe(1);
  });
  it('古い記録・壊れた記録を読んでもアイテム・なかよし・星はそろう', () => {
    const d = normalize({ items: { herb: 99, sand: -3, charm: 'x' }, petBond: { cat: 12.7, owl: NaN }, stars: { 'strategy:0': 9 } });
    expect(d.items).toEqual({ herb: 3, sand: 0 });
    expect(d.petBond).toEqual({ cat: 12 });
    expect(d.stars).toEqual({ 'strategy:0': 3 });
    const old = normalize({ coins: 5 });
    expect(old.items).toEqual({});
  });
});

describe('モンスター図鑑', () => {
  it('ダンジョンの敵・中ボス・めずらしい敵が重なりなく全部のる', () => {
    const keys = bestiary().flatMap((g) => g.foes.map((e) => e.key));
    for (const f of FIELDS) for (const e of [...DUNGEONS[f].enemies, DUNGEONS[f].boss]) expect(keys).toContain(e.key);
    expect(keys).toContain('mon_goldslime');
    expect(keys).toContain('tile_mimic');
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('倒した数の記録は壊れた値を捨てる', () => {
    expect(normalize({ foes: { mon_slime: 3, x: 'a', y: -2 } }).foes).toEqual({ mon_slime: 3, y: 0 });
  });
});
