'use strict';
// 盤面の幅・高さはマス単位、C は1マスのピクセル数。
const $ = (selector) => document.querySelector(selector);
const canvas = $('#game');
const ctx = canvas.getContext('2d');
const W = 22,
  H = 18,
  C = 28;
canvas.width = W * C;
canvas.height = H * C;

// ブラウザに保存する記録。runMeta は開始時の永久強化を固定する。
let saved;
try {
  saved = JSON.parse(localStorage.getItem('snake-overdrive-v1')) || {};
} catch {
  saved = {};
}
const DEFAULT_AUDIO_LEVELS = { bgmVolume: 0.7, sfxVolume: 1 };
const DEFAULT_MUSIC_OPTIONS = { bgmSync: true };
let meta = {
  best: 0,
  chips: 0,
  armor: 0,
  combo: 0,
  bomb: 0,
  echo: 0,
  cutter: 0,
  echoEnabled: true,
  ...DEFAULT_AUDIO_LEVELS,
  ...DEFAULT_MUSIC_OPTIONS,
  ...saved,
};
for (const [key, fallback] of Object.entries(DEFAULT_AUDIO_LEVELS)) {
  meta[key] =
    typeof meta[key] === 'number' && Number.isFinite(meta[key])
      ? Math.max(0, Math.min(1, meta[key]))
      : fallback;
}
if (typeof meta.bgmSync !== 'boolean')
  meta.bgmSync = DEFAULT_MUSIC_OPTIONS.bgmSync;
// Retired upgrade ranks no longer participate in the shop or runs.
delete meta.shed;
let runMeta = {};
let cutterCharge = 0;

// ランの状態と盤面（各オブジェクトの x / y はマス単位）。
let state = 'ready'; // ready → playing → upgrade / paused / over
let snake = [],
  dir = { x: 1, y: 0 },
  queue = [];
let food = [],
  blocks = [],
  enemies = [],
  bullets = [],
  bombs = [];
let mut = {};
let hearts = 2,
  score = 0,
  wave = 1,
  eaten = 0,
  target = 12;
let chain = 0,
  chainTime = 0,
  lastEat = -99;

// タイマーは秒単位。time はプレイ中、demoTime は全状態で進む。
let time = 0,
  demoTime = 0,
  prev = 0,
  tick = 0,
  enemyTick = 0;
let shootCD = 0,
  bombCD = 0,
  invuln = 0;

// 演出の座標はピクセル単位。
let particles = [],
  texts = [],
  rings = [],
  notice = null;
let sound = false;
let fx = !matchMedia('(prefers-reduced-motion: reduce)').matches;

// 座標・配置・ウェーブ難易度

function rnd(n) {
  return Math.floor(Math.random() * n);
}

function eq(a, b) {
  return a.x === b.x && a.y === b.y;
}

function dist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function wrappedDist(a, b) {
  const dx = Math.abs(a.x - b.x),
    dy = Math.abs(a.y - b.y);
  return Math.min(dx, W - dx) + Math.min(dy, H - dy);
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function free() {
  for (let i = 0; i < 1000; i++) {
    const p = { x: rnd(W), y: rnd(H) };
    if (
      !snake.some((s) => eq(s, p)) &&
      !food.some((s) => eq(s, p)) &&
      !blocks.some((s) => eq(s, p)) &&
      !enemies.some((s) => eq(s, p))
    )
      return p;
  }
  return null;
}

function spawnPositions() {
  const positions = [];
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      const p = { x, y };
      if (
        wrappedDist(p, snake[0]) > 5 &&
        !snake.some((s) => eq(s, p)) &&
        !food.some((f) => eq(f, p)) &&
        !blocks.some((b) => eq(b, p)) &&
        !enemies.some((e) => eq(e, p))
      )
        positions.push(p);
    }
  return shuffle(positions);
}

