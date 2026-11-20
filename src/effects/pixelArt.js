import Phaser from 'phaser';

/**
 * Pixel-art generators for the start screen: the "Emerald / World" title
 * emblem in its gold filigree frame, emerald gems and crystal clusters, the
 * decorated centre island, natural floating cliff islands, the crescent moon,
 * four-point sparkles and the Start button. Everything is
 * drawn pixel by pixel at low resolution and shown at a whole-number scale
 * with NEAREST filtering, so every art pixel stays a crisp square.
 */

// ── Palettes ──
const EMERALD = { out: '#0a3d2c', hi: '#e8fff4', light: '#7dffc8', mid: '#22c98a', dark: '#0e8a5a', deep: '#0b6644' };
const GOLD = { hi: '#fff4c2', light: '#ffd75e', mid: '#f0a830', dark: '#b8701c', deep: '#8a5a12', edge: '#f2c14e' };
const INK = '#1a0f2e';

const hexCache = new Map();
function rgb(hex) {
  let c = hexCache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache.set(hex, c);
  }
  return c;
}

// Deterministic hash noise in [0, 1)
function hash(x, y = 0, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  set(x, y, hex, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (!this.in(x, y)) return;
    const i = (y * this.w + x) * 4;
    const [r, g, b] = rgb(hex);
    this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = a;
  }

  alpha(x, y) { return this.in(x, y) ? this.data[(y * this.w + x) * 4 + 3] : 0; }

  pixel(x, y) {
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  /** Copies an image's pixels in at (dx, dy) — no resampling. */
  drawImage(img, dx = 0, dy = 0) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const s = (y * img.width + x) * 4;
        if (d[s + 3] === 0 || !this.in(x + dx, y + dy)) continue;
        const t = ((y + dy) * this.w + x + dx) * 4;
        this.data[t] = d[s]; this.data[t + 1] = d[s + 1]; this.data[t + 2] = d[s + 2]; this.data[t + 3] = d[s + 3];
      }
    }
  }

  /** Draws a character pattern (rows of palette letters, '.' = empty) with its top-left at (x, y). */
  pattern(rows, palette, x, y) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (palette[ch]) this.set(x + i, y + j, palette[ch]);
    }));
  }

  /** 1px outline in `hex` around every pixel in `mask` (a Set of indices), on empty or given cells only. */
  outlineMask(mask, hex, diagonal = false) {
    const out = new Set();
    const dirs = diagonal
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    mask.forEach((i) => {
      const x = i % this.w, y = (i / this.w) | 0;
      dirs.forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (!this.in(nx, ny)) return;
        const n = ny * this.w + nx;
        if (!mask.has(n)) out.add(n);
      });
    });
    out.forEach((n) => this.set(n % this.w, (n / this.w) | 0, hex));
    return out;
  }

  toTexture(scene, key) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, this.w, this.h);
    tex.getContext().putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return tex;
  }
}

/** Rasterises a canvas path into a hard-edged mask (Uint8Array, 1 = inside). */
function makeMask(w, h, draw, threshold = 120) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  draw(ctx);
  const d = ctx.getImageData(0, 0, w, h).data;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > threshold ? 1 : 0;
  return m;
}

// ── Faceted emerald gems ──
const GEM_PAL = { o: EMERALD.out, L: EMERALD.hi, l: EMERALD.light, g: EMERALD.mid, d: EMERALD.dark, D: EMERALD.deep };
export const GEM_LARGE = [
  '...ooooo...',
  '..oLllggo..',
  '.oLlllgggo.',
  'oLllgggggdo',
  'olllggggddo',
  'ogggggdddDo',
  '.oggdddDDo.',
  '..odddDDo..',
  '...ooooo...',
];
export const GEM_SMALL = [
  '..ooo..',
  '.oLlgo.',
  'oLlggdo',
  'olggddo',
  'ogddDDo',
  '.odDDo.',
  '..ooo..',
];

function drawGem(pc, rows, cx, cy) {
  pc.pattern(rows, GEM_PAL, cx - (rows[0].length >> 1), cy - (rows.length >> 1));
}

