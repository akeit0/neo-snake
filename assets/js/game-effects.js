'use strict';

// 演出・通知・音・保存

function burst(
  x,
  y,
  color = '#d8fa65',
  n = 16,
  power = 1,
  shape = 'debris',
  sizeScale = 1,
) {
  if (!fx) return;
  for (let i = 0; i < n; i++) {
    const a = ((i + Math.random() * 0.6) / n) * Math.PI * 2,
      s = (65 + Math.random() * 150) * power,
      life = 0.28 + Math.random() * 0.4;
    particles.push({
      x: (x + 0.5) * C,
      y: (y + 0.5) * C,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life,
      maxLife: life,
      size:
        (shape === 'spark' ? 6 + Math.random() * 5 : 4 + Math.random() * 6) *
        Math.sqrt(power) *
        sizeScale,
      color,
      shape,
      angle: a,
      spin: (Math.random() - 0.5) * 9,
    });
  }
  if (particles.length > 650) particles.splice(0, particles.length - 650);
}

function pulse(
  x,
  y,
  color,
  radius = 50,
  life = 0.4,
  spikes = false,
  kind = 'normal',
) {
  if (!fx) return;
  rings.push({
    x: (x + 0.5) * C,
    y: (y + 0.5) * C,
    color,
    radius,
    life,
    maxLife: life,
    spikes,
    kind,
  });
  if (rings.length > 45) rings.shift();
}

// Solid color until the final frames; shape/size carries most of the decay.
function effectAlpha(life, maxLife) {
  return life / maxLife > 0.12 ? 1 : 0.65;
}

function pickupEffect(f, color, level) {
  if (!fx) return;
  const count = 24 + Math.min(level, 8);
  burst(f.x, f.y, color, count, 1.8, 'debris', 1.25);
  // Keep the chunky fragments, but confine pickup feedback near its cell.
  for (const p of particles.slice(-count)) {
    p.vx *= 0.55;
    p.vy *= 0.55;
    p.life *= 0.7;
    p.maxLife = p.life;
  }
}

// Keep the old solid square fragments as the main block-destruction cue.
function blockBreakEffect(block) {
  burst(block.x, block.y, '#bba1fa', 24, 1.4);
  pulse(block.x, block.y, '#bba1fa', 38, 0.28, true, 'impact');
  burst(block.x, block.y, '#fff2cf', 4, 1, 'spark');
}

// A short, layered impact. Accent colors occupy small rays, not large washes.
function impactEffect(x, y, primary, accent, radius = 60, kind = 'impact') {
  if (!fx) return;
  pulse(x, y, primary, radius, kind === 'bomb' ? 0.5 : 0.32, true, kind);
  pulse(x, y, accent, radius * 0.64, 0.24, false, 'echo');
  burst(x, y, accent, kind === 'bomb' ? 16 : 8, 1.2, 'spark');
}

function motion(p, enemy = false) {
  const interval = waveRules(wave)[enemy ? 'enemyInterval' : 'snakeInterval'];
  pulse(
    p.x,
    p.y,
    enemy ? '#65c9ff' : '#bedb60',
    10,
    Math.min(0.2, interval * 0.85),
    false,
    enemy ? 'motion-diamond' : 'motion-square',
  );
}

function hitEnemy(e) {
  burst(e.x, e.y, '#65c9ff', 28, 1.35);
  burst(e.x, e.y, '#bba1fa', 8, 1.1);
  impactEffect(e.x, e.y, '#65c9ff', '#fff2cf', 72);
}

function noticePosition(width, height, head, scale, w, h, current = null) {
  const margin = 12,
    clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n)),
    safe = (p) => ({
      x: clamp(p.x, w / 2 + margin, width - w / 2 - margin),
      y: clamp(p.y, h / 2 + margin, height - h / 2 - margin),
    }),
    distance = (p) =>
      Math.hypot(
        Math.max(0, Math.abs(p.x - head.x) - w / 2),
        Math.max(0, Math.abs(p.y - head.y) - h / 2),
      );
  if (current && distance(safe(current)) > Math.max(54, scale * 65))
    return safe(current);
  const points = [
    { x: width * 0.5, y: height * 0.18 },
    { x: width * 0.5, y: height * 0.78 },
    { x: width * 0.24, y: height * 0.48 },
    { x: width * 0.76, y: height * 0.48 },
  ].map(safe);
  points.sort((a, b) => distance(b) - distance(a));
  return points[0];
}