function waveRules(n) {
  const stage = Math.max(1, Math.floor(n)),
    b = runBalance;
  return {
    target: Math.min(b.targetMax, b.targetBase + (stage - 1) * b.targetStep),
    enemies: Math.min(
      b.enemyMax,
      b.enemyBase + Math.floor((stage - 1) / b.enemyEvery),
    ),
    blocks: Math.min(b.blockMax, b.blockBase + (stage - 1) * b.blockStep),
    snakeInterval: Math.max(
      b.snakeMin,
      b.snakeBase - (stage - 1) * b.snakeStep,
    ),
    enemyInterval: Math.max(
      b.enemyIntervalMin,
      b.enemyIntervalBase - (stage - 1) * b.enemyIntervalStep,
    ),
  };
}

function setupWave() {
  target = waveRules(wave).target;
  blocks = [];
  enemies = [];
  enemyTick = 0;
  blocks = spawnPositions().slice(0, waveRules(wave).blocks);
  spawnEnemies();
  fillFood();
}

function spawnEnemies() {
  enemies.push(
    ...spawnPositions().slice(
      0,
      Math.max(0, waveRules(wave).enemies - enemies.length),
    ),
  );
}

function addFood(n = 1) {
  for (let i = 0; i < n; i++) {
    const p = free();
    if (p)
      food.push({ ...p, gold: Math.random() < 0.12 + (mut.gold || 0) * 0.12 });
  }
}

function fillFood() {
  addFood(
    Math.max(0, runBalance.foodBase + (mut.orchard || 0) * 3 - food.length),
  );
}

// 通常強化・永久強化

function upgradeLimit(u) {
  if (u.id === 'blast')
    return Math.max(
      0,
      Math.min(
        UPGRADE_LIMITS.blast,
        runBalance.bombRadiusMax - 1 - runMeta.bomb,
      ),
    );
  if (u.id === 'orchard')
    return Math.min(
      UPGRADE_LIMITS.orchard,
      Math.floor((W * H - runBalance.foodBase) / 3),
    );
  return UPGRADE_LIMITS[u.id] ?? Infinity;
}

function canUpgrade(u) {
  return (
    (!u.requires || runMeta[u.requires] > 0) &&
    (mut[u.id] || 0) < upgradeLimit(u) &&
    (u.id !== 'compact' || (snake.length > 4 && !runMeta.cutter))
  );
}

function availableUpgrades() {
  return upgrades.filter(canUpgrade);
}

function upgradeLevel(u, choice = false) {
  const lv = mut[u.id] || 0,
    max = upgradeLimit(u);
  return (
    'LV.' +
    lv +
    (choice ? ' → ' + (lv + 1) : '') +
    (Number.isFinite(max) ? ' / ' + max + (lv >= max ? ' MAX' : '') : ' / ∞')
  );
}

function upgradeDescription(u) {
  return u.id === 'compact'
    ? '選択時に長さの' +
        runBalance.compactRatio +
        '%を短縮。最低' +
        runBalance.compactAmount +
        'つ、最小の長さ4。'
    : u.id === 'blast'
      ? '爆弾の範囲 +1。最大' + runBalance.bombRadiusMax + 'マス。'
      : u.desc;
}

function compactReduction() {
  return Math.min(
    Math.max(0, snake.length - 4),
    Math.max(
      runBalance.compactAmount,
      Math.ceil((snake.length * runBalance.compactRatio) / 100),
    ),
  );
}

function applyRunUpgrade(id) {
  const u = upgrades.find((u) => u.id === id);
  if (!u || !canUpgrade(u)) return false;
  mut[id] = (mut[id] || 0) + 1;
  if (id === 'shield') hearts++;
  if (id === 'compact') {
    const removed = snake.splice(snake.length - compactReduction());
    removed.forEach((p) => burst(p.x, p.y, '#bba1fa', 7));
  }
  return true;
}

function permanentCost(id, level = meta[id]) {
  return balance[id + 'Cost' + (level > 0 ? level + 1 : '')] ?? Infinity;
}

function permanentDescription(u) {
  if (u.id === 'cutter')
    return cutterDescription(balance) + '次のランから有効。';
  return u.id === 'bomb'
    ? 'Lv.1で爆弾を解放。範囲2→3→4マス、間隔 ' +
        [0, 1, 2]
          .map((i) =>
            (balance.bombInterval - i * balance.bombRankStep).toFixed(1),
          )
          .join('→') +
        '秒。次のランから有効。'
    : u.desc;
}

