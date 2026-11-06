import { createContext, useContext } from 'react';
import type { AppData, Field } from '../domain/types';
import type { BillingState, Product } from '../platform/billing';

export type Route =
  | { name: 'title' }
  | { name: 'onboard' }
  | { name: 'tab'; tab: Tab }
  | { name: 'map'; field: Field }
  | { name: 'zukanList'; field: Field | 'all' }
  | { name: 'term'; id: string; back: Route }
  | { name: 'notes'; field: Field }
  | { name: 'note'; field: Field; topic: string; back: Route }
  | { name: 'kakomon' }
  | { name: 'course' }
  | { name: 'about' }
  | { name: 'unit'; id: string }
  | { name: 'cards' }
  | { name: 'bestiary' };

export type Tab = 'dungeon' | 'zukan' | 'nigate' | 'stats' | 'shop';

export type BattleMode =
  | { kind: 'floor'; field: Field; floor: number }
  | { kind: 'daily' }
  | { kind: 'ghost' }
  /** 苦手・模試の見直し */
  | { kind: 'review'; ids: string[]; title: string; unit?: string; test?: Field }
  /** 過去問モード(無料・全問・上限なし)。ids の順に解く */
  | { kind: 'practice'; ids: string[]; title: string; sub: string }
  | { kind: 'exam'; year?: string; resume?: boolean };

/** 戦いのあとに順番に出す演出 */
export type Reward =
  | { kind: 'clear'; title: string; coins: number; xp: number; cards: string[]; stars?: number; starNew?: boolean; items?: string[] }
  | { kind: 'chest'; img: string; name: string; coins: number; xp: number; cards: string[] }
  | { kind: 'levelup'; from: number; to: number }
  | { kind: 'evolve'; term: string }
  | { kind: 'bond'; pet: string; to: number }
  | { kind: 'fail'; title: string };

/** 購入画面の上に出す「この先の本物の様子」 */
export interface PaywallPreview {
  title: string;
  imgs?: string[];
  lines?: string[];
}

/** アプリ内の確認 */
export interface Ask {
  title?: string;
  body: string;
  ok: string;
  cancel?: string;
  danger?: boolean;
}

export interface Store {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  go: (r: Route, quiet?: boolean) => void;
  route: Route;
  startBattle: (m: BattleMode) => void;
  pushRewards: (r: Reward[]) => void;
  billing: BillingState;
  buy: (p: Product) => Promise<void>;
  restorePurchases: () => Promise<void>;
  toast: (s: string) => void;
  openSettings: () => void;
  /** 完全版の購入画面を開く。from=開いた場所(RC の属性 paywall_from)、preview=鍵の先の本物の様子 */
  askFull: (reason: string, from?: string, preview?: PaywallPreview) => void;
  /** 模擬試験の選び方(ランダム・年度別)を開く */
  openExams: () => void;
  /** 確認を出して、はいなら true */
  confirm: (a: Ask) => Promise<boolean>;
}

export const StoreCtx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(StoreCtx);
