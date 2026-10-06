'use strict';

// 描画（レイヤー順は draw を参照）

function draw() {
  drawBoard();
  drawWrapEcho();
  const snakeVisible = !(invuln > 0 && Math.floor(demoTime * 12) % 2);
  // Shadows precede every solid object so they never cover the snake.
  drawShadows(snakeVisible);
  drawRings();
  ctx.globalAlpha = 1;
  drawBlocks();
  drawFood();
  drawEnemies();
  drawParticles();
  ctx.globalAlpha = 1;
  drawSnake(snakeVisible);
  drawBullets();
  drawBombs();
  drawScoreTexts();
  drawArenaStatus();
}

function drawBoard() {
  ctx.clearRect(0, 0, W * C, H * C);
  ctx.fillStyle = '#3c4941';
  ctx.fillRect(0, 0, W * C, H * C);
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = '#414e46';
        ctx.fillRect(x * C, y * C, C, C);
      }
    }
  ctx.strokeStyle = '#526157';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x++) {
    ctx.moveTo(x * C, 0);
    ctx.lineTo(x * C, H * C);
  }
  for (let y = 0; y <= H; y++) {
    ctx.moveTo(0, y * C);
    ctx.lineTo(W * C, y * C);
  }
  ctx.stroke();
}

function wrapEchoCells() {
  if (!runMeta.echo || !meta.echoEnabled) return [];
  const cells = new Map(),
    set = (p, color) => cells.set(p.x + ',' + p.y, { ...p, color });
  food.forEach((p) => set(p, p.gold ? '#ffcc61' : '#ff8bae'));
  blocks.forEach((p) => set(p, '#bba1fa'));
  enemies.forEach((p) => set(p, '#65c9ff'));
  snake.forEach((p, i) => set(p, snakePartColor(i)));
  return [...cells.values()].filter(
    (p) => p.x === 0 || p.x === W - 1 || p.y === 0 || p.y === H - 1,
  );
}

function drawWrapEcho() {
  const cells = wrapEchoCells();
  if (!cells.length) return;
  ctx.save();
  for (const p of cells) {
    ctx.fillStyle = p.color;
    for (let i = 0; i < 10; i++) {
      ctx.globalAlpha = 0.46 * (1 - i / 10);
      if (p.x === 0) ctx.fillRect(W * C - 1 - i, p.y * C + 3, 1, C - 6);
      if (p.x === W - 1) ctx.fillRect(i, p.y * C + 3, 1, C - 6);
      if (p.y === 0) ctx.fillRect(p.x * C + 3, H * C - 1 - i, C - 6, 1);
      if (p.y === H - 1) ctx.fillRect(p.x * C + 3, i, C - 6, 1);
    }
  }
  ctx.restore();
}

