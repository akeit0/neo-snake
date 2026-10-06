"use strict";

// Japanese is the canonical UI source. Keep each node's source so switching
// languages never rebuilds controls, loses form edits, or changes the run.
const LANGUAGE_KEY = "snake-overdrive-language-v1";
let language = "ja";
try {
  if (localStorage.getItem(LANGUAGE_KEY) === "en") language = "en";
} catch {}
const ENGLISH_TEXT = Object.fromEntries(
  `
ネオスネーク / NEO//SNAKE	NEO//SNAKE
次のランから有効。	 Applies next run.
食べて、撃って、進化しろ。	Eat, shoot, evolve.
食べて弾を放ち、進化しろ。	Eat, fire, evolve.
スマホとPCで遊べるスネーク・ローグライト。	A snake roguelite for mobile and PC.
音を切り替える	Toggle sound
音 OFF	Sound OFF
音 ON	Sound ON
ビルド	Build
ヘルプ	Help
一時停止	Pause
閉じる	Close
ハイスコア更新！	NEW HIGH SCORE!
最高記録	BEST SCORE
スネークゲームの盤面	Snake game board
進捗表示とスワイプ操作エリア	Wave progress and swipe controls
ウェーブのエサ回収進捗	Wave food collection progress
スワイプ操作エリア	Swipe controls
ここをスワイプして移動	Swipe here to move
盤面の上でも操作できます · PC: WASD / 矢印キー	You can also swipe on the board · PC: WASD / arrow keys
PC: WASD / 矢印キー　・　MOBILE: 盤面 / 下部をスワイプ	PC: WASD / arrow keys · MOBILE: swipe the board or below
7ウェーブを突破し、無限の戦場へ。	Clear 7 waves, then enter endless waves.
ランをはじめる ↗	Start a run ↗
ひと息ついて、もう一口。	Take a breath, then another bite.
つづける →	Continue →
次は WAVE 08。ここから先は無限ウェーブ。	Next: WAVE 08. Endless waves begin here.
敵も障害物も増える。次のウェーブへ進化しよう。	More enemies and obstacles await. Evolve for the next wave.
次のウェーブへ →	Next wave →
このランだけの強化。上限到達の強化は候補から外れます。	Upgrades last for this run. Maxed upgrades leave the selection pool.
現在選べる強化はありません。	No upgrades are currently available.
チップ獲得	chips earned
もう一度、進化する ↗	Evolve again ↗
フード・フィーバー	Food Fever
エサの出現数 +3。連鎖のルートを増やせ。	+3 food spawns. Create more routes for chains.
チェイン・リアクター	Chain Reactor
エサを食べると近くのエサも連鎖回収。範囲が拡大。	Collect nearby food when you eat. Increases chain collection range.
トリプル・ショット	Triple Shot
3方向へ同時発射。射撃と連鎖で盤面を制圧。	Fire in three directions. Control the board with shots and chains.
ハングリー・マグネット	Hungry Magnet
近くのエサを引き寄せて回収。範囲 +1。	Collect nearby food. +1 collection range.
ゴールデン・バイト	Golden Bite
金のエサが増加。獲得スコア +40%。	More golden food. +40% food score.
セーフティ・スキン	Safety Skin
ライフ +1。ピンチでもビルドをつなげ。	+1 life. Keep your build alive.
ロング・コンボ	Long Combo
連鎖倍率の上限 +5。	+5 maximum chain multiplier.
ピアシング・ファング	Piercing Fang
弾が障害物を貫通。射撃クールダウン短縮。	Shots pierce obstacles. Reduces firing cooldown.
ブラスト・コア	Blast Core
クイック・チャージ	Quick Charge
爆弾の投擲間隔 −15%。最大60%短縮。	−15% bomb interval, up to a 60% reduction.
開始ライフ +1（最大3段階）	+1 starting life (up to 3 levels).
連鎖の猶予 +0.5秒（最大4段階）	+0.5s chain window (up to 4 levels).
反対側の端にあるエサ・敵・障害物・体の色が、ワープ入口に少し染み出す。設定で表示OFF。次のランから有効。	Colors of food, enemies, obstacles and your body at the opposite edge glow at the wrap entrance. Toggle in Settings. Applies next run.
オリジナル・スネーク	Original Snake
射撃 / ライフ	Shooting / Lives
このランの進化	This run's evolution
次の自分を、強く。	Make your next self stronger.
チップ所持。アップグレードは次のランから有効。	chips available. Purchases apply next run.
記録はこのブラウザに保存されます。	Records are saved in this browser.
すべての永久強化が MAX です。	All permanent upgrades are MAX.
永久強化を購入できます	Permanent upgrades available to buy
永久強化が残っています	Permanent upgrades still available
購入可能	Affordable
種類　·　次の購入まであと ◆	remaining · Next purchase needs ◆
種類　·　◆	available · ◆
残り	Remaining
得点とチップのしくみ	How score and chips work
操作と長さ	Controls and length
WASD・矢印キーで移動。スマホは盤面・ウェーブ進捗・下部をスワイプ。端を越えると反対側へワープします。エサはどの方法で回収しても1個で1つ成長。長さ7以上で自動射撃し、1発につき体を1つ消費します。敵・障害物・自分の体に触れるとライフを失い、0でラン終了。P / Ⅱで一時停止できます。	Move with WASD or arrow keys. On mobile, swipe the board, wave progress, or area below. Crossing an edge wraps to the opposite side. Every food collected adds one segment, regardless of collection method. At length 7 or more, you fire automatically, spending one segment per shot. Hitting enemies, obstacles, or yourself costs a life. At zero lives, the run ends. Pause with P / Ⅱ.
スコア	Score
エサの得点は「基本点 × CHAIN倍率 × 得点補正」。現在の通常エサは	Food score = base points × CHAIN multiplier × score modifier. Regular food currently gives 
点、金エサは	 points; golden food gives 
点、得点補正は×	 points; score modifier: ×
です。小数は四捨五入します。敵の撃破は	. Results are rounded. Defeating an enemy gives 
点、射撃・爆風での障害物破壊は	 points; destroying an obstacle with a shot or explosion gives 
点。これらの撃破点にはCHAIN倍率を掛けません。生成されたエサの回収でも別に得点できます。	 points. These destruction points are not multiplied by CHAIN. Collecting the food they spawn earns additional points.
現在は	Currently, collecting food less than 
秒未満の間隔で続けてエサを回収すると、倍率が1ずつ上がります。上限は×	 seconds apart increases the multiplier by one, up to ×
。頭・弾・連鎖など、回収方法は問いません。猶予切れやダメージで連鎖が切れます。	. All collection methods count, including the head, shots and chain reactions. The chain breaks when the timer expires or you take damage.
ウェーブとボーナス	Waves and bonuses
進捗は回収したエサの個数です。敵の撃破や体の切断だけでは進みません。クリアして次のウェーブへ進むと「クリアしたウェーブ番号 ×	Progress counts food collected. Defeating enemies or cutting your body alone does not advance it. Advancing after a clear awards the cleared wave number × 
点」を加算。7突破時はさらに	 points. Clearing wave 7 also awards 
点、その後は無限ウェーブが続きます。	 points, then endless waves continue.
チップ	Chips
ラン終了時に「スコア ÷ 100の切り捨て ＋ 到達ウェーブ × 2」のチップを獲得します。例：スコア1,250・到達ウェーブ5なら22チップ。チップは次のランに持ち越せ、永久強化の購入に使います。購入した能力は次のランから有効です。	At the end of a run, earn floor(score / 100) + wave reached × 2 chips. Example: 1,250 points at wave 5 earns 22 chips. Chips carry over between runs and buy permanent upgrades. Purchased abilities apply next run.
所持	owned
記録と設定	Records and settings
最高得点・チップ・永久強化は、このブラウザに自動保存します。進行中のランは保存されず、再読み込みすると終了します。サイトデータを削除すると記録も消えます。設定では表示変更・永久強化のリセットができます。強化の個別内容は「強化」や「ビルド」で確認できます。	Best score, chips and permanent upgrades are saved automatically in this browser. An active run is not saved and ends on reload. Clearing site data also deletes records. Settings provides a Wrap Echo display toggle and a permanent upgrade reset. See Upgrades or Build for individual ability descriptions.
BGMを移動テンポに同期	Sync BGM to movement
ONでは移動2回で1拍。Waveで移動が速くなるとBGMも速くなります。OFFでは128 BPM。音の高さは変わりません。	ON uses two moves per beat. BGM speeds up as movement gets faster each wave. OFF uses 128 BPM. Pitch stays unchanged.
音量	Volume
音量はすぐに反映・保存されます。再生のON/OFFは盤面上部の「音」で切り替えます。	Volume changes apply immediately and are saved. Toggle playback with the Sound button above the board.
表示	Display
ラップ・エコーを表示	Show Wrap Echo
購入済みのランでは、反対側の端にあるものの色をワープ入口に表示します。ON/OFFは即時反映し、保存します。	When unlocked for this run, colors from the opposite edge appear at wrap entrances. Changes apply immediately and are saved.
購入済みのレベルだけを0に戻します。チップ・最高得点は保持し、返金はありません。現在のランへの影響はありません。	Resets purchased levels to zero. Keeps chips and best score, without refunds. Does not affect the current run.
永久強化をリセット	Reset permanent upgrades
直前のリセットを戻す	Undo last reset
ラップ・エコーの表示を	Wrap Echo display is now 
にしました。	.
永久強化をリセットしました。次のランから適用します。	Permanent upgrades reset. Applies next run.
永久強化を元に戻しました。	Permanent upgrades restored.
`
    .trim()
    .split("\n")
    .map((line) => line.split("\t")),
);

