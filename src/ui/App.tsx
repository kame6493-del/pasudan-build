import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { todayKey } from '../domain/data';
import { liveStreak, predict } from '../domain/game';
import type { AppData } from '../domain/types';
import { art } from '../domain/world';
import { loadBilling, purchase, restore, type BillingState, type Product } from '../platform/billing';
import { tap } from '../platform/native';
import { bgm, play, preload, setBgm, setBgmVolume, setSfxVolume, setSound, unlock, type Bgm } from '../platform/sound';
import { loadData, saveData } from '../platform/storage';
import { Battle } from './Battle';
import { Exam } from './Exam';
import { ExamPicker } from './ExamPicker';
import { Home } from './Home';
import { Kakomon } from './Kakomon';
import { MapScreen } from './MapScreen';
import { Nigate } from './Nigate';
import { NoteView, NotesList } from './Notes';
import { Onboarding } from './Onboarding';
import { Paywall } from './Paywall';
import { Rewards } from './Rewards';
import { Settings } from './Settings';
import { Shop } from './Shop';
import { Stats } from './Stats';
import { backToTop, useBack } from './back';
import { StoreCtx, useStore, type Ask, type BattleMode, type Reward, type Route, type Store, type Tab } from './store';
import { Title } from './Title';
import { TermDetail, Zukan, ZukanList } from './Zukan';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dungeon', label: 'ダンジョン', icon: art('tab_dungeon') },
  { id: 'zukan', label: '図鑑', icon: art('tab_book') },
  { id: 'nigate', label: '苦手', icon: art('tab_nigate') },
  { id: 'stats', label: '成績', icon: art('tab_chart') },
  { id: 'shop', label: 'ショップ', icon: art('tab_shop') },
];

