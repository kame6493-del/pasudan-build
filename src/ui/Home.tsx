import { daysBetween, QUESTIONS, todayKey } from '../domain/data';
import { day, FREE_DAILY, freeExamsLeft, freeFloorsOf, goals, liveStreak, PASS_FIELD, PASS_TOTAL, predict, progressOf } from '../domain/game';
import { art, DUNGEONS, FIELDS, FIELD_LABEL, HEROES, PETS } from '../domain/world';
import { Check, LockIcon } from './icons';
import { DAY_EVENT_INFO, dayEvent } from '../domain/gimmick';
import { useStore } from './store';
import { courseDone, nextUnit, unitOpen } from '../domain/course';
import { UNITS } from '../data/course';

export const FIELD_ICON: Record<string, string> = { strategy: art('book_strategy'), management: art('book_management'), technology: art('book_technology') };

export function Meter({ label, field, value }: { label: string; field: string; value: number | null }) {
  return (
    <div className="meter-row">
      <img src={FIELD_ICON[field]} alt="" style={{ height: 22 }} />
      <span>{label}</span>
      {value === null ? (
        <span className="val unmeasured">未計測</span>
      ) : (
        <span className="val" style={{ color: `var(--${field[0]}-tx)` }}>
          {value}
          <small>/1000</small>
        </span>
      )}
      <div className="bar" style={{ height: 12 }}>
        <i style={{ width: `${(value ?? 0) / 10}%`, background: `var(--${field[0]})` }} />
        <span className="line" style={{ left: '30%' }} />
      </div>
    </div>
  );
}

/** ホームのいちばん上に「今日やること」を1つだけ大きく出す(2026-11-04 持ち主「何から始めればいいか」) */
function TodayTask() {
  const { data, go, startBattle, askFull } = useStore();
  const nu = nextUnit(data);
  const weakN = Object.keys(data.weak).length;
  const done = courseDone(data);
  const p = predict(data);
  const learner = data.level === 'new' || (data.level !== 'past' && done > 0);
  let t: { k: string; title: string; sub: string; img: string; act: () => void };
  if (nu && learner && unitOpen(data, nu)) {
    t = { k: 'unit', title: `次は「${nu.title}」`, sub: `${FIELD_LABEL[nu.field]}・約${nu.mins}分。読んで、覚えて、解いて、戦う`, img: art('owl_teacher'), act: () => go(done === 0 && data.level === 'new' ? { name: 'about' } : { name: 'unit', id: nu.id }) };
  } else if (weakN >= 3) {
    t = { k: 'weak', title: `苦手を消そう(${weakN}問)`, sub: '2回続けて正解すると消えます。まちがえた所が一番のびしろ', img: art('ui_devil'), act: () => go({ name: 'tab', tab: 'nigate' }) };
  } else {
    t = { k: 'daily', title: '今日のダンジョン 10問', sub: 'いろいろな分野から10問。クリアで宝箱', img: art('hero_back'), act: () => startBattle({ kind: 'daily' }) };
  }
  return (
    <div className="panel today-task" style={{ marginTop: -18 }}>
      <h2 className="today-label">今日やること</h2>
      <button className="today-main" onClick={t.act}>
        <img src={t.img} alt="" />
        <span className="grow">
          <b>{t.title}</b>
          <span className="small">{t.sub}</span>
        </span>
        <span className="btn gold sm today-go">はじめる ›</span>
      </button>
      <div className="today-prog">
        {(
          [
            ['学ぶ道', done, UNITS.length, `${done} / ${UNITS.length}`, art('book_strategy'), 'var(--blue)', () => go({ name: 'course' })],
            ['予想点', p.total ?? 0, 1000, p.total === null ? 'まだ' : `${p.total} / 1000`, art('crown'), 'var(--green)', () => go({ name: 'tab', tab: 'stats' })],
            ['苦手', weakN, Math.max(weakN, 10), `${weakN}問`, art('ui_devil'), 'var(--red)', () => go({ name: 'tab', tab: 'nigate' })],
          ] as const
        ).map(([k, v, max, label, img, color, act]) => (
          <button key={k} className="today-bar" onClick={act}>
            <img src={img} alt="" />
            <span className="nowrap">{k}</span>
            <span className="bar grow" style={{ height: 10 }}>
              <i style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: color }} />
            </span>
            <b className="nowrap">{label}</b>
          </button>
        ))}
        {p.total !== null && <span className="small muted">合格の線は 600 点(3分野それぞれ 300 点以上)</span>}
      </div>
      {nu && learner && !unitOpen(data, nu) && (
        <button className="lock-row" onClick={() => askFull(`ゼロから学ぶ道の無料の単元を終えました。続きの「${nu.title}」から先は完全版で学べます。`, 'course')}>
          <LockIcon size={16} color="#6b5a48" />
          <span className="grow">次の単元「{nu.title}」は完全版</span>
          <span className="chev">›</span>
        </button>
      )}
    </div>
  );
}

