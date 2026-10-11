import { useState } from 'react';
import { Q_BY_ID, TERM_BY_ID, TERMS } from '../domain/data';
import { canEvolve } from '../domain/game';
import type { Field, Term } from '../domain/types';
import { art, DUNGEONS, FIELDS, FIELD_LABEL } from '../domain/world';
import { LockIcon } from './icons';
import { CARD_ART } from './QuestionView';
import { useStore, type Route } from './store';

function rate(cards: Record<string, number>, list: Term[]) {
  const got = list.filter((t) => cards[t.id]).length;
  return { got, all: list.length, pct: list.length ? Math.round((got / list.length) * 100) : 0 };
}

export function Zukan() {
  const { data, go } = useStore();
  const all = rate(data.cards, TERMS);
  const gold = TERMS.filter((t) => data.cards[t.id] === 2).length;
  return (
    <>
      <div className="panel center">
        <h2 style={{ justifyContent: 'center' }}>
          <img src={art('card_books')} alt="" style={{ height: 30, borderRadius: 6 }} />
          用語カード図鑑
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          敵を倒すとカードを落とす。その用語の問題に2回続けて正解すると金に進化！{data.owned.full ? '' : '（金への進化は完全版）'}
        </p>
      </div>
      <button className="panel upsell notes-entry" onClick={() => go({ name: 'notes', field: 'strategy' })}>
        <img src={DUNGEONS.technology.book} alt="" />
        <div className="grow">
          <b>要点ノート（30テーマ）</b>
          <div className="small">各階のテーマを短くまとめた教科書。読んでから解こう</div>
        </div>
        <span className="chev">›</span>
      </button>
      <div className="panel">
        <div className="row">
          <b className="grow">全体の収集率</b>
          <b style={{ fontSize: 28, color: 'var(--blue2)' }}>{all.pct}%</b>
        </div>
        <div className="bar gold" style={{ height: 16, marginTop: 6 }}>
          <i style={{ width: `${all.pct}%` }} />
        </div>
        <div className="muted small" style={{ marginTop: 4 }}>
          獲得 {all.got} / {all.all} ・ 金 {gold}枚
        </div>
      </div>
      {FIELDS.map((f) => {
        const r = rate(data.cards, TERMS.filter((t) => t.field === f));
        return (
          <button key={f} className="panel book-row" onClick={() => go({ name: 'zukanList', field: f })}>
            <img src={DUNGEONS[f].book} alt="" />
            <div className="grow">
              <b style={{ fontSize: 20 }}>{FIELD_LABEL[f]}</b>
              <div className="muted small">{DUNGEONS[f].sub}</div>
              <div className="row" style={{ marginTop: 6 }}>
                <div className="bar gold grow">
                  <i style={{ width: `${r.pct}%` }} />
                </div>
                <b>{r.pct}%</b>
              </div>
              <div className="muted small">
                {r.got} / {r.all}
              </div>
            </div>
            <b style={{ fontSize: 24 }}>›</b>
          </button>
        );
      })}
      <button className="btn paper" style={{ marginTop: 12 }} onClick={() => go({ name: 'zukanList', field: 'all' })}>
        すべてのカードを見る
      </button>
    </>
  );
}

type Filter = 'all' | 'none' | 'silver' | 'gold';

