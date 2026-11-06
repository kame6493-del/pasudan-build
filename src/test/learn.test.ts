import { describe, expect, it, vi } from 'vitest';
import { ABOUT, PATH, UNITS } from '../data/course';
import { FREE_DECK, fieldTest, nextUnit, passRoad, pathNo, studyDeck, TEST_N, unitCards, unitOpen, unitQuiz } from '../domain/course';
import { emptyData, normalize, QUESTIONS, TERMS_OF_Q, todayKey } from '../domain/data';
import { FREE_DAILY, FREE_UNITS, practiceLeft, recordAnswer } from '../domain/game';
import { boughtAttrs, fromOf, paywallAttrs } from '../domain/track';
import type { AppData } from '../domain/types';
import { DUNGEONS, HEROES, PETS } from '../domain/world';

const full: AppData = { ...emptyData(), owned: { full: true, looks: false } };

/** シラバス Ver.6.5 の中分類(23) */
const MIDS: Record<string, string[]> = {
  strategy: ['企業活動', '法務', '経営戦略マネジメント', '技術戦略マネジメント', 'ビジネスインダストリ', 'システム戦略', 'システム企画'],
  management: ['システム開発技術', 'ソフトウェア開発管理技術', 'プロジェクトマネジメント', 'サービスマネジメント', 'システム監査'],
  technology: ['基礎理論', 'アルゴリズムとプログラミング', 'コンピュータ構成要素', 'システム構成要素', 'ソフトウェア', 'ハードウェア', 'ヒューマンインタフェース', 'マルチメディア', 'データベース', 'ネットワーク', 'セキュリティ'],
};

describe('ゼロから学ぶ道(ゼロから合格まで)', () => {
  it('単元は60〜90で、シラバスの中分類23をすべて含む', () => {
    expect(UNITS.length).toBeGreaterThanOrEqual(60);
    expect(UNITS.length).toBeLessThanOrEqual(90);
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(UNITS.length);
    for (const [f, mids] of Object.entries(MIDS)) for (const m of mids) expect(UNITS.some((u) => u.field === f && u.mid === m), `${f}/${m}`).toBe(true);
    // 出題の多いセキュリティ・ネットワーク・法務は厚く
    expect(UNITS.filter((u) => u.mid === 'セキュリティ').length).toBeGreaterThanOrEqual(8);
    expect(UNITS.filter((u) => u.mid === 'ネットワーク').length).toBeGreaterThanOrEqual(4);
    expect(UNITS.filter((u) => u.mid === '法務').length).toBeGreaterThanOrEqual(6);
  });
  it('全単元に説明(2〜4枚・図か表)・用語(3〜5)・確かめの問題(3〜5問)・試験に出る一言がそろう', () => {
    const used = new Set<string>();
    for (const u of UNITS) {
      expect(u.pages.length, u.id).toBeGreaterThanOrEqual(2);
      expect(u.pages.length, u.id).toBeLessThanOrEqual(4);
      expect(u.pages.some((p) => p.fig), `${u.id} 図か表`).toBe(true);
      for (const p of u.pages) {
        expect(p.h.length, u.id).toBeGreaterThan(0);
        // 1枚はスマホ1画面で読める量
        expect(p.p.join('').length, `${u.id} ${p.h}`).toBeLessThanOrEqual(p.fig ? 110 : 160);
      }
      expect(u.words.length, u.id).toBeGreaterThanOrEqual(3);
      expect(u.words.length, u.id).toBeLessThanOrEqual(5);
      for (const [w, m] of u.words) expect(w.length * m.length, u.id).toBeGreaterThan(0);
      expect(unitCards(u).length).toBe(u.words.length);
      const qs = unitQuiz(u);
      expect(qs.length, u.id).toBe(u.qs.length);
      expect(qs.length, u.id).toBeGreaterThanOrEqual(3);
      expect(qs.length, u.id).toBeLessThanOrEqual(5);
      for (const q of qs) {
        expect(q.field, `${u.id} ${q.id}`).toBe(u.field);
        expect(used.has(q.id), `${q.id} が2つの単元で使われている`).toBe(false);
        used.add(q.id);
      }
      expect(u.exam.length, u.id).toBeGreaterThan(10);
      expect(DUNGEONS[u.field].floors).toContain(u.topic);
    }
  });
  it('道すじは全単元を1回ずつ、3分野をまぜる(最初の3つは3分野1つずつ)', () => {
    expect(new Set(PATH).size).toBe(UNITS.length);
    expect(PATH.length).toBe(UNITS.length);
    expect(new Set(PATH.slice(0, 3).map((id) => UNITS.find((u) => u.id === id)!.field)).size).toBe(3);
  });
  it('試験の説明: 100問・120分、合格は総合600点かつ各分野300点', () => {
    const t = ABOUT.facts.map((x) => x[1]).join(' ');
    expect(t).toContain('100問・120分');
    expect(t).toContain('600点以上');
    expect(t).toContain('300点以上');
  });
});

