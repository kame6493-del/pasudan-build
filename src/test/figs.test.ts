import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../domain/data';
import { critWindow } from '../domain/game';
import { figLen } from '../domain/format';

/**
 * 2026-11-05 過去問の表・図の抜けの直し。
 * 「次の表」「表のとおり」「図の」「“社員”表と…」のように表や図を見て解く問題には、表(table / figs)か図かプログラムが必ずある。
 */
const REF =
  /(次の表|下の表|表のとおり|表のように|表の(?:各|中|内容|条件|データ|値|項目)|表中|表に示|表で示|表から読み取|表を(?:結合|基|もと)|(?<![-Rーれ])図(?:の|に|中|で|を|1|2)|次の図|下の図|ワークシート(?:に示|の|は)|“[^”]+”表(?:の|と|及び|，|から|において|を|で|に|は|がある))/;
/** 表の形(列名だけ)を問題文の中で「口座(口座番号(実線)，…)」のように示している問題。冊子も列名の枠だけで、中身の行は無い */
const SCHEMA_IN_TEXT = new Set(['r08-072', 'r04-065', 'h30a-085']);
/** 11/5 に表・図を入れた問題(どれかが消えたら気づけるように) */
const FIXED_1105 = [
  'r08-057', 'r07-066', 'r06-067', 'r05-086', 'r04-090', 'r04-097', 'r03-050', 'r03-095', 'r02-072', 'r02-073',
  'r01a-062', 'r01a-070', 'r01a-082', 'h31-026', 'h31-058', 'h31-071', 'h31-078', 'h31-082', 'h31-096', 'h30a-005',
];
const IMG = new Set(Object.keys(import.meta.glob('../../public/figs/*.webp')).map((k) => k.replace('../../public/', '')));

describe('過去問の表と図', () => {
  it('表や図を参照する問題には、表か図(かプログラム)が必ずある', () => {
    const refs = QUESTIONS.filter((q) => REF.test(q.q));
    expect(refs.length).toBeGreaterThan(40);
    const missing = refs.filter((q) => !SCHEMA_IN_TEXT.has(q.id) && !q.table?.length && !q.figs?.length && !q.code).map((q) => q.id);
    expect(missing).toEqual([]);
  });
  it('図を文で言い換えた書き方・2枚目の表を文で並べた書き方が残っていない', () => {
    const bad = QUESTIONS.filter((q) => /〔図の内容〕|\(図[:：の]|（図|表は図の位置を文字で|は下の表のとおり|”表\([^)]*\)\s*\S+：/.test(q.q)).map((q) => q.id);
    expect(bad).toEqual([]);
  });
  it('11/5 に直した20問に表・図が入っている', () => {
    for (const id of FIXED_1105) {
      const q = QUESTIONS.find((x) => x.id === id);
      expect(q, id).toBeTruthy();
      expect(q!.figs?.length, id).toBeGreaterThan(0);
    }
  });
  it('表は行ごとの列の数がそろい、空の表は無い', () => {
    for (const q of QUESTIONS) {
      const tables = [...(q.table ? [q.table] : []), ...(q.figs ?? []).flatMap((f) => (f.t === 'table' ? [f.rows] : []))];
      for (const t of tables) {
        expect(t.length, q.id).toBeGreaterThan(0);
        const n = t[0].length;
        for (const r of t) expect(r.length, q.id).toBe(n);
      }
    }
  });
  it('図の画像のファイルがあり、大きさと説明の文が入っている', () => {
    const imgs = QUESTIONS.flatMap((q) => (q.figs ?? []).flatMap((f) => (f.t === 'img' ? [{ id: q.id, f }] : [])));
    expect(imgs.length).toBeGreaterThanOrEqual(14);
    for (const { id, f } of imgs) {
      expect(IMG.has(f.src), `${id} ${f.src}`).toBe(true);
      expect(f.src).toBe(`figs/${id}.webp`);
      expect(f.w, id).toBeGreaterThan(100);
      expect(f.h, id).toBeGreaterThan(100);
      expect(f.alt.length, id).toBeGreaterThan(10);
    }
    // 使っていない図のファイルが残っていない
    expect(IMG.size).toBe(imgs.length);
  });
  it('表や図の分も早押しの持ち時間に足す', () => {
    const q = QUESTIONS.find((x) => x.id === 'h31-078')!;
    expect(figLen(q)).toBeGreaterThan(60);
    expect(critWindow(q)).toBeGreaterThanOrEqual(critWindow({ ...q, figs: undefined }));
  });
});
