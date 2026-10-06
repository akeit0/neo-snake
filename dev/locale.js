"use strict";
Object.assign(
  ENGLISH_TEXT,
  Object.fromEntries(
    `
演出	Effects
演出プレビュー	Effects preview
再生	Replay
回収・破壊・移動	Pickup / destruction / movement
終了画面	Run result
ハイスコア	High score
ウェーブクリア	Wave clear
記録・チップは変更しません。	Records and chips are unchanged.
設定とバランス調整	Settings and balance
数値設定はこのブラウザに保存し、次のランから適用します。価格は保存後から適用。現在のランの進行や能力は維持します。	Balance values are saved in this browser and apply next run. Prices apply after saving. The current run keeps its progress and abilities.
数値設定・デバッグ	Balance and debug
敵や障害物の増加、移動間隔、攻撃、得点と価格を調整できます。移動・射撃の間隔は秒単位で、小さいほど速くなります。	Adjust enemy and obstacle growth, movement, attacks, scores and prices. Movement and firing intervals are in seconds; smaller values are faster.
数値を保存	Save values
標準値を入力	Fill defaults
JSONを書き出す	Export JSON
JSONを読み込む	Import JSON
JSONの読み込みと標準値の入力は編集欄だけを変更します。「数値を保存」で確定してください。書き出しは編集欄の値を出力します。	Importing JSON or filling defaults only changes the form. Use Save values to apply. Export writes the values currently in the form.
開始ウェーブ	Starting wave
編集値でテストラン開始	Start test run with edited values
強化	Upgrades
設定	Settings
コンパクト・ボディ	Compact Body
タフ・スキン	Tough Skin
チェイン・メモリー	Chain Memory
ボム・ランチャー	Bomb Launcher
ラップ・エコー	Wrap Echo
テール・カッター	Tail Cutter
永久強化	Permanent upgrades
数値設定はオブジェクトで指定してください。	Balance values must be an object.
設定項目に不足または未知のキーがあります。	Balance fields are missing or contain unknown keys.
開始数は上限以下にしてください。	Starting counts must not exceed their maximums.
最短間隔は開始・基本間隔以下にしてください。	Minimum intervals must not exceed starting or base intervals.
爆弾Lv.3の基本間隔が1秒以上になるようにしてください。	The base level 3 bomb interval must be at least 1 second.
テール・カッターの最低長さは発動する長さより小さくしてください。	Tail Cutter minimum length must be below its activation threshold.
発動する長さで1つ以上切断できる割合にしてください。	The cut percentage must allow at least one segment at the threshold.
対応形式は version: 1 と balance の JSON です。	Expected JSON with version: 1 and balance.
 は 	 must be 
 の整数	 (integer)
 の数値	 (number)
所持チップ	Chip balance
所持チップを設定	Set chip balance
テストラン開始は現在のランを置き換えます。所持チップの設定は即時保存します。	Starting a test run replaces the current run. Chip balance changes are saved immediately.
ウェーブ・難易度	Waves and difficulty
スネーク・射撃・回収	Snake, shooting and collection
爆弾	Bombs
得点・永久強化価格	Score and permanent upgrade prices
空欄の数値があります。	A numeric field is empty.
所持チップは0〜1,000,000の整数で指定してください。	Chip balance must be an integer from 0 to 1,000,000.
開始ウェーブは1〜10,000の整数で指定してください。	Starting wave must be an integer from 1 to 10,000.
保存しました。次のランから数値を適用します。	Saved. Values apply next run.
標準値を入力しました。保存すると確定します。	Defaults filled. Save to apply.
所持チップを入力してください。	Enter a chip balance.
所持チップを設定しました。	Chip balance updated.
編集欄の数値をJSONに書き出しました。	Form values exported to JSON.
JSONは100KB以下にしてください。	JSON must be 100 KB or smaller.
JSONを読み込みました。保存すると確定します。	JSON imported. Save to apply.
で指定してください。	.
`
      .trim()
      .split("\n")
      .map((line) => line.split("\t")),
  ),
);
const FIELD_LABELS_EN = [
  "Starting food target",
  "Food target increase per wave",
  "Maximum food target",
  "Starting enemies",
  "Waves per additional enemy",
  "Maximum enemies",
  "Starting obstacles",
  "Obstacles added per wave",
  "Maximum obstacles",
  "Initial move interval (s)",
  "Move interval reduction per wave (s)",
  "Minimum move interval (s)",
  "Initial enemy move interval (s)",
  "Enemy interval reduction per wave (s)",
  "Minimum enemy interval (s)",
  "Starting length",
  "Starting lives",
  "Base food count",
  "Base chain window (s)",
  "Base firing interval (s)",
  "Minimum firing interval (s)",
  "Bullet speed (cells/s)",
  "Level 1 bomb interval (s)",
  "Bomb interval reduction per permanent level (s)",
  "Bomb targeting range (cells)",
  "Bomb flight time (s)",
  "Maximum bomb radius (cells)",
  "Compact Body minimum reduction",
  "Compact Body reduction (%)",
  "Tail Cutter food per charge",
  "Tail Cutter length threshold (must exceed)",
  "Tail Cutter maximum cut (%)",
  "Tail Cutter minimum length",
  "Regular food base points",
  "Enemy defeat points",
  "Obstacle destruction points",
  "Clear bonus per wave number",
  "Wave 7 milestone bonus",
  "Tough Skin Lv.1 price",
  "Tough Skin Lv.2 price",
  "Tough Skin Lv.3 price",
  "Chain Memory Lv.1 price",
  "Chain Memory Lv.2 price",
  "Chain Memory Lv.3 price",
  "Chain Memory Lv.4 price",
  "Bomb Launcher Lv.1 price",
  "Bomb Launcher Lv.2 price",
  "Bomb Launcher Lv.3 price",
  "Wrap Echo Lv.1 price",
  "Tail Cutter Lv.1 price",
];
BALANCE_FIELDS.forEach((field, i) => {
  ENGLISH_TEXT[field[2]] = FIELD_LABELS_EN[i];
});
TRANSLATIONS = Object.entries(ENGLISH_TEXT).sort(
  (a, b) => b[0].length - a[0].length,
);