/** A tiny pixel star (twinkles in the sky). */
export function makePixelStar(scene, key = 'px_star') {
  if (scene.textures.exists(key)) return key;
  const pc = new PixelCanvas(5, 5);
  pc.set(2, 2, '#ffffff');
  [[1, 2], [3, 2], [2, 1], [2, 3]].forEach(([x, y]) => pc.set(x, y, '#e9dcff', 200));
  [[0, 2], [4, 2], [2, 0], [2, 4]].forEach(([x, y]) => pc.set(x, y, '#c9b3ff', 90));
  pc.toTexture(scene, key);
  return key;
}

// ── Crystal clusters (emerald, or pastel iridescent) ──
const IRIDESCENT = { out: '#3b2a6b', hi: '#ffffff', light: '#ffe0f7', mid: '#c9b3ff', dark: '#8fb8ff', deep: '#6a6fd0' };

/**
 * One crystal shard growing from (bx, by): `dir` 1 = up, -1 = hanging down.
 * Shaded light → mid → dark across its width, bright tip. Adds its pixels to `mask`.
 */
function shard(pc, mask, bx, by, w, h, lean = 0, dir = 1, pal = EMERALD) {
  const half = w / 2;
  for (let t = 0; t < h; t++) {
    const y = Math.round(by - dir * t);
    const cx = bx + (lean * t) / h;
    const hw = Math.min(half, (h - 1 - t) * 0.9 + 0.5);
    const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw) - 1;
    for (let x = x0; x <= Math.max(x0, x1); x++) {
      const u = x1 > x0 ? (x - x0) / (x1 - x0) : 0.5;
      const tip = t >= h - 2;
      pc.set(x, y, tip ? pal.hi : u < 0.34 ? pal.light : u < 0.7 ? pal.mid : pal.dark);
      if (pc.in(x, y)) mask.add(y * pc.w + x);
    }
  }
}

/** shards: [dx, w, h, lean, iridescent?] */
function cluster(pc, x, y, shards, dir = 1) {
  const mask = new Set();
  shards.forEach(([dx, w, h, lean, iri]) => shard(pc, mask, x + dx, y, w, h, lean, dir, iri ? IRIDESCENT : EMERALD));
  pc.outlineMask(mask, EMERALD.out);
  pc.set(x + shards[0][0] - 1, y - dir * Math.round(shards[0][2] * 0.55), '#ffffff');   // glint
}

// ── Gold filigree helpers ──
/** Strokes `draw` into a hard 1–2px line mask and paints it as bevelled gold (lit from above). */
function goldStroke(pc, draw) {
  const m = makeMask(pc.w, pc.h, (ctx) => { ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; draw(ctx); }, 90);
  const set = new Set();
  for (let i = 0; i < m.length; i++) if (m[i]) set.add(i);
  set.forEach((i) => {
    const x = i % pc.w, y = (i / pc.w) | 0;
    const up = set.has(i - pc.w), down = set.has(i + pc.w);
    pc.set(x, y, !up ? GOLD.hi : !down ? GOLD.dark : GOLD.light);
  });
  return set;
}

