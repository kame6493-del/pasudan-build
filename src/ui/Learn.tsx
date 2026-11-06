/**
 * ゼロから学ぶ道(2026-11-04 持ち主「完全初心者から合格まで」「次どれ選べばいいか分かるように」)。
 * 学ぶの画面: いちばん上に「次はこれ」(NextUp)。押すだけで続きから。
 * 道すじ(CourseHome): すごろくのような一本の道。済んだ所は印、今の所は光る、まだの所は薄く。最後にまとめのテストと模擬試験。
 * 単元(UnitView): 説明 2〜4枚 → 用語カード → 確かめの問題 → ここが試験に出る → 次の単元へ。各画面に大きな「次へ」1つ。
 */
import { useEffect, useRef, useState } from 'react';
import { ABOUT, PATH, UNITS, unitById, type Fig, type Unit } from '../data/course';
import {
  courseDone,
  fieldCourse,
  fieldTest,
  nextUnit,
  passRoad,
  pathNo,
  studyDeck,
  testDone,
  unitCards,
  unitDone,
  unitOpen,
  unitQuiz,
  unitStep,
  FREE_DECK,
  TEST_N,
} from '../domain/course';
import { floorOpen, FREE_UNITS } from '../domain/game';
import type { Field, Term } from '../domain/types';
import { art, DUNGEONS, FIELDS, FIELD_LABEL } from '../domain/world';
import { play } from '../platform/sound';
import { Check, LockIcon } from './icons';
import { useStore } from './store';

const FIELD_ICON: Record<Field, string> = { strategy: art('book_strategy'), management: art('book_management'), technology: art('book_technology') };
const FIELD_TX: Record<Field, string> = { strategy: 'var(--s-tx)', management: 'var(--m-tx)', technology: 'var(--t-tx)' };

/** 単元の鍵の先の様子(購入画面に出す) */
function unitPreview(u: Unit) {
  return {
    title: `この先: ${FIELD_LABEL[u.field]}「${u.title}」`,
    imgs: [art('owl_teacher')],
    lines: [u.pages[0].p[0], `覚える用語: ${u.words.map((w) => w[0]).join('・')}`],
  };
}

const lockMsg = `ゼロから学ぶ道は、各分野の最初の${FREE_UNITS}単元まで無料です。完全版なら全${UNITS.length}単元と、分野ごとのまとめのテストまで進めます。`;

/** 単元を開く(鍵なら購入画面) */
function useOpenUnit() {
  const { data, go, askFull } = useStore();
  return (u: Unit) => {
    if (!unitOpen(data, u)) return askFull(lockMsg, 'course', unitPreview(u));
    void play('decide');
    go({ name: 'unit', id: u.id });
  };
}

