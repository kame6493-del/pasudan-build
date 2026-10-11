import { source, TERM_BY_ID, TERMS_OF_Q } from '../domain/data';
import type { Question } from '../domain/types';
import { art, FIELD_LABEL } from '../domain/world';

const KANA = ['ア', 'イ', 'ウ', 'エ'];
export const CARD_ART: Record<string, string> = {
  doc: art('card_doc'),
  robot: art('card_robot'),
  chain: art('card_chain'),
  shield: art('card_shield'),
  chart: art('card_chart'),
  books: art('card_books'),
  db: art('card_db'),
};

export function QHead({ q, extra }: { q: Question; extra?: string }) {
  return (
    <div className="qhead">
      <span className={`chip ${q.field}`}>{FIELD_LABEL[q.field]}</span>
      <span className="grow">{extra ?? q.topic}</span>
      <span>
        {q.year} 問{q.no}
      </span>
    </div>
  );
}

export function QBody({ q }: { q: Question }) {
  return (
    <>
      <div className="qtext">{q.q}</div>
      {q.table && (
        <div className="table-wrap">
          <table className="qtable">
            <tbody>
              {q.table.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.code && <pre className="qcode">{q.code}</pre>}
    </>
  );
}

export function Choices({ q, picked, reveal, onPick, disabled }: { q: Question; picked: number | null; reveal: boolean; onPick: (i: number) => void; disabled?: boolean }) {
  return (
    <div className="choices">
      {q.choices.map((c, i) => {
        let cls = '';
        if (reveal) cls = i === q.answer ? 'ok' : i === picked ? 'ng' : 'dim';
        else if (picked === i) cls = 'picked';
        return (
          <button key={i} className={`choice ${cls}`} disabled={disabled || reveal} onClick={() => onPick(i)}>
            <span className="k">{KANA[i]}</span>
            <span>{c}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 答えたあとの解説 */
export function Explain({ q, ok, weakAdded, onTerm }: { q: Question; ok: boolean; weakAdded?: boolean; onTerm?: (id: string) => void }) {
  const terms = (TERMS_OF_Q.get(q.id) ?? []).map((id) => TERM_BY_ID.get(id)!).filter(Boolean);
  return (
    <div className="explain">
      <div className="owl-head">
        <img src={art('owl_teacher')} alt="" />
        <div className={`verdict ${ok ? 'ok' : 'ng'}`}>
          {ok ? '正解！' : 'ざんねん…'}
          <span className="small" style={{ color: 'var(--ink)' }}>
            正解は {KANA[q.answer]}
          </span>
        </div>
      </div>
      <p>
        <b>ポイント</b> {q.explain}
      </p>
      {terms.length > 0 && (
        <div className="mini-cards">
          {terms.map((t) => (
            <button key={t.id} className="mini-card" onClick={() => onTerm?.(t.id)}>
              <img src={CARD_ART[t.art]} alt="" />
              {t.name}
            </button>
          ))}
        </div>
      )}
      {!ok && weakAdded && (
        <div className="weak-note">
          <img src={art('tab_nigate')} alt="" />
          <span>
            この問題を<span style={{ color: 'var(--red)' }}>苦手に追加</span>しました。2回続けて正解すると消えます。
          </span>
        </div>
      )}
      <div className="src">{source(q)}</div>
    </div>
  );
}
