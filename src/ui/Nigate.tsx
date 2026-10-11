import { useState } from 'react';
import { Q_BY_ID, QUESTIONS, source } from '../domain/data';
import { weakQuestions } from '../domain/game';
import type { Field } from '../domain/types';
import { art, FIELDS, FIELD_LABEL, PETS } from '../domain/world';
import { useStore } from './store';

export function Nigate() {
  const { data, startBattle } = useStore();
  const [f, setF] = useState<Field | 'all'>('all');
  const pet = PETS.find((p) => p.id === data.pet) ?? PETS[0];
  const weakIds = Object.keys(data.weak).filter((id) => Q_BY_ID.has(id));
  const byField = (x: Field) => weakIds.filter((id) => Q_BY_ID.get(id)!.field === x).length;
  const list = weakIds
    .map((id) => Q_BY_ID.get(id)!)
    .filter((q) => f === 'all' || q.field === f)
    .sort((a, b) => (data.qs[b.id]?.n ?? 0) - (data.qs[b.id]?.c ?? 0) - ((data.qs[a.id]?.n ?? 0) - (data.qs[a.id]?.c ?? 0)));
  // まとめて復習: 苦手 → 前に間違えた問題 の順で10問
  const recentWrong = QUESTIONS.filter((q) => data.qs[q.id] && !(q.id in data.weak) && data.qs[q.id].c < data.qs[q.id].n).map((q) => q.id);
  const mix = [...weakQuestions(data, 10).map((q) => q.id), ...recentWrong].slice(0, 10);

  return (
    <>
      <div className="title-sign">
        <span className="sign">復習の部屋</span>
      </div>
      <div className="dungeon-card" style={{ backgroundImage: `url(${art('bg_forest_b')})`, height: 170 }}>
        <img src={pet.img} alt="" style={{ position: 'absolute', left: 24, bottom: 12, height: 80, animation: 'bob 2s infinite' }} />
        <img src={art('owl_teacher')} alt="" style={{ position: 'absolute', right: 8, bottom: 0, height: 90 }} />
        <div className="bubble" style={{ position: 'absolute', left: 104, top: 14, right: 90, fontSize: 14 }}>
          {weakIds.length ? (
            <>
              <span className="nowrap">苦手は復習すれば</span>
              <wbr />
              <span className="nowrap">きっと解けるよ！</span>
            </>
          ) : (
            '苦手はゼロ！ この調子！'
          )}
        </div>
      </div>
      <div className="panel">
        <div className="row">
          <img src={art('tab_nigate')} alt="" style={{ height: 40 }} />
          <b className="grow" style={{ fontSize: 18 }}>
            あなたの苦手
          </b>
          <b style={{ fontSize: 36, color: 'var(--red)' }}>{weakIds.length}</b>
          <b>問</b>
        </div>
        {FIELDS.map((x) => (
          <div key={x} className="row" style={{ padding: '6px 0', borderTop: '1px dashed #e3cfa2' }}>
            <span className={`chip ${x}`}>{FIELD_LABEL[x]}</span>
            <span className="grow" />
            <b>{byField(x)}問</b>
          </div>
        ))}
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          2回続けて正解すると苦手から消えます。苦手の復習は無料で何回でもできます。
        </p>
      </div>
      <button className="btn" style={{ marginTop: 12 }} disabled={mix.length === 0} onClick={() => startBattle({ kind: 'review', ids: mix, title: '10問まとめて復習' })}>
        <img src={art('book_technology')} alt="" />
        10問まとめて復習する
      </button>
      <button className="btn paper" style={{ marginTop: 10 }} disabled={weakIds.length === 0} onClick={() => startBattle({ kind: 'review', ids: weakQuestions(data, 20).map((q) => q.id), title: '苦手だけ復習' })}>
        <img src={art('tab_nigate')} alt="" />
        苦手だけ復習する
      </button>

      <div className="panel">
        <h3>苦手問題一覧</h3>
        <div className="seg">
          {(['all', ...FIELDS] as const).map((x) => (
            <button key={x} className={f === x ? 'on' : ''} onClick={() => setF(x)}>
              {x === 'all' ? `すべて（${weakIds.length}）` : `${FIELD_LABEL[x]}（${byField(x)}）`}
            </button>
          ))}
        </div>
        {list.length === 0 && <p className="muted center">ここに出る問題はありません</p>}
        {list.map((q) => {
          const s = data.weak[q.id] ?? 0;
          return (
            <div key={q.id} className="weak-item">
              <div className="grow">
                <div className="row small" style={{ fontWeight: 800 }}>
                  <span className={`chip ${q.field}`}>{FIELD_LABEL[q.field]}</span>
                  <span className="muted">{q.topic}</span>
                </div>
                <div className="q" style={{ marginTop: 4 }}>
                  {q.q}
                </div>
                <div className="src">{source(q)}</div>
                <div className="row small" style={{ marginTop: 4, fontWeight: 800 }}>
                  <span style={{ color: s ? 'var(--m)' : 'var(--red)' }}>{s ? 'あと1回正解で克服' : '前回不正解'}</span>
                  <div className="bar" style={{ width: 70, height: 8 }}>
                    <i style={{ width: `${s * 50}%`, background: 'var(--m)' }} />
                  </div>
                  <span>{s}/2</span>
                </div>
              </div>
              <button className="btn sm" style={{ width: 92 }} onClick={() => startBattle({ kind: 'review', ids: [q.id], title: 'もう一度' })}>
                もう一度
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