const tabOf = (r: Route): Tab | null => {
  if (r.name === 'tab') return r.tab;
  if (r.name === 'map' || r.name === 'kakomon') return 'dungeon';
  if (r.name === 'zukanList' || r.name === 'term' || r.name === 'notes' || r.name === 'note') return 'zukan';
  return null;
};

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'title' });
  const [battle, setBattle] = useState<BattleMode | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [billing, setBilling] = useState<BillingState>({ status: 'loading' });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [fullAsk, setFullAsk] = useState<string | null>(null);
  const [examPick, setExamPick] = useState(false);
  const [ask, setAsk] = useState<(Ask & { resolve: (ok: boolean) => void }) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData().then((d) => {
      setSound(d.sound);
      setSfxVolume(d.sfxVol);
      setBgm(d.bgm);
      setBgmVolume(d.bgmVol);
      setData(d);
    });
    loadBilling().then(setBilling);
    preload();
  }, []);

  // ストアの持ち物を記録へ反映（復元・別端末で買った分も）
  useEffect(() => {
    if (billing.status !== 'ready' || !data) return;
    const full = billing.items.full.owned || data.owned.full;
    const looks = billing.items.looks.owned || data.owned.looks;
    if (full !== data.owned.full || looks !== data.owned.looks) update((d) => ({ ...d, owned: { full, looks } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing]);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((cur) => {
      if (!cur) return cur;
      let next = fn(cur);
      // その日の予想点を残す（成績の推移に使う）
      const p = predict(next);
      const key = todayKey();
      if (p.total !== null && next.days[key] && next.days[key].score !== p.total) next = { ...next, days: { ...next.days, [key]: { ...next.days[key], score: p.total } } };
      void saveData(next);
      return next;
    });
  }, []);

  const toast = useCallback((s: string) => {
    setToastMsg(s);
    window.setTimeout(() => setToastMsg((m) => (m === s ? null : m)), 2200);
  }, []);

  const go = useCallback((r: Route, quiet = false) => {
    tap();
    if (!quiet) void play('tap');
    setRoute(r);
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const buy = useCallback(
    async (p: Product) => {
      try {
        const ok = await purchase(billing, p);
        if (ok) {
          update((d) => ({ ...d, owned: p === 'bundle' ? { full: true, looks: true } : { ...d.owned, [p]: true } }));
          setFullAsk(null);
          toast(p === 'looks' ? '見た目セットを手に入れました！' : '完全版になりました。すべてのダンジョンが開きました！');
          void play('levelup');
          loadBilling().then(setBilling);
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : '購入できませんでした');
      }
    },
    [billing, update, toast],
  );

  const restorePurchases = useCallback(async () => {
    try {
      const o = await restore();
      update((d) => ({ ...d, owned: { full: d.owned.full || o.full, looks: d.owned.looks || o.looks } }));
      toast(o.full || o.looks ? '購入を復元しました' : '復元できる購入はありませんでした');
    } catch {
      toast('復元できませんでした');
    }
  }, [update, toast]);

  const confirmAsk = useCallback(
    (a: Ask) =>
      new Promise<boolean>((resolve) => {
        setAsk({ ...a, resolve });
      }),
    [],
  );

  const doneRewards = useCallback(() => setRewards([]), []);

  // 重なっている画面は戻るで閉じる(バトル・模試・確認はそれぞれの画面で受ける)
  useBack(() => setSettings(false), settings);
  useBack(() => setFullAsk(null), !!fullAsk);
  useBack(doneRewards, rewards.length > 0);

  // 画面の移動の戻る先
  const routeRef = useRef(route);
  routeRef.current = route;
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    const sub = CapApp.addListener('backButton', () => {
      if (backToTop()) return;
      const r = routeRef.current;
      const to = parentOf(r);
      if (to) {
        setRoute(to);
        scrollRef.current?.scrollTo({ top: 0 });
      } else void CapApp.exitApp();
    });
    return () => {
      void sub.then((x) => x.remove());
    };
  }, []);

  const store: Store | null = useMemo(
    () =>
      data && {
        data,
        update,
        go,
        route,
        startBattle: (m: BattleMode) => {
          unlock();
          tap();
          setBattle(m);
        },
        pushRewards: (r: Reward[]) => setRewards((cur) => [...cur, ...r]),
        billing,
        buy,
        restorePurchases,
        toast,
        openSettings: () => setSettings(true),
        askFull: (reason: string) => setFullAsk(reason),
        openExams: () => setExamPick(true),
        confirm: confirmAsk,
      },
    [data, update, go, route, billing, buy, restorePurchases, toast, confirmAsk],
  );

  // 場面の BGM。バトル中・模擬試験中は Battle / Exam が決める(敵がボスか等で変わるため)
  const won = rewards.some((r) => r.kind !== 'fail' && r.kind !== 'levelup' && r.kind !== 'evolve');
  const scene: Bgm | null | undefined = battle
    ? undefined
    : rewards.length > 0
      ? won
        ? 'victory'
        : null
      : route.name === 'map' || route.name === 'kakomon'
        ? 'dungeon'
        : 'title';
  useEffect(() => {
    if (scene !== undefined) bgm(scene);
  }, [scene]);

  if (!data || !store) return <div className="shell" />;

  const tab = tabOf(route);
  const showChrome = route.name !== 'title' && route.name !== 'onboard';
  const bg = route.name === 'map' ? undefined : art('bg_home');

  return (
    <StoreCtx.Provider value={store}>
      <div className="shell" onPointerDown={unlock}>
        {route.name === 'title' && <Title />}
        {route.name === 'onboard' && <Onboarding />}
        {showChrome && (
          <>
            <div className="scene-bg" style={{ backgroundImage: `url(${bg ?? art('bg_home')})`, filter: 'blur(6px) brightness(0.75)' }} />
            <Header />
            <div className="scroll" ref={scrollRef}>
              {route.name === 'tab' && route.tab === 'dungeon' && <Home />}
              {route.name === 'map' && <MapScreen field={route.field} />}
              {route.name === 'kakomon' && <Kakomon />}
              {route.name === 'tab' && route.tab === 'zukan' && <Zukan />}
              {route.name === 'zukanList' && <ZukanList field={route.field} />}
              {route.name === 'term' && <TermDetail id={route.id} back={route.back} />}
              {route.name === 'notes' && <NotesList field={route.field} />}
              {route.name === 'note' && <NoteView field={route.field} topic={route.topic} back={route.back} />}
              {route.name === 'tab' && route.tab === 'nigate' && <Nigate />}
              {route.name === 'tab' && route.tab === 'stats' && <Stats />}
              {route.name === 'tab' && route.tab === 'shop' && <Shop />}
            </div>
            <nav className="tabbar">
              {TABS.map((t) => (
                <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => go({ name: 'tab', tab: t.id })} aria-label={t.label}>
                  <img src={t.icon} alt="" />
                  {t.label}
                </button>
              ))}
            </nav>
          </>
        )}
        {battle && battle.kind !== 'exam' && <Battle mode={battle} onExit={() => setBattle(null)} />}
        {battle && battle.kind === 'exam' && <Exam year={battle.year} resume={battle.resume} onExit={() => setBattle(null)} />}
        {examPick && <ExamPicker onClose={() => setExamPick(false)} />}
        {rewards.length > 0 && (
          <Rewards items={rewards} onDone={doneRewards} />
        )}
        {settings && <Settings onClose={() => setSettings(false)} />}
        {fullAsk && <Paywall reason={fullAsk} onClose={() => setFullAsk(null)} />}
        {ask && (
          <Confirm
            ask={ask}
            onAnswer={(ok) => {
              ask.resolve(ok);
              setAsk(null);
            }}
          />
        )}
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </div>
    </StoreCtx.Provider>
  );
}