function placeToast() {
  if (!notice || !snake.length) return;
  const arena = $('#arena'),
    el = $('#toast'),
    width = arena.clientWidth || W * C,
    height = arena.clientHeight || H * C,
    scale = Math.min(width / (W * C), height / (H * C)),
    head = {
      x: (width - W * C * scale) / 2 + (snake[0].x + 0.5) * C * scale,
      y: (height - H * C * scale) / 2 + (snake[0].y + 0.5) * C * scale,
    },
    power = notice.power * 1.08,
    w = Math.min(width - 24, ((el.offsetWidth || 180) + 48) * power),
    h = Math.min(height - 24, ((el.offsetHeight || 70) + 32) * power);
  notice.pos = noticePosition(width, height, head, scale, w, h, notice.pos);
  el.style.left = notice.pos.x + 'px';
  el.style.top = notice.pos.y + 'px';
}

function toast(t, kind = 'info', level = 1) {
  if (!fx) return;
  if (
    notice &&
    notice.kind === 'damage' &&
    demoTime < notice.until &&
    kind !== 'damage'
  )
    return;
  const el = $('#toast');
  notice = {
    kind,
    until: demoTime + (kind === 'damage' || kind === 'bomb' ? 1.05 : 0.9),
    pos: null,
    power:
      kind === 'combo'
        ? Math.min(
            ($('#arena').clientWidth || W * C) < 480 ? 1.15 : 1.4,
            1 + Math.max(0, level - 3) * 0.06,
          )
        : 1,
  };
  el.classList.remove(
    'show',
    'toast-damage',
    'toast-combo',
    'toast-info',
    'toast-bomb',
    'combo-high',
    'combo-max',
  );
  el.classList.add('toast-' + kind);
  if (kind === 'combo') {
    if (level >= CHAIN_BASE_MAX * 0.6) el.classList.add('combo-high');
    if (level >= CHAIN_BASE_MAX) el.classList.add('combo-max');
  }
  el.textContent = t;
  el.style.setProperty('--combo-power', notice.power);
  placeToast();
  void el.offsetWidth;
  el.classList.add('show');
}

function persist() {
  try {
    localStorage.setItem('snake-overdrive-v1', JSON.stringify(meta));
  } catch {}
}

// Confetti overlays the score without intercepting input; animations are finite.
function celebrationHTML(kind = "normal") {
  if (!fx) return "";
  const width = $("#arena").clientWidth || W * C;
  const height = $("#arena").clientHeight || H * C;
  const count = kind === "record" ? 240 : kind === "clear" ? 144 : 72;
  const volleys = kind === "record" ? 6 : kind === "clear" ? 4 : 3;
  const colors = ["#d8fa65", "#bba1fa", "#ff8bae", "#65c9ff", "#ffd166"];
  return (
    '<div class="result-confetti" aria-hidden="true">' +
    Array.from({ length: count }, (_, i) => {
      const left = i % 2 === 0;
      const dx = (left ? 1 : -1) * width * (0.08 + Math.random() * 0.84);
      // Linear drag: y = terminal * t - launch * (1 - exp(-drag * t)).
      // CSS samples a normalized drag of 24; varying duration models lighter pieces.
      const duration = 8 + Math.random() * 4;
      const rise = height * (0.45 + Math.random() * 0.7);
      const fall = rise + height * (0.12 + Math.random() * 0.5);
      const delay = (i % volleys) * 0.3 + Math.random() * 0.55;
      const flutterPeriod = 1.3 + Math.random() * 1.8;
      const flutterPhase = -Math.random() * flutterPeriod;
      const flutterTurns = Math.ceil((duration - flutterPhase) / flutterPeriod) + 1;
      return (
        '<i style="left:' +
        (left ? 5 : 95) +
        "%;--dx:" +
        dx.toFixed(0) +
        "px;--rise:" +
        rise.toFixed(2) +
        "px;--fall:" +
        fall.toFixed(2) +
        "px;--duration:" +
        duration.toFixed(3) +
        "s;--flutter:" +
        (8 + Math.random() * 20).toFixed(0) +
        "px;--tilt:" +
        ((Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 40)).toFixed(0) +
        "deg;--flutter-period:" +
        flutterPeriod.toFixed(3) +
        "s;--flutter-phase:" +
        flutterPhase.toFixed(3) +
        "s;--flutter-turns:" +
        flutterTurns +
        ";--delay:" +
        delay.toFixed(2) +
        "s;--size:" +
        (6 + (i % 5) * 2) +
        "px;--color:" +
        colors[i % colors.length] +
        '"></i>'
      );
    }).join("") +
    "</div>"
  );
}
