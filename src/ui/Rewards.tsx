import { useEffect, useState } from 'react';
import { TERM_BY_ID } from '../domain/data';
import { heroAtk, heroHp } from '../domain/game';
import { art, HEROES, PETS } from '../domain/world';
import { cheer } from '../platform/native';
import { play } from '../platform/sound';
import { CARD_ART } from './QuestionView';
import { useStore, type Reward } from './store';

export function Rewards({ items, onDone }: { items: Reward[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const r = items[i];
  const { data } = useStore();
  const hero = HEROES.find((h) => h.id === data.hero) ?? HEROES[0];
  const pet = PETS.find((p) => p.id === data.pet) ?? PETS[0];

  useEffect(() => {
    if (!r) return;
    const s = r.kind === 'levelup' ? 'levelup' : r.kind === 'evolve' ? 'evolve' : r.kind === 'chest' ? 'chest' : r.kind === 'fail' ? null : 'coin';
    if (s) void play(s);
    if (r.kind === 'chest') window.setTimeout(() => void play('coin'), 500);
    if (r.kind !== 'fail') cheer();
  }, [i, r]);

  if (!r) return null;
  const next = () => (i + 1 >= items.length ? onDone() : setI(i + 1));

  return (
    <div className="overlay" onClick={next} role="dialog">
      {r.kind !== 'fail' && <div className="rays" />}
      {r.kind === 'clear' && (
        <>
          <div className="head sign" style={{ fontSize: 19, textAlign: 'center', width: 'auto', maxWidth: '92%' }}>
            {r.title}
          </div>
          <img src={hero.battle} alt="" style={{ height: 130, marginTop: 16, position: 'relative' }} />
          <Items coins={r.coins} xp={r.xp} cards={r.cards} />
        </>
      )}
      {r.kind === 'chest' && (
        <>
          <div className="fx-head">宝箱をゲット！</div>
          <Items coins={r.coins} xp={r.xp} cards={r.cards} />
          <img className="chest-big" src={art('chest_open')} alt={r.name} />
          <div className="sign" style={{ marginTop: 10, fontSize: 16, position: 'relative' }}>
            {r.name}を開けた！
          </div>
        </>
      )}
      {r.kind === 'levelup' && (
        <>
          <div className="fx-head">レベルアップ！</div>
          <div className="sign" style={{ marginTop: 6, fontSize: 18, position: 'relative' }}>
            Lv.{r.to} にレベルアップ！
          </div>
          <div className="row" style={{ position: 'relative', marginTop: 10 }}>
            <img src={pet.img} alt="" style={{ height: 60 }} />
            <img src={hero.img} alt="" style={{ height: 130 }} />
          </div>
          <div className="panel card-box">
            <h3 style={{ justifyContent: 'center' }}>ステータスが上がった！</h3>
            <div className="stat-up">
              <img src={art('ui_heart')} alt="" style={{ height: 20 }} />
              <span>HP</span>
              <span>{heroHp(r.from)}</span>
              <span>→</span>
              <span className="new">{heroHp(r.to)}</span>
              <span className="small" style={{ color: 'var(--green)' }}>
                (+{heroHp(r.to) - heroHp(r.from)})
              </span>
            </div>
            <div className="stat-up">
              <img src={art('combo_1')} alt="" style={{ height: 22 }} />
              <span>こうげき</span>
              <span>{heroAtk(r.from)}</span>
              <span>→</span>
              <span className="new">{heroAtk(r.to)}</span>
              <span className="small" style={{ color: 'var(--green)' }}>
                (+{heroAtk(r.to) - heroAtk(r.from)})
              </span>
            </div>
          </div>
        </>
      )}
      {r.kind === 'evolve' && <Evolve id={r.term} />}
      {r.kind === 'fail' && (
        <>
          <div className="fx-head" style={{ color: '#dfe3ff', WebkitTextStrokeColor: '#2e1d6b' }}>
            ざんねん…
          </div>
          <div className="panel card-box center">
            <h3 style={{ justifyContent: 'center' }}>{r.title}</h3>
            <p className="muted">まちがえた問題は「苦手」に入りました。復習の部屋で取り返そう！</p>
          </div>
        </>
      )}
      <button className="btn" style={{ position: 'relative', marginTop: 16, maxWidth: 260 }} onClick={next}>
        つぎへ
      </button>
    </div>
  );
}

function Items({ coins, xp, cards }: { coins: number; xp: number; cards: string[] }) {
  return (
    <div className="reward-items">
      {coins > 0 && (
        <div>
          <img src={art('coin_shine')} alt="" />+{coins}コイン
        </div>
      )}
      {xp > 0 && (
        <div style={{ animationDelay: '0.12s' }}>
          <img src={art('xp')} alt="" />+{xp}XP
        </div>
      )}
      {cards.slice(0, 3).map((id, n) => {
        const t = TERM_BY_ID.get(id);
        if (!t) return null;
        return (
          <div key={id} style={{ animationDelay: `${0.24 + n * 0.1}s` }}>
            <img src={CARD_ART[t.art]} alt="" style={{ borderRadius: 8, border: '3px solid #c9ccd6' }} />
            {t.name}
          </div>
        );
      })}
    </div>
  );
}

function Evolve({ id }: { id: string }) {
  const t = TERM_BY_ID.get(id);
  if (!t) return null;
  return (
    <>
      <div className="fx-head">カード進化！</div>
      <div className="row" style={{ position: 'relative', marginTop: 14, gap: 14 }}>
        <div className="tcard" style={{ width: 120 }}>
          <span className="rank">銀</span>
          <img className="art" src={CARD_ART[t.art]} alt="" />
          <div className="nm">{t.name}</div>
        </div>
        <b style={{ color: '#ffd149', fontSize: 34 }}>»</b>
        <div className="tcard gold" style={{ width: 140 }}>
          <span className="rank">金</span>
          <img className="art" src={CARD_ART[t.art]} alt="" />
          <div className="nm">{t.name}</div>
        </div>
      </div>
      <div className="panel card-box center">
        <b>カードが金に進化した！</b>
        <p className="small" style={{ margin: '6px 0 0', lineHeight: 1.6, textAlign: 'left' }}>
          {t.desc}
        </p>
      </div>
    </>
  );
}