/** 「次はこれ」の大きなボタン。学ぶの画面と道すじのいちばん上 */
export function NextUp({ tip = false }: { tip?: boolean }) {
  const { data, update, openExams } = useStore();
  const openUnit = useOpenUnit();
  const nu = nextUnit(data);
  // 初めての時だけ「ここを押せば始まります」の指さし(1回だけ)
  const [showTip] = useState(tip && !data.learnTip);
  useEffect(() => {
    if (showTip) update((d) => ({ ...d, learnTip: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!nu)
    return (
      <button className="panel next-up" onClick={openExams}>
        <span className="next-k">全{UNITS.length}単元クリア！</span>
        <b className="next-t">模擬試験で本番の力を試そう</b>
        <span className="btn gold next-go">模擬試験へ ›</span>
      </button>
    );
  const locked = !unitOpen(data, nu);
  const st = unitStep(data, nu);
  return (
    <div className={`next-wrap ${showTip ? 'has-tip' : ''}`}>
      <button className={`panel next-up ${locked ? 'locked' : ''}`} onClick={() => openUnit(nu)} aria-label={`次はこれ ${pathNo(nu)}/${UNITS.length} ${nu.title}`}>
        <span className="next-k">
          次はこれ
          <i>
            {pathNo(nu)}/{UNITS.length}
          </i>
        </span>
        <b className="next-t">{nu.title}</b>
        <span className="next-m">
          <span className="next-f" style={{ color: FIELD_TX[nu.field] }}>
            {FIELD_LABEL[nu.field]}
          </span>
          約{nu.mins}分{st > 0 && st < 3 ? `・${['', '説明を読んだ所から', 'カードを見た所から'][st]}` : ''}
        </span>
        <span className={`btn ${locked ? '' : 'gold'} next-go`}>
          {locked ? (
            <>
              <LockIcon size={16} /> 完全版で続きへ ›
            </>
          ) : st > 0 ? (
            'つづきから ›'
          ) : (
            'はじめる ›'
          )}
        </span>
      </button>
      {showTip && (
        <div className="next-tip" aria-hidden>
          <svg className="next-tip-hand" viewBox="0 0 24 24" width="30" height="30"><path d="M12 3 L20 13 H15 V21 H9 V13 H4 Z" /></svg>
          <span className="next-tip-b">ここを押せば始まります</span>
        </div>
      )}
    </div>
  );
}

/** 合格までの道(全体と分野ごと) */
export function PassRoad({ compact = false }: { compact?: boolean }) {
  const { data, go } = useStore();
  const pct = passRoad(data);
  return (
    <button className="panel pass-road" onClick={() => go({ name: 'course' })}>
      <span className="row" style={{ width: '100%' }}>
        <b className="grow">合格までの道</b>
        <b className="pass-pct">{pct}%</b>
      </span>
      <span className="bar gold" style={{ height: 14, width: '100%' }}>
        <i style={{ width: `${pct}%` }} />
      </span>
      {!compact &&
        FIELDS.map((x) => {
          const p = fieldCourse(data, x);
          return (
            <span key={x} className="learn-prog">
              <img src={FIELD_ICON[x]} alt="" />
              <span className="nowrap small pr-name">{FIELD_LABEL[x]}</span>
              <span className="bar grow" style={{ height: 10 }}>
                <i style={{ width: `${(p.done / p.total) * 100}%`, background: DUNGEONS[x].color }} />
              </span>
              <span className="small nowrap">
                {p.done}/{p.total}
              </span>
            </span>
          );
        })}
      {compact && <span className="small muted">道すじを見る ›</span>}
    </button>
  );
}

type RoadNode = { k: 'unit'; u: Unit } | { k: 'test'; f: Field } | { k: 'exam' };

/** すごろくのような一本の道 */
function Road({ nodes }: { nodes: RoadNode[] }) {
  const { data, startBattle, askFull, openExams } = useStore();
  const openUnit = useOpenUnit();
  const nu = nextUnit(data);
  const nowRef = useRef<HTMLButtonElement>(null);
  const ROW = 76;
  const xs = [14, 26, 38, 26];
  const pts = nodes.map((_, i) => `${xs[i % 4]},${i * ROW + ROW / 2}`).join(' ');
  const runTest = (f: Field) => {
    if (!data.owned.full) return askFull(`分野ごとのまとめのテスト(${TEST_N}問)は完全版で解けます。6割を取れば、その分野は合格ラインです。`, 'course');
    void play('decide');
    startBattle({ kind: 'review', ids: fieldTest(data, f), title: `${FIELD_LABEL[f]}系 まとめのテスト`, test: f });
  };
  return (
    <div className="road" style={{ height: nodes.length * ROW }}>
      <svg className="road-line" viewBox={`0 0 100 ${nodes.length * ROW}`} preserveAspectRatio="none" aria-hidden>
        <polyline points={pts} fill="none" strokeWidth="10" vectorEffect="non-scaling-stroke" />
      </svg>
      {nodes.map((n, i) => {
        const x = xs[i % 4];
        if (n.k === 'unit') {
          const u = n.u;
          const done = unitDone(data, u);
          const now = nu?.id === u.id;
          const open = unitOpen(data, u);
          return (
            <button
              key={u.id}
              ref={now ? nowRef : undefined}
              className={`road-row ${done ? 'done' : now ? 'now' : 'todo'} ${open ? '' : 'locked'}`}
              style={{ top: i * ROW, height: ROW, ['--x' as string]: `${x}%` }}
              onClick={() => openUnit(u)}
            >
              <span className="road-dot" style={{ ['--fc' as string]: DUNGEONS[u.field].color }}>
                {done ? <Check size={22} color="#fff" /> : !open ? <LockIcon size={16} /> : pathNo(u)}
              </span>
              <span className="road-label">
                {now && <em className="road-now">いまここ</em>}
                <b>{u.title}</b>
                <span className="small">
                  <span style={{ color: FIELD_TX[u.field] }}>{FIELD_LABEL[u.field]}</span>・約{u.mins}分
                </span>
              </span>
            </button>
          );
        }
        if (n.k === 'test') {
          const p = fieldCourse(data, n.f);
          const ok = testDone(data, n.f);
          return (
            <button key={`t-${n.f}`} className={`road-row goal ${ok ? 'done' : 'todo'}`} style={{ top: i * ROW, height: ROW, ['--x' as string]: `${x}%` }} onClick={() => runTest(n.f)}>
              <span className="road-dot goal-dot" style={{ ['--fc' as string]: DUNGEONS[n.f].color }}>
                {ok ? <Check size={22} color="#fff" /> : <img src={FIELD_ICON[n.f]} alt="" />}
              </span>
              <span className="road-label">
                <b>{FIELD_LABEL[n.f]}系 まとめのテスト</b>
                <span className="small">
                  {TEST_N}問・6割で合格ライン・単元 {p.done}/{p.total}
                </span>
              </span>
            </button>
          );
        }
        return (
          <button key="exam" className="road-row goal todo" style={{ top: i * ROW, height: ROW, ['--x' as string]: `${x}%` }} onClick={openExams}>
            <span className="road-dot goal-dot exam-dot">
              <img src={art('crown')} alt="" />
            </span>
            <span className="road-label">
              <b>ゴール: 模擬試験</b>
              <span className="small">本番と同じ100問・120分</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CourseHome() {
  const { data, go } = useStore();
  const [f, setF] = useState<Field | 'path'>('path');
  const deck = studyDeck(data);
  const units = f === 'path' ? PATH.map((id) => unitById(id)!) : UNITS.filter((u) => u.field === f);
  const nodes: RoadNode[] = [...units.map((u) => ({ k: 'unit' as const, u })), ...(f === 'path' ? FIELDS.map((x) => ({ k: 'test' as const, f: x })) : [{ k: 'test' as const, f }]), { k: 'exam' as const }];

  return (
    <>
      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <button className="btn paper sm back-sm" onClick={() => go({ name: 'tab', tab: 'zukan' })} aria-label="もどる">
          ‹
        </button>
        <div className="title-sign grow" style={{ margin: 0 }}>
          <span className="sign">ゼロから学ぶ道</span>
        </div>
      </div>
      <NextUp />
      <PassRoad />
      <div className="learn-links">
        <button className="panel learn-about" onClick={() => go({ name: 'about' })}>
          <img src={art('owl_teacher')} alt="" />
          <span className="grow">
            <b>どんな試験?</b>
            <span className="small muted">2分で分かる</span>
          </span>
        </button>
        <button className="panel learn-about" onClick={() => go({ name: 'cards' })}>
          <img src={art('card_books')} alt="" style={{ borderRadius: 8 }} />
          <span className="grow">
            <b>覚えるカード</b>
            <span className="small muted">{deck.cards.length}枚</span>
          </span>
        </button>
      </div>
      <div className="panel road-panel">
        <div className="seg">
          <button className={f === 'path' ? 'on' : ''} onClick={() => setF('path')}>
            道すじ
          </button>
          {FIELDS.map((x) => (
            <button key={x} className={f === x ? 'on' : ''} onClick={() => setF(x)}>
              {FIELD_LABEL[x]}
            </button>
          ))}
        </div>
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          {f === 'path' ? '上から順に進めば、3分野をバランスよく学べます。' : `${FIELD_LABEL[f]}系の単元だけを並べています。`}
          {!data.owned.full && `各分野の最初の${FREE_UNITS}単元は無料。`}
        </p>
        <Road nodes={nodes} />
      </div>
      <div style={{ height: 10 }} />
    </>
  );
}

/** 単元の中の図(表 か 流れ) */
function FigView({ fig }: { fig: Fig }) {
  if (fig.type === 'flow')
    return (
      <figure className="u-fig">
        {fig.cap && <figcaption>{fig.cap}</figcaption>}
        <div className="u-flow">
          {fig.items.map((x, i) => (
            <span key={i} className="u-flow-i">
              <span>{x}</span>
            </span>
          ))}
        </div>
      </figure>
    );
  return (
    <figure className="u-fig">
      {fig.cap && <figcaption>{fig.cap}</figcaption>}
      <table className="u-table">
        {fig.head && (
          <thead>
            <tr>
              {fig.head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {fig.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function UnitView({ id }: { id: string }) {
  const { data, update, go, startBattle, askFull, toast } = useStore();
  const u = unitById(id)!;
  const st = unitStep(data, u);
  const n = u.pages.length;
  // 画面の並び: 説明 0..n-1 → カード n → 問題 n+1 → おわり n+2
  const CARDS = n;
  const QUIZ = n + 1;
  const DONE = n + 2;
  const [step, setStep] = useState(st === 1 ? CARDS : st === 2 ? QUIZ : 0);
  const [flip, setFlip] = useState<Record<string, boolean>>({});
  const [asked, setAsked] = useState(false);
  const cards = unitCards(u);
  const quiz = unitQuiz(u);
  const floor = DUNGEONS[u.field].floors.indexOf(u.topic);
  const nu = nextUnit(data);
  const mark = (k: number) => update((d) => ({ ...d, course: { ...d.course, [u.id]: Math.max(d.course[u.id] ?? 0, k) } }));
  const scroller = () => document.querySelector('.scroll');
  const to = (k: number) => {
    setStep(k);
    scroller()?.scrollTo(0, 0);
  };
  // 確かめの問題を解き終えて戻ったら「おわり」へ
  useEffect(() => {
    if (asked && st >= 3 && step === QUIZ) {
      setStep(DONE);
      scroller()?.scrollTo(0, 0);
    }
  }, [asked, st, step, QUIZ, DONE]);
  // 別の単元へ移った時は最初から
  useEffect(() => {
    const s = unitStep(data, u);
    setStep(s === 1 ? CARDS : s === 2 ? QUIZ : 0);
    setFlip({});
    setAsked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const next = () => {
    void play('decide');
    if (step < n - 1) return to(step + 1);
    if (step === n - 1) {
      mark(1);
      return to(CARDS);
    }
    if (step === CARDS) {
      mark(2);
      return to(QUIZ);
    }
    if (step === QUIZ) {
      setAsked(true);
      return startBattle({ kind: 'review', ids: quiz.map((q) => q.id), title: u.title, unit: u.id });
    }
    // おわり → 次の単元
    if (!nu) return go({ name: 'course' });
    if (!unitOpen(data, nu)) return askFull(lockMsg, 'course', unitPreview(nu));
    go({ name: 'unit', id: nu.id });
  };
  const nextLabel =
    step < n - 1 ? '次へ ›' : step === n - 1 ? '用語カードへ ›' : step === CARDS ? '確かめの問題へ ›' : step === QUIZ ? `${quiz.length}問 解いてみる ›` : nu ? '次の単元へ ›' : '道すじへ ›';
  const total = n + 2;
  const page = step < n ? u.pages[step] : null;

  return (
    <>
      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <button className="btn paper sm back-sm" onClick={() => go({ name: 'course' })} aria-label="道すじへもどる">
          ‹
        </button>
        <div className="unit-head grow">
          <span className="small" style={{ color: FIELD_TX[u.field] }}>
            {FIELD_LABEL[u.field]}・{u.mid}・{pathNo(u)}/{UNITS.length}
          </span>
          <b>{u.title}</b>
        </div>
      </div>
      <div className="unit-dots" aria-label={`${Math.min(step, total - 1) + 1} / ${total + 1}`}>
        {Array.from({ length: total + 1 }, (_, i) => (
          <i key={i} className={i < step ? 'ok' : i === step ? 'on' : ''} />
        ))}
      </div>

      {page && (
        <div className="panel learn-read u-page">
          <h3>{page.h}</h3>
          {page.p.map((x, i) => (
            <p key={i}>{x}</p>
          ))}
          {page.fig && <FigView fig={page.fig} />}
          {page.like && (
            <div className="learn-like">
              <img src={art('owl_teacher')} alt="" />
              <p>
                <b>たとえると</b>
                {page.like}
              </p>
            </div>
          )}
        </div>
      )}

      {step === CARDS && (
        <>
          <p className="muted small center" style={{ margin: '8px 0' }}>
            この単元の大事な用語です。カードを押すと意味が出ます。
          </p>
          <div className="flip-grid">
            {cards.map((t) => (
              <FlipCard key={t.id} t={t} open={!!flip[t.id]} onFlip={() => setFlip((x) => ({ ...x, [t.id]: !x[t.id] }))} />
            ))}
          </div>
        </>
      )}

      {step === QUIZ && (
        <div className="panel center u-page">
          <img src={art('mon_slime')} alt="" style={{ height: 76 }} />
          <h3 style={{ justifyContent: 'center' }}>確かめの問題 {quiz.length}問</h3>
          <p className="muted">本物の過去問から、この単元で学んだことで解ける問題を選びました。まちがえても、すぐ解説が出ます。</p>
        </div>
      )}

      {step === DONE && (
        <div className="panel u-page u-done">
          <div className="center">
            <img src={art('crown')} alt="" style={{ height: 56 }} />
            <h3 style={{ justifyContent: 'center' }}>「{u.title}」クリア！</h3>
          </div>
          <div className="u-exam">
            <b>ここが試験に出る</b>
            <p>{u.exam}</p>
          </div>
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            覚えた用語: {u.words.map((w) => w[0]).join('・')}
          </p>
        </div>
      )}

      <button className="btn gold u-next" onClick={next}>
        {nextLabel}
      </button>
      {step === DONE && nu && <p className="center small muted" style={{ margin: '6px 0 0' }}>次は「{nu.title}」(約{nu.mins}分)</p>}
      <div className="u-sub">
        {step > 0 && step !== DONE && (
          <button className="u-link" onClick={() => to(step - 1)}>
            ‹ 前へ
          </button>
        )}
        {step === DONE && (
          <>
            <button className="u-link" onClick={() => to(0)}>
              ‹ 説明を読み直す
            </button>
            <button
              className="u-link"
              onClick={() => {
                if (!floorOpen(data, u.field, floor)) return askFull(`${DUNGEONS[u.field].name}の第${floor + 1}階は完全版で進めます。`, 'course', unitPreview(u));
                if (floor > data.cleared[u.field]) {
                  toast(`先に第${data.cleared[u.field] + 1}階をクリアしよう`);
                  return go({ name: 'map', field: u.field });
                }
                startBattle({ kind: 'floor', field: u.field, floor });
              }}
            >
              ダンジョン第{floor + 1}階で戦う ›
            </button>
            <button className="u-link" onClick={() => go({ name: 'note', field: u.field, topic: u.topic, back: { name: 'unit', id: u.id } })}>
              要点ノート ›
            </button>
          </>
        )}
      </div>
      <div style={{ height: 14 }} />
    </>
  );
}

/** 学ぶのタブの道すじの数(ホーム・図鑑用) */
export const courseSummary = (d: Parameters<typeof courseDone>[0]) => ({ done: courseDone(d), total: UNITS.length, pct: passRoad(d) });

export function AboutView() {
  const { go, update } = useStore();
  return (
    <>
      <div className="title-sign">
        <span className="sign">ITパスポートってどんな試験?</span>
      </div>
      <div className="panel learn-read">
        <p>{ABOUT.lead}</p>
        <dl className="about-facts">
          {ABOUT.facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h3>3つの分野</h3>
        {ABOUT.fields.map((x) => (
          <div key={x.field} className="about-field">
            <img src={FIELD_ICON[x.field]} alt="" />
            <span className="grow">
              <b>
                {x.name}
                <span className="small muted"> {x.n}</span>
              </b>
              <span className="small">{x.what}</span>
            </span>
          </div>
        ))}
        <div className="learn-like">
          <img src={art('owl_teacher')} alt="" />
          <p>{ABOUT.tip}</p>
        </div>
      </div>
      <button
        className="btn gold"
        onClick={() => {
          update((d) => ({ ...d, level: d.level ?? 'new' }));
          go({ name: 'course' });
        }}
      >
        学ぶ道へ ›
      </button>
      <div style={{ height: 10 }} />
    </>
  );
}

/** 表を押すと裏(意味)を見せる用語カード */
export function FlipCard({ t, open, onFlip }: { t: Term; open: boolean; onFlip: () => void }) {
  return (
    <button className={`flip ${open ? 'open' : ''}`} onClick={onFlip} aria-label={open ? `${t.name} の意味` : `${t.name}。押すと意味を表示`}>
      {!open ? (
        <span className="flip-front">
          <b style={t.name.length > 8 ? { fontSize: t.name.length > 11 ? 15 : 17 } : undefined}>{t.name}</b>
          {t.full && t.full !== t.name && <span className="small muted">{t.full}</span>}
          <span className="small flip-hint">押すと意味</span>
        </span>
      ) : (
        <span className="flip-back">
          <b className="small">{t.name}</b>
          <span>{t.desc}</span>
        </span>
      )}
    </button>
  );
}


export function Flashcards() {
  const { data, update, go, askFull } = useStore();
  const deck = studyDeck(data);
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const t = deck.cards[Math.min(i, deck.cards.length - 1)];
  const nextCard = (known: boolean) => {
    void play(known ? 'coin' : 'tap');
    if (known && t) update((d) => ({ ...d, known: { ...d.known, [t.id]: 1 } }));
    setOpen(false);
    setI((x) => (known ? x : x + 1) % Math.max(1, deck.cards.length - (known ? 1 : 0)));
  };
  return (
    <>
      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <button className="btn paper sm" style={{ width: 44, padding: 0, flex: 'none' }} onClick={() => go({ name: 'course' })} aria-label="もどる">
          ‹
        </button>
        <div className="title-sign grow" style={{ margin: 0 }}>
          <span className="sign">覚えるカード</span>
        </div>
      </div>
      <p className="muted small center" style={{ margin: '6px 0' }}>
        まちがえた問題の用語と、学んだ単元の用語が入ります。「覚えた」にすると山から外れます。
      </p>
      {t ? (
        <>
          <div className="flip-one">
            <FlipCard t={t} open={open} onFlip={() => setOpen((x) => !x)} />
          </div>
          <p className="center small muted" style={{ margin: '6px 0' }}>
            {Math.min(i, deck.cards.length - 1) + 1} / {deck.cards.length}枚
          </p>
          <div className="btns">
            <button className="btn paper" onClick={() => nextCard(false)}>
              まだ
            </button>
            <button className="btn" onClick={() => nextCard(true)}>
              覚えた
            </button>
          </div>
        </>
      ) : (
        <div className="panel center">
          <img src={art('crown')} alt="" style={{ height: 60 }} />
          <p>いまは覚えるカードがありません。問題を解いたり単元を学んだりすると増えます。</p>
        </div>
      )}
      {deck.locked > 0 && (
        <button className="panel upsell" style={{ marginTop: 12 }} onClick={() => askFull(`覚えるカードは無料で${FREE_DECK}枚までです。まちがえた問題の用語がほかに${deck.locked}枚あります。完全版ならすべてカードにして覚えられます。`, 'course')}>
          <img src={art('card_books')} alt="" />
          <div className="grow">
            <b>ほかに {deck.locked}枚 たまっています</b>
            <div className="small">完全版なら、まちがえた用語をすべてカードに</div>
          </div>
          <span className="chev">›</span>
        </button>
      )}
      <div style={{ height: 10 }} />
    </>
  );
}