describe('無料の境目', () => {
  it('各分野の最初の3単元は無料、4つめから完全版。完全版は全部', () => {
    expect(FREE_UNITS).toBe(3);
    const free = emptyData();
    for (const f of ['strategy', 'management', 'technology'] as const) {
      const us = UNITS.filter((u) => u.field === f);
      us.forEach((u, i) => expect(unitOpen(free, u), u.id).toBe(i < 3));
      us.forEach((u) => expect(unitOpen(full, u)).toBe(true));
    }
  });
  it('道すじの最初の9単元は、すべて無料の単元', () => {
    for (const id of PATH.slice(0, 9)) expect(unitOpen(emptyData(), UNITS.find((u) => u.id === id)!), id).toBe(true);
  });
});

describe('「次はこれ」', () => {
  it('はじめは道すじの1番目。終えた単元を飛ばし、途中の単元は続きから', () => {
    expect(nextUnit(emptyData())!.id).toBe(PATH[0]);
    expect(pathNo(nextUnit(emptyData())!)).toBe(1);
    const d = { ...emptyData(), course: { [PATH[0]]: 3, [PATH[1]]: 1 } };
    expect(nextUnit(d)!.id).toBe(PATH[1]);
    expect(pathNo(nextUnit(d)!)).toBe(2);
  });
  it('無料の人は、まだ終えていない無料の単元を先に指す。無料を全部終えたら鍵つきの次の単元', () => {
    const freeIds = UNITS.filter((u) => unitOpen(emptyData(), u)).map((u) => u.id);
    const lastFree = [...PATH].reverse().find((id) => freeIds.includes(id))!;
    const d = { ...emptyData(), course: Object.fromEntries(freeIds.filter((id) => id !== lastFree).map((id) => [id, 3])) };
    expect(nextUnit(d)!.id).toBe(lastFree);
    const all = { ...emptyData(), course: Object.fromEntries(freeIds.map((id) => [id, 3])) };
    const nu = nextUnit(all)!;
    expect(unitOpen(all, nu)).toBe(false);
    expect(nu.id).toBe(PATH.find((id) => !freeIds.includes(id)));
    // 完全版なら同じ所から鍵なしで続く
    expect(unitOpen({ ...all, owned: { full: true, looks: false } }, nu)).toBe(true);
  });
  it('全部終えたら null。合格までの道は単元とまとめのテストで 100%', () => {
    const d = { ...full, course: Object.fromEntries([...PATH.map((id) => [id, 3]), ['test:strategy', 3], ['test:management', 3], ['test:technology', 3]]) };
    expect(nextUnit(d)).toBeNull();
    expect(passRoad(d)).toBe(100);
    expect(passRoad(emptyData())).toBe(0);
  });
  it('まとめのテストは、その分野の問題を20問、重なりなし', () => {
    for (const f of ['strategy', 'management', 'technology'] as const) {
      const ids = fieldTest(emptyData(), f);
      expect(ids.length).toBe(TEST_N);
      expect(new Set(ids).size).toBe(TEST_N);
      for (const id of ids) expect(QUESTIONS.find((q) => q.id === id)!.field).toBe(f);
    }
  });
});

describe('覚えるカード(まちがえた問題の用語を自動で)', () => {
  const q = QUESTIONS.find((x) => (TERMS_OF_Q.get(x.id) ?? []).length > 0)!;
  it('まちがえた問題の用語が山に入り、「覚えた」で外れる', () => {
    let d = recordAnswer(emptyData(), q, false, { counted: false, combo: 0 }).data;
    const t = TERMS_OF_Q.get(q.id)![0];
    expect(studyDeck(d).cards.map((x) => x.id)).toContain(t);
    expect(studyDeck(d).fromWrong).toBeGreaterThan(0);
    d = { ...d, known: { [t]: 1 } };
    expect(studyDeck(d).cards.map((x) => x.id)).not.toContain(t);
  });
  it('無料は10枚まで、残りは鍵。完全版は全部', () => {
    let d = emptyData();
    for (const x of QUESTIONS.slice(0, 80)) d = recordAnswer(d, x, false, { counted: false, combo: 0 }).data;
    const free = studyDeck(d);
    expect(free.cards.length).toBe(FREE_DECK);
    expect(free.locked).toBeGreaterThan(0);
    const all = studyDeck({ ...d, owned: { full: true, looks: false } });
    expect(all.cards.length).toBe(free.cards.length + free.locked);
  });
});