let TRANSLATIONS = Object.entries(ENGLISH_TEXT).sort(
  (a, b) => b[0].length - a[0].length,
);
function translateText(source, target = language) {
  if (target !== "en" || !/[\u3040-\u30ff\u4e00-\u9fff]/.test(source))
    return source;
  let text = source
    .replace(
      /購入可能 (\d+) \/ (\d+)種類　·　◆ (\d+) 所持/g,
      "$1 / $2 affordable · ◆ $3 owned",
    )
    .replace(
      /残り (\d+)種類　·　次の購入まであと ◆ (\d+)/g,
      "$1 remaining · Next purchase needs ◆ $2 more",
    )
    .replace(/あと (\d+) 個/g, "$1 food remaining")
    .replace(
      /選択時に長さの([\d.]+)%を短縮。最低(\d+)つ、最小の長さ4。/g,
      "On selection, shorten by $1%, at least $2 segments. Minimum length: 4.",
    )
    .replace(
      /爆弾の範囲 \+1。最大(\d+)マス。/g,
      "+1 bomb radius. Maximum: $1 cells.",
    )
    .replace(
      /Lv.1で爆弾を解放。範囲2→3→4マス、間隔 ([\d.→]+)秒。次のランから有効。/g,
      "Unlock bombs at Lv.1. Radius: 2→3→4 cells; interval: $1s. Applies next run.",
    )
    .replace(
      /エサ(\d+)個で1回充填。長さ(\d+)を超えた状態で切断可能な体に弾を当てると、着弾部位から末尾まで最大([\d.]+)%切断。最低長さ(\d+)。/g,
      "Charge once per $1 food. Above length $2, shoot a cuttable segment to remove it and the tail after it, up to $3%. Minimum length: $4.",
    )
    .replace(/範囲 ([\d.]+) \/ 間隔 ([\d.]+)秒/g, "Radius $1 / Interval $2s");
  for (const [ja, en] of TRANSLATIONS) text = text.split(ja).join(en);
  return text;
}

