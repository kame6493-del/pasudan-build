import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { CONFIG } from '../config';
import type { Attrs } from '../domain/track';

/**
 * 買い切り2つ(完全版・見た目セット)。RevenueCat のキーが空なら「購入は準備中です」で、課金は走らない。
 * お金で回すガチャ・くじは作らない。
 * ブラウザの開発中だけ、画面確認用の疑似購入を使う(?mockbuy=1 を付けると本番ビルドのブラウザでも疑似購入)。
 * iOS のビルド(VITE_IOS=1)では疑似購入の道をまるごと外す(審査 2.5.19)。
 */
export type Product = keyof typeof CONFIG.products;

export interface ProductState {
  owned: boolean;
  price: string;
  pkg: PurchasesPackage | null;
}
export type BillingState =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; items: Record<Product, ProductState> };

const platform = Capacitor.getPlatform();
const key = platform === 'ios' ? CONFIG.revenuecat.ios : platform === 'android' ? CONFIG.revenuecat.android : '';
const mock = import.meta.env.VITE_IOS !== '1' && !Capacitor.isNativePlatform() && (import.meta.env.DEV || new URLSearchParams(location.search).has('mockbuy'));
const MOCK_KEY = 'pasudan.mockOwned';

let configured = false;
async function ensure() {
  if (configured) return;
  await Purchases.configure({ apiKey: key });
  configured = true;
}

const PRODUCTS = Object.keys(CONFIG.products) as Product[];
function mockOwned(): Record<Product, boolean> {
  let o: Partial<Record<Product, boolean>> = {};
  try {
    o = JSON.parse(localStorage.getItem(MOCK_KEY) ?? '{}');
  } catch {
    /* 無ければ空 */
  }
  return { full: o.full === true || o.bundle === true, looks: o.looks === true || o.bundle === true, bundle: o.bundle === true };
}

function ownedOf(active: Record<string, unknown>): Record<Product, boolean> {
  const full = CONFIG.products.full.entitlement in active;
  const looks = CONFIG.products.looks.entitlement in active;
  return { full, looks, bundle: full && looks };
}

export async function loadBilling(): Promise<BillingState> {
  if (mock) {
    const o = mockOwned();
    const items = {} as Record<Product, ProductState>;
    for (const p of PRODUCTS) items[p] = { owned: o[p], price: CONFIG.products[p].fallbackPrice, pkg: null };
    return { status: 'ready', items };
  }
  if (!key) return { status: 'unavailable', reason: 'いまは購入できません' };
  try {
    await ensure();
    const [{ customerInfo }, offerings] = await Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()]);
    const owned = ownedOf(customerInfo.entitlements.active);
    const pkgs = offerings.current?.availablePackages ?? [];
    const items = {} as Record<Product, ProductState>;
    for (const p of PRODUCTS) {
      const pkg = pkgs.find((x) => x.product.identifier === CONFIG.products[p].productId) ?? null;
      items[p] = { owned: owned[p], price: pkg?.product.priceString ?? '', pkg };
    }
    return { status: 'ready', items };
  } catch (e) {
    console.error('[pasudan] billing', e);
    return { status: 'unavailable', reason: 'ストアにつながりませんでした' };
  }
}

/** 画面に出す値段。端末ではストアの値段だけを出し、決め打ちの値段は出さない(ブラウザの確認用だけ fallbackPrice) */
export function shownPrice(state: BillingState, p: Product): string {
  if (state.status === 'ready') return state.items[p].price;
  return Capacitor.isNativePlatform() ? '' : CONFIG.products[p].fallbackPrice;
}

/** true=買えた / false=やめた。失敗は例外 */
export async function purchase(state: BillingState, p: Product): Promise<boolean> {
  if (mock) {
    const o = mockOwned();
    o[p] = true;
    localStorage.setItem(MOCK_KEY, JSON.stringify(o));
    return true;
  }
  if (state.status !== 'ready' || !state.items[p].pkg) throw new Error('いまは購入できません');
  await ensure();
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: state.items[p].pkg! });
    return ownedOf(customerInfo.entitlements.active)[p];
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return false;
    throw e;
  }
}

/** 復元。持っている物を返す */
export async function restore(): Promise<Record<Product, boolean>> {
  if (mock) return mockOwned();
  if (!key) return { full: false, looks: false, bundle: false };
  await ensure();
  const { customerInfo } = await Purchases.restorePurchases();
  return ownedOf(customerInfo.entitlements.active);
}

/**
 * RevenueCat に独自の属性を送る(購入画面を開いた場所・回数など)。失敗しても画面は止めない。
 * ブラウザの疑似購入では送らず、localStorage の pasudan.mockAttrs に残す(試験で確かめるため)。
 */
export async function setAttrs(a: Attrs): Promise<void> {
  if (mock) {
    try {
      const cur = JSON.parse(localStorage.getItem('pasudan.mockAttrs') ?? '{}') as Attrs;
      localStorage.setItem('pasudan.mockAttrs', JSON.stringify({ ...cur, ...a }));
    } catch {
      /* 記録できなくても画面は動かす */
    }
    return;
  }
  if (!key) return;
  try {
    await ensure();
    await Purchases.setAttributes(a);
  } catch (e) {
    console.warn('[pasudan] attributes', e);
  }
}

export function resetMock() {
  if (mock) localStorage.removeItem(MOCK_KEY);
}
