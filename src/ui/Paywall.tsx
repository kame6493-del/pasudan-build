import { CONFIG } from '../config';
import { QUESTIONS, TERMS } from '../domain/data';
import { FREE_EXAMS, freeFloorCount, freeNoteCount, predict } from '../domain/game';
import { art, DUNGEONS, FIELDS } from '../domain/world';
import type { Product } from '../platform/billing';
import { Check, LockIcon } from './icons';
import { useStore } from './store';

/** 完全版で増えること。絵と一言で、何ができるようになるかが一目で分かるように */
const FEATURES = [
  { img: art('mon_gearknight'), t: '全30階を冒険', d: '城と塔の中ボスまで' },
  { img: art('boss_celes'), t: '模試ボス 何回でも', d: '本番形式・合否と足切り' },
  { img: art('tab_chart'), t: '分野別の予想点', d: '推移と30テーマの分析' },
  { img: art('crown'), t: 'カードが金に進化', d: `${TERMS.length}枚の図鑑を完成` },
];

export function Paywall({ reason, onClose }: { reason: string; onClose: () => void }) {
  const { data, billing, buy, go, restorePurchases } = useStore();
  const price = (p: Product) => (billing.status === 'ready' ? billing.items[p].price : CONFIG.products[p].fallbackPrice);
  const p = predict(data);
  const can = billing.status === 'ready';
  const allFloors = FIELDS.reduce((n, f) => n + DUNGEONS[f].floors.length, 0);

  // 各欄は文節の配列。文節の途中では折り返さない(<wbr> の所だけで折る)
  const rows: [string[], string[], string[]][] = [
    [['過去問道場'], [`${QUESTIONS.length}問`, '解説つき'], [`${QUESTIONS.length}問`, '解説つき']],
    [['ダンジョン'], [`${freeFloorCount()}階`, '（森の全階と', '城・塔の', '3階ずつ）'], [`全${allFloors}階`]],
    [['模擬試験', 'ボス'], [`${FREE_EXAMS}回`], ['何回でも']],
    [['予想点'], ['総合だけ'], ['分野別・', '推移']],
    [['テーマ別の', '正答率'], ['低い', '3テーマ'], [`${allFloors}テーマ`]],
    [['要点ノート'], [`${freeNoteCount()}テーマ`], [`${allFloors}テーマ`]],
    [['用語カード'], ['銀まで'], ['金に進化']],
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
                  <Check color="var(--green)" /> {cell(b)}
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
        <div className="btns">
          <button
            className="btn paper sm"
            onClick={() => {
              onClose();
              go({ name: 'kakomon' });
            }}
          >
            過去問道場へ
          </button>
          <button className="btn paper sm" onClick={onClose}>
            あとで
          </button>
        </div>
        <button className="pw-restore" onClick={() => void restorePurchases()}>
          <LockIcon size={11} color="#8d8174" /> 購入を復元する
        </button>
      </div>
    </div>
  );
}