function cutterDescription(values) {
  return (
    'エサ' +
    values.cutterFoods +
    '個で1回充填。長さ' +
    values.cutterThreshold +
    'を超えた状態で切断可能な体に弾を当てると、着弾部位から末尾まで最大' +
    values.cutterRatio +
    '%切断。最低長さ' +
    values.cutterMin +
    '。'
  );
}

function buyPermanent(id) {
  const u = permanentUpgrades.find((u) => u.id === id);
  if (!u || meta[id] >= u.max) return false;
  const cost = permanentCost(id);
  if (meta.chips < cost) return false;
  meta.chips -= cost;
  meta[id]++;
  persist();
  hud();
  refreshResultUpgradePrompt();
  return true;
}

// ラン開始・状態遷移

function init() {
  runBalance = { ...balance };
  runMeta = {
    armor: meta.armor,
    combo: meta.combo,
    bomb: meta.bomb,
    echo: meta.echo,
    cutter: meta.cutter,
  };
  snake = Array.from({ length: runBalance.startLength }, (_, i) => ({
    x: 11 - i,
    y: 8,
  }));
  dir = { x: 1, y: 0 };
  queue = [];
  food = [];
  blocks = [];
  enemies = [];
  enemyTick = 0;
  rings = [];
  notice = null;
  $('#toast').classList.remove('show');
  bullets = [];
  bombs = [];
  bombCD = 2;
  particles = [];
  texts = [];
  mut = {};
  score = 0;
  cutterCharge = 0;
  wave = 1;
  eaten = 0;
  target = 12;
  chain = 0;
  chainTime = 0;
  time = 0;
  lastEat = -99;
  tick = 0;
  shootCD = 0;
  invuln = 0;
  hearts = runBalance.startHearts + runMeta.armor;
  setupWave();
  hud();
  renderBuild();
}

function start() {
  init();
  state = 'playing';
  $('#overlay').classList.add('hidden');
  beep(550);
  canvas.focus();
  syncMusic();
}

function ready() {
  init();
  state = 'ready'; // a curated attract-mode board
  snake = [
    { x: 17, y: 9 },
    { x: 16, y: 9 },
    { x: 15, y: 9 },
    { x: 14, y: 9 },
    { x: 13, y: 9 },
    { x: 13, y: 10 },
    { x: 13, y: 11 },
    { x: 12, y: 11 },
    { x: 11, y: 11 },
    { x: 10, y: 11 },
    { x: 9, y: 11 },
    { x: 9, y: 12 },
    { x: 9, y: 13 },
  ];
  food = [
    { x: 5, y: 4 },
    { x: 24, y: 3, gold: true },
    { x: 21, y: 12 },
    { x: 5, y: 15 },
    { x: 25, y: 16 },
    { x: 18, y: 5, gold: true },
    { x: 20, y: 8 },
    { x: 6, y: 8 },
  ];
  blocks = [
    { x: 5, y: 11 },
    { x: 6, y: 11 },
    { x: 25, y: 7 },
    { x: 26, y: 7 },
    { x: 24, y: 14 },
  ];
  snake = snake.map((p) => ({
    x: Math.min(W - 1, p.x),
    y: Math.min(H - 1, p.y),
  }));
  food = food.filter((p) => p.x < W && p.y < H);
  blocks = blocks.filter((p) => p.x < W && p.y < H);
  $('#overlay').innerHTML =
    '<div class="stamp">SNAKE, BUT MAKE IT CHAOS.</div><h2>EAT. SHOOT.<br><span>EVOLVE.</span></h2><p>食べて弾を放ち、進化しろ。<br>7ウェーブを突破し、無限の戦場へ。</p><button class="primary" id="start">ランをはじめる ↗</button><div class="sub">PC: WASD / 矢印キー　・　MOBILE: 盤面 / 下部をスワイプ</div>';
  $('#start').onclick = start;
  $('#overlay').classList.remove('hidden');
}

