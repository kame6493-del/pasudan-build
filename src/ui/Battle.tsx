import { useEffect, useMemo, useRef, useState } from 'react';
import { Q_BY_ID, TERM_BY_ID, TERMS, TERMS_OF_Q, todayKey } from '../domain/data';
import {
  availableFields,
  chestKind,
  critWindow,
  damage,
  dailyQuestions,
  day,
  enemyHit,
  enemyHp,
  floorQuestions,
  heroHp,
  levelOf,
  liveStreak,
  dungeonPool,
  pickQuestions,
  recordAnswer,
  timeLimit,
} from '../domain/game';
import type { AppData, Question } from '../domain/types';
import { art, DUNGEONS, FIELD_LABEL, GHOST, HEROES, PETS, WEAK_SHADOW, type Enemy } from '../domain/world';
import { tap, thud } from '../platform/native';
import { bgm, play } from '../platform/sound';
import { useBack } from './back';
import { CARD_ART, Choices, Explain, QBody, QHead } from './QuestionView';
import { useStore, type BattleMode, type Reward } from './store';

interface Setup {
  title: string;
  sub: string;
  stage: string;
  questions: Question[];
  enemies: Enemy[];
  hpOn: boolean;
  /** 早押しのタイマーを出すか(過去問・復習は落ち着いて解けるように出さない) */
  timer: boolean;
  total: number | null; // 決まった問題数（null=敵を倒すまで）
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function setup(d: AppData, m: BattleMode): Setup {
  if (m.kind === 'floor') {
    const dn = DUNGEONS[m.field];
    const normals = Array.from({ length: 5 }, () => pick(dn.enemies));
    return { title: dn.name, sub: `第${m.floor + 1}階 ${dn.floors[m.floor]}`, stage: dn.stage, questions: floorQuestions(d, m.field, m.floor), enemies: [...normals, dn.boss], hpOn: true, timer: true, total: null };
  }
  if (m.kind === 'daily') {
    const fields = availableFields(d);
    const qs = dailyQuestions(d);
    const enemies = Array.from({ length: 5 }, (_, i) => (i === 4 ? DUNGEONS[pick(fields)].boss : pick(DUNGEONS[pick(fields)].enemies)));
    return { title: '今日のダンジョン', sub: '10問', stage: DUNGEONS[pick(fields)].stage, questions: qs, enemies, hpOn: true, timer: true, total: 10 };
  }
  if (m.kind === 'ghost') {
    return { title: 'ゴースト対戦', sub: '過去のベストと競争', stage: art('bg_tower_b'), questions: pickQuestions(d, dungeonPool(d), 10), enemies: [GHOST], hpOn: false, timer: true, total: 10 };
  }
  if (m.kind === 'practice') {
    const qs = m.ids.map((id) => Q_BY_ID.get(id)!).filter(Boolean);
    const f = qs[0]?.field ?? 'strategy';
    return { title: m.title, sub: m.sub, stage: DUNGEONS[f].stage, questions: qs, enemies: [OWL], hpOn: false, timer: false, total: qs.length };
  }
  // review
  const qs = m.kind === 'review' ? m.ids.map((id) => Q_BY_ID.get(id)!).filter(Boolean) : [];
  return { title: '復習の部屋', sub: m.kind === 'review' ? m.title : '', stage: art('bg_forest_b'), questions: qs, enemies: [WEAK_SHADOW], hpOn: false, timer: false, total: qs.length };
}

const OWL: Enemy = { key: 'owl_teacher', name: 'フクロウ先生', img: art('owl_teacher') };

interface Fx {
  id: number;
  kind: 'seikai' | 'oshii' | 'crit' | 'combo10' | 'dmg' | 'medmg' | 'flash';
  text?: string;
}

export function Battle({ mode, onExit }: { mode: BattleMode; onExit: () => void }) {
  const { data, update, pushRewards, go, toast, confirm } = useStore();
  const [termOpen, setTermOpen] = useState<string | null>(null);
  const S = useMemo(() => setup(data, mode), []); // eslint-disable-line react-hooks/exhaustive-deps
  const startLv = useRef(levelOf(data.xp).lv);
  const lv = levelOf(data.xp).lv;
  const hero = HEROES.find((h) => h.id === data.hero) ?? HEROES[0];
  const pet = PETS.find((p) => p.id === data.pet) ?? PETS[0];

  const [qi, setQi] = useState(0);
  const [queue, setQueue] = useState<Question[]>(S.questions);
  const [ei, setEi] = useState(0);
  const maxHpOf = (i: number) => enemyHp(lv, !!S.enemies[i]?.boss, mode.kind === 'floor' ? mode.floor : 3);
  const [eHp, setEHp] = useState(() => (S.total && mode.kind !== 'floor' && mode.kind !== 'daily' ? S.total : maxHpOf(0)));
  const [eMax, setEMax] = useState(eHp);
  const [hp, setHp] = useState(heroHp(lv));
  const [combo, setCombo] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<{ ok: boolean; crit: boolean; weakAdded: boolean } | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [anim, setAnim] = useState<{ enemy?: string; hero?: string }>({});
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<null | 'clear' | 'fail' | 'end'>(null);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const startAt = useRef(Date.now());
  const panel = useRef<HTMLDivElement>(null);
  const runStart = useRef(Date.now());
  const splits = useRef<number[]>([]);
  const gained = useRef({ coins: 0, xp: 0, cards: [] as string[], evolved: [] as string[], seen: [] as string[] });
  const fxId = useRef(0);
  const enemyDead = eHp <= 0 && S.hpOn;
  const dataRef = useRef(data);
  dataRef.current = data;

  const q = queue[qi];
  const enemy = S.enemies[Math.min(ei, S.enemies.length - 1)];
  const cw = q ? critWindow(q) : 10;
  const tl = q ? timeLimit(q) : 40;

  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [qi]);

