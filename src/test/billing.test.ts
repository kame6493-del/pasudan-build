import { describe, expect, it, vi } from 'vitest';

// 端末(Android)で動いている時の道すじ: 購入ボタン → RevenueCat の purchasePackage → 結果。実機の支払いシートの代わりに RC の関数を偽物にする
const calls: { name: string; arg?: unknown }[] = [];
let cancel = false;
const pkgFull = { identifier: '$rc_lifetime', product: { identifier: 'pasudan_full', priceString: '¥1,480' } };
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true } }));
vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    configure: async (a: unknown) => void calls.push({ name: 'configure', arg: a }),
    getCustomerInfo: async () => ({ customerInfo: { entitlements: { active: {} } } }),
    getOfferings: async () => ({ current: { availablePackages: [pkgFull] } }),
    purchasePackage: async (a: { aPackage: unknown }) => {
      calls.push({ name: 'purchase', arg: a.aPackage });
      if (cancel) throw Object.assign(new Error('cancel'), { userCancelled: true });
      return { customerInfo: { entitlements: { active: { full: {} } } } };
    },
    setAttributes: async (a: unknown) => void calls.push({ name: 'attrs', arg: a }),
    restorePurchases: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  },
}));

describe('購入の道すじ(RevenueCat)', () => {
  it('売り場の pasudan_full を見つけ、購入ボタンで purchasePackage に渡し、権利 full が付けば買えたと返す', async () => {
    const b = await import('../platform/billing');
    const st = await b.loadBilling();
    expect(st.status).toBe('ready');
    if (st.status !== 'ready') return;
    expect(st.items.full.pkg).toBe(pkgFull);
    expect(st.items.full.price).toBe('¥1,480');
    expect(await b.purchase(st, 'full')).toBe(true);
    expect(calls.find((c) => c.name === 'purchase')?.arg).toBe(pkgFull);
    expect(calls.find((c) => c.name === 'configure')?.arg).toMatchObject({ apiKey: expect.stringMatching(/^goog_/) });
    // 支払いのシートで閉じた時は false(エラーにしない)
    cancel = true;
    expect(await b.purchase(st, 'full')).toBe(false);
    cancel = false;
    // 売り場に無い商品は買えない(例外)
    await expect(b.purchase(st, 'looks')).rejects.toThrow();
  });
  it('購入画面を開いた場所などの属性を RC に送る', async () => {
    const b = await import('../platform/billing');
    await b.setAttrs({ paywall_from: 'map-floor', paywall_opened: '1', paywall_seen: '12' });
    expect(calls.filter((c) => c.name === 'attrs').pop()?.arg).toEqual({ paywall_from: 'map-floor', paywall_opened: '1', paywall_seen: '12' });
  });
});
