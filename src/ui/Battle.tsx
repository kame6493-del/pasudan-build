import { useEffect, useMemo, useRef, useState } from 'react';
import { Q_BY_ID, TERM_BY_ID, TERMS, TERMS_OF_Q, todayKey } from '../domain/data';
import {
  availableFields,
  beginnerEase,
  chestKind,
  critWindow,
  damage,
  dailyQuestions,
  day,
  enemyHit,
  enemyHp,
  floorQuestions,
  heroAtk,
  heroHp,
  levelOf,
  liveStreak,
  dungeonPool,
  pickQuestions,
  recordAnswer,
  timeLimit,
  FREE_DAILY,
  practiceLeft,
} from '../domain/game';
import {
  addItem,
  answerStep,
  BOSS_MOVE,
  BOSS_MOVE_INFO,
  bondLevel,
  cardRate,
  coinMul,
  critTime,
  dailyPlan,
  DAY_EVENT_INFO,
  dayEvent,
  emptyStatus,
  FIRST_DEFEAT_BONUS,
  floorMod,
  FLOOR_MOD_INFO,
  floorPlan,
  floorStars,
  foeCount,
  gaugeNeed,
  ITEM_INFO,
  ITEM_MAX,
  ITEMS,
  merchantBuy,
  MERCHANT_PRICE,
  MIMIC,
  newFoe,
  PET_SKILL,
  restTile,
  SKILL_INFO,
  STAR_BONUS,
  TILE_INFO,
  tileAnswer,
  TRAIT_INFO,
  traitsOf,
  spendItem,
  castSkill,
  xpMul,
  type BState,
  type Ctx,
  type DayEvent,
  type Ev,
  type FloorMod,
  type ItemId,
  type Step,
  type Tile,
} from '../domain/gimmick';
import { clockPause, clockRead, clockResume, clockStart, lookBack, lookForward, stepsBack, type Answered } from '../domain/review';
import type { AppData, Question } from '../domain/types';
import { art, DUNGEONS, enemiesAt, FIELD_LABEL, GHOST, HEROES, PETS, WEAK_SHADOW, type Enemy } from '../domain/world';
import { tap, thud } from '../platform/native';
import { attackSfx, bgm, play } from '../platform/sound';
import { SoundControls } from './Settings';
import { useBack } from './back';
import { useQuestionFit } from './qfit';
import { CARD_ART, Choices, Explain, QBody, QHead } from './QuestionView';
import { useStore, type BattleMode, type Reward } from './store';

interface Setup {
  title: string;
  sub: string;
  stage: string;
  questions: Question[];
  plan: Step[];
  hpOn: boolean;
  /** 早押しのタイマーを出すか(過去問・復習は落ち着いて解けるように出さない) */
  timer: boolean;
  total: number | null; // 決まった問題数（null=敵を倒すまで）
  mod: FloorMod;
  ev: DayEvent | null;
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const foes = (es: Enemy[]): Step[] => es.map((foe) => ({ t: 'foe', foe }));

function setup(d: AppData, m: BattleMode): Setup {
  if (m.kind === 'floor') {
    const dn = DUNGEONS[m.field];
    // ニガテ退治・ゴールドスライムは今日のダンジョンだけの日替わり
    const today = dayEvent();
    const ev = today === 'weak' || today === 'gold' ? null : today;
    const pool = enemiesAt(dn, m.floor);
    const normals = Array.from({ length: 5 }, () => pick(pool));
    return { title: dn.name, sub: `第${m.floor + 1}階 ${dn.floors[m.floor]}`, stage: dn.stage, questions: floorQuestions(d, m.field, m.floor), plan: floorPlan(normals, dn.boss, ev), hpOn: true, timer: true, total: null, mod: floorMod(m.field, m.floor), ev };
  }
  if (m.kind === 'daily') {
    const fields = availableFields(d);
    const ev = dayEvent();
    const qs = dailyQuestions(d, ev === 'weak' ? 6 : 4);
    const enemies = Array.from({ length: 5 }, (_, i) => (i === 4 ? DUNGEONS[pick(fields)].boss : pick(DUNGEONS[pick(fields)].enemies)));
    return { title: '今日のダンジョン', sub: '10問', stage: DUNGEONS[pick(fields)].stage, questions: qs, plan: dailyPlan(enemies, ev), hpOn: true, timer: true, total: 10, mod: 'none', ev };
  }
  const calm = { mod: 'none' as FloorMod, ev: null };
  if (m.kind === 'ghost') {
    return { title: 'ゴースト対戦', sub: '過去のベストと競争', stage: art('bg_tower_b'), questions: pickQuestions(d, dungeonPool(d), 10), plan: foes([GHOST]), hpOn: false, timer: true, total: 10, ...calm };
  }
  if (m.kind === 'practice') {
    const qs = m.ids.map((id) => Q_BY_ID.get(id)!).filter(Boolean);
    const f = qs[0]?.field ?? 'strategy';
    return { title: m.title, sub: m.sub, stage: DUNGEONS[f].stage, questions: qs, plan: foes([OWL]), hpOn: false, timer: false, total: qs.length, ...calm };
  }
  // review
  const qs = m.kind === 'review' ? m.ids.map((id) => Q_BY_ID.get(id)!).filter(Boolean) : [];
  return { title: m.kind === 'review' && m.unit ? '確かめの問題' : m.kind === 'review' && m.test ? 'まとめのテスト' : '復習の部屋', sub: m.kind === 'review' ? m.title : '', stage: art('bg_forest_b'), questions: qs, plan: foes([WEAK_SHADOW]), hpOn: false, timer: false, total: qs.length, ...calm };
}

const OWL: Enemy = { key: 'owl_teacher', name: 'フクロウ先生', img: art('owl_teacher') };

interface Fx {
  id: number;
  kind: 'seikai' | 'oshii' | 'crit' | 'combo10' | 'dmg' | 'medmg' | 'flash' | 'heal' | 'fheal' | 'log' | 'skill';
  text?: string;
}

/** いまの場所: 敵 / 分かれ道 / マスの1問 / 問題の無いマス */
type Here =
  | { t: 'foe'; foe: Enemy }
  | { t: 'branch'; opts: [Tile, Tile] }
  | { t: 'tile'; tile: Tile; foe: Enemy; mimic: boolean }
  | { t: 'rest'; tile: 'spring' | 'camp' | 'merchant'; heal: number; bond: number };

const tileFoe = (tile: Tile): Enemy => ({ key: `tile_${tile}`, name: TILE_INFO[tile].name, img: art(TILE_INFO[tile].img) });

export function Battle({ mode, onExit }: { mode: BattleMode; onExit: () => void }) {
  const { data, update, pushRewards, go, toast, confirm, askFull } = useStore();
  const [termOpen, setTermOpen] = useState<string | null>(null);
  const S = useMemo(() => setup(data, mode), []); // eslint-disable-line react-hooks/exhaustive-deps
  const startLv = useRef(levelOf(data.xp).lv);
  const lv = levelOf(data.xp).lv;
  const hero = HEROES.find((h) => h.id === data.hero) ?? HEROES[0];
  const pet = PETS.find((p) => p.id === data.pet) ?? PETS[0];
  const skill = PET_SKILL[pet.id] ?? 'heal';
  const bond = bondLevel(data.petBond?.[pet.id] ?? 0);

  const [qi, setQi] = useState(0);
  const [queue, setQueue] = useState<Question[]>(S.questions);
  // 道のりの何番目か(敵・分かれ道)。plan は今日のダンジョンで敵が足りない時に足す
  const [plan, setPlan] = useState<Step[]>(S.plan);
  const [pi, setPi] = useState(0);
  const [here, setHere] = useState<Here>(() => S.plan[0] as Here);
  // 強さを決める階: 階の冒険はその階、今日のダンジョンは解いた数が少ないうちは序盤の階なみ、ほかは4階なみ
  const sFloor = useRef(mode.kind === 'floor' ? mode.floor : mode.kind === 'daily' ? Math.round(3 * (1 - beginnerEase(data))) : 3).current;
  const maxHpOf = (e: Enemy) => enemyHp(lv, !!e.boss, sFloor);
  const [bs, setBs] = useState<BState>(() => {
    const f0 = (S.plan[0] as { foe: Enemy }).foe;
    const foe = newFoe(f0, S.total && !S.hpOn ? S.total : maxHpOf(f0));
    return { hp: heroHp(lv), maxHp: heroHp(lv), combo: 0, gauge: 0, st: emptyStatus(), foe };
  });
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<{ ok: boolean; crit: boolean; weakAdded: boolean } | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [anim, setAnim] = useState<{ enemy?: string; hero?: string; pet?: string }>({});
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<null | 'clear' | 'fail' | 'end'>(null);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [bag, setBag] = useState(false);
  /** 音の窓(BGM・効果音の音量)。開いている間は時計を止める */
  const [soundOpen, setSoundOpen] = useState(false);
  /** 最初の1戦だけ、答え方の案内を出す(最初の3問) */
  const guide = !data.guided && (mode.kind === 'floor' || mode.kind === 'daily') && answered < 3;
  const [intro, setIntro] = useState(S.mod !== 'none' || !!S.ev);
  const clock = useRef(clockStart(Date.now()));
  const panel = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const runStart = useRef(Date.now());
  const splits = useRef<number[]>([]);
  const gained = useRef({ coins: 0, xp: 0, cards: [] as string[], evolved: [] as string[], seen: [] as string[], items: [] as ItemId[] });
  const fxId = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;
  // 見返し: 答えた問題の記録と、いま見返している番号(null = いまの問題)。答えは変えられない
  const [hist, setHist] = useState<Answered[]>([]);
  const [view, setView] = useState<number | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const q = queue[qi];
  const fight = here.t === 'foe' || (here.t === 'tile' && here.mimic);
  const enemy: Enemy = here.t === 'foe' ? here.foe : here.t === 'tile' ? here.foe : here.t === 'branch' ? { key: 'tile_branch', name: '分かれ道', img: art('tile_branch') } : tileFoe(here.tile);
  const enemyDead = S.hpOn && fight && bs.foe.gone;
  const tileDone = here.t === 'tile' && !here.mimic && !!result;
  const ctx: Ctx = { atk: heroAtk(lv), hit: enemyHit(lv, !!enemy.boss, sFloor), foe: enemy, mod: S.mod, ev: S.ev, bond, fight: S.hpOn && fight };
  const cw = q ? (S.hpOn ? critTime(critWindow(q, sFloor), bs, S) : critWindow(q, sFloor)) : 10;
  const tl = q ? Math.max(timeLimit(q, sFloor), cw + 10) : 40;
  const asking = here.t === 'foe' || here.t === 'tile';
  const totalFoes = foeCount(S.plan);
  const foesPassed = plan.slice(0, pi).filter((s) => s.t === 'foe').length;
  const cMul = coinMul(S.ev) * bs.st.coinMul;
  const xMul = xpMul(S.ev, S.mod) * bs.st.xpMul;

  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [qi, view]);

