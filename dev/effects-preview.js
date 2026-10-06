"use strict";
// Preview actual runtime effects without calling finish(), start() or persist().
document.body.classList.add("fx-preview");
ready();
state = "over";
runMeta = {};
fx = !matchMedia("(prefers-reduced-motion: reduce)").matches;
$(".game-top>span").textContent = "THE PIT / FX PREVIEW";
$(".game-top>div").innerHTML =
  '<select id="previewScene" aria-label="演出プレビュー"><option value="effects">回収・破壊・移動</option><option value="chain">CHAIN ×10</option><option value="chain-high">CHAIN ×15</option><option value="chain-max">CHAIN ×20</option><option value="damage">OUCH!</option><option value="notice">BOOM!</option><option value="result">終了画面</option><option value="record">ハイスコア</option><option value="wave">ウェーブクリア</option></select><button class="small" id="replayEffects">再生</button><button class="small" id="effects">FX ON</button>';
$("#swipeZone").innerHTML =
  "<strong>演出プレビュー</strong><small>記録・チップは変更しません。</small>";
$("#overlay").classList.add("hidden");
function previewEffects() {
  notice = null;
  $("#toast").classList.remove("show");
  particles = [];
  rings = [];
  texts = [];
  bombs = [];
  bullets = [];
  snake = [
    { x: 10, y: 9 },
    { x: 9, y: 9 },
    { x: 8, y: 9 },
    { x: 7, y: 9 },
  ];
  dir = { x: 1, y: 0 };
  food = [
    { x: 5, y: 4, gold: true },
    { x: 3, y: 3 },
  ];
  blocks = [{ x: 17, y: 4 }];
  enemies = [{ x: 3, y: 13 }];
  invuln = 0;
  const scene = $("#previewScene").value || "effects";
  if (scene === "result" || scene === "record") {
    score = scene === "record" ? 123450 : 1250;
    wave = 7;
    renderResult(36, scene === "record");
    // Keep preview actions inside this sandbox; never purchase or award chips.
    $("#again").onclick = previewEffects;
    if ($("#endLab")) $("#endLab").disabled = true;
  } else if (scene === "wave") {
    $("#overlay").classList.remove("hidden");
    $("#overlay").innerHTML =
      celebrationHTML('clear') +
      '<div class="stamp">7 WAVES CLEARED!</div><h2>ENDLESS <span>UNLOCKED.</span></h2><p>記録・チップは変更しません。</p>';
  } else if (scene.startsWith("chain") || scene === "damage" || scene === "notice") {
    $("#overlay").classList.add("hidden");
    if (scene.startsWith("chain")) {
      const level = scene === "chain-max" ? 20 : scene === "chain-high" ? 15 : 10;
      toast("CHAIN ×" + level, "combo", level);
    } else if (scene === "damage") toast("OUCH! ♥ 1", "damage");
    else toast("BOOM! ×3", "bomb");
  } else {
    $("#overlay").classList.add("hidden");
    pickupEffect({ x: 5, y: 6 }, "#ff8bae", 6);
    blockBreakEffect({ x: 5, y: 12 });
    hitEnemy({ x: 15, y: 6 });
    motion({ x: 9, y: 9 });
    motion({ x: 3, y: 14 }, true);
    impactEffect(15, 12, "#ffae42", "#ffd166", 84, "bomb");
    burst(15, 12, "#ffae42", 24, 1.5);
    burst(15, 12, "#ff8bae", 10, 1.3, "spark");
  }
  hud();
  localizePage();
}
$("#previewScene").onchange = previewEffects;
$("#replayEffects").onclick = previewEffects;
$("#language").onclick = () => setLanguage(language === "ja" ? "en" : "ja");
$("#effects").onclick = () => {
  fx = !fx;
  $("#effects").textContent = fx ? "FX ON" : "FX OFF";
  previewEffects();
};
let previewTime = 0;
function previewFrame(ts) {
  const dt = Math.min(0.05, (ts - previewTime) / 1000 || 0);
  previewTime = ts;
  demoTime += dt;
  updateEffects(dt);
  updateNotice();
  draw();
  requestAnimationFrame(previewFrame);
}
previewEffects();
bindLanguage();
requestAnimationFrame(previewFrame);