function spiralPath(ctx, cx, cy, r0, turns, start, dir = 1) {
  ctx.beginPath();
  const steps = 60;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const a = start + dir * t * turns * Math.PI * 2;
    const r = r0 * (1 - t * 0.8);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

// Four-point star sparkle
const SPARK4 = ['...a...', '...b...', '..bWb..', 'abWWWba', '..bWb..', '...b...', '...a...'];
const SPARK_PAL = { a: '#fff1b0', b: '#ffe27a', W: '#ffffff' };
export function makeSpark4(scene, key = 'px_spark4') {
  if (scene.textures.exists(key)) return key;
  const pc = new PixelCanvas(7, 7);
  pc.pattern(SPARK4, SPARK_PAL, 0, 0);
  pc.toTexture(scene, key);
  return key;
}

/** Bold serif title text → hard-edged pixel glyph mask, trimmed to its ink. */
function glyphMask(text, font) {
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + 6;
  const h = 40;
  const m = makeMask(w, h, (ctx) => { ctx.font = font; ctx.fillText(text, 3, 30); }, 110);
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { m, w, x0, y0, tw: x1 - x0 + 1, th: y1 - y0 + 1 };
}

function paintTitle(pc, g, ox, oy) {
  const set = new Set();
  for (let y = 0; y < g.th; y++) for (let x = 0; x < g.tw; x++) {
    if (g.m[(y + g.y0) * g.w + x + g.x0]) set.add((oy + y) * pc.w + ox + x);
  }
  set.forEach((i) => {                                              // drop shadow
    const x = i % pc.w, y = (i / pc.w) | 0;
    if (!set.has((y + 2) * pc.w + x + 1)) pc.set(x + 1, y + 2, '#160a28');
  });
  pc.outlineMask(set, '#2a0f3a', true);
  set.forEach((i) => {
    const x = i % pc.w, y = (i / pc.w) | 0;
    const f = (y - oy) / g.th;
    pc.set(x, y, f < 0.2 ? GOLD.hi : f < 0.48 ? GOLD.light : f < 0.76 ? GOLD.mid : GOLD.dark);
  });
}

// ── Title emblem: "Emerald" / "World" inside an open gold filigree frame ──
export function makeTitleEmblem(scene, key = 'menu_emblem') {
  if (scene.textures.exists(key)) return key;
  const FONT = 'bold 27px Georgia, "Times New Roman", serif';
  const l1 = glyphMask('Emerald', FONT);
  const l2 = glyphMask('World', FONT);
  const GAP = 5, PADX = 18, PADY = 9, FLOUR = 26, TOPA = 16, BOTA = 14;
  const innerW = Math.max(l1.tw, l2.tw);
  const W = innerW + PADX * 2 + FLOUR * 2;
  const H = l1.th + GAP + l2.th + PADY * 2 + TOPA + BOTA;
  const pc = new PixelCanvas(W, H);
  const x0 = FLOUR, x1 = W - FLOUR - 1, y0 = TOPA, y1 = H - BOTA - 1;
  const cx = Math.floor(W / 2), cy = Math.round((y0 + y1) / 2);
  const C = 9;                                   // inward corner size

  const gold = new Set();
  const add = (s) => s.forEach((i) => gold.add(i));
  // Outer frame: concave corners, peak on top, drop at the bottom, points on the sides
  add(goldStroke(pc, (ctx) => {
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x0 + C, y0);
    ctx.lineTo(cx - 12, y0); ctx.lineTo(cx, y0 - 9); ctx.lineTo(cx + 12, y0);
    ctx.lineTo(x1 - C, y0); ctx.quadraticCurveTo(x1 - C, y0 + C, x1, y0 + C);
    ctx.lineTo(x1, cy - 7); ctx.lineTo(x1 + 7, cy); ctx.lineTo(x1, cy + 7);
    ctx.lineTo(x1, y1 - C); ctx.quadraticCurveTo(x1 - C, y1 - C, x1 - C, y1);
    ctx.lineTo(cx + 12, y1); ctx.lineTo(cx, y1 + 9); ctx.lineTo(cx - 12, y1);
    ctx.lineTo(x0 + C, y1); ctx.quadraticCurveTo(x0 + C, y1 - C, x0, y1 - C);
    ctx.lineTo(x0, cy + 7); ctx.lineTo(x0 - 7, cy); ctx.lineTo(x0, cy - 7);
    ctx.lineTo(x0, y0 + C); ctx.quadraticCurveTo(x0 + C, y0 + C, x0 + C, y0);
    ctx.closePath();
    ctx.stroke();
  }));
  // Fine inner frame line
  add(goldStroke(pc, (ctx) => {
    ctx.lineWidth = 1.1;
    const i = 4;
    ctx.beginPath();
    ctx.moveTo(x0 + C + i, y0 + i); ctx.lineTo(x1 - C - i, y0 + i);
    ctx.quadraticCurveTo(x1 - C, y0 + C, x1 - i, y0 + C + i);
    ctx.lineTo(x1 - i, y1 - C - i); ctx.quadraticCurveTo(x1 - C, y1 - C, x1 - C - i, y1 - i);
    ctx.lineTo(x0 + C + i, y1 - i); ctx.quadraticCurveTo(x0 + C, y1 - C, x0 + i, y1 - C - i);
    ctx.lineTo(x0 + i, y0 + C + i); ctx.quadraticCurveTo(x0 + C, y0 + C, x0 + C + i, y0 + i);
    ctx.stroke();
  }));
  // Curling scrollwork on the four corners, outside the frame
  add(goldStroke(pc, (ctx) => {
    ctx.lineWidth = 1.6;
    [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]].forEach(([x, y, sx, sy]) => {
      spiralPath(ctx, x + sx * 3, y + sy * 3, 5, 0.9, Math.atan2(-sy, -sx), sx * sy);
    });
  }));
  // Side flourishes: twin S-curls running out of the side points, ending in beads
  add(goldStroke(pc, (ctx) => {
    ctx.lineWidth = 1.6;
    [[x0 - 7, -1], [x1 + 7, 1]].forEach(([px, s]) => {
      [-1, 1].forEach((v) => {
        ctx.beginPath();
        ctx.moveTo(px, cy);
        ctx.bezierCurveTo(px + s * 6, cy + v * 9, px + s * 12, cy - v * 2, px + s * 15, cy + v * 6);
        ctx.stroke();
        spiralPath(ctx, px + s * 15, cy + v * 9, 3.5, 0.85, Math.atan2(-v, 0), -s * v);
      });
      ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px + s * 9, cy); ctx.stroke();
      ctx.beginPath(); ctx.arc(px + s * 11, cy, 1.4, 0, Math.PI * 2); ctx.fill();
    });
  }));
  // Pointed top & bottom accents with little leaf curls
  add(goldStroke(pc, (ctx) => {
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx, y0 - 9); ctx.lineTo(cx, 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y1 + 9); ctx.lineTo(cx, H - 2); ctx.stroke();
    [-1, 1].forEach((s) => {
      spiralPath(ctx, cx + s * 6, y0 - 9, 3.5, 0.75, Math.PI / 2, -s);
      spiralPath(ctx, cx + s * 6, y1 + 9, 3.5, 0.75, -Math.PI / 2, s);
    });
  }));
  pc.outlineMask(gold, '#2a0f3a');

  // Two lines of lettering, centred
  const ty = y0 + PADY + 1;
  paintTitle(pc, l1, Math.round(cx - l1.tw / 2), ty);
  paintTitle(pc, l2, Math.round(cx - l2.tw / 2), ty + l1.th + GAP);

  // Gems on the accents, four-point sparkles around the frame
  drawGem(pc, GEM_LARGE, cx, y0 - 4);
  drawGem(pc, GEM_SMALL, cx, y1 + 4);
  [[x0 + 2, y0 - 9], [x1 - 2, y1 + 8], [x1 + 9, y0 + 2], [x0 - 10, y1 - 2]].forEach(([x, y]) => pc.pattern(SPARK4, SPARK_PAL, x - 3, y - 3));

  pc.toTexture(scene, key);
  scene.textures.get(key).customData.emblem = { gemX: cx, gemY: y0 - 4, frame: [x0, y0, x1, y1] };
  return key;
}

