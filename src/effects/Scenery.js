import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WORLD_HEIGHT } from '../utils/constants.js';

/**
 * Environment depth & atmosphere, inspired by a glowing mushroom forest and
 * painted in the game's existing purple / pink palette. Purely visual — no
 * physics, no gameplay, no map coordinates are touched.
 *
 *   depth  layer
 *   -23.5  horizon glow (soft, edgeless)     (pinned, moves with far hills)
 *   -23    far hills + tall mushroom shapes  (parallax x 0.10, y 0.06)
 *   -21    mid forest, glowing mushrooms     (parallax x 0.20, y 0.12)
 *   -16    near forest, brighter mushrooms   (parallax x 0.35, y 0.20)
 *   -14    soft light shafts from above      (pinned, breathing)
 *    -6    glow under every island & rock    (world)
 *    -4    floating glowing spores           (world, along the route)
 *    24    vignette                          (pinned)
 *    26    foreground ferns & mushrooms      (pinned to screen bottom, x 1.25)
 *
 * The existing sky, stars and clouds (ParallaxBackground) sit at -30…-15 and
 * are left exactly as they were; these layers slot in between them.
 *
 * All textures are generated once on a canvas and tile seamlessly, so the
 * scenery is continuous across the whole world.
 */

const TILE_W = 1024;

// Palette (matches COLORS / the islands' purples and pinks)
const P = {
  far: { hill: '#7a55ae', rim: '#c3a0ea', stem: '#8c68bf', cap: '#9c74d2', glow: 'rgba(240,180,255,0.9)', tree: '#6c4aa0' },
  mid: { hill: '#4f2f86', rim: '#a27ddb', stem: '#6a4aa3', cap: '#c472d2', glow: 'rgba(255,150,225,0.95)', spot: '#ffd8f3', tree: '#432873' },
  near: { hill: '#30195a', rim: '#7e5cc2', stem: '#4a2f80', cap: '#e47cc9', glow: 'rgba(255,140,215,1)', spot: '#ffe3f6', tree: '#281548' },
  fore: { base: '#140a2a', leaf: '#1d1038', cap: '#ff86d2', glow: 'rgba(255,140,215,1)' },
};

