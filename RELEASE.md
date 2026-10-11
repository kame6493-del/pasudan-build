# パスダン(ITパスポート 合格ダンジョン) ストアに出す準備(2026-10-11)

## 基本の値
- applicationId / Bundle ID: jp.pasudan.app(変えない)
- Android: versionCode 3 / versionName 1.0.0(vc1・vc2 は Play に上げたので使えない。次は 4 から)。vc3 = 過去問道場・BGM/効果音・課金の線引き変更の版(releases/pasudan-1.0.0-vc3-release.aab、14.5MB なのでブラウザでは上げられない。API で上げる)
- iOS: MARKETING_VERSION 1.0.0、iPhone のみ(TARGETED_DEVICE_FAMILY 1)、縦固定、ITSAppUsesNonExemptEncryption=false
- 課金(RevenueCat、プロジェクト Nigatecho): pasudan_full(¥1,480)・pasudan_looks(¥480)・pasudan_bundle(¥1,680)、すべて買い切り
  - 権利: full ← full・bundle / looks ← looks・bundle。売り場 default: $rc_lifetime ← full、pasudan_looks・pasudan_bundle の各パッケージ
  - 公開キーは src/config.ts(appl_… / goog_…、秘密鍵ではない)。登録スクリプト: Downloads/ios_release/rc_pasudan.py(結果 new3/rc_keys_pasudan.json)
  - RevenueCat アプリ: iOS appdf84259c93 / Android app05a3ae430f
- プライバシーポリシー: https://kame6493-del.github.io/pasudan/privacy.html(削除の手順は #delete)/ サポート: https://kame6493-del.github.io/pasudan/
  - サイトのリポジトリは Downloads/カチマケ_2026-09-30/app-ads-site(一覧にもカード「テスト準備中」を足した)

## 署名鍵(Android アップロード鍵)
- %LOCALAPPDATA%\PasudanBuild\signing\pasudan-upload.jks(別名 pasudan-upload)
- パスワードは同じフォルダの upload-password.dpapi(DPAPI、この Windows ユーザーだけが復号できる)。値はどこにも書いていない
- 証明書 SHA256: 58:34:02:77:F4:71:BA:CC:B6:85:E1:80:76:AE:79:62:D9:48:AC:FA:B5:51:23:2A:4D:5A:00:67:2F:1B:EB:3E
- 鍵は作り直さない。フォルダごと安全な所へ控えること。リポジトリには入れていない
- 組み直し: npm run build → npx cap sync android → powershell -File scripts/build-android.ps1(出力 releases/pasudan-1.0.0-release.aab。上げた物は releases/pasudan-1.0.0-vc2-release.aab に改名)
- AAB を 10MB 未満に保つため、Android の起動画面とアイコンは WebP(scripts/native_assets.py)、public/icon.png は 192px。vc2 は 9.83MB