function pause() {
  if (state === 'playing') {
    state = 'paused';
    $('#overlay').classList.remove('hidden');
    $('#overlay').innerHTML =
      '<div class="stamp">TAKE A BREATH.</div><h2>PAUSED<span> //</span></h2><p>ひと息ついて、もう一口。</p><button class="primary" id="resume">つづける →</button>';
    $('#resume').onclick = pause;
  } else if (state === 'paused') {
    state = 'playing';
    $('#overlay').classList.add('hidden');
    tick = -0.3;
  }
  syncMusic();
}

function offer() {
  if (state !== 'playing') return;
  state = 'upgrade';
  bullets = [];
  bombs = [];
  const bonus =
      wave * runBalance.waveBonus +
      (wave === CAMPAIGN_WAVES ? runBalance.milestoneBonus : 0),
    picks = shuffle(availableUpgrades()).slice(0, 3),
    o = $('#overlay');
  o.classList.remove('hidden');
  o.innerHTML =
    celebrationHTML(wave === CAMPAIGN_WAVES ? 'clear' : 'normal') +
    '<div class="stamp">' +
    (wave === CAMPAIGN_WAVES
      ? '7 WAVES CLEARED! — ENDLESS UNLOCKED'
      : 'WAVE ' + wave + ' CLEAR!') +
    ' +' +
    bonus +
    '</div><h2 class="upgrade-title">CHOOSE YOUR <span>EVOLUTION.</span></h2><p>' +
    (wave === CAMPAIGN_WAVES
      ? '次は WAVE 08。ここから先は無限ウェーブ。'
      : '敵も障害物も増える。次のウェーブへ進化しよう。') +
    '</p><div class="choices" style="grid-template-columns:repeat(' +
    Math.max(1, picks.length) +
    ',1fr)">' +
    picks
      .map(
        (u, i) =>
          '<button class="choice" data-up="' +
          i +
          '"><span class="symbol">' +
          upgradeArt(u.id) +
          '</span><strong>' +
          u.name +
          '</strong><small>' +
          upgradeDescription(u) +
          '</small><span class="choice-level">' +
          upgradeLevel(u, true) +
          '</span></button>',
      )
      .join('') +
    (picks.length
      ? ''
      : '<button class="primary" id="nextWave">次のウェーブへ →</button>') +
    '</div><div class="sub">' +
    (picks.length
      ? 'このランだけの強化。上限到達の強化は候補から外れます。'
      : '現在選べる強化はありません。') +
    '</div>';
  if (!picks.length) $('#nextWave').onclick = () => advanceWave(bonus);
  o.querySelectorAll('[data-up]').forEach(
    (b) =>
      (b.onclick = () => {
        if (state !== 'upgrade') return;
        const u = picks[+b.dataset.up];
        if (applyRunUpgrade(u.id)) advanceWave(bonus);
      }),
  );
}

function advanceWave(bonus) {
  if (state !== 'upgrade') return;
  score += bonus;
  wave++;
  eaten = 0;
  setupWave();
  renderBuild();
  state = 'playing';
  hud();
  queue = [];
  tick = -0.6;
  $('#overlay').classList.add('hidden');
  toast(wave === 8 ? 'ENDLESS!' : 'EVOLVED!');
  beep(700, 0.15);
  syncMusic();
}

function finish() {
  if (state === 'over') return;
  state = 'over';
  syncMusic();
  const newRecord = score > meta.best;
  const earned = Math.max(1, Math.floor(score / 100) + wave * 2);
  meta.chips += earned;
  meta.best = Math.max(meta.best, score);
  persist();
  hud();
  renderResult(earned, newRecord);
  beep(120, 0.3);
}

// 移動・回収・ダメージ・射撃

function direction(x, y) {
  if (state === 'ready') return;
  const last = queue.length ? queue[queue.length - 1] : dir;
  if (
    (x !== -last.x || y !== -last.y) &&
    queue.length < 2 &&
    (x !== last.x || y !== last.y)
  )
    queue.push({ x, y });
}

