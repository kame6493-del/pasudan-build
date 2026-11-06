/**
 * 購入管理(RevenueCat)に入れる独自の属性。どこで購入画面を開き、どこで買ったかを数えるためだけ(まとめ版の track.ts と同じ名前)。
 * 入れるのは 画面の場所・回数・解いた問題の数 だけで、個人を特定する情報は入れない。RevenueCat の予約の属性($ で始まる物)は使わない。
 */
export type Attrs = Record<string, string | null>;

export const ATTR = {
  paywallFrom: 'paywall_from',
  paywallOpened: 'paywall_opened',
  paywallSeen: 'paywall_seen',
  boughtFrom: 'bought_from',
} as const;

/** 購入画面の入り口。これ以外は other にまとめる */
export const PAYWALL_FROM = [
  'home', 'map-floor', 'map-cleared', 'exam-limit', 'exam-result', 'kakomon-limit', 'focus', 'stats', 'note', 'zukan', 'shop',
  'course', 'course-result', 'weak-result', 'settings',
] as const;
export type PaywallFrom = (typeof PAYWALL_FROM)[number];

export function fromOf(from: string): string {
  return (PAYWALL_FROM as readonly string[]).includes(from) ? from : 'other';
}

export function paywallAttrs(from: string, opened: number, seen: number): Attrs {
  return {
    [ATTR.paywallFrom]: fromOf(from),
    [ATTR.paywallOpened]: String(Math.max(0, Math.floor(opened))),
    [ATTR.paywallSeen]: String(Math.max(0, Math.floor(seen))),
  };
}

export const boughtAttrs = (from: string): Attrs => ({ [ATTR.boughtFrom]: fromOf(from) });
