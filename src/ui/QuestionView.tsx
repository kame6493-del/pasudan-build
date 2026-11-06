import { useEffect, useState } from 'react';
import { choiceExplain, source, TERM_BY_ID, TERMS_OF_Q } from '../domain/data';
import { comboRows, formatQuestion, splitBlanks } from '../domain/format';
import type { Fig, Question } from '../domain/types';
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

/** 「［ a ］」に枠を付けて出す */
function Rich({ text }: { text: string }) {
  return (
    <>
      {splitBlanks(text).map((p, i) =>
        p.blank ? (
          <span key={i} className="blank">
            {p.t}
          </span>
        ) : (
          p.t
        ),
      )}
    </>
  );
}

/** 問題文: 文ごと・箇条ごとに区切って出す(文字は元のまま) */
export function QText({ text }: { text: string }) {
  const blocks = formatQuestion(text);
  return (
    <div className={`qtext${text.length > 140 ? ' long' : ''}`}>
      {blocks.map((b, i) => {
        const gap = 'gap' in b && b.gap ? ' gap' : '';
        if (b.kind === 'item')
          return (
            <div key={i} className={`qitem${gap}`}>
              <span className="ql">{b.label}</span>
              <span className="qt">
                <Rich text={b.text} />
              </span>
            </div>
          );
        if (b.kind === 'head')
          return (
            <div key={i} className={`qsub${gap}`}>
              {b.text}
            </div>
          );
        if (b.kind === 'note')
          return (
            <div key={i} className={`qnote${gap}`}>
              {b.text}
            </div>
          );
        if (b.kind === 'ask')
          return (
            <div key={i} className="qask">
              <Rich text={b.text} />
            </div>
          );
        return (
          <div key={i} className={`qp${gap}`}>
            <Rich text={b.text} />
          </div>
        );
      })}
    </div>
  );
}

function ChoiceText({ text }: { text: string }) {
  const rows = comboRows(text);
  if (!rows) return <span className="ct">{text}</span>;
  return (
    <span className="ct crows">
      {rows.map((r) => (
        <span key={r.label} className="crow">
          <span className="cl">{r.label}</span>
          <span>{r.text}</span>
        </span>
      ))}
    </span>
  );
}

/** 表のセル。"__文字__" は下線(主キー) */
function Cell({ text }: { text: string }) {
  const m = /^__(.+)__$/.exec(text);
  return <td className={text.length <= 10 ? 'nw' : undefined}>{m ? <u>{m[1]}</u> : text}</td>;
}

/** 問題の表。横に長い表は枠の中で横に動かせる */
function QTable({ rows, cap }: { rows: string[][]; cap?: string }) {
  return (
    <div className="qfig">
      {cap && <div className="qcap">{cap}</div>}
      <div className="table-wrap">
        <table className="qtable">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <Cell key={j} text={c} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 冊子から切り出した図。狭い画面では字が小さくなりすぎないところで止めて、横に動かせる */
function QImg({ f }: { f: Extract<Fig, { t: 'img' }> }) {
  return (
    <div className="qfig">
      <div className="fig-wrap">
        <img className="qimg" src={`./${f.src}`} alt={f.alt} width={f.w} height={f.h} style={{ maxWidth: `${Math.round(f.w / 2)}px`, minWidth: `${Math.round(f.w / 2.5)}px` }} />
      </div>
      {f.cap && <div className="qcap under">{f.cap}</div>}
    </div>
  );
}

export function QBody({ q }: { q: Question }) {
  return (
    <>
      <QText text={q.q} />
      {q.table && <QTable rows={q.table} />}
      {q.figs?.map((f, i) => (f.t === 'table' ? <QTable key={i} rows={f.rows} cap={f.cap} /> : <QImg key={i} f={f} />))}
      {q.code && <pre className="qcode">{q.code}</pre>}
    </>
  );
}

export function Choices({ q, picked, reveal, onPick, disabled }: { q: Question; picked: number | null; reveal: boolean; onPick: (i: number) => void; disabled?: boolean }) {
  // 短い選択肢だけの問題は、詰める時に2列にできる(index.css の .choices.can2)
  const can2 = q.choices.every((c) => c.length <= 14 && !/\n/.test(c) && !comboRows(c));
  return (
    <div className={`choices${can2 ? ' can2' : ''}`}>
      {q.choices.map((c, i) => {
        let cls = '';
        if (reveal) cls = i === q.answer ? 'ok' : i === picked ? 'ng' : 'dim';
        else if (picked === i) cls = 'picked';
        return (
          <button key={i} className={`choice ${cls}${c.length > 20 || comboRows(c) ? ' long' : ''}`} disabled={disabled || reveal} onClick={() => onPick(i)}>
            <span className="k">{KANA[i]}</span>
            <ChoiceText text={c} />
          </button>
        );
      })}
    </div>
  );
}

/** 選択肢の文を1行にまとめる(組合せの「a: … / b: …」もそのまま1行で) */
const oneLine = (t: string) => t.replace(/\s*\n\s*/g, ' ');

/** 答えたあとの解説。まちがえた時は、選んだ選択肢の解説を先に出す */
export function Explain({ q, ok, picked, weakAdded, onTerm }: { q: Question; ok: boolean; picked?: number | null; weakAdded?: boolean; onTerm?: (id: string) => void }) {
  const terms = (TERMS_OF_Q.get(q.id) ?? []).map((id) => TERM_BY_ID.get(id)!).filter(Boolean);
  const cx = choiceExplain(q);
  const mine = !ok && picked != null && picked !== q.answer ? cx[picked] : '';
  const [others, setOthers] = useState(false);
  // 次の問題では閉じた状態から
  useEffect(() => setOthers(false), [q.id]);
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
      {mine && picked != null && (
        <div className="mine-expl">
          <div className="mine-h">
            <span className="mine-tag">あなたの答え</span>
            <span className="k">{KANA[picked]}</span>
            <span className="mine-c">{oneLine(q.choices[picked])}</span>
          </div>
          <p>{mine}</p>
        </div>
      )}
      <p>
        <b>{mine ? `正解 ${KANA[q.answer]} の解説` : 'ポイント'}</b> {q.explain}
      </p>
      {cx.length > 0 && (
        <div className={`other-expl${others ? ' open' : ''}`}>
          <button className="other-btn" aria-expanded={others} onClick={() => setOthers((v) => !v)}>
            <span>ほかの選択肢の解説</span>
            <span className="other-arrow" aria-hidden="true">
              {others ? '▲ とじる' : '▼ ひらく'}
            </span>
          </button>
          {others && (
            <ul className="other-list">
              {q.choices.map((_, i) => {
                const right = i === q.answer;
                return (
                  <li key={i} className={right ? 'ok' : 'ng'}>
                    <span className="om" aria-label={right ? '正しい' : '誤り'}>
                      {right ? '◯' : '✕'}
                    </span>
                    <span className="k">{KANA[i]}</span>
                    <span className="ot">
                      {right ? '正解。理由は上の解説のとおりです。' : cx[i]}
                      {!ok && i === picked && <em className="you">あなたの答え</em>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
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
            この問題を<span style={{ color: 'var(--hi-red)' }}>苦手に追加</span>しました。2回続けて正解すると消えます。
          </span>
        </div>
      )}
      <div className="src">{source(q)}</div>
    </div>
  );
}
