'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── Layout ──────────────────────────────────────────────────────────────────
const W    = 800;
const H    = 700;
const CELL = 50;
const COLS = 16;
// Rows 0 (top) → 13 (bottom)
const R_GOAL   = 0;
const R_RIVER_S = 1, R_RIVER_E = 5;
const R_BANK   = 6;
const R_ROAD_S  = 7, R_ROAD_E  = 12;
const R_START  = 13;

// Home pads: 5 positions aligned to grid columns
// col*50+25 → cx: 75, 225, 375, 525, 675
const HOME_DEFS = [1, 4, 7, 10, 13].map(col => ({ col, cx: col * CELL + CELL / 2 }));
const HOME_R    = 22; // draw radius

// ── Lane templates ───────────────────────────────────────────────────────────
const ROAD_LANES = [
  { row: 12, spd: 1.5, dir:  1, count: 3, w:  80, color: '#e74c3c' },
  { row: 11, spd: 2.0, dir: -1, count: 4, w:  65, color: '#3498db' },
  { row: 10, spd: 2.5, dir:  1, count: 3, w:  95, color: '#f39c12' },
  { row:  9, spd: 3.0, dir: -1, count: 4, w:  55, color: '#9b59b6' },
  { row:  8, spd: 1.2, dir:  1, count: 2, w: 130, color: '#e67e22' },
  { row:  7, spd: 3.5, dir: -1, count: 4, w:  55, color: '#1abc9c' },
];

const RIVER_LANES = [
  { row: 5, spd: 1.5, dir:  1, count: 3, w: 120 },
  { row: 4, spd: 2.0, dir: -1, count: 3, w: 150 },
  { row: 3, spd: 2.5, dir:  1, count: 4, w: 100 },
  { row: 2, spd: 1.0, dir: -1, count: 2, w: 180 },
  { row: 1, spd: 2.0, dir:  1, count: 3, w: 130 },
];

// ── State ────────────────────────────────────────────────────────────────────
let state = { highScore: 0 };

function initGame() {
  state = {
    highScore:  state.highScore,
    score:      0,
    lives:      3,
    level:      1,
    phase:      'playing', // 'playing' | 'dying' | 'levelclear' | 'gameover'
    homes:      HOME_DEFS.map(h => ({ ...h, filled: false })),
    frog:       null,
    cars:       [],
    logs:       [],
    deathTick:  0,
    clearTick:  0,
  };
  spawnFrog();
  buildObstacles(1);
}

function spawnFrog() {
  state.frog = {
    col:   7,
    row:   R_START,
    px:    7 * CELL + CELL / 2,   // pixel center X (drifts when riding a log)
    onLog: null,
    dead:  false,
  };
}

function buildObstacles(level) {
  const s = 1 + (level - 1) * 0.25; // speed multiplier per level
  state.cars = ROAD_LANES.flatMap(def => {
    const gap = W / def.count;
    return Array.from({ length: def.count }, (_, i) => {
      const x = def.dir === 1 ? i * gap : W - i * gap - def.w;
      return { x, y: def.row * CELL, w: def.w, h: CELL - 6, spd: def.spd * s, dir: def.dir, color: def.color, row: def.row };
    });
  });
  state.logs = RIVER_LANES.flatMap(def => {
    const gap = W / def.count;
    return Array.from({ length: def.count }, (_, i) => {
      const x = def.dir === 1 ? i * gap : W - i * gap - def.w;
      return { x, y: def.row * CELL, w: def.w, h: CELL - 4, spd: def.spd * s, dir: def.dir, row: def.row };
    });
  });
}

// ── Input ────────────────────────────────────────────────────────────────────
let lastKeyMs = 0;

const KEY_MAP = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
};

document.addEventListener('keydown', e => {
  if (KEY_MAP[e.key]) { e.preventDefault(); onMove(...KEY_MAP[e.key]); }
  if ((e.key === 'Enter' || e.key === ' ') && state.phase === 'gameover') {
    e.preventDefault(); initGame();
  }
});

['up', 'down', 'left', 'right'].forEach(dir => {
  const el = document.getElementById('btn-' + dir);
  if (!el) return;
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  const handler = e => { e.preventDefault(); onMove(...delta); };
  el.addEventListener('click', handler);
  el.addEventListener('touchstart', handler, { passive: false });
});

canvas.addEventListener('click', () => { if (state.phase === 'gameover') initGame(); });

function onMove(dc, dr) {
  const now = Date.now();
  if (now - lastKeyMs < 150) return;
  lastKeyMs = now;

  const { phase, frog } = state;
  if (phase !== 'playing' || frog.dead) return;

  const nc = frog.col + dc, nr = frog.row + dr;
  if (nc < 0 || nc >= COLS || nr < 0 || nr > R_START) return;

  frog.col   = nc;
  frog.row   = nr;
  frog.px    = nc * CELL + CELL / 2;
  frog.onLog = null;

  if (dr < 0) state.score += 10; // reward moving forward
  if (nr === R_GOAL) checkGoal();
}

