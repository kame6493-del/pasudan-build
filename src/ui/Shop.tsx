import { shownPrice } from '../platform/billing';
import { FREE_DAILY } from '../domain/game';
import { QUESTIONS } from '../domain/data';
import { art, HEROES, lookState, PETS, type Look } from '../domain/world';
import { play } from '../platform/sound';
import { LockIcon } from './icons';
import { BOND_STEPS, bondLevel, gaugeNeed, PET_SKILL, SKILL_INFO } from '../domain/gimmick';
import { useState } from 'react';
import { useStore } from './store';

function PetSkillNote({ petId, bondPts }: { petId: string; bondPts: number }) {
  const p = PETS.find((x) => x.id === petId) ?? PETS[0];
  const sk = SKILL_INFO[PET_SKILL[p.id] ?? 'heal'];
  const lv = bondLevel(bondPts);
  const nextAt = BOND_STEPS[lv];
  return (
    <div className="pet-skill">
      <img src={p.img} alt="" />
      <div className="grow">
        <b>
          {p.name}の技「{sk.name}」
        </b>
        <span className="small">{sk.note(lv)}（{gaugeNeed(lv)}問正解でたまる）</span>
        <span className="small muted">
          なかよしレベル {lv}
          {nextAt !== undefined ? `（つぎまで あと${nextAt - bondPts}問の正解）` : '（最大）'}
        </span>
      </div>
    </div>
  );
}

/** 着がえの1マス。札で「無料 / コイン / 有料(見た目セット)」が一目で分かるようにする */
function LookTile({ l, on, onPick }: { l: Look; on: boolean; onPick: () => void }) {
  const { data } = useStore();
  const st = lookState(l, data.owned.looks, data.unlocked);
  return (
    <button className={`look ${on ? 'on' : ''} ${st === 'paid' ? 'paid' : ''}`} onClick={onPick} aria-label={st === 'paid' ? `${l.name}（見た目セット・有料）` : l.name}>
      {st === 'paid' && (
        <span className="tag paid">
          <LockIcon size={9} /> 有料
        </span>
      )}
      {st === 'coin' && (
        <span className="tag coin">
          <img src={art('coin')} alt="" />
          {l.price}
        </span>
      )}
      {st === 'free' && <span className="tag free">無料</span>}
      <img src={l.img} alt="" style={st === 'paid' || st === 'coin' ? { filter: 'grayscale(.6)' } : undefined} />
      {l.name}
      {st === 'paid' && <span className="look-sub">見た目セット</span>}
    </button>
  );
}

export function Shop() {
  const { data, billing, buy, update, toast, restorePurchases, confirm } = useStore();
  const price = (p: 'full' | 'looks' | 'bundle') => shownPrice(billing, p);
  const [flash, setFlash] = useState(false);

  const has = (l: Look) => {
    const st = lookState(l, data.owned.looks, data.unlocked);
    return st === 'free' || st === 'owned';
  };
  /** 見た目セットの売り場へ移る(購入はそこのボタンを押した時だけ) */
  const showLooksSet = () => {
    document.getElementById('looks-set')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1600);
  };
  const choose = async (kind: 'hero' | 'pet', l: Look) => {
    if (has(l)) {
      update((d) => ({ ...d, [kind]: l.id }));
      void play('tap');
      return;
    }
    if (l.looks) {
      void play('tap');
      const ok = await confirm({
        title: '見た目セット（有料）',
        body: `「${l.name}」は、見た目セット（買い切りの課金）を買うと使えるようになります。強さは変わりません。`,
        ok: '売り場を見る',
        cancel: 'とじる',
      });
      if (ok) showLooksSet();
      return;
    }
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

      <div className="panel" id="kigae">
        <h3>
          <img src={(HEROES.find((h) => h.id === data.hero) ?? HEROES[0]).img} alt="" style={{ height: 28 }} />
          主人公・相棒の着がえ
        </h3>
        <div className="muted small">タップでえらぶ。お金で回すガチャはありません。</div>
        <div className="look-legend">
          <span>
            <i className="tag free">無料</i>すぐ使える
          </span>
          <span>
            <i className="tag coin">
              <img src={art('coin')} alt="" />
            </i>
            コインで解放
          </span>
          <span>
            <i className="tag paid">
              <LockIcon size={9} /> 有料
            </i>
            見た目セットで使える
          </span>
        </div>
        <div className="muted small" style={{ marginTop: 8, fontWeight: 800 }}>
          主人公
        </div>
        <div className="looks">
          {HEROES.map((l) => (
            <LookTile key={l.id} l={l} on={data.hero === l.id} onPick={() => void choose('hero', l)} />
          ))}
        </div>
        <div className="muted small" style={{ marginTop: 10, fontWeight: 800 }}>
          相棒
        </div>
        <div className="looks">
          {PETS.map((l) => (
            <LookTile key={l.id} l={l} on={data.pet === l.id} onPick={() => void choose('pet', l)} />
          ))}
        </div>
        <PetSkillNote petId={data.pet} bondPts={data.petBond?.[data.pet] ?? 0} />
      </div>

      {!data.owned.full && !data.owned.looks && (
        <div className="panel shop-card" style={{ background: 'linear-gradient(180deg,#43381a,#2f2712)', borderColor: '#d29a1e' }}>
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
        <p className="muted small" style={{ margin: '0 0 8px' }}>過去問道場（{QUESTIONS.length}問・解説つき）は無料で1日{FREE_DAILY}問まで解けます。</p>
        <Buy p="full" />
      </div>

      <div className={`panel shop-card ${flash ? 'flash' : ''}`} id="looks-set">
        <h2>見た目セット（買い切り）</h2>
        <div className="muted small">主人公の見た目と相棒が増えます。買うと、上の「着がえ」でえらべます。</div>
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
          主人公の見た目を変えても、強さ（ステータス）は変わりません。相棒はそれぞれ違う技を1つ持ちます（どの相棒も同じくらいの強さで、つれて正解するほどなかよくなって技が育ちます）。
        </p>
      </div>

      <button className="btn paper sm" style={{ marginTop: 12 }} onClick={() => void restorePurchases()}>
        購入を復元する
      </button>
      <div style={{ height: 8 }} />
    </>
  );
}