  // ボス(中ボス)の間だけ曲を変える
  const bossNow = !!enemy?.boss && S.hpOn;
  useEffect(() => {
    bgm(bossNow ? 'boss' : 'battle');
  }, [bossNow]);

  useEffect(() => {
    if (!result) return;
    // 答えたら解説が見えるところまで送る（まちがえた時は少し早く）
    const t = window.setTimeout(() => panel.current?.querySelector('.explain')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), result.ok ? 900 : 650);
    return () => window.clearTimeout(t);
  }, [result]);

  useEffect(() => {
    if (result || done) return;
    startAt.current = Date.now();
    setElapsed(0);
    const t = window.setInterval(() => setElapsed((Date.now() - startAt.current) / 1000), 200);
    return () => window.clearInterval(t);
  }, [qi, result, done]);

  const addFx = (f: Omit<Fx, 'id'>, ms = 1100) => {
    const id = ++fxId.current;
    setFx((cur) => [...cur, { ...f, id }]);
    window.setTimeout(() => setFx((cur) => cur.filter((x) => x.id !== id)), ms);
  };

  const answer = (i: number) => {
    if (result || !q) return;
    const ok = i === q.answer;
    const crit = ok && S.timer && elapsed <= cw;
    const newCombo = ok ? combo + 1 : 0;
    setPicked(i);
    setAnswered((n) => n + 1);
    splits.current.push(Date.now() - runStart.current);
    gained.current.seen.push(q.id);

    const weakAdded = !ok && !(q.id in dataRef.current.weak);
    update((d) => {
      const eff = recordAnswer(d, q, ok, { counted: false, daily: mode.kind === 'daily', combo: newCombo });
      gained.current.evolved.push(...eff.evolved);
      return ok ? { ...eff.data, xp: eff.data.xp + 3 } : eff.data;
    });
    if (ok) gained.current.xp += 3;

    if (ok) {
      setCorrect((n) => n + 1);
      setCombo(newCombo);
      tap();
      void play('slash');
      window.setTimeout(() => void play(crit ? 'crit' : 'hit'), 140);
      setAnim({ hero: 'atk', enemy: 'hit' });
      addFx({ kind: 'seikai', text: crit ? 'クリティカル！' : newCombo > 1 ? `${newCombo}コンボ` : 'ナイス' }, 1150);
      if (newCombo > 0 && newCombo % 10 === 0) {
        addFx({ kind: 'combo10' }, 1300);
        addFx({ kind: 'flash' }, 800);
        void play('combo');
      }
      if (S.hpOn) {
        const dmg = damage(lv, newCombo, crit);
        addFx({ kind: 'dmg', text: String(dmg) }, 1000);
        const left = Math.max(0, eHp - dmg);
        setEHp(left);
        if (left <= 0) defeat();
      }
    } else {
      setCombo(0);
      thud();
      void play('wrong');
      setAnim({ enemy: 'attack', hero: 'hurt' });
      addFx({ kind: 'oshii' }, 1150);
      if (S.hpOn) {
        const dmg = enemyHit(lv, !!enemy.boss);
        window.setTimeout(() => void play('damage'), 200);
        addFx({ kind: 'medmg', text: String(dmg) }, 900);
        setHp((h) => Math.max(0, h - dmg));
      }
    }
    window.setTimeout(() => setAnim({}), 450);
    setResult({ ok, crit, weakAdded });
  };

  const defeat = () => {
    const boss = !!enemy.boss;
    const coins = boss ? 25 : 6;
    const xp = boss ? 30 : 8;
    gained.current.coins += coins;
    gained.current.xp += xp;
    window.setTimeout(() => void play('defeat'), 350);
    // 用語カードを落とす（ボスは必ず）
    let card: string | null = null;
    if (boss || Math.random() < 0.4) {
      const own = (id: string) => data.cards[id] || gained.current.cards.includes(id);
      const near = gained.current.seen.flatMap((id) => TERMS_OF_Q.get(id) ?? []).filter((t) => !own(t));
      const fields = availableFields(data);
      const any = TERMS.filter((t) => fields.includes(t.field) && !own(t.id)).map((t) => t.id);
      card = near.length ? pick(near) : any.length ? pick(any) : null;
    }
    if (card) gained.current.cards.push(card);
    update((d) => ({ ...d, coins: d.coins + coins, xp: d.xp + xp, cards: card ? { ...d.cards, [card]: 1 } : d.cards }));
    if (card) {
      const t = TERMS.find((x) => x.id === card);
      window.setTimeout(() => toast(`用語カード「${t?.name}」をゲット！`), 600);
    }
  };

  const finish = (kind: 'clear' | 'fail' | 'end') => {
    setDone(kind);
    const rewards: Reward[] = [];
    const g = gained.current;
    if (kind === 'fail') {
      void play('fail');
      rewards.push({ kind: 'fail', title: `${S.sub}で力つきた…` });
    }
    if (kind === 'clear' && mode.kind === 'floor') {
      const bonus = 40 + mode.floor * 5;
      update((d) => ({ ...d, coins: d.coins + bonus, xp: d.xp + 20, cleared: { ...d.cleared, [mode.field]: Math.max(d.cleared[mode.field], mode.floor + 1) } }));
      rewards.push({ kind: 'clear', title: `${S.sub} クリア！`, coins: g.coins + bonus, xp: g.xp + 20, cards: g.cards });
      g.xp += 20;
    }
    if (mode.kind === 'daily' && kind === 'end') {
      const first = !day(data).chest;
      if (first) {
        const ck = chestKind(Math.max(1, liveStreak(data)));
        const fields = availableFields(data);
        const unowned = TERMS.filter((t) => fields.includes(t.field) && !data.cards[t.id] && !g.cards.includes(t.id));
        const card = unowned.length ? pick(unowned).id : null;
        update((d) => {
          const key = todayKey();
          return { ...d, coins: d.coins + ck.coins, xp: d.xp + ck.xp, cards: card ? { ...d.cards, [card]: 1 } : d.cards, days: { ...d.days, [key]: { ...d.days[key], chest: true } } };
        });
        g.xp += ck.xp;
        // g.xp には宝箱の分が入っているので、ここで足さない
        rewards.push({ kind: 'chest', img: ck.img, name: ck.name, coins: ck.coins + g.coins, xp: g.xp, cards: card ? [...g.cards, card] : g.cards });
      } else rewards.push({ kind: 'clear', title: '今日のダンジョン クリア！', coins: g.coins, xp: g.xp, cards: g.cards });
    }
    if (mode.kind === 'ghost' && kind === 'end') {
      const run = { correct, splits: [...splits.current] };
      const best = data.ghost;
      const win = !best || run.correct > best.correct || (run.correct === best.correct && run.splits[run.splits.length - 1] < best.splits[best.splits.length - 1]);
      if (win) update((d) => ({ ...d, ghost: run, coins: d.coins + 30 }));
      rewards.push({ kind: 'clear', title: win ? 'ゴーストに勝った！ 記録を更新' : 'ゴーストの勝ち… もう一度！', coins: win ? 30 : 0, xp: g.xp, cards: [] });
    }
    if (mode.kind === 'review' && kind === 'end') {
      rewards.push({ kind: 'clear', title: `復習おわり！ ${correct}/${answered}問 正解`, coins: 0, xp: g.xp, cards: [] });
    }
    if (mode.kind === 'practice' && kind === 'end') {
      rewards.push({ kind: 'clear', title: `${S.sub} ${answered}問おわり！ 正解 ${correct}問`, coins: 0, xp: g.xp, cards: [] });
    }
    // レベルアップ・カード進化は記録を反映した後で数える
    window.setTimeout(() => {
      const nowLv = levelOf(dataRef.current.xp).lv;
      const extra: Reward[] = [];
      if (nowLv > startLv.current) extra.push({ kind: 'levelup', from: startLv.current, to: nowLv });
      for (const t of new Set(g.evolved)) extra.push({ kind: 'evolve', term: t });
      pushRewards([...rewards, ...extra]);
      onExit();
    }, 50);
  };

  const next = () => {
    tap();
    void play('tap');
    setResult(null);
    setPicked(null);
    setFx([]);
    if (S.hpOn && hp <= 0) return finish('fail');
    let nextEi = ei;
    if (S.hpOn && enemyDead) {
      nextEi = ei + 1;
      if (mode.kind === 'floor' && nextEi >= S.enemies.length) return finish('clear');
      const ni = Math.min(nextEi, S.enemies.length - 1);
      const m = maxHpOf(ni);
      setEi(nextEi);
      setEHp(m);
      setEMax(m);
    }
    if (S.total !== null && answered >= S.total) return finish('end');
    // 問題が足りなくなったら足す
    if (qi + 1 >= queue.length) {
      const extra = mode.kind === 'floor' ? floorQuestions(dataRef.current, mode.field, mode.floor) : pickQuestions(dataRef.current, dungeonPool(dataRef.current), 10);
      setQueue((cur) => [...cur, ...extra]);
    }
    setQi((i) => i + 1);
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
    else void quit();
  });

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
  const counter = S.total ? `${Math.min(answered + (result ? 0 : 1), S.total)} / ${S.total}問` : `${Math.min(ei + 1, S.enemies.length)} / ${S.enemies.length}体`;
  const race = !S.hpOn;
  const heroAlt = hero.id !== 'hood';

  return (
    <div className="battle">
      <div className={`stage ${race ? 'short' : ''}`} style={{ backgroundImage: `url(${S.stage})` }}>
        <div className="stage-top">
          <div className="place">
            <span className="place-t">{S.title}</span>
            <small>
              <span className="place-s">{S.sub}</span>
              <span className="nowrap">{mode.kind === 'ghost' || mode.kind === 'practice' || mode.kind === 'review' ? '' : ` ・ ${counter}`}</span>
            </small>
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
        ) : (
          <div className="enemy-box">
            <div className="nm">
              <span>{enemy.name}</span>
              <span>{enemy.boss ? '中ボス' : `Lv.${lv + (mode.kind === 'floor' ? mode.floor : 2)}`}</span>
            </div>
            <div className="hpbar">
              <i style={{ width: `${(eHp / eMax) * 100}%` }} />
              <b>
                {eHp}/{eMax}
              </b>
            </div>
          </div>
        )}

        <div className="enemy-zone">
          <img
            key={`${ei}-${enemy.key}`}
            className={`enemy ${enemy.boss ? 'boss' : ''} ${anim.enemy ?? ''} ${enemyDead ? 'dead' : ''} ${mode.kind === 'ghost' ? 'ghost' : ''}`}
            src={enemy.img}
            alt={enemy.name}
          />
        </div>
        <img className={`hero ${heroAlt ? 'alt' : ''} ${anim.hero ?? ''}`} src={hero.battle} alt="" />
        <img className="pet" src={pet.battle} alt="" />

        {S.hpOn && (
          <div className="me-hud">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>Lv.{lv}</span>
              <span>HP</span>
            </div>
            <div className="hpbar me">
              <i style={{ width: `${(hp / heroHp(lv)) * 100}%` }} />
              <b>
                {hp}/{heroHp(lv)}
              </b>
            </div>
          </div>
        )}

        {combo > 1 && (
          <div className="combo" key={combo}>
            <img src={art('flame')} alt="" />
            <span>
              <b>{combo}</b> コンボ
            </span>
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
                {combo}コンボ！
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
          return null;
        })}
      </div>

      <div className="qpanel" ref={panel}>
        <QHead q={q} />
        <QBody q={q} />
        {!result && S.timer && (
          <div className="timer">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="11" r="7.5" fill="#fff" stroke="#2a3a62" strokeWidth="2" />
              <path d="M10 11V6.5M8 2h4" stroke="#2a3a62" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="bar">
              <i className={critLeft > 0 ? '' : 'late'} style={{ width: `${(timeLeft / tl) * 100}%` }} />
            </div>
            {critLeft > 0 ? <span className="crit">クリティカル {Math.ceil(critLeft)}秒</span> : <span>のこり {Math.ceil(timeLeft)}秒</span>}
          </div>
        )}
        <Choices q={q} picked={picked} reveal={!!result} onPick={answer} />
        {result && (
          <>
            <Explain q={q} ok={result.ok} weakAdded={result.weakAdded} onTerm={setTermOpen} />
            <button className="btn" style={{ marginTop: 12 }} onClick={next}>
              {S.hpOn && hp <= 0 ? '結果へ' : S.total !== null && answered >= S.total ? '結果へ' : mode.kind === 'floor' && enemyDead && ei + 1 >= S.enemies.length ? 'クリア！' : enemyDead ? 'つぎの敵へ ›' : 'つぎの問題へ ›'}
            </button>
          </>
        )}
      </div>
      {termOpen && <TermPop id={termOpen} owned={data.cards[termOpen]} onClose={() => setTermOpen(null)} />}
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
