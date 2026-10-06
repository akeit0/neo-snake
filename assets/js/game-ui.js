"use strict";

function openHelp() {
  const chainWindow = runBalance.chainWindow + runMeta.combo * 0.5;
  const chainMax = chainLimit();
  const scoreFactor = 1 + (mut.gold || 0) * 0.4;
  showModal(
    [
      '<span class="mini-label">HOW TO PLAY / SCORE</span><h2>得点とチップのしくみ</h2>',
      "<h3>操作と長さ</h3><p>WASD・矢印キーで移動。スマホは盤面・ウェーブ進捗・下部をスワイプ。端を越えると反対側へワープします。エサはどの方法で回収しても1個で1つ成長。長さ7以上で自動射撃し、1発につき体を1つ消費します。敵・障害物・自分の体に触れるとライフを失い、0でラン終了。P / Ⅱで一時停止できます。</p>",
      "<h3>スコア</h3><p>エサの得点は「基本点 × CHAIN倍率 × 得点補正」。現在の通常エサは" +
        runBalance.foodPoints +
        "点、金エサは" +
        runBalance.foodPoints * 3 +
        "点、得点補正は×" +
        scoreFactor.toFixed(1) +
        "です。小数は四捨五入します。敵の撃破は" +
        runBalance.enemyPoints +
        "点、射撃・爆風での障害物破壊は" +
        runBalance.blockPoints +
        "点。これらの撃破点にはCHAIN倍率を掛けません。生成されたエサの回収でも別に得点できます。</p>",
      "<h3>CHAIN</h3><p>現在は" +
        chainWindow.toFixed(1) +
        "秒未満の間隔で続けてエサを回収すると、倍率が1ずつ上がります。上限は×" +
        chainMax +
        "。頭・弾・連鎖など、回収方法は問いません。猶予切れやダメージで連鎖が切れます。</p>",
      "<h3>ウェーブとボーナス</h3><p>進捗は回収したエサの個数です。敵の撃破や体の切断だけでは進みません。クリアして次のウェーブへ進むと「クリアしたウェーブ番号 × " +
        runBalance.waveBonus +
        "点」を加算。7突破時はさらに" +
        runBalance.milestoneBonus +
        "点、その後は無限ウェーブが続きます。</p>",
      "<h3>チップ</h3><p>ラン終了時に「スコア ÷ 100の切り捨て ＋ 到達ウェーブ × 2」のチップを獲得します。例：スコア1,250・到達ウェーブ5なら22チップ。チップは次のランに持ち越せ、永久強化の購入に使います。購入した能力は次のランから有効です。</p>",
      "<h3>記録と設定</h3><p>最高得点・チップ・永久強化は、このブラウザに自動保存します。進行中のランは保存されず、再読み込みすると終了します。サイトデータを削除すると記録も消えます。設定では表示変更・永久強化のリセットができます。強化の個別内容は「強化」や「ビルド」で確認できます。</p>",
      '<p class="mini-label"><a href="LICENSE" rel="license noopener" target="_blank">CC0 1.0 Universal</a></p>',
    ].join(""),
  );
}

// 画面表示・ダイアログ

function upgradeArt(id) {
  return (
    '<svg class="upgrade-art" viewBox="0 0 44 44" aria-hidden="true" fill="none" stroke="#20201f" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round">' +
    (upgradePictures[id] || upgradePictures.shield) +
    "</svg>"
  );
}