function drawShadows(snakeVisible) {
  ctx.save();
  ctx.fillStyle = '#223229';
  for (const b of blocks) ctx.fillRect(b.x * C + 7, b.y * C + 8, 23, 23);
  for (const f of food) {
    ctx.save();
    ctx.translate((f.x + 0.5) * C, (f.y + 0.5) * C);
    ctx.rotate(f.gold ? Math.PI / 4 : 0);
    ctx.fillStyle = '#25342b';
    ctx.fillRect(-2, -1, 18, 18);
    ctx.restore();
  }
  ctx.fillStyle = '#23342b';
  for (const e of enemies) {
    ctx.save();
    ctx.translate((e.x + 0.5) * C + 5, (e.y + 0.5) * C + 6);
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 13);
    ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (snakeVisible) {
    ctx.fillStyle = '#22332a';
    for (const part of snake)
      ctx.fillRect(part.x * C + 6, part.y * C + 8, 26, 26);
  }
  if (fx)
    for (const b of bullets) {
      ctx.save();
      ctx.translate(b.x * C, b.y * C);
      ctx.rotate(Math.atan2(b.dy, b.dx));
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-10, 0);
      ctx.lineTo(0, -10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  ctx.restore();
}

function drawBlocks() {
  for (const b of blocks) {
    ctx.fillStyle = '#bba1fa';
    ctx.fillRect(b.x * C + 2, b.y * C + 2, 22, 22);
    ctx.strokeStyle = '#161a16';
    ctx.strokeRect(b.x * C + 2, b.y * C + 2, 22, 22);
    ctx.fillStyle = '#705796';
    ctx.fillRect(b.x * C + 9, b.y * C + 9, 8, 8);
  }
}

function drawFood() {
  for (const f of food) {
    const pulse = fx ? Math.sin(demoTime * 5 + f.x) * 1.8 : 0;
    ctx.save();
    ctx.translate((f.x + 0.5) * C, (f.y + 0.5) * C);
    ctx.rotate(f.gold ? Math.PI / 4 : 0);
    ctx.fillStyle = f.gold ? '#ffcc61' : '#ff8bae';
    ctx.fillRect(-8 - pulse / 2, -8 - pulse / 2, 16 + pulse, 16 + pulse);
    ctx.fillStyle = '#fff2cf';
    ctx.fillRect(-4, -4, 4, 4);
    ctx.restore();
  }
}

function drawEnemies() {
  for (const e of enemies) {
    ctx.save();
    ctx.translate((e.x + 0.5) * C, (e.y + 0.5) * C);
    ctx.fillStyle = '#65c9ff';
    ctx.strokeStyle = '#102d57';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#102d57';
    ctx.fillRect(-6, -4, 4, 4);
    ctx.fillRect(2, -4, 4, 4);
    ctx.fillRect(-3, 4, 6, 2);
    ctx.restore();
  }
}

// Flat comic marks: hard outlines, broken rings and radial color accents.
function effectStar(x, y, radius, points = 4, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rotation + (i * Math.PI) / points;
    const r = radius * (i % 2 ? 0.28 : 1);
    const px = x + Math.cos(a) * r,
      py = y + Math.sin(a) * r;
    if (!i) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function diamondPath(radius) {
  ctx.moveTo(0, -radius);
  ctx.lineTo(radius, 0);
  ctx.lineTo(0, radius);
  ctx.lineTo(-radius, 0);
  ctx.closePath();
}

function diamondBand(outer, inner, color) {
  ctx.beginPath();
  diamondPath(outer);
  diamondPath(inner);
  ctx.fillStyle = color;
  ctx.fill('evenodd');
}

function drawRings() {
  if (!fx) return;
  for (const r of rings) {
    const progress = Math.max(0, Math.min(1, 1 - r.life / r.maxLife));
    const impact = r.kind === 'impact' || r.kind === 'bomb';
    const bomb = r.kind === 'bomb';
    // Fast opening, then a short settle; no translucent filled discs.
    const radius = 6 + (1 - (1 - progress) ** 3) * r.radius;
    ctx.save();
    ctx.globalAlpha = effectAlpha(r.life, r.maxLife);
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    ctx.translate(r.x, r.y);
    if (r.kind.startsWith('motion-')) {
      const extent = 14 + progress * r.radius;
      ctx.beginPath();
      if (r.kind === 'motion-square')
        ctx.rect(-extent, -extent, extent * 2, extent * 2);
      else diamondPath(extent + 2);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5 * (1 - progress * 0.5);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (impact && progress < 0.3) {
      effectStar(0, 0, (bomb ? 32 : 22) * (1 - progress / 0.3), 8);
      ctx.fillStyle = '#fff2cf';
      ctx.strokeStyle = '#20201f';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    if (bomb) {
      ctx.moveTo(0, -radius);
      ctx.lineTo(radius, 0);
      ctx.lineTo(0, radius);
      ctx.lineTo(-radius, 0);
      ctx.closePath();
    } else if (r.spikes) {
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12;
        const rad = radius * (i % 2 ? 0.82 : 1);
        if (!i) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
    } else {
      const gap = r.kind === 'pickup' ? 0.24 : 0.12;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + progress * 0.25;
        ctx.moveTo(
          Math.cos(angle + gap) * radius,
          Math.sin(angle + gap) * radius,
        );
        ctx.arc(0, 0, radius, angle + gap, angle + Math.PI / 2 - gap);
      }
    }
    const width = (bomb ? 13 : impact ? 10 : 6) * (1 - progress * 0.45);
    if (bomb) {
      // Separate annuli share one edge: red can never reappear inside orange.
      const outer = radius + width * 0.9;
      const shared = radius + width * 0.3;
      const inner = Math.max(2, radius - width * 0.9);
      diamondBand(outer, shared, '#ff6475');
      diamondBand(shared, inner, r.color);
      ctx.beginPath();
      diamondPath(outer);
      ctx.strokeStyle = '#20201f';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#20201f';
      ctx.lineWidth = width + 3;
      ctx.stroke();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    if (impact) {
      const count = bomb ? 12 : 8;
      for (let i = 0; i < count; i++) {
        const a = (i * Math.PI * 2) / count + (bomb ? Math.PI / 12 : 0);
        const inner = radius + 7;
        const outer = inner + (bomb ? 24 : 15) * (1 - progress);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.strokeStyle = '#20201f';
        ctx.lineWidth = width + 3;
        ctx.stroke();
        ctx.strokeStyle =
          i % 3 === 0 ? '#fff2cf' : bomb && i % 3 === 1 ? '#ff8bae' : r.color;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function snakePartColor(index) {
  if (index >= tailCutStart()) return '#b4e4be';
  return index === 0 ? '#e6ff92' : index % 3 === 0 ? '#bedb60' : '#d8fa65';
}

function drawSnake(snakeVisible) {
  snake.forEach((s, i) => {
    if (!snakeVisible) return;
    ctx.fillStyle = snakePartColor(i);
    ctx.fillRect(s.x * C + 1, s.y * C + 1, 25, 25);
    ctx.strokeStyle = '#1d291b';
    ctx.strokeRect(s.x * C + 1, s.y * C + 1, 25, 25);
    if (i === 0) {
      ctx.fillStyle = '#20251c';
      const eye = (x, y) => ctx.fillRect(s.x * C + x, s.y * C + y, 4, 5);
      if (dir.x) {
        eye(dir.x > 0 ? 17 : 6, 5);
        eye(dir.x > 0 ? 17 : 6, 17);
      } else {
        eye(5, dir.y > 0 ? 17 : 5);
        eye(17, dir.y > 0 ? 17 : 5);
      }
    }
  });
}

function drawBullets() {
  for (const b of bullets) {
    ctx.save();
    ctx.translate(b.x * C, b.y * C);
    ctx.rotate(Math.atan2(b.dy, b.dx));
    ctx.strokeStyle = '#bba1fa';
    ctx.lineWidth = 5;
    ctx.lineCap = 'butt';
    if (fx) {
      ctx.fillStyle = '#ff8bae';
      ctx.fillRect(-29, -4, 7, 3);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(-24, 2, 9, 3);
    }
    ctx.beginPath();
    ctx.moveTo(-21, 0);
    ctx.lineTo(-7, 0);
    ctx.stroke();
    ctx.fillStyle = '#fff6bf';
    ctx.strokeStyle = '#302446';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-7, 0);
    ctx.lineTo(0, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
}

function drawBombs() {
  for (const b of bombs) {
    const t = 1 - b.life / b.maxLife,
      x = (b.from.x + (b.to.x - b.from.x) * t + 0.5) * C,
      y =
        (b.from.y + (b.to.y - b.from.y) * t + 0.5) * C -
        Math.sin(t * Math.PI) * 38;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#5a2b15';
    ctx.lineWidth = 6;
    ctx.strokeRect(b.to.x * C + 2, b.to.y * C + 2, C - 4, C - 4);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.strokeRect(b.to.x * C + 2, b.to.y * C + 2, C - 4, C - 4);
    ctx.beginPath();
    ctx.moveTo(b.to.x * C + 8, (b.to.y + 0.5) * C);
    ctx.lineTo(b.to.x * C + 20, (b.to.y + 0.5) * C);
    ctx.moveTo((b.to.x + 0.5) * C, b.to.y * C + 8);
    ctx.lineTo((b.to.x + 0.5) * C, b.to.y * C + 20);
    ctx.stroke();
    if (fx) {
      ctx.strokeStyle = '#ffcf67';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - (b.to.x - b.from.x) * 5, y - (b.to.y - b.from.y) * 5 + 8);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.translate(x, y);
    ctx.fillStyle = '#263348';
    ctx.strokeStyle = '#fff2a1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-5, -6, 5, 5);
    ctx.strokeStyle = '#fff2a1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(5, -10);
    ctx.lineTo(7, -17);
    ctx.stroke();
    ctx.fillStyle = '#ffb454';
    ctx.fillRect(3, -21, 8, 8);
    ctx.restore();
  }
}

function drawParticles() {
  if (!fx) return;
  for (const p of particles) {
    const remaining = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = effectAlpha(p.life, p.maxLife);
    ctx.fillStyle = p.color;
    const size =
      p.size *
      (p.shape === 'debris'
        ? 0.7 + 0.3 * remaining
        : Math.min(1, remaining / 0.3));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle + (p.maxLife - p.life) * p.spin);
    ctx.strokeStyle = '#20201f';
    ctx.lineWidth = 1.5;
    if (p.shape === 'spark') {
      effectStar(0, 0, size, 4);
      ctx.fill();
      if (size > 5) {
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    } else {
      ctx.fillRect(-size / 2, -size / 2, size, size);
      if (size > 4) ctx.strokeRect(-size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }
}

function drawScoreTexts() {
  for (const t of texts) {
    ctx.globalAlpha = Math.min(1, t.life / 0.2);
    ctx.fillStyle = '#e4ff96';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawArenaStatus() {
  if (state === 'playing') {
    if (runMeta.cutter && snake.length > runBalance.cutterThreshold) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle =
        cutterCharge >= runBalance.cutterFoods ? '#e6ff92' : '#d0dbcd';
      ctx.fillText(
        cutterCharge >= runBalance.cutterFoods
          ? 'CUT READY'
          : 'CUT ' + cutterCharge + '/' + runBalance.cutterFoods,
        14,
        44,
      );
    }
    ctx.fillStyle = '#ff8bae';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('♥'.repeat(Math.max(0, hearts)), 14, 25);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#d0dbcd';
    ctx.font = '11px sans-serif';
    ctx.fillText(
      runMeta.bomb
        ? 'BOMB ' + (bombCD > 0 ? bombCD.toFixed(1) + 's' : 'READY')
        : '◎',
      W * C - 14,
      23,
    );
  }
}