// ── Pixel-art Start button: purple pill, gold bevel, side scrollwork and gems, star + "Start" ──
export function makeStartButton(scene, key = 'menu_start') {
  if (scene.textures.exists(key)) return key;
  const W = 132, H = 38;
  const pc = new PixelCanvas(W, H);
  const bx0 = 16, bx1 = W - 17, by0 = 5, by1 = H - 6;
  const pill = makeMask(W, H, (ctx) => {
    const r = (by1 - by0) / 2;
    ctx.beginPath();
    ctx.moveTo(bx0 + r, by0); ctx.lineTo(bx1 - r, by0);
    ctx.arc(bx1 - r, by0 + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(bx0 + r, by1);
    ctx.arc(bx0 + r, by0 + r, r, Math.PI / 2, Math.PI * 1.5);
    ctx.fill();
  });
  const depth = new Uint8Array(W * H);
  let cur = pill.slice();
  for (let d = 1; d <= 4; d++) {
    const next = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (!cur[i]) continue;
      if (cur[i - 1] && cur[i + 1] && cur[i - W] && cur[i + W]) next[i] = 1; else depth[i] = d;
    }
    cur = next;
  }
  const body = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!pill[i]) continue;
    body.add(i);
    const d = depth[i] || 5;
    const f = (y - by0) / (by1 - by0);
    let c;
    if (d === 1) c = f < 0.5 ? GOLD.hi : GOLD.mid;
    else if (d === 2) c = f < 0.5 ? GOLD.light : GOLD.dark;
    else if (d === 3) c = '#2e1660';
    else c = f < 0.18 ? '#a374ec' : f < 0.5 ? '#7e48d0' : f < 0.8 ? '#6334b4' : '#4c2394';
    pc.set(x, y, c);
  }
  pc.outlineMask(body, '#1a0f2e');

  // Side scrollwork and gems
  const gold = goldStroke(pc, (ctx) => {
    ctx.lineWidth = 1.6;
    [[bx0, -1], [bx1, 1]].forEach(([ex, s]) => {
      [-1, 1].forEach((v) => {
        ctx.beginPath();
        ctx.moveTo(ex + s * 2, H / 2);
        ctx.bezierCurveTo(ex + s * 7, H / 2 + v * 4, ex + s * 9, H / 2 + v * 10, ex + s * 5, H / 2 + v * 13);
        ctx.stroke();
        spiralPath(ctx, ex + s * 7, H / 2 + v * 14, 2.8, 0.8, Math.PI, s * v);
      });
    });
  });
  pc.outlineMask(gold, '#1a0f2e');
  drawGem(pc, GEM_SMALL, bx0 + 1, H >> 1);
  drawGem(pc, GEM_SMALL, bx1 - 1, H >> 1);

  // Star icon
  const sx = 36, sy = H / 2;
  const star = makeMask(W, H, (ctx) => {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 2.6 : 6.2, a = -Math.PI / 2 + (k * Math.PI) / 5;
      const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r;
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }, 100);
  const starSet = new Set();
  for (let i = 0; i < star.length; i++) if (star[i]) starSet.add(i);
  starSet.forEach((i) => { const y = (i / W) | 0; pc.set(i % W, y, y < sy - 1 ? '#fff4a8' : y < sy + 2 ? '#ffd040' : '#f0a020'); });
  pc.outlineMask(starSet, '#5a3410');

  // "Start" in crisp white pixels
  const g = glyphMask('Start', 'bold 17px "Trebuchet MS", Verdana, Arial, sans-serif');
  const ox = Math.round((sx + 10 + bx1 - 8) / 2 - g.tw / 2), oy = Math.round(H / 2 - g.th / 2);
  const txt = new Set();
  for (let y = 0; y < g.th; y++) for (let x = 0; x < g.tw; x++) if (g.m[(y + g.y0) * g.w + x + g.x0]) txt.add((oy + y) * W + ox + x);
  txt.forEach((i) => { const x = i % W, y = (i / W) | 0; if (!txt.has((y + 1) * W + x)) pc.set(x, y + 1, '#2a1260'); });
  txt.forEach((i) => pc.set(i % W, (i / W) | 0, '#ffffff'));

  pc.toTexture(scene, key);
  return key;
}

