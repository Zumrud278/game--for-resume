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

// ── Title emblem: "Emerald" / "World" with transparent gold Baroque ornament ──
/** Tapered stroke through `pts` (width w0 → w1), round caps so it stays smooth. */
function taper(ctx, pts, w0, w1) {
  ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    ctx.lineWidth = w0 + ((w1 - w0) * i) / (pts.length - 1);
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
    ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
}
function spiralPts(cx, cy, r0, a0, turns, dir, n = 60, shrink = 0.82) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, a = a0 + dir * t * turns * Math.PI * 2, r = r0 * (1 - shrink * t);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
function bezierPts(p0, p1, p2, p3, n = 30) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}
function leaf(ctx, x, y, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

/** Paints a mask as bevelled gold: bright top edge, warm middle, dark underside. */
function paintGold(pc, set) {
  const W = pc.w;
  set.forEach((i) => {
    const x = i % W, y = (i / W) | 0;
    const up1 = set.has(i - W), up2 = set.has(i - 2 * W), dn1 = set.has(i + W);
    pc.set(x, y, !up1 ? GOLD.hi : !dn1 ? GOLD.dark : !up2 ? GOLD.light : !set.has(i - 1) ? GOLD.light : GOLD.mid);
  });
}

export function makeTitleEmblem(scene, key = 'menu_emblem') {
  if (scene.textures.exists(key)) return key;
  const FONT = 'bold 27px Georgia, "Times New Roman", serif';
  const l1 = glyphMask('Emerald', FONT);
  const l2 = glyphMask('World', FONT);
  const GAP = 5, SIDE = 44, CROWN = 28, SWASH = 16;
  const textW = Math.max(l1.tw, l2.tw);
  let W = textW + SIDE * 2;
  if (W % 2) W++;
  const H = CROWN + l1.th + GAP + l2.th + SWASH + 4;
  const pc = new PixelCanvas(W, H);
  const cx = W / 2;
  const tTop = CROWN, tBot = CROWN + l1.th + GAP + l2.th, tMid = (tTop + tBot) / 2;
  const tx0 = cx - textW / 2;                  // left edge of the lettering
  const band = CROWN - 6;                      // crown band (top row)

  // ── Left half of the ornament (mirrored for the right) + centre pieces ──
  const left = makeMask(W, H, (ctx) => {
    ctx.strokeStyle = '#fff';
    // Big C-scroll volute beside the title, curling inward
    const C = [tx0 - 19, tMid + 2];
    taper(ctx, spiralPts(C[0], C[1], 17, -Math.PI / 2 + 0.25, 1.12, -1), 4.2, 1.4);
    // its upper tail reaching in toward the lettering, ending in a small curl
    taper(ctx, bezierPts([C[0] + 4, C[1] - 17], [tx0 - 6, tTop - 6], [tx0 - 2, tTop - 5], [tx0 - 3, tTop + 1]), 3, 1.6);
    taper(ctx, spiralPts(tx0 - 6, tTop + 3, 3.4, -Math.PI / 2, 0.85, 1), 1.8, 1.2);
    // lower tail sweeping under the title, ending in a curl
    taper(ctx, bezierPts([C[0] + 2, C[1] + 17], [tx0 - 4, tBot + 8], [tx0 + 6, tBot + 6], [tx0 + 10, tBot + 1]), 3, 1.5);
    taper(ctx, spiralPts(tx0 + 8, tBot - 2, 3.4, Math.PI / 2, 0.85, -1), 1.8, 1.2);
    // acanthus leaves along the outside of the volute
    [[-2.5, 0.9], [-3.3, 1.2], [-1.9, 0.7]].forEach(([a, s]) => {
      leaf(ctx, C[0] + Math.cos(a) * 21, C[1] + Math.sin(a) * 21, 4.2 * s, 1.7 * s, a + Math.PI / 2);
    });
    // pearls trailing outward
    [[C[0] - 25, C[1] + 1, 1.7], [C[0] - 29, C[1] + 1, 1.2]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });

    // Crown: band, five points with balls, curls off both ends
    ctx.fillRect(cx - 15, band, 30, 4);
    [[-13, 8], [-6.5, 11], [0, 15], [6.5, 11], [13, 8]].forEach(([dx, h]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx - 3, band + 0.5); ctx.lineTo(cx + dx, band - h); ctx.lineTo(cx + dx + 3, band + 0.5);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + dx, band - h - 1, 1.7, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillRect(cx - 17, band + 4, 34, 2);                                       // lower rim
    taper(ctx, bezierPts([cx - 16, band + 3], [cx - 22, band + 1], [cx - 28, band + 2], [cx - 31, band + 6]), 2.6, 1.6);
    taper(ctx, spiralPts(cx - 31, band + 9, 3.2, -Math.PI / 2, 0.85, -1), 1.7, 1.1);

    // Swash under the title: tapered sweep out from the centre, curling up at the end
    taper(ctx, bezierPts([cx - 4, tBot + 9], [cx - 16, tBot + 15], [cx - 30, tBot + 13], [cx - 40, tBot + 7]), 2.8, 1.3);
    taper(ctx, spiralPts(cx - 41, tBot + 3, 3.3, Math.PI / 2, 0.85, 1), 1.6, 1.1);
  }, 100);
  const gold = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (left[y * W + x]) { gold.add(y * W + x); gold.add(y * W + (W - 1 - x)); }   // mirror
  }
  paintGold(pc, gold);
  pc.outlineMask(gold, '#2a0f3a');

  // Crown jewels: an emerald on the band, pearls on the points, gold beads
  drawGem(pc, GEM_SMALL, cx, band + 2);
  [[-13, 8], [-6.5, 11], [0, 15], [6.5, 11], [13, 8]].forEach(([dx, h]) => {
    const px = Math.round(cx + dx - 0.5), py = band - h - 2;
    pc.set(px, py, '#ffffff'); pc.set(px + 1, py, '#efe6ff'); pc.set(px, py + 1, '#e2d6ff'); pc.set(px + 1, py + 1, '#c9b8f0');
  });
  [-10, 10].forEach((dx) => { pc.set(cx + dx, band + 2, EMERALD.light); pc.set(cx + dx + (dx < 0 ? -1 : 1), band + 2, EMERALD.mid); });
  // small gem at the centre of the swash
  drawGem(pc, GEM_SMALL, cx, tBot + 9);

  // Lettering: gold, dark outline, deep drop shadow (stands out on the sky)
  paintTitle(pc, l1, Math.round(cx - l1.tw / 2), tTop);
  paintTitle(pc, l2, Math.round(cx - l2.tw / 2), tTop + l1.th + GAP);

  // four-point sparkles in the ornament
  [[tx0 - 34, tTop - 2], [W - 1 - (tx0 - 34), tBot - 4], [cx - 26, band - 9], [cx + 25, tBot + 14]].forEach(([x, y]) => pc.pattern(SPARK4, SPARK_PAL, Math.round(x) - 3, Math.round(y) - 3));

  pc.toTexture(scene, key);
  scene.textures.get(key).customData.emblem = { gemX: cx, gemY: band + 2 };
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

// ── Side cliffs: wide natural cliffs rising from the bottom clouds ──
// Warm brown-purple rock in layers (two families, so the strata alternate)
const ROCK_PURPLE = ['#2c1838', '#4c2c58', '#71436d', '#9a6078', '#c88a86'];
const ROCK_BROWN = ['#2f1b24', '#553142', '#7d4c55', '#a86c66', '#d49882'];

// Smooth value noise in [0, 1) (bilinear between hashed grid points)
function vnoise(x, y, cell, s) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(gx, gy, s), b = hash(gx + 1, gy, s), c = hash(gx, gy + 1, s), d = hash(gx + 1, gy + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const BUSH = ['#8fdc7f', '#4fb35a', '#2f7a3a'];
const LEAF = ['#7acb6e', '#3e9a4e', '#256b38'];
const PETALS = ['#ffb3d9', '#ffd1a8', '#d9b3ff', '#ffffff', '#b3e5ff', '#fff3a0'];

/**
 * A cliff anchored to the bottom of its texture (it stands in the clouds).
 *   o.w, o.h      texture size (px)       o.top    row of the grass line
 *   o.face        'right' | 'left'        which side faces the middle of the screen
 *   o.faceAt(r)   x of that face, r rows below the grass line (overhangs allowed)
 *   o.trees, o.shrubs, o.flowers   x positions on the top
 */
export function makeCliff(scene, key, o) {
  if (scene.textures.exists(key)) return key;
  const { w: W, h: H, top: T } = o;
  const seed = o.seed ?? 1;
  const right = o.face === 'right';
  const pc = new PixelCanvas(W, H);
  const solid = new Set();
  const put = (x, y, c) => { if (!pc.in(x, y)) return; pc.set(x, y, c); solid.add(y * W + x); };

  // Rock layers: varied thickness, each jutting out a little at the face
  const bands = [];
  for (let y = T + 3, j = 0; y < H; j++) {
    const th = 6 + Math.floor(hash(j, 1, seed) * 10);
    bands.push({ y0: y, th, jut: Math.round((hash(j, 2, seed) - 0.5) * 7), pal: hash(j, 3, seed) > 0.45 ? ROCK_BROWN : ROCK_PURPLE, tone: hash(j, 4, seed), j });
    y += th;
  }
  const bandAt = (y) => bands.find((b) => y < b.y0 + b.th) || bands[bands.length - 1];
  const faceX = (y) => {
    const b = y >= T + 3 ? bandAt(y) : bands[0];
    const rough = (vnoise(0, y, 5, seed + 4) - 0.5) * 6;            // ragged, not ruler-straight
    return Math.round(o.faceAt(y - T) + (right ? b.jut : -b.jut) + rough);
  };
  // rock relief: two octaves of smooth noise, read as bumps lit from the upper left
  const relief = (x, y) => vnoise(x, y, 7, seed + 10) * 0.65 + vnoise(x, y, 3.5, seed + 11) * 0.35;
  const topY = (x) => T + Math.round(Math.sin(x / 11 + seed) * 1.3 + (hash(x >> 2, 5, seed) - 0.5) * 2);
  const inside = (x, y) => y >= topY(x) && (right ? x <= faceX(y) : x >= faceX(y));

  // Rock
  for (let y = T; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y) || y < topY(x) + 3) continue;
    // which layer: boundaries wander up and down irregularly
    const wobble = (y2) => Math.round(Math.sin(x / 9 + bandAt(y2).j * 1.7) * 1.5 + (vnoise(x, bandAt(y2).j * 13, 8, seed + 3) - 0.5) * 4);
    let b = bandAt(y);
    let k = y - b.y0 - wobble(y);
    if (k < 0 && b.j > 0) { b = bands[b.j - 1]; k = y - b.y0 - wobble(b.y0); }
    let s = 2 + (b.tone > 0.62 ? 1 : b.tone < 0.25 ? -1 : 0);
    const h = relief(x, y);
    s += Math.round((relief(x - 1, y - 1) - relief(x + 1, y + 1)) * 6.5);   // lumpy rock surface
    const big = vnoise(x, y, 16, seed + 12);
    if (big > 0.68) s += 1; else if (big < 0.3) s -= 1;
    if (k <= 0 && hash(x, b.j, seed + 9) > 0.25) s += 1;     // lit lip along each layer
    if (k >= b.th - 1) s -= 1;                               // shadow under each ledge
    const d = right ? faceX(y) - x : x - faceX(y);           // distance from the face
    if (d < 2) s += right ? -1 : 1;                          // the face itself: shaded / lit
    if (d >= 2 && d < 5 && !right) s += 1;
    const n = hash(x, y, seed + 6);
    if (n > 0.97) s += 1; else if (n < 0.02) s -= 1;         // fine grain
    if (Math.abs(h - 0.5) < 0.007 && big < 0.6) s = Math.min(s, 1);                    // natural winding fissures
    let c = b.pal[Math.max(0, Math.min(4, s))];
    if (k === 0 && d < 7 && hash(x, b.j, seed + 8) > 0.45) c = d < 3 ? '#6fcf6a' : '#4fb35a';   // moss on ledges
    put(x, y, c);
  }

  // Grass cap, drooping over the face
  for (let x = 0; x < W; x++) {
    const t = topY(x);
    if (!inside(x, t)) continue;
    const d = right ? faceX(t) - x : x - faceX(t);
    const th = 5 + Math.floor(hash(x, 6, seed) * 3) + (d < 3 ? 2 : 0);
    for (let k2 = 0; k2 < th; k2++) put(x, t + k2, k2 === 0 ? '#9be08f' : k2 === 1 ? '#6fcf6a' : k2 < th - 2 ? '#4fb35a' : '#2f7a3a');
    if (hash(x, 7, seed) > 0.62) for (let k2 = 0; k2 < 1 + Math.floor(hash(x, 9, seed) * 3); k2++) put(x, t + th + k2, '#2f7a3a');
    if (hash(x, 8, seed) > 0.68) put(x, t - 1, '#7fd27a');
  }
  // the lip curls a few px past the face
  for (let k2 = 1; k2 <= 3; k2++) {
    const fx = faceX(T) + (right ? k2 : -k2);
    for (let y = topY(fx) + 1; y < topY(fx) + 6 - k2; y++) put(fx, y, y === topY(fx) + 1 ? '#6fcf6a' : '#3a9a50');
  }

  // Foliage
  const blob = (bx, by, r, pal) => {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy > r * r + r * 0.6) continue;
      const lit = -xx - yy, n = hash(bx + xx, by + yy, seed + 2);
      put(bx + xx, by + yy, lit > r * 0.6 ? pal[0] : lit < -r * 0.5 ? pal[2] : n > 0.86 ? pal[0] : pal[1]);
    }
  };
  (o.trees || []).forEach((tx, k) => {
    const gy = topY(tx), th = 11 + (k % 2) * 4;
    for (let k2 = 0; k2 < th; k2++) { put(tx, gy - k2, '#5e3a22'); put(tx + 1, gy - k2, '#8a5a33'); }
    put(tx - 1, gy, '#5e3a22'); put(tx + 2, gy, '#5e3a22');                       // roots
    const t = gy - th;
    blob(tx - 5, t + 2, 6, LEAF); blob(tx + 6, t + 2, 6, LEAF); blob(tx, t - 4, 7, LEAF); blob(tx + 2, t + 5, 5, LEAF);
  });
  (o.shrubs || []).forEach((sx, k) => {
    const gy = topY(sx);
    blob(sx - 3, gy - 2, 3, BUSH); blob(sx + 2, gy - 3, 4, BUSH); blob(sx + 6, gy - 1, 3, BUSH);
    put(sx + 1, gy - 6, PETALS[k % PETALS.length]); put(sx + 5, gy - 3, PETALS[(k + 2) % PETALS.length]);
  });
  (o.flowers || []).forEach((fx, k) => {
    const y = topY(fx) - 2, p = PETALS[k % PETALS.length];
    put(fx, y + 2, '#3d8a3d'); put(fx, y + 1, '#3d8a3d');
    [[0, -1], [-1, 0], [1, 0]].forEach(([dx, dy]) => put(fx + dx, y + dy, p));
    put(fx, y, '#ffe066');
  });

  pc.outlineMask(solid, '#1e1433');

  // Hanging vines: down the face from the grass lip, and from under any overhang
  for (let k = 0; k < o.vines; k++) {
    const vx = Math.floor(o.vineFrom + hash(k, 13, seed) * (o.vineTo - o.vineFrom));
    let y = topY(vx) + 4;
    while (y < H && solid.has(y * W + vx) && pc.in(vx, y + 1) && solid.has((y + 1) * W + vx) && y < topY(vx) + 8) y++;
    // under an overhang: start where the rock ends
    let yy = y;
    while (yy < H && solid.has(yy * W + vx)) yy++;
    if (yy < H - 20) y = yy;
    const len = 10 + Math.floor(hash(k, 14, seed) * o.vineLen);
    for (let i = 0; i < len && y < H; i++, y++) {
      const x = vx + Math.round(Math.sin(i * 0.45 + k) * 0.9);
      pc.set(x, y, '#2e6b35');
      if (i % 4 === 1) pc.set(x + 1, y, '#5fbf5a');
      if (i % 4 === 3) pc.set(x - 1, y, '#4aa64c');
    }
    if (hash(k, 15, seed) > 0.55) {
      const p = PETALS[k % 3];
      [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => pc.set(vx + dx, y + dy, p));
      pc.set(vx, y, '#fff3a0');
    }
  }

  pc.toTexture(scene, key);
  return key;
}