## Google Play(デベロッパー 6012234920005416628)
- アプリID 4972928463633286960、名前「パスダン - ITパスポート過去問ダンジョン」、日本語、アプリ、無料、カテゴリ 教育
- クローズドテスト(Alpha、トラック 4700418852499097575): 日本・カナダ、テスター nigatecho-testers@googlegroups.com、フィードバック kame6493@gmail.com
- 2026-10-11 にリリース 2 (1.0.0) を含む14件の変更を審査に送信済み
- 申告した内容
  - プライバシーポリシー URL: 上記
  - 広告: なし / 広告ID: 使わない
  - アプリへのアクセス(ログインの詳細): 制限なし(ログイン不要)。課金で開く完全版はあるが、「はい」にすると「この情報で有料部分まで使える」の確認が必須で事実と合わないため、既存アプリと同じく「いいえ」にした
  - コンテンツのレーティング(IARC、その他のアプリ): 空想の生物へのアニメ調の暴力あり(流血なし・非現実的な反応)、デジタル購入あり、ランダムな有料アイテムなし、教育アプリ。結果 IARC 3+ / PEGI 3 / ESRB E / USK 6
  - ターゲット層: 16〜17歳・18歳以上(子ども向けにしない)
  - データセーフティ: 購入履歴とデバイスなどの ID を収集(アプリの機能・必須・転送時暗号化・共有なし・一時処理ではない)、アカウント作成なし、削除の依頼方法あり(privacy.html#delete)
  - 行政アプリ・金融機能・健康機能: いいえ
  - 連絡先: kame6493@gmail.com、ウェブサイト https://kame6493-del.github.io/pasudan/
  - 掲載: 題名・短い説明・詳しい説明(store/listing.md)、アイコン 512・フィーチャー画像・画面写真 8枚(store/play)、AI の申告は「ラベルを付けない」
- 1回限りのアイテム 3つを作成・有効(購入オプション ID は buy、下位互換)

## App Store Connect
- App ID 6821542540、SKU pasudan20261011、名前は Play と同じ、プライマリ言語 日本語
- API で入れたもの(Downloads/ios_release/new3/pasudan_ios.py): 版 1.0.0、カテゴリ 教育、サブタイトル・説明・キーワード・プロモーション文・サポート URL、著作権表示、第三者コンテンツあり(IPA の過去問)、年齢区分(アニメ調の軽い暴力のみ → 9+)、画面写真 8枚(1290x2796、store/ios)、審査の連絡先とメモ、価格 無料、販売地域 日本のみ
- 課金 3つ: 価格・日本・表示名・審査メモ・審査用写真(new3/iap/pasudan.png)まで入れて READY_TO_SUBMIT
- App のプライバシー(Web): ユーザID・購入履歴 / アプリの機能 / ユーザに関連付けない / 追跡なし で公開済み(こつびんと同じ)
- 「審査に提出」は押していない

## 残り
- iOS のビルド: .github/workflows/ios-testflight.yml(こつびんと同じ、署名なしでアーカイブ→書き出しで App Store 用に署名)を用意したが、GitHub に公開リポジトリを作る操作は自動判定で止められたので未作成・未 push。持ち主が公開でよいと決めたら、kame6493-del/pasudan を作って push し、シークレット4つ(こつびんと同じ値、Downloads/ios_release/go.sh の手順)を入れて Actions を流す。その後 ASC で版にビルドを付ける(new3/attach.py の方法)
- 効果音を RPG 風に作り直す作業(別の作業者)が入ったら、Android は versionCode 3 で組み直して Play のクローズドテストに差し替え、iOS はその版でビルドする
- RevenueCat の Android アプリ(app05a3ae430f)に Play のサービスアカウント JSON を登録する(秘密鍵入りなので持ち主が行う。無いと Android の購入が権利に反映されない)。Play の「収益化のセットアップ」でリアルタイム通知(トピック projects/plenary-shade-437402-h4/topics/Play-Store-Notifications)も既存アプリと同じくつなぐ
- Play: 12人×14日のクローズドテスト → 製品版の申請
- iOS: ビルドが届いたら版に付け、課金3つを版と同じ提出に入れて「審査に提出」(取りまとめ側が持ち主の許可で押す)。4.3(a) の警告付きアカウントなので、ほかのアプリと間を空ける
- 実機での確認はしていない(購入・復元・戻るボタン・振動)
- 2026-10-11 夕: 線引きの変更(無料=過去問道場990問・森の全10階+城と塔3階・模試2回・予想点は総合・ノート16テーマ・カードは銀まで)に合わせて store/listing.md と画面写真8枚(過去問道場・予想点を入れた)を直した。ASC は説明文・プロモーション文・写真・pasudan_full の説明・審査メモを API で入れ直し済み(new3/pasudan_ios.py --replace-shots)。Play の掲載と pasudan_full の説明は Downloads/ios_release/play/pasudan_listing_v3.py で入れる
- Play API のサービスアカウント(revenuecat@plenary-shade-437402-h4)は、パスダンについて AAB のアップロードはできたが、リリース・掲載・課金アイテムの変更は 403 だった。持ち主が Play Console で権限を足す
- iOS ビルド: GitHub Actions(private リポジトリ)は「支払い/上限」で job が始まらなかった(run 38119579899)。上限は上げない方針