export function ZukanList({ field }: { field: Field | 'all' }) {
  const { data, go } = useStore();
  const [f, setF] = useState<Field | 'all'>(field);
  const [flt, setFlt] = useState<Filter>('all');
  const list = TERMS.filter((t) => (f === 'all' || t.field === f) && (flt === 'all' || (flt === 'none' ? !data.cards[t.id] : flt === 'silver' ? data.cards[t.id] === 1 : data.cards[t.id] === 2)));
  return (
    <>
      <div className="title-sign">
        <span className="sign">用語カード図鑑</span>
      </div>
      <div className="panel">
        <div className="seg">
          {(['all', ...FIELDS] as const).map((x) => (
            <button key={x} className={f === x ? 'on' : ''} onClick={() => setF(x)}>
              {x === 'all' ? 'すべて' : `${FIELD_LABEL[x]} ${rate(data.cards, TERMS.filter((t) => t.field === x)).pct}%`}
            </button>
          ))}
        </div>
        <div className="seg">
          {(
            [
              ['all', 'ぜんぶ'],
              ['none', '未獲得'],
              ['silver', '銀'],
              ['gold', '金'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="muted small" style={{ margin: '4px 0 8px' }}>
          全 {list.length} 件
        </div>
        <div className="grid3">
          {list.map((t) => {
            const c = data.cards[t.id];
            return (
              <button key={t.id} className={`tcard ${c === 2 ? 'gold' : c ? '' : 'none'}`} onClick={() => go({ name: 'term', id: t.id, back: { name: 'zukanList', field: f } })}>
                {c && <span className="rank">{c === 2 ? '金' : '銀'}</span>}
                <img className="art" src={CARD_ART[t.art]} alt="" />
                <div className="nm">{c ? t.name : <><LockIcon /> ???</>}</div>
                <span className={`chip ${t.field}`} style={{ fontSize: 12, padding: '0 6px' }}>
                  {FIELD_LABEL[t.field]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function TermDetail({ id, back }: { id: string; back: Route }) {
  const { data, go, askFull, startBattle } = useStore();
  const t = TERM_BY_ID.get(id);
  if (!t) return null;
  const c = data.cards[t.id];
  const streak = Math.min(2, data.termStreak[t.id] ?? 0);
  const qs = t.q.map((x) => Q_BY_ID.get(x)!).filter(Boolean);
  const evo = canEvolve(data);
  return (
    <>
      <button className="btn paper sm" style={{ width: 140, marginTop: 6 }} onClick={() => go(back)}>
        ‹ 一覧に戻る
      </button>
      <div className={`panel tcard ${c === 2 ? 'gold' : c ? '' : 'none'}`} style={{ padding: 12 }}>
        {c && (
          <span className="rank" style={{ width: 40, height: 40, fontSize: 18, left: 6, top: 6 }}>
            {c === 2 ? '金' : '銀'}
          </span>
        )}
        <img className="art" src={CARD_ART[t.art]} alt="" style={{ width: '62%', margin: '0 auto' }} />
        <div style={{ fontSize: 24, marginTop: 8 }}>{c ? t.name : '???'}</div>
        {c && t.full && <div className="small" style={{ fontWeight: 700 }}>{t.full}</div>}
        <span className={`chip ${t.field}`} style={{ marginTop: 6 }}>
          {FIELD_LABEL[t.field]}
        </span>
      </div>
      <div className="panel">
        <h3>用語の解説</h3>
        <p style={{ margin: 0, lineHeight: 1.8 }}>{c ? t.desc : 'まだ手に入れていないカードです。敵を倒すと落とすことがあります。'}</p>
      </div>
      <div className="panel">
        <h3>
          <img src={art('crown')} alt="" style={{ height: 22 }} />
          金への進化条件
        </h3>
        <div className="muted small">この用語の問題に2回続けて正解で金に進化！</div>
        {!evo && c === 1 && (
          <button className="lock-row" style={{ marginTop: 6 }} onClick={() => askFull('用語カードが金に進化するのは完全版です。図鑑を金でうめて、苦手な用語をなくそう。')}>
            <LockIcon size={14} color="#6b5a48" />
            <span className="grow">金への進化は完全版で</span>
            <span className="chev">›</span>
          </button>
        )}
        <div className="row" style={{ marginTop: 6 }}>
          <div className="bar gold grow">
            <i style={{ width: `${c === 2 ? 100 : streak * 50}%` }} />
          </div>
          <b>{c === 2 ? '進化済み' : `${streak} / 2`}</b>
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>
          関連する問題 {qs.length}問
        </div>
      </div>
      {!c ? (
        <div className="panel note-lock" style={{ marginTop: 12 }}>
          <LockIcon size={18} color="#6b5a48" />
          <div className="grow small" style={{ fontWeight: 700 }}>
            カードを手に入れると、説明と問題が開きます
          </div>
        </div>
      ) : (
        <button className="btn" style={{ marginTop: 12 }} onClick={() => startBattle({ kind: 'practice', ids: qs.map((q) => q.id), title: '用語の過去問', sub: t.name })}>
          この用語の過去問を解く（{qs.length}問） ›
        </button>
      )}
    </>
  );
}