// Static HUD nodes stay mounted; cache canonical values instead of rewriting
// text/markup every frame (including after localization changes the text).
const hudElements = new Map();
const hudValues = new Map();
function setHudValue(selector, field, value) {
  const key = selector + ":" + field;
  if (hudValues.get(key) === value) return;
  let element = hudElements.get(selector);
  if (!element) {
    element = $(selector);
    hudElements.set(selector, element);
  }
  hudValues.set(key, value);
  if (field.startsWith("aria-")) element.setAttribute(field, value);
  else if (field === "width") element.style.width = value;
  else element[field] = value;
}
function hud() {
  setHudValue("#score", "textContent", String(score).padStart(6, "0"));
  setHudValue("#chainMultiplier", "textContent", "×" + Math.max(1, chain));
  setHudValue(
    "#chainTimer",
    "textContent",
    state === "playing" && chainTime > 0 ? chainTime.toFixed(1) + "s" : "",
  );
  setHudValue(
    "#wave",
    "innerHTML",
    String(wave).padStart(2, "0") +
      "<span>/" +
      (wave > CAMPAIGN_WAVES ? "∞" : "07") +
      "</span>",
  );
  setHudValue("#length", "textContent", String(snake.length).padStart(2, "0"));
  setHudValue(
    "#progress",
    "width",
    Math.min(100, (eaten / target) * 100) + "%",
  );
  setHudValue(
    "#progressText",
    "textContent",
    "WAVE " +
      String(wave).padStart(2, "0") +
      (wave > CAMPAIGN_WAVES ? " / ∞" : " / 07"),
  );
  setHudValue(
    "#progressRemaining",
    "textContent",
    eaten >= target ? "CLEAR!" : "あと " + (target - eaten) + " 個",
  );
  setHudValue("#waveProgress", "aria-valuemax", target);
  setHudValue("#waveProgress", "aria-valuenow", Math.min(eaten, target));
  setHudValue(
    "#progressNum",
    "textContent",
    Math.min(eaten, target) + " / " + target,
  );
  setHudValue("#best", "textContent", String(meta.best).padStart(6, "0"));
  setHudValue("#chips", "textContent", "◆ " + meta.chips);
}

function renderBuild() {
  let html =
    '<div class="build-row"><span class="build-icon">' +
    upgradeArt("base") +
    "</span><div><strong>オリジナル・スネーク</strong><small>射撃 / ライフ " +
    hearts +
    '</small></div><span class="level">BASE</span></div>';
  if (runMeta.bomb)
    html +=
      '<div class="build-row"><span class="build-icon">' +
      upgradeArt("bomb") +
      "</span><div><strong>ボム・ランチャー</strong><small>範囲 " +
      bombRadius() +
      " / 間隔 " +
      bombInterval().toFixed(1) +
      '秒</small></div><span class="level">LV.' +
      runMeta.bomb +
      " / 3</span></div>";
  for (const u of permanentUpgrades.filter(
    (u) => u.id !== "bomb" && runMeta[u.id] > 0,
  ))
    html +=
      '<div class="build-row"><span class="build-icon">' +
      upgradeArt(u.art) +
      "</span><div><strong>" +
      u.name +
      "</strong><small>" +
      (u.id === "cutter" ? cutterDescription(runBalance) : u.desc) +
      '</small></div><span class="level">LV.' +
      runMeta[u.id] +
      " / " +
      u.max +
      "</span></div>";
  for (const u of upgrades)
    if (mut[u.id])
      html +=
        '<div class="build-row"><span class="build-icon" style="background:var(--purple)">' +
        upgradeArt(u.id) +
        "</span><div><strong>" +
        u.name +
        "</strong><small>" +
        upgradeDescription(u) +
        '</small></div><span class="level">' +
        upgradeLevel(u) +
        "</span></div>";
  $("#build").innerHTML = html;
}

function showModal(html) {
  const wasPlaying = state === "playing";
  if (wasPlaying) pause();
  $("#modal").classList.remove("settings-modal");
  $("#modalContent").innerHTML = html;
  $("#modal").showModal();
}

