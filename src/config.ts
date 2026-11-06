/**
 * アプリ全体の設定。課金は RevenueCat。キーが空のあいだは「いまは購入できません」と出して、課金は走らない。
 * キーは RevenueCat の公開 API キー（秘密鍵ではない）。ストアの商品を作ったらここに入れる。
 */
export const CONFIG = {
  appName: 'パスダン',
  fullName: 'ITパスポート 合格ダンジョン',
  version: '1.3.0',
  revenuecat: { ios: 'appl_OwRTjPqTCKDLkpmcMznjZWrTNPu', android: 'goog_trrMWXPzlpBTlWnjOfkPEktxhla' },
  products: {
    /** 完全版（買い切り・非消耗型）。3つのダンジョン・模擬試験ボス・1日の上限なし・くわしい分析 */
    full: { productId: 'pasudan_full', entitlement: 'full', fallbackPrice: '¥1,480' },
    /** 見た目セット（買い切り・非消耗型）。相棒と主人公の見た目が増える。強さは変わらない */
    looks: { productId: 'pasudan_looks', entitlement: 'looks', fallbackPrice: '¥480' },
    /** まとめ買い(買い切り)。RevenueCat ではこの商品に full と looks の両方の entitlement を付ける */
    bundle: { productId: 'pasudan_bundle', entitlement: 'full', fallbackPrice: '¥1,680' },
  },
  /** 無料で1日に解ける問題数（苦手の復習は数えない） */
  freeDailyLimit: 30,
  privacyUrl: 'https://kame6493-del.github.io/pasudan/privacy.html',
  /** 問い合わせ先(メール)とよくある質問のページ */
  supportUrl: 'https://yurustudio.github.io/apps/pasudan/support.html',
} as const;
