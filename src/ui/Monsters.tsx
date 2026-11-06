/**
 * モンスター図鑑(2026-11-04 持ち主「モンスター紹介みたいな」)。学ぶのタブから入る。
 * 倒した敵は絵・特性・紹介文・関わる用語まで。まだ会っていない敵はかげ(シルエット)だけ。
 * 用語を押すと、その用語を学ぶ単元へ。
 */
import { useState } from 'react';
import { unitById } from '../data/course';
import { unitOpen } from '../domain/course';
import { BOSS_MOVE, BOSS_MOVE_INFO, bestiary, TRAIT_INFO, TRAITS } from '../domain/gimmick';
import { bestiaryCount, metCount, MONSTER_INFO } from '../domain/monsters';
import { art, DUNGEONS, type Enemy } from '../domain/world';
import { play } from '../platform/sound';
import { useBack } from './back';
import { useStore } from './store';

export { bestiaryCount, metCount };

export function MonsterBook() {
  const { data, go } = useStore();
  const groups = bestiary();
  const { got, all } = bestiaryCount(data);
  const [sel, setSel] = useState<Enemy | null>(null);
  return (
    <>
      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <button className="btn paper sm back-sm" onClick={() => go({ name: 'tab', tab: 'zukan' })} aria-label="もどる">
          ‹
        </button>
        <div className="title-sign grow" style={{ margin: 0 }}>
          <span className="sign">モンスター図鑑</span>
        </div>
      </div>
      <div className="panel">
        <div className="row">
          <b className="grow">集めた数</b>
          <b style={{ fontSize: 26, color: 'var(--hi-gold)' }}>
            {got}
            <span className="small muted"> / {all}体</span>
          </b>
        </div>
        <div className="bar gold" style={{ height: 12, marginTop: 6 }}>
          <i style={{ width: `${(got / all) * 100}%` }} />
        </div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          倒した敵が載ります。押すと紹介と、その敵に関わる用語が読めます。
        </p>
      </div>
      {groups.map((g) => (
        <div key={g.field ?? 'rare'} className="panel">
          <h3>
            {g.field ? <img src={DUNGEONS[g.field].book} alt="" style={{ height: 26 }} /> : <img src={art('mon_goldslime')} alt="" style={{ height: 26 }} />}
            {g.field ? DUNGEONS[g.field].name : 'めずらしい敵'}
            <span className="small muted" style={{ marginLeft: 'auto' }}>
              {g.foes.filter((e) => metCount(data, e) > 0).length} / {g.foes.length}
            </span>
          </h3>
          <div className="mb-grid">
            {g.foes.map((e, i) => {
              const n = metCount(data, e);
              return (
                <button key={e.key} className={`mb-cell ${n ? '' : 'unknown'} ${e.boss ? 'boss' : ''}`} onClick={() => (n ? (play('tap'), setSel(e)) : setSel({ ...e, name: '？？？' }))}>
                  <span className="mb-no">No.{String(i + 1).padStart(2, '0')}</span>
                  <img src={e.img} alt="" />
                  <span className="mb-name">{n ? e.name : '？？？'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ height: 10 }} />
      {sel && <MonsterDetail e={sel} onClose={() => setSel(null)} />}
    </>
  );
}

function MonsterDetail({ e, onClose }: { e: Enemy; onClose: () => void }) {
  const { data, go, askFull } = useStore();
  useBack(onClose);
  const n = metCount(data, e);
  const info = MONSTER_INFO[e.key];
  const tr = TRAITS[e.key] ?? [];
  const mv = e.boss ? BOSS_MOVE[e.key] : undefined;
  const where = (Object.values(DUNGEONS).find((d) => d.enemies.some((x) => x.key === e.key) || d.boss.key === e.key) ?? null);
  const fl = where?.enemies.find((x) => x.key === e.key)?.floors;
  const learn = () => {
    if (!info) return;
    onClose();
    if (info.unit === 'about') return go({ name: 'about' });
    const u = unitById(info.unit);
    if (!u) return;
    if (!unitOpen(data, u)) return askFull(`「${info.term}」は、ゼロから学ぶ道の単元「${u.title}」で学べます。この単元は完全版で開きます。`, 'course');
    go({ name: 'unit', id: u.id });
  };
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet mb-detail" onClick={(ev) => ev.stopPropagation()} role="dialog" aria-label={n ? e.name : 'まだ会っていない敵'}>
        <div className={`mb-art ${n ? '' : 'unknown'}`}>
          <img src={e.img} alt="" />
        </div>
        {!n ? (
          <>
            <h2 className="mb-h">？？？</h2>
            <p className="center muted">{where ? `${where.name}${fl ? `の 第${fl[0] + 1}〜${fl[1] + 1}階` : ''}で出会えるかも。` : 'どこかで出会えるかも。'}倒すと図鑑に載ります。</p>
          </>
        ) : (
          <>
            <h2 className="mb-h">{e.name}</h2>
            <p className="center small muted" style={{ margin: 0 }}>
              {where ? `${where.name}${fl ? ` 第${fl[0] + 1}〜${fl[1] + 1}階` : e.boss ? 'のボス' : ''}` : 'めずらしい敵'}・{n}回倒した
            </p>
            {info && <p className="mb-desc">{info.desc}</p>}
            {(tr.length > 0 || mv) && (
              <div className="mb-traits">
                {tr.map((t) => (
                  <div key={t}>
                    <b>{TRAIT_INFO[t].name}</b> {TRAIT_INFO[t].note}
                  </div>
                ))}
                {mv && (
                  <div>
                    <b>{BOSS_MOVE_INFO[mv].name}</b> {BOSS_MOVE_INFO[mv].note}
                  </div>
                )}
              </div>
            )}
            {info && (
              <button className="mb-term" onClick={learn}>
                <span className="small">関わる用語</span>
                <b>{info.term}</b>
                <span className="mb-mean">{info.mean}</span>
                <span className="mb-go">この用語を学ぶ ›</span>
              </button>
            )}
          </>
        )}
        <button className="btn paper" style={{ marginTop: 10 }} onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}