// ── White crescent moon ──
export function makeMoon(scene, key = 'menu_moon') {
  if (scene.textures.exists(key)) return key;
  const S = 30;
  const disc = makeMask(S, S, (ctx) => { ctx.beginPath(); ctx.arc(14, 15, 13, 0, Math.PI * 2); ctx.fill(); });
  const bite = makeMask(S, S, (ctx) => { ctx.beginPath(); ctx.arc(21, 11, 12, 0, Math.PI * 2); ctx.fill(); });
  const pc = new PixelCanvas(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    if (!disc[i] || bite[i]) continue;
    const nearBite = bite[i + 1] || bite[i + 2] || bite[i - S];
    const crater = (x === 6 && y === 18) || (x === 7 && y === 18) || (x === 9 && y === 23) || (x === 5 && y === 12);
    pc.set(x, y, crater ? '#ddd6f3' : nearBite ? '#efeaff' : '#ffffff');
  }
  pc.toTexture(scene, key);
  return key;
}

// ── Centre island: the START island art with vines, wildflowers and crystal clusters ──
export const ISLAND_EXTRA = 30;     // rows added below the art for hanging vines
export function makeEmeraldIsland(scene, key = 'menu_island') {
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get('island').getSourceImage();
  const W = src.width, H = src.height + ISLAND_EXTRA;
  const pc = new PixelCanvas(W, H);
  pc.drawImage(src);

  const isGreen = (x, y) => {
    if (!pc.in(x, y) || pc.alpha(x, y) < 128) return false;
    const [r, g, b] = pc.pixel(x, y);
    return g > r + 10 && g > b;
  };
  const topAt = (x) => { for (let y = 0; y < src.height; y++) if (pc.alpha(x, y) > 128) return y; return -1; };
  const bottomAt = (x) => { for (let y = src.height - 1; y >= 0; y--) if (pc.alpha(x, y) > 128) return y; return -1; };

  // Hanging vines draping down the front and sides (some trail into the air)
  [8, 17, 27, 38, 50, 63, 77, 92, 121, 136, 150, 163, 176, 189, 199, 207].forEach((x, k) => {
    const t = topAt(x);
    if (t < 0) return;
    let y0 = t + 8;
    while (y0 < src.height && isGreen(x, y0)) y0++;          // start under the grass lip
    const edge = x < 30 || x > 185;
    const len = Math.min((edge ? 18 : 10) + Math.floor(hash(x, 3) * (edge ? 26 : 30)), bottomAt(x) - y0 + (edge ? 30 : 4));
    for (let i = 0; i < len; i++) {
      const y = y0 + i;
      const vx = x + Math.round(Math.sin(i * 0.42 + k) * 0.9);
      pc.set(vx, y, '#2e6b35');
      if (i % 4 === 1) pc.set(vx + 1, y, '#5fbf5a');
      if (i % 4 === 3) pc.set(vx - 1, y, '#4aa64c');
    }
    if (hash(x, 9) > 0.45) {                                   // a tiny pastel bloom at the end
      const fy = y0 + len, fx = x + Math.round(Math.sin(len * 0.42 + k) * 0.9);
      const petal = ['#ffb3d9', '#d9b3ff', '#ffd1a8'][k % 3];
      [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => pc.set(fx + dx, fy + dy, petal));
      pc.set(fx, fy, '#fff3a0');
    }
  });

  // Tiny wildflowers on the grass (kept clear of where she stands)
  [44, 58, 70, 82, 134, 146, 158, 170].forEach((x, k) => {
    const y = topAt(x) + 3 + Math.floor(hash(x, 5) * 4);
    if (!isGreen(x, y)) return;
    const petal = ['#ffb3d9', '#ffd1a8', '#d9b3ff', '#ffffff', '#b3e5ff'][k % 5];
    pc.set(x, y + 2, '#3d8a3d');
    [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => pc.set(x + dx, y + dy, petal));
    pc.set(x, y, '#ffe066');
  });

  // Glowing faceted crystal clusters on the left and right edges of the grass
  // (emerald shards mixed with pastel iridescent ones)
  const gl = topAt(24) + 7, gr = topAt(190) + 7;
  cluster(pc, 24, gl, [[0, 6, 18, -2], [6, 4, 11, 3, true], [-5, 4, 9, -3, true], [10, 3, 7, 4]]);
  cluster(pc, 190, gr, [[0, 6, 19, 2], [-6, 4, 12, -3, true], [5, 4, 9, 3, true], [-10, 3, 7, -4]]);

  pc.toTexture(scene, key);
  scene.textures.get(key).customData.island = { crystals: [{ x: 24, y: gl - 8 }, { x: 190, y: gr - 8 }], grassY: 39 };
  return key;
}

