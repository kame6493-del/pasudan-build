# パスダン(ITパスポート 合格ダンジョン) ストアに出す準備(2026-10-11)

## 基本の値
- 2026-11-04 深夜 versionCode 16 / versionName 1.3.0(持ち主「完全初心者から合格まで行けるくらい」「次どれ選べばいいか分かるように」「敵キャラを良い感じの量に、モンスター紹介」): ①学ぶ道を IPA シラバス Ver.6.5(2026-01 掲載、取適法を反映)の中分類23をすべて含む87単元に(ストラテジ32・マネジメント17・テクノロジ38。セキュリティ11・ネットワーク5・法務9)。中身は src/data/units/*.json(説明2〜4枚・図か表・たとえ・用語3〜5・確かめの過去問3〜5問(単元ごとに選び全問の解説と照合、重複なし)・ここが試験に出る)、点検 scripts/check_units.py・過去問さがし scripts/find_q.py。道すじは各分野の入門3つずつの後、進み具合の割合がそろうようにまぜる ②迷わない操作: 学ぶのタブの最上段に「次はこれ n/87 単元名 約n分」の大きなボタン(押すと続きから)、初回だけ「ここを押せば始まります」の指さし(learnTip)、合格までの道(%・分野ごと)、すごろくの道すじ(済み=印・今=光る・まだ=薄く・鍵)、最後に分野のまとめのテスト20問(6割で合格ライン、完全版)と模擬試験。単元の中は各画面に大きな「次へ」1つ・小さな「前へ」、最後に「次の単元へ」 ③無料は各分野の最初の3単元(FREE_UNITS=3)、鍵の単元は購入画面に本物の続き ④敵: 各ダンジョンの敵をかぶらないように分け、森9・城8・塔10種+ボス各1、深い階ほど新しい敵(world.ts の floors / enemiesAt)。ChatGPT で同じ絵柄の新しい敵9体(コンプラおばけ・コピーいたち・あかじガエル・えんじょうインプ・すなどけいゴーレム・ブラックボックス・フィッシングスライム・ブルートフォースゴーレム・ブロックチェーンスネーク、元絵は ../../ios_release/pasudan_1104/mons)。特性は今の組み合わせの幅で、HP は階で決まるので難しさは変わらない ⑤モンスター図鑑を学ぶのタブから(src/ui/Monsters.tsx、全33体、まだの敵はかげ、紹介文と関わる用語→単元へ、src/domain/monsters.ts)。試験 108件 PASS(learn.test.ts を作り直し、monsters.test.ts を足した)。画面 ../../ios_release/pasudan_1104/shots/learn(360x640・412x915・800x1280、DPR3)。releases/pasudan-1.3.0-vc16-release.aab。Play には上げていない(上げる用 Downloads/ios_release/play/upload_pasudan_vc16_1104.py・製品版 prod_release_pasudan_1104.py、未実行)
- 2026-11-04 夜 versionCode 15 / versionName 1.2.0(持ち主の依頼をまとめて): ①戦いの相棒と主人公をうしろ姿に(しろねこが手前を向いていた。相棒10匹・主人公3人のうしろ姿を ChatGPT で同じ絵柄に描いた public/art/*_back.webp、world.ts の battle)②画質: 相棒7・主人公4・ボス1・ふくろう先生・敵11を ChatGPT で描き直し→ESRGAN で表示の3倍(敵440px・主人公420px・相棒380px)、ホームの背景・題字・戦いの背景(森・城・塔)・アイコン(1254px から mipmap とストア用 512)も描き直し。元は ../../ios_release/pasudan_1104/art_before、まとめ絵は pasudan_1104/gpt ③攻撃の音: 剣は 効果音ラボ「剣の素振り3」+魔王魂「戦闘03」、クリティカルは魔王魂「戦闘06」+効果音ラボ「大パンチ」、ネコの魔法使いは効果音ラボ「風魔法1」+「火炎魔法1」(前の「剣で斬る2」は 5kHz より上が6割の高い音)④戦いの中の音の窓(BGM・効果音のつまみと切り替え、開いている間は時計を止める。設定と同じ SoundControls)⑤課金: 無料は森5階・城と塔2階ずつ・模試1回・過去問道場1日30問・学ぶ道は各分野2単元・覚えるカード10枚。購入画面は大きな利点3つ+無料と違う行だけの表、鍵の階は次の階の本物の様子(敵と実際の問題の書き出し)、RC に paywall_from・paywall_opened・paywall_seen・bought_from(src/domain/track.ts)⑥はじめての人: 「ITパスポートは初めて?」3択→遊び方4画面(設定から再表示)→まったく初めて=試験の説明と学ぶ道 / 少し知っている=ガイドつきの最初の1戦 / 過去問=過去問道場。ゼロから学ぶ道 30単元(src/data/course.ts、説明→用語カード→やさしい過去問3問→ダンジョンの階)、覚えるカード(まちがえた問題の用語が自動で入る)、ホームの「今日やること」、苦手の「分野別の集中」(完全版)。下のタブ「図鑑」は「学ぶ」に。試験 93件 PASS(src/test/learn.test.ts を足した)。画面は pasudan_1104/shots(360x640・412x915・800x1280、DPR3)。Play には上げていない。
- 2026-10-30 versionCode 14 / versionName 1.1.5(Discord のテスターの指摘 10/28: クリティカルの時間が文字数に合わせてあり、計算の問題は文の量の割に時間を食う): 早押しの時間は 8+文字数/9 秒(上限51秒)のままにして、計算の問題だけ +15秒(上限66秒)、短い文でも最短30秒にした(src/domain/game.ts の critWindow・CALC_BONUS・CALC_MIN)。1問の時間は今まで通り早押し+30秒。計算の問題の見分けは前から序盤の出題に使っている needsCalc(数値の条件と「計算・求め・稼働率・利益・何ビット」などの語・数値が3つ以上・答えが数値だけ・プログラムつき)で、990問のうち95問。95問の早押しの中央値は 35秒→50秒、計算でない問題(中央値27秒)は変えていない。判定を緩める方法(正解なら時間切れ後もクリティカル等)はとらなかった: 早押しの手ざわりが消え、暗やみの階・目くらまし・時の砂などのしかけの意味が変わるため。しかけの倍率(暗やみ0.7倍・半分・+秒)はのばした後の時間にそのままかかる。試験 src/test/format.test.ts に5件(全80件 PASS)、画面の確認 ../qa/shots_1028_calc.py(headless Edge、390x844・360x640、テクノロジの塔 第4階で計算の問題3問ずつ、表示のクリティカル秒が新しい決め方に合うこと、写真 ../shots_1028_calc)。releases/pasudan-1.1.5-vc14-release.aab を Downloads/ios_release/play/upload_pasudan_vc14_1028.py でクローズドテスト(alpha)に公開(製品版は触っていない)。
- 2026-10-25 昼 versionCode 13 / versionName 1.1.4(持ち主: 問題を出す板が古い紙の色でダンジョンに合わない): 生成り・ベージュの板(パネル・問題の板・選択肢・解説・設定のシート・ホームやショップの札など)を暗い石の色(--paper #212a3e ほか、src/index.css の :root)に、字は明るく(--ink #eef1f7)。確認 ../qa/shots_1025_dark.py(写真 ../shots_1025_dark)、1画面に収まるかは shots_1024_fit と同じ判定ではみ出し0。releases/pasudan-1.1.4-vc13-release.aab を Downloads/ios_release/play/upload_pasudan_vc13_1025.py でクローズドテスト(alpha)に公開。
- 2026-10-25 1時 セーフエリアの直し(Discord のよふけの指摘を受けた先回りの見回り): 最初の案内(試験日・つぎへ/あとで)の下のボタンがナビゲーションバー(下48px の見立て)に18px 重なっていた → Onboarding の .scroll の下に var(--safe-b) を足し、--safe-t/--safe-b を env() と Capacitor 8 の --safe-area-inset-* の大きい方に。見立てなしの見た目は同じ。vc12 の AAB を同じ versionCode のまま作り直した(前の物は releases/*_0017前.aab)。motion.test の1件の失敗は直す前からある物
- applicationId / Bundle ID: jp.pasudan.app(変えない)
- Android: versionCode 12 / versionName 1.1.3(2026-10-24 夜、持ち主の指示3つ。①スクロールせずに答える: 問題を解く画面(ダンジョン・過去問道場・模擬試験)で、問題文・4択・ボタンが1画面に入るまで src/ui/qfit.ts が段(data-fit 0〜5)を上げ、文字・余白・舞台の高さを詰める。短い選択肢は2列、組合せの a・b・c は横並び。それでも入らない長い問題だけ問題文の部分が中でスクロールし、選択肢は常に見える。確認は ../qa/shots_1024_fit.py(360x640・390x844・412x915、年度ごとに長い問題8問+2列の問題、ダンジョン3問、模擬試験10問。はみ出し0、写真は ../shots_1024_fit)。②絵の画質: 背景は参考画像から1倍で切り直して Real-ESRGAN 4倍→幅1080、ChatGPT のまとめ絵の部品は原寸で切り直して ESRGAN→2倍、ほかの部品は ESRGAN→2〜3倍、webp 品質88(scripts/upscale_art.py、元の絵は ../work_upscale/orig、見比べは ../work_upscale/cmp_*.png)。③Discord のそらさん(10/24)「ゲーム部分が動くと学習に集中できない」: 設定に「動きを少なく」(src/ui/motion.ts、端末の視差効果を減らす設定が初期値、問題中は敵・相棒・背景が止まり当たり・はずれの演出は短く消える。確認 ../qa/shots_1024_motion.py)。releases/pasudan-1.1.3-vc12-release.aab。Play には未提出(vc10・vc11 の直しも入っている))。旧: versionCode 11 / versionName 1.1.2(2026-10-24、Discord の yama さん(10/22)の報告: 端末の文字サイズ・表示サイズを最大にするとショップの文字がはみ出す。MainActivity で WebView の textZoom を端末の文字サイズに合わせつつ 150% までに抑え、画面の側は 150%・幅300px でもはみ出さない作りに(下のタブの名前は枠に収まるよう縮める src/ui/fit.ts・着がえのマスは文字の大きさに合わせて列数が減る・札は1行・分野別の予想点や目標・試験日までの行・ダンジョンの札・問題の見出し・正解の見出しは折り返す)。確認は scripts/bigtext_check.py(倍率 1.0/1.3/1.5、幅 300・320・360・390・横 844x390、ホーム・ショップ・各タブ・設定・バトル・完全版の案内、はみ出し0)、写真は ../shots_1024_bigtext。releases/pasudan-1.1.2-vc11-release.aab。Play には未提出(vc10 の直しも入っている))。旧: versionCode 10 / versionName 1.1.1(2026-10-19、Discord の HZK さん(10/18)の要望: 見た目セットが課金の物だと画面から分からず、変え方も探して悩んだ。ショップの先頭を「主人公・相棒の着がえ」にし、マスごとに札(無料=緑 / コイン数 / 鍵つき「有料」+「見た目セット」)と札の見方を出す。鍵の物を押すと「見た目セット(有料)」の短い案内が出て、「売り場を見る」を押した時だけ見た目セットの売り場へ移る(購入はそこのボタンを押した時だけ)。ホームのゴースト対戦の下に着がえの入口、設定の項目名を「主人公・相棒の着がえ」、はじめの主人公えらびの札も鍵つき「有料」に。課金の値段・中身は変えていない。札の決まりは src/domain/world.ts の lookState、テスト src/test/looks.test.ts。画面の確認は ../qa/shots_1019_looks.py(390x844・360x640・1280x800、写真は ../shots_1019_looks)。releases/pasudan-1.1.1-vc10-release.aab。Play には未提出。控えのタグ feedback-hzk-before-2026-10-19)。旧: versionCode 9 / versionName 1.1.0(2026-10-18、ダンジョンのしかけを大量に足した版。敵の特性9種・新しい敵9体+ゴールドスライム+ミミック・ボスの行動5種・分かれ道とマス8種・相棒の技10種となかよし度・新しい相棒3匹・階のしかけ5種・曜日の日替わり7種・アイテム4種・階の星・モンスター図鑑・初撃破のおまけ。数字は src/domain/gimmick.ts、テスト src/test/gimmick.test.ts(全68件)、通しプレイ qa/play_gimmick.py(390x844・360x640・844x390、曜日を変えて)。絵は ChatGPT で透過のまとめ絵4枚→scripts/gpt_cut.py で36個。vc8 の直しも入っている。releases/pasudan-1.1.0-vc9-release.aab を play_bundle_only.py でライブラリに上げ、10/18 Play Console でクローズドテスト(Alpha)のリリース 9 (1.1.0) にして日英のリリースノート付きで審査に送信。製品版は触っていない。控えのタグ gimmick-before-2026-10-18)。旧: versionCode 8(2026-10-18、Discord テスターへの約束2件: 敵・相棒の絵の端が切れていた(参考画像からの切り抜きが狭かった13枚を scripts/cut_assets.py の key_fit で切り直し)・見返し中は問題の時間を止める。releases/pasudan-1.0.0-vc8-release.aab。Play には未提出)。旧: versionCode 7(2026-10-16、テスター efukan さんの要望で選択肢ごとの解説。src/data/choiceExplain.json(990問)・まちがえた時は選んだ答えの解説を先に・「ほかの選択肢の解説」は開閉・次へのボタンは画面下に固定。releases/pasudan-1.0.0-vc7-release.aab 12.7MB を play_bundle_only.py でライブラリに上げ、10/16 18:04 Play Console でクローズドテスト(Alpha)のリリース 7 (1.0.0) にして審査に送信。審査中だった vc6 は置き換え。製品版には出していない)。旧: versionCode 6(2026-10-16、テスター efukan さんの要望でクエスト中に答えた問題を見返す「前の問題を見る」。R8 入り。releases/pasudan-1.0.0-vc6-release.aab 12.6MB を play_bundle_only.py でライブラリに上げ、10/16 17:45 ごろ Play Console でクローズドテスト(Alpha)のリリース 6 (1.0.0) にして審査に送信済み。製品版には出していない)。versionCode 5 は Play 未提出(2026-10-14 夜、R8 を入れて dex を 16MB→3.2MB に縮めた版。releases/pasudan-1.0.0-vc5-release.aab 12.6MB(うち 2.2MB は Play 用の難読化マップで端末には届かない)。実機で購入・復元・戻る・振動を確かめてから上げる)。versionCode 4 / versionName 1.0.0(2026-10-14 テスターの指摘で序盤を易しく・問題文の区切り。releases/pasudan-1.0.0-vc4-release.aab を play_bundle_only.py で App Bundle ライブラリに上げ済み、トラックへの割り当ては Play Console で。vc3 は Play に上げていない。次は 5 から)。旧: vc3 = 過去問道場・BGM/効果音・課金の線引き変更の版(releases/pasudan-1.0.0-vc3-release.aab、14.5MB なのでブラウザでは上げられない。API で上げる)
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
