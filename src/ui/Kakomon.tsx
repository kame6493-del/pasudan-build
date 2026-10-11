import { useState } from 'react';
import { QUESTIONS } from '../domain/data';
import { progressOf, topicQuestions, yearQuestions, YEARS } from '../domain/game';
import type { AppData, Question } from '../domain/types';
import { art, DUNGEONS, FIELDS, FIELD_LABEL } from '../domain/world';
import { useStore } from './store';

type View = 'year' | 'field';

/** 解く順: まだ解いていない最初の問題から最後まで。全部解いていたら最初から */
export function practiceOrder(d: AppData, qs: Question[]): { ids: string[]; from: number } {
  const k = qs.findIndex((q) => !d.qs[q.id]);
  const from = k < 0 ? 0 : k;
  return { ids: qs.slice(from).map((q) => q.id), from };
}

/** 過去問モード。年度別・分野別(テーマ別)に、990問すべてを解説つきで解ける。無料・1日の上限なし */
export function Kakomon() {
  const { data, go, startBattle } = useStore();
  const [view, setView] = useState<View>('year');
  const all = progressOf(data, QUESTIONS);

  const start = (qs: Question[], title: string, sub: string, wrongOnly = false) => {
    if (wrongOnly) {
      const ids = qs.filter((q) => data.qs[q.id]?.last === 0).map((q) => q.id);
      if (ids.length) startBattle({ kind: 'practice', ids, title, sub: `${sub} まちがえた問題` });
      return;
    }
    const { ids } = practiceOrder(data, qs);
    startBattle({ kind: 'practice', ids, title, sub });
  };

  const row = (key: string, qs: Question[], title: string, sub: string, color?: string, badge?: string) => {
    const p = progressOf(data, qs);
    const wrong = qs.filter((q) => data.qs[q.id]?.last === 0).length;
    const k = qs.findIndex((q) => !data.qs[q.id]);
    const next = p.done === 0 ? 'はじめる' : k < 0 ? 'もう一周' : `続き 問${qs[k].no}`;
    return (
      <div key={key} className="kk-row">
        <button className="kk-main" onClick={() => start(qs, title, sub)}>
          {badge && (
            <span className="num-badge" style={{ background: color }}>
              {badge}
            </span>
          )}
          <span className="grow">
            <b>{sub}</b>
            <span className="kk-meta">
              <span className="bar" style={{ height: 8 }}>
                <i style={{ width: `${(p.done / Math.max(1, p.total)) * 100}%`, background: color }} />
              </span>
              <span className="small muted nowrap">
                {p.done}/{p.total}問{p.done ? `・正解${Math.round((p.ok / p.done) * 100)}%` : ''}
              </span>
            </span>
          </span>
          <span className="kk-go">{view === 'year' ? next : p.done === 0 ? 'はじめる' : k < 0 ? 'もう一周' : '続き'} ›</span>
        </button>
        {wrong > 0 && (
          <button className="kk-wrong" onClick={() => start(qs, title, sub, true)} aria-label={`${sub}のまちがえた問題 ${wrong}問`}>
            まちがい {wrong}問を解きなおす
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="row" style={{ marginTop: 6 }}>
        <button className="btn paper sm" style={{ width: 44, padding: 0, flex: 'none' }} onClick={() => go({ name: 'tab', tab: 'dungeon' })} aria-label="もどる">
          ‹
        </button>
        <div className="title-sign grow" style={{ margin: 0 }}>
          <span className="sign">過去問道場</span>
        </div>
        <span style={{ width: 44, flex: 'none' }} />
      </div>
      <div className="panel kk-head">
        <img src={art('owl_teacher')} alt="" />
        <div className="grow">
          <b>{QUESTIONS.length}問 ぜんぶ無料・解説つき</b>
          <div className="small muted">IPA が公開している ITパスポート試験の過去問を、年度別・分野別に解けます。1日の上限はありません。</div>
          <div className="row" style={{ marginTop: 6, gap: 8 }}>
            <div className="bar grow" style={{ height: 10 }}>
              <i style={{ width: `${(all.done / all.total) * 100}%` }} />
            </div>
            <b className="small nowrap">
              {all.done} / {all.total}問
            </b>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="seg kk-seg">
          <button className={view === 'year' ? 'on' : ''} onClick={() => setView('year')}>
            年度別
          </button>
          <button className={view === 'field' ? 'on' : ''} onClick={() => setView('field')}>
            分野別
          </button>
        </div>
        {view === 'year' ? (
          <>
            <p className="small muted" style={{ margin: '2px 0 8px' }}>
              本番と同じ問番号の順に出ます。途中でやめても、次は解いていない問題から始まります。
            </p>
            {YEARS.map((y) => row(y, yearQuestions(y), '過去問道場', y))}
          </>
        ) : (
          <>
            <p className="small muted" style={{ margin: '2px 0 8px' }}>
              3分野・30テーマ。苦手なテーマだけ集中して解けます。
            </p>
            {FIELDS.map((f) => (
              <div key={f}>
                <h3 className="kk-field" style={{ color: DUNGEONS[f].color }}>
                  <img src={DUNGEONS[f].book} alt="" />
                  {FIELD_LABEL[f]}
                </h3>
                {DUNGEONS[f].floors.map((t, i) => row(t, topicQuestions(f, t), '過去問道場', t, DUNGEONS[f].color, String(i + 1)))}
              </div>
            ))}
          </>
        )}
      </div>
      <div style={{ height: 8 }} />
    </>
  );
}