export class Scenery {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ x:number, surfaceY:number, width:number }[]} platforms  islands, rocks, rainbow island
   */
  constructor(scene, platforms) {
    this.scene = scene;
    makeTextures(scene);

    // ── Parallax forest layers (pinned TileSprites, scrolled in update) ──
    // y0 = top of the strip on screen when the camera is at the ground row
    this.layers = [
      // (each strip has headroom above its ridge so the tallest caps + glow aren't clipped)
      { key: 'scn_far', depth: -23, fx: 0.10, fy: 0.06, y0: 221 },
      { key: 'scn_mid', depth: -21, fx: 0.20, fy: 0.12, y0: 337 },
      { key: 'scn_near', depth: -16, fx: 0.35, fy: 0.20, y0: 430 },
    ].map((l) => {
      const h = scene.textures.get(l.key).getSourceImage().height;
      l.sprite = scene.add.tileSprite(0, l.y0, GAME_WIDTH, h, l.key).setOrigin(0, 0).setScrollFactor(0).setDepth(l.depth);
      return l;
    });

    // ── Horizon glow behind the far hills ──
    // One soft bell-shaped glow across the whole screen (no tiling, no hard
    // edges) — fades smoothly to nothing above and below
    this.horizon = scene.add
      .image(0, 0, 'scn_band')
      .setOrigin(0, 0.5)
      .setDisplaySize(GAME_WIDTH, 380)
      .setScrollFactor(0)
      .setDepth(-23.5)
      .setBlendMode(Phaser.BlendModes.ADD);

    // ── Soft light shafts from above (x as a fraction of the view width) ──
    this.shafts = [[0.14, 0.07], [0.485, 0.05], [0.83, 0.065]].map(([fx, a], i) => {
      const s = scene.add
        .image(fx * GAME_WIDTH, -60, 'scn_shaft')
        .setOrigin(0.5, 0)
        .setRotation(0.32)
        .setScrollFactor(0)
        .setDepth(-14)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(a);
      scene.tweens.add({ targets: s, alpha: a * 0.45, duration: 4200 + i * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return { s, fx };
    });

    // ── Gentle glow under every island / rock (atmospheric lighting) ──
    const rnd = new Phaser.Math.RandomDataGenerator(['scenery']);
    platforms.forEach((pl, i) => {
      const g = scene.add
        .image(pl.x, pl.surfaceY + 40, 'scn_soft')
        .setDepth(-6)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(i % 2 ? 0xc9a0dc : 0xff9de0)
        .setScale((pl.width * 1.7) / 256, (pl.width * 1.1) / 256)
        .setAlpha(0.2);
      scene.tweens.add({ targets: g, alpha: 0.11, duration: rnd.between(2600, 3800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ── Floating glowing spores along the whole route ──
    const sorted = [...platforms].sort((a, b) => a.x - b.x);
    const routeY = (x) => {
      let a = sorted[0];
      let b = sorted[sorted.length - 1];
      for (let k = 0; k < sorted.length - 1; k++) {
        if (x >= sorted[k].x && x <= sorted[k + 1].x) { a = sorted[k]; b = sorted[k + 1]; break; }
      }
      const t = b.x === a.x ? 0 : Phaser.Math.Clamp((x - a.x) / (b.x - a.x), 0, 1);
      return Phaser.Math.Linear(a.surfaceY, b.surfaceY, t);
    };
    const tints = [0xff9de0, 0xc9a0dc, 0xffe9a8, 0xb8d8ff];
    const minX = sorted[0].x - 300;
    const maxX = sorted[sorted.length - 1].x + 400;
    const count = Math.round((maxX - minX) / 38);
    for (let i = 0; i < count; i++) {
      const x = rnd.between(minX, maxX);
      const y = routeY(x) - rnd.between(-180, 640);
      const s = scene.add
        .image(x, y, 'scn_spore')
        .setDepth(-4)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(tints[i % tints.length])
        .setScale(rnd.realInRange(0.25, 0.6))
        .setAlpha(0.3);
      scene.tweens.add({ targets: s, y: y - rnd.between(18, 40), x: x + rnd.between(-14, 14), duration: rnd.between(3200, 6200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rnd.between(0, 3000) });
      scene.tweens.add({ targets: s, alpha: { from: 0.25, to: 0.9 }, duration: rnd.between(1400, 2800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rnd.between(0, 2000) });
    }

    // ── Vignette ──
    this.vignette = scene.add.image(0, 0, 'scn_vignette').setOrigin(0, 0).setScrollFactor(0).setDepth(24);

    // ── Foreground ferns & small glowing mushrooms along the screen bottom ──
    const fh = scene.textures.get('scn_fore').getSourceImage().height;
    this.foreH = fh;
    this.fore = scene.add
      .tileSprite(0, GAME_HEIGHT - fh, GAME_WIDTH, fh, 'scn_fore')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(26);

    this.update(scene.cameras.main.scrollX, scene.cameras.main.scrollY);
  }

  // Fit the screen-pinned layers to the current view size. The canvas fills
  // the whole browser window (Scale.EXPAND), so the view can be wider or
  // taller than 1280×720; layers stay bottom-anchored and full-width.
  fit(w, h) {
    if (w === this.viewW && h === this.viewH) return;
    this.viewW = w;
    this.viewH = h;
    this.layers.forEach((l) => l.sprite.setSize(w, l.sprite.height));
    this.horizon.setDisplaySize(w, 380);
    this.shafts.forEach(({ s, fx }) => { s.x = fx * w; });
    this.vignette.setDisplaySize(w, h);
    this.fore.setSize(w, this.foreH);
    this.fore.y = h - this.foreH;
  }

  /** Called every frame with the camera scroll. */
  update(scrollX, scrollY) {
    const cam = this.scene.cameras.main;
    this.fit(cam.width, cam.height);
    const below = this.viewH - GAME_HEIGHT;            // extra view height below the 720 design
    const climbed = WORLD_HEIGHT - this.viewH - scrollY; // 0 at the ground row, grows as she climbs
    this.layers.forEach((l) => {
      l.sprite.tilePositionX = scrollX * l.fx;
      l.sprite.y = below + l.y0 + climbed * l.fy;      // the forest sinks as she rises above it
    });
    const far = this.layers[0].sprite;
    this.horizon.y = far.y + 110;          // centred just above the far ridgeline

    // Foreground plants only while she's down at forest level
    this.fore.tilePositionX = scrollX * 1.25;
    this.fore.setAlpha(Phaser.Math.Clamp((scrollY - 2050) / 500, 0, 1) * 0.95);
  }
}

// ───────────────────────── texture generation ─────────────────────────

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h);
  draw(t.getContext(), w, h);
  t.refresh();
}

// Seamless ridge: sum of sines whose periods divide the tile width
function ridgeFn(H, base, waves) {
  return (x) => H * base + waves.reduce((s, [amp, k, ph]) => s + amp * Math.sin((x / TILE_W) * Math.PI * 2 * k + ph), 0);
}

function fillRidge(ctx, H, ridge, color, rim) {
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= TILE_W; x += 4) ctx.lineTo(x, ridge(x));
  ctx.lineTo(TILE_W, H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  // rim light along the top edge
  ctx.beginPath();
  for (let x = 0; x <= TILE_W; x += 4) (x ? ctx.lineTo : ctx.moveTo).call(ctx, x, ridge(x) + 1);
  ctx.strokeStyle = rim;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Draw `fn(x)` at x and its wrapped copies so the tile edges match
function wrapped(x, fn) {
  fn(x); fn(x - TILE_W); fn(x + TILE_W);
}

function mushroom(ctx, x, ground, s, c, glow, spots) {
  const stemW = s * 0.26;
  const capY = ground - s * 0.88;
  // stem (slightly curved)
  ctx.fillStyle = c.stem;
  ctx.beginPath();
  ctx.moveTo(x - stemW / 2, ground + 2);
  ctx.quadraticCurveTo(x - stemW * 0.35, capY + s * 0.3, x - stemW * 0.42, capY);
  ctx.lineTo(x + stemW * 0.42, capY);
  ctx.quadraticCurveTo(x + stemW * 0.4, capY + s * 0.3, x + stemW / 2, ground + 2);
  ctx.closePath();
  ctx.fill();
  // glowing cap
  ctx.save();
  ctx.shadowColor = c.glow;
  ctx.shadowBlur = glow;
  ctx.fillStyle = c.cap;
  ctx.beginPath();
  ctx.ellipse(x, capY, s * 0.6, s * 0.4, 0, Math.PI, 0);
  ctx.quadraticCurveTo(x, capY + s * 0.12, x - s * 0.6, capY);
  ctx.fill();
  ctx.restore();
  // soft highlight + spots
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.18, capY - s * 0.2, s * 0.22, s * 0.1, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (spots) {
    ctx.fillStyle = spots;
    [[-0.3, -0.1, 0.06], [0.15, -0.24, 0.05], [0.35, -0.06, 0.045], [-0.05, -0.3, 0.035]].forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(x + dx * s, capY + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function tree(ctx, x, ground, s, color, rim) {
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.05, ground - s * 0.7, s * 0.1, s * 0.72);
  [[0, -0.95, 0.38], [-0.26, -0.72, 0.3], [0.27, -0.74, 0.3]].forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(x + dx * s, ground + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = rim;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, ground - 0.95 * s, 0.38 * s, Math.PI * 1.1, Math.PI * 1.75);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function forestStrip(scene, key, H, base, waves, c, items, seed) {
  canvasTex(scene, key, TILE_W, H, (ctx) => {
    const ridge = ridgeFn(H, base, waves);
    const rnd = new Phaser.Math.RandomDataGenerator([seed]);
    // trees first (behind), then mushrooms
    for (let i = 0; i < items.trees; i++) {
      const x = rnd.between(0, TILE_W);
      const s = rnd.between(items.treeSize[0], items.treeSize[1]);
      wrapped(x, (xx) => tree(ctx, xx, ridge(((xx % TILE_W) + TILE_W) % TILE_W) + 6, s, c.tree, c.rim));
    }
    fillRidge(ctx, H, ridge, c.hill, c.rim);
    for (let i = 0; i < items.mushrooms; i++) {
      const x = rnd.between(0, TILE_W);
      const s = rnd.between(items.mushSize[0], items.mushSize[1]);
      wrapped(x, (xx) => mushroom(ctx, xx, ridge(((xx % TILE_W) + TILE_W) % TILE_W) + 4, s, c, items.glow, c.spot));
    }
  });
}

function makeTextures(scene) {
  // Far: soft hills with a few tall, hazy mushroom shapes
  forestStrip(scene, 'scn_far', 520, 0.42, [[22, 1, 0.4], [14, 3, 1.3], [7, 7, 2.1]], P.far,
    { trees: 10, treeSize: [40, 70], mushrooms: 6, mushSize: [70, 115], glow: 14 }, 'far');
  // Mid: rolling forest, glowing mushrooms and round trees
  forestStrip(scene, 'scn_mid', 400, 0.44, [[18, 2, 0.9], [10, 5, 2.5], [5, 11, 0.2]], P.mid,
    { trees: 16, treeSize: [34, 60], mushrooms: 13, mushSize: [38, 84], glow: 18 }, 'mid');
  // Near: darker, brighter glowing caps
  forestStrip(scene, 'scn_near', 320, 0.48, [[14, 2, 2.2], [9, 4, 0.6], [4, 9, 1.7]], P.near,
    { trees: 9, treeSize: [44, 72], mushrooms: 11, mushSize: [34, 70], glow: 22 }, 'near');

  // Foreground: dark ferns / grass / small glowing mushrooms along the bottom
  canvasTex(scene, 'scn_fore', TILE_W, 150, (ctx, W, H) => {
    const rnd = new Phaser.Math.RandomDataGenerator(['fore']);
    const ground = (x) => H - 18 + 6 * Math.sin((x / W) * Math.PI * 2 * 3) + 4 * Math.sin((x / W) * Math.PI * 2 * 7 + 1);
    ctx.fillStyle = P.fore.base;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) ctx.lineTo(x, ground(x));
    ctx.lineTo(W, H);
    ctx.fill();
    // grass blades & fern fronds
    ctx.fillStyle = P.fore.leaf;
    for (let i = 0; i < 70; i++) {
      const x = rnd.between(0, W);
      const h = rnd.between(14, i % 9 === 0 ? 70 : 34);
      const lean = rnd.realInRange(-0.4, 0.4) * h;
      wrapped(x, (xx) => {
        const g = ground(((xx % W) + W) % W) + 2;
        ctx.beginPath();
        ctx.moveTo(xx - 4, g);
        ctx.quadraticCurveTo(xx + lean * 0.3, g - h * 0.6, xx + lean, g - h);
        ctx.quadraticCurveTo(xx + lean * 0.3 + 3, g - h * 0.5, xx + 4, g);
        ctx.fill();
      });
    }
    // a few small glowing mushrooms
    for (let i = 0; i < 6; i++) {
      const x = rnd.between(0, W);
      const s = rnd.between(22, 40);
      wrapped(x, (xx) => mushroom(ctx, xx, ground(((xx % W) + W) % W) + 2, s, { stem: '#241444', cap: P.fore.cap, glow: P.fore.glow }, 16, '#ffd8f3'));
    }
  });

  // Horizon glow: a Gaussian (bell-shaped) vertical profile, so it has no
  // edges at all; 4px wide, stretched across the screen (uniform per row)
  canvasTex(scene, 'scn_band', 4, 380, (ctx, W, H) => {
    for (let y = 0; y < H; y++) {
      const t = (y / (H - 1) - 0.5) / 0.2;
      const a = 0.42 * Math.exp(-t * t);
      ctx.fillStyle = `rgba(255,175,222,${a.toFixed(4)})`;
      ctx.fillRect(0, y, W, 1);
    }
  });

  // Light shaft (soft edges, fades downward)
  canvasTex(scene, 'scn_shaft', 180, 900, (ctx, W, H) => {
    const gx = ctx.createLinearGradient(0, 0, W, 0);
    gx.addColorStop(0, 'rgba(255,230,250,0)');
    gx.addColorStop(0.5, 'rgba(255,230,250,1)');
    gx.addColorStop(1, 'rgba(255,230,250,0)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-in';
    const gy = ctx.createLinearGradient(0, 0, 0, H);
    gy.addColorStop(0, 'rgba(0,0,0,1)');
    gy.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, W, H);
  });

  // Soft round glow (island glow) and spore
  canvasTex(scene, 'scn_soft', 256, 256, (ctx, W) => radial(ctx, W, [[0, 'rgba(255,255,255,0.9)'], [0.45, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]));
  canvasTex(scene, 'scn_spore', 32, 32, (ctx, W) => radial(ctx, W, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]));

  // Vignette (screen-sized)
  canvasTex(scene, 'scn_vignette', GAME_WIDTH, GAME_HEIGHT, (ctx, W, H) => {
    const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.45, W / 2, H * 0.48, W * 0.72);
    g.addColorStop(0, 'rgba(20,8,45,0)');
    g.addColorStop(1, 'rgba(20,8,45,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
}

function radial(ctx, W, stops) {
  const r = W / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, W);
}