function checkGoal() {
  const { frog, homes } = state;
  for (const home of homes) {
    if (Math.abs(frog.px - home.cx) < CELL / 2) {
      if (home.filled) { die(); return; }
      home.filled = true;
      state.score += 50;
      if (homes.every(h => h.filled)) {
        state.score += 200 * state.level;
        state.phase    = 'levelclear';
        state.clearTick = 100;
      } else {
        spawnFrog();
      }
      return;
    }
  }
  die(); // landed in water / outside pads
}

function die() {
  if (state.frog.dead) return;
  state.frog.dead = true;
  state.lives--;
  state.phase     = 'dying';
  state.deathTick = 70;
}

// ── Game loop ────────────────────────────────────────────────────────────────
let lastTs = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTs) / 16.67, 3); // frames at 60 fps base
  lastTs = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  // Obstacles move every phase
  for (const c of state.cars) {
    c.x += c.spd * c.dir * dt;
    if (c.dir === 1  && c.x > W)         c.x = -c.w;
    if (c.dir === -1 && c.x + c.w < 0)  c.x = W;
  }
  for (const l of state.logs) {
    l.x += l.spd * l.dir * dt;
    if (l.dir === 1  && l.x > W)         l.x = -l.w;
    if (l.dir === -1 && l.x + l.w < 0)  l.x = W;
  }

  if (state.phase === 'playing' && !state.frog.dead) {
    // Drift frog with log
    const { frog } = state;
    if (frog.onLog) {
      frog.px += frog.onLog.spd * frog.onLog.dir * dt;
      if (frog.px < 0 || frog.px > W) { die(); return; }
    }
    collide();
  }

  if (state.phase === 'dying') {
    state.deathTick -= dt;
    if (state.deathTick <= 0) {
      if (state.lives <= 0) {
        state.highScore = Math.max(state.highScore, state.score);
        state.phase = 'gameover';
      } else {
        spawnFrog();
        state.phase = 'playing';
      }
    }
  }

  if (state.phase === 'levelclear') {
    state.clearTick -= dt;
    if (state.clearTick <= 0) {
      state.level++;
      state.homes.forEach(h => (h.filled = false));
      spawnFrog();
      buildObstacles(state.level);
      state.phase = 'playing';
    }
  }

  updateHUD();
}

function collide() {
  const { frog } = state;
  const row = frog.row;
  const fx = frog.px;
  const fy = row * CELL + CELL / 2;
  const fr = CELL / 2 - 7; // collision radius

  // Car collision (road rows)
  if (row >= R_ROAD_S && row <= R_ROAD_E) {
    for (const c of state.cars) {
      if (c.row !== row) continue;
      const nx = Math.max(c.x, Math.min(fx, c.x + c.w));
      const ny = Math.max(c.y + 3, Math.min(fy, c.y + c.h + 3));
      const dx = fx - nx, dy = fy - ny;
      if (dx * dx + dy * dy < fr * fr) { die(); return; }
    }
  }

  // River – must ride a log
  if (row >= R_RIVER_S && row <= R_RIVER_E) {
    let riding = null;
    for (const l of state.logs) {
      if (l.row !== row) continue;
      if (fx >= l.x + 5 && fx <= l.x + l.w - 5) { riding = l; break; }
    }
    frog.onLog = riding;
    if (!riding) die();
  } else {
    frog.onLog = null;
  }
}

function updateHUD() {
  const $ = id => document.getElementById(id);
  if ($('score'))   $('score').textContent   = state.score;
  if ($('lives'))   $('lives').textContent   = '♥'.repeat(Math.max(0, state.lives));
  if ($('level'))   $('level').textContent   = state.level;
  if ($('hiscore')) $('hiscore').textContent = state.highScore;
}

// ── Rendering ────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'left'; // reset default
  drawBackground();
  drawHomes();
  drawLogs();
  drawCars();
  drawFrog();
  drawOverlays();
}

