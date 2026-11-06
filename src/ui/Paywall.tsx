import { TERMS } from '../domain/data';
import { FREE_DAILY, FREE_EXAMS, FREE_FOREST_FLOORS, FREE_TRIAL_FLOORS, FREE_UNITS, freeFloorCount, predict } from '../domain/game';
import { UNITS } from '../data/course';
import { art, DUNGEONS, FIELDS } from '../domain/world';
import { shownPrice, type Product } from '../platform/billing';
import { Check, LockIcon } from './icons';
import { useStore, type PaywallPreview } from './store';

/** 完全版で増えること。大きな利点3つ(2026-11-04: 無料と同じ物は並べない) */
const FEATURES = [
  { img: art('boss_celes'), t: '本番形式の模擬試験を何回でも', d: '100問・120分。合否と分野ごとの足切りまで判定' },
  { img: art('mon_gearknight'), t: '全30階と、分野別の集中', d: '苦手な分野だけをまとめて解いて、弱点をつぶす' },
  { img: art('owl_teacher'), t: `ゼロから学ぶ道 全${UNITS.length}単元`, d: `やさしい説明と用語カード${TERMS.length}枚を全部` },
];

export function Paywall({ reason, preview, onClose }: { reason: string; preview?: PaywallPreview; onClose: () => void }) {
  const { data, billing, buy, restorePurchases } = useStore();
  const price = (p: Product) => shownPrice(billing, p);
  const p = predict(data);
  const can = billing.status === 'ready';
  const allFloors = FIELDS.reduce((n, f) => n + DUNGEONS[f].floors.length, 0);

  // 各欄は文節の配列。文節の途中では折り返さない(<wbr> の所だけで折る)。無料と同じ物は並べない
  const rows: [string[], string[], string[]][] = [
    [['模擬試験', 'ボス'], [`${FREE_EXAMS}回`], ['何回でも']],
    [['分野別の', '集中'], ['なし'], ['苦手な', '分野から']],
    [['ゼロから', '学ぶ道'], [`各分野`, `${FREE_UNITS}単元`], [`全${UNITS.length}単元`]],
    [['用語カード'], ['銀まで'], [`${TERMS.length}枚・`, '金に進化']],
    [['ダンジョン'], [`${freeFloorCount()}階`, `（森${FREE_FOREST_FLOORS}階・`, `城と塔`, `${FREE_TRIAL_FLOORS}階ずつ）`], [`全${allFloors}階`]],
    [['予想点'], ['総合だけ'], ['分野別・', '推移']],
    [['過去問道場'], [`1日${FREE_DAILY}問`], ['上限なし']],
  ];
  const cell = (parts: string[]) => parts.map((x, k) => (k ? [<wbr key={k} />, x] : x));

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet paywall" role="dialog" aria-label="完全版" onClick={(e) => e.stopPropagation()}>
        <div className="pw-head" style={{ backgroundImage: `url(${art('bg_pass')})` }}>
          <img src={art('hero_back')} alt="" />
          <div>
            <div className="pw-title">冒険も模試も、ぜんぶ</div>
            <div className="pw-sub">完全版（買い切り・ずっと使える）</div>
          </div>
        </div>
        <p className="pw-reason">{reason}</p>
        {preview && (
          <div className="pw-preview">
            <b>{preview.title}</b>
            {preview.imgs && preview.imgs.length > 0 && (
              <div className="pw-preview-imgs">
                {preview.imgs.map((x, i) => (
                  <img key={i} src={x} alt="" />
                ))}
              </div>
            )}
            {preview.lines?.map((x, i) => (
              <p key={i}>{x}</p>
            ))}
          </div>
        )}
        <div className="pw-feats">
          {FEATURES.map((f) => (
            <div key={f.t} className="pw-feat">
              <img src={f.img} alt="" />
              <b>{f.t}</b>
              <span>{f.d}</span>
            </div>
          ))}
        </div>
        {p.total !== null && p.total < 600 && (
          <div className="pw-score" style={{ marginTop: 10 }}>
            いまの予想点 <b>{p.total}</b> / 合格ライン 600。分野別の予想点で、どこを伸ばせば届くかが分かります。
          </div>
        )}
        <table className="pw-table">
          <thead>
            <tr>
              <th />
              <th>無料</th>
              <th className="full">完全版</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, a, b]) => (
              <tr key={k.join('')}>
                <td>{cell(k)}</td>
                <td>{cell(a)}</td>
                <td className="full">
                  <Check color="var(--hi-green)" /> {cell(b)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.owned.full ? (
          <button className="btn" disabled>
            完全版は購入済みです
          </button>
        ) : billing.status === 'unavailable' ? (
          <button className="btn" disabled>
            {billing.reason}
          </button>
        ) : (
          <>
            <button className="btn gold pw-buy" disabled={!can} onClick={() => void buy('full')}>
              完全版 {price('full')}
              <small>買い切り・追加の支払いなし</small>
            </button>
            {!data.owned.looks && (
              <button className="btn pw-buy" disabled={!can} onClick={() => void buy('bundle')}>
                完全版+見た目セット {price('bundle')}
                <small>見た目セットもいっしょに・買い切り</small>
              </button>
            )}
          </>
        )}
        <button className="btn paper sm" style={{ marginTop: 8 }} onClick={onClose}>
          あとで
        </button>
        <button className="pw-restore" onClick={() => void restorePurchases()}>
          <LockIcon size={11} color="#8d8174" /> 購入を復元する
        </button>
      </div>
    </div>
  );
}