function openLab() {
  showModal(
    '<span class="mini-label">BETWEEN THE RUNS</span><h2>次の自分を、強く。</h2><p>◆ ' +
      meta.chips +
      " チップ所持。アップグレードは次のランから有効。<br>記録はこのブラウザに保存されます。</p>" +
      permanentUpgrades
        .map((u) => {
          const cost = permanentCost(u.id);
          return (
            '<div class="shop-item"><span class="build-icon">' +
            upgradeArt(u.art) +
            "</span><div><strong>" +
            u.name +
            "　LV." +
            meta[u.id] +
            (meta[u.id] >= u.max
              ? " / " + u.max + " MAX"
              : " → " + (meta[u.id] + 1) + " / " + u.max) +
            "</strong><small>" +
            permanentDescription(u) +
            '</small></div><button data-buy="' +
            u.id +
            '" ' +
            (meta.chips < cost || meta[u.id] >= u.max ? "disabled" : "") +
            ">" +
            (meta[u.id] >= u.max ? "MAX" : "◆ " + cost) +
            "</button></div>"
          );
        })
        .join("") +
      (permanentUpgrades.every((u) => meta[u.id] >= u.max)
        ? "<p>すべての永久強化が MAX です。</p>"
        : ""),
  );
  $("#modalContent")
    .querySelectorAll("[data-buy]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (buyPermanent(b.dataset.buy)) {
            $("#modal").close();
            openLab();
            beep(700);
          }
        }),
    );
}

function resultUpgradePrompt() {
  const remaining = permanentUpgrades.filter((u) => meta[u.id] < u.max);
  if (!remaining.length) return "";
  const affordable = remaining.filter((u) => meta.chips >= permanentCost(u.id)),
    shortfall =
      Math.min(...remaining.map((u) => permanentCost(u.id))) - meta.chips;
  return (
    '<button class="result-upgrades" id="endLab"><strong>' +
    (affordable.length ? "永久強化を購入できます" : "永久強化が残っています") +
    " →</strong><span>" +
    (affordable.length
      ? "購入可能 " +
        affordable.length +
        " / " +
        remaining.length +
        "種類　·　◆ " +
        meta.chips +
        " 所持"
      : "残り " +
        remaining.length +
        "種類　·　次の購入まであと ◆ " +
        shortfall) +
    "</span></button>"
  );
}

function refreshResultUpgradePrompt() {
  if (state !== "over") return;
  const slot = $("#resultUpgrades");
  if (!slot) return;
  const prompt = resultUpgradePrompt();
  slot.innerHTML = prompt;
  slot.hidden = !prompt;
  const button = $("#endLab");
  if (button) button.onclick = openLab;
}

function renderResult(earned, newRecord = false) {
  const o = $("#overlay");
  o.classList.remove("hidden");
  const upgradePrompt = resultUpgradePrompt();
  o.innerHTML =
    celebrationHTML(newRecord ? 'record' : 'normal') +
    '<div class="run-result' +
    (newRecord ? " new-record" : "") +
    (newRecord && fx ? " result-animated" : "") +
    '"><div class="result-header"><div class="stamp">' +
    (wave > CAMPAIGN_WAVES ? "ENDLESS RUN COMPLETE" : "RUN COMPLETE") +
    '</div></div><div class="result-score">' +
    (newRecord ? '<span class="record-banner">ハイスコア更新！</span>' : "") +
    '<span>FINAL SCORE</span><strong id="finalScore">' +
    score.toLocaleString("ja-JP") +
    '</strong><small class="result-best"><span>最高記録</span> <b>' +
    Math.max(meta.best, newRecord ? score : 0).toLocaleString("ja-JP") +
    '</b></small></div><div class="result-footer"><p>WAVE ' +
    wave +
    "　 /　◆ " +
    earned +
    ' チップ獲得</p><div class="result-actions"><button class="primary" id="again">もう一度、進化する ↗</button><div id="resultUpgrades"' +
    (upgradePrompt ? "" : " hidden") +
    ">" +
    upgradePrompt +
    "</div></div></div></div>";
  $("#again").onclick = start;
  if (upgradePrompt) $("#endLab").onclick = openLab;
}
