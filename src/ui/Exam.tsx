import { useEffect, useMemo, useRef, useState } from 'react';
import { Q_BY_ID, source } from '../domain/data';
import { examLimitSec, examQuestions, failNote, freeExamsLeft, judge, PASS_FIELD, PASS_TOTAL, recordAnswer } from '../domain/game';
import type { ExamResult, Field } from '../domain/types';
import { art, EXAM_BOSS, FIELDS, FIELD_LABEL } from '../domain/world';
import { cheer, tap } from '../platform/native';
import { bgm, play } from '../platform/sound';
import { useBack } from './back';
import { useQuestionFit } from './qfit';
import { Choices, QBody, QHead } from './QuestionView';
import { useStore } from './store';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function Exam({ year: year0, resume, onExit }: { year?: string; resume?: boolean; onExit: () => void }) {
  const { data, update, startBattle, askFull, confirm } = useStore();
  // 続きから: 保存した問題・解答・使った時間をそのまま使う
  const draft = useMemo(() => (resume ? data.examDraft : null), []); // eslint-disable-line react-hooks/exhaustive-deps
  const year = draft ? draft.year : year0;
  const qs = useMemo(() => (draft ? draft.ids.map((id) => Q_BY_ID.get(id)!) : examQuestions(data, year)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(draft?.i ?? 0);
  const [ans, setAns] = useState<(number | null)[]>(() => (draft ? [...draft.ans] : qs.map(() => null)));
  const [grid, setGrid] = useState(false);
  const LIMIT = examLimitSec(qs.length);
  const start = useRef(Date.now() - (draft?.elapsed ?? 0));
  const [left, setLeft] = useState(() => Math.max(0, LIMIT - (Date.now() - start.current) / 1000));
  const [res, setRes] = useState<(ExamResult & { wrong: string[] }) | null>(null);
  // 模擬試験はボス戦の曲。結果が出たら止める(grade の中で bgm(null))
  useEffect(() => {
    if (!res) bgm('boss');
  }, [res]);
  const scroller = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /** 無料の回数は、最初の1問に答えた時に1回と数える(続きからの再開では数えない) */
  const counted = useRef(!!draft);
  const countFree = () => {
    if (counted.current) return;
    counted.current = true;
    update((d) => (d.owned.full ? d : { ...d, freeExams: d.freeExams + 1 }));
  };
  /** 途中の解答を保存する */
  const saveDraft = (a: (number | null)[], at: number) => {
    if (!a.some((x) => x !== null)) return;
    countFree();
    const dr = { year, ids: qs.map((q) => q.id), ans: a, elapsed: Date.now() - start.current, i: at };
    update((d) => ({ ...d, examDraft: dr }));
  };

  // 残り時間。描画のたびに作り直さず、1本の時計で回す(すばやく操作しても止まって見えない)
  const gradeRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (res) return;
    const tick = () => {
      const l = Math.max(0, LIMIT - (Date.now() - start.current) / 1000);
      setLeft(l);
      if (l <= 0) gradeRef.current();
    };
    const t = window.setInterval(tick, 500);
    return () => window.clearInterval(t);
  }, [res, LIMIT]);

  const grade = () => {
    if (res) return;
    const by = { strategy: 0, management: 0, technology: 0 } as Record<Field, number>;
    const wrong: string[] = [];
    let correct = 0;
    let answered = 0;
    let d = data;
    qs.forEach((q, k) => {
      const a = ans[k];
      const ok = a === q.answer;
      if (ok) {
        by[q.field] += 1;
        correct += 1;
      } else wrong.push(q.id);
      if (a !== null) {
        answered += 1;
        d = recordAnswer(d, q, ok, { counted: false, combo: 0 }).data;
      }
    });
    const cnt = (f: Field) => Math.max(1, qs.filter((q) => q.field === f).length);
    const sc = (f: Field) => Math.round((by[f] / cnt(f)) * 1000);
    const total = Math.round((correct / qs.length) * 1000);
    const r: ExamResult = { at: Date.now(), year, total, s: sc('strategy'), m: sc('management'), t: sc('technology'), pass: false, correct, answered };
    r.pass = judge(r.total, r.s, r.m, r.t);
    const reward = r.pass ? 300 : 50;
    if (answered > 0) countFree();
    update((cur) => ({ ...d, freeExams: cur.freeExams, owned: cur.owned, examDraft: null, exams: [...d.exams, r].slice(-30), bossDown: d.bossDown || r.pass, coins: d.coins + reward, xp: d.xp + Math.round(correct / 2) }));
    setRes({ ...r, wrong });
    bgm(null); // 結果はファンファーレ(効果音)だけで聞かせる
    void play(r.pass ? 'pass' : 'fail');
    if (r.pass) cheer();
  };

  gradeRef.current = grade;

  const finishAsk = async () => {
    const un = ans.filter((a) => a === null).length;
    if (un === 0 || (await confirm({ body: `まだ ${un} 問 答えていません。採点しますか？`, ok: '採点する', cancel: 'もどる' }))) grade();
  };

  const quit = async () => {
    if (res) return onExit();
    const done = ans.filter((a) => a !== null).length;
    if (done === 0) {
      // まだ1問も答えていなければ、無料の1回も使っていない
      if (await confirm({ body: '模擬試験をやめますか？', ok: 'やめる', cancel: 'つづける' })) onExit();
      return;
    }
    if (await confirm({ title: '中断しますか？', body: '答えた所までは保存されます。「模擬試験」の画面から続きができます（時間も続きから数えます）。', ok: '中断する', cancel: 'つづける' })) {
      saveDraft(ans, i);
      onExit();
    }
  };
  useBack(() => void quit());

  // スクロールせずに答える(結果・一覧では外す)
  useQuestionFit(rootRef, !res && !grid, false, i);

  if (res) {
    return (
      <div className="battle" style={{ overflowY: 'auto' }}>
        <div className="stage" style={{ backgroundImage: `url(${res.pass ? art('bg_pass') : art('bg_castle_b')})`, height: 'calc(var(--safe-t) + 250px)', flex: 'none' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(var(--safe-t) + 40px)', display: 'grid', placeItems: 'center', zIndex: 4 }}>
            <div className="center">
              <div className="sign" style={{ fontSize: 16 }}>
                {res.pass ? '合格の扉が開かれた！' : 'あと少し！ もう一度挑もう'}
              </div>
              <div className={`pass-big ${res.pass ? '' : 'ng'}`} style={{ marginTop: 10 }}>
                {res.pass ? '合格' : '不合格'}
              </div>
            </div>
          </div>
          <img className="hero" src={art(res.pass ? 'hero_hood' : 'hero_back')} alt="" style={{ height: 96, bottom: 18 }} />
        </div>
        <div className="qpanel" style={{ marginTop: -14 }}>
          <div className="center">
            <span className="sign" style={{ fontSize: 17 }}>
              {year ? `${year} 過去問` : '模擬試験'} 結果
            </span>
          </div>
          <div className="center" style={{ marginTop: 10 }}>
            <div className="muted">総合の予想点</div>
            <span style={{ fontSize: 46, fontWeight: 800, color: res.pass ? 'var(--hi-green)' : 'var(--hi-red)' }}>{res.total}</span>
            <b className="muted"> / 1000</b>
            <div className="muted small">
              正解 {res.correct} / {qs.length}問（答えた数 {res.answered}）
            </div>
          </div>
          <div className="score-cols" style={{ marginTop: 10 }}>
            {(['s', 'm', 't'] as const).map((k, n) => (
              <div key={k} className="kpi" style={{ color: `var(--${k}-tx)` }}>
                {FIELD_LABEL[FIELDS[n]]}
                <b style={{ color: res[k] >= PASS_FIELD ? `var(--${k}-tx)` : 'var(--hi-red)' }}>{res[k]}</b>
                <span className="muted">/1000</span>
              </div>
            ))}
          </div>
          <div className="explain" style={{ background: res.pass ? 'var(--green-bg)' : 'var(--red-bg)' }}>
            {!res.pass && <p style={{ margin: '0 0 6px', fontWeight: 800 }}>{failNote(res)}</p>}
            <b>合格基準</b>
            <p className="small" style={{ marginTop: 4 }}>
              総合 {PASS_TOTAL} 点以上、かつ各分野（ストラテジ・マネジメント・テクノロジ）{PASS_FIELD} 点以上。
              <br />
              本番は IRT（項目応答理論）で採点されます。ここでは正解数から出した予想点です。
            </p>
          </div>
          <div className="btns">
            <button
              className="btn paper"
              disabled={res.wrong.length === 0}
              onClick={() => {
                onExit();
                startBattle({ kind: 'review', ids: res.wrong.slice(0, 20), title: '模擬試験の見直し' });
              }}
            >
              まちがい復習
            </button>
            <button className="btn" onClick={onExit}>
              とじる
            </button>
          </div>
          {!data.owned.full && (
            <button
              className="panel upsell"
              style={{ marginTop: 12 }}
              onClick={() => {
                onExit();
                askFull(res.pass ? '合格ラインを超えました。本番までに何度も模擬試験で確かめておくと安心です。' : `${failNote(res)}完全版なら弱い分野だけを集中して解き、模擬試験を何回でも受けて確かめられます。`, 'exam-result');
              }}
            >
              <img src={art('boss_celes')} alt="" />
              <div className="grow">
                <b>{Number.isFinite(freeExamsLeft(data)) && freeExamsLeft(data) > 0 ? `無料の模擬試験はあと ${freeExamsLeft(data)} 回` : '無料の模擬試験は使い終わりました'}</b>
                <div className="small">{res.pass ? '完全版なら模擬試験ボスに何回でも挑戦できます' : `合格ラインまで あと${Math.max(0, 600 - res.total)}点。完全版で弱い分野を集中して解けます`}</div>
              </div>
              <span className="chev">›</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const q = qs[i];
  const done = ans.filter((a) => a !== null).length;
  return (
    <div className="battle" ref={rootRef}>
      <div className="stage exam" style={{ backgroundImage: `url(${art('bg_castle_b')})` }}>
        <div className="stage-top">
          <div className="exam-top grow">
            <span className="pill">{i + 1} / {qs.length}問</span>
            <span className="pill" style={{ color: left < 600 ? '#ff9d8f' : '#fff' }}>
              {fmt(left)}
            </span>
          </div>
          <button className="pause" onClick={() => void quit()} aria-label="やめる">
            ✕
          </button>
        </div>
        <div className="enemy-box">
          <div className="nm">
            <span>{EXAM_BOSS.name}</span>
            <span>のこり {qs.length - done}問</span>
          </div>
          <div className="hpbar">
            <i style={{ width: `${((qs.length - done) / qs.length) * 100}%`, background: 'linear-gradient(180deg,#c9a6ff,#7c4ae0)' }} />
          </div>
        </div>
        <div className="enemy-zone">
          <img className="enemy boss" src={EXAM_BOSS.img} alt={EXAM_BOSS.name} />
        </div>
        <img className="hero alt" src={art('hero_back')} alt="" />
      </div>
      <div className={`qpanel${grid ? '' : ' fitting'}`} ref={scroller}>
        {grid ? (
          <>
            <h3>問題一覧（答えた問題は青）</h3>
            <div className="qgrid">
              {qs.map((_, k) => (
                <button
                  key={k}
                  className={`${ans[k] !== null ? 'done' : ''} ${k === i ? 'cur' : ''}`}
                  onClick={() => {
                    setI(k);
                    setGrid(false);
                  }}
                >
                  {k + 1}
                </button>
              ))}
            </div>
            <div className="btns">
              <button className="btn paper" onClick={() => setGrid(false)}>
                もどる
              </button>
              <button className="btn gold" onClick={() => void finishAsk()}>
                採点する
              </button>
            </div>
          </>
        ) : (
          <>
            <QHead q={q} extra={`第${i + 1}問`} />
            <div className="qscroll">
              <div className="src" style={{ margin: '-2px 0 6px' }}>{source(q)}</div>
              <QBody q={q} />
            </div>
            <Choices
              q={q}
              picked={ans[i]}
              reveal={false}
              onPick={(k) => {
                tap();
                void play('tap');
                const a = ans.map((v, n) => (n === i ? k : v));
                setAns(a);
                saveDraft(a, i);
              }}
            />
            <div className="btns">
              <button className="btn paper sm" disabled={i === 0} onClick={() => setI(i - 1)}>
                ‹ まえ
              </button>
              <button className="btn paper sm" onClick={() => setGrid(true)}>
                一覧
              </button>
              {i < qs.length - 1 ? (
                <button
                  className="btn sm"
                  onClick={() => {
                    setI(i + 1);
                    scroller.current?.scrollTo({ top: 0 });
                  }}
                >
                  つぎ ›
                </button>
              ) : (
                <button className="btn gold sm" onClick={() => void finishAsk()}>
                  採点
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
