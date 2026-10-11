import { CONFIG } from '../config';
import { QUESTIONS } from '../domain/data';
import { art, HEROES, PETS, type Look } from '../domain/world';
import { play } from '../platform/sound';
import { LockIcon } from './icons';
import { useStore } from './store';

export function Shop() {
  const { data, billing, buy, update, toast, restorePurchases } = useStore();
  const price = (p: 'full' | 'looks' | 'bundle') => (billing.status === 'ready' ? billing.items[p].price : CONFIG.products[p].fallbackPrice);

  const has = (l: Look) => (l.looks ? data.owned.looks : l.price === 0 || data.unlocked.includes(l.id));
  const choose = (kind: 'hero' | 'pet', l: Look) => {
    if (has(l)) {
      update((d) => ({ ...d, [kind]: l.id }));
      void play('tap');
      return;
    }
    if (l.looks) return toast('見た目セットで使えるようになります');
    if (data.coins < l.price) return toast(`コインが足りません（あと${l.price - data.coins}）`);
    update((d) => ({ ...d, coins: d.coins - l.price, unlocked: [...d.unlocked, l.id], [kind]: l.id }));
    void play('coin');
    toast(`${l.name}を手に入れた！`);
  };

  const Buy = ({ p }: { p: 'full' | 'looks' }) =>
    data.owned[p] ? (
      <button className="btn" disabled>
        購入済み
      </button>
    ) : billing.status === 'unavailable' ? (
      <button className="btn" disabled>
        {billing.reason}
      </button>
    ) : (
      <button className="btn" disabled={billing.status === 'loading'} onClick={() => void buy(p)}>
        {price(p)}（買い切り）
      </button>
    );

  return (
    <>
      <div className="title-sign">
        <span className="sign">ショップ</span>
      </div>
      {!data.owned.full && !data.owned.looks && (
        <div className="panel shop-card" style={{ background: 'linear-gradient(180deg,#fff6d6,#ffe7a3)', borderColor: '#d29a1e' }}>
          <h2>まとめ買い（買い切り）</h2>
          <div className="muted small">完全版と見た目セットをいっしょに。別々に買うよりお得です。</div>
          <button className="btn gold" style={{ marginTop: 10 }} disabled={billing.status !== 'ready'} onClick={() => void buy('bundle')}>
            {billing.status === 'unavailable' ? billing.reason : `${price('bundle')}（買い切り）`}
          </button>
        </div>
      )}

      <div className="panel shop-card">
        <h2>完全版（買い切り）</h2>
        <span className="ribbon">冒険も模試も、ぜんぶ</span>
        <img src={art('hero_back')} alt="" style={{ position: 'absolute', right: 8, top: 40, height: 96, opacity: 0.95 }} />
        <ul style={{ paddingRight: 70 }}>
          <li>城と塔も全30階を冒険</li>
          <li>模擬試験ボスに何回でも挑戦</li>
          <li>分野別の予想点・推移・テーマ別の分析</li>
          <li>用語カードが金に進化</li>
        </ul>
        <p className="muted small" style={{ margin: '0 0 8px' }}>過去問道場（{QUESTIONS.length}問・解説つき）は無料のままずっと使えます。</p>
        <Buy p="full" />
      </div>

      <div className="panel shop-card">
        <h2>見た目セット（買い切り）</h2>
        <div className="muted small">主人公の見た目と相棒が増えます</div>
        <div className="looks">
          {[...HEROES, ...PETS]
            .filter((l) => l.looks)
            .map((l) => (
              <div key={l.id} className="look">
                <img src={l.img} alt="" />
                {l.name}
              </div>
            ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <Buy p="looks" />
        </div>
        <p className="muted small" style={{ margin: '8px 0 0' }}>
          見た目を変えても、強さ（ステータス）は変わりません。
        </p>
      </div>

      <div className="panel">
        <h3>
          <img src={art('coin')} alt="" style={{ height: 24 }} />
          コインで着がえ
        </h3>
        <div className="muted small">タップで選ぶ / コインで解放。お金で回すガチャはありません。</div>
        <div className="muted small" style={{ marginTop: 8, fontWeight: 800 }}>
          主人公
        </div>
        <div className="looks">
          {HEROES.map((l) => (
            <button key={l.id} className={`look ${data.hero === l.id ? 'on' : ''}`} onClick={() => choose('hero', l)}>
              {!has(l) && (
                <span className="tag">
                  {l.looks ? (
                    <>
                      <LockIcon size={9} /> セット
                    </>
                  ) : (
                    l.price
                  )}
                </span>
              )}
              <img src={l.img} alt="" style={has(l) ? undefined : { filter: 'grayscale(.6)' }} />
              {l.name}
            </button>
          ))}
        </div>
        <div className="muted small" style={{ marginTop: 10, fontWeight: 800 }}>
          相棒
        </div>
        <div className="looks">
          {PETS.map((l) => (
            <button key={l.id} className={`look ${data.pet === l.id ? 'on' : ''}`} onClick={() => choose('pet', l)}>
              {!has(l) && (
                <span className="tag">
                  {l.looks ? (
                    <>
                      <LockIcon size={9} /> セット
                    </>
                  ) : (
                    l.price
                  )}
                </span>
              )}
              <img src={l.img} alt="" style={has(l) ? undefined : { filter: 'grayscale(.6)' }} />
              {l.name}
            </button>
          ))}
        </div>
      </div>
      <button className="btn paper sm" style={{ marginTop: 12 }} onClick={() => void restorePurchases()}>
        購入を復元する
      </button>
      <div style={{ height: 8 }} />
    </>
  );
}
