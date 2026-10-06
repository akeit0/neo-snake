"use strict";
// [key, group, label, minimum, maximum, step]; defaults come from the runtime.
const BALANCE_FIELDS = [
  ["targetBase", "difficulty", "回収目標：開始個数", 1, 300, 1],
  ["targetStep", "difficulty", "回収目標：毎ウェーブ増加", 0, 100, 1],
  ["targetMax", "difficulty", "回収目標：上限", 1, 300, 1],
  ["enemyBase", "difficulty", "敵：開始数", 0, 50, 1],
  ["enemyEvery", "difficulty", "敵：1体増えるウェーブ間隔", 1, 100, 1],
  ["enemyMax", "difficulty", "敵：上限", 0, 50, 1],
  ["blockBase", "difficulty", "障害物：開始数", 0, 150, 1],
  ["blockStep", "difficulty", "障害物：毎ウェーブ増加", 0, 50, 1],
  ["blockMax", "difficulty", "障害物：上限", 0, 150, 1],
  ["snakeBase", "difficulty", "スネーク：開始移動間隔（秒）", 0.05, 2, 0.001],
  ["snakeStep", "difficulty", "スネーク：毎ウェーブ短縮（秒）", 0, 0.1, 0.001],
  ["snakeMin", "difficulty", "スネーク：最短間隔（秒）", 0.05, 2, 0.001],
  ["enemyIntervalBase", "difficulty", "敵：開始移動間隔（秒）", 0.1, 5, 0.001],
  [
    "enemyIntervalStep",
    "difficulty",
    "敵：毎ウェーブ短縮（秒）",
    0,
    0.2,
    0.001,
  ],
  ["enemyIntervalMin", "difficulty", "敵：最短間隔（秒）", 0.1, 5, 0.001],
  ["startLength", "combat", "開始の長さ", 4, 12, 1],
  ["startHearts", "combat", "開始ライフ", 1, 20, 1],
  ["foodBase", "combat", "基本エサ数", 1, 100, 1],
  ["chainWindow", "combat", "基本連鎖猶予（秒）", 0.1, 30, 0.1],
  ["shootInterval", "combat", "基本射撃間隔（秒）", 0.1, 5, 0.1],
  ["shootMin", "combat", "最短射撃間隔（秒）", 0.1, 5, 0.1],
  ["bulletSpeed", "combat", "弾速（マス/秒）", 5, 100, 1],
  ["bombInterval", "bomb", "爆弾Lv.1：間隔（秒）", 3, 30, 0.1],
  ["bombRankStep", "bomb", "爆弾：永久Lvごとの間隔短縮（秒）", 0, 10, 0.1],
  ["bombTargetRange", "bomb", "爆弾：投擲距離（マス）", 1, 20, 1],
  ["bombFlight", "bomb", "爆弾：飛行時間（秒）", 0.1, 3, 0.01],
  ["bombRadiusMax", "bomb", "爆風範囲：上限（マス）", 4, 12, 1],
  ["compactAmount", "combat", "コンパクト・ボディ：最低短縮数", 1, 20, 1],
  ["compactRatio", "combat", "コンパクト・ボディ：短縮割合（%）", 0, 100, 1],
  ["cutterFoods", "cutter", "テール・カッター：充填に必要なエサ", 1, 100, 1],
  [
    "cutterThreshold",
    "cutter",
    "テール・カッター：基準長さ（超えると発動可能）",
    7,
    300,
    1,
  ],
  ["cutterRatio", "cutter", "テール・カッター：切断割合（%）", 1, 100, 0.1],
  ["cutterMin", "cutter", "テール・カッター：最低長さ", 6, 299, 1],
  ["foodPoints", "rewards", "通常エサの基本得点", 1, 1000, 1],
  ["enemyPoints", "rewards", "敵撃破の得点", 0, 10000, 1],
  ["blockPoints", "rewards", "障害物破壊の得点", 0, 10000, 1],
  ["waveBonus", "rewards", "ウェーブ番号あたりのボーナス", 0, 10000, 1],
  ["milestoneBonus", "rewards", "7突破ボーナス", 0, 100000, 1],
  ["armorCost", "rewards", "タフ・スキン：Lv.1価格", 1, 10000, 1],
  ["armorCost2", "rewards", "タフ・スキン：Lv.2価格", 1, 10000, 1],
  ["armorCost3", "rewards", "タフ・スキン：Lv.3価格", 1, 10000, 1],
  ["comboCost", "rewards", "チェイン・メモリー：Lv.1価格", 1, 10000, 1],
  ["comboCost2", "rewards", "チェイン・メモリー：Lv.2価格", 1, 10000, 1],
  ["comboCost3", "rewards", "チェイン・メモリー：Lv.3価格", 1, 10000, 1],
  ["comboCost4", "rewards", "チェイン・メモリー：Lv.4価格", 1, 10000, 1],
  ["bombCost", "rewards", "ボム・ランチャー：Lv.1価格", 1, 10000, 1],
  ["bombCost2", "rewards", "ボム・ランチャー：Lv.2価格", 1, 10000, 1],
  ["bombCost3", "rewards", "ボム・ランチャー：Lv.3価格", 1, 10000, 1],
  ["echoCost", "rewards", "ラップ・エコー：Lv.1価格", 1, 10000, 1],
  ["cutterCost", "rewards", "テール・カッター：Lv.1価格", 1, 10000, 1],
].map(([key, group, label, min, max, step]) => [
  key,
  group,
  label,
  DEFAULT_BALANCE[key],
  min,
  max,
  step,
]);
function validateBalance(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("数値設定はオブジェクトで指定してください。");
  const keys = Object.keys(input);
  if (
    keys.length !== BALANCE_FIELDS.length ||
    keys.some((k) => !Object.hasOwn(DEFAULT_BALANCE, k))
  )
    throw Error("設定項目に不足または未知のキーがあります。");
  const result = {};
  for (const [key, , label, , min, max, step] of BALANCE_FIELDS) {
    const v = input[key];
    if (
      typeof v !== "number" ||
      !Number.isFinite(v) ||
      v < min ||
      v > max ||
      (step === 1 && !Number.isInteger(v))
    )
      throw Error(
        label +
          " は " +
          min +
          "〜" +
          max +
          (step === 1 ? " の整数" : " の数値") +
          "で指定してください。",
      );
    result[key] = v;
  }
  for (const [base, max] of [
    ["targetBase", "targetMax"],
    ["enemyBase", "enemyMax"],
    ["blockBase", "blockMax"],
  ])
    if (result[base] > result[max])
      throw Error("開始数は上限以下にしてください。");
  if (
    result.snakeMin > result.snakeBase ||
    result.enemyIntervalMin > result.enemyIntervalBase ||
    result.shootMin > result.shootInterval
  )
    throw Error("最短間隔は開始・基本間隔以下にしてください。");
  if (result.bombInterval - 2 * result.bombRankStep < 1)
    throw Error("爆弾Lv.3の基本間隔が1秒以上になるようにしてください。");
  if (result.cutterMin >= result.cutterThreshold)
    throw Error(
      "テール・カッターの最低長さは発動する長さより小さくしてください。",
    );
  if (Math.floor((result.cutterThreshold * result.cutterRatio) / 100) < 1)
    throw Error("発動する長さで1つ以上切断できる割合にしてください。");
  return result;
}
function parseBalanceJSON(text) {
  const doc = JSON.parse(text);
  if (
    !doc ||
    doc.version !== 1 ||
    Object.keys(doc).some((k) => !["version", "balance"].includes(k))
  )
    throw Error("対応形式は version: 1 と balance の JSON です。");
  const values = { ...doc.balance };
  for (const key of [
    "indirectGrowthEvery",
    "shedCost",
    "shedThreshold",
    "shedInterval",
    "shedAmount",
  ])
    delete values[key];
  // Convert legacy formula-based prices once; runtime purchases use only explicit entries.
  const rankKeys = [
    "armorCost2",
    "armorCost3",
    "comboCost2",
    "comboCost3",
    "comboCost4",
    "bombCost2",
    "bombCost3",
  ];
  if (
    Object.hasOwn(values, "costGrowth") ||
    rankKeys.every((key) => !Object.hasOwn(values, key))
  ) {
    const factor = values.costGrowth ?? 1.5;
    if (
      typeof factor !== "number" ||
      !Number.isFinite(factor) ||
      factor < 1 ||
      factor > 5
    )
      throw Error("設定項目に不足または未知のキーがあります。");
    for (const [id, count] of [
      ["armor", 3],
      ["combo", 4],
      ["bomb", 3],
    ]) {
      const base = values[id + "Cost"] ?? DEFAULT_BALANCE[id + "Cost"];
      for (let rank = 2; rank <= count; rank++) {
        const key = id + "Cost" + rank;
        if (!Object.hasOwn(values, key))
          values[key] = Math.ceil(base * factor ** (rank - 1));
      }
    }
  }
  delete values.costGrowth;
  for (const key of [
    "compactRatio",
    "echoCost",
    "cutterFoods",
    "cutterThreshold",
    "cutterRatio",
    "cutterMin",
    "cutterCost",
  ])
    if (!Object.hasOwn(values, key)) values[key] = DEFAULT_BALANCE[key];
  return validateBalance(values);
}
function balanceJSON(values) {
  return JSON.stringify(
    { version: 1, balance: validateBalance(values) },
    null,
    2,
  );
}
balance = { ...DEFAULT_BALANCE };
try {
  const stored = localStorage.getItem("snake-overdrive-balance-v1");
  if (stored) balance = parseBalanceJSON(stored);
} catch {}
runBalance = { ...balance };
function saveBalance(values) {
  const valid = validateBalance(values);
  localStorage.setItem("snake-overdrive-balance-v1", balanceJSON(valid));
  balance = valid;
  return valid;
}