function moveEnemies() {
  for (const e of enemies) {
    const options = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]
      .map((d) => ({ x: (e.x + d.x + W) % W, y: (e.y + d.y + H) % H }))
      .filter(
        (p) =>
          !blocks.some((b) => eq(b, p)) &&
          !food.some((f) => eq(f, p)) &&
          !enemies.some((o) => o !== e && eq(o, p)) &&
          !snake.slice(1).some((b) => eq(b, p)),
      );
    if (!options.length) continue;
    options.sort((a, b) => dist(a, snake[0]) - dist(b, snake[0]));
    const next =
      Math.random() < 0.45 ? options[0] : options[rnd(options.length)];
    motion(e, true);
    Object.assign(e, next);
    if (eq(e, snake[0])) {
      damage();
      if (state !== 'playing') break;
    }
  }
}

function step() {
  const old = dir;
  if (queue.length) dir = queue.shift();
  const turned = old.x !== dir.x || old.y !== dir.y;
  if (turned) {
    beep(450, 0.025, 'sine');
  }
  let h = { x: (snake[0].x + dir.x + W) % W, y: (snake[0].y + dir.y + H) % H };
  const enemy = enemies.find((e) => eq(e, h));
  if (enemy) {
    enemies.splice(enemies.indexOf(enemy), 1);
    hitEnemy(enemy);
    damage();
  }
  const wall = blocks.find((b) => eq(b, h));
  if (wall) {
    blocks.splice(blocks.indexOf(wall), 1);
    damage();
  }
  if (snake.slice(0, -1).some((s) => eq(s, h))) damage();
  if (state !== 'playing') return;
  motion(snake[0]);
  snake.unshift(h);
  snake.pop();
  food
    .filter((f) => dist(f, h) <= (mut.magnet || 0))
    .forEach((f) => collect(f));
  fillFood();
  if (eaten >= target) offer();
  hud();
}

function chainLimit() {
  return CHAIN_BASE_MAX + (mut.combo || 0) * CHAIN_UPGRADE_STEP;
}

function collect(f, depth = 0) {
  const idx = food.indexOf(f);
  if (idx < 0) return;
  food.splice(idx, 1);
  const windowTime = runBalance.chainWindow + runMeta.combo * 0.5;
  chain =
    time - lastEat < windowTime
      ? Math.min(chain + 1, chainLimit())
      : 1;
  lastEat = time;
  chainTime = windowTime;
  eaten++;
  let points = Math.round(
    runBalance.foodPoints *
      (f.gold ? 3 : 1) *
      chain *
      (1 + (mut.gold || 0) * 0.4),
  );
  score += points;
  snake.push({ ...snake[snake.length - 1] });
  if (runMeta.cutter)
    cutterCharge = Math.min(runBalance.cutterFoods, cutterCharge + 1);
  const foodColor = f.gold ? '#ffcc61' : '#ff8bae';
  pickupEffect(f, foodColor, chain);
  texts.push({ x: (f.x + 0.5) * C, y: f.y * C, text: '+' + points, life: 0.8 });
  beep(350 + chain * 70);
  if (chain >= 3 && depth === 0)
    toast(
      chain >= 6 ? 'CHAIN ×' + chain + ' !!' : 'COMBO ×' + chain,
      'combo',
      chain,
    );
  if (mut.chain && depth < 2) {
    const near = food.filter((p) => dist(p, f) <= 1 + mut.chain);
    near.forEach((p) => collect(p, depth + 1));
  }
}

function damage() {
  if (invuln > 0) return;
  hearts--;
  invuln = 1.8;
  chain = 0;
  chainTime = 0;
  burst(snake[0].x, snake[0].y, '#ff6475', 48, 1.65);
  burst(snake[0].x, snake[0].y, '#fff2ca', 16, 1.2);
  impactEffect(snake[0].x, snake[0].y, '#ff6475', '#fff2ca', 88);
  if (fx) {
    $('#arena').classList.remove('shake');
    void $('#arena').offsetWidth;
    $('#arena').classList.add('shake');
  }
  beep(100, 0.2);
  toast('OUCH! ♥ ' + hearts, 'damage');
  renderBuild();
  if (hearts <= 0) finish();
}

