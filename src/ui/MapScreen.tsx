import { useEffect } from 'react';
import { easeOf, floorOpen, floorPool, freeExamsLeft, freeFloorsOf } from '../domain/game';
import type { Field } from '../domain/types';
import { art, DUNGEONS, EXAM_BOSS } from '../domain/world';
import { floorMod, FLOOR_MOD_INFO, type FloorMod } from '../domain/gimmick';
import { Check, LockIcon } from './icons';
import { useStore, type PaywallPreview } from './store';

/** 鍵の階の「本物の様子」: その階のテーマ・出る敵・実際に出る問題の書き出し */
export function floorPreview(field: Field, floor: number): PaywallPreview {
  const dn = DUNGEONS[field];
  const q = [...floorPool(field, floor)].sort((a, b) => easeOf(a) - easeOf(b))[0];
  const head = q ? q.q.replace(/\s+/g, '').slice(0, 54) : '';
  return {
    title: `この先: 第${floor + 1}階「${dn.floors[floor]}」`,
    imgs: [...dn.enemies.slice(0, 4).map((e) => e.img), dn.boss.img],
    lines: [`${floorPool(field, floor).length}問の過去問が出る階です。${q ? `たとえば「${head}${q.q.length > 54 ? '…' : ''}」` : ''}`],
  };
}

export function MapScreen({ field }: { field: Field }) {
  const { data, go, startBattle, askFull, openExams, toast } = useStore();
  const dn = DUNGEONS[field];
  const free = freeFloorsOf(field);
  const locked = !data.owned.full && free < 10;
  const cleared = data.cleared[field];
  const now = Math.min(cleared, 9);

  useEffect(() => {
    // いま挑戦中の階が見えるところまで送る
    document.querySelector('.floor.now')?.scrollIntoView({ block: 'center' });
  }, []);

  const enter = (floor: number) => {
    if (!floorOpen(data, field, floor)) return askFull(`${dn.name}の第${free + 1}階から先の冒険は完全版で進めます。`, 'map-floor', floorPreview(field, floor));
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
          {locked && <span className="lock">{free}階まで無料</span>}
        </div>
      </div>

      <div className="map">
        {[...dn.floors.keys()].reverse().map((i) => {
          const open = floorOpen(data, field, i);
          const st = !open || i > cleared ? 'locked' : i < cleared ? 'done' : 'now';
          const n = floorPool(field, i).length;
          const mod = floorMod(field, i);
          const stars = data.stars?.[`${field}:${i}`] ?? 0;
          return (
            <button key={i} className={`floor ${st}`} onClick={() => enter(i)} aria-label={`第${i + 1}階 ${dn.floors[i]}`}>
              <span className="num">{st === 'done' ? <Check size={22} color="#fff" /> : st === 'locked' && !open ? <LockIcon size={18} /> : i + 1}</span>
              <span className="card">
                <span className="grow">
                  <b>第{i + 1}階</b>
                  <span className="muted small">
                    {dn.floors[i]}（{n}問）
                  </span>
                  {(mod !== 'none' || stars > 0) && (
                    <span className="floor-sub">
                      {stars > 0 && (
                        <span className="fstars" aria-label={`星${stars}つ`}>
                          {[1, 2, 3].map((k) => (
                            <img key={k} src={art('star')} alt="" className={k <= stars ? 'on' : ''} />
                          ))}
                        </span>
                      )}
                      {mod !== 'none' && (
                        <span className="fmod">
                          <img src={art(`mod_${mod}`)} alt="" />
                          {FLOOR_MOD_INFO[mod as Exclude<FloorMod, 'none'>].name}
                        </span>
                      )}
                    </span>
                  )}
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

      {locked && cleared >= free && (
        <div className="panel center map-cta">
          <b>無料の{free}階をクリア！ 第{free + 1}階「{dn.floors[free]}」から先は完全版で</b>
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn gold" onClick={() => askFull(`${dn.name}の残り${10 - free}階の冒険と、中ボス・カードの金進化が開きます。`, 'map-cleared', floorPreview(field, free))}>
              この先を見る ›
            </button>
          </div>
        </div>
      )}
      {(!locked || cleared < free) && (
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