function drawBackground() {
  // Goal bank (top)
  ctx.fillStyle = '#2d5a1b';
  ctx.fillRect(0, 0, W, CELL);

  // River
  ctx.fillStyle = '#0e5c8a';
  ctx.fillRect(0, R_RIVER_S * CELL, W, 5 * CELL);

  // Subtle wave lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 2;
  for (let r = R_RIVER_S; r <= R_RIVER_E; r++) {
    ctx.beginPath();
    for (let x = 0; x < W; x += 40) {
      ctx.moveTo(x, r * CELL + 32);
      ctx.bezierCurveTo(x + 10, r * CELL + 26, x + 20, r * CELL + 38, x + 40, r * CELL + 32);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Safe bank (median)
  ctx.fillStyle = '#3a7d44';
  ctx.fillRect(0, R_BANK * CELL, W, CELL);

  // Road
  ctx.fillStyle = '#383838';
  ctx.fillRect(0, R_ROAD_S * CELL, W, 6 * CELL);

  // Lane dashes
  ctx.save();
  ctx.setLineDash([28, 18]);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  for (let r = R_ROAD_S + 1; r <= R_ROAD_E; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(W, r * CELL);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // Road edge lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,200,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, R_ROAD_S * CELL);     ctx.lineTo(W, R_ROAD_S * CELL);
  ctx.moveTo(0, (R_ROAD_E + 1) * CELL); ctx.lineTo(W, (R_ROAD_E + 1) * CELL);
  ctx.stroke();
  ctx.restore();

  // Start zone
  ctx.fillStyle = '#3a7d44';
  ctx.fillRect(0, R_START * CELL, W, CELL);
}

function drawHomes() {
  state.homes.forEach(({ cx, filled }) => {
    const y = CELL / 2;

    // Pad body
    ctx.fillStyle = filled ? '#2ecc71' : '#0d4a22';
    ctx.beginPath();
    ctx.arc(cx, y, HOME_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#196f3d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Lily-pad notch
    ctx.fillStyle = '#0e5c8a';
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.arc(cx, y, HOME_R - 1, -0.4, 0.4);
    ctx.closePath();
    ctx.fill();

    if (filled) {
      // Mini frog on the pad
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(cx, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx - 4, y - 4, 3, 0, Math.PI * 2);
      ctx.arc(cx + 4, y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawLogs() {
  state.logs.forEach(({ x, y, w, h }) => {
    ctx.fillStyle = '#8B4513';
    rrect(x, y + 2, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#6B3410';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Grain lines
    ctx.beginPath();
    if (w > 30)  { ctx.moveTo(x + 15, y + 2); ctx.lineTo(x + 15, y + h + 2); }
    if (w > 60)  { ctx.moveTo(x + w - 15, y + 2); ctx.lineTo(x + w - 15, y + h + 2); }
    ctx.stroke();
  });
}

function drawCars() {
  state.cars.forEach(({ x, y, w, h, color, dir }) => {
    // Body
    ctx.fillStyle = color;
    rrect(x, y + 3, w, h, 7);
    ctx.fill();

    // Roof (darker shade)
    ctx.fillStyle = darken(color, 40);
    const ri = w > 90 ? 0.25 : 0.20;
    rrect(x + w * ri, y + 5, w * (1 - 2 * ri), h * 0.45, 4);
    ctx.fill();

    // Windscreen
    ctx.fillStyle = 'rgba(180,220,255,0.65)';
    ctx.fillRect(x + w * 0.26, y + 6, w * 0.48, h * 0.32);

    // Head / tail lights
    const lx = dir === 1 ? x + w - 9 : x + 3;
    ctx.fillStyle = '#ffffaa';
    ctx.fillRect(lx, y + h * 0.35 + 3, 6, 9);
    const tx = dir === 1 ? x + 3 : x + w - 9;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(tx, y + h * 0.35 + 3, 6, 9);
  });
}

function drawFrog() {
  const { frog } = state;
  if (!frog) return;

  const x = frog.px;
  const y = frog.row * CELL + CELL / 2;
  const r = CELL / 2 - 7;

  ctx.save();

  if (frog.dead) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const s = r * 0.38;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + r + 2, r * 0.75, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2d8a30';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Eyes
  const eo = r * 0.42, er = r * 0.27;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - eo, y - eo * 0.55, er, 0, Math.PI * 2);
  ctx.arc(x + eo, y - eo * 0.55, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(x - eo + 1, y - eo * 0.55, er * 0.55, 0, Math.PI * 2);
  ctx.arc(x + eo + 1, y - eo * 0.55, er * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#2d8a30';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.18, r * 0.3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Front legs
  ctx.strokeStyle = '#3a8a3e';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r,     y + r * 0.15); ctx.lineTo(x - r - 6, y + r * 0.6);
  ctx.moveTo(x + r,     y + r * 0.15); ctx.lineTo(x + r + 6, y + r * 0.6);
  ctx.stroke();

  ctx.restore();
}

function drawOverlays() {
  const { phase, score, level, highScore, deathTick, clearTick } = state;

  // Death flash
  if (phase === 'dying' && deathTick > 0) {
    ctx.fillStyle = `rgba(200,0,0,${0.28 * (deathTick / 70)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Level clear banner
  if (phase === 'levelclear') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL CLEAR!', W / 2, H / 2 - 20);
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '22px monospace';
    ctx.fillText(`Level ${level} complete  +${200 * level} pts`, W / 2, H / 2 + 28);
  }

  // Game over screen
  if (phase === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 56px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 42);
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '22px monospace';
    ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 8);
    ctx.fillText(`High Score: ${highScore}`, W / 2, H / 2 + 44);
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#f39c12';
      ctx.font = '18px monospace';
      ctx.fillText('Press ENTER or tap to play again', W / 2, H / 2 + 90);
    }
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x,     y + r);  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function darken(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = v => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) - amt);
  const g = clamp(((n >> 8) & 0xff) - amt);
  const b = clamp((n & 0xff) - amt);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── Start ────────────────────────────────────────────────────────────────────
initGame();
requestAnimationFrame(loop);