  useEffect(() => {
    if (!intro) return;
    const t = window.setTimeout(() => setIntro(false), 2600);
    return () => window.clearTimeout(t);
  }, [intro]);

  // ボス(中ボス)の間だけ曲を変える
  const bossNow = !!enemy?.boss && S.hpOn && here.t === 'foe';
  useEffect(() => {
    bgm(bossNow ? 'boss' : 'battle');
  }, [bossNow]);

  useEffect(() => {
    if (!result) return;
    // 答えたら解説が見えるところまで送る（まちがえた時は少し早く）
    const t = window.setTimeout(() => {
      if (viewRef.current === null) panel.current?.querySelector('.explain')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, result.ok ? 900 : 650);
    return () => window.clearTimeout(t);
  }, [result]);

  // 新しい問題で時計を0から
  useEffect(() => {
    clock.current = clockStart(Date.now());
    setElapsed(0);
  }, [qi]);
  // 答えた後・終わった後・前の問題を見返している間・分かれ道やマスで選んでいる間は止める
  const paused = !!result || !!done || view !== null || !asking || bag || soundOpen;
  useEffect(() => {
    if (paused) {
      clock.current = clockPause(clock.current, Date.now());
      setElapsed(clockRead(clock.current, Date.now()));
      return;
    }
    clock.current = clockResume(clock.current, Date.now());
    const t = window.setInterval(() => setElapsed(clockRead(clock.current, Date.now())), 200);
    return () => window.clearInterval(t);
  }, [qi, paused]);

  const addFx = (f: Omit<Fx, 'id'>, ms = 1100) => {
    const id = ++fxId.current;
    setFx((cur) => [...cur, { ...f, id }]);
    window.setTimeout(() => setFx((cur) => cur.filter((x) => x.id !== id)), ms);
  };
  /** しかけの出来事を画面に出す */
  const showEv = (evs: Ev[], delay = 0) => {
    let n = 0;
    for (const e of evs) {
      const at = delay + n * 120;
      if (e.k === 'dmg') {
        window.setTimeout(() => addFx({ kind: 'dmg', text: String(e.n) }, 1000), at);
        if (e.note) window.setTimeout(() => addFx({ kind: 'log', text: e.note }, 1700), at + 650);
      } else if (e.k === 'hurt') {
        window.setTimeout(() => addFx({ kind: 'medmg', text: String(e.n) }, 900), at);
        if (e.note) window.setTimeout(() => addFx({ kind: 'log', text: e.note }, 1700), at + 650);
      } else if (e.k === 'heal') {
        window.setTimeout(() => addFx({ kind: e.who === 'me' ? 'heal' : 'fheal', text: String(e.n) }, 1000), at);
        window.setTimeout(() => addFx({ kind: 'log', text: e.note }, 1700), at + 650);
        void play('heal');
      } else if (e.k === 'info' || e.k === 'escape') {
        window.setTimeout(() => addFx({ kind: 'log', text: e.note }, 1900), at + 700);
        if (e.note.includes('ためて')) window.setTimeout(() => void play('charge'), at + 200);
        if (e.k === 'escape') window.setTimeout(() => void play('escape'), at + 200);
      } else continue;
      n++;
    }
  };

  const giveRewardsForFoe = (foe: Enemy, mimic: boolean) => {
    const boss = !!foe.boss;
    const gold = traitsOf(foe).includes('gold');
    const first = !(dataRef.current.foes?.[foe.key] ?? 0);
    const coins = Math.round((mimic ? 40 : gold ? 60 : boss ? 25 : 6) * cMul) + (first ? FIRST_DEFEAT_BONUS : 0);
    const xp = Math.round((boss ? 30 : mimic ? 12 : 8) * xMul);
    gained.current.coins += coins;
    gained.current.xp += xp;
    window.setTimeout(() => void play('defeat'), 350);
    // 用語カードを落とす（ボスは必ず）
    let card: string | null = null;
    if (boss || bs.st.cardSure || Math.random() < cardRate(S.ev)) {
      const own = (id: string) => data.cards[id] || gained.current.cards.includes(id);
      const near = gained.current.seen.flatMap((id) => TERMS_OF_Q.get(id) ?? []).filter((t) => !own(t));
      const fields = availableFields(data);
      const any = TERMS.filter((t) => fields.includes(t.field) && !own(t.id)).map((t) => t.id);
      card = near.length ? pick(near) : any.length ? pick(any) : null;
    }
    // アイテム: ボスとミミックは必ず、ふつうの敵は 1 割
    const item: ItemId | null = boss || mimic || Math.random() < 0.1 ? pick(ITEMS) : null;
    if (card) gained.current.cards.push(card);
    if (item) gained.current.items.push(item);
    update((d) => {
      let n = { ...d, coins: d.coins + coins, xp: d.xp + xp, cards: card ? { ...d.cards, [card]: 1 as const } : d.cards, foes: { ...d.foes, [foe.key]: (d.foes?.[foe.key] ?? 0) + 1 } };
      if (item) n = addItem(n, item);
      return n;
    });
    if (first) window.setTimeout(() => addFx({ kind: 'log', text: `${foe.name}をはじめて倒した！ モンスター図鑑に登録（コイン+${FIRST_DEFEAT_BONUS}）` }, 2200), 900);
    if (card) {
      const t = TERMS.find((x) => x.id === card);
      window.setTimeout(() => toast(`用語カード「${t?.name}」をゲット！`), 600);
    }
    if (item) window.setTimeout(() => toast(`${ITEM_INFO[item].name}を手に入れた！`), card ? 2200 : 600);
    if (bs.st.cardSure && card) setBs((b) => ({ ...b, st: { ...b.st, cardSure: false } }));
  };

  const answer = (i: number) => {
    if (result || !q || !asking) return;
    const ok = i === q.answer;
    const crit = ok && S.timer && (elapsed <= cw || bs.st.sure);
    setPicked(i);
    setHist((h) => [...h, { q, picked: i, ok }]);
    setAnswered((n) => n + 1);
    if (!ok) setWrong((n) => n + 1);
    splits.current.push(Date.now() - runStart.current);
    gained.current.seen.push(q.id);

    const nextCombo = ok ? bs.combo + (S.mod === 'wind' ? 2 : 1) : 0;
    const weakAdded = !ok && !(q.id in dataRef.current.weak);
    const weakBonus = S.ev === 'weak' && ok && q.id in dataRef.current.weak && dataRef.current.weak[q.id] >= 1 ? 10 : 0;
    const xpGain = ok ? Math.round(3 * xMul) + weakBonus : 0;
    update((d) => {
      const eff = recordAnswer(d, q, ok, { counted: mode.kind === 'practice', daily: mode.kind === 'daily', combo: nextCombo });
      gained.current.evolved.push(...eff.evolved);
      let n = ok ? { ...eff.data, xp: eff.data.xp + xpGain } : eff.data;
      if (ok && S.hpOn) n = { ...n, petBond: { ...n.petBond, [pet.id]: (n.petBond?.[pet.id] ?? 0) + 1 } };
      return n;
    });
    gained.current.xp += xpGain;

    let evs: Ev[] = [];
    let s = bs;
    if (S.hpOn && here.t !== 'tile') {
      const r = answerStep(bs, ctx, ok, crit, damage(lv, nextCombo, crit));
      s = r.s;
      evs = r.ev;
    } else if (here.t === 'tile' && here.mimic) {
      const r = answerStep(bs, ctx, ok, crit, damage(lv, nextCombo, crit));
      s = r.s;
      evs = r.ev;
    } else {
      s = { ...bs, combo: nextCombo, gauge: ok && S.hpOn && S.mod !== 'quiet' ? Math.min(gaugeNeed(bond), bs.gauge + 1) : bs.gauge };
    }
    if (here.t === 'tile' && !here.mimic) {
      const o = tileAnswer(here.tile, ok, s);
      const coins = Math.round(o.coins * cMul);
      const xp = Math.round(o.xp * xMul);
      let card: string | null = null;
      if (o.card) {
        const fields = availableFields(data);
        const unowned = TERMS.filter((t) => fields.includes(t.field) && !data.cards[t.id] && !gained.current.cards.includes(t.id));
        card = unowned.length ? pick(unowned).id : null;
        if (card) gained.current.cards.push(card);
      }
      if (o.hurt > 0) {
        s = { ...s, hp: Math.max(1, s.hp - o.hurt) };
        evs.push({ k: 'hurt', n: o.hurt });
        window.setTimeout(() => void play('damage'), 200);
      }
      if (o.bless) s = { ...s, st: { ...s.st, bless: true } };
      gained.current.coins += coins;
      gained.current.xp += xp;
      if (o.item) gained.current.items.push(o.item);
      update((d) => {
        let n = { ...d, coins: d.coins + coins, xp: d.xp + xp, cards: card ? { ...d.cards, [card]: 1 as const } : d.cards };
        if (o.item) n = addItem(n, o.item);
        return n;
      });
      evs.push({ k: 'info', note: o.note });
      const got = [coins ? `コイン+${coins}` : '', o.item ? ITEM_INFO[o.item].name : '', card ? `用語カード「${TERM_BY_ID.get(card)?.name}」` : ''].filter(Boolean);
      if (got.length) window.setTimeout(() => toast(`${got.join('・')}を手に入れた！`), 700);
      if (ok && (here.tile === 'chest' || here.tile === 'stone')) window.setTimeout(() => void play('chest'), 300);
    }
    setBs(s);

    if (ok) {
      setCorrect((n) => n + 1);
      tap();
      const [swing, impact] = attackSfx(hero.id, crit);
      void play(swing);
      window.setTimeout(() => void play(impact), 140);
      setAnim({ hero: 'atk', enemy: 'hit' });
      addFx({ kind: 'seikai', text: crit ? 'クリティカル！' : s.combo > 1 ? `${s.combo}コンボ` : 'ナイス' }, 1150);
      if (s.combo > 0 && Math.floor(s.combo / 10) > Math.floor(bs.combo / 10)) {
        addFx({ kind: 'combo10' }, 1300);
        addFx({ kind: 'flash' }, 800);
        void play('combo');
      }
    } else {
      thud();
      void play('wrong');
      setAnim({ enemy: S.hpOn && fight ? 'attack' : undefined, hero: 'hurt' });
      addFx({ kind: 'oshii' }, 1150);
      if (S.hpOn && fight) window.setTimeout(() => void play('damage'), 200);
    }
    showEv(evs);
    if (S.hpOn && fight && s.foe.gone && !s.foe.escaped) giveRewardsForFoe(enemy, here.t === 'tile');
    window.setTimeout(() => setAnim({}), 450);
    setResult({ ok, crit, weakAdded });
  };

  const finish = (kind: 'clear' | 'fail' | 'end') => {
    setDone(kind);
    if (!data.guided && (mode.kind === 'floor' || mode.kind === 'daily')) update((d) => ({ ...d, guided: true }));
    const rewards: Reward[] = [];
    const g = gained.current;
    if (kind === 'fail') {
      void play('fail');
      rewards.push({ kind: 'fail', title: `${S.sub}で力つきた…` });
    }
    if (kind === 'clear' && mode.kind === 'floor') {
      const stars = floorStars(wrong);
      const key = `${mode.field}:${mode.floor}`;
      const before = data.stars?.[key] ?? 0;
      const starBonus = Math.max(0, STAR_BONUS[stars] - STAR_BONUS[before]);
      const bonus = Math.round((40 + mode.floor * 5) * cMul) + starBonus;
      const xp = Math.round(20 * xMul);
      update((d) => ({
        ...d,
        coins: d.coins + bonus,
        xp: d.xp + xp,
        cleared: { ...d.cleared, [mode.field]: Math.max(d.cleared[mode.field], mode.floor + 1) },
        stars: { ...d.stars, [key]: Math.max(d.stars?.[key] ?? 0, stars) },
      }));
      rewards.push({ kind: 'clear', title: `${S.sub} クリア！`, coins: g.coins + bonus, xp: g.xp + xp, cards: g.cards, stars, starNew: stars > before, items: g.items });
      g.xp += xp;
    }
    if (mode.kind === 'daily' && kind === 'end') {
      const first = !day(data).chest;
      if (first) {
        const ck = chestKind(Math.max(1, liveStreak(data)));
        const fields = availableFields(data);
        const unowned = TERMS.filter((t) => fields.includes(t.field) && !data.cards[t.id] && !g.cards.includes(t.id));
        const card = unowned.length ? pick(unowned).id : null;
        const coins = Math.round(ck.coins * cMul);
        update((d) => {
          const key = todayKey();
          return { ...d, coins: d.coins + coins, xp: d.xp + ck.xp, cards: card ? { ...d.cards, [card]: 1 } : d.cards, days: { ...d.days, [key]: { ...d.days[key], chest: true } } };
        });
        g.xp += ck.xp;
        // g.xp には宝箱の分が入っているので、ここで足さない
        rewards.push({ kind: 'chest', img: ck.img, name: ck.name, coins: coins + g.coins, xp: g.xp, cards: card ? [...g.cards, card] : g.cards });
      } else rewards.push({ kind: 'clear', title: '今日のダンジョン クリア！', coins: g.coins, xp: g.xp, cards: g.cards, items: g.items });
    }
    if (mode.kind === 'ghost' && kind === 'end') {
      const run = { correct, splits: [...splits.current] };
      const best = data.ghost;
      const win = !best || run.correct > best.correct || (run.correct === best.correct && run.splits[run.splits.length - 1] < best.splits[best.splits.length - 1]);
      if (win) update((d) => ({ ...d, ghost: run, coins: d.coins + 30 }));
      rewards.push({ kind: 'clear', title: win ? 'ゴーストに勝った！ 記録を更新' : 'ゴーストの勝ち… もう一度！', coins: win ? 30 : 0, xp: g.xp, cards: [] });
    }
    if (mode.kind === 'review' && kind === 'end') {
      const { unit, test } = mode;
      const pass = answered > 0 && correct / answered >= 0.6;
      // 学ぶ道: 確かめの問題を解き終えたら単元クリア。まとめのテストは6割で合格
      if (unit) update((d) => ({ ...d, course: { ...d.course, [unit]: 3 } }));
      if (test && pass) update((d) => ({ ...d, course: { ...d.course, [`test:${test}`]: 3 } }));
      const title = unit
        ? `単元クリア！ ${correct}/${answered}問 正解`
        : test
          ? `まとめのテスト ${correct}/${answered}問 正解${pass ? ' 合格ライン突破！' : '(6割で合格)'}`
          : `復習おわり！ ${correct}/${answered}問 正解`;
      rewards.push({ kind: 'clear', title, coins: 0, xp: g.xp, cards: [] });
    }
    if (mode.kind === 'practice' && kind === 'end') {
      rewards.push({ kind: 'clear', title: `${S.sub} ${answered}問おわり！ 正解 ${correct}問`, coins: 0, xp: g.xp, cards: [] });
    }
    // レベルアップ・カード進化・なかよしレベルは記録を反映した後で数える
    const bondBefore = bond;
    window.setTimeout(() => {
      const d = dataRef.current;
      const nowLv = levelOf(d.xp).lv;
      const extra: Reward[] = [];
      if (nowLv > startLv.current) extra.push({ kind: 'levelup', from: startLv.current, to: nowLv });
      const nowBond = bondLevel(d.petBond?.[pet.id] ?? 0);
      if (nowBond > bondBefore) extra.push({ kind: 'bond', pet: pet.id, to: nowBond });
      for (const t of new Set(g.evolved)) extra.push({ kind: 'evolve', term: t });
      pushRewards([...rewards, ...extra]);
      onExit();
    }, 50);
  };

  /** 道のりの次へ(敵・分かれ道) */
  const advance = (cur: BState) => {
    let p = plan;
    const ni = pi + 1;
    if (ni >= p.length) {
      if (mode.kind === 'floor') return finish('clear');
      // 今日のダンジョンで敵を倒しきった時は、最後の敵(ボス)がもう一度
      const last = [...p].reverse().find((s) => s.t === 'foe') as Step;
      p = [...p, last];
      setPlan(p);
    }
    const step = p[ni];
    setPi(ni);
    if (step.t === 'foe') {
      setHere(step);
      setBs({ ...cur, foe: newFoe(step.foe, maxHpOf(step.foe)) });
    } else {
      setHere(step);
      setBs(cur);
    }
  };

  const next = () => {
    tap();
    void play('tap');
    setResult(null);
    setPicked(null);
    setView(null);
    setFx([]);
    if (S.hpOn && bs.hp <= 0) return finish('fail');
    if (S.total !== null && answered >= S.total) return finish('end');
    // 過去問道場の無料は1日 FREE_DAILY 問まで。使い切ったら終わりにして完全版を案内する
    if (mode.kind === 'practice' && practiceLeft(dataRef.current, todayKey()) <= 0) {
      finish('end');
      askFull(`今日の無料の${FREE_DAILY}問を解き終えました。明日また${FREE_DAILY}問解けます。完全版なら上限なしで、苦手な分野だけをまとめて解くこともできます。`, 'kakomon-limit');
      return;
    }
    // 問題が足りなくなったら足す
    if (qi + 1 >= queue.length) {
      const extra = mode.kind === 'floor' ? floorQuestions(dataRef.current, mode.field, mode.floor) : pickQuestions(dataRef.current, dungeonPool(dataRef.current), 10);
      setQueue((cur) => [...cur, ...extra]);
    }
    setQi((i) => i + 1);
    if (S.hpOn && (enemyDead || tileDone)) advance(bs);
  };

  /** 分かれ道で道を選ぶ */
  const choose = (tile: Tile) => {
    tap();
    void play('decide');
    if (TILE_INFO[tile].quiz) {
      const mimic = tile === 'chest' && Math.random() < 0.2;
      const foe = mimic ? MIMIC : tileFoe(tile);
      setHere({ t: 'tile', tile, foe, mimic });
      if (mimic) {
        setBs((b) => ({ ...b, foe: newFoe(MIMIC, 1) }));
        window.setTimeout(() => addFx({ kind: 'log', text: 'ミミックだった！ 正解すれば倒せる' }, 2000), 200);
      }
      return;
    }
    if (tile === 'merchant') {
      setHere({ t: 'rest', tile: 'merchant', heal: 0, bond: 0 });
      return;
    }
    const r = restTile(tile as 'spring' | 'camp', bs);
    setBs(r.s);
    if (r.bond) update((d) => ({ ...d, petBond: { ...d.petBond, [pet.id]: (d.petBond?.[pet.id] ?? 0) + r.bond } }));
    if (r.heal > 0) void play('heal');
    setHere({ t: 'rest', tile: tile as 'spring' | 'camp', heal: r.heal, bond: r.bond });
  };
  const buy = (id: ItemId) => {
    const n = merchantBuy(dataRef.current, id);
    if (!n) return toast(dataRef.current.coins < MERCHANT_PRICE ? `コインが足りません（あと${MERCHANT_PRICE - dataRef.current.coins}）` : `${ITEM_INFO[id].name}はもう${ITEM_MAX}個持っています`);
    update(() => n);
    void play('coin');
    toast(`${ITEM_INFO[id].name}を買った！`);
  };

  const fireSkill = () => {
    if (result || !asking || !S.hpOn) return;
    if (S.mod === 'quiet') return toast('静けさの階では相棒の技が使えません');
    const r = castSkill(bs, ctx, skill);
    if (!r) return toast(`あと${gaugeNeed(bond) - bs.gauge}問正解すると「${SKILL_INFO[skill].name}」が使えます`);
    setBs(r.s);
    void play('skill');
    setAnim({ pet: 'cast' });
    window.setTimeout(() => setAnim({}), 700);
    addFx({ kind: 'skill', text: SKILL_INFO[skill].name }, 1300);
    showEv(r.ev, 300);
  };
  const applyItem = (id: ItemId) => {
    const have = dataRef.current.items?.[id] ?? 0;
    const r = spendItem(bs, have, id);
    if (!r) return toast(have <= 0 ? `${ITEM_INFO[id].name}を持っていません` : 'いまは使っても効果がありません');
    setBs(r.s);
    update((d) => addItem(d, id, -1));
    setBag(false);
    void play('heal');
    showEv(r.ev, 100);
  };

  const quit = async () => {
    if (done) return;
    const body =
      mode.kind === 'practice'
        ? `ここでやめますか？ ${answered}問の正誤は記録されています。次は解いていない問題から始まります。`
        : mode.kind === 'review'
          ? '復習をやめますか？ ここまでの正誤は記録されています。'
          : 'ダンジョンを出ますか？ ここまでの正誤は記録されています。';
    if (answered > 0 && !(await confirm({ body, ok: 'やめる', cancel: 'つづける' }))) return;
    onExit();
    if (mode.kind === 'floor') go({ name: 'map', field: mode.field });
  };
  useBack(() => {
    if (termOpen) setTermOpen(null);
    else if (bag) setBag(false);
    else if (view !== null) setView(null);
    else void quit();
  });

  // スクロールせずに答える(問題を出している間だけ。見返し・分かれ道・休憩では外す)
  const asked = !!q && here.t !== 'branch' && here.t !== 'rest';
  const fitting = asked && !result && view === null;
  useQuestionFit(rootRef, asked, !fitting, `${q?.id}|${here.t}|${pi}`);

  if (!q) {
    return (
      <div className="battle">
        <div className="panel" style={{ margin: 20 }}>
          <p>出せる問題がありません。</p>
          <button className="btn" onClick={onExit}>
            もどる
          </button>
        </div>
      </div>
    );
  }

  const timeLeft = Math.max(0, tl - elapsed);
  const critLeft = Math.max(0, cw - elapsed);
  const ghostAt = data.ghost ? data.ghost.splits.filter((s) => s <= (result ? splits.current[splits.current.length - 1] ?? 0 : Date.now() - runStart.current)).length : 0;
  const counter = S.total ? `${Math.min(answered + (result ? 0 : 1), S.total)} / ${S.total}問` : `${Math.min(foesPassed + (here.t === 'foe' ? 1 : 0), totalFoes) || 1} / ${totalFoes}体`;
  const race = !S.hpOn;
  const heroAlt = hero.id !== 'hood';
  const traits = here.t === 'foe' ? traitsOf(enemy) : [];
  const move = here.t === 'foe' && enemy.boss ? BOSS_MOVE[enemy.key] : undefined;
  const fog = S.mod === 'fog' && here.t === 'foe';
  const need = gaugeNeed(bond);
  const st = bs.st;
  const statusIcons: { img: string; label: string }[] = [];
  if (st.poison > 0) statusIcons.push({ img: 'st_poison', label: `毒 あと${st.poison}問` });
  if (st.blind > 0) statusIcons.push({ img: 'st_blind', label: '目くらまし' });
  if (st.frost > 0) statusIcons.push({ img: 'st_frost', label: 'こおりの息' });
  if (st.guard) statusIcons.push({ img: 'st_guard', label: '守り' });
  if (st.power > 1) statusIcons.push({ img: 'item_potion', label: `次の正解 ${st.power}倍` });
  if (st.bless) statusIcons.push({ img: 'st_bless', label: '加護' });
  if (st.cardSure) statusIcons.push({ img: 'card_books', label: 'カード確定' });
  const itemsHave = ITEMS.reduce((s, id) => s + (data.items?.[id] ?? 0), 0);
  const nextLabel = S.hpOn && bs.hp <= 0 ? '結果へ' : S.total !== null && answered >= S.total ? '結果へ' : mode.kind === 'floor' && enemyDead && pi + 1 >= plan.length ? 'クリア！' : enemyDead || tileDone ? (bs.foe.escaped ? 'つぎへ ›' : 'つぎへすすむ ›') : 'つぎの問題へ ›';

  return (
    <div className="battle" ref={rootRef}>
      {soundOpen && (
        <div className="sheet-bg" onClick={() => setSoundOpen(false)}>
          <div className="sheet sound-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>音量</h2>
            <p className="muted small" style={{ marginTop: 0 }}>
              戦いは止まっています。変えた音量は、ほかの画面と次に開いた時にも残ります。
            </p>
            <SoundControls />
            <button className="btn gold" style={{ marginTop: 12 }} onClick={() => setSoundOpen(false)}>
              戦いにもどる
            </button>
          </div>
        </div>
      )}
      <div className={`stage ${race ? 'short' : ''} ${S.mod !== 'none' ? `mod-${S.mod}` : ''} ${traits.length || move ? 'has-traits' : ''}`} style={{ backgroundImage: `url(${S.stage})` }}>
        <div className="stage-top">
          <div className="place">
            <span className="place-t">{S.title}</span>
            <small>
              <span className="place-s">{S.sub}</span>
              <span className="nowrap">{mode.kind === 'ghost' || mode.kind === 'practice' || mode.kind === 'review' ? '' : ` ・ ${counter}`}</span>
            </small>
          </div>
          <div className="mod-chips">
            <button className="mod-chip snd" onClick={() => setSoundOpen(true)} aria-label="音量">
              <SpeakerIcon off={!data.bgm && !data.sound} />
            </button>
            {(S.mod !== 'none' || S.ev) && (
              <>
              {S.mod !== 'none' && (
                <button className="mod-chip" onClick={() => toast(`${FLOOR_MOD_INFO[S.mod as Exclude<FloorMod, 'none'>].name}: ${FLOOR_MOD_INFO[S.mod as Exclude<FloorMod, 'none'>].note}`)}>
                  <img src={art(`mod_${S.mod}`)} alt="" />
                  {FLOOR_MOD_INFO[S.mod as Exclude<FloorMod, 'none'>].name}
                </button>
              )}
              {S.ev && (
                <button className="mod-chip day" onClick={() => toast(`${DAY_EVENT_INFO[S.ev!].name}: ${DAY_EVENT_INFO[S.ev!].note}`)}>
                  <img src={art(DAY_EVENT_INFO[S.ev].img)} alt="" />
                  {DAY_EVENT_INFO[S.ev].name}
                </button>
              )}
              </>
            )}
          </div>
          <button className="pause" onClick={() => void quit()} aria-label="中断">
            ❚❚
          </button>
        </div>

        {mode.kind === 'ghost' ? (
          <div className="race two">
            <div>
              <span>あなた {answered}/10</span>
              <div className="bar">
                <i style={{ width: `${answered * 10}%` }} />
              </div>
            </div>
            <div>
              <span>ゴースト {data.ghost ? `${Math.min(ghostAt, 10)}/10` : '記録なし'}</span>
              <div className="bar gh">
                <i style={{ width: `${Math.min(ghostAt, 10) * 10}%` }} />
              </div>
            </div>
          </div>
        ) : race ? (
          <div className="race">
            <div>
              <span className="row" style={{ gap: 6 }}>
                <span className="grow">
                  {Math.min(answered + (result ? 0 : 1), S.total ?? 0)} / {S.total}問目
                </span>
                <span>正解 {correct}</span>
              </span>
              <div className="bar">
                <i style={{ width: `${(answered / Math.max(1, S.total ?? 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        ) : here.t === 'foe' || (here.t === 'tile' && here.mimic) ? (
          <div className="enemy-box">
            <div className="nm">
              <span className="nm-t">{enemy.name}</span>
              <span className="nowrap">{enemy.boss ? '中ボス' : here.t === 'tile' ? '宝箱の怪物' : `Lv.${lv + (mode.kind === 'floor' ? mode.floor : 2)}`}</span>
            </div>
            <div className="hpbar">
              <i style={{ width: fog ? '100%' : `${(bs.foe.hp / bs.foe.max) * 100}%`, opacity: fog ? 0.35 : 1 }} />
              <b>{fog ? '？？？' : `${bs.foe.hp}/${bs.foe.max}`}</b>
            </div>
            {(traits.length > 0 || move) && (
              <div className="traits">
                {traits.map((t) => (
                  <button key={t} className={`trait t-${t}`} onClick={() => toast(`${TRAIT_INFO[t].name}: ${TRAIT_INFO[t].note}`)}>
                    {TRAIT_INFO[t].name}
                  </button>
                ))}
                {move && (
                  <button className="trait t-boss" onClick={() => toast(`${BOSS_MOVE_INFO[move].name}: ${BOSS_MOVE_INFO[move].note}。3問ごとに力をため、ため中に正解するとカウンター、まちがえると大ダメージ。HP が半分を切ると本気になる`)}>
                    {BOSS_MOVE_INFO[move].name}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="enemy-box">
            <div className="nm tile-nm">
              <span>{here.t === 'branch' ? '分かれ道' : TILE_INFO[here.t === 'tile' ? here.tile : here.tile].name}</span>
            </div>
          </div>
        )}

        <div className="enemy-zone">
          <img
            key={`${pi}-${enemy.key}`}
            className={`enemy ${enemy.boss ? 'boss' : ''} ${here.t !== 'foe' ? 'tile' : ''} ${anim.enemy ?? ''} ${enemyDead ? 'dead' : ''} ${mode.kind === 'ghost' ? 'ghost' : ''} ${bs.foe.charging && fight ? 'charging' : ''} ${bs.foe.stance && fight ? 'stance' : ''} ${bs.foe.enraged && fight ? 'enraged' : ''}`}
            src={enemy.img}
            alt={enemy.name}
          />
        </div>
        {fight && S.hpOn && (bs.foe.charging || bs.foe.stance) && !bs.foe.gone && (
          <div className={`foe-tag ${bs.foe.charging ? 'charge' : 'stance'}`}>{bs.foe.charging ? '力をためている！' : '鉄壁のかまえ'}</div>
        )}
        <img className={`hero ${heroAlt ? 'alt' : ''} ${anim.hero ?? ''}`} src={hero.battle} alt="" />
        <img className={`pet ${anim.pet ?? ''}`} src={pet.battle} alt="" />

        {S.hpOn && (
          <div className="me-hud">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>Lv.{lv}</span>
              <span className="st-icons">
                {statusIcons.map((x) => (
                  <img key={x.img} src={art(x.img)} alt={x.label} title={x.label} />
                ))}
              </span>
              <span>HP</span>
            </div>
            <div className="hpbar me">
              <i style={{ width: `${(bs.hp / bs.maxHp) * 100}%` }} />
              <b>
                {bs.hp}/{bs.maxHp}
              </b>
            </div>
          </div>
        )}

        {bs.combo > 1 && (
          <div className="combo" key={bs.combo}>
            <img src={art('flame')} alt="" />
            <span>
              <b>{bs.combo}</b> コンボ
            </span>
          </div>
        )}

        {intro && (
          <div className="intro-banner" onClick={() => setIntro(false)}>
            {S.mod !== 'none' && (
              <div>
                <b>{FLOOR_MOD_INFO[S.mod as Exclude<FloorMod, 'none'>].name}</b>
                <span>{FLOOR_MOD_INFO[S.mod as Exclude<FloorMod, 'none'>].note}</span>
              </div>
            )}
            {S.ev && (
              <div>
                <b>きょうは{DAY_EVENT_INFO[S.ev].name}</b>
                <span>{DAY_EVENT_INFO[S.ev].note}</span>
              </div>
            )}
          </div>
        )}

        {fx.map((f) => {
          if (f.kind === 'seikai')
            return (
              <div key={f.id} className="fx-text">
                せいかい！
                <small className={f.text === 'クリティカル！' ? 'crit' : ''}>{f.text}</small>
              </div>
            );
          if (f.kind === 'oshii')
            return (
              <div key={f.id} className="fx-text ng">
                おしい！
              </div>
            );
          if (f.kind === 'combo10')
            return (
              <div key={f.id} className="fx-text combo10">
                {bs.combo}コンボ！
              </div>
            );
          if (f.kind === 'flash') return <div key={f.id} className="flash" />;
          if (f.kind === 'dmg') return <div key={f.id} className="dmg">-{f.text}</div>;
          if (f.kind === 'medmg')
            return (
              <div key={f.id} className="dmg me">
                -{f.text}
              </div>
            );
          if (f.kind === 'heal')
            return (
              <div key={f.id} className="dmg me heal">
                +{f.text}
              </div>
            );
          if (f.kind === 'fheal')
            return (
              <div key={f.id} className="dmg heal">
                +{f.text}
              </div>
            );
          if (f.kind === 'skill')
            return (
              <div key={f.id} className="skill-fx">
                <img src={pet.img} alt="" />
                <b>{f.text}</b>
              </div>
            );
          if (f.kind === 'log')
            return (
              <div key={f.id} className="glog">
                {f.text}
              </div>
            );
          return null;
        })}
      </div>

      <div className={`qpanel${fitting ? ' fitting' : ''}`} ref={panel}>
        {guide && !done && (
          <div className="guide-tip" role="note">
            <img src={art('owl_teacher')} alt="" />
            <span>
              {result
                ? result.ok
                  ? '正解で攻撃が当たった! 解説を読んだら、いちばん下のボタンで次へ進もう。'
                  : 'まちがえると反撃でHPが減るよ。解説を読んで、いちばん下のボタンで次へ。この問題は「苦手」に入ります。'
                : '下の4つから、正しいと思う答えを押そう。正解すると攻撃! 早く答えるとクリティカル。'}
            </span>
          </div>
        )}
        {here.t === 'branch' ? (
          <BranchPick opts={here.opts} onPick={choose} />
        ) : here.t === 'rest' ? (
          <RestView
            here={here}
            coins={data.coins}
            items={data.items ?? {}}
            hp={bs.hp}
            maxHp={bs.maxHp}
            petName={pet.name}
            onBuy={buy}
            onGo={() => {
              tap();
              advance(bs);
            }}
          />
        ) : view !== null && hist[view] ? (
          <ReviewPast
            item={hist[view]}
            steps={stepsBack(view, hist.length, !!result)}
            canBack={view > 0}
            timerRuns={!result && S.timer}
            onBack={() => {
              tap();
              setView(lookBack(view, hist.length, !!result));
            }}
            onForward={() => {
              tap();
              setView(lookForward(view, hist.length, !!result));
            }}
            onNow={() => {
              tap();
              setView(null);
            }}
            onTerm={setTermOpen}
          />
        ) : (
          <>
            {(lookBack(null, hist.length, !!result) !== null || S.hpOn) && (
              <div className="look-row">
                {lookBack(null, hist.length, !!result) !== null && (
                  <button
                    className="look-btn"
                    onClick={() => {
                      tap();
                      setView(lookBack(null, hist.length, !!result));
                    }}
                    aria-label="前の問題を見返す"
                  >
                    {S.hpOn ? '‹ 前の問題' : '‹ 前の問題を見る'}
                  </button>
                )}
                {S.hpOn && (
                  <span className="tools">
                    <button className={`skill-btn ${bs.gauge >= need && S.mod !== 'quiet' ? 'ready' : ''} ${S.mod === 'quiet' ? 'off' : ''}`} onClick={fireSkill} disabled={!!result} aria-label={`相棒の技 ${SKILL_INFO[skill].name}`}>
                      <img src={pet.img} alt="" />
                      <span className="gauge">
                        <i style={{ width: `${(Math.min(bs.gauge, need) / need) * 100}%` }} />
                      </span>
                      <span className="lbl">{bs.gauge >= need && S.mod !== 'quiet' ? '技！' : `技 ${Math.min(bs.gauge, need)}/${need}`}</span>
                    </button>
                    <button className="bag-btn" onClick={() => (result ? undefined : setBag(true))} disabled={!!result} aria-label="どうぐ">
                      <img src={art('item_herb')} alt="" />
                      <span className="lbl">どうぐ{itemsHave > 0 ? ` ${itemsHave}` : ''}</span>
                    </button>
                  </span>
                )}
              </div>
            )}
            {here.t === 'tile' && !here.mimic && (
              <div className="tile-head">
                <img src={art(TILE_INFO[here.tile].img)} alt="" />
                <div>
                  <b>{TILE_INFO[here.tile].name}</b>
                  <span>{TILE_INFO[here.tile].note}</span>
                </div>
              </div>
            )}
            <QHead q={q} />
            <div className="qscroll">
              <QBody q={q} />
            </div>
            {!result && S.timer && (
              <div className="timer">
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="10" cy="11" r="7.5" fill="#fff" stroke="#2a3a62" strokeWidth="2" />
                  <path d="M10 11V6.5M8 2h4" stroke="#2a3a62" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div className="bar">
                  <i className={critLeft > 0 ? '' : 'late'} style={{ width: `${(timeLeft / tl) * 100}%` }} />
                </div>
                {bs.st.sure ? <span className="crit">正解でクリティカル</span> : critLeft > 0 ? <span className="crit">クリティカル {Math.ceil(critLeft)}秒</span> : <span>のこり {Math.ceil(timeLeft)}秒</span>}
              </div>
            )}
            <Choices q={q} picked={picked} reveal={!!result} onPick={answer} />
            {result && (
              <>
                <Explain q={q} ok={result.ok} picked={picked} weakAdded={result.weakAdded} onTerm={setTermOpen} />
                <div className="next-dock">
                  <button className="btn" onClick={next}>
                    {nextLabel}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      {bag && <Bag items={data.items ?? {}} onUse={applyItem} onClose={() => setBag(false)} />}
      {termOpen && <TermPop id={termOpen} owned={data.cards[termOpen]} onClose={() => setTermOpen(null)} />}
    </div>
  );
}

/** 分かれ道: 2つの道から選ぶ */
function BranchPick({ opts, onPick }: { opts: [Tile, Tile]; onPick: (t: Tile) => void }) {
  return (
    <div className="branch">
      <div className="branch-h">
        <img src={art('tile_branch')} alt="" />
        <div>
          <b>分かれ道</b>
          <span>どちらの道へ進む？</span>
        </div>
      </div>
      <div className="branch-opts">
        {opts.map((t) => (
          <button key={t} className="branch-card" onClick={() => onPick(t)}>
            <img src={art(TILE_INFO[t].img)} alt="" />
            <b>{TILE_INFO[t].name}</b>
            <span>{TILE_INFO[t].note}</span>
            {TILE_INFO[t].quiz && <em>1問</em>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 問題の無いマス(泉・たき火・行商ネコ) */
function RestView({
  here,
  coins,
  items,
  hp,
  maxHp,
  petName,
  onBuy,
  onGo,
}: {
  here: Extract<Here, { t: 'rest' }>;
  coins: number;
  items: Partial<Record<ItemId, number>>;
  hp: number;
  maxHp: number;
  petName: string;
  onBuy: (id: ItemId) => void;
  onGo: () => void;
}) {
  const info = TILE_INFO[here.tile];
  return (
    <div className="rest">
      <div className="tile-head">
        <img src={art(info.img)} alt="" />
        <div>
          <b>{info.name}</b>
          <span>
            {here.tile === 'spring'
              ? here.heal > 0
                ? `泉の水で HP が ${here.heal} 回復した！（${hp}/${maxHp}）`
                : 'HP はもう満タン。泉の水がきらきらしている'
              : here.tile === 'camp'
                ? `たき火でひとやすみ。${here.heal > 0 ? `HP が ${here.heal} 回復して、` : ''}${petName}となかよくなった！`
                : `「いらっしゃい。どれも ${MERCHANT_PRICE} コインだよ」（持っているコイン ${coins}）`}
          </span>
        </div>
      </div>
      {here.tile === 'merchant' && (
        <div className="shop-items">
          {ITEMS.map((id) => (
            <button key={id} className="shop-item" onClick={() => onBuy(id)} disabled={(items[id] ?? 0) >= ITEM_MAX}>
              <img src={art(ITEM_INFO[id].img)} alt="" />
              <b>{ITEM_INFO[id].name}</b>
              <span>{ITEM_INFO[id].note}</span>
              <em>
                <img src={art('coin')} alt="" /> {MERCHANT_PRICE}　持っている {items[id] ?? 0}/{ITEM_MAX}
              </em>
            </button>
          ))}
        </div>
      )}
      <div className="next-dock">
        <button className="btn" onClick={onGo}>
          先へすすむ ›
        </button>
      </div>
    </div>
  );
}

/** どうぐぶくろ */
function Bag({ items, onUse, onClose }: { items: Partial<Record<ItemId, number>>; onUse: (id: ItemId) => void; onClose: () => void }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet bag" role="dialog" aria-label="どうぐ" onClick={(e) => e.stopPropagation()}>
        <h2>どうぐ</h2>
        <p className="small muted" style={{ margin: '0 0 8px' }}>
          答える前に使えます。宝箱・行商ネコ・敵から手に入ります（各{ITEM_MAX}個まで）
        </p>
        {ITEMS.map((id) => (
          <div key={id} className="bag-row">
            <img src={art(ITEM_INFO[id].img)} alt="" />
            <div className="grow">
              <b>
                {ITEM_INFO[id].name} <small>×{items[id] ?? 0}</small>
              </b>
              <span className="small muted">{ITEM_INFO[id].note}</span>
            </div>
            <button className="btn sm" style={{ width: 72 }} disabled={(items[id] ?? 0) <= 0} onClick={() => onUse(id)}>
              使う
            </button>
          </div>
        ))}
        <button className="btn paper sm" style={{ marginTop: 10 }} onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}

/** 答えた問題の見返し。選択肢は押せず、自分の答え・正解・解説だけを出す */
function ReviewPast({
  item,
  steps,
  canBack,
  timerRuns,
  onBack,
  onForward,
  onNow,
  onTerm,
}: {
  item: Answered;
  steps: number;
  canBack: boolean;
  timerRuns: boolean;
  onBack: () => void;
  onForward: () => void;
  onNow: () => void;
  onTerm: (id: string) => void;
}) {
  return (
    <div className="review-past">
      <div className="look-bar">
        <button className="look-btn" onClick={onBack} disabled={!canBack} aria-label="さらに前の問題">
          ‹ 前
        </button>
        <div className="look-t">
          <b>{steps}問前</b>を見返し中
          <small>答えは変えられません</small>
          {timerRuns && <small>見返している間は時間が止まります</small>}
        </div>
        <button className="look-btn" onClick={onForward} aria-label={steps > 1 ? '次の問題' : 'いまの問題へ'}>
          {steps > 1 ? '次 ›' : 'いま ›'}
        </button>
      </div>
      <QHead q={item.q} />
      <QBody q={item.q} />
      <div className={`look-mine ${item.ok ? 'ok' : 'ng'}`}>
        あなたの答え {['ア', 'イ', 'ウ', 'エ'][item.picked]}
        <span>{item.ok ? '○ 正解' : '× 不正解'}</span>
      </div>
      <Choices q={item.q} picked={item.picked} reveal onPick={() => undefined} disabled />
      <Explain q={item.q} ok={item.ok} picked={item.picked} onTerm={onTerm} />
      <div className="next-dock">
        <button className="btn" onClick={onNow}>
          いまの問題へもどる ›
        </button>
      </div>
    </div>
  );
}

/** 解説の下の用語カードを押した時の小さな窓。持っていないカードは説明を伏せる(図鑑と同じ) */
function TermPop({ id, owned, onClose }: { id: string; owned?: 1 | 2; onClose: () => void }) {
  const t = TERM_BY_ID.get(id);
  if (!t) return null;
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet term-pop" role="dialog" aria-label={t.name} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <img src={CARD_ART[t.art]} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flex: 'none' }} />
          <div className="grow">
            <div className="row" style={{ gap: 6 }}>
              <span className={`chip ${t.field}`}>{FIELD_LABEL[t.field]}</span>
              {owned && <span className="chip gray">{owned === 2 ? '金のカード' : '銀のカード'}</span>}
            </div>
            <h2 style={{ margin: '6px 0 0' }}>{t.name}</h2>
            {t.full && <div className="small" style={{ fontWeight: 700 }}>{t.full}</div>}
          </div>
        </div>
        <p style={{ margin: '10px 0 0', lineHeight: 1.8 }}>{owned ? t.desc : 'このカードはまだ持っていません。敵を倒すと落とすことがあります。手に入れると、ここで用語の説明が読めます。'}</p>
        <button className="btn paper sm" style={{ marginTop: 12 }} onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}

function SpeakerIcon({ off }: { off: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff" />
      {off ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13" />}
    </svg>
  );
}