describe('はじめての人の入口と案内', () => {
  it('はじめは未回答・案内まだ。前の版から使っている人は案内を見終えたことにする', () => {
    const d = emptyData();
    expect(d.level).toBeNull();
    expect(d.tutorialDone).toBe(false);
    expect(d.guided).toBe(false);
    const old = { ...emptyData(), onboarded: true } as Record<string, unknown>;
    delete old.tutorialDone;
    delete old.guided;
    delete old.level;
    const n = normalize(old);
    expect(n.tutorialDone).toBe(true);
    expect(n.guided).toBe(true);
    expect(n.level).toBeNull();
    expect(normalize({ ...emptyData(), level: 'new' }).level).toBe('new');
    expect(normalize({ ...emptyData(), level: 'xx' } as never).level).toBeNull();
  });
});

describe('課金の場面', () => {
  it('過去問道場の無料は1日30問。数えるのは過去問道場だけ', () => {
    expect(FREE_DAILY).toBe(30);
    let d = emptyData();
    const k = todayKey();
    expect(practiceLeft(d, k)).toBe(30);
    for (const q of QUESTIONS.slice(0, 30)) d = recordAnswer(d, q, true, { counted: true, combo: 1 }).data;
    expect(practiceLeft(d, k)).toBe(0);
    // ダンジョン(counted: false)は数えない
    let e = emptyData();
    for (const q of QUESTIONS.slice(0, 40)) e = recordAnswer(e, q, true, { counted: false, combo: 1 }).data;
    expect(practiceLeft(e, k)).toBe(30);
    expect(practiceLeft({ ...d, owned: { full: true, looks: false } }, k)).toBe(Infinity);
  });
  it('購入画面の属性(場所・回数・解いた数)。知らない場所は other', () => {
    expect(paywallAttrs('map-floor', 3, 42)).toEqual({ paywall_from: 'map-floor', paywall_opened: '3', paywall_seen: '42' });
    expect(fromOf('zzz')).toBe('other');
    expect(boughtAttrs('exam-result')).toEqual({ bought_from: 'exam-result' });
  });
});

describe('戦いの絵の向き', () => {
  it('相棒と主人公は、戦いでは全員うしろ姿(敵の方を向く)', () => {
    for (const p of PETS) expect(p.battle).toMatch(/_back\.webp$/);
    for (const h of HEROES) expect(h.battle).toMatch(/_back\.webp$/);
  });
});

describe('音量(戦いの中の音の窓と設定で同じ値)', () => {
  it('BGM の音量を変えると、鳴っている BGM の音量にすぐ効く', async () => {
    const gains: { value: number; target?: number }[] = [];
    class FakeGain {
      gain = {
        value: 1,
        setTargetAtTime: (v: number) => {
          this.gain.value = v;
        },
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        cancelScheduledValues: () => {},
      };
      constructor() {
        gains.push(this.gain);
      }
      connect(x: unknown) {
        return x;
      }
    }
    class FakeCtx {
      state = 'running';
      currentTime = 0;
      destination = {};
      createGain() {
        return new FakeGain();
      }
      resume() {
        return Promise.resolve();
      }
      suspend() {
        return Promise.resolve();
      }
    }
    vi.stubGlobal('window', { AudioContext: FakeCtx, addEventListener: () => {}, location: { search: '' } });
    vi.stubGlobal('document', { addEventListener: () => {}, visibilityState: 'visible' });
    vi.resetModules();
    const s = await import('../platform/sound');
    s.unlock();
    // 1つ目が効果音、2つ目が BGM のまとめの音量
    const bgmBus = gains[1];
    s.setBgmVolume(0.2);
    expect(bgmBus.value).toBeCloseTo(0.2 * 0.55);
    s.setBgmVolume(1);
    expect(bgmBus.value).toBeCloseTo(0.55);
    s.setSfxVolume(0.3);
    expect(gains[0].value).toBeCloseTo(0.3);
    expect(s.soundSettings()).toMatchObject({ bgmVolume: 1, sfxVolume: 0.3 });
    vi.unstubAllGlobals();
  });
  it('音量は記録に残り、読み直しても保たれる(壊れた値は 0〜1 に収める)', () => {
    const d = normalize(JSON.parse(JSON.stringify({ ...emptyData(), bgmVol: 0.35, sfxVol: 0.8, bgm: false })));
    expect(d.bgmVol).toBe(0.35);
    expect(d.sfxVol).toBe(0.8);
    expect(d.bgm).toBe(false);
    expect(normalize({ ...emptyData(), bgmVol: 7 }).bgmVol).toBe(1);
  });
});
