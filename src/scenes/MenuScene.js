import Phaser from 'phaser';
import { COLORS } from '../utils/constants.js';
import {
  makeTitleEmblem, makeCentreIsland, makeMoon, makePixelStar, makeSpark4,
} from '../effects/pixelArt.js';

/**
 * Start screen — a centred, layered pixel-art fantasy composition (16:9):
 *   sky:     twilight gradient, twinkling stars, a few clouds, white crescent
 *            moon on the left, misty mountains and the distant castle below
 *   top:     "Zumrud's / World" title with gold Baroque ornament and a crown
 *   sides:   smaller floating islands from the game itself framing the view
 *   centre:  the girl standing still on a wide floating island with vines
 *            and wildflowers — she only blinks
 *   bottom:  the original Start button (assets/ui/start.png, gently pulsing)
 * All pixel art is generated in src/effects/pixelArt.js and shown at a
 * whole-number scale with NEAREST filtering (crisp, pixelated).
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  // sky.png scaled uniformly to `width`, with its top 40% faded to transparent
  // (its small moon is removed: the start screen has its own crescent moon)
  static horizonTexture(scene, width) {
    width = Math.round(width);
    const key = `menu_horizon_${Math.round(width)}`;   // one per view width
    if (scene.textures.exists(key)) return key;
    const src = scene.textures.get('sky').getSourceImage();
    // sky.png has a semi-transparent 1–4px fringe on its edges: use the clean interior
    const sx = 2, sy = 2, sw = src.width - 4, sh = src.height - 7;
    const k = width / sw;
    const h = Math.round(sh * k);
    const tex = scene.textures.createCanvas(key, width, h);
    const ctx = tex.getContext();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, width, h);
    ctx.globalCompositeOperation = 'destination-out';
    const mx = (229 - sx) * k, my = (46 - sy) * k, mr = 17 * k;
    const moon = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    moon.addColorStop(0, 'rgba(0,0,0,1)');
    moon.addColorStop(0.75, 'rgba(0,0,0,1)');
    moon.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = moon;
    ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    ctx.globalCompositeOperation = 'destination-in';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.4, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, h);
    tex.refresh();
    return key;
  }

  // Soft round light (drawn additively), in gold / white
  static glow(scene, name, inner, outer) {
    const key = `menu_glow_${name}`;
    if (scene.textures.exists(key)) return key;
    const S = 128;
    const tex = scene.textures.createCanvas(key, S, S);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    tex.refresh();
    return key;
  }

  create() {
    const { width, height } = this.cameras.main;
    const rnd = new Phaser.Math.RandomDataGenerator(['zumruds-world']);
    const ADD = Phaser.BlendModes.ADD;

    // The view follows the window shape — re-lay out the start screen on resize
    const onResize = () => this.scene.restart();
    this.scale.once(Phaser.Scale.Events.RESIZE, onResize);
    // Pixel-art screen: the browser scales the canvas to the window — keep pixels square
    const canvas = this.game.canvas;
    canvas.style.imageRendering = 'pixelated';
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      canvas.style.imageRendering = '';
    });

    // Pixel size: every pixel-art element is drawn at this whole-number scale
    const P = Phaser.Math.Clamp(Math.floor(height / 360), 1, 4);
    const cx = Math.round(width / 2);
    const glowGold = MenuScene.glow(this, 'gold', 'rgba(255,225,130,0.7)', 'rgba(255,190,80,0.25)');
    const glowWhite = MenuScene.glow(this, 'white', 'rgba(255,255,255,0.7)', 'rgba(220,210,255,0.22)');

    // ── Twilight sky: deep purple → lavender ──
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.lightPurple, COLORS.lightPurple, 1);
    bg.fillRect(0, 0, width, height);
    const mid = this.add.graphics();       // a richer purple band through the middle, fading both ways
    mid.fillGradientStyle(COLORS.skyMid, COLORS.skyMid, COLORS.skyMid, COLORS.skyMid, 0, 0, 0.5, 0.5);
    mid.fillRect(0, 0, width, height * 0.35);
    mid.fillGradientStyle(COLORS.skyMid, COLORS.skyMid, COLORS.skyMid, COLORS.skyMid, 0.5, 0.5, 0, 0);
    mid.fillRect(0, height * 0.35, width, height * 0.4);

    // Pixel stars, twinkling
    makePixelStar(this);
    for (let i = 0; i < 70; i++) {
      const s = this.add.image(rnd.between(8, width - 8), rnd.between(6, Math.round(height * 0.6)), 'px_star')
        .setScale(rnd.frac() < 0.2 ? P : Math.max(1, P - 1))
        .setAlpha(rnd.realInRange(0.35, 0.95));
      this.tweens.add({
        targets: s, alpha: { from: s.alpha, to: rnd.realInRange(0.05, 0.3) },
        duration: rnd.between(900, 2600), delay: rnd.between(0, 2000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // White crescent moon, left-centre sky
    const moonX = Math.round(width * 0.27), moonY = Math.round(height * 0.3);
    this.add.image(moonX, moonY, glowWhite).setBlendMode(ADD).setDisplaySize(64 * P, 64 * P).setAlpha(0.35);
    this.add.image(moonX, moonY, makeMoon(this)).setScale(P);

    // Misty mountains, clouds and the distant castle along the bottom
    this.add.image(0, height, MenuScene.horizonTexture(this, width)).setOrigin(0, 1).setAlpha(0.6);
    const mist = this.add.graphics();
    mist.fillGradientStyle(0xd9c4f0, 0xd9c4f0, 0xd9c4f0, 0xd9c4f0, 0, 0, 0.35, 0.35);
    mist.fillRect(0, height * 0.72, width, height * 0.28);

    // A few small clouds
    [['cloud_1', 0.12, 0.2], ['cloud_2', 0.66, 0.1], ['cloud_4', 0.4, 0.42]].forEach(([key, fx, fy]) => {
      const cloud = this.add.image(width * fx, height * fy, key).setScale(0.42 * (height / 720)).setAlpha(0.45);
      this.tweens.add({ targets: cloud, x: cloud.x + rnd.between(-40, 40), duration: rnd.between(6000, 9000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ── Midground: the game's own floating island nodes framing the left and right ──
    // (positions are fractions of the view; sizes follow the view height) — kept
    // clear of the crescent moon (left) and the distant castle (lower right)
    const u = height / 720;
    [
      // [texture, x, y, scale, depth tint]  — farther ones smaller and hazier
      ['island_2', 0.055, 0.17, 0.6, 0xc9bce0],          // far, top-left
      ['island_4', 0.09, 0.42, 1.0, 0xece6f6],           // left, Projects island
      ['island_3', 0.2, 0.73, 0.95, 0xe6def3],           // lower left, Skills island
      ['island_3', 0.745, 0.42, 0.55, 0xc9bce0],         // far, right of centre (above the castle)
      ['trophy_island', 0.925, 0.25, 0.8, 0xece6f6],     // right, Achievements island
      ['island_2', 0.955, 0.66, 0.62, 0xd8cdea],         // lower right, beside the castle
    ].forEach(([key, fx, fy, s, tint], i) => {
      const isl = this.add.image(Math.round(width * fx), Math.round(height * fy), key).setScale(s * u).setTint(tint);
      this.tweens.add({ targets: isl, y: isl.y - 5 * u, duration: 2800 + i * 350, delay: i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ── Layout (top → bottom): title, character on the centre island, Start ──
    const emblemKey = makeTitleEmblem(this);
    const emblemTex = this.textures.get(emblemKey).getSourceImage();
    const emblemInfo = this.textures.get(emblemKey).customData.emblem;
    const emW = emblemTex.width * P, emH = emblemTex.height * P;
    const emY = Math.round(Math.max(emH / 2 + height * 0.03, height * 0.2));

    // her start-screen frames are pre-drawn at 0.75 of the art = 1:1 at P = 2
    const charScale = P / 2;
    const charTex = this.textures.get('idle_menu').getSourceImage();
    const charH = charTex.height * charScale;

    const islandKey = makeCentreIsland(this);
    const islandTex = this.textures.get(islandKey).getSourceImage();
    const islandInfo = this.textures.get(islandKey).customData.island;

    const grassY = Math.round(Math.max(height * 0.57, emY + emH / 2 + height * 0.05 + charH));
    const islandTop = grassY - islandInfo.grassY * P;

    // ── Title emblem (no box behind it — just a soft gold glow) ──
    const emGlow = this.add.image(cx, emY, glowGold).setBlendMode(ADD).setDisplaySize(emW * 1.1, emH * 1.15).setAlpha(0.2);
    this.tweens.add({ targets: emGlow, alpha: 0.32, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const emblem = this.add.image(cx, emY, emblemKey).setScale(P);
    const gemShine = this.add.image(
      cx + (emblemInfo.gemX - emblemTex.width / 2 - 2) * P, emY + (emblemInfo.gemY - emblemTex.height / 2 - 2) * P, 'star_small',
    ).setBlendMode(ADD).setScale(0.1 * P).setAlpha(0);
    this.tweens.add({ targets: [emblem, gemShine], y: `-=${2 * P}`, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: gemShine, alpha: 1, scale: 0.24 * P, duration: 500, hold: 120, yoyo: true, repeat: -1, repeatDelay: 2200 });
    // four-point star sparkles twinkling around the title
    makeSpark4(this);
    [[-0.52, -0.38], [0.5, -0.3], [-0.46, 0.42], [0.55, 0.36], [-0.2, -0.56], [0.24, 0.56]].forEach(([fx, fy], i) => {
      const s = this.add.image(cx + fx * emW, emY + fy * emH, 'px_spark4').setScale(Math.max(1, P - 1)).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 1, duration: 600, delay: i * 520, hold: 200, yoyo: true, repeat: -1, repeatDelay: 1800 + i * 150 });
    });

    // ── Centre island ──
    this.add.image(cx, islandTop, islandKey).setOrigin(0.5, 0).setScale(P);

    // ── The girl, standing still on the grass in the middle of the island ──
    const character = this.createGirl(cx, grassY + P, charScale);

    // Starlight / firefly motes drifting around the island
    this.add.particles(0, 0, 'star_small', {
      x: { min: cx - islandTex.width * P * 0.6, max: cx + islandTex.width * P * 0.6 },
      y: { min: grassY - 60 * P, max: grassY + 100 * P },
      speedX: { min: -12, max: 12 }, speedY: { min: -12, max: 8 },
      scale: { start: 0.09 * P, end: 0.02 * P },
      alpha: { values: [0, 1, 0.6, 1, 0] },
      tint: [0xfff1a8, 0xffd1f0, 0xffffff],
      lifespan: 3200, frequency: 220, blendMode: 'ADD',
    });

    // ── Start button (the original one) ──
    const startBtn = this.add.image(width / 2, height * 0.82, 'start')
      .setScale(0.85)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startBtn,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    startBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 45, 27, 78);
      this.time.delayedCall(400, () => {
        this.scene.start('Game');
      });
    });
    const btnH = startBtn.height * 0.85;

    // Where everything landed (used by the layout checks)
    this.layoutInfo = {
      P,
      crest: { top: emY - emH / 2 - 2 * P, bottom: emY + emH / 2, left: cx - emW / 2, right: cx + emW / 2 },
      character: { top: character.y - charH * character.originY, bottom: character.y },
      island: { top: islandTop, bottom: islandTop + islandTex.height * P, grassY },
      button: { top: startBtn.y - btnH / 2, bottom: startBtn.y + btnH / 2, y: startBtn.y },
    };
  }

  /**
   * The girl on the start screen: she stands still and only blinks — every
   * 2–5 s, sometimes twice. The closed-eye frame is pre-drawn at her
   * start-screen size (BootScene), so she stays crisp and never shifts.
   */
  createGirl(x, feetY, scale) {
    const girl = this.add.image(x, feetY, 'idle_menu').setOrigin(0.5, 201 / 203).setScale(scale);
    if (!this.textures.exists('idle_blink_menu')) return girl;
    const rnd = new Phaser.Math.RandomDataGenerator(['girl']);
    const blinkOnce = () => {
      girl.setTexture('idle_blink_menu');
      this.time.delayedCall(130, () => girl.setTexture('idle_menu'));
    };
    const scheduleBlink = () => {
      this.time.delayedCall(rnd.between(2000, 4800), () => {
        blinkOnce();
        if (rnd.frac() < 0.25) this.time.delayedCall(280, blinkOnce);
        scheduleBlink();
      });
    };
    this.time.delayedCall(900, blinkOnce);
    scheduleBlink();
    return girl;
  }
}