/** Android の戻るで行く先。null ならアプリを閉じる */
function parentOf(r: Route): Route | null {
  switch (r.name) {
    case 'title':
      return null;
    case 'onboard':
      return { name: 'title' };
    case 'tab':
      return r.tab === 'dungeon' ? null : { name: 'tab', tab: 'dungeon' };
    case 'map':
    case 'kakomon':
      return { name: 'tab', tab: 'dungeon' };
    case 'zukanList':
    case 'notes':
      return { name: 'tab', tab: 'zukan' };
    case 'term':
    case 'note':
      return r.back;
  }
}

/** アプリの見た目に合わせた確認(ブラウザの confirm の代わり) */
function Confirm({ ask, onAnswer }: { ask: Ask; onAnswer: (ok: boolean) => void }) {
  useBack(() => onAnswer(false));
  return (
    <div className="sheet-bg confirm-bg" onClick={() => onAnswer(false)}>
      <div className="sheet confirm" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {ask.title && <h2 style={{ margin: '0 0 6px', justifyContent: 'center' }}>{ask.title}</h2>}
        <p style={{ margin: 0, lineHeight: 1.7, fontWeight: 700 }}>{ask.body}</p>
        <div className="btns">
          <button className="btn paper" onClick={() => onAnswer(false)}>
            {ask.cancel ?? 'やめる'}
          </button>
          <button className={`btn ${ask.danger ? 'red' : ''}`} onClick={() => onAnswer(true)}>
            {ask.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { data, openSettings } = useStore();
  return (
    <header className="header">
      <img className="logo" src={art('logo')} alt="パスダン ITパスポート合格ダンジョン" />
      <div className="pills">
        <span className="pill" aria-label={`コイン ${data.coins}`}>
          <img src={art('coin')} alt="" />
          {data.coins.toLocaleString()}
        </span>
        <span className="pill" aria-label={`連続 ${liveStreak(data)}日`}>
          <img src={art('flame')} alt="" />
          連続 {liveStreak(data)}日
        </span>
      </div>
      <button className="gear" onClick={openSettings} aria-label="設定">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
          <path d="M19.4 13a7.5 7.5 0 000-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 00-1.7-1L15 3.2h-4l-.4 2.7a7.6 7.6 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 000 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 001.7 1l.4 2.7h4l.4-2.7a7.6 7.6 0 001.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" transform="translate(-1 0)" />
        </svg>
      </button>
    </header>
  );
}