const localizedSources = new WeakMap();
let languageObserver;
function localizeNode(node, attribute) {
  const current = attribute ? node.getAttribute(attribute) : node.nodeValue;
  if (current == null) return;
  let record = localizedSources.get(node);
  if (!record) {
    record = {};
    localizedSources.set(node, record);
  }
  const key = attribute || "text";
  const previous = record[key];
  if (previous && current === previous.output && previous.language === language)
    return;
  const source =
    previous && current === previous.output ? previous.source : current;
  const output = translateText(source);
  record[key] = { source, output, language };
  if (current !== output) {
    if (attribute) node.setAttribute(attribute, output);
    else node.nodeValue = output;
  }
}
const LANGUAGE_OBSERVER_OPTIONS = {
  subtree: true,
  childList: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["aria-label", "title", "placeholder", "content"],
};
function observeLanguageChanges() {
  languageObserver?.observe(
    document.documentElement,
    LANGUAGE_OBSERVER_OPTIONS,
  );
}
function withLanguageObserverPaused(action) {
  languageObserver?.disconnect();
  try {
    action();
  } finally {
    observeLanguageChanges();
  }
}
function localizeTree(root) {
  if (!root || root.isConnected === false || !document.createTreeWalker) return;
  const walker = document.createTreeWalker(root, 5);
  let node = walker.currentNode;
  do {
    if (
      node.nodeType === 3 &&
      !["SCRIPT", "STYLE"].includes(node.parentNode?.tagName)
    )
      localizeNode(node);
    if (node.nodeType === 1) {
      for (const attr of ["aria-label", "title", "placeholder"])
        if (node.hasAttribute(attr)) localizeNode(node, attr);
      if (node.matches('meta[name="description"]'))
        localizeNode(node, "content");
    }
  } while ((node = walker.nextNode()));
}
function updateLanguageControl() {
  document.documentElement.lang = language;
  const button = document.querySelector("#language");
  // Mobile browsers can cancel a tap if its text node is replaced between
  // touch-down and click. HUD mutations must leave this button untouched.
  const caption = language === "ja" ? "EN" : "日本語";
  const label = language === "ja" ? "Switch to English" : "日本語に切り替え";
  if (button.textContent !== caption) button.textContent = caption;
  if (button.getAttribute("aria-label") !== label)
    button.setAttribute("aria-label", label);
}
function localizePage() {
  if (!document.createTreeWalker) return;
  withLanguageObserverPaused(() => {
    localizeTree(document.documentElement);
    updateLanguageControl();
  });
}
// MutationObserver already batches changes. Only visit the changed text,
// attributes and added subtrees, never the entire page for a HUD update.
function localizeMutations(records) {
  if (!document.createTreeWalker) return;
  withLanguageObserverPaused(() => {
    const roots = new Set();
    for (const record of records) {
      if (record.type === "attributes")
        localizeNode(record.target, record.attributeName);
      else if (record.type === "characterData") roots.add(record.target);
      else for (const node of record.addedNodes) roots.add(node);
    }
    for (const root of roots) {
      let parent = root.parentNode;
      while (parent && !roots.has(parent)) parent = parent.parentNode;
      if (!parent) localizeTree(root);
    }
  });
}
function setLanguage(value) {
  if (!["ja", "en"].includes(value)) return;
  language = value;
  try {
    localStorage.setItem(LANGUAGE_KEY, value);
  } catch {}
  localizePage();
}
// Build is copied into a modal. Copy canonical text rather than rendered English.
function sourceHTML(element) {
  if (!element.cloneNode) return element.innerHTML;
  const copy = element.cloneNode(true);
  const originals = document.createTreeWalker(element, 4);
  const copies = document.createTreeWalker(copy, 4);
  let node;
  while ((node = originals.nextNode())) {
    const copied = copies.nextNode();
    copied.nodeValue =
      localizedSources.get(node)?.text?.source ?? node.nodeValue;
  }
  return copy.innerHTML;
}
function bindLanguage() {
  const button = document.querySelector("#language");
  const toggle = () => setLanguage(language === "ja" ? "en" : "ja");
  let gesture = null;
  let lastTouchToggle = -Infinity;
  const begin = (id, x, y) => {
    gesture = { id, x, y, moved: false };
  };
  const move = (id, x, y) => {
    if (gesture?.id === id && Math.hypot(x - gesture.x, y - gesture.y) > 12)
      gesture.moved = true;
  };
  const end = (event, id, x, y) => {
    move(id, x, y);
    const tap = gesture?.id === id && !gesture.moved;
    gesture = null;
    if (!tap) return;
    // Handle touch release directly: mobile compatibility clicks may be
    // suppressed by a changing page. Ignore the following generated click.
    event.preventDefault();
    lastTouchToggle = Date.now();
    toggle();
  };
  button.onclick = (event) => {
    if (event?.detail !== 0 && Date.now() - lastTouchToggle < 800) return;
    toggle();
  };
  button.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    begin(event.pointerId, event.clientX, event.clientY);
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", (event) =>
    move(event.pointerId, event.clientX, event.clientY),
  );
  button.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "mouse")
      end(event, event.pointerId, event.clientX, event.clientY);
  });
  button.addEventListener("pointercancel", () => {
    gesture = null;
  });
  // Older touch browsers have no Pointer Events.
  if (!("PointerEvent" in window)) {
    button.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.changedTouches[0];
        if (event.touches.length === 1)
          begin(touch.identifier, touch.clientX, touch.clientY);
        else gesture = null;
      },
      { passive: true },
    );
    button.addEventListener(
      "touchmove",
      (event) => {
        for (const touch of event.changedTouches)
          move(touch.identifier, touch.clientX, touch.clientY);
      },
      { passive: true },
    );
    button.addEventListener(
      "touchend",
      (event) => {
        for (const touch of event.changedTouches)
          end(event, touch.identifier, touch.clientX, touch.clientY);
      },
      { passive: false },
    );
    button.addEventListener("touchcancel", () => {
      gesture = null;
    });
  }
  if (typeof MutationObserver !== "undefined")
    languageObserver = new MutationObserver(localizeMutations);
  localizePage();
}
