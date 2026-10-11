import { useEffect, useState } from 'react';
import { QUESTIONS } from '../domain/data';
import { floorOpen, topicQuestions } from '../domain/game';
import type { Field } from '../domain/types';
import { DUNGEONS, FIELDS, FIELD_LABEL } from '../domain/world';
import { LockIcon } from './icons';
import { useStore, type Route } from './store';
import { practiceOrder } from './Kakomon';

export interface Note {
  topic: string;
  field: Field;
  lead: string;
  sections: { h: string; body: string }[];
  points: string[];
  traps: string[];
  formulas?: string[];
}

let cache: Note[] | null = null;
/** ノートは大きいので、開いた時に読み込む */
function useNotes(): Note[] | null {
  const [n, setN] = useState<Note[] | null>(cache);
  useEffect(() => {
    if (cache) return;
    import('../data/notes.json').then((m) => {
      cache = m.default as Note[];
      setN(cache);
    });
  }, []);
  return n;
}

export function NotesList({ field }: { field: Field }) {
  const { data, go } = useStore();
  const notes = useNotes();
  const [f, setF] = useState<Field>(field);
  return (
    <>
      <div className="title-sign">
        <span className="sign">要点ノート</span>
      </div>
      <div className="panel">
        <p className="muted" style={{ marginTop: 0 }}>
          各階のテーマを短くまとめたノートです。読んでから戦うと、ぐっと解きやすくなります。
        </p>
        <div className="seg">
          {FIELDS.map((x) => (
            <button key={x} className={f === x ? 'on' : ''} onClick={() => setF(x)}>
              {FIELD_LABEL[x]}
            </button>
          ))}
        </div>
        {DUNGEONS[f].floors.map((topic, i) => {
          const open = floorOpen(data, f, i);
          const has = notes?.some((n) => n.topic === topic);
          const count = QUESTIONS.filter((q) => q.topic === topic).length;
          return (
            <button key={topic} className="note-row" onClick={() => go({ name: 'note', field: f, topic, back: { name: 'notes', field: f } })}>
              <span className="num-badge" style={{ background: DUNGEONS[f].color }}>
                {i + 1}
              </span>
              <span className="grow">
                <b>{topic}</b>
                <span className="muted small">
                  過去問 {count}問{has === false ? '・準備中' : ''}
                </span>
              </span>
              {!open && (
                <span className="lock">
                  <LockIcon /> 完全版
                </span>
              )}
              <span className="chev">›</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function NoteView({ field, topic, back }: { field: Field; topic: string; back: Route }) {
  const { data, go, askFull, startBattle } = useStore();
  const notes = useNotes();
  const floor = DUNGEONS[field].floors.indexOf(topic);
  const open = floorOpen(data, field, floor);
  const n = notes?.find((x) => x.topic === topic);
  const backBtn = (
    <button className="btn paper sm" style={{ width: 140, marginTop: 6 }} onClick={() => go(back)}>
      ‹ もどる
    </button>
  );
  if (!notes) return <div className="panel">読み込み中…</div>;
  if (!n)
    return (
      <>
        {backBtn}
        <div className="panel">このノートは準備中です。</div>
      </>
    );
  const shown = open ? n.sections : n.sections.slice(0, 1);
  return (
    <>
      {backBtn}
      <div className="panel note">
        <div className="row">
          <span className={`chip ${field}`}>{FIELD_LABEL[field]}</span>
          <span className="muted small">
            {DUNGEONS[field].name} 第{floor + 1}階
          </span>
        </div>
        <h2 style={{ marginTop: 8 }}>{topic}</h2>
        <p className="note-lead">{n.lead}</p>
        {shown.map((s) => (
          <section key={s.h}>
            <h3>{s.h}</h3>
            <p className="note-body">{s.body}</p>
          </section>
        ))}
        {!open && (
          <div className="note-lock">
            <LockIcon size={18} color="#6b5a48" />
            <div className="grow">
              <b>
                続き（{n.sections.length - 1}項目・要点{n.points.length}個・ひっかけ{n.traps.length}個）は完全版で読めます
              </b>
            </div>
            <button className="btn gold sm" style={{ width: 'auto' }} onClick={() => askFull(`「${topic}」の要点ノートの続きと、この階の冒険が開きます。`)}>
              見る
            </button>
          </div>
        )}
      </div>
      <button className="btn" style={{ marginTop: 12 }} onClick={() => startBattle({ kind: 'practice', ids: practiceOrder(data, topicQuestions(field, topic)).ids, title: '過去問道場', sub: topic })}>
        このテーマの過去問を解く（無料） ›
      </button>
      {open && (
        <>
          {n.formulas && n.formulas.length > 0 && (
            <div className="panel">
              <h3>覚える式</h3>
              {n.formulas.map((x) => (
                <div key={x} className="formula">
                  {x}
                </div>
              ))}
            </div>
          )}
          <div className="panel">
            <h3>試験に出る要点</h3>
            <ol className="note-list">
              {n.points.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </div>
          <div className="panel">
            <h3>ひっかけに注意</h3>
            <ul className="note-list trap">
              {n.traps.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
