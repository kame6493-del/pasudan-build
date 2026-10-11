import { useEffect } from 'react';
import { floorOpen, floorPool, FREE_TRIAL_FLOORS, freeExamsLeft } from '../domain/game';
import type { Field } from '../domain/types';
import { DUNGEONS, EXAM_BOSS } from '../domain/world';
import { Check, LockIcon } from './icons';
import { useStore } from './store';

export function MapScreen({ field }: { field: Field }) {
  const { data, go, startBattle, askFull, openExams, toast } = useStore();
  const dn = DUNGEONS[field];
  const locked = field !== 'strategy' && !data.owned.full;
  const cleared = data.cleared[field];
  const now = Math.min(cleared, 9);

  useEffect(() => {
    // いま挑戦中の階が見えるところまで送る
    document.querySelector('.floor.now')?.scrollIntoView({ block: 'center' });
  }, []);

  const enter = (floor: number) => {
    if (!floorOpen(data, field, floor)) return askFull(`${dn.name}の第${FREE_TRIAL_FLOORS + 1}階から先の冒険は完全版で進めます。この分野の過去問は「過去問道場」で無料のまま全部解けます。`);
    if (floor > cleared) return toast(floor === cleared + 1 ? `第${floor}階をクリアすると進めます` : `第${cleared + 1}階から順にクリアすると進めます`);
    startBattle({ kind: 'floor', field, floor });
  };

  return (
    <>
      <div className="dungeon-card" style={{ backgroundImage: `url(${dn.bg})`, height: 170, marginTop: 4 }}>
        <div className="plate">
          <button className="btn paper sm" style={{ width: 44, padding: 0 }} onClick={() => go({ name: 'tab', tab: 'dungeon' })} aria-label="もどる">
            ‹
          </button>
          <div className="grow">
            <b>{dn.name}</b>
            <div className="muted small">
              {dn.sub} ・ {cleared}/10階クリア
            </div>
          </div>
          {locked && <span className="lock">{FREE_TRIAL_FLOORS}階まで無料</span>}
        </div>
      </div>

      <div className="map">
        {[...dn.floors.keys()].reverse().map((i) => {
          const open = floorOpen(data, field, i);
          const st = !open || i > cleared ? 'locked' : i < cleared ? 'done' : 'now';
          const n = floorPool(field, i).length;
          return (
            <button key={i} className={`floor ${st}`} onClick={() => enter(i)} aria-label={`第${i + 1}階 ${dn.floors[i]}`}>
              <span className="num">{st === 'done' ? <Check size={22} color="#fff" /> : st === 'locked' && !open ? <LockIcon size={18} /> : i + 1}</span>
              <span className="card">
                <span className="grow">
                  <b>第{i + 1}階</b>
                  <span className="muted small">
                    {dn.floors[i]}（{n}問）
                  </span>
                </span>
                <span className="mons">
                  {dn.enemies.slice(0, 3).map((e) => (
                    <img key={e.key} src={e.img} alt="" />
                  ))}
                  <img className="boss" src={dn.boss.img} alt="" />
                </span>
              </span>
            </button>
          );
        })}
        <div className="boss-node">
          <div style={{ fontWeight: 800, fontSize: 18 }}>最下層 模擬試験ボス</div>
          <img src={EXAM_BOSS.img} alt="" />
          <div className="small" style={{ fontWeight: 800 }}>
            本番と同じ100問・120分。合格ライン: 総合600点・各分野300点
          </div>
          <button className="btn gold sm" style={{ marginTop: 8 }} onClick={() => openExams()}>
            {data.examDraft ? '続きから' : data.owned.full ? '挑戦する' : freeExamsLeft(data) > 0 ? `挑戦する（無料であと${freeExamsLeft(data)}回）` : '完全版で挑戦'}
          </button>
        </div>
      </div>

      {locked && cleared >= FREE_TRIAL_FLOORS && (
        <div className="panel center map-cta">
          <b>無料の{FREE_TRIAL_FLOORS}階をクリア！ 第{FREE_TRIAL_FLOORS + 1}階から先は完全版で</b>
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn paper nowrap" style={{ flex: '0 0 42%', fontSize: 15, padding: '10px 6px' }} onClick={() => go({ name: 'kakomon' })}>
              過去問道場へ
            </button>
            <button className="btn gold" onClick={() => askFull(`${dn.name}の残り${10 - FREE_TRIAL_FLOORS}階の冒険と、中ボス・カードの金進化が開きます。`)}>
              完全版をみる ›
            </button>
          </div>
        </div>
      )}
      {(!locked || cleared < FREE_TRIAL_FLOORS) && (
        <div className="panel center map-cta">
          <b>
            第{now + 1}階 {dn.floors[now]} {cleared >= 10 ? '(全階クリア！)' : 'に挑戦中です！'}
          </b>
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn paper nowrap" style={{ flex: '0 0 42%', fontSize: 16, padding: '10px 8px' }} onClick={() => go({ name: 'note', field, topic: dn.floors[now], back: { name: 'map', field } })}>
              ノートを読む
            </button>
            <button className="btn" onClick={() => enter(now)}>
              挑戦する ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