function shoot() {
  if (state !== 'playing' || shootCD > 0 || snake.length < 7) return;
  snake.pop();
  shootCD = Math.max(
    runBalance.shootMin,
    runBalance.shootInterval - (mut.pierce || 0) * 0.1,
  );
  const dirs = [dir];
  if (mut.split) dirs.push({ x: dir.y, y: -dir.x }, { x: -dir.y, y: dir.x });
  for (const d of dirs)
    bullets.push({
      x: snake[0].x + 0.5,
      y: snake[0].y + 0.5,
      dx: d.x,
      dy: d.y,
      life: 2,
      pierce: mut.pierce || 0,
    });
  beep(800, 0.05);
  hud();
}

function tailCutStart() {
  if (
    !runMeta.cutter ||
    cutterCharge < runBalance.cutterFoods ||
    snake.length <= runBalance.cutterThreshold
  )
    return snake.length;
  const limit = Math.min(
    Math.floor((snake.length * runBalance.cutterRatio) / 100),
    snake.length - runBalance.cutterMin,
  );
  return Math.max(1, snake.length - limit);
}

function tryTailCut(bullet, from) {
  const cutStart = tailCutStart();
  if (cutStart >= snake.length) return false;
  // Sample the flight path: a fast bullet must not jump over a body cell.
  const steps = Math.max(
    1,
    Math.ceil(
      Math.max(Math.abs(bullet.x - from.x), Math.abs(bullet.y - from.y)) * 4,
    ),
  );
  for (let step = 1; step <= steps; step++) {
    const position = {
      x: Math.floor(from.x + ((bullet.x - from.x) * step) / steps),
      y: Math.floor(from.y + ((bullet.y - from.y) * step) / steps),
    };
    // Existing enemy / block / food hits take precedence along this flight.
    if (
      enemies.some((part) => eq(part, position)) ||
      blocks.some((part) => eq(part, position)) ||
      food.some((part) => eq(part, position))
    )
      return false;
    const index = snake.findIndex((part, i) => i > 0 && eq(part, position));
    if (index < cutStart) continue;
    const removed = snake.splice(index);
    removed.forEach((part) => burst(part.x, part.y, '#b4e4be', 10));
    cutterCharge = 0;
    bullet.life = 0; // A cut consumes the bullet even with piercing.
    pulse(position.x, position.y, '#fff6bf', 60, 0.4);
    toast('TAIL CUT −' + removed.length);
    return true;
  }
  return false;
}

// 爆弾の投擲・更新・爆発

function bombRadius() {
  return Math.min(
    runBalance.bombRadiusMax,
    1 + runMeta.bomb + (mut.blast || 0),
  );
}

function bombInterval() {
  return (
    (runBalance.bombInterval - (runMeta.bomb - 1) * runBalance.bombRankStep) *
    (1 - Math.min(0.6, (mut.charge || 0) * 0.15))
  );
}

function throwBomb() {
  if (state !== 'playing' || !runMeta.bomb || bombCD > 0) return;
  const head = snake[0],
    targets = [...enemies, ...blocks]
      .filter((p) => dist(head, p) <= runBalance.bombTargetRange)
      .sort((a, b) => dist(a, head) - dist(b, head));
  if (!targets.length) return;
  const aim = targets[0];
  bombs.push({
    from: { ...head },
    to: { ...aim },
    life: runBalance.bombFlight,
    maxLife: runBalance.bombFlight,
    radius: bombRadius(),
  });
  bombCD = bombInterval();
  beep(380, 0.06, 'sine');
}

function updateBombs(dt) {
  bombCD = Math.max(0, bombCD - dt);
  for (const b of [...bombs]) {
    b.life -= dt;
    if (b.life <= 0) explodeBomb(b);
  }
  bombs = bombs.filter((b) => b.life > 0);
  throwBomb();
}

