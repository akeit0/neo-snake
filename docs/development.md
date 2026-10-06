# 開発と公開

[READMEへ戻る](../README.md)

## 起動と公開版の確認

生成にNode.js 22以上を使います。追加パッケージや `npm install` は不要です。

```sh
npm run build
python -m http.server 8080 --directory dist
```

[http://localhost:8080](http://localhost:8080) を開くと公開版を確認できます。`dist/index.html` を直接開くこともできます。公開版の設定には表示変更と永久強化のリセット／復元だけがあり、数値調整・JSON入出力・チップ変更・任意Wave開始は含みません。以前の開発用バランス設定も読み込みません。

開発用の数値調整を使う場合は別の出力を生成します。

```sh
npm run build:dev
python -m http.server 8081 --directory .dev
```

[http://localhost:8081](http://localhost:8081) が開発版です。画面のバージョンに `DEV` を付けて区別します。公開版と別ポートなので、ブラウザの記録も分かれます。

## GitHub Pages

1. このリポジトリをGitHubへpushします。
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定します。
3. `main`へのpush、またはActionsの「Publish GitHub Pages」の手動実行で、テスト・公開版生成・配信が実行されます。

[GitHub公式のPages手順](https://docs.github.com/ja/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)に沿ったワークフローを `.github/workflows/pages.yml` に用意しています。配信対象は **`dist/`のみ**です。リポジトリ全体や `.dev/` を公開対象にしないでください。手動で静的ホスティングへ配置するときも `dist/` の内容だけを使います。アセットは相対パスなので、`https://ユーザー名.github.io/リポジトリ名/` 配下でも動作します。

## バージョンと原本

アプリのバージョンは `package.json` の `version` だけで管理します。生成時に画面の `v…` 表示へ反映します。アセットURLにはバージョンと内容のハッシュを付け、同じ版番号の修正でも古いキャッシュが残らないようにします。HTMLは `src/index.html`、標準値は `assets/js/balance.js` が原本です。公開版・開発版のHTMLと標準値JSONは生成物なので、直接編集しません。

## 設定・バランス調整（開発版）

開発版の「設定」内に数値編集メニューがあります。公開版にはこの節の機能を含めません。移動間隔、敵・障害物・回収目標の増加式と上限、開始の長さ・ライフ、基本エサ数・連鎖猶予、射撃間隔・弾速、爆弾の間隔・範囲・飛行時間、最低短縮数・短縮割合、得点・ボーナス、永久強化の各Lvの価格を調整できます。

- 「数値を保存」：ブラウザに保存し、次のランから適用。永久強化の価格は保存後から適用します。
- 「標準値を入力」：編集欄を標準値へ戻します。保存するまでは確定しません。
- 「JSONを書き出す」：現在の編集欄を `neo-snake-balance.json` として出力します。
- 「JSONを読み込む」：JSONファイルを検証し、編集欄に反映します。保存するまでは確定しません。
- 「編集値でテストラン開始」：編集値を保存し、指定ウェーブで新しいランを開始。現在のランは置き換わります。
- 「所持チップを設定」：指定した所持数を即時保存。永久強化の購入テストに使えます。

JSON形式は `{ "version": 1, "balance": { ... } }`。`balance` にはすべての数値項目が必要です。標準値の完全な例は開発版生成時の `.dev/balance.default.json` を参照してください。標準値は `assets/js/balance.js`、各キー・ラベル・許容範囲は `dev/balance.js` の `BALANCE_FIELDS` に定義しています。JSONの `version: 1` は入出力形式の版番号で、アプリのバージョンとは別です。未知のキー、不足項目、数値以外、非有限数、範囲外、個数の小数、開始数より低い上限などは拒否します。読み込みに失敗しても現在の設定は変えません。以前の完全なJSONも読み込め、追加された価格・短縮・テール・カッターの項目は現在の標準値で補完します。廃止済みの `indirectGrowthEvery` と `shedCost` / `shedThreshold` / `shedInterval` / `shedAmount` は除去します。既存の保存済み設定も同じ方法で引き継ぎます。JSONにはチップ・永久強化・ランの状態は含めません。 旧形式の基本価格と `costGrowth` は、読み込み時に各Lvの価格へ一度だけ変換します。倍率がない旧形式は1.5で変換します。保存・書き出し後は手動テーブルのみとなり、`costGrowth` は含めません。

## 演出プレビュー

開発版のTHE PIT右側の「演出」ボタンから、回収・破壊・移動、CHAIN（×10・×15・×20）・OUCH・通知、終了画面、ハイスコア、Waveクリアの演出を専用画面で確認できます。公開版には含みません。プレビューは記録・チップ・永久強化を変更しません。

共通HTMLから `.dev/effects.html` を生成し、`dev/effects-preview.js` が本体の描画・演出・終了画面関数を呼びます。見た目の実装をプレビュー用に複製しません。

## ファイル構成と処理の入口

| 原本・生成物 | 内容 |
| --- | --- |
| `docs/` | 遊び方・強化・バランス・開発・デザインの資料 |
| `src/index.html` | 共通HTML。バージョンは生成時に埋め込む |
| `assets/css/style.css` | 共通のPC・スマホ向けレイアウトと演出 |
| `assets/js/balance.js` | 標準値の唯一の原本。公開版は保存済みの調整値を使わない |
| `assets/js/settings.js` | 表示設定、永久強化のリセット／復元、追加設定セクションの登録口 |
| `assets/js/game-data.js` | 通常・永久強化の定義、上限、SVGアイコン |
| `assets/js/game.js` | ラン状態、難易度、移動・回収・戦闘、強化、フレーム更新 |
| `assets/js/game-render.js` | 盤面・影・各オブジェクト・エフェクトの描画 |
| `assets/js/game-effects.js` | 粒子・リング、通知、記録の保存 |
| `assets/js/music-synth.js` | オリジナルBGMの合成。小分けに生成して操作・描画へ処理を戻す |
| `assets/js/game-audio.js` | BGM・効果音の再生、音量、テンポ別キャッシュの管理 |
| `assets/js/game-ui.js` | HUD、ビルド、終了画面、永久強化ショップ、ヘルプ |
| `assets/js/game-input.js` | キーボード、スワイプ、各ボタン、Safariの拡大抑止 |
| `assets/js/locale.js` | EN／日本語切り替え。通常の更新時は変更されたDOMだけを翻訳 |
| `assets/js/main.js` | 入力接続、開始画面、フレーム更新の起動 |
| `dev/` | 数値検証・JSON・デバッグ設定画面・演出プレビュー・専用翻訳／CSSの追加分だけ |
| `scripts/build.cjs` | 共通原本から公開版と開発版を生成し、配信ファイルを検査 |
| `dist/` | 公開版の生成物。Git管理しない。Pagesはこの中だけを配信 |
| `.dev/` | 開発版と標準値JSONの生成物。Git管理・配信しない |
| `.github/workflows/pages.yml` | テスト、生成、GitHub Pagesへの配信 |

ブラウザでは通常のスクリプトとして読み込みます。読み込み順は共通HTMLに定義し、開発版は数値設定・翻訳・設定画面の追加分を生成時に挿入します。`game.js` の状態を各ファイルの関数が共有し、起動処理は最後の `main.js` に集約しています。描画順は `game-render.js` の `draw()`、毎フレームの更新順は `game.js` の `update()` から追えます。全体の影を先に描く順序を維持してください。

## 音の生成とキャッシュ

合成は約4ミリ秒の処理枠で小分けに実行します。新しいテンポの音が完成するまで現在の曲を再生し、直近4種類のテンポをキャッシュします。テンポ変更時も音程と曲の進行を保ちます。プレイヤー向けの仕様は[音・BGM](gameplay.md#音bgm)を参照してください。

## 検証

Node.js がある場合、ゲームロジックの回帰テストを実行できます。

```sh
npm test
```

難易度・戦闘・強化・設定・翻訳・タッチ入力に加えて、公開版のデバッグ除外、保存済み調整値の無視、共通原本からの生成と配信ファイルの整合性を検証します。テストが公開版・開発版を生成するため、先にビルドする必要はありません。

Google Fonts を読み込みます。接続できない場合は標準フォントに切り替わります。
