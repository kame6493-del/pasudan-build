import { addDays, todayKey } from '../domain/data';
import { accuracy, levelOf, PASS_TOTAL, predict, topicStats } from '../domain/game';
import { art, FIELDS, FIELD_LABEL } from '../domain/world';
import { LockIcon } from './icons';
import { useStore } from './store';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

export function Stats() {
  const { data, askFull, go } = useStore();
  const today = todayKey();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const counts = week.map((k) => data.days[k]?.n ?? 0);
  const max = Math.max(10, ...counts);
  const total = Object.values(data.qs).reduce((s, x) => s + x.n, 0);
  const p = predict(data);
  const lv = levelOf(data.xp);
  // 予想点の推移（記録がある日だけ。最大14日）
  const trend = Object.keys(data.days)
    .sort()
    .filter((k) => typeof data.days[k].score === 'number')
    .slice(-14)
    .map((k) => ({ k, v: data.days[k].score as number }));

  return (
    <>
      <div className="title-sign">
        <span className="sign">成績</span>
      </div>
      <div className="panel">
        <div className="row">
          <LvBadge lv={lv.lv} />
          <div className="grow">
            <b style={{ fontSize: 20 }}>Lv.{lv.lv}</b>
            <div className="muted small">
              次のレベルまで {lv.into}/{lv.need}
            </div>
            <div className="bar" style={{ marginTop: 4 }}>
              <i style={{ width: `${(lv.into / lv.need) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
      <div className="panel">
        <h3>
          <img src={art('crown')} alt="" style={{ height: 22 }} />
          分野別 正答率
        </h3>
        <div className="score-cols">
          {FIELDS.map((f) => {
            const a = accuracy(data, f);
            const pct = a.n ? Math.round((a.c / a.n) * 100) : 0;
            return (
              <div key={f} className="kpi" style={{ textAlign: 'center' }}>
                <img src={art(`book_${f}`)} alt="" style={{ height: 30 }} />
                <div className="nowrap" style={{ fontSize: 12, letterSpacing: '-0.02em' }}>{FIELD_LABEL[f]}</div>
                {a.n ? <b style={{ color: `var(--${f[0]})` }}>{pct}%</b> : <b className="unmeasured">未計測</b>}
                <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
                  <i style={{ display: 'block', width: 18, height: `${pct * 0.6}px`, background: `var(--${f[0]})`, borderRadius: 4 }} />
                  <i style={{ display: 'block', width: 18, height: '36px', background: '#d8d2e2', borderRadius: 4 }} title="合格の目安 60%" />
                </div>
                <div className="muted small">
                  {a.n}回中 {a.c}回正解
                </div>
              </div>
            );
          })}
        </div>
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          灰色の棒は合格の目安（60%）です。
        </p>
      </div>

      <div className="panel">
        <h3>最近の学習数（1週間）</h3>
        <div className="chart">
          {week.map((k, i) => {
            const [y, m, d] = k.split('-').map(Number);
            return (
              <div key={k}>
                <i style={{ height: `${(counts[i] / max) * 90 + 2}px`, opacity: k === today ? 1 : 0.8 }}>
                  <b>{counts[i] || ''}</b>
                </i>
                <span>
                  {m}/{d}
                </span>
                <span>({WD[new Date(y, m - 1, d).getDay()]})</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <h3>予想点の推移</h3>
        {data.owned.full ? (
          trend.length >= 2 ? (
            <Trend points={trend} />
          ) : (
            <p className="muted small">2日分の記録がたまると線で出ます。今の予想点: {p.total ?? '未計測'}</p>
          )
        ) : (
          <button className="btn paper sm" onClick={() => askFull('予想点の推移などのくわしい分析は完全版で見られます。')}>
            <LockIcon color="#6b5a48" /> くわしい分析は完全版
          </button>
        )}
      </div>

      <div className="panel">
        <h3>テーマ別の正答率（低い順）</h3>
        <div className="muted small" style={{ marginBottom: 6 }}>
          3回以上解いたテーマだけ並べます。タップで要点ノートへ。
        </div>
        {(() => {
          const rows = topicStats(data)
            .filter((r) => r.n >= 3)
            .sort((a, b) => a.c / a.n - b.c / b.n);
          if (!rows.length) return <p className="muted small">まだ記録がありません。</p>;
          const shown = data.owned.full ? rows : rows.slice(0, 3);
          return (
            <>
              {shown.map((r) => {
                const pct = Math.round((r.c / r.n) * 100);
                return (
                  <button key={r.topic} className="topic-row" onClick={() => go({ name: 'note', field: r.field, topic: r.topic, back: { name: 'tab', tab: 'stats' } })}>
                    <span className={`dot ${r.field}`} />
                    <span className="grow">{r.topic}</span>
                    <span className="bar" style={{ width: 90, height: 10 }}>
                      <i style={{ width: `${pct}%`, background: pct < 60 ? 'var(--red)' : 'var(--green)' }} />
                    </span>
                    <b style={{ width: 44, textAlign: 'right', color: pct < 60 ? 'var(--red)' : 'var(--ink)' }}>{pct}%</b>
                  </button>
                );
              })}
              {!data.owned.full && rows.length > 3 && (
                <button className="btn paper sm" style={{ marginTop: 8 }} onClick={() => askFull('30テーマすべての正答率と、予想点の推移を見られます。弱いテーマから順につぶすのが合格への近道です。')}>
                  <LockIcon color="#6b5a48" /> 残り{rows.length - 3}テーマは完全版で
                </button>
              )}
            </>
          );
        })()}
      </div>

      <div className="kpis" style={{ marginTop: 12 }}>
        <div className="kpi">
          <img src={art('combo_10')} alt="" style={{ height: 30, float: 'right' }} />
          ベストコンボ
          <b>{data.bestCombo}問</b>
        </div>
        <div className="kpi">
          総解答数
          <b>{total}問</b>
        </div>
        <div className="kpi">
          <img src={art('tab_nigate')} alt="" style={{ height: 30, float: 'right' }} />
          苦手克服数
          <b style={{ color: 'var(--m)' }}>{data.weakClearedTotal}問</b>
        </div>
        <div className="kpi">
          <img src={art('boss_celes')} alt="" style={{ height: 30, float: 'right' }} />
          模擬試験
          <b>{data.exams.length ? `${Math.max(...data.exams.map((e) => e.total))}点` : 'まだ'}</b>
          <span className="muted small">{data.exams.length}回 / 合格 {data.exams.filter((e) => e.pass).length}回</span>
        </div>
      </div>
      <div style={{ height: 8 }} />
    </>
  );
}

/** レベルの盾。数字は絵に描かず、いまのレベルを文字で重ねる */
export function LvBadge({ lv }: { lv: number }) {
  const n = String(lv);
  const fs = n.length >= 3 ? 19 : n.length === 2 ? 24 : 27;
  return (
    <svg className="lv-badge" viewBox="0 0 48 54" role="img" aria-label={`レベル ${lv}`}>
      <defs>
        <linearGradient id="lvb-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset=".5" stopColor="#f2b632" />
          <stop offset="1" stopColor="#b8730e" />
        </linearGradient>
        <linearGradient id="lvb-in" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fb2ff" />
          <stop offset=".55" stopColor="#2a73e6" />
          <stop offset="1" stopColor="#173f99" />
        </linearGradient>
      </defs>
      <path d="M24 1.5 45 13.5v27L24 52.5 3 40.5v-27z" fill="url(#lvb-rim)" stroke="#5a3a08" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M24 6.5 40.5 16v22L24 47.5 7.5 38V16z" fill="url(#lvb-in)" stroke="#0d2e73" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M24 6.5 40.5 16v6C30 18 18 18 7.5 22v-6z" fill="#fff" opacity=".18" />
      <text x="24" y="19.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#d8ecff" fontFamily="PD, sans-serif">
        Lv
      </text>
      <text x="24" y={n.length >= 3 ? 37 : 38.5} textAnchor="middle" fontSize={fs} fontWeight="900" fill="#fff" stroke="#0d2e73" strokeWidth="2.4" paintOrder="stroke" fontFamily="PD, sans-serif">
        {n}
      </text>
    </svg>
  );
}

function Trend({ points }: { points: { k: string; v: number }[] }) {
  const W = 320;
  const H = 150;
  const lo = 0;
  const hi = 1000;
  const x = (i: number) => 30 + (i / Math.max(1, points.length - 1)) * (W - 50);
  const y = (v: number) => H - 20 - ((v - lo) / (hi - lo)) * (H - 36);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="予想点の推移">
      {[200, 400, 600, 800].map((v) => (
        <g key={v}>
          <line x1="30" x2={W - 10} y1={y(v)} y2={y(v)} stroke={v === PASS_TOTAL ? '#e0453a' : '#e6d9bd'} strokeDasharray={v === PASS_TOTAL ? '5 4' : undefined} />
          <text x="2" y={y(v) + 4} fontSize="10" fill="#6b5a48">
            {v}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke="#2f7ff0" strokeWidth="3" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.k} cx={x(i)} cy={y(p.v)} r="4" fill="#fff" stroke="#2f7ff0" strokeWidth="2.5" />
      ))}
      <text x={x(points.length - 1)} y={y(points[points.length - 1].v) - 9} fontSize="13" fontWeight="900" textAnchor="end" fill="#1656c4">
        {points[points.length - 1].v}
      </text>
    </svg>
  );
}