function explodeBomb(b) {
  let hits = 0;
  for (const e of [...enemies])
    if (dist(e, b.to) <= b.radius) {
      enemies.splice(enemies.indexOf(e), 1);
      score += runBalance.enemyPoints;
      food.push({ ...e, gold: true });
      hitEnemy(e);
      hits++;
    }
  for (const block of [...blocks])
    if (dist(block, b.to) <= b.radius) {
      blocks.splice(blocks.indexOf(block), 1);
      score += runBalance.blockPoints;
      food.push({ ...block, gold: Math.random() < 0.3 });
      blockBreakEffect(block);
      hits++;
    }
  impactEffect(b.to.x, b.to.y, '#ffae42', '#ffd166', b.radius * C, 'bomb');
  burst(b.to.x, b.to.y, '#ffae42', 24, 1.5);
  burst(b.to.x, b.to.y, '#ff8bae', 10, 1.3, 'spark');
  if (hits) toast('BOOM! ×' + hits, 'bomb');
  beep(140, 0.16, 'sawtooth');
}

// フレーム更新（停止・強化選択への遷移時は途中で終了）

function frame(ts) {
  const dt = Math.min(0.05, (ts - prev) / 1000 || 0);
  prev = ts;
  update(dt);
  syncMusic();
  requestAnimationFrame(frame);
}

function update(dt) {
  demoTime += dt;
  updateNotice();
  if (state === 'playing') {
    time += dt;
    chainTime = Math.max(0, chainTime - dt);
    if (!chainTime) chain = 0;
    shootCD = Math.max(0, shootCD - dt);
    invuln = Math.max(0, invuln - dt);
    enemyTick += dt;
    if (enemyTick >= waveRules(wave).enemyInterval) {
      enemyTick = 0;
      moveEnemies();
    }
    if (state !== 'playing') {
      hud();
      draw();
      return;
    }
    updateBombs(dt);
    if (shootCD <= 0 && snake.length > 6) shoot();
    tick += dt;
    const interval = waveRules(wave).snakeInterval;
    if (tick >= interval) {
      tick -= interval;
      step();
    }
    if (state !== 'playing') {
      hud();
      draw();
      return;
    }
    updateBullets(dt);
    if (eaten >= target && state === 'playing') offer();
    hud();
  }
  if (state === 'playing' || state === 'over') updateEffects(dt);
  draw();
}

function updateNotice() {
  if (notice) {
    if (demoTime >= notice.until) {
      notice = null;
      $('#toast').classList.remove('show');
    } else placeToast();
  }
}

function updateBullets(dt) {
  for (const b of [...bullets]) {
    const from = { x: b.x, y: b.y };
    b.x += b.dx * dt * runBalance.bulletSpeed;
    b.y += b.dy * dt * runBalance.bulletSpeed;
    b.life -= dt;
    if (b.life > 0 && tryTailCut(b, from)) continue;
    const p = { x: Math.floor(b.x), y: Math.floor(b.y) },
      block = blocks.find((s) => eq(s, p)),
      f = food.find((s) => eq(s, p)),
      enemy = enemies.find((s) => eq(s, p));
    if (enemy) {
      enemies.splice(enemies.indexOf(enemy), 1);
      score += runBalance.enemyPoints;
      hitEnemy(enemy);
      food.push({ ...enemy, gold: true });
      beep(520);
      if (b.pierce > 0) b.pierce--;
      else b.life = 0;
    }
    if (block) {
      blocks.splice(blocks.indexOf(block), 1);
      score += runBalance.blockPoints;
      blockBreakEffect(block);
      food.push({ ...block, gold: Math.random() < 0.3 });
      beep(320);
      if (b.pierce > 0) b.pierce--;
      else b.life = 0;
    }
    if (f) {
      collect(f);
      if (!b.pierce) b.life = 0;
      fillFood();
    }
    if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) b.life = 0;
  }
  bullets = bullets.filter((b) => b.life > 0);
}

function updateEffects(dt) {
  for (const r of rings) r.life -= dt;
  rings = rings.filter((r) => r.life > 0);
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  particles = particles.filter((p) => p.life > 0);
  for (const t of texts) {
    t.life -= dt;
    t.y -= dt * 30;
  }
  texts = texts.filter((t) => t.life > 0);
}