export function Home() {
  const { data, startBattle, go, askFull, openExams, openSettings } = useStore();
  const p = predict(data);
  const dl = day(data);
  const streak = liveStreak(data);
  const left = data.examDate ? daysBetween(todayKey(), data.examDate) : null;
  const kako = progressOf(data, QUESTIONS);
  const examLeft = freeExamsLeft(data);
  const bestExam = data.exams.reduce((m, e) => Math.max(m, e.total), 0);

  return (
    <>
      <div className="home-hero" style={{ backgroundImage: `url(${art('bg_home')})` }}>
      </div>

      <TodayTask />

      <div className="panel center">
        <h2 style={{ justifyContent: 'center' }}>
          <img src={art('hero_back')} alt="" style={{ height: 30 }} />
          今日のダンジョン
        </h2>
        <div>
          <span className="big-num">10</span>
          <b style={{ fontSize: 24 }}> 問</b>
        </div>
        <div className="day-ev">
          <img src={art(DAY_EVENT_INFO[dayEvent()].img)} alt="" />
          <div>
            <b>きょうは{DAY_EVENT_INFO[dayEvent()].name}</b>
            <span>{DAY_EVENT_INFO[dayEvent()].note}</span>
          </div>
        </div>
        <p className="muted" style={{ margin: '4px 0 10px' }}>
          {dl.chest ? '今日の宝箱はゲット済み。もう一度いけます！' : 'クリアすると宝箱がもらえる！'}
        </p>
        <button className="btn gold" onClick={() => startBattle({ kind: 'daily' })}>
          <img src={art('hero_back')} alt="" />
          ダンジョンをはじめる
        </button>
      </div>

      <button className="panel kk-entry" onClick={() => go({ name: 'kakomon' })}>
        <img src={art('owl_teacher')} alt="" />
        <div className="grow">
          <div className="row" style={{ gap: 6 }}>
            <b style={{ fontSize: 18 }}>過去問道場</b>
            {!data.owned.full && <span className="chip free">1日{FREE_DAILY}問 無料</span>}
          </div>
          <div className="small muted">{QUESTIONS.length}問すべて解説つき。年度別・分野別に解ける</div>
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <div className="bar grow" style={{ height: 8 }}>
              <i style={{ width: `${(kako.done / kako.total) * 100}%` }} />
            </div>
            <span className="small nowrap" style={{ fontWeight: 800 }}>
              {kako.done}/{kako.total}
            </span>
          </div>
        </div>
        <span className="chev">›</span>
      </button>

      <div className="panel">
        <div className="row">
          <img src={art('flame')} alt="" style={{ height: 30 }} />
          <b style={{ fontSize: 20 }}>
            連続<span style={{ color: 'var(--hi-red)', fontSize: 26 }}>{streak}</span>日
          </b>
          <span className="muted small grow" style={{ textAlign: 'right' }}>
            {streak < 3 ? `あと${3 - streak}日で銀の宝箱` : streak < 7 ? `あと${7 - streak}日で金の宝箱` : '毎日 金の宝箱！'}
          </span>
        </div>
        <div className="chests">
          {[1, 2, 3, 5, 7].map((n) => (
            <div key={n} className={`${n === 7 ? 'big' : ''} ${streak >= n ? 'got' : ''}`}>
              <img src={art(n >= 7 ? 'chest_gold' : n >= 3 ? 'chest_silver' : 'chest_wood')} alt="" style={streak >= n ? undefined : { filter: 'grayscale(.7) opacity(.6)' }} />
              {n}日目{streak >= n && <> <Check size={11} /></>}
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>
          <img src={art('card_doc')} alt="" style={{ height: 26, borderRadius: 6 }} />
          今日の目標
        </h3>
        {goals(data).map((g) => (
          <div key={g.key} className={`goal ${g.now >= g.target ? 'done' : ''}`}>
            <span>{g.now >= g.target && <Check color="var(--hi-green)" />} {g.label}</span>
            <div className="bar">
              <i style={{ width: `${(g.now / g.target) * 100}%` }} />
            </div>
            <span className="small" style={{ textAlign: 'right' }}>
              {g.now}/{g.target}
            </span>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="row">
          <h3 className="grow" style={{ margin: 0 }}>
            本番の予想点
          </h3>
          {bestExam > 0 && (
            <span className="small" style={{ fontWeight: 800 }}>
              <img src={art('crown')} alt="" style={{ height: 16, verticalAlign: -3 }} /> 模擬試験ベスト {bestExam}
            </span>
          )}
        </div>
        <div style={{ margin: '4px 0' }}>
          {p.total === null ? (
            <span className="unmeasured" style={{ fontSize: 22 }}>
              未計測
            </span>
          ) : (
            <>
              <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--hi-blue)' }}>{p.total}</span>
              <b className="muted"> / 1000</b>
            </>
          )}
        </div>
        <div className="bar" style={{ height: 16 }}>
          <i style={{ width: `${(p.total ?? 0) / 10}%` }} />
          <span className="line" style={{ left: `${PASS_TOTAL / 10}%` }} />
        </div>
        <div className="muted small" style={{ textAlign: 'right' }}>
          合格ライン {PASS_TOTAL}
        </div>
        <div className="muted small" style={{ marginTop: 6 }}>
          分野別の予想点（各分野 {PASS_FIELD} 点以上が必要）
        </div>
        {data.owned.full ? (
          FIELDS.map((f) => <Meter key={f} label={FIELD_LABEL[f]} field={f} value={p.by[f]} />)
        ) : (
          <button className="lock-row" onClick={() => askFull('分野別の予想点で、足切り（各分野300点）に引っかかりそうな分野が分かります。予想点の推移やテーマ別の分析も見られます。', 'home')}>
            <LockIcon size={16} color="#6b5a48" />
            <span className="grow">分野別の予想点・足切り判定は完全版</span>
            <span className="chev">›</span>
          </button>
        )}
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          {p.total === null ? '各分野5問以上解くと予想点が出ます。' : '解いた問題の正誤から出した目安です（本番の採点方式とは違います）。'}
        </p>
      </div>


      {left !== null && (
        <div className="panel countdown">
          <img src={art('hourglass')} alt="" style={{ height: 46 }} />
          <div className="grow">
            {left > 0 ? (
              <>
                <div className="muted">試験日まで</div>
                <b style={{ fontSize: 20 }}>
                  あと{' '}
                  <span className="nowrap">
                    <span className="big-num" style={{ fontSize: 40 }}>{left}</span> 日
                  </span>
                </b>
              </>
            ) : left === 0 ? (
              <b style={{ fontSize: 22 }}>今日が試験日です</b>
            ) : (
              <>
                <b style={{ fontSize: 18 }}>試験日を過ぎました</b>
                <button className="btn paper sm" style={{ marginTop: 6, width: 'auto' }} onClick={openSettings}>
                  決めなおす
                </button>
              </>
            )}
          </div>
          <img src={art('mon_stump')} alt="" style={{ height: 64 }} />
          <div className="bubble small">
            {left > 0 ? (
              <>
                今日も
                <br />
                コツコツ！
              </>
            ) : left === 0 ? (
              <>
                落ち着いて
                <br />
                いこう！
              </>
            ) : (
              <>
                おつかれ
                <br />
                さま！
              </>
            )}
          </div>
        </div>
      )}

      {left === null && (
        <div className="panel countdown">
          <img src={art('hourglass')} alt="" style={{ height: 46 }} />
          <div className="grow">
            <div className="muted">試験日</div>
            <b style={{ fontSize: 18 }}>まだ決めていません</b>
          </div>
          <button className="btn paper sm" style={{ width: 'auto' }} onClick={openSettings}>
            決める
          </button>
        </div>
      )}

      <div className="ghost-card">
        <h3>ゴースト対戦</h3>
        <p style={{ margin: '6px 0 10px', fontWeight: 800, fontSize: 13, maxWidth: 210, lineHeight: 1.5 }}>
          過去の自分と10問で勝負！
          <br />
          {data.ghost ? `ゴーストの記録: ${data.ghost.correct}問正解 ${(data.ghost.splits[data.ghost.splits.length - 1] / 1000).toFixed(0)}秒` : (
            <>
              まだ記録がありません。<span className="nowrap">まずは1回目！</span>
            </>
          )}
        </p>
        <button
          className="btn ghost sm"
          style={{ width: 150 }}
          onClick={() => startBattle({ kind: 'ghost' })}
        >
          挑戦する ›
        </button>
        <img src={art('boss_hood')} alt="" />
      </div>

      <button className="panel kigae-entry" onClick={() => go({ name: 'tab', tab: 'shop' })}>
        <span className="pair">
          <img src={(HEROES.find((h) => h.id === data.hero) ?? HEROES[0]).img} alt="" />
          <img src={(PETS.find((x) => x.id === data.pet) ?? PETS[0]).img} alt="" />
        </span>
        <div className="grow">
          <b style={{ fontSize: 17 }}>主人公・相棒の着がえ</b>
          <div className="small muted">ショップでえらべます。無料・コインのほか、見た目セット（有料）の物もあります</div>
        </div>
        <span className="chev">›</span>
      </button>

      <div className="title-sign" style={{ marginTop: 18 }}>
        <span className="sign">ダンジョン</span>
      </div>
      {FIELDS.map((f) => {
        const dn = DUNGEONS[f];
        const locked = !data.owned.full;
        return (
          <button key={f} className={`dungeon-card ${locked ? 'locked' : ''}`} style={{ backgroundImage: `url(${dn.bg})` }} onClick={() => go({ name: 'map', field: f })}>
            <div className="plate">
              <img src={dn.book} alt="" style={{ height: 34 }} />
              <div className="grow">
                <b>{dn.name}</b>
                <div className="muted small">{dn.sub}</div>
              </div>
              {locked ? (
                <span className="lock">{freeFloorsOf(f)}階まで無料</span>
              ) : (
                <span className="chip gray" style={{ background: dn.color }}>
                  ★ {data.cleared[f]}/10階
                </span>
              )}
            </div>
          </button>
        );
      })}

      <div className="panel row" style={{ background: 'linear-gradient(180deg,#33285a,#261e45)', borderColor: '#7b5ad6' }}>
        <img src={art('boss_celes')} alt="" style={{ height: 76 }} />
        <div className="grow">
          <b style={{ fontSize: 17 }}>模擬試験ボス</b>
          <div className="muted small">本番と同じ100問・120分。総合600点・各分野300点で合格の扉が開く</div>
        </div>
      </div>
      <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => openExams()}>
        {data.examDraft ? '模擬試験の続きから' : data.owned.full ? '模擬試験に挑戦する' : examLeft > 0 ? `模擬試験に挑戦（無料であと${examLeft}回）` : <><LockIcon size={16} /> 模擬試験（完全版）</>}
      </button>
      {!data.owned.full && (
        <button className="panel upsell" style={{ marginTop: 14 }} onClick={() => askFull('模擬試験を何回でも、苦手な分野の集中、ゼロから学ぶ道の続き、全30階の冒険が開きます。', 'home')}>
          <img src={art('chest_gold')} alt="" />
          <div className="grow">
            <b>完全版でできること</b>
            <div className="small">模擬試験何回でも・分野別の集中・学ぶ道の全単元・全30階</div>
          </div>
          <span className="chev">›</span>
        </button>
      )}
      <div style={{ height: 10 }} />
    </>
  );
}
