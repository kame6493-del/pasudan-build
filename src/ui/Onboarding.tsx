import { useState } from 'react';
import { addDays, daysBetween, QUESTIONS, todayKey } from '../domain/data';
import { art, HEROES, PETS } from '../domain/world';
import { play } from '../platform/sound';
import { useStore } from './store';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export function Calendar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [y0, m0] = value.split('-').map(Number);
  const [ym, setYm] = useState({ y: y0, m: m0 });
  const first = new Date(ym.y, ym.m - 1, 1);
  const days = new Date(ym.y, ym.m, 0).getDate();
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (n: number) => {
    const d = new Date(ym.y, ym.m - 1 + n, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() + 1 });
  };
  const today = todayKey();
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', fontWeight: 800, marginBottom: 6 }}>
        <button className="btn paper sm" style={{ width: 44 }} onClick={() => shift(-1)} aria-label="前の月">
          ‹
        </button>
        <span>
          {ym.y}年{ym.m}月
        </span>
        <button className="btn paper sm" style={{ width: 44 }} onClick={() => shift(1)} aria-label="次の月">
          ›
        </button>
      </div>
      <div className="cal">
        {WEEK.map((w, i) => (
          <span key={w} className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = `${ym.y}-${String(ym.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const past = key < today;
          return (
            <button key={i} className={`${key === value ? 'on' : ''} ${i % 7 === 0 ? 'sun' : i % 7 === 6 ? 'sat' : ''}`} disabled={past} style={past ? { opacity: 0.3 } : undefined} onClick={() => onChange(key)}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Onboarding() {
  const { data, update, go } = useStore();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(data.examDate ?? addDays(todayKey(), 90));
  const [hero, setHero] = useState(data.hero);
  const [pet, setPet] = useState(data.pet);
  // 試験日の画面で「あとで」を押したら試験日は保存しない
  const [skipDate, setSkipDate] = useState(false);
  const left = daysBetween(todayKey(), date);
  const heroLook = HEROES.find((h) => h.id === hero)!;
  const petLook = PETS.find((p) => p.id === pet)!;

  const finish = (withDate: boolean) => {
    update((d) => ({ ...d, onboarded: true, examDate: withDate ? date : d.examDate, hero, pet }));
    void play('decide');
    go({ name: 'tab', tab: 'dungeon' }, true);
  };

  return (
    <>
      <div className="scene-bg" style={{ backgroundImage: `url(${art('bg_home')})` }} />
      <div className="scroll" style={{ paddingTop: 'calc(var(--safe-t) + 10px)' }}>
        <div className="center">
          <img src={art('logo')} alt="パスダン" style={{ height: 96, filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.4))' }} />
        </div>
        <div className="panel">
          <div className="steps">
            {[1, 2, 3].map((n) => (
              <i key={n} className={n === step ? 'on' : ''}>
                {n}
              </i>
            ))}
          </div>
          {step === 1 && (
            <>
              <h2 style={{ justifyContent: 'center' }}>まずは試験日を決めよう</h2>
              <p className="muted center" style={{ marginTop: 0 }}>
                試験日までの日数と、本番の予想点を毎日表示します。あとから変えられます。
              </p>
              <Calendar value={date} onChange={setDate} />
              <div className="panel row" style={{ background: '#fffdf6' }}>
                <img src={art('hero_hood')} alt="" style={{ height: 64 }} />
                <div className="grow">
                  <div className="muted">試験日まで</div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>
                    あと <span className="big-num" style={{ fontSize: 40 }}>{left}</span> 日
                  </div>
                </div>
              </div>
              <div className="btns">
                <button
                  className="btn paper"
                  style={{ flex: '0 0 34%' }}
                  onClick={() => {
                    setSkipDate(true);
                    setStep(2);
                  }}
                >
                  あとで
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    void play('decide');
                    setSkipDate(false);
                    setStep(2);
                  }}
                >
                  つぎへ ›
                </button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 style={{ justifyContent: 'center' }}>主人公をえらぶ</h2>
              <div className="grid3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {HEROES.map((h) => {
                  const lockedLook = (h.price > 0 && !data.unlocked.includes(h.id)) || (h.looks && !data.owned.looks);
                  return (
                    <button key={h.id} className={`pick ${hero === h.id ? 'on' : ''}`} disabled={lockedLook} style={lockedLook ? { opacity: 0.55 } : undefined} onClick={() => {
                        void play('select');
                        setHero(h.id);
                      }}>
                      {lockedLook && <span className="tag">{h.looks ? '見た目セット' : `${h.price}コイン`}</span>}
                      <img src={h.img} alt="" />
                      {h.name}
                      <div className="muted small">{h.note}</div>
                    </button>
                  );
                })}
              </div>
              <h3 style={{ justifyContent: 'center', marginTop: 14 }}>相棒をえらぶ</h3>
              <div className="grid3">
                {PETS.filter((p) => p.price === 0 && !p.looks).map((p) => (
                  <button key={p.id} className={`pick ${pet === p.id ? 'on' : ''}`} onClick={() => {
                    void play('select');
                    setPet(p.id);
                  }}>
                    <img src={p.img} alt="" style={{ height: 60 }} />
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="muted small center">ほかの見た目はショップで増やせます（強さは変わりません）</p>
              <div className="btns">
                <button className="btn paper" style={{ flex: '0 0 34%' }} onClick={() => setStep(1)}>
                  もどる
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    void play('decide');
                    setStep(3);
                  }}
                >
                  決定 ›
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2 style={{ justifyContent: 'center' }}>じゅんびOK!</h2>
              <div className="dungeon-card" style={{ backgroundImage: `url(${art('bg_forest')})`, height: 190 }}>
                <img src={heroLook.battle} alt="" style={{ position: 'absolute', left: 30, bottom: 8, height: 120 }} />
                <img src={petLook.img} alt="" style={{ position: 'absolute', left: 140, bottom: 10, height: 56 }} />
                <div className="bubble" style={{ position: 'absolute', right: 10, top: 10, maxWidth: 190 }}>
                  よろしく！
                  <br />
                  いっしょに合格をめざそう！
                </div>
              </div>
              <p className="muted" style={{ lineHeight: 1.7 }}>
                正解すると攻撃、まちがえると反撃を受けます。まちがえた問題は「苦手」に入り、2回続けて正解すると消えます。
              </p>
              <p className="muted small" style={{ lineHeight: 1.7, marginTop: 0 }}>
                じっくり解きたい時は、ホームの「過去問道場」へ。{QUESTIONS.length}問すべてを解説つきで、無料で解けます。
              </p>
              <div className="btns">
                <button className="btn paper" style={{ flex: '0 0 34%' }} onClick={() => setStep(2)}>
                  もどる
                </button>
                <button className="btn gold" onClick={() => finish(!skipDate)}>
                  冒険をはじめる
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