// ── Natural floating cliff islands (midground framing) ──
/**
 * A floating island drawn from scratch: an irregular grassy top with tufts,
 * bushes and small trees, hanging vines, and a rocky underside made of
 * rounded hanging rock columns (lit on their left), with moss on the faces.
 *   o.w      walkable width (px)      o.depth   longest column below the grass
 *   o.trees  x positions of trees     o.bushes  x positions of bushes
 *   o.moss   0..1 how mossy the rock faces are (more toward the right)
 */
export function makeFloatingIsland(scene, key, o) {
  if (scene.textures.exists(key)) return key;
  const seed = o.seed ?? 1;
  const M = 8, T = o.trees?.length ? 30 : 16;
  const W = o.w + M * 2, H = T + 10 + o.depth + 6;
  const pc = new PixelCanvas(W, H);
  const solid = new Set();
  const put = (x, y, c) => { if (!pc.in(x, y)) return; pc.set(x, y, c); solid.add(y * W + x); };

  // Grass surface line (gently uneven)
  const surf = [];
  for (let x = 0; x < W; x++) surf[x] = T + Math.round((hash(x >> 3, 1, seed) - 0.5) * 3 + Math.sin(x / 9 + seed) * 0.8);

  // Rock columns hanging under the grass
  // (palette matched to the centre island's rock: violet with warm peach light)
  const ROCK = ['#352048', '#5a3870', '#87538d', '#b47199', '#dc9c80'];
  let x = M;
  let prevLen = 0;
  while (x < M + o.w) {
    const cw = 7 + Math.floor(hash(x, 2, seed) * 6);
    const c0 = x, c1 = Math.min(M + o.w - 1, x + cw - 1);
    const u = ((c0 + c1) / 2 - M) / o.w;
    const prof = Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 1.7));
    let len = Math.max(5, Math.round(o.depth * prof * (0.72 + 0.4 * hash(x, 4, seed))));
    if (prevLen) len = Math.round(len * 0.65 + prevLen * 0.35);        // neighbours hang to similar depths
    prevLen = len;
    const mossLen = o.moss ? Math.round(len * o.moss * (0.4 + 0.9 * hash(x, 3, seed)) * (0.5 + u)) : 0;
    for (let cx = c0; cx <= c1; cx++) {
      const v = (cx - c0) / Math.max(1, c1 - c0);
      const top = surf[cx] + 2;
      const bottom = top + 2 + len - Math.round(Math.pow(2 * v - 1, 2) * Math.min(7, len / 2));
      const mossEnd = top + mossLen - Math.floor(hash(cx, 15, seed) * 4);
      for (let y = top; y <= bottom; y++) {
        const fy = (y - top) / (len + 2);
        const vv = v + Math.sin(y / 3.5 + c0) * 0.08;       // lumpy, wavy light edge
        let s = vv < 0.2 ? 3 : vv < 0.62 ? 2 : 1;           // rounded column: lit left, shaded right
        if (vv < 0.1 && fy < 0.55) s = 4;                    // warm rim light
        if (cx === c0 && c0 !== M) s = 0;                    // crevice between columns
        if (fy > 0.7) s -= 1;
        if ((y + c0 * 3) % 9 === 0 && hash(c0, y, seed + 4) > 0.45) s -= 1;   // cracks across the stone
        const n = hash(cx, y, seed + 6);
        if (n > 0.9) s += 1; else if (n < 0.08) s -= 1;      // grain
        if (y < top + 3) s = Math.min(s, 1);                 // shadow under the grass
        let col = ROCK[Math.max(0, Math.min(4, s))];
        // patchy moss draping down from the grass
        if (y < mossEnd && cx !== c0 && hash(cx >> 1, y >> 1, seed + 3) > 0.3) {
          col = vv < 0.3 ? '#6fcf6a' : vv < 0.75 ? (n > 0.6 ? '#5cc06a' : '#4fb35a') : '#2f7a3a';
        }
        put(cx, y, col);
      }
    }
    x = c1 + 1;
  }

  // Grass cap with a drooping lip and tufts
  for (let gx = M - 3; gx < M + o.w + 3; gx++) {
    const th = 5 + Math.floor(hash(gx, 6, seed) * 3);
    const edge = gx < M || gx >= M + o.w;
    const y0 = surf[gx] + (edge ? 2 : 0);
    for (let k = 0; k < th - (edge ? 2 : 0); k++) {
      put(gx, y0 + k, k === 0 ? '#9be08f' : k === 1 ? '#6fcf6a' : k < th - 2 ? '#4fb35a' : '#2f7a3a');
    }
    const drip = hash(gx, 7, seed);
    if (drip > 0.6) for (let k = 0; k < 1 + Math.floor(drip * 3); k++) put(gx, y0 + th + k, '#2f7a3a');
    if (hash(gx, 8, seed) > 0.7) put(gx, y0 - 1, '#7fd27a');           // tuft
  }

  // Bushes: clustered round leafy blobs, lit from the upper left
  const blob = (bx, by, r, pal) => {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy > r * r + r * 0.6) continue;
      const lit = -xx - yy;
      const n = hash(bx + xx, by + yy, seed + 2);
      put(bx + xx, by + yy, lit > r * 0.6 ? pal[0] : lit < -r * 0.5 ? pal[2] : n > 0.85 ? pal[0] : pal[1]);
    }
  };
  const BUSH = ['#8fdc7f', '#4fb35a', '#2f7a3a'];
  (o.bushes || []).forEach((bx, k) => {
    const gx = M + bx, gy = surf[gx];
    blob(gx - 3, gy - 2, 3, BUSH); blob(gx + 2, gy - 3, 4, BUSH); blob(gx + 6, gy - 1, 3, BUSH);
    if (k % 2 === 0) { put(gx + 1, gy - 5, '#ffb3d9'); put(gx + 5, gy - 2, '#ffffff'); }
  });
  // Small trees: trunk + three-blob canopy
  const LEAF = ['#7acb6e', '#3e9a4e', '#256b38'];
  (o.trees || []).forEach((tx, k) => {
    const gx = M + tx, gy = surf[gx];
    const th = 7 + (k % 2) * 3;
    for (let k2 = 0; k2 < th; k2++) { put(gx, gy - k2, '#6b4226'); put(gx + 1, gy - k2, '#8a5a33'); }
    const top = gy - th;
    blob(gx - 3, top + 1, 5, LEAF); blob(gx + 4, top + 1, 5, LEAF); blob(gx, top - 3, 6, LEAF);
  });

  // Hanging vines from the grass lip
  const vineSets = new Set();
  for (let k = 0; k < Math.round(o.w / 9); k++) {
    const vx = M + 2 + Math.floor(hash(k, 13, seed) * (o.w - 4));
    let y = surf[vx] + 5;
    const len = 6 + Math.floor(hash(k, 14, seed) * (o.depth * 0.45));
    for (let i = 0; i < len; i++, y++) {
      const xx = vx + Math.round(Math.sin(i * 0.5 + k) * 0.8);
      pc.set(xx, y, '#2e6b35');
      if (i % 3 === 1) pc.set(xx + 1, y, '#5fbf5a');
      vineSets.add(y * W + xx);
    }
  }

  pc.outlineMask(solid, '#1e1433');
  vineSets.forEach((i) => { if (!solid.has(i)) pc.set(i % W, (i / W) | 0, '#2e6b35'); });   // vines over the outline

  // mineral glints for twinkles
  const glints = [];
  for (let k = 0; k < 5; k++) {
    const gx = M + Math.floor(o.w * (0.2 + 0.6 * hash(k, 21, seed)));
    const gy = surf[gx] + 8 + Math.floor(o.depth * 0.4 * hash(k, 22, seed));
    if (solid.has(gy * W + gx)) { pc.set(gx, gy, '#c8fff0'); glints.push({ x: gx, y: gy }); }
  }

  pc.toTexture(scene, key);
  scene.textures.get(key).customData.island = { glints, grassY: T };
  return key;
}
