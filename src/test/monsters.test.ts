import { describe, expect, it } from 'vitest';
import { unitById } from '../data/course';
import { emptyData } from '../domain/data';
import { bestiary, TRAITS } from '../domain/gimmick';
import { MONSTER_INFO } from '../domain/monsters';
import { DUNGEONS, enemiesAt, FIELDS } from '../domain/world';
import { bestiaryCount, metCount } from '../domain/monsters';

const ALL = bestiary().flatMap((g) => g.foes);
const ART = new Set(Object.keys(import.meta.glob('../../public/art/*.webp')).map((k) => k.replace('../../public/', './')));

describe('敵とモンスター図鑑', () => {
  it('全部の敵に絵と紹介文(2〜3行)と、学べる用語がある', () => {
    for (const e of ALL) {
      expect(ART.has(e.img), e.img).toBe(true);
      const m = MONSTER_INFO[e.key];
      expect(m, e.key).toBeDefined();
      expect(m.desc.length, e.key).toBeGreaterThanOrEqual(30);
      expect(m.desc.length, e.key).toBeLessThanOrEqual(80);
      expect(m.term.length * m.mean.length, e.key).toBeGreaterThan(0);
      if (m.unit !== 'about') expect(unitById(m.unit), `${e.key} の単元 ${m.unit}`).toBeDefined();
    }
  });
  it('ダンジョンごとに6〜10種類とボス1体、ほかのダンジョンと敵がかぶらない。全部で40種類まで', () => {
    const seen = new Set<string>();
    for (const f of FIELDS) {
      const d = DUNGEONS[f];
      expect(d.enemies.length, f).toBeGreaterThanOrEqual(6);
      expect(d.enemies.length, f).toBeLessThanOrEqual(10);
      expect(d.boss.boss).toBe(true);
      for (const e of [...d.enemies, d.boss]) {
        expect(seen.has(e.key), e.key).toBe(false);
        seen.add(e.key);
      }
    }
    expect(ALL.length).toBeLessThanOrEqual(40);
  });
  it('どの階にも3種類以上が出て、深い階ほど新しい敵が混ざる。特性は今の組み合わせの幅(2つまで)', () => {
    for (const f of FIELDS) {
      const d = DUNGEONS[f];
      for (let fl = 0; fl < d.floors.length; fl++) expect(enemiesAt(d, fl).length, `${f} ${fl + 1}階`).toBeGreaterThanOrEqual(3);
      const first = new Set(enemiesAt(d, 0).map((e) => e.key));
      expect(enemiesAt(d, 9).some((e) => !first.has(e.key))).toBe(true);
      for (const e of d.enemies) {
        expect(TRAITS[e.key], e.key).toBeDefined();
        expect(TRAITS[e.key].length).toBeLessThanOrEqual(2);
      }
    }
  });
  it('図鑑に載るのは倒した敵だけ(模擬試験のボスは模擬試験を終えたら)', () => {
    const d = emptyData();
    expect(bestiaryCount(d).got).toBe(0);
    const e = DUNGEONS.technology.enemies[0];
    const d2 = { ...d, foes: { [e.key]: 1 } };
    expect(metCount(d2, e)).toBe(1);
    expect(bestiaryCount(d2).got).toBe(1);
    const boss = ALL.find((x) => x.key === 'boss_celes')!;
    expect(metCount(d, boss)).toBe(0);
    expect(metCount({ ...d, exams: [{} as never] }, boss)).toBe(1);
  });
});
