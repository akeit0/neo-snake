'use strict';

// 強化の定義・上限・アイコン。バランスの数値は balance.js。
const upgrades = [
  {
    id: 'orchard',
    name: 'フード・フィーバー',
    desc: 'エサの出現数 +3。連鎖のルートを増やせ。',
  },
  {
    id: 'chain',
    name: 'チェイン・リアクター',
    desc: 'エサを食べると近くのエサも連鎖回収。範囲が拡大。',
  },
  {
    id: 'split',
    name: 'トリプル・ショット',
    desc: '3方向へ同時発射。射撃と連鎖で盤面を制圧。',
  },
  {
    id: 'magnet',
    name: 'ハングリー・マグネット',
    desc: '近くのエサを引き寄せて回収。範囲 +1。',
  },
  {
    id: 'gold',
    name: 'ゴールデン・バイト',
    desc: '金のエサが増加。獲得スコア +40%。',
  },
  {
    id: 'shield',
    name: 'セーフティ・スキン',
    desc: 'ライフ +1。ピンチでもビルドをつなげ。',
  },
  { id: 'combo', name: 'ロング・コンボ', desc: '連鎖倍率の上限 +5。' },
  {
    id: 'pierce',
    name: 'ピアシング・ファング',
    desc: '弾が障害物を貫通。射撃クールダウン短縮。',
  },
  {
    id: 'blast',
    name: 'ブラスト・コア',
    desc: '爆弾の爆風範囲 +1。最大6マス。',
    requires: 'bomb',
  },
  {
    id: 'charge',
    name: 'クイック・チャージ',
    desc: '爆弾の投擲間隔 −15%。最大60%短縮。',
    requires: 'bomb',
  },
  {
    id: 'compact',
    name: 'コンパクト・ボディ',
    desc: '選択時に長さの30%を短縮。最低4つ、最小の長さ4。',
  },
];

const upgradePictures = {
  orchard:
    '<path fill="#ff91ac" d="M16 23C4 8 3 36 16 38C29 36 28 8 16 23Z"/><path d="M16 23V9"/><path fill="#d8fa65" d="M16 13C18 5 29 6 28 9C27 15 20 16 16 13Z"/>',
  chain:
    '<path fill="#ffd56b" d="M23 3L7 24H17L13 41L34 17H23Z"/><circle cx="7" cy="9" r="3" fill="#bba1fa"/><circle cx="35" cy="34" r="3" fill="#ff8bae"/>',
  split:
    '<path d="M22 38V13M22 29L8 15M22 29L36 15"/><path fill="#bba1fa" d="M17 14L22 4L27 14ZM4 17L5 7L15 8ZM29 8L39 7L40 17Z"/>',
  magnet:
    '<path fill="#ff8bae" d="M8 7H17V24A5 5 0 0 0 27 24V7H36V24A14 14 0 0 1 8 24Z"/><path d="M8 15H17M27 15H36"/><path d="M3 22L1 26M41 22L43 26"/>',
  gold: '<path fill="#ffd56b" d="M12 8H32L41 19L22 39L3 19Z"/><path d="M3 19H41M12 8L16 19L22 39L28 19L32 8"/>',
  shield:
    '<path fill="#bba1fa" d="M22 4L37 10V23C37 32 29 38 22 41C15 38 7 32 7 23V10Z"/><path fill="#d8fa65" d="M22 12L31 16V23C31 29 25 33 22 35C19 33 13 29 13 23V16Z"/>',
  combo:
    '<path fill="#d8fa65" d="M7 17C-1 17-1 31 7 31C17 31 26 11 36 11C44 11 44 25 36 25C26 25 17 5 7 5" transform="translate(0 5)"/><path fill="#ffd56b" d="M32 3L34 7L39 8L35 11L35 16L31 13L27 15L28 10L25 7L30 7Z"/>',
  pierce:
    '<path fill="#d8fa65" d="M5 8L18 9L22 31L26 9L39 8L32 37L22 42L12 37Z"/><path fill="#ffd56b" d="M17 3H27L22 13Z"/>',
  base: '<path fill="#d8fa65" d="M8 37V23H24V8H38V22H22V37Z"/><circle cx="30" cy="12" r="2" fill="#20201f"/><circle cx="35" cy="12" r="2" fill="#20201f"/>',
};
upgradePictures.bomb =
  '<circle cx="22" cy="27" r="13" fill="#263348"/><path d="M25 14L30 6L36 8"/><path fill="#ffd166" d="M35 3L38 7L42 7L39 11L40 15L35 12L31 14L32 9L29 6L34 6Z"/><circle cx="17" cy="23" r="3" fill="#fff2a1"/>';
upgradePictures.blast = upgradePictures.bomb;
upgradePictures.charge = upgradePictures.chain;
upgradePictures.compact =
  '<path fill="#d8fa65" d="M6 24H19V37H6ZM25 7H38V20H25Z"/><path d="M7 9L16 18M7 18L16 9M27 29L36 38M27 38L36 29"/>';

upgradePictures.echo =
  '<path fill="#8bd4ff" d="M3 8H10V36H3ZM34 8H41V36H34Z"/><path d="M12 15H30M26 11L30 15L26 19M32 29H14M18 25L14 29L18 33"/>';

// Difficulty and shop values are documented in README.md.
const CAMPAIGN_WAVES = 7;

const permanentUpgrades = [
  {
    id: 'armor',
    name: 'タフ・スキン',
    desc: '開始ライフ +1（最大3段階）',
    max: 3,
    art: 'shield',
  },
  {
    id: 'combo',
    name: 'チェイン・メモリー',
    desc: '連鎖の猶予 +0.5秒（最大4段階）',
    max: 4,
    art: 'combo',
  },
  {
    id: 'bomb',
    name: 'ボム・ランチャー',
    desc: 'Lv.1で爆弾を解放。範囲2→3→4マス、投擲間隔8→7→6秒。体を消費しない。次のランから有効。',
    max: 3,
    art: 'bomb',
  },
  {
    id: 'echo',
    name: 'ラップ・エコー',
    desc: '反対側の端にあるエサ・敵・障害物・体の色が、ワープ入口に少し染み出す。設定で表示OFF。次のランから有効。',
    max: 1,
    art: 'echo',
  },
  {
    id: 'cutter',
    name: 'テール・カッター',
    desc: 'エサ12個で1回充填。長さ20を超えると、切断可能な末尾が薄い緑色に変化。そこに弾を当てると着弾部位から先を最大25%切断。最低長さ12。次のランから有効。',
    max: 1,
    art: 'compact',
  },
];

const UPGRADE_LIMITS = {
  orchard: 3,
  chain: 3,
  split: 1,
  magnet: 2,
  shield: 3,
  pierce: 5,
  blast: 2,
  charge: 4,
};

const CHAIN_BASE_MAX = 20;
const CHAIN_UPGRADE_STEP = 5;
